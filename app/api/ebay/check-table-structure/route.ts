// app/api/ebay/check-table-structure/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: policies } = await supabase
      .from('ebay_shipping_policies_v2')
      .select('*')
      .limit(1)

    const { data: zones } = await supabase
      .from('ebay_policy_zone_rates_v2')
      .select('*')
      .limit(1)

    return NextResponse.json({
      success: true,
      policy_columns: policies?.[0] ? Object.keys(policies[0]) : [],
      zone_columns: zones?.[0] ? Object.keys(zones[0]) : [],
      policy_sample: policies?.[0],
      zone_sample: zones?.[0]
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    })
  }
}
