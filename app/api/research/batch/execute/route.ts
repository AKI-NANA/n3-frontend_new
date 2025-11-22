// app/api/research/batch/execute/route.ts
// 大規模データ一括取得バッチ - バッチ実行エンドポイント

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  incrementApiCallCount,
  waitBeforeApiCall,
  canMakeApiCallSafely
} from '@/lib/research/api-call-tracker'
import { saveResearchResults, type ResearchResult } from '@/lib/research/research-db'

// Supabase クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// eBay Finding API エンドポイント
const EBAY_FINDING_API = 'https://svcs.ebay.com/services/search/FindingService/v1'
const API_NAME = 'ebay_finding_batch'
const MAX_ITEMS_PER_PAGE = 100
const DELAY_AFTER_TASK_SECONDS = 5

interface BatchTask {
  task_id: string
  batch_id: string
  target_seller_id: string
  target_date_range: string
  date_start: string
  date_end: string
  status: string
  processed_count: number
  total_pages: number
  current_page: number
  retry_count: number
}

/**
 * バッチ実行エンドポイント
 *
 * POST /api/research/batch/execute
 *
 * Pending状態のタスクを1つ取得し、eBay Finding APIをコールして
 * データを取得します。VPS上のCron Jobから定期的に呼び出されることを想定。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task_id, max_tasks = 1 } = body

    console.log('🚀 バッチ実行開始')

    // タスクを取得
    let tasksToProcess: BatchTask[] = []

    if (task_id) {
      // 特定のタスクを実行
      const { data, error } = await supabase
        .from('batch_tasks')
        .select('*')
        .eq('task_id', task_id)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: 'タスクが見つかりません' },
          { status: 404 }
        )
      }

      tasksToProcess = [data as BatchTask]
    } else {
      // Pending状態のタスクを取得
      const { data, error } = await supabase
        .from('batch_tasks')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: true })
        .limit(max_tasks)

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        return NextResponse.json({
          success: true,
          message: '実行待ちのタスクはありません',
          processed: 0
        })
      }

      tasksToProcess = data as BatchTask[]
    }

    console.log(`📋 処理対象タスク: ${tasksToProcess.length} 件`)

    let successCount = 0
    let failCount = 0

    // 各タスクを処理
    for (const task of tasksToProcess) {
      try {
        console.log(`\n--- タスク開始: ${task.task_id} ---`)
        console.log(`  セラー: ${task.target_seller_id}`)
        console.log(`  期間: ${task.target_date_range}`)

        // タスクステータスを Processing に更新
        await supabase
          .from('batch_tasks')
          .update({
            status: 'Processing',
            started_at: new Date().toISOString()
          })
          .eq('task_id', task.task_id)

        // タスクを実行
        await executeTask(task)

        // タスクステータスを Completed に更新
        await supabase
          .from('batch_tasks')
          .update({
            status: 'Completed',
            completed_at: new Date().toISOString()
          })
          .eq('task_id', task.task_id)

        // 親バッチの completed_tasks_count を更新
        await supabase.rpc('increment_batch_completed_tasks', {
          p_batch_id: task.batch_id
        })

        successCount++
        console.log(`✅ タスク完了: ${task.task_id}`)

        // レート制限回避のための遅延処理
        if (tasksToProcess.length > 1 && successCount < tasksToProcess.length) {
          console.log(`⏳ 遅延処理: ${DELAY_AFTER_TASK_SECONDS} 秒待機...`)
          await sleep(DELAY_AFTER_TASK_SECONDS * 1000)
        }

      } catch (error: any) {
        failCount++
        console.error(`❌ タスク失敗: ${task.task_id}`, error)

        // タスクステータスを Failed に更新
        await supabase
          .from('batch_tasks')
          .update({
            status: 'Failed',
            error_message: error.message || 'Unknown error',
            retry_count: task.retry_count + 1,
            completed_at: new Date().toISOString()
          })
          .eq('task_id', task.task_id)

        // 親バッチの failed_tasks_count を更新
        await supabase.rpc('increment_batch_failed_tasks', {
          p_batch_id: task.batch_id
        })
      }
    }

    console.log(`\n✅ バッチ実行完了`)
    console.log(`  成功: ${successCount} 件`)
    console.log(`  失敗: ${failCount} 件`)

    return NextResponse.json({
      success: true,
      processed: tasksToProcess.length,
      succeeded: successCount,
      failed: failCount
    })

  } catch (error: any) {
    console.error('❌ バッチ実行エラー:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'バッチ実行に失敗しました'
      },
      { status: 500 }
    )
  }
}

/**
 * 個別タスクの実行
 */
