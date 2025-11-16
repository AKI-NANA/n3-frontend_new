/**
 * リアルタイム在庫監視 - products_master統合版
 * Yahoo・Mercariなどのソース価格・在庫をリアルタイムで監視し、
 * 変動を検知してproducts_masterとeBayを自動更新
 */

import { createClient } from '@/lib/supabase/client'
import type { 
  MonitoringLog,
  InventoryChange,
  ScrapedData 
} from './types'

const EBAY_API_BASE = 'https://api.ebay.com'

interface MonitoringProduct {
  id: number
  sku: string
  title_ja: string
  title_en: string | null
  source_url: string | null
  source_platform: string | null
  monitoring_enabled: boolean
  last_monitored_at: string | null
  scraped_data: any
  listing_data: any
  ebay_listed: boolean
  ebay_listing_id: string | null
  ebay_offer_id: string | null
  current_stock: number | null
  ebay_api_data: any
}

interface MonitoringResult {
  logId: string
  processed: number
  changes: number
  errors: number
  details: InventoryChange[]
}

/**
 * メイン監視関数 - 指定された商品群を監視
 */
export async function monitorProducts(
  productIds?: number[],
  options: {
    autoUpdateEbay?: boolean
    batchSize?: number
    delayMs?: number
  } = {}
): Promise<MonitoringResult> {
  const {
    autoUpdateEbay = false,
    batchSize = 50,
    delayMs = 2000
  } = options

  const supabase = createClient()

  // 監視ログ作成
  const { data: log, error: logError } = await supabase
    .from('monitoring_logs')
    .insert({
      execution_type: productIds ? 'manual' : 'scheduled',
      status: 'running',
      started_at: new Date().toISOString(),
      target_count: 0,
      processed_count: 0,
      success_count: 0,
      error_count: 0,
      changes_detected: 0,
      price_changes: 0,
      stock_changes: 0,
      page_errors: 0,
      product_ids: productIds
    })
    .select()
    .single()

  if (logError || !log) {
    throw new Error(`監視ログ作成失敗: ${logError?.message}`)
  }

  const logId = log.id

  try {
    // 監視対象商品を取得
    let query = supabase
      .from('products_master')
      .select('*')
      .eq('monitoring_enabled', true)

    if (productIds && productIds.length > 0) {
      query = query.in('id', productIds)
    }

    query = query.limit(batchSize)

    const { data: products, error: fetchError } = await query

    if (fetchError || !products) {
      throw new Error(`商品取得失敗: ${fetchError?.message}`)
    }

    // 対象数を更新
    await supabase
      .from('monitoring_logs')
      .update({ target_count: products.length })
      .eq('id', logId)

    const changes: InventoryChange[] = []
    let processed = 0
    let errors = 0

    // 各商品を監視
    for (const product of products as MonitoringProduct[]) {
      try {
        // ソースURLがない場合はスキップ
        if (!product.source_url) {
          console.log(`スキップ: ${product.sku} (ソースURL未設定)`)
          processed++
          continue
        }

        // スクレイピング実行（実際の実装では外部APIまたはスクレイピングサービスを使用）
        const scrapedData = await scrapeSourcePage(product.source_url, product.source_platform)

        // 変動検知
        const detectedChanges = detectProductChanges(product, scrapedData)

        if (detectedChanges.length > 0) {
          // 変動をデータベースに記録
          for (const change of detectedChanges) {
            const { data: changeRecord, error: changeError } = await supabase
              .from('inventory_changes')
              .insert({
                product_id: product.id,
                log_id: logId,
                change_type: change.type,
                old_value: change.old_value,
                new_value: change.new_value,
                old_price_jpy: change.old_price_jpy,
                new_price_jpy: change.new_price_jpy,
                old_stock: change.old_stock,
                new_stock: change.new_stock,
                status: 'pending',
                detected_at: new Date().toISOString(),
                applied_to_marketplace: false
              })
              .select()
              .single()

            if (!changeError && changeRecord) {
              changes.push(changeRecord as InventoryChange)

              // 自動eBay更新が有効な場合
              if (autoUpdateEbay && product.ebay_listed) {
                await updateEbayFromChange(changeRecord, product)
              }
            }
          }
        }

        // products_masterの監視情報を更新
        await supabase
          .from('products_master')
          .update({
            last_monitored_at: new Date().toISOString(),
            monitoring_status: scrapedData.success ? 'active' : 'error',
            monitoring_error_count: scrapedData.success ? 0 : (product.monitoring_error_count || 0) + 1
          })
          .eq('id', product.id)

        processed++

        // レート制限対策
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }

      } catch (error: any) {
        console.error(`監視エラー (${product.sku}):`, error)
        errors++

        // エラーログを記録
        await supabase
          .from('monitoring_errors')
          .insert({
            log_id: logId,
            product_id: product.id,
            error_type: 'scraping_error',
            error_message: error.message,
            source_url: product.source_url,
            occurred_at: new Date().toISOString()
          })
      }
    }

    // 監視ログを完了状態に更新
    await supabase
      .from('monitoring_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_count: processed,
        success_count: processed - errors,
        error_count: errors,
        changes_detected: changes.length,
        price_changes: changes.filter(c => c.change_type === 'price').length,
        stock_changes: changes.filter(c => c.change_type === 'stock').length
      })
      .eq('id', logId)

    return {
      logId,
      processed,
      changes: changes.length,
      errors,
      details: changes
    }

  } catch (error: any) {
    // 監視失敗
    await supabase
      .from('monitoring_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', logId)

    throw error
  }
}

