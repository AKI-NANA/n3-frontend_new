import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Rate Tablesを取得
    const { data: rateTables } = await supabase
      .from('ebay_rate_tables')
      .select('*')
      .order('created_at', { ascending: true })

    // Policiesを取得
    const { data: policies } = await supabase
      .from('ebay_shipping_policies')
      .select('*')
      .order('created_at', { ascending: true })

    // 除外国を取得
    const { data: excludedLocations } = await supabase
      .from('ebay_excluded_locations')
      .select('*')
      .eq('is_default_excluded', true)
      .order('region', { ascending: true })

    const exportData = {
      generated_at: new Date().toISOString(),
      summary: {
        rate_tables_count: rateTables?.length || 0,
        policies_count: policies?.length || 0,
        excluded_locations_count: excludedLocations?.length || 0
      },
      rate_tables: rateTables || [],
      policies: policies || [],
      excluded_locations: excludedLocations || []
    }

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })

    return new Response(blob, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="shipping_system_${Date.now()}.json"`
      }
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
