/**
 * 無在庫輸入 価格改定エンジン
 *
 * 仕入れ元の価格（Amazon US/EU/AliExpress）が変動した場合、
 * 利益率を維持できるよう、販売価格も自動で追従して改定する
 */

import { Product } from '@/types/product'
import { detectPriceUpdateNeeded, DEFAULT_DROPSHIP_CONFIG } from '@/lib/research/dropship-scorer'

// 価格改定結果
export interface PriceUpdateResult {
  productId: string
  sku: string
  oldPrice: number
  newPrice: number
  oldSupplierPrice: number
  newSupplierPrice: number
  oldProfitMargin: number
  newProfitMargin: number
  updated: boolean
  reason: string
}

// 価格監視設定
export interface PriceMonitoringConfig {
  checkInterval: number          // チェック間隔（分）
  minProfitMargin: number         // 最低利益率（%）
  priceChangeThreshold: number    // 価格変動閾値（%）
  exchangeRate: number            // 為替レート
}

// デフォルト設定
export const DEFAULT_MONITORING_CONFIG: PriceMonitoringConfig = {
  checkInterval: 60,              // 60分ごと
  minProfitMargin: 15,            // 最低15%
  priceChangeThreshold: 5,        // 5%以上の変動で改定
  exchangeRate: 150,
}

/**
 * 仕入れ元価格の監視と自動改定
 */
export async function monitorAndUpdatePrices(
  products: Product[],
  config: PriceMonitoringConfig = DEFAULT_MONITORING_CONFIG
): Promise<PriceUpdateResult[]> {

  console.log(`[PriceUpdater] 価格監視開始: ${products.length}件`)

  const results: PriceUpdateResult[] = []

  for (const product of products) {
    // 無在庫輸入対象の商品のみ処理
    if (!product.potential_supplier || !product.supplier_current_price) {
      continue
    }

    // 仕入れ元の最新価格を取得
    const latestSupplierPrice = await fetchLatestSupplierPrice(
      product.potential_supplier,
      product.asin
    )

    if (!latestSupplierPrice) {
      console.warn(`[PriceUpdater] 仕入れ価格取得失敗: ${product.sku}`)
      continue
    }

    // 価格変動をチェック
    const priceChangePercent = calculatePriceChangePercent(
      product.supplier_current_price,
      latestSupplierPrice
    )

    // 変動が閾値以下の場合はスキップ
    if (Math.abs(priceChangePercent) < config.priceChangeThreshold) {
      continue
    }

    console.log(`[PriceUpdater] 価格変動検知: ${product.sku} (${priceChangePercent.toFixed(2)}%)`)

    // 価格改定が必要かチェック
    const updateCheck = detectPriceUpdateNeeded(
      product,
      latestSupplierPrice,
      {
        ...DEFAULT_DROPSHIP_CONFIG,
        exchangeRate: config.exchangeRate,
      }
    )

    if (!updateCheck.needsUpdate) {
      console.log(`[PriceUpdater] 価格改定不要: ${product.sku}`)
      results.push({
        productId: product.id,
        sku: product.sku,
        oldPrice: product.price,
        newPrice: product.price,
        oldSupplierPrice: product.supplier_current_price,
        newSupplierPrice: latestSupplierPrice,
        oldProfitMargin: updateCheck.currentScore.profitAnalysis.profitMargin,
        newProfitMargin: updateCheck.newScore.profitAnalysis.profitMargin,
        updated: false,
        reason: '利益率が維持されているため改定不要',
      })
      continue
    }

    // 価格改定を実行
    const updateResult = await updateProductPrice(
      product,
      updateCheck.recommendedPrice,
      latestSupplierPrice,
      config
    )

    results.push(updateResult)
  }

  console.log(`[PriceUpdater] 価格監視完了: ${results.length}件処理、${results.filter(r => r.updated).length}件改定`)

  return results
}

/**
 * 商品価格を更新
 */
async function updateProductPrice(
  product: Product,
  newPrice: number,
  newSupplierPrice: number,
  config: PriceMonitoringConfig
): Promise<PriceUpdateResult> {

  console.log(`[PriceUpdater] 価格改定実行: ${product.sku}`)
  console.log(`  旧価格: ¥${product.price} → 新価格: ¥${newPrice}`)
  console.log(`  仕入れ価格: $${product.supplier_current_price} → $${newSupplierPrice}`)

  // 実際はデータベースとマーケットプレイスAPIを更新
  const dbUpdateResult = await updatePriceInDatabase(product.id, newPrice, newSupplierPrice)

  if (!dbUpdateResult.success) {
    console.error(`[PriceUpdater] DB更新失敗: ${product.sku}`)
    return {
      productId: product.id,
      sku: product.sku,
      oldPrice: product.price,
      newPrice: product.price,
      oldSupplierPrice: product.supplier_current_price || 0,
      newSupplierPrice,
      oldProfitMargin: 0,
      newProfitMargin: 0,
      updated: false,
      reason: 'データベース更新失敗',
    }
  }

  // マーケットプレイスに価格を反映
  const marketplaceUpdateResults = await updatePriceInMarketplaces(product, newPrice)

  // 利益率を計算
  const oldProfitMargin = calculateProfitMargin(product.price, product.supplier_current_price || 0, config.exchangeRate)
  const newProfitMargin = calculateProfitMargin(newPrice, newSupplierPrice, config.exchangeRate)

  return {
    productId: product.id,
    sku: product.sku,
    oldPrice: product.price,
    newPrice,
    oldSupplierPrice: product.supplier_current_price || 0,
    newSupplierPrice,
    oldProfitMargin,
    newProfitMargin,
    updated: true,
    reason: `仕入れ価格変動により改定（${marketplaceUpdateResults.join(', ')}）`,
  }
}

