// app/api/ebay/get-unique-fvf-rates/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('ebay_pricing_category_fees')
      .select('fvf')
      .eq('active', true)

    if (error) {
      console.error('Error fetching FVF rates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ユニークなFVF率を抽出してソート
    const uniqueRates = [...new Set(data.map(item => item.fvf))]
      .sort((a, b) => a - b)

    return NextResponse.json({
      rates: uniqueRates,
      count: uniqueRates.length,
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