async function executeTask(task: BatchTask): Promise<void> {
  // API呼び出し可能かチェック
  const safetyCheck = await canMakeApiCallSafely(API_NAME)

  if (!safetyCheck.canCall) {
    throw new Error(`API呼び出し制限: ${safetyCheck.reason}`)
  }

  const appId = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID_MJT

  if (!appId) {
    throw new Error('EBAY_APP_ID が設定されていません')
  }

  // 親バッチからキーワードを取得
  const { data: batchData } = await supabase
    .from('research_batches')
    .select('keyword')
    .eq('batch_id', task.batch_id)
    .single()

  const keyword = batchData?.keyword || ''

  let totalRetrievedItems = 0
  let currentPage = 1
  let totalPages = 1

  // ページネーション処理
  while (currentPage <= totalPages) {
    console.log(`  📄 ページ ${currentPage} / ${totalPages} をリクエスト中...`)

    // API呼び出し前の待機処理
    await waitBeforeApiCall()

    // eBay Finding API パラメータ構築
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'paginationInput.entriesPerPage': MAX_ITEMS_PER_PAGE.toString(),
      'paginationInput.pageNumber': currentPage.toString(),
    })

    // キーワードフィルター（オプション）
    if (keyword) {
      params.append('keywords', keyword)
    }

    // セラーIDフィルター（必須）
    params.append('itemFilter(0).name', 'Seller')
    params.append('itemFilter(0).value', task.target_seller_id)

    // 日付範囲フィルター
    const startDate = new Date(task.date_start)
    const endDate = new Date(task.date_end)

    params.append('itemFilter(1).name', 'EndTimeFrom')
    params.append('itemFilter(1).value', startDate.toISOString())

    params.append('itemFilter(2).name', 'EndTimeTo')
    params.append('itemFilter(2).value', endDate.toISOString())

    // Sold items のみ
    params.append('itemFilter(3).name', 'SoldItemsOnly')
    params.append('itemFilter(3).value', 'true')

    const apiUrl = `${EBAY_FINDING_API}?${params.toString()}`

    // API呼び出しカウントを増加
    await incrementApiCallCount(API_NAME)

    // API呼び出し
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`eBay API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const findItemsResponse = data.findCompletedItemsResponse?.[0]

    if (!findItemsResponse) {
      throw new Error('eBay APIレスポンスの形式が不正です')
    }

    const ack = findItemsResponse.ack?.[0]

    if (ack !== 'Success') {
      const errorMessage = findItemsResponse.errorMessage?.[0]?.error?.[0]?.message?.[0] || 'Unknown error'
      throw new Error(`eBay API Error: ${errorMessage}`)
    }

    const searchResult = findItemsResponse.searchResult?.[0]
    const items = searchResult?.item || []
    const totalEntries = parseInt(searchResult?.['@count'] || '0')

    // 総ページ数の計算（初回のみ）
    if (currentPage === 1) {
      totalPages = Math.ceil(totalEntries / MAX_ITEMS_PER_PAGE)
      console.log(`  📊 総アイテム数: ${totalEntries} 件 (${totalPages} ページ)`)
    }

    // データを research_results に保存
    if (items.length > 0) {
      const researchResults: ResearchResult[] = items.map((item: any) => ({
        search_keyword: keyword || task.target_seller_id,
        ebay_item_id: item.itemId?.[0] || '',
        title: item.title?.[0] || '',
        price_usd: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
        sold_count: parseInt(item.sellingStatus?.[0]?.quantitySold?.[0] || '0'),
        category_id: item.primaryCategory?.[0]?.categoryId?.[0] || '',
        category_name: item.primaryCategory?.[0]?.categoryName?.[0] || '',
        condition: item.condition?.[0]?.conditionDisplayName?.[0] || '',
        seller_username: item.sellerInfo?.[0]?.sellerUserName?.[0] || '',
        image_url: item.galleryURL?.[0] || '',
        view_item_url: item.viewItemURL?.[0] || '',
        listing_type: item.listingInfo?.[0]?.listingType?.[0] || '',
        location_country: item.country?.[0] || '',
        location_city: item.location?.[0] || '',
        shipping_cost_usd: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || '0')
      }))

      await saveResearchResults(researchResults)
      totalRetrievedItems += items.length

      console.log(`  💾 ${items.length} 件を保存完了 (累計: ${totalRetrievedItems} 件)`)
    }

    // タスクの進捗を更新
    await supabase
      .from('batch_tasks')
      .update({
        processed_count: totalRetrievedItems,
        total_pages: totalPages,
        current_page: currentPage
      })
      .eq('task_id', task.task_id)

    currentPage++

    // ページ間の待機（最後のページでない場合）
    if (currentPage <= totalPages) {
      await sleep(2000) // 2秒待機
    }
  }

  // 親バッチの total_items_retrieved を更新
  await supabase.rpc('increment_batch_items_retrieved', {
    p_batch_id: task.batch_id,
    p_count: totalRetrievedItems
  })

  console.log(`  ✅ タスク完了: ${totalRetrievedItems} 件取得`)
}

/**
 * スリープ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * バッチステータス取得エンドポイント
 *
 * GET /api/research/batch/execute?batch_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'batch_id は必須です' },
        { status: 400 }
      )
    }

    // バッチ情報を取得
    const { data: batch, error: batchError } = await supabase
      .from('research_batches')
      .select('*')
      .eq('batch_id', batchId)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { success: false, error: 'バッチが見つかりません' },
        { status: 404 }
      )
    }

    // タスク一覧を取得
    const { data: tasks, error: tasksError } = await supabase
      .from('batch_tasks')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })

    if (tasksError) {
      throw tasksError
    }

    return NextResponse.json({
      success: true,
      batch,
      tasks
    })

  } catch (error: any) {
    console.error('❌ バッチステータス取得エラー:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'バッチステータス取得に失敗しました'
      },
      { status: 500 }
    )
  }
}
