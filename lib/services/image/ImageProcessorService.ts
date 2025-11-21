/**
 * 画像最適化エンジン - ImageProcessorService
 *
 * 機能:
 * 1. P1/P2/P3の自動画像生成（ズーム率: 1.0, 1.15, 1.30）
 * 2. ウォーターマーク合成処理
 * 3. モール別の画像ルール取得
 * 4. Supabase Storage へのアップロード
 */

import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'

// ============================================
// 型定義
// ============================================

export interface ImageRule {
  id: string
  account_id: string
  marketplace: string
  watermark_enabled: boolean
  watermark_image_url: string | null
  watermark_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  watermark_opacity: number
  watermark_scale: number
  skip_watermark_for_amazon: boolean
  auto_resize: boolean
  target_size_px: number
  quality: number
  created_at: string
  updated_at: string
}

export interface ZoomVariant {
  variant: 'P1' | 'P2' | 'P3'
  zoom: number
  url: string
  buffer?: Buffer
}

export interface ProcessedImage {
  originalUrl: string
  variants: ZoomVariant[]
  finalUrl?: string // 最終的に選択された画像URL
}

// ============================================
// 定数
// ============================================

const ZOOM_PRESETS = {
  P1: 1.0,   // 元のサイズ
  P2: 1.15,  // 推奨拡大
  P3: 1.30,  // 最大拡大
} as const

const STORAGE_BUCKET = 'inventory-images'
const WATERMARK_BUCKET = 'watermarks'

// ============================================
// 画像ルール取得
// ============================================

/**
 * モールアカウントの画像ルールを取得
 */
export async function fetchImageRules(
  accountId: string,
  marketplace: string
): Promise<ImageRule | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('image_rules')
    .select('*')
    .eq('account_id', accountId)
    .eq('marketplace', marketplace)
    .single()

  if (error) {
    console.error('[ImageRules] 取得エラー:', error)
    return null
  }

  return data as ImageRule
}

/**
 * デフォルトルールを返す（DBにルールがない場合）
 */
export function getDefaultImageRule(marketplace: string): Omit<ImageRule, 'id' | 'created_at' | 'updated_at'> {
  return {
    account_id: '',
    marketplace,
    watermark_enabled: false,
    watermark_image_url: null,
    watermark_position: 'bottom-right',
    watermark_opacity: 0.8,
    watermark_scale: 0.15,
    skip_watermark_for_amazon: true,
    auto_resize: true,
    target_size_px: 1600,
    quality: 90,
  }
}

// ============================================
// P1/P2/P3 自動生成
// ============================================

/**
 * 画像URLからBufferを取得
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`画像の取得に失敗しました: ${url}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * ズーム処理を適用（中心から拡大）
 */
async function applyZoom(buffer: Buffer, zoomRatio: number): Promise<Buffer> {
  const image = sharp(buffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('画像のメタデータ取得に失敗しました')
  }

  const originalWidth = metadata.width
  const originalHeight = metadata.height

  // ズーム率が1.0の場合はそのまま返す
  if (zoomRatio === 1.0) {
    return buffer
  }

  // ズーム後のサイズ計算
  const zoomedWidth = Math.round(originalWidth * zoomRatio)
  const zoomedHeight = Math.round(originalHeight * zoomRatio)

  // 中心からクロップするための位置計算
  const left = Math.round((zoomedWidth - originalWidth) / 2)
  const top = Math.round((zoomedHeight - originalHeight) / 2)

  // ズーム＋クロップ処理
  const processed = await image
    .resize(zoomedWidth, zoomedHeight, {
      fit: 'cover',
      position: 'center',
    })
    .extract({
      left,
      top,
      width: originalWidth,
      height: originalHeight,
    })
    .jpeg({ quality: 95 })
    .toBuffer()

  return processed
}

/**
 * P1/P2/P3の3つの画像バリエーションを生成
 */
export async function generateZoomVariants(
  imageUrl: string,
  sku: string
): Promise<ZoomVariant[]> {
  console.log(`[ImageProcessor] P1/P2/P3生成開始: ${imageUrl}`)

  const originalBuffer = await fetchImageBuffer(imageUrl)
  const variants: ZoomVariant[] = []

  const supabase = await createClient()

  for (const [variantName, zoomRatio] of Object.entries(ZOOM_PRESETS)) {
    const processedBuffer = await applyZoom(originalBuffer, zoomRatio)

    // Supabase Storageにアップロード
    const timestamp = Date.now()
    const fileName = `${sku}_${variantName}_Z${zoomRatio}_${timestamp}.jpg`
    const filePath = `optimized/${fileName}`

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, processedBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) {
      console.error(`[ImageProcessor] ${variantName}のアップロードエラー:`, error)
      throw new Error(`${variantName}のアップロードに失敗しました`)
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    variants.push({
      variant: variantName as 'P1' | 'P2' | 'P3',
      zoom: zoomRatio,
      url: urlData.publicUrl,
      buffer: processedBuffer,
    })

    console.log(`[ImageProcessor] ${variantName} (Z=${zoomRatio}) 生成完了: ${urlData.publicUrl}`)
  }

  return variants
}

// ============================================
// ウォーターマーク合成
// ============================================

