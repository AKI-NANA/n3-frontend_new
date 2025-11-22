// app/api/scraping/batch/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  detectPlatformsFromUrls,
  isValidUrl,
  deduplicateUrls,
  parseCsvToUrls
} from '@/lib/utils/platform-detector'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SubmitBatchRequest {
  batchName?: string
  urls?: string[]
  csvText?: string
  createdBy?: string
}

interface SubmitBatchResponse {
  success: boolean
  batchId?: string
  totalUrls?: number
  validUrls?: number
  invalidUrls?: number
  duplicateUrls?: number
  message: string
  platformBreakdown?: Record<string, number>
}

/**
 * URL一括投入API
 * POST /api/scraping/batch/submit
 *
 * リクエストボディ:
 * {
 *   batchName: string (オプション)
 *   urls: string[] (オプション - urlsまたはcsvTextのいずれか必須)
 *   csvText: string (オプション - urlsまたはcsvTextのいずれか必須)
 *   createdBy: string (オプション)
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<SubmitBatchResponse>> {
  try {
    const body: SubmitBatchRequest = await request.json()
    const { batchName, urls, csvText, createdBy } = body

    // ===== ステップ1: URL抽出 =====
    let rawUrls: string[] = []

    if (urls && Array.isArray(urls)) {
      rawUrls = urls
    } else if (csvText) {
      rawUrls = parseCsvToUrls(csvText)
    } else {
      return NextResponse.json({
        success: false,
        message: 'urlsまたはcsvTextのいずれかを指定してください'
      }, { status: 400 })
    }

    console.log(`📥 バッチ投入リクエスト受信: ${rawUrls.length}件のURL`)

    // ===== ステップ2: URLバリデーション =====
    const validUrls = rawUrls.filter(isValidUrl)
    const invalidUrls = rawUrls.filter(url => !isValidUrl(url))

    if (validUrls.length === 0) {
      return NextResponse.json({
        success: false,
        message: '有効なURLが1つもありません',
        validUrls: 0,
        invalidUrls: invalidUrls.length
      }, { status: 400 })
    }

    // ===== ステップ3: 重複除去 =====
    const uniqueUrls = deduplicateUrls(validUrls)
    const duplicateCount = validUrls.length - uniqueUrls.length

    console.log(`✅ バリデーション完了: 有効${uniqueUrls.length}件, 無効${invalidUrls.length}件, 重複${duplicateCount}件`)

    // ===== ステップ4: 既存キュー内での重複チェック =====
    const { data: existingTasks, error: checkError } = await supabase
      .from('scraping_queue')
      .select('target_url')
      .in('target_url', uniqueUrls)
      .in('status', ['pending', 'processing'])

    if (checkError) {
      console.error('❌ 既存タスクチェックエラー:', checkError)
      throw new Error(`既存タスクチェック失敗: ${checkError.message}`)
    }

    const existingUrls = new Set(existingTasks?.map(t => t.target_url) || [])
    const newUrls = uniqueUrls.filter(url => !existingUrls.has(url))
    const alreadyQueuedCount = uniqueUrls.length - newUrls.length

    if (newUrls.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'すべてのURLが既にキューに存在します',
        totalUrls: 0,
        duplicateUrls: alreadyQueuedCount
      }, { status: 400 })
    }

    console.log(`🔍 重複チェック: 新規${newUrls.length}件, 既存${alreadyQueuedCount}件`)

    // ===== ステップ5: プラットフォーム判定 =====
    const urlsWithPlatforms = detectPlatformsFromUrls(newUrls)

    // プラットフォーム別集計
    const platformBreakdown: Record<string, number> = {}
    urlsWithPlatforms.forEach(({ platform }) => {
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1
    })

    console.log('🏷️  プラットフォーム判定結果:', platformBreakdown)

    // ===== ステップ6: バッチレコード作成 =====
    const { data: batch, error: batchError } = await supabase
      .from('scraping_batches')
      .insert({
        batch_name: batchName || `バッチ_${new Date().toISOString().slice(0, 10)}`,
        total_urls: newUrls.length,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        status: 'queued',
        created_by: createdBy || 'system'
      })
      .select()
      .single()

    if (batchError || !batch) {
      console.error('❌ バッチ作成エラー:', batchError)
      throw new Error(`バッチ作成失敗: ${batchError?.message}`)
    }

    console.log(`✅ バッチ作成完了: ID ${batch.id}`)

    // ===== ステップ7: キューにタスク一括挿入 =====
    const queueTasks = urlsWithPlatforms.map(({ url, platform }) => ({
      batch_id: batch.id,
      target_url: url,
      platform: platform,
      status: 'pending' as const,
      retry_count: 0
    }))

    const { error: queueError } = await supabase
      .from('scraping_queue')
      .insert(queueTasks)

    if (queueError) {
      console.error('❌ キュー挿入エラー:', queueError)
      // バッチ作成は成功しているので、ロールバック
      await supabase.from('scraping_batches').delete().eq('id', batch.id)
      throw new Error(`キュー挿入失敗: ${queueError.message}`)
    }

    console.log(`✅ キュー挿入完了: ${queueTasks.length}件`)

    // ===== ステップ8: 成功レスポンス =====
    return NextResponse.json({
      success: true,
      batchId: batch.id,
      totalUrls: newUrls.length,
      validUrls: validUrls.length,
      invalidUrls: invalidUrls.length,
      duplicateUrls: duplicateCount + alreadyQueuedCount,
      message: `${newUrls.length}件のURLをバッチキューに追加しました`,
      platformBreakdown
    })

  } catch (error: any) {
    console.error('❌ バッチ投入エラー:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'バッチ投入に失敗しました'
    }, { status: 500 })
  }
}

/**
 * バッチ一覧取得API
 * GET /api/scraping/batch/submit
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    let query = supabase
      .from('scraping_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: batches, error } = await query

    if (error) {
      throw new Error(`バッチ一覧取得失敗: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      batches,
      count: batches?.length || 0
    })

  } catch (error: any) {
    console.error('❌ バッチ一覧取得エラー:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'バッチ一覧取得に失敗しました'
    }, { status: 500 })
  }
}
