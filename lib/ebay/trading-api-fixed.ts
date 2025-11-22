import { createClient } from '@/lib/supabase/server'

/**
 * eBay Trading API Service
 * AddItem API を使用した出品機能
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
  private refreshToken: string | null = null
  private accessToken: string | null = null
  private tokenExpiry: number = 0
  private isProduction: boolean

  constructor(account: string = 'green', isProduction = false) {
    this.account = account
    this.isProduction = isProduction
    
    // アカウントに応じたクライアントIDを選択
    if (account === 'green') {
      this.clientId = process.env.EBAY_CLIENT_ID_GREEN!
      this.clientSecret = process.env.EBAY_CLIENT_SECRET_GREEN!
    } else if (account === 'mjt') {
      this.clientId = process.env.EBAY_CLIENT_ID_MJT!
      this.clientSecret = process.env.EBAY_CLIENT_SECRET_MJT!
    } else {
      this.clientId = process.env.EBAY_CLIENT_ID!
      this.clientSecret = process.env.EBAY_CLIENT_SECRET!
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error(`eBay認証情報が設定されていません。Account: ${account}`)
    }
  }

  /**
   * Supabaseからリフレッシュトークンを取得
   */
  private async getRefreshTokenFromDB(): Promise<string> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ebay_tokens')
      .select('refresh_token')
      .eq('account', this.account)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data?.refresh_token) {
      throw new Error(`アカウント "${this.account}" のリフレッシュトークンが見つかりません。先に認証を完了してください。`)
    }
    
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
    
    // Supabaseからリフレッシュトークンを取得
    if (!this.refreshToken) {
      this.refreshToken = await this.getRefreshTokenFromDB()
    }
    
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64')
    
    const tokenUrl = this.isProduction
      ? 'https://api.ebay.com/identity/v1/oauth2/token'
      : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    
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

  // 以降のメソッドは変更なし...
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
      const xmlRequest = this.buildAddItemXml(listing)

      console.log('\n📤 eBay AddItem API 呼び出し中...')
      console.log(`  環境: ${this.isProduction ? '本番' : 'サンドボックス'}`)
      console.log(`  アカウント: ${this.account}`)
      console.log(`  SKU: ${listing.sku}`)
      console.log(`  タイトル: ${listing.title}`)
      console.log(`  価格: $${listing.price}`)
      console.log(`  数量: ${listing.quantity}`)
      console.log(`  カテゴリ: ${listing.categoryId}`)

      const apiUrl = this.isProduction
        ? 'https://api.ebay.com/ws/api.dll'
        : 'https://api.sandbox.ebay.com/ws/api.dll'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'X-EBAY-API-SITEID': '0', // US site
          'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
          'X-EBAY-API-CALL-NAME': 'AddItem',
          'X-EBAY-API-IAF-TOKEN': token,
          'Content-Type': 'text/xml; charset=utf-8'
        },
        body: xmlRequest
      })

      const xmlResponse = await response.text()
      
      console.log('\n📥 eBay APIレスポンス受信')

      // XMLパース（簡易版）
      const ackMatch = xmlResponse.match(/<Ack>(.*?)<\/Ack>/)
      const ack = ackMatch ? ackMatch[1] : 'Unknown'

      if (ack === 'Success' || ack === 'Warning') {
        const itemIdMatch = xmlResponse.match(/<ItemID>(\d+)<\/ItemID>/)
        const itemId = itemIdMatch ? itemIdMatch[1] : null

        // 手数料情報を抽出
        const insertionFeeMatch = xmlResponse.match(/<InsertionFee currencyID="USD">([\d.]+)<\/InsertionFee>/)
        const insertionFee = insertionFeeMatch ? parseFloat(insertionFeeMatch[1]) : 0

        console.log('\n✅ 出品成功!')
        console.log(`  eBay Item ID: ${itemId}`)
        console.log(`  出品URL: https://www.ebay.com/itm/${itemId}`)
        console.log(`  出品手数料: $${insertionFee}`)

        // Warningがある場合は表示
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
            finalValueFee: 0 // 販売時に確定
          }
        }
      } else {
        // エラーメッセージ抽出
        const errorCodeMatch = xmlResponse.match(/<ErrorCode>(\d+)<\/ErrorCode>/)
        const errorCode = errorCodeMatch ? errorCodeMatch[1] : 'Unknown'
        
        const shortMessageMatch = xmlResponse.match(/<ShortMessage>(.*?)<\/ShortMessage>/)
        const shortMessage = shortMessageMatch ? shortMessageMatch[1] : 'Unknown error'
        
        const longMessageMatch = xmlResponse.match(/<LongMessage>(.*?)<\/LongMessage>/)
        const longMessage = longMessageMatch ? longMessageMatch[1] : shortMessage

        console.error('\n❌ 出品失敗')
        console.error(`  エラーコード: ${errorCode}`)
        console.error(`  エラー: ${longMessage}`)

        // デバッグ用にXMLレスポンスの一部を表示
        console.error('\n📄 XMLレスポンス（抜粋）:')
        const errorSection = xmlResponse.match(/<Errors>[\s\S]*?<\/Errors>/)
        if (errorSection) {
          console.error(errorSection[0])
        }

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

  private buildAddItemXml(listing: EbayListingData): string {
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
    <eBayAuthToken>PLACEHOLDER_FOR_IAF_TOKEN</eBayAuthToken>
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
    <PaymentMethods>PayPal</PaymentMethods>
    <PayPalEmailAddress>${this.escapeXml(paypalEmail)}</PayPalEmailAddress>
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
        <ShippingService>${listing.shippingService}</ShippingService>
        <ShippingServiceCost>${listing.shippingCost.toFixed(2)}</ShippingServiceCost>
      </ShippingServiceOptions>
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
      'USED_EXCELLENT': '3000',
      'USED_GOOD': '4000',
      'USED_ACCEPTABLE': '5000',
      'FOR_PARTS_OR_NOT_WORKING': '7000'
    }
    return conditionMap[condition] || '3000'
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

      const xmlRequest = this.buildAddItemXml(listing)
        .replace('<AddItemRequest', '<VerifyAddItemRequest')
        .replace('</AddItemRequest>', '</VerifyAddItemRequest>')

      console.log('\n🔍 eBay VerifyAddItem API 呼び出し中（出品テスト）...')

      const apiUrl = this.isProduction
        ? 'https://api.ebay.com/ws/api.dll'
        : 'https://api.sandbox.ebay.com/ws/api.dll'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
          'X-EBAY-API-CALL-NAME': 'VerifyAddItem',
          'X-EBAY-API-IAF-TOKEN': token,
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
