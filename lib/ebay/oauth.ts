// lib/ebay/oauth.ts
/**
 * eBay OAuth 2.0 Token管理
 * User Token方式（18ヶ月有効）
 */

interface EbayAccount {
  userToken: string
}

const EBAY_ACCOUNTS: Record<string, EbayAccount> = {
  account1: {
    userToken: process.env.EBAY_AUTH_TOKEN || process.env.EBAY_USER_ACCESS_TOKEN || ''
  },
  account2: {
    userToken: process.env.EBAY_USER_TOKEN_GREEN || process.env.EBAY_AUTH_TOKEN || ''
  }
}

/**
 * アクセストークン取得（User Token使用）
 */
export async function getAccessToken(account: 'account1' | 'account2'): Promise<string> {
  const accountConfig = EBAY_ACCOUNTS[account]
  
  if (!accountConfig.userToken) {
    throw new Error(`eBay ${account} のUser Tokenが設定されていません`)
  }
  
  // User Tokenはそのまま返す（18ヶ月有効）
  return accountConfig.userToken
}

/**
 * トークンキャッシュをクリア（互換性のため残す）
 */
export function clearTokenCache() {
  // User Token方式ではキャッシュ不要
}