/**
 * ウォーターマークを画像に合成
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  watermarkUrl: string,
  position: ImageRule['watermark_position'],
  opacity: number,
  scale: number
): Promise<Buffer> {
  console.log('[ImageProcessor] ウォーターマーク合成開始')

  // ウォーターマーク画像を取得
  const watermarkBuffer = await fetchImageBuffer(watermarkUrl)

  // 元画像のメタデータを取得
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('画像のメタデータ取得に失敗しました')
  }

  const imageWidth = metadata.width
  const imageHeight = metadata.height

  // ウォーターマークのサイズを計算（画像サイズの割合）
  const watermarkWidth = Math.round(imageWidth * scale)

  // ウォーターマークをリサイズ
  let processedWatermark = await sharp(watermarkBuffer)
    .resize(watermarkWidth, null, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .ensureAlpha() // アルファチャンネルを確保
    .toBuffer()

  // 透過度を適用（opacity < 1.0の場合のみ）
  if (opacity < 1.0) {
    const watermarkImage = sharp(processedWatermark)
    const watermarkMeta = await watermarkImage.metadata()

    // 既存の画像データを取得してアルファチャンネルを調整
    const { data, info } = await watermarkImage
      .raw()
      .toBuffer({ resolveWithObject: true })

    // アルファチャンネルに透過度を適用
    const channels = info.channels
    if (channels === 4) { // RGBAの場合
      for (let i = 3; i < data.length; i += 4) {
        data[i] = Math.round(data[i] * opacity)
      }

      processedWatermark = await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4,
        },
      })
        .png()
        .toBuffer()
    }
  }

  const watermarkMetadata = await sharp(processedWatermark).metadata()
  const watermarkHeight = watermarkMetadata.height || 0

  // 位置を計算
  const positions = {
    'top-left': { left: 10, top: 10 },
    'top-right': { left: imageWidth - watermarkWidth - 10, top: 10 },
    'bottom-left': { left: 10, top: imageHeight - watermarkHeight - 10 },
    'bottom-right': { left: imageWidth - watermarkWidth - 10, top: imageHeight - watermarkHeight - 10 },
    'center': { left: Math.round((imageWidth - watermarkWidth) / 2), top: Math.round((imageHeight - watermarkHeight) / 2) },
  }

  const { left, top } = positions[position]

  // 合成（Sharpのcompositeで透過度を直接指定）
  const result = await image
    .composite([
      {
        input: processedWatermark,
        left,
        top,
        blend: 'over',
      },
    ])
    .jpeg({ quality: 95 })
    .toBuffer()

  console.log('[ImageProcessor] ウォーターマーク合成完了')
  return result
}

// ============================================
// 出品時の最終画像処理
// ============================================

/**
 * 出品時に実行する最終画像処理
 * - ズーム率を適用
 * - ウォーターマークを合成（ルールに基づく）
 */
export async function processImageForListing(
  imageUrl: string,
  sku: string,
  marketplace: string,
  accountId: string,
  customZoom?: number
): Promise<string> {
  console.log(`[ImageProcessor] 最終画像処理開始: ${marketplace}`)

  // 画像ルールを取得
  const rules = await fetchImageRules(accountId, marketplace)
  const finalRules = rules || getDefaultImageRule(marketplace)

  // Amazon の場合はウォーターマークをスキップ
  const shouldApplyWatermark =
    finalRules.watermark_enabled &&
    finalRules.watermark_image_url &&
    !(marketplace.startsWith('amazon') && finalRules.skip_watermark_for_amazon)

  // 画像を取得
  const imageBuffer = await fetchImageBuffer(imageUrl)

  // カスタムズーム率がある場合は適用、なければルールに従う
  const zoomRatio = customZoom || 1.0
  let processedBuffer = await applyZoom(imageBuffer, zoomRatio)

  // ウォーターマークを適用
  if (shouldApplyWatermark && finalRules.watermark_image_url) {
    processedBuffer = await applyWatermark(
      processedBuffer,
      finalRules.watermark_image_url,
      finalRules.watermark_position,
      finalRules.watermark_opacity,
      finalRules.watermark_scale
    )
  }

  // Supabase Storageにアップロード
  const supabase = await createClient()
  const timestamp = Date.now()
  const fileName = `${sku}_final_${marketplace}_${timestamp}.jpg`
  const filePath = `listings/${fileName}`

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, processedBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) {
    console.error('[ImageProcessor] 最終画像のアップロードエラー:', error)
    throw new Error('最終画像のアップロードに失敗しました')
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath)

  console.log(`[ImageProcessor] 最終画像処理完了: ${urlData.publicUrl}`)
  return urlData.publicUrl
}

// ============================================
// バッチ処理（複数画像）
// ============================================

/**
 * 複数画像の一括処理
 */
export async function batchProcessImages(
  imageUrls: string[],
  sku: string,
  marketplace: string,
  accountId: string,
  customZoom?: number
): Promise<string[]> {
  console.log(`[ImageProcessor] バッチ処理開始: ${imageUrls.length}枚`)

  const processedUrls: string[] = []

  for (const url of imageUrls) {
    try {
      const processedUrl = await processImageForListing(url, sku, marketplace, accountId, customZoom)
      processedUrls.push(processedUrl)
    } catch (error) {
      console.error(`[ImageProcessor] 処理エラー: ${url}`, error)
      // エラーが発生した場合は元のURLをそのまま使用
      processedUrls.push(url)
    }
  }

  console.log(`[ImageProcessor] バッチ処理完了: ${processedUrls.length}枚`)
  return processedUrls
}
