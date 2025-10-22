import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_ddp_surcharge_patterns')

    if (error) throw error

    return NextResponse.json({
      success: true,
      patterns: data || []
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}
