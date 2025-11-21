/**
 * 在庫・価格追従システム (B-3) - InventoryTracker
 *
 * 多販路対応の在庫追従とURL自動切替を実装
 */

import { supabase } from '@/lib/supabase'
import type { ReferenceUrl } from '@/types/product'

// 在庫チェック頻度の型定義
export type CheckFrequency = '通常' | '高頻度'

// 在庫チェック結果の型定義
export interface StockCheckResult {
  url: string
  price: number
  is_available: boolean
  stock_count?: number
  error?: string
}

// 在庫追従の結果型定義
export interface TrackingResult {
  product_id: string
  sku: string
  success: boolean
  changes_detected: boolean
  source_switched: boolean
  switched_from_url?: string
  switched_to_url?: string
  old_price?: number
  new_price?: number
  old_stock?: number
  new_stock?: number
  all_out_of_stock: boolean
  error?: string
}

/**
 * 商品データを取得
 */
async function getProductsForTracking(
  max_items: number = 50,
  check_frequency?: CheckFrequency
): Promise<any[]> {
  let query = supabase
    .from('products')
    .select('id, sku, title, reference_urls, median_price, current_stock_count, last_check_time, check_frequency, acquired_price_jpy')
    .not('reference_urls', 'is', null)
    .order('last_check_time', { ascending: true, nullsFirst: true })
    .limit(max_items)

  // チェック頻度でフィルタリング
  if (check_frequency) {
    query = query.eq('check_frequency', check_frequency)
  }

  const { data, error } = await query

  if (error) {
    console.error('商品取得エラー:', error)
    throw error
  }

  // reference_urls が空の商品は除外
  return (data || []).filter(
    (product) => product.reference_urls && Array.isArray(product.reference_urls) && product.reference_urls.length > 0
  )
}

/**
 * 単一URLの在庫をチェック
 */
async function checkSingleUrl(url: string): Promise<StockCheckResult> {
  try {
    // スクレイピングAPIを呼び出し
    const response = await fetch('/api/scraping/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [url],
        platforms: ['yahoo'], // プラットフォームを自動検出または指定
      }),
    })

    if (!response.ok) {
      return {
        url,
        price: 0,
        is_available: false,
        error: `HTTP ${response.status}`,
      }
    }

    const data = await response.json()

    if (data.success && data.results && data.results.length > 0) {
      const result = data.results[0]

      // 在庫情報の解析
      let stock_count = 0
      let is_available = false

      if (result.stock) {
        if (typeof result.stock === 'number') {
          stock_count = result.stock
          is_available = stock_count > 0
        } else if (typeof result.stock === 'string') {
          if (result.stock === '在庫なし') {
            stock_count = 0
            is_available = false
          } else if (result.stock === '在庫あり') {
            stock_count = 1
            is_available = true
          } else {
            const match = result.stock.match(/(\d+)/)
            stock_count = match ? parseInt(match[1]) : 1
            is_available = stock_count > 0
          }
        }
      }

      // ページが削除または終了している場合
      if (result.status === 'error' || result.status === 'not_found' || result.status === 'ended') {
        is_available = false
        stock_count = 0
      }

      return {
        url,
        price: result.price || 0,
        is_available,
        stock_count,
      }
    }

    return {
      url,
      price: 0,
      is_available: false,
      error: 'データ取得失敗',
    }
  } catch (error: any) {
    console.error('URLチェックエラー:', url, error)
    return {
      url,
      price: 0,
      is_available: false,
      error: error.message,
    }
  }
}

/**
 * 複数URLの在庫をチェック（優先順位順）
 */
async function checkMultipleUrls(reference_urls: ReferenceUrl[]): Promise<StockCheckResult[]> {
  const results: StockCheckResult[] = []

  // 優先順位順（配列の順序）にチェック
  for (const ref of reference_urls) {
    const result = await checkSingleUrl(ref.url)
    results.push(result)

    // 短い待機時間（スクレイピング対策）
    await sleep(randomInt(2, 5) * 1000)
  }

  return results
}

/**
 * 中央値価格を計算
 */
function calculateMedianPrice(prices: number[]): number {
  if (prices.length === 0) return 0

  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  } else {
    return sorted[mid]
  }
}

/**
 * 在庫追従ロジックのメイン処理
 */
