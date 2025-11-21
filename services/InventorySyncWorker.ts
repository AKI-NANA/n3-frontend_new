/**
 * 在庫同期キューワーカー
 * inventory_sync_queue から pending タスクを取得し、各モールに同期
 */

import { supabase } from '@/lib/supabase'

interface SyncQueueItem {
  id: string
  product_id: string
  marketplace: string
  action: 'update_stock' | 'update_price' | 'delist'
  new_stock?: number
  new_price?: number
  retry_count: number
  max_retries: number
}

/**
 * キューアイテムを取得
 */
async function fetchPendingQueueItems(limit: number = 50): Promise<SyncQueueItem[]> {
  const { data, error } = await supabase
    .from('inventory_sync_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('キュー取得エラー:', error)
    throw error
  }

  return (data || []) as SyncQueueItem[]
}

/**
 * Shopee在庫同期
 */
async function syncToShopee(
  productId: string,
  action: string,
  newStock?: number,
  newPrice?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Shopee APIの呼び出し
    // ※ 実装例: 実際のShopee API統合が必要
    console.log(`[Shopee同期] 商品ID: ${productId}, アクション: ${action}`)

    // TODO: 実際のShopee API呼び出しを実装
    // const response = await fetch('/api/shopee/update-listing', {
    //   method: 'POST',
    //   body: JSON.stringify({ productId, action, newStock, newPrice })
    // })

    // 仮の成功レスポンス
    return { success: true }
  } catch (error: any) {
    console.error('[Shopee同期] エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * eBay在庫同期
 */
async function syncToEbay(
  productId: string,
  action: string,
  newStock?: number,
  newPrice?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 商品のeBay Listing IDを取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('ebay_listing_id')
      .eq('id', productId)
      .single()

    if (productError || !product || !product.ebay_listing_id) {
      return { success: false, error: 'eBay Listing IDが見つかりません' }
    }

    console.log(`[eBay同期] Listing ID: ${product.ebay_listing_id}, アクション: ${action}`)

    // eBay APIの呼び出し
    // ※ 実装例: 実際のeBay API統合が必要
    // TODO: 実際のeBay API呼び出しを実装
    // const response = await fetch('/api/ebay/update-listing', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     listingId: product.ebay_listing_id,
    //     action,
    //     newStock,
    //     newPrice
    //   })
    // })

    // 仮の成功レスポンス
    return { success: true }
  } catch (error: any) {
    console.error('[eBay同期] エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mercari在庫同期
 */
async function syncToMercari(
  productId: string,
  action: string,
  newStock?: number,
  newPrice?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Mercari同期] 商品ID: ${productId}, アクション: ${action}`)

    // Mercari APIの呼び出し
    // ※ 実装例: 実際のMercari API統合が必要
    // TODO: 実際のMercari API呼び出しを実装

    // 仮の成功レスポンス
    return { success: true }
  } catch (error: any) {
    console.error('[Mercari同期] エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * モール別の同期実行
 */
async function syncToMarketplace(
  marketplace: string,
  productId: string,
  action: string,
  newStock?: number,
  newPrice?: number
): Promise<{ success: boolean; error?: string }> {
  switch (marketplace.toLowerCase()) {
    case 'shopee':
      return await syncToShopee(productId, action, newStock, newPrice)
    case 'ebay':
      return await syncToEbay(productId, action, newStock, newPrice)
    case 'mercari':
      return await syncToMercari(productId, action, newStock, newPrice)
    default:
      return { success: false, error: `未対応のモール: ${marketplace}` }
  }
}

/**
 * キューアイテムを処理
 */
async function processQueueItem(item: SyncQueueItem): Promise<void> {
  console.log(`[同期キュー] 処理開始: ${item.id} - ${item.marketplace} - ${item.action}`)

  // ステータスを処理中に更新
  await supabase
    .from('inventory_sync_queue')
    .update({
      status: 'processing',
      last_attempted_at: new Date().toISOString(),
    })
    .eq('id', item.id)

  try {
    // モールに同期
    const result = await syncToMarketplace(
      item.marketplace,
      item.product_id,
      item.action,
      item.new_stock,
      item.new_price
    )

    if (result.success) {
      // 成功
      await supabase
        .from('inventory_sync_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      console.log(`[同期キュー] 成功: ${item.id}`)
    } else {
      // 失敗 - リトライ判定
      const newRetryCount = item.retry_count + 1

      if (newRetryCount >= item.max_retries) {
        // 最大リトライ回数に達した
        await supabase
          .from('inventory_sync_queue')
          .update({
            status: 'failed',
            retry_count: newRetryCount,
            error_message: result.error || 'Unknown error',
          })
          .eq('id', item.id)

        console.error(`[同期キュー] 失敗（最大リトライ超過）: ${item.id}`)
      } else {
        // リトライ
        await supabase
          .from('inventory_sync_queue')
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            error_message: result.error || 'Unknown error',
          })
          .eq('id', item.id)

        console.warn(`[同期キュー] リトライ (${newRetryCount}/${item.max_retries}): ${item.id}`)
      }
    }
  } catch (error: any) {
    console.error(`[同期キュー] 例外エラー: ${item.id}`, error)

    // 予期しないエラー - リトライ判定
    const newRetryCount = item.retry_count + 1

    await supabase
      .from('inventory_sync_queue')
      .update({
        status: newRetryCount >= item.max_retries ? 'failed' : 'pending',
        retry_count: newRetryCount,
        error_message: error.message || 'Unexpected error',
      })
      .eq('id', item.id)
  }
}

/**
 * ワーカーのメイン処理
 */
export async function runInventorySyncWorker(
  options: {
    maxItems?: number
    delayMs?: number
  } = {}
): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const { maxItems = 50, delayMs = 1000 } = options

  console.log('[同期ワーカー] 開始')

  // キューアイテムを取得
  const items = await fetchPendingQueueItems(maxItems)

  if (items.length === 0) {
    console.log('[同期ワーカー] 処理するアイテムがありません')
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  console.log(`[同期ワーカー] ${items.length}件のアイテムを処理します`)

  let succeeded = 0
  let failed = 0

  // 各アイテムを順次処理
  for (const item of items) {
    try {
      await processQueueItem(item)
      succeeded++
    } catch (error) {
      console.error('[同期ワーカー] アイテム処理エラー:', error)
      failed++
    }

    // 待機（API制限対策）
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  console.log('[同期ワーカー] 完了')
  console.log(`  処理: ${items.length}件`)
  console.log(`  成功: ${succeeded}件`)
  console.log(`  失敗: ${failed}件`)

  return {
    processed: items.length,
    succeeded,
    failed,
  }
}

/**
 * ワーカーを定期実行（オプション）
 */
export function startInventorySyncWorkerLoop(intervalMs: number = 60000) {
  console.log(`[同期ワーカー] ループ開始（間隔: ${intervalMs}ms）`)

  setInterval(async () => {
    try {
      await runInventorySyncWorker()
    } catch (error) {
      console.error('[同期ワーカー] ループ実行エラー:', error)
    }
  }, intervalMs)
}
