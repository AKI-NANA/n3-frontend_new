// app/api/cron/execute-schedules/route.ts
/**
 * 自動出品実行Cronエンドポイント
 * 
 * 実行頻度: 1分ごと
 * 処理内容:
 * 1. 現在時刻±5分のスケジュールを取得
 * 2. ステータスが'pending'のスケジュールのみ処理
 * 3. 各スケジュールの商品を順次出品
 * 4. 実行ログを記録
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listProductToEbay } from '@/lib/ebay/inventory'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 認証チェック（Vercel Cronからの呼び出しのみ許可）
function isAuthorizedCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'dev-secret-key'
  
  // 開発環境ではチェックをスキップ
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  // Vercel Cronからの呼び出しをチェック
  return authHeader === `Bearer ${cronSecret}`
}

interface ExecutionResult {
  scheduleId: string
  productsProcessed: number
  successCount: number
  failedCount: number
  errors: string[]
  duration: number
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 認証チェック
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 現在時刻（日本時間）
    const JST_OFFSET = 9 * 60 * 60 * 1000
    const now = new Date(Date.now() + JST_OFFSET)
    
    // ±5分の範囲
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000)
    
    console.log('🔍 スケジュールチェック:', {
      now: now.toISOString(),
      range: {
        from: fiveMinutesAgo.toISOString(),
        to: fiveMinutesLater.toISOString()
      }
    })
    
    // 実行対象のスケジュールを取得
    const { data: schedules, error: schedulesError } = await supabase
      .from('listing_schedules')
      .select('*')
      .eq('status', 'pending')
      .gte('scheduled_time', fiveMinutesAgo.toISOString())
      .lte('scheduled_time', fiveMinutesLater.toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(5) // タイムアウト対策: 最大5セッション
    
    if (schedulesError) {
      throw new Error(`スケジュール取得エラー: ${schedulesError.message}`)
    }
    
    if (!schedules || schedules.length === 0) {
      console.log('✅ 実行対象のスケジュールなし')
      return NextResponse.json({
        message: 'No schedules to execute',
        timestamp: now.toISOString()
      })
    }
    
    console.log(`📋 ${schedules.length}件のスケジュールを処理開始`)
    
    const results: ExecutionResult[] = []
    
    // 各スケジュールを順次処理
    for (const schedule of schedules) {
      const result = await executeSchedule(schedule, supabase)
      results.push(result)
      
      // 各スケジュール間に1秒待機（レート制限対策）
      await sleep(1000)
    }
    
    // 実行ログを記録
    const totalDuration = Date.now() - startTime
    await logExecution(results, totalDuration, supabase)
    
    // サマリー
    const summary = {
      schedulesProcessed: results.length,
      totalProducts: results.reduce((sum, r) => sum + r.productsProcessed, 0),
      totalSuccess: results.reduce((sum, r) => sum + r.successCount, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failedCount, 0),
      durationMs: totalDuration,
      timestamp: now.toISOString()
    }
    
    console.log('✅ 実行完了:', summary)
    
    return NextResponse.json({
      success: true,
      summary,
      results
    })
    
  } catch (error: any) {
    console.error('❌ Cron実行エラー:', error)
    
    return NextResponse.json(
      {
        error: 'Cron execution failed',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * 単一スケジュールの実行
 */
