/**
 * 画像処理統合ヘルパー
 *
 * 出品時に画像処理を簡単に適用するためのヘルパー関数
 */

import { processImageForListing, batchProcessImages } from './ImageProcessorService'

/**
 * 出品前に画像URLを処理
 *
 * @param imageUrls - 元の画像URL配列
 * @param sku - 商品SKU
 * @param marketplace - 出品先（'ebay', 'shopee', 'amazon-global' など）
 * @param accountId - アカウントID
 * @param customZoom - カスタムズーム率（オプション、listing_dataから取得可能）
 * @returns 処理済み画像URL配列
 */
export async function prepareImagesForListing(
  imageUrls: string[],
  sku: string,
  marketplace: string,
  accountId: string,
  customZoom?: number
): Promise<string[]> {
  console.log(`[ImageIntegration] 画像処理開始: ${imageUrls.length}枚`)

  try {
    // バッチ処理で全画像を処理
    const processedUrls = await batchProcessImages(
      imageUrls,
      sku,
      marketplace,
      accountId,
      customZoom
    )

    console.log(`[ImageIntegration] 画像処理完了: ${processedUrls.length}枚`)
    return processedUrls
  } catch (error) {
    console.error('[ImageIntegration] 画像処理エラー:', error)

    // エラーが発生した場合は元のURLを返す
    console.warn('[ImageIntegration] フォールバック: 元の画像URLを使用します')
    return imageUrls
  }
}

/**
 * listing_data から画像設定を取得
 *
 * @param listingData - 商品のlisting_data
 * @returns カスタムズーム率（設定されている場合）
 */
export function getImageSettingsFromListingData(listingData: any): {
  customZoom?: number
  selectedVariant?: 'P1' | 'P2' | 'P3'
} {
  return {
    customZoom: listingData?.custom_zoom,
    selectedVariant: listingData?.selected_image_variant,
  }
}

/**
 * 単一画像を処理（メイン画像用）
 *
 * @param imageUrl - 元の画像URL
 * @param sku - 商品SKU
 * @param marketplace - 出品先
 * @param accountId - アカウントID
 * @param customZoom - カスタムズーム率
 * @returns 処理済み画像URL
 */
export async function prepareSingleImageForListing(
  imageUrl: string,
  sku: string,
  marketplace: string,
  accountId: string,
  customZoom?: number
): Promise<string> {
  console.log(`[ImageIntegration] 単一画像処理開始: ${imageUrl}`)

  try {
    const processedUrl = await processImageForListing(
      imageUrl,
      sku,
      marketplace,
      accountId,
      customZoom
    )

    console.log(`[ImageIntegration] 単一画像処理完了: ${processedUrl}`)
    return processedUrl
  } catch (error) {
    console.error('[ImageIntegration] 単一画像処理エラー:', error)

    // エラーが発生した場合は元のURLを返す
    console.warn('[ImageIntegration] フォールバック: 元の画像URLを使用します')
    return imageUrl
  }
}

/**
 * 出品データを画像処理で拡張
 *
 * 使用例:
 * ```typescript
 * const listing = {
 *   title: '商品名',
 *   price: 100,
 *   imageUrls: ['url1', 'url2'],
 *   ...
 * }
 *
 * const enhanced = await enhanceListingWithImageProcessing(
 *   listing,
 *   product.sku,
 *   'ebay',
 *   userId,
 *   product.listing_data?.custom_zoom
 * )
 *
 * // enhanced.imageUrls には処理済みのURLが含まれる
 * await createEbayListing(enhanced)
 * ```
 */
export async function enhanceListingWithImageProcessing<T extends { imageUrls?: string[] }>(
  listing: T,
  sku: string,
  marketplace: string,
  accountId: string,
  customZoom?: number
): Promise<T> {
  if (!listing.imageUrls || listing.imageUrls.length === 0) {
    console.warn('[ImageIntegration] 画像URLがありません。処理をスキップします。')
    return listing
  }

  const processedImageUrls = await prepareImagesForListing(
    listing.imageUrls,
    sku,
    marketplace,
    accountId,
    customZoom
  )

  return {
    ...listing,
    imageUrls: processedImageUrls,
  }
}
