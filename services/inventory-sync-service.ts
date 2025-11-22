/**
 * inventory-sync-service.ts
 *
 * 在庫同期サービス（Phase 8統合）
 *
 * 機能:
 * - Webhook受信時に在庫を自動削減
 * - 在庫閾値チェックとリピート発注トリガー
 * - マルチモール在庫の一元管理
 */

import { createClient } from '@/lib/supabase/client'
import { createRepeatOrderManager } from './RepeatOrderManager'

interface InventoryUpdate {
  product_id: string
  sku: string
  marketplace: string
  quantity_sold: number
  order_id: string
  timestamp: string
}

interface InventoryStatus {
  product_id: string
  sku: string
  current_inventory: number
  reserved_inventory: number
  available_inventory: number
  reorder_triggered: boolean
}

export class InventorySyncService {
  private supabase: ReturnType<typeof createClient>
  private repeatOrderManager: ReturnType<typeof createRepeatOrderManager>
  private reorderThreshold: number

  constructor(reorderThreshold: number = 3) {
    this.supabase = createClient()
    this.repeatOrderManager = createRepeatOrderManager({ reorderThreshold })
    this.reorderThreshold = reorderThreshold

    console.log(`📦 InventorySyncService 初期化 (閾値: ${reorderThreshold}個)`)
  }

  /**
   * 受注に基づいて在庫を更新
   */
  async handleOrderReceived(update: InventoryUpdate): Promise<InventoryStatus> {
    console.log(`\n📦 在庫更新: ${update.sku} (-${update.quantity_sold}個)`)

    try {
      // 現在の在庫情報を取得
      const { data: product, error: fetchError } = await this.supabase
        .from('products_master')
        .select('id, sku, physical_inventory_count')
        .eq('id', update.product_id)
        .single()

      if (fetchError || !product) {
        throw new Error(`商品が見つかりません: ${update.product_id}`)
      }

      const currentInventory = product.physical_inventory_count || 0
      const newInventory = Math.max(0, currentInventory - update.quantity_sold)

      // 在庫を更新
      const { error: updateError } = await this.supabase
        .from('products_master')
        .update({
          physical_inventory_count: newInventory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.product_id)

      if (updateError) {
        throw updateError
      }

      console.log(`✅ 在庫更新完了: ${currentInventory} → ${newInventory}個`)

      // 在庫閾値チェック
      let reorderTriggered = false

      if (newInventory <= this.reorderThreshold) {
        console.log(`🔔 在庫閾値到達 (${this.reorderThreshold}個以下) → リピート発注をトリガー`)

        // RepeatOrderManagerを呼び出し
        const result = await this.repeatOrderManager.handleOrderReceived(
          update.marketplace as any,
          update.order_id,
          update.product_id,
          update.quantity_sold
        )

        reorderTriggered = result.reorderTriggered
      }

      // 在庫ログを記録
      await this.logInventoryChange({
        product_id: update.product_id,
        sku: update.sku,
        change_type: 'sale',
        quantity_change: -update.quantity_sold,
        previous_quantity: currentInventory,
        new_quantity: newInventory,
        order_id: update.order_id,
        marketplace: update.marketplace,
        timestamp: update.timestamp,
      })

      return {
        product_id: update.product_id,
        sku: update.sku,
        current_inventory: newInventory,
        reserved_inventory: 0,
        available_inventory: newInventory,
        reorder_triggered: reorderTriggered,
      }

    } catch (error: any) {
      console.error(`❌ 在庫更新エラー (${update.sku}):`, error)
      throw error
    }
  }

  /**
   * リピート発注完了時に在庫を増加
   */
  async handleReorderReceived(productId: string, quantity: number): Promise<void> {
    console.log(`\n📦 リピート発注受領: ${productId} (+${quantity}個)`)

    try {
      const { data: product, error: fetchError } = await this.supabase
        .from('products_master')
        .select('id, sku, physical_inventory_count')
        .eq('id', productId)
        .single()

      if (fetchError || !product) {
        throw new Error(`商品が見つかりません: ${productId}`)
      }

      const currentInventory = product.physical_inventory_count || 0
      const newInventory = currentInventory + quantity

      const { error: updateError } = await this.supabase
        .from('products_master')
        .update({
          physical_inventory_count: newInventory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)

      if (updateError) {
        throw updateError
      }

      console.log(`✅ 在庫増加完了: ${currentInventory} → ${newInventory}個`)

      // 在庫ログを記録
      await this.logInventoryChange({
        product_id: productId,
        sku: product.sku,
        change_type: 'restock',
        quantity_change: quantity,
        previous_quantity: currentInventory,
        new_quantity: newInventory,
        timestamp: new Date().toISOString(),
      })

    } catch (error) {
      console.error(`❌ 在庫増加エラー:`, error)
      throw error
    }
  }

  /**
   * 在庫変更ログを記録
   */
  private async logInventoryChange(log: {
    product_id: string
    sku: string
    change_type: 'sale' | 'restock' | 'adjustment' | 'damage'
    quantity_change: number
    previous_quantity: number
    new_quantity: number
    order_id?: string
    marketplace?: string
    timestamp: string
    notes?: string
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('inventory_logs')
        .insert(log)

      if (error) {
        // ログ記録失敗は致命的ではないので警告のみ
        console.warn('⚠️ 在庫ログ記録失敗:', error.message)
      }

    } catch (error) {
      console.warn('⚠️ 在庫ログ記録エラー:', error)
    }
  }

  /**
   * 全商品の在庫状況を確認
   */
  async checkAllInventory(): Promise<{
    low_stock: InventoryStatus[]
    out_of_stock: InventoryStatus[]
    total_checked: number
  }> {
    console.log('\n📊 全商品の在庫状況を確認中...')

    try {
      const { data: products, error } = await this.supabase
        .from('products_master')
        .select('id, sku, physical_inventory_count')
        .eq('arbitrage_status', 'listed_on_multi')

      if (error) throw error

      const lowStock: InventoryStatus[] = []
      const outOfStock: InventoryStatus[] = []

      for (const product of products || []) {
        const inventory = product.physical_inventory_count || 0

        if (inventory === 0) {
          outOfStock.push({
            product_id: product.id,
            sku: product.sku,
            current_inventory: 0,
            reserved_inventory: 0,
            available_inventory: 0,
            reorder_triggered: false,
          })
        } else if (inventory <= this.reorderThreshold) {
          lowStock.push({
            product_id: product.id,
            sku: product.sku,
            current_inventory: inventory,
            reserved_inventory: 0,
            available_inventory: inventory,
            reorder_triggered: false,
          })
        }
      }

      console.log(`\n📊 在庫確認完了:`)
      console.log(`  総商品数: ${products?.length || 0}`)
      console.log(`  在庫僅少: ${lowStock.length}件`)
      console.log(`  在庫切れ: ${outOfStock.length}件`)

      return {
        low_stock: lowStock,
        out_of_stock: outOfStock,
        total_checked: products?.length || 0,
      }

    } catch (error) {
      console.error('❌ 在庫確認エラー:', error)
      throw error
    }
  }
}

/**
 * シングルトンインスタンス
 */
let inventorySyncServiceInstance: InventorySyncService | null = null

export function getInventorySyncService(reorderThreshold?: number): InventorySyncService {
  if (!inventorySyncServiceInstance) {
    inventorySyncServiceInstance = new InventorySyncService(reorderThreshold)
  }
  return inventorySyncServiceInstance
}
