// app/api/inventory-monitoring/changes/route.ts
// 変動データを取得

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const changeType = searchParams.get('changeType')

    let query = supabase
      .from('inventory_changes')
      .select(
        `
        *,
        product:products (
          id,
          sku,
          title,
          source_url,
          ebay_listing_id,
          ebay_sku,
          listed_marketplaces
        )
      `,
        { count: 'exact' }
      )
      .order('detected_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (changeType) {
      query = query.eq('change_type', changeType)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      changes: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('❌ 変動データ取得エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '変動データ取得に失敗しました',
      },
      { status: 500 }
    )
  }
}
