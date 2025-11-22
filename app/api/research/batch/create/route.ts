// app/api/research/batch/create/route.ts
// 大規模データ一括取得バッチ - バッチ作成エンドポイント

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateBatchTasks, calculateBatchStatistics } from '@/lib/research/batch-processor'

// Supabase クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CreateBatchRequest {
  target_seller_ids: string[]   // セラーIDリスト
  start_date: string            // 開始日 (YYYY-MM-DD)
  end_date: string              // 終了日 (YYYY-MM-DD)
  keyword?: string              // キーワード（オプション）
  split_unit_days?: number      // 分割単位（デフォルト: 7日間）
}

/**
 * バッチ作成エンドポイント
 *
 * POST /api/research/batch/create
 *
 * ユーザーが設定したリサーチ条件を受け取り、
 * 日付分割ロジックにより複数のタスクに分解してDBに保存します。
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateBatchRequest = await request.json()

    console.log('🔍 バッチ作成リクエスト:', body)

    // バリデーション
    const {
      target_seller_ids,
      start_date,
      end_date,
      keyword = '',
      split_unit_days = 7
    } = body

    if (!target_seller_ids || target_seller_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ターゲットセラーIDは必須です' },
        { status: 400 }
      )
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: '開始日と終了日は必須です' },
        { status: 400 }
      )
    }

    // 日付形式の検証
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: '日付形式が不正です (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: '開始日は終了日より前である必要があります' },
        { status: 400 }
      )
    }

    // セラーIDリストのクリーニング（空白を除去）
    const cleanedSellerIds = target_seller_ids
      .map(id => id.trim())
      .filter(id => id.length > 0)

    if (cleanedSellerIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '有効なセラーIDがありません' },
        { status: 400 }
      )
    }

    console.log('✅ バリデーション完了')
    console.log(`  セラー数: ${cleanedSellerIds.length}`)
    console.log(`  期間: ${start_date} 〜 ${end_date}`)

    // 統計情報を計算
    const stats = calculateBatchStatistics(
      cleanedSellerIds,
      start_date,
      end_date,
      split_unit_days
    )

    console.log('📊 バッチ統計:')
    console.log(`  総セラー数: ${stats.totalSellers}`)
    console.log(`  総日数: ${stats.totalDays}`)
    console.log(`  日付範囲数: ${stats.totalDateRanges}`)
    console.log(`  総タスク数: ${stats.totalTasks}`)
    console.log(`  推定APIコール数: ${stats.estimatedApiCalls}`)

    // STEP 1: research_batches に親レコードを挿入
    console.log('\n📝 STEP 1: バッチレコード作成中...')

    const { data: batchData, error: batchError } = await supabase
      .from('research_batches')
      .insert({
        target_seller_ids: cleanedSellerIds,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        keyword: keyword || null,
        status: 'Pending',
        total_tasks_count: stats.totalTasks,
        completed_tasks_count: 0,
        failed_tasks_count: 0,
        total_items_retrieved: 0
      })
      .select()
      .single()

    if (batchError || !batchData) {
      console.error('❌ バッチレコード作成失敗:', batchError)
      throw new Error(`バッチレコード作成に失敗しました: ${batchError?.message}`)
    }

    const batchId = batchData.batch_id
    console.log(`✅ バッチレコード作成完了: ${batchId}`)

    // STEP 2: 日付分割ロジックを呼び出してタスクを生成
    console.log('\n🔧 STEP 2: タスク生成中...')

    const tasks = generateBatchTasks(
      cleanedSellerIds,
      start_date,
      end_date,
      split_unit_days
    )

    console.log(`✅ ${tasks.length} 件のタスクを生成しました`)

    // STEP 3: batch_tasks テーブルに子タスクレコードを挿入
    console.log('\n💾 STEP 3: タスクをDBに保存中...')

    const taskRecords = tasks.map(task => ({
      batch_id: batchId,
      target_seller_id: task.targetSellerId,
      target_date_range: task.targetDateRange,
      date_start: new Date(task.dateRange.startDate).toISOString(),
      date_end: new Date(task.dateRange.endDate).toISOString(),
      status: 'Pending',
      processed_count: 0,
      total_pages: 0,
      current_page: 0,
      retry_count: 0
    }))

    // バッチ挿入（1000件ずつに分割）
    const BATCH_SIZE = 1000
    let insertedCount = 0

    for (let i = 0; i < taskRecords.length; i += BATCH_SIZE) {
      const batch = taskRecords.slice(i, i + BATCH_SIZE)

      const { error: tasksError } = await supabase
        .from('batch_tasks')
        .insert(batch)

      if (tasksError) {
        console.error('❌ タスク挿入失敗:', tasksError)

        // ロールバック: 親バッチレコードを削除
        await supabase
          .from('research_batches')
          .delete()
          .eq('batch_id', batchId)

        throw new Error(`タスク保存に失敗しました: ${tasksError.message}`)
      }

      insertedCount += batch.length
      console.log(`  進捗: ${insertedCount} / ${taskRecords.length} タスク保存完了`)
    }

    console.log('✅ 全タスク保存完了')

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      batch_id: batchId,
      statistics: {
        total_sellers: stats.totalSellers,
        total_days: stats.totalDays,
        total_date_ranges: stats.totalDateRanges,
        total_tasks: stats.totalTasks,
        estimated_api_calls: stats.estimatedApiCalls
      },
      message: `バッチ作成完了: ${stats.totalTasks} 件のタスクを生成しました`
    })

  } catch (error: any) {
    console.error('❌ バッチ作成エラー:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'バッチ作成に失敗しました'
      },
      { status: 500 }
    )
  }
}

/**
 * バッチ一覧取得エンドポイント
 *
 * GET /api/research/batch/create?limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data: batches, error } = await supabase
      .from('research_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      batches
    })

  } catch (error: any) {
    console.error('❌ バッチ一覧取得エラー:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'バッチ一覧取得に失敗しました'
      },
      { status: 500 }
    )
  }
}
