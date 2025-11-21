/**
 * 無在庫輸入 出品管理エンジン
 *
 * スコアが閾値を超えた商品を自動でAmazon JPとeBay JPに出品（SKU作成）
 */

import { Product } from '@/types/product'
import { calculateDropshipScore, DEFAULT_DROPSHIP_CONFIG } from '@/lib/research/dropship-scorer'

// 出品結果
export interface ListingResult {
  productId: string
  sku: string
  marketplace: 'Amazon_JP' | 'eBay_JP'
  success: boolean
  listingId?: string
  listingUrl?: string
  error?: string
}

// 出品設定
export interface ListingConfig {
  autoListToAmazon: boolean       // Amazon JPに自動出品
  autoListToEbay: boolean          // eBay JPに自動出品
  scoreThreshold: number           // 出品スコア閾値
  testMode: boolean                // テストモード（実際には出品しない）
}

// デフォルト設定
export const DEFAULT_LISTING_CONFIG: ListingConfig = {
  autoListToAmazon: true,
  autoListToEbay: true,
  scoreThreshold: 60,
  testMode: false,
}

/**
 * 出品候補商品をフィルタリング
 */
export function filterListingCandidates(
  products: Product[],
  config: ListingConfig = DEFAULT_LISTING_CONFIG
): Product[] {

  return products.filter(product => {
    // 既に出品済みの商品はスキップ
    if (product.arbitrage_status === 'listed_on_multi') {
      return false
    }

    // スコアを計算
    const score = calculateDropshipScore(product, DEFAULT_DROPSHIP_CONFIG)

    // スコアが閾値を超えている場合のみ出品候補
    return score.totalScore >= config.scoreThreshold && score.shouldList
  })
}

/**
 * 商品を複数マーケットプレイスに自動出品
 */
export async function autoListProduct(
  product: Product,
  config: ListingConfig = DEFAULT_LISTING_CONFIG
): Promise<ListingResult[]> {

  console.log(`[ListingManager] 自動出品開始: ${product.sku}`)

  const results: ListingResult[] = []

  // スコアチェック
  const score = calculateDropshipScore(product, DEFAULT_DROPSHIP_CONFIG)

  if (score.totalScore < config.scoreThreshold) {
    console.warn(`[ListingManager] スコア不足: ${product.sku} (${score.totalScore}/${config.scoreThreshold})`)
    return []
  }

  // Amazon JPに出品
  if (config.autoListToAmazon && !product.amazon_jp_listing_id) {
    const amazonResult = await listToAmazonJP(product, config.testMode)
    results.push(amazonResult)
  }

  // eBay JPに出品
  if (config.autoListToEbay && !product.ebay_jp_listing_id) {
    const ebayResult = await listToEbayJP(product, config.testMode)
    results.push(ebayResult)
  }

  // ステータスを更新
  if (results.every(r => r.success)) {
    await updateProductStatus(product.id, 'listed_on_multi')
    console.log(`[ListingManager] ステータス更新: ${product.sku} → listed_on_multi`)
  }

  return results
}

/**
 * Amazon JPに出品
 */
