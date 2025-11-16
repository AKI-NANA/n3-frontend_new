/**
 * 有在庫判定キュー取得API
 * GET /api/inventory/classification-queue
 * 
 * 未判定データを取得（is_stock = NULL）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    
    // URLパラメータ取得
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const marketplace = searchParams.get('marketplace') // フィルター用
    
    // クエリ構築
    let query = supabase
      .from('stock_classification_queue')
      .select('*')
      .is('is_stock', null) // 未判定のみ
      .order('created_at', { ascending: false })
      .limit(limit)
    
    // マーケットプレイスフィルター
    if (marketplace && marketplace !== 'all') {
      query = query.eq('marketplace', marketplace)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('キュー取得エラー:', error)
      return NextResponse.json(
        { error: `キュー取得失敗: ${error.message}` },
        { status: 500 }
      )
    }
    
    // 未判定件数も取得
    const { count } = await supabase
      .from('stock_classification_queue')
      .select('*', { count: 'exact', head: true })
      .is('is_stock', null)
    
    return NextResponse.json({
      success: true,
      data: data || [],
      total_pending: count || 0
    })
    
  } catch (error: any) {
    console.error('API エラー:', error)
    return NextResponse.json(
      { error: `内部エラー: ${error.message}` },
      { status: 500 }
    )
  }
}
