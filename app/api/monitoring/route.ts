/**
 * 在庫監視 API エンドポイント
 * products_master商品のリアルタイム監視を実行
 */

import { NextRequest, NextResponse } from 'next/server'
import { monitorProducts, runScheduledMonitoring } from '@/lib/inventory-monitoring/real-time-monitor'

/**
 * POST: 監視実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productIds,
      autoUpdateEbay = false,
      batchSize = 50,
      delayMs = 2000
    } = body

    // 監視実行
    const result = await monitorProducts(productIds, {
      autoUpdateEbay,
      batchSize,
      delayMs
    })

    return NextResponse.json({
      success: true,
      logId: result.logId,
      processed: result.processed,
      changes: result.changes,
      errors: result.errors,
      details: result.details
    })

  } catch (error: any) {
    console.error('Monitoring error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET: 監視ログ・統計の取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const logId = searchParams.get('logId')
    const limit = parseInt(searchParams.get('limit') || '20')

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    if (logId) {
      // 特定のログを取得
      const { data: log, error } = await supabase
        .from('monitoring_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Log not found' },
          { status: 404 }
        )
      }

      // 関連する変動データも取得
      const { data: changes } = await supabase
        .from('inventory_changes')
        .select(`
          *,
          product:products_master(id, sku, title_ja, title_en)
        `)
        .eq('log_id', logId)
        .order('detected_at', { ascending: false })

      return NextResponse.json({
        success: true,
        log,
        changes: changes || []
      })
    }

    // 最近のログ一覧を取得
    const { data: logs, error } = await supabase
      .from('monitoring_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // 統計情報を集計
    const stats = {
      total_executions: logs.length,
      completed: logs.filter(l => l.status === 'completed').length,
      failed: logs.filter(l => l.status === 'failed').length,
      running: logs.filter(l => l.status === 'running').length,
      total_changes: logs.reduce((sum, l) => sum + (l.changes_detected || 0), 0),
      total_price_changes: logs.reduce((sum, l) => sum + (l.price_changes || 0), 0),
      total_stock_changes: logs.reduce((sum, l) => sum + (l.stock_changes || 0), 0),
      total_errors: logs.reduce((sum, l) => sum + (l.error_count || 0), 0)
    }

    return NextResponse.json({
      success: true,
      logs,
      stats
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
