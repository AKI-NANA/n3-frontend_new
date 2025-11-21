/**
 * RepeatOrderManager.ts
 *
 * ハイブリッド無在庫戦略: 自動リピート仕入れマネージャー
 *
 * 機能:
 * 1. モールAPIから受注を検知し、physical_inventory_count を -1 する
 * 2. 在庫数が閾値（デフォルト：3個）を下回った場合、次のロットを自動発注
 * 3. 資金効率を最大化（売上金が入った後の仕入れ）
 *
 * キャッシュフロー最適化:
 * - 初期ロット: 最初の仕入れ（資金が先に出る）
 * - リピート発注: 売れた後に仕入れ（売上金で仕入れる → 資金効率が高い）
 */

import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/product'

// 設定値
const DEFAULT_REORDER_THRESHOLD = 3 // リピート発注のトリガー在庫数（3個以下で発注）
const DEFAULT_REORDER_LOT_SIZE = 5 // リピート発注のロット個数
const MAX_AUTO_REORDER_AMOUNT_JPY = 50000 // リピート発注の最大金額

export interface RepeatOrderConfig {
  reorderThreshold?: number // リピート発注閾値（デフォルト: 3個）
  reorderLotSize?: number // リピート発注ロット個数（デフォルト: 5個）
  maxAutoReorderAmount?: number // 最大発注金額（デフォルト: 50,000円）
  dryRun?: boolean // テストモード
}

export interface OrderDetectionResult {
  success: boolean
  marketplace: 'amazon_jp' | 'yahoo_jp' | 'mercari_c2c' | 'qoo10'
  orderId: string
  productId: string
  sku: string
  quantity: number
  remainingInventory: number
  reorderTriggered: boolean
  message: string
}

export interface ReorderResult {
  success: boolean
  reorderedProducts: Product[]
  totalReorderAmount: number
  errors: string[]
  message: string
}

/**
 * RepeatOrderManager クラス
 *
 * 受注後の自動リピート仕入れを管理するクラス
 */
export class RepeatOrderManager {
  private supabase: ReturnType<typeof createClient>
  private config: Required<RepeatOrderConfig>

  constructor(config: RepeatOrderConfig = {}) {
    this.supabase = createClient()
    this.config = {
      reorderThreshold: config.reorderThreshold ?? DEFAULT_REORDER_THRESHOLD,
      reorderLotSize: config.reorderLotSize ?? DEFAULT_REORDER_LOT_SIZE,
      maxAutoReorderAmount: config.maxAutoReorderAmount ?? MAX_AUTO_REORDER_AMOUNT_JPY,
      dryRun: config.dryRun ?? false,
    }

    console.log('🔄 RepeatOrderManager 初期化:', this.config)
  }

  /**
   * Step 1: モールAPIから受注を検知
   *
   * Amazon JP、Yahoo!ショッピング、メルカリC2Cなどのモールから
   * 受注通知を受け取り、在庫数を更新する。
   *
   * @param marketplace 販売チャネル
   * @param orderId 受注ID
   * @param productId 商品ID
   * @param quantity 販売個数（通常は1）
   * @returns 受注処理結果
   */
  async handleOrderReceived(
    marketplace: 'amazon_jp' | 'yahoo_jp' | 'mercari_c2c' | 'qoo10',
    orderId: string,
    productId: string,
    quantity: number = 1
  ): Promise<OrderDetectionResult> {
    console.log(`\n📦 受注検知: ${marketplace} - Order ${orderId}`)
    console.log(`  商品ID: ${productId}, 数量: ${quantity}`)

    try {
      // 商品情報を取得
      const { data: product, error: fetchError } = await this.supabase
        .from('products_master')
        .select('*')
        .eq('id', productId)
        .single()

      if (fetchError || !product) {
        throw new Error(`商品が見つかりません: ${productId}`)
      }

      // 現在の在庫数を確認
      const currentInventory = product.physical_inventory_count || 0

      if (currentInventory < quantity) {
        console.warn(`⚠️ ${product.sku}: 在庫不足（現在: ${currentInventory}個、受注: ${quantity}個）`)
        // 在庫不足の場合もリピート発注をトリガーする
      }

      // 在庫数を更新（マイナス処理）
      const newInventory = Math.max(0, currentInventory - quantity)

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

      console.log(`✅ ${product.sku}: 在庫数更新 ${currentInventory} → ${newInventory}`)

      // Step 2: リピート発注閾値チェック
      let reorderTriggered = false
      if (newInventory <= this.config.reorderThreshold) {
        console.log(`🔔 ${product.sku}: 在庫が閾値（${this.config.reorderThreshold}個）以下 → リピート発注トリガー`)
        await this.triggerReorder(product as Product)
        reorderTriggered = true
      }

      return {
        success: true,
        marketplace,
        orderId,
        productId,
        sku: product.sku,
        quantity,
        remainingInventory: newInventory,
        reorderTriggered,
        message: `受注処理完了: ${product.sku} (残在庫: ${newInventory}個)`,
      }

    } catch (error: any) {
      console.error(`❌ 受注処理エラー:`, error)
      return {
        success: false,
        marketplace,
        orderId,
        productId,
        sku: 'UNKNOWN',
        quantity,
        remainingInventory: 0,
        reorderTriggered: false,
        message: `受注処理失敗: ${error.message}`,
      }
    }
  }