async function listToAmazonJP(
  product: Product,
  testMode: boolean
): Promise<ListingResult> {

  console.log(`[ListingManager] Amazon JP出品: ${product.sku}`)

  if (testMode) {
    console.log(`[ListingManager] テストモード: 実際には出品しません`)
    return {
      productId: product.id,
      sku: product.sku,
      marketplace: 'Amazon_JP',
      success: true,
      listingId: `TEST_AMZJP_${Date.now()}`,
      listingUrl: `https://www.amazon.co.jp/dp/TEST`,
    }
  }

  // 実際はAmazon SP-APIを使用して出品
  try {
    const listingData = prepareAmazonListingData(product)

    // モック実装
    const mockSuccess = Math.random() > 0.1 // 90%の成功率

    if (!mockSuccess) {
      throw new Error('Amazon出品API呼び出し失敗')
    }

    const listingId = `AMZJP_${Date.now()}`

    // データベース更新
    await updateListingId(product.id, 'amazon_jp_listing_id', listingId)

    return {
      productId: product.id,
      sku: product.sku,
      marketplace: 'Amazon_JP',
      success: true,
      listingId,
      listingUrl: `https://www.amazon.co.jp/dp/${listingId}`,
    }

  } catch (error) {
    console.error(`[ListingManager] Amazon JP出品失敗:`, error)
    return {
      productId: product.id,
      sku: product.sku,
      marketplace: 'Amazon_JP',
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }
}

/**
 * eBay JPに出品
 */
async function listToEbayJP(
  product: Product,
  testMode: boolean
): Promise<ListingResult> {

  console.log(`[ListingManager] eBay JP出品: ${product.sku}`)

  if (testMode) {
    console.log(`[ListingManager] テストモード: 実際には出品しません`)
    return {
      productId: product.id,
      sku: product.sku,
      marketplace: 'eBay_JP',
      success: true,
      listingId: `TEST_EBAYJP_${Date.now()}`,
      listingUrl: `https://www.ebay.co.jp/itm/TEST`,
    }
  }

  // 実際はeBay APIを使用して出品
  try {
    const listingData = prepareEbayListingData(product)

    // モック実装
    const mockSuccess = Math.random() > 0.1 // 90%の成功率

    if (!mockSuccess) {
      throw new Error('eBay出品API呼び出し失敗')
    }

    const listingId = `EBAYJP_${Date.now()}`

    // データベース更新
    await updateListingId(product.id, 'ebay_jp_listing_id', listingId)

    return {
      productId: product.id,
      sku: product.sku,
      marketplace: 'eBay_JP',
      success: true,
      listingId,
      listingUrl: `https://www.ebay.co.jp/itm/${listingId}`,
    }

  } catch (error) {
    console.error(`[ListingManager] eBay JP出品失敗:`, error)
    return {
      productId: product.id,
      sku: product.sku,
      marketplace: 'eBay_JP',
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }
}

/**
 * Amazon出品データを準備
 */
function prepareAmazonListingData(product: Product): any {
  return {
    sku: product.sku,
    asin: product.asin,
    title: product.title,
    description: product.description,
    price: product.price,
    quantity: 999, // 無在庫のため在庫数は大きめに設定
    images: product.images.map(img => img.url),
    condition: 'New',
    handling_time: product.estimated_lead_time_days || 14,
  }
}

/**
 * eBay出品データを準備
 */
function prepareEbayListingData(product: Product): any {
  return {
    sku: product.sku,
    title: product.title,
    description: product.description,
    price: product.price,
    quantity: 999, // 無在庫のため在庫数は大きめに設定
    images: product.images.map(img => img.url),
    condition: 'New',
    shippingTime: product.estimated_lead_time_days || 14,
    category: product.category?.name,
  }
}

/**
 * データベースで出品IDを更新（モック）
 */
async function updateListingId(
  productId: string,
  field: 'amazon_jp_listing_id' | 'ebay_jp_listing_id',
  listingId: string
): Promise<void> {

  console.log(`[ListingManager] DB更新: ${field} = ${listingId}`)

  // モック実装
  // 実際はSupabaseを使用
  // await supabase
  //   .from('products')
  //   .update({ [field]: listingId })
  //   .eq('id', productId)
}

/**
 * 商品ステータスを更新（モック）
 */
async function updateProductStatus(
  productId: string,
  status: Product['arbitrage_status']
): Promise<void> {

  console.log(`[ListingManager] ステータス更新: ${productId} → ${status}`)

  // モック実装
  // 実際はSupabaseを使用
  // await supabase
  //   .from('products')
  //   .update({ arbitrage_status: status })
  //   .eq('id', productId)
}

/**
 * 複数商品を一括出品
 */
export async function bulkAutoList(
  products: Product[],
  config: ListingConfig = DEFAULT_LISTING_CONFIG
): Promise<Map<string, ListingResult[]>> {

  console.log(`[ListingManager] 一括出品開始: ${products.length}件`)

  const results = new Map<string, ListingResult[]>()

  // 出品候補をフィルタリング
  const candidates = filterListingCandidates(products, config)

  console.log(`[ListingManager] 出品候補: ${candidates.length}件`)

  for (const product of candidates) {
    const listingResults = await autoListProduct(product, config)
    results.set(product.id, listingResults)
  }

  const successCount = Array.from(results.values())
    .flat()
    .filter(r => r.success).length

  console.log(`[ListingManager] 一括出品完了: ${successCount}/${candidates.length * 2}件成功`)

  return results
}

/**
 * 出品取り消し
 */
export async function delistProduct(
  product: Product,
  marketplace: 'Amazon_JP' | 'eBay_JP' | 'both'
): Promise<ListingResult[]> {

  console.log(`[ListingManager] 出品取り消し: ${product.sku} (${marketplace})`)

  const results: ListingResult[] = []

  // Amazon JPから取り消し
  if ((marketplace === 'Amazon_JP' || marketplace === 'both') && product.amazon_jp_listing_id) {
    const amazonResult = await delistFromAmazonJP(product)
    results.push(amazonResult)
  }

  // eBay JPから取り消し
  if ((marketplace === 'eBay_JP' || marketplace === 'both') && product.ebay_jp_listing_id) {
    const ebayResult = await delistFromEbayJP(product)
    results.push(ebayResult)
  }

  return results
}

/**
 * Amazon JPから出品取り消し
 */
async function delistFromAmazonJP(product: Product): Promise<ListingResult> {
  console.log(`[ListingManager] Amazon JP出品取り消し: ${product.amazon_jp_listing_id}`)

  // 実際はAmazon SP-APIを使用
  // モック実装
  await updateListingId(product.id, 'amazon_jp_listing_id', '')

  return {
    productId: product.id,
    sku: product.sku,
    marketplace: 'Amazon_JP',
    success: true,
  }
}

/**
 * eBay JPから出品取り消し
 */
async function delistFromEbayJP(product: Product): Promise<ListingResult> {
  console.log(`[ListingManager] eBay JP出品取り消し: ${product.ebay_jp_listing_id}`)

  // 実際はeBay APIを使用
  // モック実装
  await updateListingId(product.id, 'ebay_jp_listing_id', '')

  return {
    productId: product.id,
    sku: product.sku,
    marketplace: 'eBay_JP',
    success: true,
  }
}
