/**
 * eBay OAuth 2.0 トークン管理
 * Refresh Tokenからアクセストークンを自動取得
 */

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

// メモリキャッシュ（サーバー起動中のみ有効）
let cachedAccessToken: string | null = null
let tokenExpiresAt: number | null = null

/**
 * eBay OAuth認証情報を取得
 */
function getOAuthCredentials() {
  const clientId = process.env.EBAY_CLIENT_ID || process.env.EBAY_APP_ID
  const clientSecret = process.env.EBAY_CLIENT_SECRET
  const refreshToken = process.env.EBAY_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'eBay OAuth credentials not configured. Check .env.local for: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_REFRESH_TOKEN'
    )
  }

  return { clientId, clientSecret, refreshToken }
}

/**
 * Refresh Tokenを使ってアクセストークンを取得
 */
async function fetchAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getOAuthCredentials()

  // 引用符を削除してトークンをクリーンアップ
  const cleanRefreshToken = refreshToken.replace(/^["']|["']$/g, '')

  console.log('eBay OAuth Request:', {
    clientId,
    clientSecret: clientSecret.substring(0, 10) + '...',
    refreshToken: cleanRefreshToken.substring(0, 30) + '...',
  })

  const url = 'https://api.ebay.com/identity/v1/oauth2/token'
  
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: cleanRefreshToken,
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('eBay OAuth Token Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`)
    }

    const data: TokenResponse = await response.json()
    
    // キャッシュに保存（有効期限の90%で更新）
    cachedAccessToken = data.access_token
    tokenExpiresAt = Date.now() + (data.expires_in * 1000 * 0.9)

    console.log('eBay access token refreshed successfully')
    
    return data.access_token
  } catch (error) {
    console.error('Error fetching eBay access token:', error)
    throw error
  }
}

/**
 * 有効なアクセストークンを取得（キャッシュ優先）
 */
export async function getEbayAccessToken(): Promise<string> {
  // キャッシュが有効な場合はそれを返す
  if (cachedAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    console.log('Using cached eBay access token')
    return cachedAccessToken
  }

  // キャッシュが無効または期限切れの場合は新規取得
  console.log('Fetching new eBay access token')
  return await fetchAccessToken()
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearTokenCache() {
  cachedAccessToken = null
  tokenExpiresAt = null
  console.log('eBay token cache cleared')
}
