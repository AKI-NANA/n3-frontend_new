import { createClient } from '@/lib/supabase/server'

/**
 * eBay Trading API Service
 * AddItem API を使用した出品機能
 * 
 * リフレッシュトークンはSupabaseから取得
 */

interface EbayListingData {
  sku: string
  title: string
  description: string
  categoryId: string
  price: number
  quantity: number
  condition: 'NEW' | 'USED_EXCELLENT' | 'USED_GOOD' | 'USED_ACCEPTABLE' | 'FOR_PARTS_OR_NOT_WORKING'
  imageUrls: string[]
  shippingService: string
  shippingCost: number
  handlingTime: number
  location: {
    country: string
    postalCode: string
    city: string
  }
  paypalEmail?: string
  returnPolicy?: {
    returnsAccepted: boolean
    refundOption: string
    returnsWithinDays: number
    shippingCostPaidBy: string
  }
}

export class EbayTradingApiService {
  private account: string
  private clientId: string
  private clientSecret: string
  private devId: string
  private certId: string
  private refreshToken: string | null = null
  private accessToken: string | null = null
  private tokenExpiry: number = 0
  private isProduction: boolean

  constructor(account: string = 'green', isProduction = false) {
    this.account = account
    this.isProduction = isProduction
    
    // Dev IDは共通
    this.devId = process.env.EBAY_DEV_ID!
    
    // アカウントに応じた認証情報を.env.localから取得
    if (account === 'green') {
      this.clientId = process.env.EBAY_CLIENT_ID_GREEN!
      this.clientSecret = process.env.EBAY_CLIENT_SECRET_GREEN!
      this.certId = process.env.EBAY_CLIENT_SECRET_GREEN!  // Cert ID = Client Secret
    } else if (account === 'mjt') {
      this.clientId = process.env.EBAY_CLIENT_ID_MJT!
      this.clientSecret = process.env.EBAY_CLIENT_SECRET_MJT!
      this.certId = process.env.EBAY_CLIENT_SECRET_MJT!  // Cert ID = Client Secret
    } else {
      this.clientId = process.env.EBAY_CLIENT_ID!
      this.clientSecret = process.env.EBAY_CLIENT_SECRET!
      this.certId = process.env.EBAY_CERT_ID!
    }

    if (!this.clientId || !this.clientSecret || !this.devId || !this.certId) {
      throw new Error(`eBay認証情報が設定されていません。Account: ${account}`)
    }
  }

  /**
   * Supabaseから最新のリフレッシュトークンを取得
   */
  private async getRefreshTokenFromDB(): Promise<string> {
    const supabase = await createClient()
    
    console.log(`📌 Supabaseからリフレッシュトークンを取得中... (account: ${this.account})`)
    
    const { data, error } = await supabase
      .from('ebay_tokens')
      .select('refresh_token, created_at')
      .eq('account', this.account)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data?.refresh_token) {
      throw new Error(
        `❌ アカウント "${this.account}" のリフレッシュトークンが見つかりません。\n` +
        `先に http://localhost:3000/api/ebay/auth/authorize?account=${this.account} で認証を完了してください。`
      )
    }
    
    console.log(`✅ トークン取得成功 (取得日時: ${data.created_at})`)
    
