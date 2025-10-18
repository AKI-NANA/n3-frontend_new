// app/api/ebay/fulfillment-policy/list/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('ebay_fulfillment_policies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      policies: data || []
    })
  } catch (error: any) {
    console.error('Failed to fetch policies:', error)
    return NextResponse.json({
      success: true,
      policies: []
    })
  }
}
