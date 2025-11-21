/**
 * Amazon Selling Partner API (SP-API) Client
 *
 * Purpose: FBA納品、在庫管理、注文処理の自動化
 *
 * 参考: https://developer-docs.amazon.com/sp-api/
 */

import crypto from 'crypto'

interface SPAPIConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  marketplaceId: string
}

interface SPAPICredentials {
  accessToken: string
  expiresAt: number
}

export class AmazonSPAPIClient {
  private config: SPAPIConfig
  private credentials: SPAPICredentials | null = null
  private endpoint: string

  constructor(marketplace: 'US' | 'JP' | 'UK' | 'DE' | 'FR' | 'IT' | 'ES' | 'CA' = 'US') {
    const marketplaceConfigs = {
      US: {
        region: 'us-east-1',
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        marketplaceId: 'ATVPDKIKX0DER'
      },
      CA: {
        region: 'us-east-1',
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        marketplaceId: 'A2EUQ1WTGCTBG2'
      },
      MX: {
        region: 'us-east-1',
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        marketplaceId: 'A1AM78C64UM0Y8'
      },
      UK: {
        region: 'eu-west-1',
        endpoint: 'https://sellingpartnerapi-eu.amazon.com',
        marketplaceId: 'A1F83G8C2ARO7P'
      },
      DE: {
        region: 'eu-west-1',
        endpoint: 'https://sellingpartnerapi-eu.amazon.com',
        marketplaceId: 'A1PA6795UKMFR9'
      },
      FR: {
        region: 'eu-west-1',
        endpoint: 'https://sellingpartnerapi-eu.amazon.com',
        marketplaceId: 'A13V1IB3VIYZZH'
      },
      IT: {
        region: 'eu-west-1',
        endpoint: 'https://sellingpartnerapi-eu.amazon.com',
        marketplaceId: 'APJ6JRA9NG5V4'
      },
      ES: {
        region: 'eu-west-1',
        endpoint: 'https://sellingpartnerapi-eu.amazon.com',
        marketplaceId: 'A1RKKUPIHCS9HS'
      },
      JP: {
        region: 'us-west-2',
        endpoint: 'https://sellingpartnerapi-fe.amazon.com',
        marketplaceId: 'A1VC38T7YXB528'
      }
    }

    const config = marketplaceConfigs[marketplace]

    this.config = {
      clientId: process.env.AMAZON_SP_CLIENT_ID || '',
      clientSecret: process.env.AMAZON_SP_CLIENT_SECRET || '',
      refreshToken: process.env.AMAZON_SP_REFRESH_TOKEN || '',
      accessKeyId: process.env.AMAZON_SP_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AMAZON_SP_SECRET_ACCESS_KEY || '',
      region: config.region,
      marketplaceId: config.marketplaceId
    }

    this.endpoint = config.endpoint

    if (!this.config.clientId || !this.config.clientSecret) {
      console.warn('Amazon SP-API credentials are not set in environment variables')
    }
  }

