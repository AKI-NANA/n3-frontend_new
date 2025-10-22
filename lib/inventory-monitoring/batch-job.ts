// 在庫監視バッチジョブ

import { supabase } from '@/lib/supabase'
import type {
  MonitoringLog,
  MonitoringTarget,
  ScrapedData,
  BatchExecutionOptions,
} from './types'
import { detectChanges, generateChangeSummary } from './change-detection'
import { recalculatePricing } from './price-recalculation'
import {
  sendMonitoringCompletedNotification,
  sendMonitoringErrorNotification,
} from './email-notification'

/**
 * スクレイピングを実行（1件ずつ）
 */
async function scrapeProduct(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch('/api/scraping/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [url],
        platforms: ['yahoo'],
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        status: 'not_found',
        error: `HTTP ${response.status}`,
      }
    }

    const data = await response.json()

    // レスポンスからデータを抽出
    if (data.success && data.results && data.results.length > 0) {
      const result = data.results[0]

      // 在庫情報の解析
      let stock = 0
      if (result.stock) {
        if (typeof result.stock === 'number') {
          stock = result.stock
        } else if (typeof result.stock === 'string') {
          // "在庫あり" → 1, "在庫なし" → 0, "5個" → 5
          if (result.stock === '在庫なし') {
            stock = 0
          } else if (result.stock === '在庫あり') {
            stock = 1
          } else {
            const match = result.stock.match(/(\d+)/)
            stock = match ? parseInt(match[1]) : 1
          }
        }
      }

      // ステータスの判定
      let status: 'active' | 'ended' | 'deleted' | 'not_found' = 'active'
      if (result.status === 'error' || result.status === 'not_found') {
        status = 'not_found'
      } else if (result.status === 'ended') {
        status = 'ended'
      }

      return {
        success: true,
        price_jpy: result.price || 0,
        stock,
        status,
        title: result.title,
        condition: result.condition,
        raw_data: result,
      }
    }

    return {
      success: false,
      status: 'not_found',
      error: 'データ取得失敗',
    }
  } catch (error: any) {
    console.error('スクレイピングエラー:', error)
    return {
      success: false,
      status: 'not_found',
      error: error.message,
    }
  }
}

/**
 * ランダム待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * ランダムな整数を生成
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 監視対象商品を取得
 */
