/**
 * Shopee API クライアント
 * OAuth認証、トークンリフレッシュ、在庫・価格更新
 */

import { supabase } from '@/lib/supabase'

interface ShopeeConfig {
  partner_id: number
  partner_key: string
  shop_id: number
  access_token: string
  refresh_token: string
  expires_at: number
}

/**
 * Shopee設定を取得
 */
async function getShopeeConfig(): Promise<ShopeeConfig | null> {
  const { data, error } = await supabase
    .from('marketplace_credentials')
    .select('*')
    .eq('marketplace', 'shopee')
    .single()

  if (error || !data) {
    console.error('[Shopee] 設定取得エラー:', error)
    return null
  }

  return {
    partner_id: data.partner_id,
    partner_key: data.partner_key,
    shop_id: data.shop_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  }
}

/**
 * アクセストークンをリフレッシュ（I3-5）
 */
async function refreshAccessToken(config: ShopeeConfig): Promise<string | null> {
  try {
    console.log('[Shopee] アクセストークンリフレッシュ中')

    // Shopee Open API のリフレッシュエンドポイントを呼び出し
    // TODO: 実際のShopee API呼び出しを実装
    // const response = await fetch('https://partner.shopeemobile.com/api/v2/auth/access_token/get', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     partner_id: config.partner_id,
    //     refresh_token: config.refresh_token,
    //   })
    // })

    // 仮の新しいトークン
    const newAccessToken = 'refreshed_' + config.access_token
    const newExpiresAt = Date.now() + 3600 * 1000 // 1時間後

    // DBに保存
    await supabase
      .from('marketplace_credentials')
      .update({
        access_token: newAccessToken,
        expires_at: newExpiresAt,
      })
      .eq('marketplace', 'shopee')

    console.log('[Shopee] アクセストークンリフレッシュ完了')

    return newAccessToken
  } catch (error) {
    console.error('[Shopee] トークンリフレッシュエラー:', error)
    return null
  }
}

/**
 * 有効なアクセストークンを取得（自動リフレッシュ付き）
 */
async function getValidAccessToken(): Promise<string | null> {
  const config = await getShopeeConfig()
  if (!config) return null

  // トークンの有効期限をチェック
  const now = Date.now()
  if (config.expires_at < now + 5 * 60 * 1000) {
    // 5分以内に期限切れ - リフレッシュ
    return await refreshAccessToken(config)
  }

  return config.access_token
}

/**
 * 在庫を更新（I3-1）
 */
export async function updateShopeeStock(
  item_id: number,
  model_id: number,
  stock: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return { success: false, error: 'アクセストークンが取得できませんでした' }
    }

    console.log(`[Shopee] 在庫更新: item=${item_id}, model=${model_id}, stock=${stock}`)

    // Shopee Product API - Update Stock
    // TODO: 実際のShopee API呼び出しを実装
    // const response = await fetch('https://partner.shopeemobile.com/api/v2/product/update_stock', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${accessToken}` },
    //   body: JSON.stringify({
    //     item_id,
    //     stock_list: [{ model_id, normal_stock: stock }]
    //   })
    // })

    // 仮の成功レスポンス
    return { success: true }
  } catch (error: any) {
    console.error('[Shopee] 在庫更新エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 価格を更新（I3-1）
 */
export async function updateShopeePrice(
  item_id: number,
  model_id: number,
  price: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return { success: false, error: 'アクセストークンが取得できませんでした' }
    }

    console.log(`[Shopee] 価格更新: item=${item_id}, model=${model_id}, price=${price}`)

    // Shopee Product API - Update Price
    // TODO: 実際のShopee API呼び出しを実装

    // 仮の成功レスポンス
    return { success: true }
  } catch (error: any) {
    console.error('[Shopee] 価格更新エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 出品を停止（I3-1）
 */
export async function delistShopeeItem(item_id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return { success: false, error: 'アクセストークンが取得できませんでした' }
    }

    console.log(`[Shopee] 出品停止: item=${item_id}`)

    // Shopee Product API - Unlist Item
    // TODO: 実際のShopee API呼び出しを実装

    // 仮の成功レスポンス
    return { success: true }
  } catch (error: any) {
    console.error('[Shopee] 出品停止エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * メッセージを取得
 */
export async function getShopeeMessages(limit: number = 50): Promise<any[]> {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return []
    }

    console.log(`[Shopee] メッセージ取得: limit=${limit}`)

    // Shopee Public API - Get Message List
    // TODO: 実際のShopee API呼び出しを実装

    // 仮の空配列
    return []
  } catch (error) {
    console.error('[Shopee] メッセージ取得エラー:', error)
    return []
  }
}
