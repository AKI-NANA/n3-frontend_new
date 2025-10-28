// app/api/ebay/select-shipping-policy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { weight, itemPriceUSD, quantity = 1 } = await request.json()

    if (!weight || !itemPriceUSD) {
      return NextResponse.json({
        success: false,
        error: '重量と商品価格が必要です'
      }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const shouldUseDDP = itemPriceUSD >= 150 && itemPriceUSD <= 450
    const pricingBasis = shouldUseDDP ? 'DDP' : 'DDU'
    let priceBand: string | null = null
    
    if (shouldUseDDP) {
      priceBand = itemPriceUSD <= 250 ? 'BAND_200' : 'BAND_350'
    }

    let query = supabase
      .from('ebay_shipping_policies_v2')
      .select('*')
      .eq('active', true)
      .eq('pricing_basis', pricingBasis)
      .lte('weight_min_kg', weight)
      .gte('weight_max_kg', weight)

    if (priceBand) {
      query = query.eq('price_band_final', priceBand)
    }

    const { data: policies, error } = await query.limit(1)

    if (error || !policies || policies.length === 0) {
      return NextResponse.json({
        success: false,
        error: '適切な配送ポリシーが見つかりません'
      }, { status: 404 })
    }

    const selectedPolicy = policies[0]

    const { data: zoneRates } = await supabase
      .from('ebay_policy_zone_rates_v2')
      .select('*')
      .eq('policy_id', selectedPolicy.id)

    const usaRate = zoneRates?.find(r => r.zone_code === 'US')
    const otherRate = zoneRates?.find(r => r.zone_type === 'OTHER')

    const calculateShipping = (rate: any) => {
      if (!rate) return { total: 0, handling: 0, breakdown: '' }
      
      const first = rate.first_item_shipping_usd || rate.display_shipping_usd || 0
      const additional = rate.additional_item_shipping_usd || rate.actual_cost_usd || 0
      const handling = rate.handling_fee_usd || 0

      return {
        total: first + (additional * (quantity - 1)),
        handling,
        breakdown: quantity === 1
          ? `1個: $${first.toFixed(2)}`
          : `1個目$${first.toFixed(2)} + 追加${quantity - 1}個×$${additional.toFixed(2)}`
      }
    }

    return NextResponse.json({
      success: true,
      policy: {
        id: selectedPolicy.id,
        name: selectedPolicy.policy_name,
        pricing_basis: selectedPolicy.pricing_basis,
        price_band: selectedPolicy.price_band_final
      },
      shipping: {
        usa: calculateShipping(usaRate),
        other: calculateShipping(otherRate)
      }
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
