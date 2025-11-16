/**
 * SKU自動生成ユーティリティ
 * 形式: ITEM-{連番6桁} (例: ITEM-000001)
 */

import { createClient } from '@/lib/supabase/server'

/**
 * 次の利用可能なSKUを生成
 * @returns Promise<string> 新しいSKU (例: "ITEM-000001")
 */
export async function generateNextSKU(): Promise<string> {
  const supabase = createClient()
  
  // 最新のSKUを取得（ITEM-で始まるもののみ）
  const { data, error } = await supabase
    .from('inventory_master')
    .select('sku')
    .like('sku', 'ITEM-%')
    .order('sku', { ascending: false })
    .limit(1)
  
  if (error) {
    console.error('SKU取得エラー:', error)
    // エラー時は最初のSKUを返す
    return 'ITEM-000001'
  }
  
  // データがない場合は最初のSKUを返す
  if (!data || data.length === 0) {
    return 'ITEM-000001'
  }
  
  // 最新SKUから番号を抽出してインクリメント
  const latestSKU = data[0].sku
  const match = latestSKU.match(/ITEM-(\d{6})/)
  
  if (!match) {
    // フォーマットが不正な場合は最初のSKUを返す
    return 'ITEM-000001'
  }
  
  const currentNumber = parseInt(match[1], 10)
  const nextNumber = currentNumber + 1
  
  // 6桁にゼロパディング
  const paddedNumber = nextNumber.toString().padStart(6, '0')
  
  return `ITEM-${paddedNumber}`
}

/**
 * 複数のSKUを一括生成
 * @param count 生成する数
 * @returns Promise<string[]> 新しいSKU配列
 */
export async function generateBulkSKUs(count: number): Promise<string[]> {
  const supabase = createClient()
  
  // 最新のSKUを取得
  const { data, error } = await supabase
    .from('inventory_master')
    .select('sku')
    .like('sku', 'ITEM-%')
    .order('sku', { ascending: false })
    .limit(1)
  
  let startNumber = 1
  
  if (!error && data && data.length > 0) {
    const latestSKU = data[0].sku
    const match = latestSKU.match(/ITEM-(\d{6})/)
    
    if (match) {
      startNumber = parseInt(match[1], 10) + 1
    }
  }
  
  // 連番でSKUを生成
  const skus: string[] = []
  for (let i = 0; i < count; i++) {
    const number = (startNumber + i).toString().padStart(6, '0')
    skus.push(`ITEM-${number}`)
  }
  
  return skus
}

/**
 * SKUの重複チェック
 * @param sku チェックするSKU
 * @returns Promise<boolean> 重複している場合true
 */
export async function checkSKUExists(sku: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('inventory_master')
    .select('id')
    .eq('sku', sku)
    .limit(1)
  
  if (error) {
    console.error('SKU重複チェックエラー:', error)
    return false
  }
  
  return data && data.length > 0
}
