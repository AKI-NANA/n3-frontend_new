// app/api/verify-all-patterns/route.ts
/**
 * 全パターン検証API
 * 実際のPriceCalculationEngineを使用
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PriceCalculationEngine } from '@/lib/ebay-pricing/price-calculation-engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TestCase {
  weight: number
  costJPY: number
  description: string
}

export async function GET(request: NextRequest) {
  try {
    console.log('検証開始...')

    // 1. 必要なデータを取得
    const [hsCodesData, policiesData, marginsData, exchangeRateData] = await Promise.all([
      supabase.from('hs_codes').select('*'),
      supabase.from('ebay_shipping_policies_v2').select('*, ebay_policy_zone_rates_v2(*)').eq('active', true),
      supabase.from('ebay_pricing_profit_margins').select('*'),
      supabase.from('ebay_pricing_exchange_rates').select('*').order('updated_at', { ascending: false }).limit(1)
    ])

    if (!hsCodesData.data || !policiesData.data || !marginsData.data) {
      console.error('データ取得エラー:', {
        hsCodes: hsCodesData.data ? 'OK' : 'NG',
        policies: policiesData.data ? 'OK' : 'NG',
        margins: marginsData.data ? 'OK' : 'NG',
        exchangeRate: exchangeRateData.data ? 'OK' : 'NG'
      })
      throw new Error(`データ取得失敗: ${!hsCodesData.data ? 'HSコード ' : ''}${!policiesData.data ? 'ポリシー ' : ''}${!marginsData.data ? '利益率 ' : ''}`)
    }

    // HSコードをマップに変換
    const hsCodesDB = hsCodesData.data.reduce((acc: any, hs: any) => {
      acc[hs.code] = hs
      return acc
    }, {})

    // 為替レート（データがなくてもデフォルト値を使用）
    const exchangeRate = exchangeRateData.data?.[0] || { spot: 150, buffer: 5, safe: 155 }

    // テストケース生成（9×9=81パターン）
    const testCases: TestCase[] = []
    const weights = [0.5, 1, 2, 3, 5, 7, 10, 15, 20]
    const costs = [7500, 15000, 22500, 30000, 45000, 60000, 90000, 120000, 180000]

    for (const weight of weights) {
      for (const costJPY of costs) {
        testCases.push({
          weight,
          costJPY,
          description: `${weight}kg, ¥${costJPY.toLocaleString()}`
        })
      }
    }

    console.log(`テストケース数: ${testCases.length}`)

    // 検証実行
    const results = []
    let lossCount = 0
    let lowMarginCount = 0

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]

      // ポリシー選択
      const estimatedPrice = (testCase.costJPY / exchangeRate.safe) * 1.5
      const policy = selectOptimalPolicy(policiesData.data, testCase.weight, estimatedPrice)

      if (!policy) {
        results.push({
          ...testCase,
          error: 'ポリシー選択失敗',
          isLoss: true,
          meetsTarget: false
        })
        lossCount++
        continue
      }

      // policyをPriceCalculationEngine用に変換
      const policyForEngine = convertPolicyFormat(policy)

      // 利益率設定
      const marginSetting = {
        default_margin: 0.15,
        min_margin: 0.10,
        min_amount: 3000,
        max_margin: 0.30
      }

      // カテゴリ手数料
      const categoryFee = {
        fvf: 0.1315,
        cap: null,
        insertion_fee: 0.35
      }

      // 計算実行
      try {
        const result = PriceCalculationEngine.calculate(
          {
            costJPY: testCase.costJPY,
            actualWeight: testCase.weight,
            length: 40,
            width: 30,
            height: 20,
            destCountry: policy.pricing_basis === 'DDP' ? 'US' : 'GB',
            originCountry: 'JP',
            hsCode: '9023.00.0000',
            storeType: 'none',
            refundableFeesJPY: 0
          },
          policyForEngine,
          marginSetting,
          categoryFee,
          exchangeRate,
          hsCodesDB
        )

        if (result.success) {
          const profit = result.profitJPY_NoRefund || 0
          const margin = result.profitMargin_NoRefund || 0
          const isLoss = profit < 0
          const meetsTarget = margin >= 0.15 && profit >= 3000

          if (isLoss) lossCount++
          if (!meetsTarget) lowMarginCount++

          results.push({
            ...testCase,
            policy: policy.policy_name,
            pricingBasis: policy.pricing_basis,
            suggestedPrice: result.suggestedPrice,
            profit: Math.round(profit),
            margin: Math.round(margin * 1000) / 10,
            isLoss,
            meetsTarget,
            details: {
              costUSD: result.costUSD,
              shipping: result.shippingCost,
              tariff: result.tariffCost,
              fees: result.totalFees
            }
          })
        } else {
          results.push({
            ...testCase,
            error: result.error,
            isLoss: true,
            meetsTarget: false
          })
          lossCount++
        }
      } catch (error: any) {
        results.push({
          ...testCase,
          error: error.message,
          isLoss: true,
          meetsTarget: false
        })
        lossCount++
      }
    }

    // サマリー
    const summary = {
      total: testCases.length,
      success: results.filter(r => !r.error).length,
      loss: lossCount,
      lowMargin: lowMarginCount,
      lossRate: (lossCount / testCases.length) * 100,
      targetAchievementRate: ((results.length - lowMarginCount) / testCases.length) * 100
    }

    console.log('検証完了')
    console.log(`赤字率: ${summary.lossRate.toFixed(1)}%`)
    console.log(`目標達成率: ${summary.targetAchievementRate.toFixed(1)}%`)

    return NextResponse.json({
      success: true,
      summary,
      results,
      lossResults: results.filter(r => r.isLoss)
    })

  } catch (error: any) {
    console.error('検証エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// ポリシー選択ロジック
function selectOptimalPolicy(policies: any[], weight: number, itemPriceUSD: number) {
  const shouldUseDDP = itemPriceUSD >= 150 && itemPriceUSD <= 450
  const pricingBasis = shouldUseDDP ? 'DDP' : 'DDU'
  let priceBand: string | null = null

  if (shouldUseDDP) {
    priceBand = itemPriceUSD <= 250 ? 'BAND_200' : 'BAND_350'
  }

  const filtered = policies.filter(p => 
    p.pricing_basis === pricingBasis &&
    p.weight_min_kg <= weight &&
    p.weight_max_kg >= weight &&
    (!priceBand || p.price_band_final === priceBand)
  )

  return filtered[0] || null
}

// ポリシーフォーマット変換
function convertPolicyFormat(policy: any) {
  const zones = (policy.ebay_policy_zone_rates_v2 || []).map((rate: any) => ({
    country_code: rate.zone_code || rate.zone_type,
    display_shipping: rate.display_shipping_usd || rate.first_item_shipping_usd || 0,
    actual_cost: rate.actual_cost_usd || 0,
    handling_ddp: rate.handling_fee_usd || 0,
    handling_ddu: rate.handling_fee_usd || 0
  }))

  return {
    id: policy.id,
    policy_name: policy.policy_name,
    weight_min: policy.weight_min_kg,
    weight_max: policy.weight_max_kg,
    price_min: 0,
    price_max: 999999,
    zones
  }
}
