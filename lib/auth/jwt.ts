/**
 * JWT・セッション管理ユーティリティ
 */

/**
 * Cookie からセッショントークンを取得
 */
export function getSessionTokenFromCookie(): string | null {
  if (typeof window === 'undefined') return null
  
  const cookies = document.cookie.split('; ')
  for (const cookie of cookies) {
    if (cookie.startsWith('supabase-auth-token=')) {
      return cookie.substring('supabase-auth-token='.length)
    }
  }
  return null
}

/**
 * サーバーサイドでリクエストヘッダーから認証トークンを取得
 */
export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization')
  if (!auth) return null
  
  const [scheme, token] = auth.split(' ')
  if (scheme !== 'Bearer') return null
  
  return token
}

/**
 * トークンが有効か簡易チェック
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false
  
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    // JWT の有効期限をチェック
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    const expiresAt = payload.exp * 1000
    
    return Date.now() < expiresAt
  } catch (error) {
    return false
  }
}

/**
 * JWT ペイロードをデコード
 */
export function decodeToken(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString()
    )
    
    return payload
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * ユーザー ID をトークンから抽出
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeToken(token)
  return payload?.sub || null
}
