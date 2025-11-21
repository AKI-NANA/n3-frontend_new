/**
 * 在庫同期ワーカーAPI
 * inventory_sync_queue を処理して各モールに同期
 */

import { NextRequest, NextResponse } from 'next/server'
import { runInventorySyncWorker } from '@/services/InventorySyncWorker'

export async function GET(request: NextRequest) {
  // 認証チェック（本番環境）
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const maxItems = parseInt(searchParams.get('max_items') || '50')
  const delayMs = parseInt(searchParams.get('delay_ms') || '1000')

  try {
    console.log('[API] 在庫同期ワーカー実行開始')

    const result = await runInventorySyncWorker({
      maxItems,
      delayMs,
    })

    return NextResponse.json({
      success: true,
      message: '在庫同期ワーカーが完了しました',
      result,
    })
  } catch (error: any) {
    console.error('[API] 在庫同期ワーカーエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
