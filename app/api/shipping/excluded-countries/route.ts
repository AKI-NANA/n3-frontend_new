import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 除外国マスターから全データを取得
    const { data: excludedCountries, error } = await supabase
      .from('excluded_countries_master')
      .select('*')
      .order('region', { ascending: true })
      .order('country_code', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      excluded_countries: excludedCountries,
      count: excludedCountries?.length || 0
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