async function executeSchedule(
  schedule: any,
  supabase: any
): Promise<ExecutionResult> {
  const startTime = Date.now()
  const errors: string[] = []
  
  console.log(`🚀 スケジュール実行開始: ${schedule.id}`)
  
  try {
    // ステータスを'in_progress'に更新
    await supabase
      .from('listing_schedules')
      .update({ 
        status: 'in_progress',
        actual_time: new Date().toISOString()
      })
      .eq('id', schedule.id)
    
    // 対象商品を取得（承認済みかつ出品待ち）
    const { data: products, error: productsError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .eq('listing_session_id', schedule.id.toString())
      .eq('status', 'ready_to_list')
      .eq('approval_status', 'approved')
      .order('ai_confidence_score', { ascending: false })
    
    if (productsError) {
      throw new Error(`商品取得エラー: ${productsError.message}`)
    }
    
    if (!products || products.length === 0) {
      console.log(`⚠️ スケジュール${schedule.id}: 出品対象商品なし`)
      
      await supabase
        .from('listing_schedules')
        .update({ 
          status: 'completed',
          actual_count: 0
        })
        .eq('id', schedule.id)
      
      return {
        scheduleId: schedule.id,
        productsProcessed: 0,
        successCount: 0,
        failedCount: 0,
        errors: [],
        duration: Date.now() - startTime
      }
    }
    
    console.log(`📦 ${products.length}件の商品を出品開始`)
    
    let successCount = 0
    let failedCount = 0
    
    // アカウントマッピング
    const accountMap: Record<string, 'account1' | 'account2'> = {
      'account1': 'account1',
      'account2': 'account2'
    }
    
    // 商品間隔の設定（ランダム化）
    const intervalMin = schedule.item_interval_min || 20
    const intervalMax = schedule.item_interval_max || 120
    
    // 各商品を順次出品
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      
      try {
        // eBayに出品
        if (schedule.marketplace === 'ebay') {
          const ebayAccount = accountMap[schedule.account] || 'account1'
          const result = await listProductToEbay(product, ebayAccount)
          
          if (result.success) {
            // 出品成功
            await supabase
              .from('yahoo_scraped_products')
              .update({ 
                status: 'listed',
                listed_at: new Date().toISOString()
              })
              .eq('id', product.id)
            
            // 出品履歴に記録
            await supabase
              .from('listing_history')
              .insert({
                product_id: product.id,
                schedule_id: schedule.id,
                marketplace: schedule.marketplace,
                account: schedule.account,
                listed_at: new Date().toISOString(),
                listing_id: result.listingId,
                status: 'success'
              })
            
            successCount++
            console.log(`✅ 商品${product.id} (${product.sku}): 出品成功`)
          } else {
            throw new Error(result.error || '出品失敗')
          }
        }
        
        // 次の商品まで待機（最後の商品以外）
        if (i < products.length - 1) {
          const interval = randomBetween(intervalMin * 1000, intervalMax * 1000)
          await sleep(interval)
        }
        
      } catch (error: any) {
        console.error(`❌ 商品${product.id}の出品エラー:`, error)
        
        // 出品失敗を記録
        await supabase
          .from('listing_history')
          .insert({
            product_id: product.id,
            schedule_id: schedule.id,
            marketplace: schedule.marketplace,
            account: schedule.account,
            listed_at: new Date().toISOString(),
            status: 'failed',
            error_message: error.message
          })
        
        errors.push(`${product.sku}: ${error.message}`)
        failedCount++
      }
    }
    
    // スケジュールを完了に更新
    await supabase
      .from('listing_schedules')
      .update({ 
        status: 'completed',
        actual_count: successCount
      })
      .eq('id', schedule.id)
    
    console.log(`✅ スケジュール${schedule.id}完了: 成功${successCount}件 / 失敗${failedCount}件`)
    
    return {
      scheduleId: schedule.id,
      productsProcessed: products.length,
      successCount,
      failedCount,
      errors,
      duration: Date.now() - startTime
    }
    
  } catch (error: any) {
    console.error(`❌ スケジュール${schedule.id}実行エラー:`, error)
    
    // エラー状態に更新
    await supabase
      .from('listing_schedules')
      .update({ 
        status: 'failed',
        error_message: error.message
      })
      .eq('id', schedule.id)
    
    return {
      scheduleId: schedule.id,
      productsProcessed: 0,
      successCount: 0,
      failedCount: 1,
      errors: [error.message],
      duration: Date.now() - startTime
    }
  }
}

/**
 * 実行ログを記録
 */
async function logExecution(
  results: ExecutionResult[],
  duration: number,
  supabase: any
): Promise<void> {
  try {
    const totalProcessed = results.reduce((sum, r) => sum + r.productsProcessed, 0)
    const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0)
    const totalFailed = results.reduce((sum, r) => sum + r.failedCount, 0)
    const allErrors = results.flatMap(r => r.errors)
    
    await supabase
      .from('cron_execution_logs')
      .insert({
        execution_time: new Date().toISOString(),
        schedules_processed: results.length,
        products_listed: totalSuccess,
        errors_count: totalFailed,
        error_details: allErrors.length > 0 ? { errors: allErrors } : null,
        duration_ms: duration
      })
    
    console.log('📝 実行ログ記録完了')
  } catch (error) {
    console.error('実行ログ記録エラー:', error)
  }
}

/**
 * ユーティリティ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
