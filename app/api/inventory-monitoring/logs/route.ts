// app/api/inventory-monitoring/logs/route.ts
// 実行履歴を取得

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    let query = supabase
      .from('inventory_monitoring_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      logs: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('❌ ログ取得エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'ログ取得に失敗しました',
      },
      { status: 500 }
    )
  }
}