  /**
   * Step 2: 自動リピート発注のトリガー
   *
   * 在庫数が閾値を下回った場合、次のロットを自動発注する。
   * arbitrage_status を 'repeat_order_placed' に更新。
   *
   * @param product リピート発注する商品
   */
  private async triggerReorder(product: Product): Promise<void> {
    console.log(`🛒 ${product.sku}: リピート発注を開始...`)

    try {
      // 発注金額チェック（リスク管理）
      const estimatedCost = (product.cost || 0) * this.config.reorderLotSize

      if (estimatedCost > this.config.maxAutoReorderAmount) {
        console.warn(`⚠️ ${product.sku}: 発注金額が上限を超過（¥${estimatedCost}）- スキップ`)
        // 手動承認が必要な場合はアラートを送信（TODO: 実装）
        return
      }

      // dryRunモードの場合、実際の発注はスキップ
      if (this.config.dryRun) {
        console.log(`🧪 [DRY RUN] ${product.sku}: リピート発注スキップ（テストモード）`)
      } else {
        // 実際の自動決済API呼び出し
        await this.callSupplierPurchaseAPI(product, this.config.reorderLotSize)
      }

      // データベース更新: arbitrage_status を 'repeat_order_placed' に変更
      const { error: updateError } = await this.supabase
        .from('products_master')
        .update({
          arbitrage_status: 'repeat_order_placed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      if (updateError) {
        throw updateError
      }

      console.log(`✅ ${product.sku}: リピート発注完了（${this.config.reorderLotSize}個、¥${estimatedCost}）`)

      // TODO: 通知システムへの統合（Slack、メールなど）
      // await notificationService.send(`リピート発注完了: ${product.sku} (${this.config.reorderLotSize}個)`)

    } catch (error: any) {
      console.error(`❌ ${product.sku}: リピート発注エラー`, error)
      throw error
    }
  }

  /**
   * 複数商品の一括リピート発注
   *
   * 在庫数が閾値を下回っている全商品を対象に、一括でリピート発注を実行する。
   *
   * @returns リピート発注結果
   */
  async executeReorderForLowStockProducts(): Promise<ReorderResult> {
    console.log(`\n🔍 在庫不足商品のリピート発注チェック...`)
    console.log(`  閾値: physical_inventory_count <= ${this.config.reorderThreshold}`)

    const result: ReorderResult = {
      success: true,
      reorderedProducts: [],
      totalReorderAmount: 0,
      errors: [],
      message: '',
    }

    try {
      // 在庫が閾値以下の商品を取得
      const { data, error } = await this.supabase
        .from('products_master')
        .select('*')
        .lte('physical_inventory_count', this.config.reorderThreshold)
        .eq('arbitrage_status', 'listed_on_multi') // 多販路出品済みの商品のみ
        .not('supplier_source_url', 'is', null)

      if (error) {
        throw error
      }

      console.log(`📦 在庫不足商品: ${data?.length || 0}件`)

      if (!data || data.length === 0) {
        result.message = 'リピート発注が必要な商品はありません'
        return result
      }

      // 各商品をリピート発注
      for (const product of data) {
        try {
          await this.triggerReorder(product as Product)
          result.reorderedProducts.push(product as Product)
          result.totalReorderAmount += (product.cost || 0) * this.config.reorderLotSize

        } catch (error: any) {
          console.error(`❌ ${product.sku}: リピート発注エラー`, error)
          result.errors.push(`${product.sku}: ${error.message}`)
          result.success = false
        }
      }

      result.message = `リピート発注完了: ${result.reorderedProducts.length}/${data.length}件 (合計 ¥${result.totalReorderAmount})`
      console.log(`\n📊 ${result.message}`)

    } catch (error: any) {
      console.error(`❌ 一括リピート発注エラー:`, error)
      result.success = false
      result.errors.push(error.message)
      result.message = `リピート発注失敗: ${error.message}`
    }

    return result
  }

  /**
   * リピート発注商品の検品・承認
   *
   * リピート発注した商品が到着し、スタッフが検品・承認した際に呼び出される。
   * physical_inventory_count を増加させ、arbitrage_status を 'listed_on_multi' に戻す。
   *
   * @param productIds 承認された商品のIDリスト
   */
  async approveReorderedProducts(productIds: string[]): Promise<void> {
    console.log(`✅ リピート発注商品の検品・承認: ${productIds.length}件`)

    for (const productId of productIds) {
      try {
        // 商品情報を取得
        const { data: product, error: fetchError } = await this.supabase
          .from('products_master')
          .select('*')
          .eq('id', productId)
          .eq('arbitrage_status', 'repeat_order_placed')
          .single()

        if (fetchError || !product) {
          console.error(`❌ ${productId}: 商品が見つからない or ステータスが不正`)
          continue
        }

        // 在庫数を増加
        const currentInventory = product.physical_inventory_count || 0
        const newInventory = currentInventory + this.config.reorderLotSize

        // データベース更新
        const { error: updateError } = await this.supabase
          .from('products_master')
          .update({
            arbitrage_status: 'listed_on_multi',
            physical_inventory_count: newInventory,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)

        if (updateError) {
          throw updateError
        }

        console.log(`✅ ${product.sku}: 検品・承認完了（在庫: ${currentInventory} → ${newInventory}個）`)

      } catch (error: any) {
        console.error(`❌ ${productId}: 承認処理エラー`, error)
      }
    }
  }

  /**
   * 仕入れ先への自動決済API呼び出し
   *
   * 実際の仕入れ先（楽天、Yahoo!ショッピング等）のAPIを呼び出し、
   * 自動で商品を発注する。
   *
   * @param product 発注する商品
   * @param quantity 発注個数
   */
  private async callSupplierPurchaseAPI(product: Product, quantity: number): Promise<void> {
    console.log(`🛒 ${product.sku}: 仕入れ先への自動発注を実行...`)
    console.log(`  仕入れ先URL: ${product.supplier_source_url}`)
    console.log(`  発注個数: ${quantity}`)

    // TODO: 実際の仕入れ先APIとの統合
    // 例: await rakutenApiClient.placeOrder(product.supplier_source_url, quantity)
    //     await yahooShoppingApiClient.placeOrder(product.supplier_source_url, quantity)

    // 暫定: API呼び出しのシミュレーション（200ms待機）
    await new Promise(resolve => setTimeout(resolve, 200))

    console.log(`✅ ${product.sku}: 仕入れ先への発注完了`)
  }

  /**
   * 受注APIリスナーの登録
   *
   * Webhook や モールAPIのポーリング を使用して、
   * 受注を自動検知するリスナーを登録する。
   *
   * 使用例:
   * - Amazon MWS/SP-API: Orders APIをポーリング
   * - Yahoo!ショッピング: 受注管理APIをポーリング
   * - メルカリ: 取引通知Webhookを使用
   */
  registerOrderListener(): void {
    console.log('🔔 受注リスナーを登録（実装待ち）')

    // TODO: モール別のAPI統合
    // - Amazon SP-API: Orders APIのポーリング
    // - Yahoo!ショッピング: 受注管理APIのポーリング
    // - メルカリ: Webhook統合（存在する場合）
    // - Qoo10: Order APIのポーリング

    // 暫定: ポーリング間隔の設定（例: 5分ごと）
    // setInterval(async () => {
    //   await this.pollAmazonOrders()
    //   await this.pollYahooOrders()
    //   await this.pollMercariOrders()
    // }, 5 * 60 * 1000)
  }
}

/**
 * ファクトリー関数
 *
 * 簡単にRepeatOrderManagerを作成するためのヘルパー関数
 */
export function createRepeatOrderManager(config?: RepeatOrderConfig): RepeatOrderManager {
  return new RepeatOrderManager(config)
}

/**
 * 使用例:
 *
 * // 受注検知時の処理（Webhook や ポーリング から呼び出し）
 * const manager = createRepeatOrderManager({ dryRun: false })
 * const result = await manager.handleOrderReceived(
 *   'amazon_jp',
 *   'order-123456',
 *   'product-id-1',
 *   1
 * )
 *
 * // 在庫不足商品の一括リピート発注（cron jobから呼び出し）
 * const reorderResult = await manager.executeReorderForLowStockProducts()
 *
 * // リピート発注商品の検品・承認（スタッフUIから呼び出し）
 * await manager.approveReorderedProducts(['product-id-1', 'product-id-2'])
 */
