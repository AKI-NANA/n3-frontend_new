// app/api/ebay/bulk-calculate/route.ts
/**
 * 大量商品の一括価格計算API
 * - 全データをDBから取得
 * - 損失が出る商品を自動的にマーク
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { PriceCalculationEngine } from '@/lib/ebay-pricing/price-calculation-engine'

interface Product {
  id: string
  cost_jpy: number
  actual_weight: number
  length: number
  width: number
  height: number
  origin_country: string
  hs_code: string
  ebay_category: string
}

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json()

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'products array is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 1. 全必要データをDBから取得
    const [
      { data: hsCodes },
      { data: categoryFees },
      { data: shippingPolicies },
      { data: marginSettings },
      { data: exchangeRate },
      { data: countries }
    ] = await Promise.all([
      supabase.from('hs_codes').select('*'),
      supabase.from('ebay_pricing_category_fees').select('*').eq('active', true),
      supabase.from('ebay_shipping_policies_v2').select(`
        *,
        zones:ebay_policy_zone_rates_v2(*)
      `).eq('active', true),
      supabase.from('profit_margin_settings').select('*'),
      supabase.from('exchange_rates').select('*').order('date', { ascending: false }).limit(1).single(),
      supabase.from('origin_countries').select('*').eq('active', true)
    ])

    // 2. データを整形
    const hsCodesDB = (hsCodes || []).reduce((acc: any, hs: any) => {
      acc[hs.code] = hs
      return acc
    }, {})

    const categoryFeesDB = (categoryFees || []).reduce((acc: any, fee: any) => {
      acc[fee.category_key] = fee
      return acc
    }, {})

    const exchangeRateData = {
      spot: exchangeRate?.usd_to_jpy || 150,
      buffer: 2,
      safe: (exchangeRate?.usd_to_jpy || 150) + 2
    }

    // 3. 各商品を計算
    const results = []
    const unprofitableProducts = []

    for (const product of products) {
      try {
        // 重量に基づいて最適なポリシーを選択
        const effectiveWeight = PriceCalculationEngine.getEffectiveWeight(
          product.actual_weight,
          product.length,
          product.width,
          product.height
        )

        const policy = (shippingPolicies || []).find((p: any) =>
          effectiveWeight >= p.weight_min_kg && effectiveWeight <= p.weight_max_kg
        )

        if (!policy) {
          unprofitableProducts.push({
            product_id: product.id,
            reason: 'no_matching_policy',
            message: '適切な配送ポリシーが見つかりません'
          })
          continue
        }

        // カテゴリ手数料を取得
        const categoryFee = categoryFeesDB[product.ebay_category] || categoryFeesDB['Default']

        if (!categoryFee) {
          unprofitableProducts.push({
            product_id: product.id,
            reason: 'no_category_fee',
            message: 'カテゴリ手数料が見つかりません'
          })
          continue
        }

        // マージン設定を取得
        const marginSetting = (marginSettings || []).find((m: any) =>
          m.country_code === 'US' && m.condition === 'used'
        ) || {
          default_margin: 0.15,
          min_margin: 0.10,
          min_amount: 3000
        }

        // DDP計算（USA向け）
        const resultDDP = PriceCalculationEngine.calculate(
          {
            costJPY: product.cost_jpy,
            actualWeight: product.actual_weight,
            length: product.length,
            width: product.width,
            height: product.height,
            destCountry: 'US',
            originCountry: product.origin_country,
            hsCode: product.hs_code,
            storeType: 'none',
            refundableFeesJPY: 0
          },
          {
            ...policy,
            zones: policy.zones.map((z: any) => ({
              country_code: z.zone_code,
              display_shipping: z.display_shipping_usd,
              actual_cost: z.actual_cost_usd,
              handling_ddp: z.handling_fee_usd,
              handling_ddu: z.handling_fee_usd
            }))
          },
          marginSetting,
          {
            fvf: categoryFee.fvf,
            cap: categoryFee.cap,
            insertion_fee: categoryFee.insertion_fee || 0.35
          },
          exchangeRateData,
          hsCodesDB
        )

        // DDU計算（その他向け）
        const resultDDU = PriceCalculationEngine.calculate(
          {
            costJPY: product.cost_jpy,
            actualWeight: product.actual_weight,
            length: product.length,
            width: product.width,
            height: product.height,
            destCountry: 'GB',
            originCountry: product.origin_country,
            hsCode: product.hs_code,
            storeType: 'none',
            refundableFeesJPY: 0
          },
          {
            ...policy,
            zones: policy.zones.map((z: any) => ({
              country_code: z.zone_code,
              display_shipping: z.display_shipping_usd,
              actual_cost: z.actual_cost_usd,
              handling_ddp: z.handling_fee_usd,
              handling_ddu: z.handling_fee_usd
            }))
          },
          marginSetting,
          {
            fvf: categoryFee.fvf,
            cap: categoryFee.cap,
            insertion_fee: categoryFee.insertion_fee || 0.35
          },
          exchangeRateData,
          hsCodesDB
        )

        // 損失チェック
        const isProfitable = 
          resultDDP.success && 
          resultDDU.success &&
          resultDDP.profitJPY_NoRefund >= marginSetting.min_amount &&
          resultDDU.profitJPY_NoRefund >= marginSetting.min_amount &&
          resultDDP.profitMargin_NoRefund >= marginSetting.min_margin &&
          resultDDU.profitMargin_NoRefund >= marginSetting.min_margin

        if (!isProfitable) {
          unprofitableProducts.push({
            product_id: product.id,
            reason: 'insufficient_profit',
            message: `利益不足（DDP: ¥${Math.round(resultDDP.profitJPY_NoRefund)}, DDU: ¥${Math.round(resultDDU.profitJPY_NoRefund)}）`,
            ddp_profit: resultDDP.profitJPY_NoRefund,
            ddu_profit: resultDDU.profitJPY_NoRefund,
            ddp_margin: resultDDP.profitMargin_NoRefund,
            ddu_margin: resultDDU.profitMargin_NoRefund
          })
        }

        results.push({
          product_id: product.id,
          profitable: isProfitable,
          ddp_result: resultDDP,
          ddu_result: resultDDU,
          policy_used: policy.policy_name
        })

      } catch (error) {
        console.error(`Product ${product.id} calculation error:`, error)
        unprofitableProducts.push({
          product_id: product.id,
          reason: 'calculation_error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // 4. 損失商品をDBに記録
    if (unprofitableProducts.length > 0) {
      await supabase.from('unprofitable_products').insert(
        unprofitableProducts.map(p => ({
          product_id: p.product_id,
          reason: p.reason,
          message: p.message,
          calculation_data: p,
          created_at: new Date().toISOString()
        }))
      )
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      profitable: results.filter(r => r.profitable).length,
      unprofitable: unprofitableProducts.length,
      results,
      unprofitableProducts
    })

  } catch (error) {
    console.error('Bulk calculation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Calculation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