    return data.refresh_token
  }

  /**
   * アクセストークン取得（必要時のみ更新）
   */
  private async ensureAccessToken(): Promise<string> {
    const now = Date.now()
    
    // トークンが有効な場合は再利用
    if (this.accessToken && now < this.tokenExpiry) {
      console.log('✅ 既存のAccess Tokenを再利用')
      return this.accessToken
    }

    console.log('🔄 eBay Access Token を更新中...')
    console.log(`📌 アカウント: ${this.account}`)
    
    // Supabaseから最新のリフレッシュトークンを取得
    if (!this.refreshToken) {
      this.refreshToken = await this.getRefreshTokenFromDB()
    }
    
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64')
    
    const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token'
    
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory'
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('❌ eBay Token Refresh Response:', error)
        throw new Error(`Access Token取得失敗 (${response.status}): ${error}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      // トークン有効期限を設定（7200秒 = 2時間、余裕を持って1時間50分後に期限切れ扱い）
      this.tokenExpiry = now + (110 * 60 * 1000)
      
      console.log('✅ Access Token 更新完了')
      console.log(`⏰ 有効期限: ${new Date(this.tokenExpiry).toLocaleString('ja-JP')}`)
      
      return this.accessToken
    } catch (error: any) {
      console.error('❌ Access Token取得エラー:', error.message)
      throw error
    }
  }

  /**
   * AddItem APIで商品を出品
   */
  async addItem(listing: EbayListingData): Promise<{
    success: boolean
    itemId?: string
    error?: string
    fees?: {
      insertionFee: number
      finalValueFee: number
    }
  }> {
    try {
      const token = await this.ensureAccessToken()

      // AddItem XML リクエスト生成
      const xmlRequest = this.buildAddItemXml(listing, token)

      console.log('\n📤 eBay AddItem API 呼び出し中...')
      console.log(`  環境: ${this.isProduction ? '本番' : 'サンドボックス'}`)
      console.log(`  アカウント: ${this.account}`)
      console.log(`  SKU: ${listing.sku}`)
      console.log(`  タイトル: ${listing.title}`)
      console.log(`  価格: ${listing.price}`)
      console.log(`  数量: ${listing.quantity}`)
      
      console.log('\n🔍 送信するXMLリクエスト:')
      console.log(xmlRequest)
      console.log('\n---')

      const apiUrl = this.isProduction
        ? 'https://api.ebay.com/ws/api.dll'
        : 'https://api.sandbox.ebay.com/ws/api.dll'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
          'X-EBAY-API-CALL-NAME': 'AddItem',
          'X-EBAY-API-APP-NAME': this.clientId,
          'X-EBAY-API-DEV-NAME': this.devId,
          'X-EBAY-API-CERT-NAME': this.certId,  // ⭐ 追加: Cert IDを設定
          'Content-Type': 'text/xml; charset=utf-8'
        },
        body: xmlRequest
      })

      const xmlResponse = await response.text()
      
      console.log('\n📥 eBay APIレスポンス受信')
      console.log('\n🔍 完全なXMLレスポンス:')
      console.log(xmlResponse)
      console.log('\n---')

      // XMLパース（簡易版）
      const ackMatch = xmlResponse.match(/<Ack>(.*?)<\/Ack>/)
      const ack = ackMatch ? ackMatch[1] : 'Unknown'

      if (ack === 'Success' || ack === 'Warning') {
        const itemIdMatch = xmlResponse.match(/<ItemID>(\d+)<\/ItemID>/)
        const itemId = itemIdMatch ? itemIdMatch[1] : null

        const insertionFeeMatch = xmlResponse.match(/<InsertionFee currencyID="USD">([\d.]+)<\/InsertionFee>/)
        const insertionFee = insertionFeeMatch ? parseFloat(insertionFeeMatch[1]) : 0

        console.log('\n✅ 出品成功!')
        console.log(`  eBay Item ID: ${itemId}`)
        console.log(`  出品URL: https://www.ebay.com/itm/${itemId}`)
        console.log(`  出品手数料: $${insertionFee}`)

        if (ack === 'Warning') {
          const warningMatch = xmlResponse.match(/<LongMessage>(.*?)<\/LongMessage>/)
          if (warningMatch) {
            console.log(`  ⚠️ 警告: ${warningMatch[1]}`)
          }
        }

        return {
          success: true,
          itemId: itemId || undefined,
          fees: {
            insertionFee,
            finalValueFee: 0
          }
        }
      } else {
        const errorCodeMatch = xmlResponse.match(/<ErrorCode>(\d+)<\/ErrorCode>/)
        const errorCode = errorCodeMatch ? errorCodeMatch[1] : 'Unknown'
        
        const longMessageMatch = xmlResponse.match(/<LongMessage>(.*?)<\/LongMessage>/)
        const longMessage = longMessageMatch ? longMessageMatch[1] : 'Unknown error'

        console.error('\n❌ 出品失敗')
        console.error(`  エラーコード: ${errorCode}`)
        console.error(`  エラー: ${longMessage}`)

        return {
          success: false,
          error: `${errorCode}: ${longMessage}`
        }
      }

    } catch (error: any) {
      console.error('\n❌ API呼び出しエラー:', error.message)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * AddItem XML リクエスト生成
   */
  private buildAddItemXml(listing: EbayListingData, token: string): string {
    const pictureUrls = listing.imageUrls
      .filter(url => url && url.trim() !== '')
      .slice(0, 12)
      .map(url => `      <PictureURL>${this.escapeXml(url)}</PictureURL>`)
      .join('\n')

    const paypalEmail = listing.paypalEmail || process.env.EBAY_PAYPAL_EMAIL || 'your-paypal@example.com'

    const returnPolicy = listing.returnPolicy || {
      returnsAccepted: true,
      refundOption: 'MoneyBack',
      returnsWithinDays: 30,
      shippingCostPaidBy: 'Buyer'
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title>${this.escapeXml(listing.title.substring(0, 80))}</Title>
    <Description><![CDATA[${listing.description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${listing.categoryId}</CategoryID>
    </PrimaryCategory>
    <StartPrice>${listing.price.toFixed(2)}</StartPrice>
    <ConditionID>${this.getConditionId(listing.condition)}</ConditionID>
    <Country>${listing.location.country}</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>${listing.handlingTime}</DispatchTimeMax>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <Location>${this.escapeXml(listing.location.city)}</Location>
    <PostalCode>${listing.location.postalCode}</PostalCode>
    <PaymentMethods>PaymentSeeDescription</PaymentMethods>
    <IntegratedMerchantCreditCardEnabled>true</IntegratedMerchantCreditCardEnabled>
    <ItemSpecifics>
      <NameValueList>
        <Name>Game</Name>
        <Value>Pokemon TCG</Value>
      </NameValueList>
    </ItemSpecifics>
    <PictureDetails>
${pictureUrls}
    </PictureDetails>
    <Quantity>${listing.quantity}</Quantity>
    <ReturnPolicy>
      <ReturnsAcceptedOption>${returnPolicy.returnsAccepted ? 'ReturnsAccepted' : 'ReturnsNotAccepted'}</ReturnsAcceptedOption>
      ${returnPolicy.returnsAccepted ? `
      <RefundOption>${returnPolicy.refundOption}</RefundOption>
      <ReturnsWithinOption>Days_${returnPolicy.returnsWithinDays}</ReturnsWithinOption>
      <ShippingCostPaidByOption>${returnPolicy.shippingCostPaidBy}</ShippingCostPaidByOption>
      ` : ''}
    </ReturnPolicy>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>Other</ShippingService>
        <ShippingServiceCost>0.00</ShippingServiceCost>
        <ShippingServiceAdditionalCost>0.00</ShippingServiceAdditionalCost>
        <FreeShipping>true</FreeShipping>
      </ShippingServiceOptions>
      <InternationalShippingServiceOption>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>OtherInternational</ShippingService>
        <ShippingServiceCost>${listing.shippingCost.toFixed(2)}</ShippingServiceCost>
        <ShippingServiceAdditionalCost>5.00</ShippingServiceAdditionalCost>
        <ShipToLocation>US</ShipToLocation>
        <ShipToLocation>WorldWide</ShipToLocation>
      </InternationalShippingServiceOption>
      <GlobalShipping>true</GlobalShipping>
    </ShippingDetails>
    <Site>US</Site>
    <SKU>${this.escapeXml(listing.sku)}</SKU>
  </Item>
</AddItemRequest>`
  }

  private getConditionId(condition: string): string {
    const conditionMap: Record<string, string> = {
      'NEW': '1000',
      'USED_EXCELLENT': '2000',  // 修正: 3000 → 2000
      'USED_GOOD': '2000',       // 修正: 4000 → 2000
      'USED_ACCEPTABLE': '2000', // 修正: 5000 → 2000
      'FOR_PARTS_OR_NOT_WORKING': '7000'
    }
    return conditionMap[condition] || '2000'  // デフォルトも2000に
  }

  private escapeXml(str: string): string {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  async verifyAddItem(listing: EbayListingData): Promise<{
    success: boolean
    fees?: {
      insertionFee: number
      finalValueFee: number
    }
    errors?: string[]
    warnings?: string[]
  }> {
    try {
      const token = await this.ensureAccessToken()

      const xmlRequest = this.buildAddItemXml(listing, token)
        .replace('<AddItemRequest', '<VerifyAddItemRequest')
        .replace('</AddItemRequest>', '</VerifyAddItemRequest>')

      console.log('\n🔍 eBay VerifyAddItem API 呼び出し中（出品テスト）...')

      const apiUrl = this.isProduction
        ? 'https://api.ebay.com/ws/api.dll'
        : 'https://api.sandbox.ebay.com/ws/api.dll'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
          'X-EBAY-API-CALL-NAME': 'VerifyAddItem',
          'X-EBAY-API-APP-NAME': this.clientId,
          'X-EBAY-API-DEV-NAME': this.devId,
          'X-EBAY-API-CERT-NAME': this.certId,  // ⭐ 追加: Cert IDを設定
          'Content-Type': 'text/xml; charset=utf-8'
        },
        body: xmlRequest
      })

      const xmlResponse = await response.text()

      const ackMatch = xmlResponse.match(/<Ack>(.*?)<\/Ack>/)
      const ack = ackMatch ? ackMatch[1] : 'Unknown'

      const insertionFeeMatch = xmlResponse.match(/<InsertionFee currencyID="USD">([\d.]+)<\/InsertionFee>/)
      const insertionFee = insertionFeeMatch ? parseFloat(insertionFeeMatch[1]) : 0

      const errors: string[] = []
      const warnings: string[] = []

      const errorMatches = xmlResponse.matchAll(/<Errors>[\s\S]*?<SeverityCode>(.*?)<\/SeverityCode>[\s\S]*?<LongMessage>(.*?)<\/LongMessage>[\s\S]*?<\/Errors>/g)
      for (const match of errorMatches) {
        const severity = match[1]
        const message = match[2]
        if (severity === 'Error') {
          errors.push(message)
        } else if (severity === 'Warning') {
          warnings.push(message)
        }
      }

      if (ack === 'Success' || ack === 'Warning') {
        console.log('\n✅ 検証成功 - 出品可能です')
        console.log(`  予想出品手数料: $${insertionFee}`)
        
        if (warnings.length > 0) {
          console.log('  ⚠️ 警告:')
          warnings.forEach(w => console.log(`    - ${w}`))
        }

        return {
          success: true,
          fees: {
            insertionFee,
            finalValueFee: 0
          },
          warnings
        }
      } else {
        console.error('\n❌ 検証失敗')
        errors.forEach(e => console.error(`  - ${e}`))

        return {
          success: false,
          errors,
          warnings
        }
      }

    } catch (error: any) {
      console.error('\n❌ 検証エラー:', error.message)
      return {
        success: false,
        errors: [error.message]
      }
    }
  }
}
