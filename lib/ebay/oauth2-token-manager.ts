/**
 * eBay API - OAuth2 トークン管理システム
 * 
 * 機能:
 * - Refresh Token から User Access Token を自動生成
 * - トークンのキャッシュと有効期限管理
 * - 自動リフレッシュ機構
 * - エラーハンドリングと リトライロジック
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

/**
 * eBay OAuth2 トークンマネージャー
 */
class EbayTokenManager {
  private clientId: string
  private clientSecret: string
  private refreshToken: string
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0
  private tokenCacheFile: string
  private environment: string

  constructor() {
    this.clientId = process.env.EBAY_CLIENT_ID || ''
    this.clientSecret = process.env.EBAY_CLIENT_SECRET || ''
    this.refreshToken = process.env.EBAY_REFRESH_TOKEN || ''
    this.environment = process.env.EBAY_ENVIRONMENT || 'production'
    
    // トークンキャッシュファイルのパス
    this.tokenCacheFile = path.join(__dirname, '.ebay_token_cache.json')

    console.log('🔧 eBay OAuth2 トークンマネージャーを初期化')
    console.log(`   環境: ${this.environment}`)
    console.log(`   Client ID: ${this.clientId.substring(0, 20)}...`)
    console.log(`   Refresh Token: ${this.refreshToken.substring(0, 30)}...`)

    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error(
        'eBay OAuth2 認証情報が不完全です。\n' +
        '必要な環境変数:\n' +
        '  - EBAY_CLIENT_ID\n' +
        '  - EBAY_CLIENT_SECRET\n' +
        '  - EBAY_REFRESH_TOKEN'
      )
    }