  /**
   * アクセストークン取得・リフレッシュ
   */
  private async getAccessToken(): Promise<string> {
    // キャッシュされたトークンが有効な場合はそれを返す
    if (this.credentials && this.credentials.expiresAt > Date.now()) {
      return this.credentials.accessToken
    }

    // LWA (Login with Amazon) トークンエンドポイント
    const tokenEndpoint = 'https://api.amazon.com/auth/o2/token'

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.config.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    })

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh access token: ${error}`)
    }

    const data = await response.json()

    this.credentials = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000 // 60秒前に期限切れとみなす
    }

    return this.credentials.accessToken
  }

  /**
   * AWS Signature Version 4署名生成
   */
  private async signRequest(
    method: string,
    path: string,
    queryParams: Record<string, string> = {},
    body: string = ''
  ): Promise<Record<string, string>> {
    const accessToken = await this.getAccessToken()
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
    const date = timestamp.substring(0, 8)

    const host = this.endpoint.replace('https://', '')
    const service = 'execute-api'

    // Canonical request
    const canonicalUri = path
    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&')

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex')

    const canonicalHeaders = [
      `host:${host}`,
      `x-amz-access-token:${accessToken}`,
      `x-amz-date:${timestamp}`
    ].join('\n') + '\n'

    const signedHeaders = 'host;x-amz-access-token;x-amz-date'

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n')

    // String to sign
    const credentialScope = `${date}/${this.config.region}/${service}/aws4_request`
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex')

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      canonicalRequestHash
    ].join('\n')

    // Signing key
    const kDate = crypto.createHmac('sha256', `AWS4${this.config.secretAccessKey}`).update(date).digest()
    const kRegion = crypto.createHmac('sha256', kDate).update(this.config.region).digest()
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest()
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()

    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

    // Authorization header
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    return {
      'Authorization': authorizationHeader,
      'x-amz-access-token': accessToken,
      'x-amz-date': timestamp,
      'Content-Type': 'application/json'
    }
  }

  /**
   * SP-API リクエスト実行
   */
  private async request(
    method: string,
    path: string,
    queryParams: Record<string, string> = {},
    body?: any
  ): Promise<any> {
    const bodyString = body ? JSON.stringify(body) : ''
    const headers = await this.signRequest(method, path, queryParams, bodyString)

    const queryString = Object.keys(queryParams).length > 0
      ? '?' + Object.keys(queryParams)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
          .join('&')
      : ''

    const url = `${this.endpoint}${path}${queryString}`

    const response = await fetch(url, {
      method,
      headers,
      body: bodyString || undefined
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SP-API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // ============================================================
  // FBA Inbound API (Fulfillment Inbound)
  // ============================================================

  /**
   * FBA納品プラン作成
   */
  async createInboundShipmentPlan(items: Array<{
    sellerSKU: string
    quantity: number
    asin: string
  }>, shipFromAddress: {
    name: string
    addressLine1: string
    city: string
    stateOrProvinceCode: string
    postalCode: string
    countryCode: string
  }) {
    return this.request('POST', '/fba/inbound/v0/plans', {}, {
      ShipFromAddress: {
        Name: shipFromAddress.name,
        AddressLine1: shipFromAddress.addressLine1,
        City: shipFromAddress.city,
        StateOrProvinceCode: shipFromAddress.stateOrProvinceCode,
        PostalCode: shipFromAddress.postalCode,
        CountryCode: shipFromAddress.countryCode
      },
      LabelPrepPreference: 'SELLER_LABEL',
      ShipToCountryCode: shipFromAddress.countryCode.substring(0, 2),
      InboundShipmentPlanRequestItems: items.map(item => ({
        SellerSKU: item.sellerSKU,
        ASIN: item.asin,
        Condition: 'NewItem',
        Quantity: item.quantity,
        QuantityInCase: 0,
        PrepDetailsList: []
      }))
    })
  }

  /**
   * 納品プラン確認
   */
  async createInboundShipment(shipmentId: string, shipmentName: string, destinationFulfillmentCenterId: string, items: Array<{
    sellerSKU: string
    quantity: number
  }>, shipFromAddress: any) {
    return this.request('POST', `/fba/inbound/v0/shipments/${shipmentId}`, {}, {
      InboundShipmentHeader: {
        ShipmentName: shipmentName,
        ShipFromAddress: shipFromAddress,
        DestinationFulfillmentCenterId: destinationFulfillmentCenterId,
        LabelPrepPreference: 'SELLER_LABEL',
        IntendedBoxContentsSource: 'NONE',
        ShipmentStatus: 'WORKING'
      },
      InboundShipmentItems: items.map(item => ({
        SellerSKU: item.sellerSKU,
        QuantityShipped: item.quantity,
        PrepDetailsList: []
      }))
    })
  }

  /**
   * FBA納品ラベル取得
   */
  async getShipmentLabels(shipmentId: string, pageType: 'PackageLabel_Letter_2' | 'PackageLabel_Letter_4' | 'PackageLabel_Letter_6' = 'PackageLabel_Letter_2') {
    return this.request('GET', `/fba/inbound/v0/shipments/${shipmentId}/labels`, {
      PageType: pageType,
      LabelType: 'BARCODE_2D',
      NumberOfPackages: '1'
    })
  }

  // ============================================================
  // Catalog API (商品カタログ)
  // ============================================================

  /**
   * カタログアイテム検索
   */
  async searchCatalogItems(keywords: string) {
    return this.request('GET', '/catalog/2022-04-01/items', {
      keywords,
      marketplaceIds: this.config.marketplaceId,
      includedData: 'attributes,identifiers,images,productTypes,salesRanks,summaries'
    })
  }

  /**
   * カタログアイテム取得（ASIN指定）
   */
  async getCatalogItem(asin: string) {
    return this.request('GET', `/catalog/2022-04-01/items/${asin}`, {
      marketplaceIds: this.config.marketplaceId,
      includedData: 'attributes,identifiers,images,productTypes,salesRanks,summaries'
    })
  }

  // ============================================================
  // Listings API (出品管理)
  // ============================================================

  /**
   * 出品情報取得
   */
  async getListingsItem(sellerSKU: string) {
    return this.request('GET', `/listings/2021-08-01/items/${process.env.AMAZON_SELLER_ID}/${sellerSKU}`, {
      marketplaceIds: this.config.marketplaceId,
      includedData: 'summaries,attributes,issues,offers,fulfillmentAvailability,procurement'
    })
  }

  /**
   * 出品作成・更新
   */
  async putListingsItem(sellerSKU: string, productData: {
    productType: string
    requirements: string
    attributes: Record<string, any>
  }) {
    return this.request('PUT', `/listings/2021-08-01/items/${process.env.AMAZON_SELLER_ID}/${sellerSKU}`, {
      marketplaceIds: this.config.marketplaceId
    }, {
      productType: productData.productType,
      requirements: productData.requirements,
      attributes: productData.attributes
    })
  }

  /**
   * 出品削除
   */
  async deleteListingsItem(sellerSKU: string) {
    return this.request('DELETE', `/listings/2021-08-01/items/${process.env.AMAZON_SELLER_ID}/${sellerSKU}`, {
      marketplaceIds: this.config.marketplaceId
    })
  }

  // ============================================================
  // FBA Inventory API
  // ============================================================

  /**
   * FBA在庫取得
   */
  async getFBAInventorySummaries() {
    return this.request('GET', '/fba/inventory/v1/summaries', {
      details: 'true',
      granularityType: 'Marketplace',
      granularityId: this.config.marketplaceId,
      marketplaceIds: this.config.marketplaceId
    })
  }

  // ============================================================
  // Orders API
  // ============================================================

  /**
   * 注文一覧取得
   */
  async getOrders(createdAfter: string) {
    return this.request('GET', '/orders/v0/orders', {
      MarketplaceIds: this.config.marketplaceId,
      CreatedAfter: createdAfter
    })
  }

  /**
   * 注文詳細取得
   */
  async getOrder(orderId: string) {
    return this.request('GET', `/orders/v0/orders/${orderId}`)
  }

  /**
   * 注文アイテム取得
   */
  async getOrderItems(orderId: string) {
    return this.request('GET', `/orders/v0/orders/${orderId}/orderItems`)
  }
}
