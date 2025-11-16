// app/api/tools/profit-calculate/route.ts
// 🔥 Phase 2修正版：default_profit_margin/amount_usd を保存
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
import { calculateUsaPriceV3 } from '@/lib/ebay-pricing/usa-price-calculator-v3'

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '商品IDが指定されていません' },
        { status: 400 }
      )
    }

    console.log(`💰 利益計算開始: ${productIds.length}件`)

    // 商品データを取得
    const { data: products, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .in('id', productIds)

    if (fetchError) throw fetchError

    const updated: string[] = []
    const errors: any[] = []

    // 各商品の利益計算
    for (const product of products || []) {
      try {
        // listing_dataから値を取得
        const listingData = product.listing_data || {}
        const weightKg = (listingData.weight_g || 0) / 1000
        const costJPY = product.price_jpy || 0
        
        if (!weightKg || !costJPY) {
          console.warn(`⚠️ 重量または仕入れ価格が不足: ${product.title}`)
          errors.push({ 
            id: product.id, 
            error: '重量または仕入れ価格が不足しています' 
          })
          continue
        }

        // eBay価格計算システムを使用
        const pricingResult = await calculateUsaPriceV3({
          costJPY: costJPY,
          weight_kg: weightKg,
          targetMargin: 15,             // 目標利益率 15%
          hsCode: '9620.00.20.00',        // デフォルトHTS
          originCountry: 'JP',
          storeType: 'none',
          fvfRate: 0.1515,
          exchangeRate: 150  // デフォルト150円/USD
        })

        if (!pricingResult || !pricingResult.success || !pricingResult.breakdown) {
          console.warn(`⚠️ 価格計算失敗: ${product.title}`)
          errors.push({ 
            id: product.id, 
            error: pricingResult?.error || '価格計算に失敗しました' 
          })
          continue
        }

        const breakdown = pricingResult.breakdown

        console.log(`✅ 利益計算完了: ${product.title}`)
        console.log(`   ポリシー名: ${breakdown.selectedPolicyName}`)
        console.log(`   商品価格: ${breakdown.finalProductPrice.toFixed(2)}`)
        console.log(`   DDP送料: ${breakdown.finalShipping.toFixed(2)}`)
        console.log(`   総売上: ${breakdown.finalTotal.toFixed(2)}`)
        console.log(`   利益率（還付前）: ${breakdown.profitMargin.toFixed(2)}%`)
        console.log(`   利益額（還付前）: ${breakdown.profit.toFixed(2)}`)

        const { error: updateError } = await supabase
          .from('products_master')
          .update({
            listing_data: {
              ...listingData,
              // ポリシー情報
              usa_shipping_policy_name: breakdown.selectedPolicyName,
              shipping_service: `${breakdown.carrierName} - ${breakdown.serviceName}`,
              carrier_name: breakdown.carrierName,
              carrier_service: breakdown.serviceName,
              carrier_code: breakdown.carrierCode,
              // 価格情報
              ddp_price_usd: breakdown.finalTotal,
              ddu_price_usd: breakdown.finalProductPrice,
              product_price_usd: breakdown.finalProductPrice,
              // 送料情報
              base_shipping_usd: breakdown.selectedBaseShipping,  // 実送料（DDPなし）
              shipping_cost_usd: breakdown.finalShipping,  // 送料合計（DDP込）
              // 利益情報
              profit_margin: breakdown.profitMargin,
              profit_amount_usd: breakdown.profit,
              profit_margin_refund: breakdown.profitMarginWithRefund,
              profit_amount_refund: breakdown.profitWithRefund
            },
            // 🔥 トップレベルにも保存（検索・ソート用）
            ddu_price_usd: breakdown.finalProductPrice,
            ddp_price_usd: breakdown.finalTotal,
            shipping_cost_usd: breakdown.finalShipping,
            shipping_policy: breakdown.selectedPolicyName,
            profit_margin: breakdown.profitMargin,
            profit_amount_usd: breakdown.profit,
            // 🔥 Phase 2: デフォルト価格での利益を保存
            default_profit_margin: breakdown.profitMargin,
            default_profit_amount_usd: breakdown.profit,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) throw updateError

        updated.push(product.id)
      } catch (err: any) {
        console.error(`❌ 利益計算エラー: ${product.title}`, err)
        errors.push({ id: product.id, error: err.message })
      }
    }

    console.log(`📊 利益計算完了: ${updated.length}件成功, ${errors.length}件失敗`)

    return NextResponse.json({
      success: true,
      updated: updated.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ 利益計算エラー:', error)
    return NextResponse.json(
      { error: error.message || '利益計算に失敗しました' },
      { status: 500 }
    )
  }
}
