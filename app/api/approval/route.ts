import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    let query = supabase
      .from('products_master')
      .select(`
        id,
        source_system,
        source_id,
        sku,
        title,
        title_en,
        description,
        current_price,
        profit_amount,
        profit_margin,
        category,
        condition_name,
        workflow_status,
        approval_status,
        primary_image_url,
        gallery_images,
        listing_price,
        inventory_quantity,
        ai_confidence_score,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
    
    // ステータスフィルター
    if (status && status !== 'all') {
      query = query.eq('approval_status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