export async function trackInventory(
  product_id: string
): Promise<TrackingResult> {
  try {
    // 商品データを取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, sku, title, reference_urls, median_price, current_stock_count, check_frequency')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      throw new Error('商品が見つかりません')
    }

    if (!product.reference_urls || product.reference_urls.length === 0) {
      throw new Error('参照URLが設定されていません')
    }

    const reference_urls: ReferenceUrl[] = product.reference_urls

    console.log(`[在庫追従] ${product.sku} - ${product.title}`)
    console.log(`  参照URL数: ${reference_urls.length}`)

    // 複数URLをチェック
    const check_results = await checkMultipleUrls(reference_urls)

    // 利用可能なURLを検出（優先順位順）
    const available_results = check_results.filter((r) => r.is_available && r.price > 0)

    // 旧データ
    const old_price = product.median_price || 0
    const old_stock = product.current_stock_count || 0

    let new_price = 0
    let new_stock = 0
    let source_switched = false
    let switched_from_url: string | undefined
    let switched_to_url: string | undefined
    let all_out_of_stock = false

    if (available_results.length > 0) {
      // 利用可能なURLがある場合 - 最優先（最安値）を使用
      const primary_result = available_results[0]

      new_price = primary_result.price
      new_stock = primary_result.stock_count || 1

      // URL切り替えを検出
      const current_primary_url = reference_urls[0]?.url
      if (current_primary_url !== primary_result.url) {
        source_switched = true
        switched_from_url = current_primary_url
        switched_to_url = primary_result.url

        console.log(`  ⚠️ 仕入先自動切替: ${switched_from_url} → ${switched_to_url}`)
      }

      // 中央値価格を再計算
      const all_prices = available_results.map((r) => r.price)
      const median = calculateMedianPrice(all_prices)

      // 商品データを更新
      await supabase
        .from('products')
        .update({
          median_price: median,
          current_stock_count: new_stock,
          acquired_price_jpy: new_price,
          last_check_time: new Date().toISOString(),
          // reference_urls の順序を更新（利用可能なURLを優先順位順に並べ替え）
          reference_urls: [
            ...available_results.map((r) => ({
              url: r.url,
              price: r.price,
              is_available: true,
            })),
            ...check_results
              .filter((r) => !r.is_available)
              .map((r) => ({
                url: r.url,
                price: r.price,
                is_available: false,
              })),
          ],
        })
        .eq('id', product_id)

      console.log(`  ✅ 在庫あり - 価格: ¥${new_price}, 在庫: ${new_stock}`)
    } else {
      // 全てのURLで在庫切れ
      all_out_of_stock = true
      new_stock = 0

      console.log(`  ❌ 全仕入先で在庫切れ`)

      // 商品データを更新
      await supabase
        .from('products')
        .update({
          current_stock_count: 0,
          last_check_time: new Date().toISOString(),
          // reference_urls の在庫状態を更新
          reference_urls: check_results.map((r) => ({
            url: r.url,
            price: r.price,
            is_available: false,
          })),
        })
        .eq('id', product_id)

      // 全モールで在庫をゼロにする同期キューを投入
      await addInventorySyncQueue(product_id, 'update_stock', 0)
    }

    // 変動検知
    const price_changed = old_price !== new_price
    const stock_changed = old_stock !== new_stock
    const changes_detected = price_changed || stock_changed || source_switched

    // 履歴ログを記録
    if (changes_detected) {
      await supabase.from('inventory_tracking_logs').insert({
        product_id: product_id,
        reference_url: available_results.length > 0 ? available_results[0].url : reference_urls[0]?.url,
        check_status: available_results.length > 0 ? 'success' : 'out_of_stock',
        price_at_check: new_price,
        stock_at_check: new_stock,
        price_changed,
        old_price,
        new_price,
        stock_changed,
        old_stock,
        new_stock,
        source_switched,
        switched_from_url,
        switched_to_url,
      })
    }

    return {
      product_id,
      sku: product.sku,
      success: true,
      changes_detected,
      source_switched,
      switched_from_url,
      switched_to_url,
      old_price,
      new_price,
      old_stock,
      new_stock,
      all_out_of_stock,
    }
  } catch (error: any) {
    console.error('在庫追従エラー:', error)

    // エラーログを記録
    await supabase.from('inventory_tracking_logs').insert({
      product_id: product_id,
      reference_url: '',
      check_status: 'error',
      error_message: error.message,
    })

    return {
      product_id,
      sku: '',
      success: false,
      changes_detected: false,
      source_switched: false,
      all_out_of_stock: false,
      error: error.message,
    }
  }
}

