/**
 * Etsy OAuth Client（自動リフレッシュ対応）
 */

interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export class EtsyOAuthClient {
  private apiKey: string
  private tokens: OAuthTokens | null = null

  constructor(apiKey: string) {
    this.apiKey = apiKey
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
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.apiKey,
        refresh_token: this.tokens!.refresh_token,
      }),
    })

    const data = await response.json()

    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.tokens!.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    }

    console.log('✅ Etsy OAuth token refreshed')
  }
}
