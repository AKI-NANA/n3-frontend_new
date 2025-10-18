import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ebay_shipping_policies')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      policies: data || []
    })
  } catch (error: any) {
    console.error('Failed to fetch policies:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
