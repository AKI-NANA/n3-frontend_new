/**
 * 在庫・価格追従システム (B-3) 実行API
 * 複数URL対応の在庫追従バッチを実行
 */

import { NextRequest, NextResponse } from 'next/server'
import { trackInventoryBatch, trackInventory, CheckFrequency } from '@/services/InventoryTracker'

/**
 * GET: バッチ実行
 * POST: 単一商品の在庫追従
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // クエリパラメータから設定を取得
    const max_items = parseInt(searchParams.get('max_items') || '50')
    const check_frequency = searchParams.get('check_frequency') as CheckFrequency | undefined
    const delay_min = parseInt(searchParams.get('delay_min') || '30')
    const delay_max = parseInt(searchParams.get('delay_max') || '120')

    console.log('[API] 在庫追従バッチ実行開始')
    console.log(`  最大件数: ${max_items}`)
    console.log(`  頻度フィルタ: ${check_frequency || '全て'}`)
    console.log(`  待機時間: ${delay_min}~${delay_max}秒`)

    // バッチ実行
    const result = await trackInventoryBatch({
      max_items,
      check_frequency,
      delay_min_seconds: delay_min,
      delay_max_seconds: delay_max,
    })

    return NextResponse.json({
      success: true,
      message: 'バッチ処理が完了しました',
      result,
    })
  } catch (error: any) {
    console.error('[API] バッチ実行エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id } = body

    if (!product_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'product_id is required',
        },
        { status: 400 }
      )
    }

    console.log(`[API] 在庫追従実行: ${product_id}`)

    // 単一商品の在庫追従
    const result = await trackInventory(product_id)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: any) {
    console.error('[API] 在庫追従エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