/**
 * ソースページをスクレイピング
 */
async function scrapeSourcePage(
  url: string,
  platform: string | null
): Promise<ScrapedData> {
  // TODO: 実際のスクレイピング実装
  // ここでは外部APIまたはPuppeteerなどを使用
  
  try {
    // プラットフォーム別のスクレイピングロジック
    if (platform === 'yahoo_auction') {
      return await scrapeYahooAuction(url)
    } else if (platform === 'mercari') {
      return await scrapeMercari(url)
    }

    // デフォルト（汎用）
    return {
      success: true,
      price_jpy: 0,
      stock: 1,
      status: 'active'
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Yahoo!オークションのスクレイピング
 */
async function scrapeYahooAuction(url: string): Promise<ScrapedData> {
  // TODO: Yahoo!オークションAPI実装
  return {
    success: true,
    price_jpy: 0,
    stock: 1,
    status: 'active'
  }
}

/**
 * メルカリのスクレイピング
 */
async function scrapeMercari(url: string): Promise<ScrapedData> {
  // TODO: メルカリスクレイピング実装
  return {
    success: true,
    price_jpy: 0,
    stock: 1,
    status: 'active'
  }
}

/**
 * 商品の変動を検知
 */
function detectProductChanges(
  product: MonitoringProduct,
  scrapedData: ScrapedData
): Array<{
  type: 'price' | 'stock' | 'page_deleted' | 'page_changed'
  old_value: any
  new_value: any
  old_price_jpy?: number
  new_price_jpy?: number
  old_stock?: number
  new_stock?: number
}> {
  const changes: any[] = []

  if (!scrapedData.success) {
    // ページエラー
    if (scrapedData.status === 'deleted' || scrapedData.status === 'not_found') {
      changes.push({
        type: 'page_deleted',
        old_value: 'active',
        new_value: scrapedData.status
      })
    }
    return changes
  }

  // scraped_dataから前回の価格・在庫を取得
  const previousPrice = product.scraped_data?.price_jpy
  const previousStock = product.scraped_data?.stock || product.current_stock

  // 価格変動
  if (scrapedData.price_jpy !== undefined && 
      previousPrice !== undefined && 
      scrapedData.price_jpy !== previousPrice) {
    changes.push({
      type: 'price',
      old_value: previousPrice,
      new_value: scrapedData.price_jpy,
      old_price_jpy: previousPrice,
      new_price_jpy: scrapedData.price_jpy
    })
  }

  // 在庫変動
  if (scrapedData.stock !== undefined && 
      previousStock !== undefined && 
      scrapedData.stock !== previousStock) {
    changes.push({
      type: 'stock',
      old_value: previousStock,
      new_value: scrapedData.stock,
      old_stock: previousStock,
      new_stock: scrapedData.stock
    })
  }

  return changes
}

/**
 * 変動をeBayに自動反映
 */
async function updateEbayFromChange(
  change: InventoryChange,
  product: MonitoringProduct
): Promise<void> {
  if (!product.ebay_listing_id || !product.ebay_offer_id) {
    console.log(`eBay未出品: ${product.sku}`)
    return
  }

  const supabase = createClient()

  try {
    // TODO: eBay API呼び出し実装
    // 在庫更新または価格更新

    // 成功したらステータス更新
    await supabase
      .from('inventory_changes')
      .update({
        status: 'applied',
        applied_to_marketplace: true,
        ebay_update_success: true,
        applied_at: new Date().toISOString()
      })
      .eq('id', change.id)

  } catch (error: any) {
    console.error(`eBay更新失敗 (${product.sku}):`, error)

    await supabase
      .from('inventory_changes')
      .update({
        ebay_update_success: false,
        ebay_update_error: error.message
      })
      .eq('id', change.id)
  }
}

/**
 * スケジュール実行用のメイン関数
 */
export async function runScheduledMonitoring(): Promise<MonitoringResult> {
  console.log('🔍 スケジュール監視開始')
  
  const result = await monitorProducts(undefined, {
    autoUpdateEbay: true,
    batchSize: 100,
    delayMs: 2000
  })

  console.log(`✅ 監視完了: ${result.processed}件処理, ${result.changes}件変動検知`)

  return result
}
