/**
 * Email Parser Service
 *
 * Purpose: Amazon購入確認・発送通知メールの自動解析
 *
 * Features:
 * - Gmail API / IMAP統合
 * - 注文番号の自動抽出
 * - 追跡番号の自動抽出
 * - 配送予定日の自動抽出
 * - 構造化データへの変換
 */

import { createClient } from '@/lib/supabase/server'

export interface OrderEmailData {
  orderId: string
  orderDate: string
  orderTotal: number
  items: OrderItem[]
  shippingAddress: Address
  trackingNumber?: string
  carrier?: string
  estimatedDelivery?: string
  emailSubject: string
  emailDate: string
  rawEmailBody: string
}

export interface OrderItem {
  asin?: string
  title: string
  quantity: number
  price: number
}

export interface Address {
  name: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface ShippingNotification {
  orderId: string
  trackingNumber: string
  carrier: string
  estimatedDelivery?: string
  shippedDate: string
}

export class EmailParser {
  /**
   * Amazon注文確認メールを解析
   */
  parseOrderConfirmation(emailBody: string, emailSubject: string): OrderEmailData | null {
    try {
      // 注文番号を抽出
      const orderIdPatterns = [
        /Order\s+#?\s*([0-9]{3}-[0-9]{7}-[0-9]{7})/i,
        /Order\s+Number:\s*([0-9]{3}-[0-9]{7}-[0-9]{7})/i,
        /Amazon\.com\s+order\s+number\s+([0-9]{3}-[0-9]{7}-[0-9]{7})/i
      ]

      let orderId = ''
      for (const pattern of orderIdPatterns) {
        const match = emailBody.match(pattern)
        if (match) {
          orderId = match[1]
          break
        }
      }

      if (!orderId) {
        console.warn('Could not extract order ID from email')
        return null
      }

      // 注文日を抽出
      const orderDatePattern = /Ordered\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i
      const orderDateMatch = emailBody.match(orderDatePattern)
      const orderDate = orderDateMatch ? orderDateMatch[1] : new Date().toISOString()

      // 注文合計金額を抽出
      const orderTotalPatterns = [
        /Order\s+Total:\s*\$?([\d,]+\.?\d*)/i,
        /Grand\s+Total:\s*\$?([\d,]+\.?\d*)/i,
        /Total:\s*\$?([\d,]+\.?\d*)/i
      ]

      let orderTotal = 0
      for (const pattern of orderTotalPatterns) {
        const match = emailBody.match(pattern)
        if (match) {
          orderTotal = parseFloat(match[1].replace(/,/g, ''))
          break
        }
      }

      // 商品情報を抽出（簡易版）
      const items: OrderItem[] = this.extractItems(emailBody)

      // 配送先住所を抽出
      const shippingAddress = this.extractShippingAddress(emailBody)

      return {
        orderId,
        orderDate,
        orderTotal,
        items,
        shippingAddress: shippingAddress || {
          name: '',
          addressLine1: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US'
        },
        emailSubject,
        emailDate: new Date().toISOString(),
        rawEmailBody: emailBody
      }
    } catch (error) {
      console.error('Failed to parse order confirmation email:', error)
      return null
    }
  }

