// app/api/inventory-monitoring/stats/route.ts
// 在庫監視システムの統計情報を取得

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // 監視対象商品数
    const { count: monitoringCount } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })
      .eq('monitoring_enabled', true)

    // 未対応変動数
    const { count: pendingChanges } = await supabase
      .from('inventory_changes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // 価格変動数
    const { count: priceChanges } = await supabase
      .from('inventory_changes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('change_type', 'price')

    // 在庫変動数
    const { count: stockChanges } = await supabase
      .from('inventory_changes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('change_type', 'stock')

    // エラー数
    const { count: errorChanges } = await supabase
      .from('inventory_changes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('change_type', ['page_deleted', 'page_error'])

    // 最新実行ログ
    const { data: latestLog } = await supabase
      .from('inventory_monitoring_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // スケジュール情報
    const { data: schedule } = await supabase
      .from('monitoring_schedules')
      .select('*')
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      stats: {
        monitoring_count: monitoringCount || 0,
        pending_changes: pendingChanges || 0,
        price_changes: priceChanges || 0,
        stock_changes: stockChanges || 0,
        error_changes: errorChanges || 0,
      },
      latest_log: latestLog,
      schedule,
    })
  } catch (error: any) {
    console.error('❌ 統計取得エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '統計取得に失敗しました',
      },
      { status: 500 }
    )
  }
}
