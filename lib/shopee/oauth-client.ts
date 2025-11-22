/**
 * Shopee OAuth Client（自動リフレッシュ対応）
 */

interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export class ShopeeOAuthClient {
  private partnerId: string
  private partnerKey: string
  private tokens: OAuthTokens | null = null

  constructor(partnerId: string, partnerKey: string) {
    this.partnerId = partnerId
    this.partnerKey = partnerKey
  }

  async getAccessToken(): Promise<string> {
    if (this.tokens && Date.now() < this.tokens.expires_at - 60000) {
      return this.tokens.access_token
    }

    if (this.tokens?.refresh_token) {
      await this.refreshAccessToken()
      return this.tokens!.access_token
    }

    throw new Error('OAuth tokens not initialized')
  }

  private async refreshAccessToken(): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000)
    const path = '/api/v2/auth/access_token/get'

    const response = await fetch(`https://partner.shopeemobile.com${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partner_id: parseInt(this.partnerId),
        refresh_token: this.tokens!.refresh_token,
        timestamp,
      }),
    })

    const data = await response.json()

    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.tokens!.refresh_token,
      expires_at: Date.now() + data.expire_in * 1000,
    }

    console.log('✅ Shopee OAuth token refreshed')
  }
}