  /**
   * Amazon発送通知メールを解析
   */
  parseShippingNotification(emailBody: string): ShippingNotification | null {
    try {
      // 注文番号を抽出
      const orderIdPattern = /Order\s+#?\s*([0-9]{3}-[0-9]{7}-[0-9]{7})/i
      const orderIdMatch = emailBody.match(orderIdPattern)

      if (!orderIdMatch) {
        console.warn('Could not extract order ID from shipping notification')
        return null
      }

      const orderId = orderIdMatch[1]

      // 追跡番号を抽出
      const trackingPatterns = [
        /Tracking\s+(?:ID|Number):\s*([A-Z0-9]{10,40})/i,
        /Track\s+your\s+package:\s*([A-Z0-9]{10,40})/i,
        /([0-9]{20,40})/i, // 長い数字列（UPS/FedExなど）
        /(1Z[A-Z0-9]{16})/i, // UPS形式
        /(\d{12,22})/i // FedEx形式
      ]

      let trackingNumber = ''
      for (const pattern of trackingPatterns) {
        const match = emailBody.match(pattern)
        if (match) {
          trackingNumber = match[1]
          break
        }
      }

      // 配送業者を抽出
      const carrierPatterns = [
        /(UPS|USPS|FedEx|DHL|Amazon\s+Logistics)/i
      ]

      let carrier = 'Unknown'
      for (const pattern of carrierPatterns) {
        const match = emailBody.match(pattern)
        if (match) {
          carrier = match[1]
          break
        }
      }

      // 配送予定日を抽出
      const deliveryPatterns = [
        /Arriving:\s+([A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2})/i,
        /Estimated\s+delivery:\s+([A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2})/i,
        /Delivery\s+estimate:\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i
      ]

      let estimatedDelivery = undefined
      for (const pattern of deliveryPatterns) {
        const match = emailBody.match(pattern)
        if (match) {
          estimatedDelivery = match[1]
          break
        }
      }

      return {
        orderId,
        trackingNumber,
        carrier,
        estimatedDelivery,
        shippedDate: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to parse shipping notification:', error)
      return null
    }
  }

  /**
   * 商品情報を抽出（簡易版）
   */
  private extractItems(emailBody: string): OrderItem[] {
    const items: OrderItem[] = []

    // ASINパターン
    const asinPattern = /ASIN:\s*([A-Z0-9]{10})/gi
    const asinMatches = emailBody.matchAll(asinPattern)

    for (const match of asinMatches) {
      items.push({
        asin: match[1],
        title: 'Product',
        quantity: 1,
        price: 0
      })
    }

    return items
  }

  /**
   * 配送先住所を抽出
   */
  private extractShippingAddress(emailBody: string): Address | null {
    // 住所パターン（簡易版）
    const addressPattern = /Shipping\s+[Aa]ddress:([\s\S]{0,500}?)(?:\n\n|\r\n\r\n)/i
    const addressMatch = emailBody.match(addressPattern)

    if (!addressMatch) {
      return null
    }

    const addressText = addressMatch[1].trim()

    // 郵便番号を抽出
    const postalCodePattern = /([A-Z]{2}\s+)?(\d{5}(?:-\d{4})?)/
    const postalCodeMatch = addressText.match(postalCodePattern)

    // 州を抽出
    const statePattern = /([A-Z]{2})\s+\d{5}/
    const stateMatch = addressText.match(statePattern)

    return {
      name: '',
      addressLine1: '',
      city: '',
      state: stateMatch ? stateMatch[1] : '',
      postalCode: postalCodeMatch ? postalCodeMatch[2] : '',
      country: 'US'
    }
  }

  /**
   * メール解析結果をDBに保存
   */
  async saveOrderEmailData(data: OrderEmailData): Promise<void> {
    const supabase = createClient()

    await supabase.from('order_emails').insert({
      order_id: data.orderId,
      order_date: data.orderDate,
      order_total: data.orderTotal,
      items: data.items,
      shipping_address: data.shippingAddress,
      tracking_number: data.trackingNumber,
      carrier: data.carrier,
      estimated_delivery: data.estimatedDelivery,
      email_subject: data.emailSubject,
      email_date: data.emailDate,
      raw_email_body: data.rawEmailBody,
      created_at: new Date().toISOString()
    })

    // arbitrage_purchasesテーブルを更新
    await supabase
      .from('arbitrage_purchases')
      .update({
        purchase_order_id: data.orderId,
        purchase_date: data.orderDate,
        actual_price: data.orderTotal,
        status: 'purchased'
      })
      .eq('purchase_order_id', data.orderId)
      .or(`purchase_order_id.is.null`)

    console.log(`✅ Order email data saved: ${data.orderId}`)
  }

  /**
   * 発送通知をDBに保存
   */
  async saveShippingNotification(data: ShippingNotification): Promise<void> {
    const supabase = createClient()

    // arbitrage_purchasesテーブルを更新
    await supabase
      .from('arbitrage_purchases')
      .update({
        fba_shipment_id: data.trackingNumber,
        fba_shipped_date: data.shippedDate,
        status: 'shipped_to_fba'
      })
      .eq('purchase_order_id', data.orderId)

    console.log(`✅ Shipping notification saved: ${data.orderId} - ${data.trackingNumber}`)
  }

  /**
   * Gmail APIでメール取得（プレースホルダー）
   */
  async fetchOrderEmailsFromGmail(accountEmail: string): Promise<string[]> {
    // TODO: Gmail API統合
    // 1. OAuth2認証
    // 2. メールボックスから"Amazon.com order"を検索
    // 3. 未処理のメールのみを取得
    // 4. メール本文を抽出

    console.warn('Gmail API not implemented yet')
    return []
  }

  /**
   * 定期的にメールをチェックして処理
   */
  async processIncomingEmails(accountEmail: string): Promise<{
    ordersProcessed: number
    shipmentsProcessed: number
  }> {
    const emailBodies = await this.fetchOrderEmailsFromGmail(accountEmail)

    let ordersProcessed = 0
    let shipmentsProcessed = 0

    for (const emailBody of emailBodies) {
      // 注文確認メールの場合
      if (emailBody.includes('Your Amazon.com order') || emailBody.includes('Order Confirmation')) {
        const orderData = this.parseOrderConfirmation(emailBody, 'Order Confirmation')
        if (orderData) {
          await this.saveOrderEmailData(orderData)
          ordersProcessed++
        }
      }

      // 発送通知メールの場合
      if (emailBody.includes('has shipped') || emailBody.includes('Shipment Notification')) {
        const shippingData = this.parseShippingNotification(emailBody)
        if (shippingData) {
          await this.saveShippingNotification(shippingData)
          shipmentsProcessed++
        }
      }
    }

    console.log(`📧 Processed ${ordersProcessed} order emails and ${shipmentsProcessed} shipping notifications`)

    return { ordersProcessed, shipmentsProcessed }
  }
}

// シングルトンインスタンス
export const emailParser = new EmailParser()
