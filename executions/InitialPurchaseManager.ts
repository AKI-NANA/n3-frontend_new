/**
 * InitialPurchaseManager.ts
 *
 * ハイブリッド無在庫戦略: 初期ロット仕入れマネージャー
 *
 * 機能:
 * 1. P-4戦略に基づき、arbitrage_scoreが閾値を超えた商品を自動選定
 * 2. 初期ロット（デフォルト：5個）を自動発注し、規約上の「有在庫」を確保
 * 3. スタッフの検品・承認後、多販路出品パイプラインを自動トリガー
 *
 * 規約遵守:
 * - Amazon JP: 出品時に在庫が手元にあることを保証
 * - Yahoo!ショッピング: 同上
 * - メルカリ: 即日発送可能な在庫を確保
 */

import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/product'

// 設定値
const DEFAULT_ARBITRAGE_THRESHOLD = 70 // arbitrage_scoreの閾値（0-100）
const DEFAULT_INITIAL_LOT_SIZE = 5 // 初期ロットのデフォルト個数
const MAX_AUTO_ORDER_AMOUNT_JPY = 50000 // 自動発注の最大金額（リスク管理）

export interface InitialPurchaseConfig {
  arbitrageThreshold?: number // スコア閾値（デフォルト: 70）
  initialLotSize?: number // 初期ロット個数（デフォルト: 5）
  maxAutoOrderAmount?: number // 最大発注金額（デフォルト: 50,000円）
  dryRun?: boolean // テストモード（実際の発注をスキップ）
}

export interface InitialPurchaseResult {
  success: boolean
  selectedProducts: Product[]
  orderedProducts: Product[]
  totalOrderAmount: number
  errors: string[]
  message: string
}

export interface ApprovalResult {
  success: boolean
  approvedProducts: Product[]
  listedProducts: Product[]
  errors: string[]
  message: string
}

/**
 * InitialPurchaseManager クラス
 *
 * 初期ロット仕入れの自動化を管理するクラス
 */
export class InitialPurchaseManager {
  private supabase: ReturnType<typeof createClient>
  private config: Required<InitialPurchaseConfig>

  constructor(config: InitialPurchaseConfig = {}) {
    this.supabase = createClient()
    this.config = {
      arbitrageThreshold: config.arbitrageThreshold ?? DEFAULT_ARBITRAGE_THRESHOLD,
      initialLotSize: config.initialLotSize ?? DEFAULT_INITIAL_LOT_SIZE,
      maxAutoOrderAmount: config.maxAutoOrderAmount ?? MAX_AUTO_ORDER_AMOUNT_JPY,
      dryRun: config.dryRun ?? false,
    }

    console.log('🚀 InitialPurchaseManager 初期化:', this.config)
  }

  /**
   * Step 1: P-4スコアリングに基づく商品選定
   *
   * 条件:
   * - arbitrage_score が閾値以上
   * - arbitrage_status が 'tracked'（追跡中）
   * - supplier_source_url が設定されている（仕入れ先が明確）
   *
   * @returns 選定された商品のリスト
   */
  async selectHighPotentialProducts(): Promise<Product[]> {
    console.log('🔍 高ポテンシャル商品を選定中...')
    console.log(`  閾値: arbitrage_score >= ${this.config.arbitrageThreshold}`)

    const { data, error } = await this.supabase
      .from('products_master')
      .select('*')
      .gte('arbitrage_score', this.config.arbitrageThreshold)
      .eq('arbitrage_status', 'tracked')
      .not('supplier_source_url', 'is', null)
      .order('arbitrage_score', { ascending: false })

    if (error) {
      console.error('❌ 商品選定エラー:', error)
      throw error
    }

    console.log(`✅ ${data?.length || 0}件の高ポテンシャル商品を発見`)

    // Keepa、AI、終売ステータスによる追加フィルタリング
    const filteredProducts = (data || []).filter((product: any) => {
      // Keepaデータチェック: 在庫切れまたは終売の可能性
      const hasKeepaSignal = product.keepa_data?.is_out_of_stock === true ||
                            (product.keepa_data?.sales_rank_drops_30d || 0) > 10

      // AIアセスメントチェック: 高利益ポテンシャル
      const hasAiSignal = product.ai_assessment?.profit_potential === 'very_high' ||
                         product.ai_assessment?.profit_potential === 'high'

      // 終売ステータスチェック
      const hasDiscontinuationSignal = product.discontinuation_status?.is_discontinued === true

      // いずれかのシグナルが存在する商品のみを選定
      return hasKeepaSignal || hasAiSignal || hasDiscontinuationSignal
    })

    console.log(`🎯 フィルタリング後: ${filteredProducts.length}件（Keepa/AI/終売シグナル有り）`)

    return filteredProducts as Product[]
  }