async function getMonitoringTargets(
  maxItems: number,
  specificProductIds?: string[]
): Promise<MonitoringTarget[]> {
  let query = supabase
    .from('products')
    .select('id, sku, title, source_url, monitoring_enabled, monitoring_status, last_monitored_at, monitoring_error_count, previous_price_jpy, previous_stock, current_stock, acquired_price_jpy, listing_data, weight_g, target_profit_margin')
    .eq('monitoring_enabled', true)
    .not('source_url', 'is', null)
    .order('last_monitored_at', { ascending: true, nullsFirst: true })
    .limit(maxItems)

  if (specificProductIds && specificProductIds.length > 0) {
    query = query.in('id', specificProductIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('監視対象取得エラー:', error)
    throw error
  }

  return (data || []) as MonitoringTarget[]
}

/**
 * バッチ実行
 */
export async function executeMonitoringBatch(
  options: BatchExecutionOptions
): Promise<string> {
  const {
    type = 'manual',
    max_items = 50,
    delay_min = 30,
    delay_max = 120,
    product_ids,
  } = options

  // 実行ログを作成
  const { data: log, error: logError } = await supabase
    .from('inventory_monitoring_logs')
    .insert({
      execution_type: type,
      status: 'pending',
      scheduled_at: type === 'scheduled' ? new Date().toISOString() : null,
      settings: {
        max_items,
        delay_min,
        delay_max,
      },
    })
    .select()
    .single()

  if (logError || !log) {
    console.error('ログ作成エラー:', logError)
    throw new Error('実行ログの作成に失敗しました')
  }

  const logId = log.id

  // バックグラウンドで実行
  executeBatchInBackground(logId, options)

  return logId
}

/**
 * バックグラウンドでバッチを実行
 */
async function executeBatchInBackground(
  logId: string,
  options: BatchExecutionOptions
) {
  const {
    max_items = 50,
    delay_min = 30,
    delay_max = 120,
    product_ids,
  } = options

  try {
    // ステータスを実行中に更新
    await supabase
      .from('inventory_monitoring_logs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', logId)

    // 監視対象商品を取得
    const products = await getMonitoringTargets(max_items, product_ids)

    if (products.length === 0) {
      await supabase
        .from('inventory_monitoring_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          target_count: 0,
          processed_count: 0,
        })
        .eq('id', logId)
      return
    }

    await supabase
      .from('inventory_monitoring_logs')
      .update({
        target_count: products.length,
        product_ids: products.map((p) => p.id),
      })
      .eq('id', logId)

    let processedCount = 0
    let successCount = 0
    let errorCount = 0
    let changesDetected = 0
    let priceChanges = 0
    let stockChanges = 0
    let pageErrors = 0

    // 各商品を順次処理
    for (const product of products) {
      try {
        console.log(`[${processedCount + 1}/${products.length}] 監視中: ${product.title}`)

        // スクレイピング実行
        const scrapedData = await scrapeProduct(product.source_url)

        // 変動検知
        const changeResult = detectChanges(product, scrapedData)

        if (changeResult.hasChanges) {
          changesDetected++

          // 変動タイプをカウント
          for (const change of changeResult.changes) {
            if (change.type === 'price') priceChanges++
            if (change.type === 'stock') stockChanges++
            if (change.type === 'page_deleted' || change.type === 'page_changed')
              pageErrors++
          }

          // 各変動を記録
          for (const change of changeResult.changes) {
            let recalculatedData = null

            // 価格変動の場合は自動再計算
            if (change.type === 'price' && scrapedData.price_jpy) {
              try {
                recalculatedData = await recalculatePricing(
                  product as any,
                  scrapedData.price_jpy
                )
              } catch (error) {
                console.error('価格再計算エラー:', error)
              }
            }

            // 変動を記録
            await supabase.from('inventory_changes').insert({
              product_id: product.id,
              log_id: logId,
              change_type: change.type,
              old_value: String(change.old_value || ''),
              new_value: String(change.new_value || ''),
              old_price_jpy: change.type === 'price' ? change.old_value : null,
              new_price_jpy: change.type === 'price' ? change.new_value : null,
              old_stock: change.type === 'stock' ? change.old_value : null,
              new_stock: change.type === 'stock' ? change.new_value : null,
              recalculated_data: recalculatedData,
              recalculated_profit_margin: recalculatedData?.profit_margin,
              recalculated_ebay_price_usd: recalculatedData?.buy_it_now_price_usd,
              recalculated_shipping_cost: recalculatedData?.shipping_cost_usd,
              status: 'pending',
            })
          }

          console.log(
            `  ✅ 変動検知: ${generateChangeSummary(changeResult.changes)}`
          )
        }

        // 商品データを更新
        const updateData: any = {
          last_monitored_at: new Date().toISOString(),
          monitoring_error_count: 0,
        }

        if (scrapedData.success) {
          if (scrapedData.price_jpy !== undefined) {
            updateData.previous_price_jpy = scrapedData.price_jpy
            updateData.acquired_price_jpy = scrapedData.price_jpy
          }
          if (scrapedData.stock !== undefined) {
            updateData.previous_stock = scrapedData.stock
            updateData.current_stock = scrapedData.stock
          }
        } else {
          // エラーの場合
          updateData.monitoring_error_count = (product.monitoring_error_count || 0) + 1
          updateData.last_monitoring_error = scrapedData.error || 'Unknown error'

          // 5回連続エラーで監視を一時停止
          if (updateData.monitoring_error_count >= 5) {
            updateData.monitoring_status = 'error'
            updateData.monitoring_enabled = false
          }
        }

        await supabase.from('products').update(updateData).eq('id', product.id)

        successCount++
      } catch (error: any) {
        errorCount++
        console.error(`  ❌ エラー: ${product.title}`, error)

        // エラーログ記録
        await supabase.from('monitoring_errors').insert({
          log_id: logId,
          product_id: product.id,
          error_type: 'processing_error',
          error_message: error.message || 'Unknown error',
          source_url: product.source_url,
        })
      }

      processedCount++

      // 進捗更新
      await supabase
        .from('inventory_monitoring_logs')
        .update({
          processed_count: processedCount,
          success_count: successCount,
          error_count: errorCount,
          changes_detected: changesDetected,
          price_changes: priceChanges,
          stock_changes: stockChanges,
          page_errors: pageErrors,
        })
        .eq('id', logId)

      // 最後の商品でなければ待機
      if (processedCount < products.length) {
        const delayMs = randomInt(delay_min * 1000, delay_max * 1000)
        console.log(`  ⏳ 待機: ${Math.round(delayMs / 1000)}秒`)
        await sleep(delayMs)
      }
    }

    // 完了処理
    const startedAt = (
      await supabase
        .from('inventory_monitoring_logs')
        .select('started_at')
        .eq('id', logId)
        .single()
    ).data?.started_at

    const durationSeconds = startedAt
      ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
      : 0

    await supabase
      .from('inventory_monitoring_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', logId)

    console.log('✅ バッチ処理完了')
    console.log(`   処理件数: ${processedCount}`)
    console.log(`   成功: ${successCount}`)
    console.log(`   エラー: ${errorCount}`)
    console.log(`   変動検知: ${changesDetected}`)
    console.log(`   所要時間: ${durationSeconds}秒`)

    // メール通知を送信
    try {
      const { data: schedule } = await supabase
        .from('monitoring_schedules')
        .select('email_notification, notification_emails, notify_on_changes_only')
        .limit(1)
        .single()

      if (
        schedule?.email_notification &&
        schedule.notification_emails &&
        schedule.notification_emails.length > 0
      ) {
        // 変動があった場合のみ通知、またはすべての実行で通知
        if (!schedule.notify_on_changes_only || changesDetected > 0) {
          const finalLog = await getExecutionStatus(logId)
          if (finalLog) {
            await sendMonitoringCompletedNotification(
              finalLog,
              schedule.notification_emails
            )
          }
        }
      }
    } catch (notifyError) {
      console.error('メール通知エラー:', notifyError)
      // メール通知の失敗は無視
    }
  } catch (error: any) {
    console.error('❌ バッチ処理エラー:', error)

    await supabase
      .from('inventory_monitoring_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message,
      })
      .eq('id', logId)

    // エラー通知を送信
    try {
      const { data: schedule } = await supabase
        .from('monitoring_schedules')
        .select('email_notification, notification_emails, notify_on_errors')
        .limit(1)
        .single()

      if (
        schedule?.email_notification &&
        schedule?.notify_on_errors &&
        schedule.notification_emails &&
        schedule.notification_emails.length > 0
      ) {
        const finalLog = await getExecutionStatus(logId)
        if (finalLog) {
          await sendMonitoringErrorNotification(
            finalLog,
            schedule.notification_emails
          )
        }
      }
    } catch (notifyError) {
      console.error('エラー通知送信失敗:', notifyError)
    }
  }
}

/**
 * 実行ステータスを取得
 */
export async function getExecutionStatus(logId: string): Promise<MonitoringLog | null> {
  const { data, error } = await supabase
    .from('inventory_monitoring_logs')
    .select('*')
    .eq('id', logId)
    .single()

  if (error) {
    console.error('ステータス取得エラー:', error)
    return null
  }

  return data
}
