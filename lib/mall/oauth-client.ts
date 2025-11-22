/**
 * I3-5: OAuthトークン自動リフレッシュ
 *
 * すべてのモールAPIクライアントに対し、トークン失効時の
 * 自動リフレッシュ機能を実装
 */

import { createClient } from '@/lib/supabase/client'

interface OAuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  marketplace: string
}

interface TokenRefreshResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  error?: string
}

/**
 * トークンの有効性をチェック
 */
export async function isTokenValid(marketplace: string): Promise<boolean> {
  const token = await getToken(marketplace)

  if (!token) {
    return false
  }

  // 有効期限の5分前にfalseを返す（余裕を持たせる）
  const expiresAt = new Date(token.expiresAt)
  const now = new Date()
  const bufferTime = 5 * 60 * 1000 // 5分

  return expiresAt.getTime() > now.getTime() + bufferTime
}

/**
 * トークンを取得
 */
export async function getToken(marketplace: string): Promise<OAuthToken | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('marketplace', marketplace)
    .single()

  if (error || !data) {
    return null
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at),
    marketplace: data.marketplace,
  }
}

/**
 * トークンを保存
 */
export async function saveToken(token: OAuthToken): Promise<void> {
  const supabase = createClient()

  await supabase.from('oauth_tokens').upsert({
    marketplace: token.marketplace,
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expires_at: token.expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  })
}

/**
 * トークンをリフレッシュ
 */
export async function refreshToken(marketplace: string): Promise<TokenRefreshResult> {
  console.log(`[OAuthClient] トークンリフレッシュ開始: ${marketplace}`)

  const currentToken = await getToken(marketplace)

  if (!currentToken) {
    return {
      success: false,
      error: 'トークンが見つかりません',
    }
  }

  try {
    const refreshResult = await refreshTokenByMarketplace(marketplace, currentToken.refreshToken)

    if (!refreshResult.success) {
      return refreshResult
    }

    // 新しいトークンを保存
    const newToken: OAuthToken = {
      accessToken: refreshResult.accessToken!,
      refreshToken: refreshResult.refreshToken || currentToken.refreshToken,
      expiresAt: refreshResult.expiresAt!,
      marketplace,
    }

    await saveToken(newToken)

    console.log(`[OAuthClient] トークンリフレッシュ成功: ${marketplace}`)

    return refreshResult
  } catch (error) {
    console.error(`[OAuthClient] トークンリフレッシュエラー: ${marketplace}`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }
}

/**
 * モール別トークンリフレッシュ
 */
async function refreshTokenByMarketplace(
  marketplace: string,
  refreshToken: string
): Promise<TokenRefreshResult> {
  switch (marketplace) {
    case 'Etsy':
      return refreshEtsyToken(refreshToken)
    case 'eBay':
      return refreshEbayToken(refreshToken)
    case 'Shopee':
      return refreshShopeeToken(refreshToken)
    case 'Catawiki':
      return refreshCatawikiToken(refreshToken)
    case 'Bonanza':
      return refreshBonanzaToken(refreshToken)
    default:
      return {
        success: false,
        error: `未対応のマーケットプレイス: ${marketplace}`,
      }
  }
}

/**
 * Etsyトークンリフレッシュ
 */
async function refreshEtsyToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = process.env.ETSY_CLIENT_ID
  const clientSecret = process.env.ETSY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: 'Etsy APIの認証情報が設定されていません',
    }
  }

  try {
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error(`Etsy APIエラー: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }
}

/**
 * eBayトークンリフレッシュ
 */
async function refreshEbayToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = process.env.EBAY_CLIENT_ID
  const clientSecret = process.env.EBAY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: 'eBay APIの認証情報が設定されていません',
    }
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error(`eBay APIエラー: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: refreshToken, // eBayはリフレッシュトークンを更新しない
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }
}

/**
 * Shopeeトークンリフレッシュ
 */
async function refreshShopeeToken(refreshToken: string): Promise<TokenRefreshResult> {
  // Shopee API実装（モック）
  return {
    success: false,
    error: 'Shopee API実装が必要です',
  }
}

/**
 * Catawikiトークンリフレッシュ
 */
async function refreshCatawikiToken(refreshToken: string): Promise<TokenRefreshResult> {
  // Catawiki API実装（モック）
  return {
    success: false,
    error: 'Catawiki API実装が必要です',
  }
}

/**
 * Bonanzaトークンリフレッシュ
 */
async function refreshBonanzaToken(refreshToken: string): Promise<TokenRefreshResult> {
  // Bonanza API実装（モック）
  return {
    success: false,
    error: 'Bonanza API実装が必要です',
  }
}

/**
 * 有効なアクセストークンを取得（必要に応じて自動リフレッシュ）
 */
export async function getValidAccessToken(marketplace: string): Promise<string | null> {
  const isValid = await isTokenValid(marketplace)

  if (!isValid) {
    console.log(`[OAuthClient] トークンが無効です。リフレッシュを試みます: ${marketplace}`)
    const refreshResult = await refreshToken(marketplace)

    if (!refreshResult.success) {
      console.error(`[OAuthClient] トークンリフレッシュ失敗: ${marketplace}`)
      return null
    }

    return refreshResult.accessToken!
  }

  const token = await getToken(marketplace)
  return token?.accessToken || null
}

export default {
  isTokenValid,
  getToken,
  saveToken,
  refreshToken,
  getValidAccessToken,
}
