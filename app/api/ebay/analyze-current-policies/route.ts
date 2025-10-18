// app/api/ebay/analyze-current-policies/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // ポリシーとZONEレートを取得
    const { data: policies, error } = await supabase
      .from('ebay_shipping_policies_v2')
      .select(`
        id,
        policy_name,
        weight_min_kg,
        weight_max_kg,
        pricing_basis,
        sample_product_price,
        price_min_usd,
        price_max_usd,
        ebay_policy_zone_rates_v2 (
          zone_code,
          zone_name,
          actual_cost_usd,
          display_shipping_usd,
          handling_fee_usd,
          handling_calculation_method,
          is_ddp
        )
      `)
      .eq('active', true)
      .order('weight_min_kg', { ascending: true })

    if (error) {
      console.error('ポリシー取得エラー:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch policies',
          details: error.message
        },
        { status: 500 }
      )
    }

    // DDP/DDU別に分類
    const ddpPolicies = policies?.filter(p => p.pricing_basis === 'DDP') || []
    const dduPolicies = policies?.filter(p => p.pricing_basis === 'DDU') || []

    // 価格帯を抽出（DDP）
    const priceBands = [...new Set(
      ddpPolicies
        .map(p => p.sample_product_price)
        .filter((price): price is number => price !== null && price !== undefined)
    )].sort((a, b) => a - b)

    // 重量帯を抽出
    const weightBands = [...new Set(
      policies?.map(p => `${p.weight_min_kg}-${p.weight_max_kg}kg`)
    )]

    // DDPポリシーの詳細（USA向け）
    const ddpDetails = ddpPolicies.map(p => {
      const usZone = (p.ebay_policy_zone_rates_v2 as any[])?.find(z => 
        z.zone_code === 'US' || z.zone_name?.includes('USA') || z.zone_name?.includes('United States')
      )
      return {
        policy_name: p.policy_name,
        weight: `${p.weight_min_kg}-${p.weight_max_kg}kg`,
        price_range: `$${p.price_min_usd}-${p.price_max_usd}`,
        sample_price: p.sample_product_price,
        us_zone: usZone ? {
          zone_code: usZone.zone_code,
          zone_name: usZone.zone_name,
          actual_cost: usZone.actual_cost_usd,
          display_shipping: usZone.display_shipping_usd,
          handling: usZone.handling_fee_usd,
          handling_method: usZone.handling_calculation_method,
          is_ddp: usZone.is_ddp
        } : null
      }
    })

    // DDUポリシーの詳細（その他）
    const dduDetails = dduPolicies.map(p => {
      // OTHERゾーンのサンプルを取得
      const otherZone = (p.ebay_policy_zone_rates_v2 as any[])?.[0]
      return {
        policy_name: p.policy_name,
        weight: `${p.weight_min_kg}-${p.weight_max_kg}kg`,
        sample_zone: otherZone ? {
          zone_code: otherZone.zone_code,
          zone_name: otherZone.zone_name,
          actual_cost: otherZone.actual_cost_usd,
          display_shipping: otherZone.display_shipping_usd,
          handling: otherZone.handling_fee_usd,
          handling_method: otherZone.handling_calculation_method
        } : null
      }
    })

    // 分析結果
    const analysis = {
      summary: {
        total: policies?.length || 0,
        ddp_count: ddpPolicies.length,
        ddu_count: dduPolicies.length,
        price_bands: priceBands,
        weight_bands: weightBands
      },
      findings: {
        has_first_item_shipping_column: false,
        has_additional_item_shipping_column: false,
        current_columns: [
          'actual_cost_usd',
          'display_shipping_usd', 
          'handling_fee_usd',
          'handling_calculation_method'
        ],
        note: '2個目以降の送料設定用カラムが存在しません。追加が必要です。'
      },
      ddp_policies: ddpDetails,
      ddu_policies: dduDetails
    }

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('分析エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
