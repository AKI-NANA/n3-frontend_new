import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Supabaseからトークン情報を取得
 */
async function getTokenFromSupabase(account: 'mjt' | 'green') {
  const { data, error } = await supabase
    .from('ebay_tokens')
    .select('*')
    .eq('account', account)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    throw new Error(`Failed to get token from Supabase for ${account}: ${error.message}`)
  }

  if (!data || !data.refresh_token) {
    throw new Error(`No valid refresh token found in Supabase for ${account}`)
  }

  return {
    clientId: account === 'mjt' 
      ? process.env.EBAY_CLIENT_ID_MJT!
      : process.env.EBAY_CLIENT_ID_GREEN!,
    clientSecret: account === 'mjt'
      ? process.env.EBAY_CLIENT_SECRET_MJT!
      : process.env.EBAY_CLIENT_SECRET_GREEN!,
    refreshToken: data.refresh_token,
    accessToken: data.access_token || null,
    expiresAt: data.expires_at || null
  }
}

/**
 * Supabaseにアクセストークンを保存
 */
async function saveAccessTokenToSupabase(
  account: 'mjt' | 'green',
  accessToken: string,
  expiresIn: number
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const { error } = await supabase
    .from('ebay_tokens')
    .update({
      access_token: accessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('account', account)

  if (error) {
    console.error(`Failed to save access token for ${account}:`, error)
  }
}

/**
 * eBayアクセストークンを自動取得・更新（Supabaseベース）
 */
export async function getAccessToken(account: 'mjt' | 'green'): Promise<{ access_token: string }> {
  console.log(`🔍 Getting token for account: ${account}`)

  // Supabaseからトークン情報取得
  const tokenData = await getTokenFromSupabase(account)

  // 既存のアクセストークンが有効かチェック
  if (tokenData.accessToken && tokenData.expiresAt) {
    const expiresAt = new Date(tokenData.expiresAt)
    const now = new Date()
    const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000 / 60

    // 5分以上有効なら既存のトークンを返す
    if (minutesUntilExpiry > 5) {
      console.log(`✅ Using cached token (expires in ${Math.floor(minutesUntilExpiry)} minutes)`)
      return { access_token: tokenData.accessToken }
    }
  }

  // 新しいアクセストークンを取得
  console.log(`🔄 Fetching fresh access token for ${account}...`)
  console.log(`📏 Refresh Token length: ${tokenData.refreshToken?.length}`)

  const basicAuth = Buffer.from(`${tokenData.clientId}:${tokenData.clientSecret}`).toString('base64')

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refreshToken
    })
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('❌ Token fetch failed:', error)
    throw new Error(`Failed to get eBay token for ${account}: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  console.log(`✅ Got fresh token (length: ${data.access_token?.length})`)

  // Supabaseに保存
  await saveAccessTokenToSupabase(account, data.access_token, data.expires_in)

  return { access_token: data.access_token }
}

/**
 * 後方互換性のため
 */
export async function getEbayAccessToken(account: 'mjt' | 'green'): Promise<string> {
  const result = await getAccessToken(account)
  return result.access_token
}