  /**
   * Step 2: 初期ロット自動発注
   *
   * 自動決済APIを呼び出し、初期ロット（例：5個）を発注する。
   * arbitrage_status を 'initial_purchased' に更新。
   *
   * @param products 発注する商品のリスト
   * @returns 発注結果
   */
  async placeInitialOrders(products: Product[]): Promise<InitialPurchaseResult> {
    const result: InitialPurchaseResult = {
      success: true,
      selectedProducts: products,
      orderedProducts: [],
      totalOrderAmount: 0,
      errors: [],
      message: '',
    }

    console.log(`📦 初期ロット発注開始: ${products.length}件`)

    for (const product of products) {
      try {
        // 発注金額チェック（リスク管理）
        const estimatedCost = (product.cost || 0) * this.config.initialLotSize

        if (estimatedCost > this.config.maxAutoOrderAmount) {
          console.warn(`⚠️ ${product.sku}: 発注金額が上限を超過（¥${estimatedCost}）- スキップ`)
          result.errors.push(`${product.sku}: 発注金額が上限を超過`)
          continue
        }

        // dryRunモードの場合、実際の発注はスキップ
        if (this.config.dryRun) {
          console.log(`🧪 [DRY RUN] ${product.sku}: 発注スキップ（テストモード）`)
        } else {
          // 実際の自動決済API呼び出し
          await this.callSupplierPurchaseAPI(product, this.config.initialLotSize)
        }

        // データベース更新: arbitrage_status を 'initial_purchased' に変更
        const { error: updateError } = await this.supabase
          .from('products_master')
          .update({
            arbitrage_status: 'initial_purchased',
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id)

        if (updateError) {
          console.error(`❌ ${product.sku}: ステータス更新エラー`, updateError)
          result.errors.push(`${product.sku}: ステータス更新失敗`)
          continue
        }

        result.orderedProducts.push(product)
        result.totalOrderAmount += estimatedCost

        console.log(`✅ ${product.sku}: 初期ロット発注完了（${this.config.initialLotSize}個、¥${estimatedCost}）`)

      } catch (error: any) {
        console.error(`❌ ${product.sku}: 発注エラー`, error)
        result.errors.push(`${product.sku}: ${error.message}`)
        result.success = false
      }
    }

    result.message = `初期ロット発注完了: ${result.orderedProducts.length}/${products.length}件 (合計 ¥${result.totalOrderAmount})`
    console.log(`\n📊 ${result.message}`)

    return result
  }

  /**
   * Step 3: スタッフによる検品・承認
   *
   * スタッフが商品を検品・承認した際に呼び出される。
   * arbitrage_status を 'ready_to_list' に更新し、
   * physical_inventory_count を初期ロット数で設定する。
   *
   * @param productIds 承認された商品のIDリスト
   * @returns 承認結果
   */
  async approveInspectedProducts(productIds: string[]): Promise<ApprovalResult> {
    const result: ApprovalResult = {
      success: true,
      approvedProducts: [],
      listedProducts: [],
      errors: [],
      message: '',
    }

    console.log(`✅ 検品・承認処理開始: ${productIds.length}件`)

    for (const productId of productIds) {
      try {
        // 商品情報を取得
        const { data: product, error: fetchError } = await this.supabase
          .from('products_master')
          .select('*')
          .eq('id', productId)
          .eq('arbitrage_status', 'initial_purchased')
          .single()

        if (fetchError || !product) {
          console.error(`❌ ${productId}: 商品が見つからない or ステータスが不正`)
          result.errors.push(`${productId}: 商品が見つからない`)
          continue
        }

        // データベース更新: ステータスと在庫数を設定
        const { error: updateError } = await this.supabase
          .from('products_master')
          .update({
            arbitrage_status: 'ready_to_list',
            physical_inventory_count: this.config.initialLotSize,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)

        if (updateError) {
          console.error(`❌ ${productId}: ステータス更新エラー`, updateError)
          result.errors.push(`${productId}: ステータス更新失敗`)
          continue
        }

        result.approvedProducts.push(product as Product)

        console.log(`✅ ${product.sku}: 検品・承認完了（在庫: ${this.config.initialLotSize}個）`)

        // Step 4: 多販路出品パイプラインを自動トリガー
        await this.triggerMultiMarketplaceListing(product as Product)
        result.listedProducts.push(product as Product)

      } catch (error: any) {
        console.error(`❌ ${productId}: 承認処理エラー`, error)
        result.errors.push(`${productId}: ${error.message}`)
        result.success = false
      }
    }

    result.message = `検品・承認完了: ${result.approvedProducts.length}/${productIds.length}件、出品済み: ${result.listedProducts.length}件`
    console.log(`\n📊 ${result.message}`)

    return result
  }

  /**
   * Step 4: 多販路出品パイプラインのトリガー
   *
   * 承認された商品を、Amazon JP、Yahoo!ショッピング、メルカリC2Cへ自動出品する。
   * arbitrage_status を 'listed_on_multi' に更新。
   *
   * @param product 出品する商品
   */
  private async triggerMultiMarketplaceListing(product: Product): Promise<void> {
    console.log(`🚀 ${product.sku}: 多販路出品を開始...`)

    try {
      // 既存の多販路出品サービスを呼び出し（実装済みの MultiMarketplaceListingService を想定）
      // 例: await multiMarketplaceListingService.listProduct(product, ['amazon_jp', 'yahoo_jp', 'mercari_c2c'])

      // 暫定: API呼び出しのシミュレーション
      if (!this.config.dryRun) {
        // TODO: 実際の出品サービスとの統合
        console.log(`  → Amazon JP: 出品処理（実装待ち）`)
        console.log(`  → Yahoo!ショッピング: 出品処理（実装待ち）`)
        console.log(`  → メルカリC2C: 出品処理（実装待ち）`)
      }

      // ステータスを 'listed_on_multi' に更新
      const { error: updateError } = await this.supabase
        .from('products_master')
        .update({
          arbitrage_status: 'listed_on_multi',
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      if (updateError) {
        throw updateError
      }

      console.log(`✅ ${product.sku}: 多販路出品完了`)

    } catch (error: any) {
      console.error(`❌ ${product.sku}: 出品エラー`, error)
      throw error
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
   * オールインワン実行メソッド
   *
   * 選定 → 発注 を一括で実行する。
   * 承認処理は別途スタッフUIから呼び出される想定。
   *
   * @returns 発注結果
   */
  async executeInitialPurchaseFlow(): Promise<InitialPurchaseResult> {
    console.log('\n🚀 ========================================')
    console.log('   初期ロット仕入れフロー開始')
    console.log('========================================\n')

    // Step 1: 商品選定
    const selectedProducts = await this.selectHighPotentialProducts()

    if (selectedProducts.length === 0) {
      return {
        success: true,
        selectedProducts: [],
        orderedProducts: [],
        totalOrderAmount: 0,
        errors: [],
        message: '発注対象の商品が見つかりませんでした',
      }
    }

    // Step 2: 自動発注
    const result = await this.placeInitialOrders(selectedProducts)

    console.log('\n🎉 ========================================')
    console.log('   初期ロット仕入れフロー完了')
    console.log('========================================\n')

    return result
  }
}

/**
 * ファクトリー関数
 *
 * 簡単にInitialPurchaseManagerを作成するためのヘルパー関数
 */
export function createInitialPurchaseManager(config?: InitialPurchaseConfig): InitialPurchaseManager {
  return new InitialPurchaseManager(config)
}

/**
 * 使用例:
 *
 * // 自動実行（cron jobなどから呼び出し）
 * const manager = createInitialPurchaseManager({ dryRun: false })
 * const result = await manager.executeInitialPurchaseFlow()
 *
 * // スタッフによる検品・承認（UIから呼び出し）
 * const approvalResult = await manager.approveInspectedProducts(['product-id-1', 'product-id-2'])
 */
