import crypto from 'crypto'

interface AmazonAPIConfig {
  accessKey: string
  secretKey: string
  partnerTag: string
  marketplace: string
  region: string
}

interface AmazonAPIRequest {
  operation: 'GetItems' | 'SearchItems'
  params: Record<string, any>
}

export class AmazonAPIClient {
  private config: AmazonAPIConfig
  private endpoint: string
  private service = 'ProductAdvertisingAPI'

  constructor() {
    this.config = {
      accessKey: process.env.AMAZON_ACCESS_KEY!,
      secretKey: process.env.AMAZON_SECRET_KEY!,
      partnerTag: process.env.AMAZON_PARTNER_TAG!,
      marketplace: process.env.AMAZON_MARKETPLACE || 'www.amazon.com',
      region: process.env.AMAZON_REGION || 'us-east-1'
    }

    this.endpoint = `https://webservices.amazon.${this.getMarketplaceDomain()}/paapi5`
  }

  private getMarketplaceDomain(): string {
    const domains: Record<string, string> = {
      'www.amazon.com': 'com',
      'www.amazon.co.jp': 'co.jp',
      'www.amazon.co.uk': 'co.uk',
      'www.amazon.de': 'de',
      'www.amazon.fr': 'fr'
    }
    return domains[this.config.marketplace] || 'com'
  }

  private async sign(request: AmazonAPIRequest, timestamp: string): Promise<string> {
    const canonicalRequest = this.createCanonicalRequest(request, timestamp)
    const stringToSign = this.createStringToSign(canonicalRequest, timestamp)

    const dateKey = crypto.createHmac('sha256', `AWS4${this.config.secretKey}`)
      .update(timestamp.substring(0, 8))
      .digest()

    const regionKey = crypto.createHmac('sha256', dateKey)
      .update(this.config.region)
      .digest()

    const serviceKey = crypto.createHmac('sha256', regionKey)
      .update(this.service)
      .digest()

    const signingKey = crypto.createHmac('sha256', serviceKey)
      .update('aws4_request')
      .digest()

    const signature = crypto.createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex')

    return signature
  }

  private createCanonicalRequest(request: AmazonAPIRequest, timestamp: string): string {
    const method = 'POST'
    const uri = `/paapi5/${request.operation.toLowerCase()}`
    const queryString = ''

    const headers = [
      `content-type:application/json; charset=utf-8`,
      `host:${this.endpoint.replace('https://', '')}`,
      `x-amz-date:${timestamp}`,
      `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${request.operation}`
    ].join('\n')

    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target'

    const payload = JSON.stringify(request.params)
    const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex')

    return [method, uri, queryString, headers, '', signedHeaders, hashedPayload].join('\n')
  }

  private createStringToSign(canonicalRequest: string, timestamp: string): string {
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${timestamp.substring(0, 8)}/${this.config.region}/${this.service}/aws4_request`
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex')

    return [algorithm, timestamp, credentialScope, hashedCanonicalRequest].join('\n')
  }

  async getItems(asins: string[]): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')

    const request: AmazonAPIRequest = {
      operation: 'GetItems',
      params: {
        ItemIds: asins,
        PartnerTag: this.config.partnerTag,
        PartnerType: 'Associates',
        Marketplace: this.config.marketplace,
        Resources: [
          'Images.Primary.Large',
          'Images.Variants.Large',
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ProductInfo',
          'ItemInfo.TechnicalInfo',
          'Offers.Listings.Price',
          'Offers.Listings.Availability',
          'Offers.Listings.Condition',
          'Offers.Listings.DeliveryInfo.IsPrimeEligible',
          'Offers.Listings.DeliveryInfo.IsAmazonFulfilled',
          'Offers.Listings.DeliveryInfo.IsFreeShippingEligible',
          'Offers.Summaries.HighestPrice',
          'Offers.Summaries.LowestPrice'
        ]
      }
    }

    const signature = await this.sign(request, timestamp)

    const response = await fetch(this.endpoint + `/getitems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Amz-Date': timestamp,
        'X-Amz-Target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems`,
        'Authorization': this.createAuthorizationHeader(timestamp, signature)
      },
      body: JSON.stringify(request.params)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Amazon API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  async searchItems(keywords: string, options: {
    minPrice?: number
    maxPrice?: number
    category?: string
    primeOnly?: boolean
  } = {}): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')

    const request: AmazonAPIRequest = {
      operation: 'SearchItems',
      params: {
        Keywords: keywords,
        PartnerTag: this.config.partnerTag,
        PartnerType: 'Associates',
        Marketplace: this.config.marketplace,
        SearchIndex: options.category || 'All',
        Resources: [
          'Images.Primary.Large',
          'Images.Variants.Large',
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ProductInfo',
          'Offers.Listings.Price',
          'Offers.Listings.Availability',
          'Offers.Listings.Condition',
          'Offers.Listings.DeliveryInfo.IsPrimeEligible',
          'Offers.Summaries.HighestPrice',
          'Offers.Summaries.LowestPrice'
        ],
        ItemCount: 10
      }
    }

    if (options.minPrice) {
      request.params.MinPrice = Math.round(options.minPrice * 100)
    }
    if (options.maxPrice) {
      request.params.MaxPrice = Math.round(options.maxPrice * 100)
    }
    if (options.primeOnly) {
      request.params.DeliveryFlags = ['AmazonGlobal', 'Free', 'FulfilledByAmazon', 'Prime']
    }

    const signature = await this.sign(request, timestamp)

    const response = await fetch(this.endpoint + `/searchitems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Amz-Date': timestamp,
        'X-Amz-Target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems`,
        'Authorization': this.createAuthorizationHeader(timestamp, signature)
      },
      body: JSON.stringify(request.params)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Amazon API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  private createAuthorizationHeader(timestamp: string, signature: string): string {
    const credentialScope = `${timestamp.substring(0, 8)}/${this.config.region}/${this.service}/aws4_request`
    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target'

    return `AWS4-HMAC-SHA256 Credential=${this.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  }
}
