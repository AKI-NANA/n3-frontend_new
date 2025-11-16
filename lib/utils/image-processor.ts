/**
 * 画像処理ユーティリティ
 * - 画像リサイズ（1000px以上）
 * - Supabase Storageへのアップロード
 */

import { createClient } from '@/lib/supabase/server'
import sharp from 'sharp'

/**
 * 画像をリサイズ（長辺を1000px以上に）
 * @param buffer 画像バッファ
 * @returns Promise<Buffer> リサイズ後のバッファ
 */
export async function resizeImage(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer)
  const metadata = await image.metadata()
  
  const width = metadata.width || 0
  const height = metadata.height || 0
  const maxDimension = Math.max(width, height)
  
  // 既に1000px以上の場合はそのまま返す
  if (maxDimension >= 1000) {
    return buffer
  }
  
  // 長辺を1000pxにリサイズ
  const resized = await image
    .resize({
      width: width > height ? 1000 : undefined,
      height: height > width ? 1000 : undefined,
      fit: 'inside'
    })
    .jpeg({ quality: 90 })
    .toBuffer()
  
  return resized
}

/**
 * Supabase Storageに画像をアップロード
 * @param file ファイルオブジェクト
 * @param sku SKU（ファイル名の一部として使用）
 * @returns Promise<string> アップロードされた画像のURL
 */
export async function uploadImageToSupabase(
  file: File,
  sku: string
): Promise<string> {
  const supabase = createClient()
  
  // ファイル名を生成（SKU + タイムスタンプ + 元の拡張子）
  const timestamp = Date.now()
  const extension = file.name.split('.').pop() || 'jpg'
  const fileName = `${sku}_${timestamp}.${extension}`
  
  // ArrayBufferに変換
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  // リサイズ
  const resizedBuffer = await resizeImage(buffer)
  
  // Supabase Storageにアップロード
  const { data, error } = await supabase.storage
    .from('inventory-images')
    .upload(`products/${fileName}`, resizedBuffer, {
      contentType: file.type,
      upsert: false
    })
  
  if (error) {
    console.error('画像アップロードエラー:', error)
    throw new Error(`画像アップロード失敗: ${error.message}`)
  }
  
  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from('inventory-images')
    .getPublicUrl(`products/${fileName}`)
  
  return urlData.publicUrl
}

/**
 * 複数画像を一括アップロード
 * @param files ファイル配列
 * @param skus SKU配列（同じ長さである必要がある）
 * @returns Promise<string[]> アップロードされた画像URL配列
 */
export async function uploadBulkImages(
  files: File[],
  skus: string[]
): Promise<string[]> {
  if (files.length !== skus.length) {
    throw new Error('ファイル数とSKU数が一致しません')
  }
  
  const uploadPromises = files.map((file, index) =>
    uploadImageToSupabase(file, skus[index])
  )
  
  return Promise.all(uploadPromises)
}
