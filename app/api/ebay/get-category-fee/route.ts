// app/api/ebay/get-category-fee/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryKey = searchParams.get('category_key')

    if (!categoryKey) {
      return NextResponse.json({ error: 'category_key is required' }, { status: 400 })
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('ebay_pricing_category_fees')
      .select('fvf, insertion_fee, cap')
      .eq('category_key', categoryKey)
      .eq('active', true)
      .single()

    if (error) {
      console.error('Error fetching category fee:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
