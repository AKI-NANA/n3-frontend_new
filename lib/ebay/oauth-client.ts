/**
 * eBay OAuth Client（自動リフレッシュ対応）
 */

interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp
}

export class EbayOAuthClient {
  private clientId: string
  private clientSecret: string
  private tokens: OAuthTokens | null = null

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  async getAccessToken(): Promise<string> {
    // トークンが期限切れかチェック
    if (this.tokens && Date.now() < this.tokens.expires_at - 60000) {
      return this.tokens.access_token
    }

    // リフレッシュトークンで更新
    if (this.tokens?.refresh_token) {
      await this.refreshAccessToken()
      return this.tokens!.access_token
    }

    throw new Error('OAuth tokens not initialized')
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokens!.refresh_token,
      }),
    })

    const data = await response.json()

    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.tokens!.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    }

    console.log('✅ eBay OAuth token refreshed')
  }
}
