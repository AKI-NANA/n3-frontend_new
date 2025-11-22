/**
 * messageSyncService.ts
 *
 * マルチモール メッセージ同期サービス
 *
 * 機能:
 * - eBay Trading API、Amazon MWS、Shopee Partner APIなどからメッセージを定期取得
 * - unified_messagesテーブルに統一フォーマットで保存
 * - AI緊急度判定をトリガー
 */

import { createClient } from '@/lib/supabase/client'
import { getAutoReplyEngine } from '../messaging/AutoReplyEngine'

interface UnifiedMessage {
  message_id: string
  marketplace: string
  customer_name: string
  customer_email?: string
  subject?: string
  message_body: string
  order_id?: string
  received_at: string
  is_read: boolean
  urgency_level?: 'critical' | 'high' | 'medium' | 'low'
}

export class MessageSyncService {
  private supabase: ReturnType<typeof createClient>
  private autoReplyEngine: ReturnType<typeof getAutoReplyEngine>

  // APIキー
  private ebayToken: string | null = null
  private amazonMwsKey: string | null = null
  private shopeePartnerId: string | null = null

  constructor() {
    this.supabase = createClient()
    this.autoReplyEngine = getAutoReplyEngine()

    this.ebayToken = process.env.EBAY_TOKEN || null
    this.amazonMwsKey = process.env.AMAZON_MWS_KEY || null
    this.shopeePartnerId = process.env.SHOPEE_PARTNER_ID || null

    this.logApiStatus()
  }

  private logApiStatus() {
    console.log('📬 MessageSyncService API Status:')
    console.log(`  eBay Trading API: ${this.ebayToken ? '✅' : '❌'}`)
    console.log(`  Amazon MWS: ${this.amazonMwsKey ? '✅' : '❌'}`)
    console.log(`  Shopee Partner API: ${this.shopeePartnerId ? '✅' : '❌'}`)
  }

  /**
   * 全モールからメッセージを同期
   */
  async pollAllMalls(): Promise<{
    total: number
    newMessages: number
    errors: string[]
  }> {
    console.log('\n📬 全モールのメッセージを同期中...')

    const results = await Promise.allSettled([
      this.pollEbayMessages(),
      this.pollAmazonMessages(),
      this.pollShopeeMessages(),
    ])

    let total = 0
    let newMessages = 0
    const errors: string[] = []

    results.forEach((result, index) => {
      const marketplace = ['eBay', 'Amazon', 'Shopee'][index]

      if (result.status === 'fulfilled') {
        total += result.value.total
        newMessages += result.value.newMessages
        console.log(`✅ ${marketplace}: ${result.value.newMessages}件の新着`)
      } else {
        errors.push(`${marketplace}: ${result.reason.message}`)
        console.error(`❌ ${marketplace}エラー:`, result.reason)
      }
    })

    console.log(`\n📊 同期完了: 新着${newMessages}件 / 全${total}件`)

    return { total, newMessages, errors }
  }

  /**
   * eBay Trading APIからメッセージを取得
   */
  private async pollEbayMessages(): Promise<{ total: number; newMessages: number }> {
    if (!this.ebayToken) {
      console.warn('⚠️ eBay Trading API未設定 - スキップ')
      return { total: 0, newMessages: 0 }
    }

    try {
      // TODO: eBay Trading API GetMemberMessagesの実装
      // const ebayApi = new EbayTradingAPI(this.ebayToken)
      // const messages = await ebayApi.getMemberMessages({ MessageStatus: 'Unanswered' })

      // 暫定: モックデータ
      const messages: any[] = []

      let newMessages = 0

      for (const msg of messages) {
        const unifiedMsg: UnifiedMessage = {
          message_id: `ebay-${msg.MessageID}`,
          marketplace: 'ebay',
          customer_name: msg.Sender || 'Unknown',
          subject: msg.Subject,
          message_body: msg.Body?.Text || '',
          order_id: msg.ItemID,
          received_at: msg.ReceiveDate,
          is_read: false,
        }

        const saved = await this.saveMessage(unifiedMsg)
        if (saved) newMessages++
      }

      return { total: messages.length, newMessages }

    } catch (error) {
      console.error('❌ eBayメッセージ取得エラー:', error)
      throw error
    }
  }

