// app/api/ebay/analyze-shipping-data/route.ts
/**
 * 配送データの分析API
 * - DBに格納されている送料データを検証
 * - 異常値を検出
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()

    const { data: policies } = await supabase
      .from('ebay_shipping_policies_v2')
      .select(`
        id,
        policy_name,
        weight_min_kg,
        weight_max_kg,
        pricing_basis,
        ebay_policy_zone_rates_v2 (
          zone_code,
          display_shipping_usd,
          actual_cost_usd,
          handling_fee_usd
        )
      `)
      .eq('active', true)
      .order('weight_min_kg')

    if (!policies) {
      return NextResponse.json({ error: 'No policies found' }, { status: 404 })
    }

    const analysis = policies.map(policy => {
      const zones = policy.ebay_policy_zone_rates_v2 || []
      const usaZone = zones.find((z: any) => z.zone_code === 'US')

      const avgWeight = (policy.weight_min_kg + policy.weight_max_kg) / 2
      let expectedShipping = 0
      
      if (avgWeight <= 2) expectedShipping = 25
      else if (avgWeight <= 5) expectedShipping = 45
      else if (avgWeight <= 10) expectedShipping = 95
      else if (avgWeight <= 15) expectedShipping = 145
      else expectedShipping = 195

      const issues: string[] = []
      
      if (usaZone) {
        const actualShipping = usaZone.actual_cost_usd
        const displayShipping = usaZone.display_shipping_usd

        if (actualShipping < expectedShipping * 0.7) {
          issues.push(`❌ USA実費が異常に低い: $${actualShipping}（期待値: $${expectedShipping}）`)
        }

        if (policy.pricing_basis === 'DDP' && displayShipping <= actualShipping) {
          issues.push(`❌ DDP表示送料が実費以下: 表示$${displayShipping} ≤ 実費$${actualShipping}`)
        }
      }

      return {
        policy_name: policy.policy_name,
        weight_range: `${policy.weight_min_kg}-${policy.weight_max_kg}kg`,
        pricing_basis: policy.pricing_basis,
        expected_shipping: expectedShipping,
        usa_actual: usaZone?.actual_cost_usd || 0,
        usa_display: usaZone?.display_shipping_usd || 0,
        usa_handling: usaZone?.handling_fee_usd || 0,
        issues,
        status: issues.length === 0 ? '✅' : '❌'
      }
    })

    return NextResponse.json({
      success: true,
      total: policies.length,
      issues: analysis.filter(a => a.issues.length > 0),
      all: analysis
    })

  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
