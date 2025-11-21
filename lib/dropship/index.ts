/**
 * 無在庫輸入システム - 統合モジュール
 *
 * Amazon JP/eBay JP ハイブリッド無在庫輸入システム
 *
 * 主要機能:
 * - スコアリングエンジン: 利益率、納期、信頼性を総合評価
 * - 出品管理: スコアが閾値を超えた商品を自動出品
 * - 価格改定: 仕入れ元価格の変動を監視し、自動で価格改定
 * - 受注処理: 受注検知 → 自動決済 → 納期連絡 → 追跡更新
 */

// スコアリング
export {
  calculateDropshipScore,
  scoreDropshipProducts,
  filterListingCandidates as filterDropshipCandidates,
  detectPriceUpdateNeeded,
  DEFAULT_DROPSHIP_CONFIG,
  type DropshipScore,
  type DropshipScoringConfig,
} from '@/lib/research/dropship-scorer'

// 出品管理
export {
  autoListProduct,
  bulkAutoList,
  delistProduct,
  filterListingCandidates,
  DEFAULT_LISTING_CONFIG,
  type ListingResult,
  type ListingConfig,
} from './listing-manager'

// 価格改定
export {
  monitorAndUpdatePrices,
  startPriceMonitoring,
  stopPriceMonitoring,
  DEFAULT_MONITORING_CONFIG,
  type PriceUpdateResult,
  type PriceMonitoringConfig,
} from './price-updater'

// 受注処理
export {
  processOrder,
  sendDeliveryNotification,
  updateTrackingInfo,
  executeDropshipOrderFlow,
  type Order,
  type PurchaseResult,
  type DeliveryNotification,
} from './order-processor'

/**
 * 使用例:
 *
 * ```typescript
 * import {
 *   calculateDropshipScore,
 *   autoListProduct,
 *   startPriceMonitoring,
 *   executeDropshipOrderFlow,
 * } from '@/lib/dropship'
 *
 * // 1. スコアリング
 * const score = calculateDropshipScore(product)
 * console.log(`総合スコア: ${score.totalScore}`)
 * console.log(`利益率: ${score.profitAnalysis.profitMargin}%`)
 * console.log(`出品推奨: ${score.shouldList ? 'はい' : 'いいえ'}`)
 *
 * // 2. 自動出品
 * if (score.shouldList) {
 *   const results = await autoListProduct(product)
 *   console.log(`出品結果: ${results.map(r => r.marketplace).join(', ')}`)
 * }
 *
 * // 3. 価格監視
 * const monitoringId = startPriceMonitoring(products, {
 *   checkInterval: 60,
 *   minProfitMargin: 15,
 *   priceChangeThreshold: 5,
 * })
 *
 * // 4. 受注処理
 * const order = {
 *   orderId: 'ORDER_123',
 *   marketplace: 'Amazon_JP',
 *   productId: product.id,
 *   sku: product.sku,
 *   quantity: 1,
 *   customerAddress: 'Tokyo, Japan',
 *   orderDate: new Date(),
 * }
 *
 * const flowResult = await executeDropshipOrderFlow(
 *   order,
 *   product,
 *   'YOUR_WAREHOUSE_ADDRESS'
 * )
 * ```
 */
