import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Rate Table数を取得
    const { count: rateTablesCount, error: rtError } = await supabase
      .from('ebay_rate_tables')
      .select('*', { count: 'exact', head: true })
    
    if (rtError) {
      console.error('Rate tables count error:', rtError)
    }
    
    // Policy数を取得
    const { count: policiesCount, error: policyError } = await supabase
      .from('ebay_shipping_policies')
      .select('*', { count: 'exact', head: true })
    
    if (policyError) {
      console.error('Policies count error:', policyError)
    }
    
    // 除外国数を取得
    const { count: excludedCount, error: excludedError } = await supabase
      .from('ebay_excluded_locations')
      .select('*', { count: 'exact', head: true })
    
    if (excludedError) {
      console.error('Excluded locations count error:', excludedError)
    }
    
    // 最終更新日時を取得
    const { data: latestUpdate, error: updateError } = await supabase
      .from('ebay_rate_tables')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (updateError && updateError.code !== 'PGRST116') {
      console.error('Latest update error:', updateError)
    }

    const result = {
      rateTables: rateTablesCount || 0,
      policies: policiesCount || 0,
      excludedLocations: excludedCount || 0,
      lastUpdate: latestUpdate?.created_at || null
    }

    console.log('Status API result:', result)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        rateTables: 0,
        policies: 0,
        excludedLocations: 0,
        lastUpdate: null
      },
      { status: 500 }
    )
  }
}