/**
 * バッチ処理: 複数商品の在庫を追従
 */
export async function trackInventoryBatch(
  options: {
    max_items?: number
    check_frequency?: CheckFrequency
    delay_min_seconds?: number
    delay_max_seconds?: number
  } = {}
): Promise<{
  total_processed: number
  successful: number
  failed: number
  changes_detected: number
  sources_switched: number
  all_out_of_stock_count: number
}> {
  const {
    max_items = 50,
    check_frequency,
    delay_min_seconds = 30,
    delay_max_seconds = 120,
  } = options

  console.log(`[バッチ開始] 最大件数: ${max_items}, 頻度: ${check_frequency || '全て'}`)

  // 対象商品を取得
  const products = await getProductsForTracking(max_items, check_frequency)

  if (products.length === 0) {
    console.log('対象商品がありません')
    return {
      total_processed: 0,
      successful: 0,
      failed: 0,
      changes_detected: 0,
      sources_switched: 0,
      all_out_of_stock_count: 0,
    }
  }

  let successful = 0
  let failed = 0
  let changes_detected = 0
  let sources_switched = 0
  let all_out_of_stock_count = 0

  // 各商品を順次処理
  for (let i = 0; i < products.length; i++) {
    const product = products[i]

    try {
      const result = await trackInventory(product.id)

      if (result.success) {
        successful++
        if (result.changes_detected) changes_detected++
        if (result.source_switched) sources_switched++
        if (result.all_out_of_stock) all_out_of_stock_count++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`商品 ${product.sku} の処理エラー:`, error)
      failed++
    }

    // 最後の商品でなければ待機
    if (i < products.length - 1) {
      const delay = randomInt(delay_min_seconds, delay_max_seconds) * 1000
      console.log(`  ⏳ 待機: ${Math.round(delay / 1000)}秒`)
      await sleep(delay)
    }
  }

  console.log(`[バッチ完了] 処理: ${products.length}, 成功: ${successful}, 失敗: ${failed}, 変動: ${changes_detected}, 切替: ${sources_switched}, 在庫切れ: ${all_out_of_stock_count}`)

  return {
    total_processed: products.length,
    successful,
    failed,
    changes_detected,
    sources_switched,
    all_out_of_stock_count,
  }
}

/**
 * Shopeeセール期間中の高頻度チェック設定
 */
export async function setHighFrequencyForShopee(product_ids: string[]): Promise<void> {
  if (product_ids.length === 0) return

  console.log(`[高頻度設定] Shopee商品 ${product_ids.length}件を高頻度チェックに切替`)

  await supabase
    .from('products')
    .update({ check_frequency: '高頻度' })
    .in('id', product_ids)
}

/**
 * 通常頻度に戻す
 */
export async function resetToNormalFrequency(product_ids: string[]): Promise<void> {
  if (product_ids.length === 0) return

  console.log(`[通常頻度設定] 商品 ${product_ids.length}件を通常頻度に戻す`)

  await supabase
    .from('products')
    .update({ check_frequency: '通常' })
    .in('id', product_ids)
}

/**
 * 在庫同期キューに追加（全モール対応）
 */
async function addInventorySyncQueue(
  product_id: string,
  action: 'update_stock' | 'update_price' | 'delist',
  value?: number
): Promise<void> {
  // 商品が出品されているモールを取得
  const { data: product } = await supabase
    .from('products')
    .select('listing_data')
    .eq('id', product_id)
    .single()

  if (!product || !product.listing_data) {
    return
  }

  const listing_data = product.listing_data as any
  const marketplaces = Object.keys(listing_data).filter(
    (key) => listing_data[key]?.listing_id
  )

  // 各モールに対して同期キューを追加
  for (const marketplace of marketplaces) {
    await supabase.from('inventory_sync_queue').insert({
      product_id,
      marketplace,
      action,
      new_stock: action === 'update_stock' ? value : undefined,
      new_price: action === 'update_price' ? value : undefined,
      status: 'pending',
    })
  }

  console.log(`  📤 同期キュー追加: ${marketplaces.join(', ')} - ${action}`)
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
