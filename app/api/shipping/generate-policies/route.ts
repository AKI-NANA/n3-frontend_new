import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const POLICIES = [
  {
    name: 'Economy Shipping',
    code: 'ECONOMY',
    multiplier: 2.0,
    handling_days: 3,
  },
  {
    name: 'Standard Shipping',
    code: 'STANDARD',
    multiplier: 2.2,
    handling_days: 3,
  },
  {
    name: 'Express Shipping',
    code: 'EXPRESS',
    multiplier: 2.5,
    handling_days: 1,
  }
]

export async function POST() {
  try {
    // 最小限のフィールドのみで挿入
    const policiesToInsert = POLICIES.map(policy => ({
      policy_name: policy.name,
      marketplace_id: 'EBAY_US',
      handling_time_days: policy.handling_days,
      is_active: true
    }))

    const { data, error } = await supabase
      .from('ebay_shipping_policies')
      .insert(policiesToInsert)
      .select()

    if (error) {
      console.error('Insert error:', error)
      throw error
    }

    // 除外国を別途設定（ポリシー作成後）
    const { data: excludedLocations } = await supabase
      .from('excluded_countries_master')
      .select('country_code')
      .eq('is_default_excluded', true)

    const excludedCodes = excludedLocations?.map(l => l.country_code) || []

    // 各ポリシーに除外国を設定
    if (data && excludedCodes.length > 0) {
      for (const policy of data) {
        for (const code of excludedCodes) {
          await supabase
            .from('ebay_shipping_exclusions')
            .insert({
              policy_id: policy.id,
              exclude_ship_to_location: code
            })
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      policies: data,
      excluded_count: excludedCodes.length
    })
  } catch (error: any) {
    console.error('Policy generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error
      },
      { status: 500 }
    )
  }
}
