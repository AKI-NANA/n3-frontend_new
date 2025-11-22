/**
 * Mercari API クライアント
 * 在庫・価格更新（Mercariは公式APIが限定的なため、スクレイピング併用）
 */

import { supabase } from '@/lib/supabase'

interface MercariConfig {
  access_token: string
  device_id: string
}

/**
 * Mercari設定を取得
 */
async function getMercariConfig(): Promise<MercariConfig | null> {
  const { data, error } = await supabase
    .from('marketplace_credentials')
    .select('*')
    .eq('marketplace', 'mercari')
    .single()

  if (error || !data) {
    console.error('[Mercari] 設定取得エラー:', error)
    return null
  }

  return {
    access_token: data.access_token,
    device_id: data.device_id,
  }
}

/**
 * 商品を編集（価格・在庫）（I3-1）
 */
export async function updateMercariItem(
  item_id: string,
  updates: {
    price?: number
    status?: 'on_sale' | 'sold_out'
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getMercariConfig()
    if (!config) {
      return { success: false, error: '設定が取得できませんでした' }
    }

    console.log(`[Mercari] 商品更新: item=${item_id}`, updates)

    // Mercari API（非公式）またはスクレイピング
    // TODO: 実際の実装

    return { success: true }
  } catch (error: any) {
    console.error('[Mercari] 商品更新エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 商品を削除（I3-1）
 */
export async function deleteMercariItem(item_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getMercariConfig()
    if (!config) {
      return { success: false, error: '設定が取得できませんでした' }
    }

    console.log(`[Mercari] 商品削除: item=${item_id}`)

    // TODO: 実際の実装

    return { success: true }
  } catch (error: any) {
    console.error('[Mercari] 商品削除エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * メッセージを取得
 */
export async function getMercariMessages(limit: number = 50): Promise<any[]> {
  try {
    const config = await getMercariConfig()
    if (!config) {
      return []
    }

    console.log(`[Mercari] メッセージ取得: limit=${limit}`)

    // TODO: 実際の実装

    return []
  } catch (error) {
    console.error('[Mercari] メッセージ取得エラー:', error)
    return []
  }
}