    this.loadCachedToken()
  }

  /**
   * キャッシュされたトークンを読み込み
   */
  private loadCachedToken(): void {
    try {
      if (fs.existsSync(this.tokenCacheFile)) {
        const cached = JSON.parse(fs.readFileSync(this.tokenCacheFile, 'utf-8'))
        this.accessToken = cached.token
        this.tokenExpiresAt = cached.expiresAt
        console.log('🔄 キャッシュされたトークンを読み込みました')
      }
    } catch (error) {
      console.warn('⚠️  トークンキャッシュの読み込みに失敗')
    }
  }

  /**
   * トークンをファイルにキャッシュ
   */
  private cacheToken(token: string, expiresIn: number): void {
    try {
      const expiresAt = Date.now() + expiresIn * 1000
      fs.writeFileSync(
        this.tokenCacheFile,
        JSON.stringify({ token, expiresAt }, null, 2),
        'utf-8'
      )
      console.log('💾 トークンをキャッシュに保存しました')
    } catch (error) {
      console.error('❌ トークンキャッシュ保存エラー:', error)
    }
  }

  /**
   * トークンが有効か確認
   */
  private isTokenValid(): boolean {
    if (!this.accessToken) return false
    // 有効期限から5分前にリフレッシュ
    const isValid = this.tokenExpiresAt > Date.now() + 5 * 60 * 1000
    if (isValid) {
      const timeLeft = Math.floor((this.tokenExpiresAt - Date.now()) / 1000)
      console.log(`✅ キャッシュトークンは有効です (残り: ${Math.floor(timeLeft / 60)}分)`)
    }
    return isValid
  }

  /**
   * Refresh Token から新しい Access Token を取得
   */
  async getAccessToken(): Promise<string> {
    // キャッシュされた有効なトークンがあればそれを使用
    if (this.isTokenValid() && this.accessToken) {
      return this.accessToken
    }

    console.log('🔄 新しいアクセストークンを取得中...')
    return await this.refreshAccessToken()
  }

  /**
   * Refresh Token を使用して Access Token をリフレッシュ
   */
  private async refreshAccessToken(): Promise<string> {
    const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token'

    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('refresh_token', this.refreshToken)
    params.append('scope', 'https://api.ebay.com/oauth/api_scope')

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

    console.log(`📨 トークンリクエストを送信: POST ${tokenUrl}`)

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      })

      console.log(`   レスポンスステータス: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`❌ トークン取得エラー (${response.status}):`)
        console.error(errorData)
        throw new Error(`Token refresh failed (${response.status}): ${errorData}`)
      }

      const data = await response.json() as {
        access_token: string
        expires_in: number
        token_type: string
        refresh_token?: string
      }

      this.accessToken = data.access_token
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000

      // キャッシュに保存
      this.cacheToken(data.access_token, data.expires_in)

      console.log(`✅ アクセストークン取得成功`)
      console.log(`   有効期限: ${data.expires_in}秒 (${Math.floor(data.expires_in / 3600)}時間)`)
      console.log(`   トークンプレビュー: ${data.access_token.substring(0, 30)}...`)

      return this.accessToken

    } catch (error: any) {
      console.error('❌ トークンリフレッシュ失敗:', error.message)
      throw new Error(`Failed to refresh token: ${error.message}`)
    }
  }

  /**
   * トークン情報を表示
   */
  displayTokenInfo(): void {
    if (this.accessToken) {
      const timeLeft = Math.max(0, Math.floor((this.tokenExpiresAt - Date.now()) / 1000))
      const hours = Math.floor(timeLeft / 3600)
      const minutes = Math.floor((timeLeft % 3600) / 60)
      const seconds = timeLeft % 60
      console.log(`📊 トークン情報:`)
      console.log(`   アクセストークン: ${this.accessToken.substring(0, 30)}...`)
      console.log(`   残り有効時間: ${hours}h ${minutes}m ${seconds}s`)
    } else {
      console.log('❌ トークンが取得されていません')
    }
  }
}

/**
 * eBay API 呼び出し（トークン自動管理版）
 */
export class EbayApiClient {
  private tokenManager: EbayTokenManager
  private environment: string

  constructor() {
    this.tokenManager = new EbayTokenManager()
    this.environment = process.env.EBAY_ENVIRONMENT || 'production'
  }

  /**
   * eBay API を呼び出し（トークンを自動リフレッシュ）
   */
  async callApi(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    retryCount = 0
  ): Promise<any> {
    const accessToken = await this.tokenManager.getAccessToken()
    
    const url = `https://api.ebay.com${endpoint}`
    console.log(`\n📤 eBay API 呼び出し: ${method} ${endpoint}`)

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-EBAY-API-ENV-ID': this.environment === 'production' ? 'PRODUCTION' : 'SANDBOX'
      }
    }

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, options)
      console.log(`   ステータス: ${response.status}`)

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ エラー: ${error}`)
        
        // 401 の場合はトークンをクリアして再試行（1回のみ）
        if (response.status === 401 && retryCount === 0) {
          console.log('⚠️  トークンが無効な可能性があります。キャッシュをクリアして再試行します...')
          // キャッシュファイルを削除
          try {
            const cacheFile = require('path').join(__dirname, '.ebay_token_cache.json')
            if (require('fs').existsSync(cacheFile)) {
              require('fs').unlinkSync(cacheFile)
              console.log('🗑️  トークンキャッシュを削除しました')
            }
          } catch (e) {
            // ファイルが存在しない場合は無視
          }
          // 再度トークン取得を試みる
          return await this.callApi(endpoint, method, body, retryCount + 1)
        }
        
        throw new Error(`API エラー (${response.status}): ${error}`)
      }

      const data = await response.json()
      console.log(`✅ リクエスト成功`)
      return data

    } catch (error: any) {
      console.error(`❌ リクエスト失敗: ${error.message}`)
      throw error
    }
  }

  /**
   * トークン情報を表示
   */
  displayTokenInfo(): void {
    this.tokenManager.displayTokenInfo()
  }
}

/**
 * eBay インベントリ取得（改善版）
 */
export async function getEbayInventory(limit = 10): Promise<any> {
  const client = new EbayApiClient()
  
  console.log('\n' + '='.repeat(60))
  console.log('📦 eBay インベントリ取得')
  console.log('='.repeat(60))
  
  try {
    const result = await client.callApi(
      `/sell/inventory/v1/inventory_item?limit=${limit}`
    )
    
    console.log(`\n✅ ${result.inventoryItems?.length || 0} 件の商品を取得`)
    return result

  } catch (error: any) {
    console.error('\n❌ インベントリ取得失敗:', error.message)
    throw error
  }
}

/**
 * eBay 出品作成（改善版）
 */
export async function createEbayListing(listing: {
  title: string
  description: string
  price: number
  quantity: number
  categoryId?: string
  condition?: 'USED' | 'NEW' | 'REFURBISHED'
}): Promise<any> {
  const client = new EbayApiClient()
  
  console.log('\n' + '='.repeat(60))
  console.log('🚀 eBay 出品作成')
  console.log('='.repeat(60))
  console.log(`📝 商品: ${listing.title}`)
  console.log(`💰 価格: $${listing.price}`)
  console.log(`📦 数量: ${listing.quantity}`)

  try {
    const sku = `SKU-${Date.now()}`
    
    console.log('\n1️⃣  Inventory Item を作成中...')
    const inventoryItem = {
      availability: {
        quantities: {
          availableQuantity: listing.quantity
        }
      },
      condition: listing.condition || 'USED',
      product: {
        title: listing.title,
        description: listing.description
      }
    }

    await client.callApi(
      `/sell/inventory/v1/inventory_item/${sku}`,
      'PUT',
      inventoryItem
    )
    console.log('✅ Inventory Item 作成完了')

    console.log('\n2️⃣  Offer を作成中...')
    const offer = {
      listingFormat: 'FIXED_PRICE',
      pricingSummary: {
        price: {
          currency: 'USD',
          value: listing.price.toString()
        }
      },
      quantityLimitPerBuyer: 5,
      listingDuration: 'GTC'
    }

    const offerResult = await client.callApi(
      '/sell/inventory/v1/offer',
      'POST',
      offer
    )
    const offerId = offerResult.offerId
    console.log(`✅ Offer 作成完了: ${offerId}`)

    console.log('\n3️⃣  Listing を公開中...')
    const publishResult = await client.callApi(
      `/sell/inventory/v1/offer/${offerId}/publish`,
      'POST'
    )
    console.log('✅ Listing 公開完了')

    console.log('\n🎉 出品成功！')
    return {
      success: true,
      sku,
      offerId,
      listingId: publishResult.listingId,
      url: `https://www.ebay.com/itm/${publishResult.listingId}`
    }

  } catch (error: any) {
    console.error('\n❌ 出品失敗:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// テスト実行
if (require.main === module) {
  (async () => {
    try {
      console.log('='.repeat(60))
      console.log('🔐 eBay OAuth2 トークン管理テスト')
      console.log('='.repeat(60))

      const client = new EbayApiClient()
      client.displayTokenInfo()

      console.log('\n' + '='.repeat(60))
      console.log('テスト 1: インベントリ取得')
      console.log('='.repeat(60))
      await getEbayInventory(5)

      console.log('\n' + '='.repeat(60))
      console.log('✅ 全テスト完了')
      console.log('='.repeat(60))

    } catch (error) {
      console.error('\n❌ テスト失敗:', error)
      process.exit(1)
    }
  })()
}