  /**
   * Amazon MWSからメッセージを取得
   */
  private async pollAmazonMessages(): Promise<{ total: number; newMessages: number }> {
    if (!this.amazonMwsKey) {
      console.warn('⚠️ Amazon MWS未設定 - スキップ')
      return { total: 0, newMessages: 0 }
    }

    try {
      // TODO: Amazon MWS ListMessagesの実装
      // const mwsClient = new AmazonMWS(this.amazonMwsKey)
      // const messages = await mwsClient.messages.list()

      // 暫定: モックデータ
      const messages: any[] = []

      let newMessages = 0

      for (const msg of messages) {
        const unifiedMsg: UnifiedMessage = {
          message_id: `amazon-${msg.MessageId}`,
          marketplace: 'amazon',
          customer_name: msg.CustomerName || 'Amazon Customer',
          subject: msg.Subject,
          message_body: msg.Body,
          order_id: msg.OrderId,
          received_at: msg.ReceivedTime,
          is_read: false,
        }

        const saved = await this.saveMessage(unifiedMsg)
        if (saved) newMessages++
      }

      return { total: messages.length, newMessages }

    } catch (error) {
      console.error('❌ Amazonメッセージ取得エラー:', error)
      throw error
    }
  }

  /**
   * Shopee Partner APIからメッセージを取得
   */
  private async pollShopeeMessages(): Promise<{ total: number; newMessages: number }> {
    if (!this.shopeePartnerId) {
      console.warn('⚠️ Shopee Partner API未設定 - スキップ')
      return { total: 0, newMessages: 0 }
    }

    try {
      // TODO: Shopee Partner API GetConversationListの実装
      // const shopeeApi = new ShopeeAPI(this.shopeePartnerId)
      // const conversations = await shopeeApi.getConversationList()

      // 暫定: モックデータ
      const messages: any[] = []

      let newMessages = 0

      for (const msg of messages) {
        const unifiedMsg: UnifiedMessage = {
          message_id: `shopee-${msg.conversation_id}`,
          marketplace: 'shopee',
          customer_name: msg.to_name || 'Shopee Buyer',
          message_body: msg.last_message,
          order_id: msg.order_id,
          received_at: new Date(msg.last_read_time * 1000).toISOString(),
          is_read: false,
        }

        const saved = await this.saveMessage(unifiedMsg)
        if (saved) newMessages++
      }

      return { total: messages.length, newMessages }

    } catch (error) {
      console.error('❌ Shopeeメッセージ取得エラー:', error)
      throw error
    }
  }

  /**
   * unified_messagesテーブルに保存
   */
  private async saveMessage(message: UnifiedMessage): Promise<boolean> {
    try {
      // 重複チェック
      const { data: existing } = await this.supabase
        .from('unified_messages')
        .select('id')
        .eq('message_id', message.message_id)
        .single()

      if (existing) {
        console.log(`⏭️ スキップ: ${message.message_id} (既存)`)
        return false
      }

      // AI緊急度判定
      if (message.message_body) {
        const aiResult = await this.autoReplyEngine.generateReply({
          id: message.message_id,
          customer_name: message.customer_name,
          customer_email: message.customer_email || '',
          message_body: message.message_body,
          order_id: message.order_id,
          marketplace: message.marketplace,
          received_at: message.received_at,
        })

        if (aiResult.success) {
          message.urgency_level = aiResult.urgency_level
        }
      }

      // 保存
      const { error } = await this.supabase
        .from('unified_messages')
        .insert(message)

      if (error) {
        throw error
      }

      console.log(`💾 保存: ${message.message_id} (緊急度: ${message.urgency_level || '不明'})`)

      // 緊急メッセージの場合は通知
      if (message.urgency_level === 'critical' || message.urgency_level === 'high') {
        // TODO: Slack/メール通知
        console.log(`🚨 緊急メッセージ: ${message.subject || message.message_body.substring(0, 50)}`)
      }

      return true

    } catch (error) {
      console.error(`❌ メッセージ保存エラー (${message.message_id}):`, error)
      return false
    }
  }
}

/**
 * シングルトンインスタンス
 */
let messageSyncServiceInstance: MessageSyncService | null = null

export function getMessageSyncService(): MessageSyncService {
  if (!messageSyncServiceInstance) {
    messageSyncServiceInstance = new MessageSyncService()
  }
  return messageSyncServiceInstance
}
