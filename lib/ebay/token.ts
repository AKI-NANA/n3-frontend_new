/**
 * eBayアクセストークンを自動取得・更新
 */
export async function getAccessToken(account: 'mjt' | 'green'): Promise<{ access_token: string }> {
  const credentials = account === 'mjt' 
    ? {
        clientId: process.env.EBAY_CLIENT_ID_MJT!,
        clientSecret: process.env.EBAY_CLIENT_SECRET_MJT!,
        refreshToken: process.env.EBAY_REFRESH_TOKEN_MJT!
      }
    : {
        clientId: process.env.EBAY_CLIENT_ID_GREEN!,
        clientSecret: process.env.EBAY_CLIENT_SECRET_GREEN!,
        refreshToken: process.env.EBAY_REFRESH_TOKEN_GREEN!
      }

  // デバッグ: 環境変数の確認
  console.log(`🔍 Account: ${account}`)
  console.log(`🔑 Client ID: ${credentials.clientId?.substring(0, 20)}...`)
  console.log(`🔐 Client Secret: ${credentials.clientSecret?.substring(0, 10)}...`)
  console.log(`🔄 Refresh Token: ${credentials.refreshToken?.substring(0, 30)}...`)
  console.log(`📏 Refresh Token length: ${credentials.refreshToken?.length}`)

  // Basic認証用の文字列
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')

  console.log('🔄 Fetching fresh access token...')

  // トークン取得
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken
    })
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('❌ Token fetch failed:', error)
    throw new Error(`Failed to get eBay token: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  console.log(`✅ Got fresh token (length: ${data.access_token?.length})`)
  return { access_token: data.access_token }
}

// 後方互換性のため
export async function getEbayAccessToken(account: 'mjt' | 'green'): Promise<string> {
  const result = await getAccessToken(account)
  return result.access_token
}
