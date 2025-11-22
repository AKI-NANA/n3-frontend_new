/**
 * RepeatOrderManager - ハイブリッド無在庫戦略の自動仕入れマネージャー
 * 在庫閾値（3個以下）を監視し、自動仕入れをトリガー
 */

import { supabase } from '@/lib/supabase'

interface LowStockProduct {
  id: string
  sku: string
  title: string
  current_stock_count: number
  supplier_url: string
  acquired_price_jpy: number
}

/**
 * 在庫閾値以下の商品を検知
 */
async function detectLowStockProducts(): Promise<LowStockProduct[]> {
  const STOCK_THRESHOLD = 3

  const { data, error } = await supabase
    .from('products')
    .select('id, sku, title, current_stock_count, reference_urls, acquired_price_jpy')
    .lte('current_stock_count', STOCK_THRESHOLD)
    .not('reference_urls', 'is', null)
    .order('current_stock_count', { ascending: true })

  if (error) {
    console.error('[RepeatOrderManager] 商品取得エラー:', error)
    throw error
  }

  // reference_urls から最優先のURLを取得
  return (data || [])
    .filter((p: any) => p.reference_urls && Array.isArray(p.reference_urls) && p.reference_urls.length > 0)
    .map((p: any) => ({
      id: p.id,
      sku: p.sku,
      title: p.title,
      current_stock_count: p.current_stock_count || 0,
      supplier_url: p.reference_urls[0]?.url || '',
      acquired_price_jpy: p.acquired_price_jpy || 0,
    }))
}

/**
 * 自動仕入れをトリガー
 */
async function triggerAutoReplenishment(product: LowStockProduct): Promise<boolean> {
  try {
    console.log(`[RepeatOrderManager] 自動仕入れトリガー: ${product.sku} (在庫: ${product.current_stock_count})`)

    // 自動仕入れAPIを呼び出し
    const response = await fetch('/api/arbitrage/execute-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: product.id,
        supplier_url: product.supplier_url,
        quantity: 5, // デフォルト発注数
        auto_order: true,
      }),
    })

    const result = await response.json()

    if (result.success) {
      console.log(`[RepeatOrderManager] 自動仕入れ成功: ${product.sku}`)

      // 発注履歴を記録
      await supabase.from('replenishment_logs').insert({
        product_id: product.id,
        sku: product.sku,
        triggered_at: new Date().toISOString(),
        stock_level_at_trigger: product.current_stock_count,
        order_quantity: 5,
        supplier_url: product.supplier_url,
        status: 'ordered',
      })

      return true
    } else {
      console.error(`[RepeatOrderManager] 自動仕入れ失敗: ${product.sku}`, result.error)
      return false
    }
  } catch (error: any) {
    console.error(`[RepeatOrderManager] エラー: ${product.sku}`, error)
    return false
  }
}

/**
 * 日次チェック実行（I4-1）
 */
export async function runDailyCheck(): Promise<{
  total_low_stock: number
  replenishment_triggered: number
  failed: number
}> {
  console.log('[RepeatOrderManager] 日次チェック開始')

  try {
    // 在庫閾値以下の商品を検知
    const lowStockProducts = await detectLowStockProducts()

    if (lowStockProducts.length === 0) {
      console.log('[RepeatOrderManager] 在庫閾値以下の商品なし')
      return { total_low_stock: 0, replenishment_triggered: 0, failed: 0 }
    }

    console.log(`[RepeatOrderManager] 在庫閾値以下の商品: ${lowStockProducts.length}件`)

    let replenishment_triggered = 0
    let failed = 0

    // 各商品に対して自動仕入れをトリガー
    for (const product of lowStockProducts) {
      const success = await triggerAutoReplenishment(product)
      if (success) {
        replenishment_triggered++
      } else {
        failed++
      }

      // レート制限対策
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    console.log('[RepeatOrderManager] 日次チェック完了')
    console.log(`  対象商品: ${lowStockProducts.length}件`)
    console.log(`  発注成功: ${replenishment_triggered}件`)
    console.log(`  発注失敗: ${failed}件`)

    return {
      total_low_stock: lowStockProducts.length,
      replenishment_triggered,
      failed,
    }
  } catch (error) {
    console.error('[RepeatOrderManager] 日次チェックエラー:', error)
    throw error
  }
}
