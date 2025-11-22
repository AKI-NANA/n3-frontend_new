/**
 * eBay API クライアント
 * OAuth認証、トークンリフレッシュ、在庫・価格更新
 */

import { supabase } from '@/lib/supabase'

interface EbayConfig {
  client_id: string
  client_secret: string
  access_token: string
  refresh_token: string
  expires_at: number
}

/**
 * eBay設定を取得
 */
async function getEbayConfig(): Promise<EbayConfig | null> {
  const { data, error } = await supabase
    .from('marketplace_credentials')
    .select('*')
    .eq('marketplace', 'ebay')
    .single()

  if (error || !data) {
    console.error('[eBay] 設定取得エラー:', error)
    return null
  }

  return {
    client_id: data.client_id,
    client_secret: data.client_secret,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  }
}

/**
 * アクセストークンをリフレッシュ（I3-5）
 */
async function refreshAccessToken(config: EbayConfig): Promise<string | null> {
  try {
    console.log('[eBay] アクセストークンリフレッシュ中')

    const credentials = Buffer.from(`${config.client_id}:${config.client_secret}`).toString('base64')

    // eBay OAuth Token Endpoint
    // TODO: 実際のeBay API呼び出しを実装
    // const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //     'Authorization': `Basic ${credentials}`
    //   },
    //   body: new URLSearchParams({
    //     grant_type: 'refresh_token',
    //     refresh_token: config.refresh_token
    //   })
    // })

    // 仮の新しいトークン
    const newAccessToken = 'refreshed_' + config.access_token
    const newExpiresAt = Date.now() + 7200 * 1000 // 2時間後

    // DBに保存
    await supabase
      .from('marketplace_credentials')
      .update({
        access_token: newAccessToken,
        expires_at: newExpiresAt,
      })
      .eq('marketplace', 'ebay')

    console.log('[eBay] アクセストークンリフレッシュ完了')

    return newAccessToken
  } catch (error) {
    console.error('[eBay] トークンリフレッシュエラー:', error)
    return null
  }
}

/**
 * 有効なアクセストークンを取得
 */
async function getValidAccessToken(): Promise<string | null> {
  const config = await getEbayConfig()
  if (!config) return null

  const now = Date.now()
  if (config.expires_at < now + 5 * 60 * 1000) {
    return await refreshAccessToken(config)
  }

  return config.access_token
}

/**
 * 在庫を更新（I3-1）
 */
export async function updateEbayStock(
  listing_id: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return { success: false, error: 'アクセストークンが取得できませんでした' }
    }

    console.log(`[eBay] 在庫更新: listing=${listing_id}, quantity=${quantity}`)

    // eBay Inventory API - Update Inventory
    // TODO: 実際のeBay API呼び出しを実装
    // const response = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item/${listing_id}`, {
    //   method: 'PUT',
    //   headers: {
    //     'Authorization': `Bearer ${accessToken}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     availability: {
    //       shipToLocationAvailability: {
    //         quantity
    //       }
    //     }
    //   })
    // })

    return { success: true }
  } catch (error: any) {
    console.error('[eBay] 在庫更新エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 価格を更新（I3-1）
 */
export async function updateEbayPrice(
  listing_id: string,
  price: number,
  currency: string = 'USD'
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return { success: false, error: 'アクセストークンが取得できませんでした' }
    }

    console.log(`[eBay] 価格更新: listing=${listing_id}, price=${price} ${currency}`)

    // eBay Trading API - ReviseInventoryStatus
    // TODO: 実際のeBay API呼び出しを実装

    return { success: true }
  } catch (error: any) {
    console.error('[eBay] 価格更新エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 出品を終了（I3-1）
 */
export async function endEbayListing(listing_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return { success: false, error: 'アクセストークンが取得できませんでした' }
    }

    console.log(`[eBay] 出品終了: listing=${listing_id}`)

    // eBay Trading API - EndItem
    // TODO: 実際のeBay API呼び出しを実装

    return { success: true }
  } catch (error: any) {
    console.error('[eBay] 出品終了エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * メッセージを取得
 */
export async function getEbayMessages(limit: number = 50): Promise<any[]> {
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return []
    }

    console.log(`[eBay] メッセージ取得: limit=${limit}`)

    // eBay Trading API - GetMemberMessages
    // TODO: 実際のeBay API呼び出しを実装

    return []
  } catch (error) {
    console.error('[eBay] メッセージ取得エラー:', error)
    return []
  }
}