/**
 * 仕入れ元の最新価格を取得（モック）
 */
async function fetchLatestSupplierPrice(
  supplier: 'Amazon_US' | 'Amazon_EU' | 'AliExpress',
  asin: string
): Promise<number | null> {

  console.log(`[PriceUpdater] 仕入れ価格取得: ${supplier} / ${asin}`)

  // モック実装
  // 実際はAmazon API、AliExpress API等を使用
  const mockPrices: Record<string, number> = {
    'Amazon_US': 25.99,
    'Amazon_EU': 22.50,
    'AliExpress': 15.00,
  }

  // ランダムな価格変動をシミュレート（±10%）
  const basePrice = mockPrices[supplier] || 20
  const priceVariation = basePrice * (Math.random() * 0.2 - 0.1)
  const latestPrice = basePrice + priceVariation

  return parseFloat(latestPrice.toFixed(2))
}

/**
 * 価格変動率を計算
 */
function calculatePriceChangePercent(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0
  return ((newPrice - oldPrice) / oldPrice) * 100
}

/**
 * 利益率を計算
 */
function calculateProfitMargin(
  sellingPrice: number,
  supplierPriceUSD: number,
  exchangeRate: number
): number {

  const supplierPriceJPY = supplierPriceUSD * exchangeRate
  const internationalShipping = 15 * exchangeRate // $15
  const fbaFee = sellingPrice * 0.15

  const totalCost = supplierPriceJPY + internationalShipping + fbaFee
  const profit = sellingPrice - totalCost

  return sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0
}

/**
 * データベースで価格を更新（モック）
 */
async function updatePriceInDatabase(
  productId: string,
  newPrice: number,
  newSupplierPrice: number
): Promise<{ success: boolean; error?: string }> {

  console.log(`[PriceUpdater] DB更新: 商品ID ${productId}`)

  // モック実装
  // 実際はSupabaseを使用
  // await supabase
  //   .from('products')
  //   .update({
  //     price: newPrice,
  //     supplier_current_price: newSupplierPrice,
  //     updated_at: new Date().toISOString(),
  //   })
  //   .eq('id', productId)

  return { success: true }
}

/**
 * マーケットプレイスで価格を更新（モック）
 */
async function updatePriceInMarketplaces(
  product: Product,
  newPrice: number
): Promise<string[]> {

  const updatedMarketplaces: string[] = []

  // Amazon JPで価格更新
  if (product.amazon_jp_listing_id) {
    console.log(`[PriceUpdater] Amazon JP価格更新: ${product.amazon_jp_listing_id}`)
    // 実際はAmazon SP-APIを使用
    updatedMarketplaces.push('Amazon JP')
  }

  // eBay JPで価格更新
  if (product.ebay_jp_listing_id) {
    console.log(`[PriceUpdater] eBay JP価格更新: ${product.ebay_jp_listing_id}`)
    // 実際はeBay APIを使用
    updatedMarketplaces.push('eBay JP')
  }

  return updatedMarketplaces
}

/**
 * 価格監視スケジューラ
 *
 * 定期的に価格をチェックし、自動改定を実行
 */
export function startPriceMonitoring(
  products: Product[],
  config: PriceMonitoringConfig = DEFAULT_MONITORING_CONFIG,
  onUpdate?: (results: PriceUpdateResult[]) => void
): NodeJS.Timeout {

  console.log(`[PriceUpdater] 価格監視スケジューラ起動: ${config.checkInterval}分間隔`)

  const intervalId = setInterval(async () => {
    console.log(`[PriceUpdater] === 定期価格チェック開始 ===`)

    const results = await monitorAndUpdatePrices(products, config)

    if (onUpdate) {
      onUpdate(results)
    }

    console.log(`[PriceUpdater] === 定期価格チェック完了 ===`)
  }, config.checkInterval * 60 * 1000)

  return intervalId
}

/**
 * 価格監視を停止
 */
export function stopPriceMonitoring(intervalId: NodeJS.Timeout): void {
  console.log(`[PriceUpdater] 価格監視スケジューラ停止`)
  clearInterval(intervalId)
}
