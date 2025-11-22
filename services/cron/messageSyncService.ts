/**
 * MessageSyncService - メッセージポーリングとAI緊急度判定
 * 各モールからメッセージを取得し、AI で緊急度を自動判定
 */

import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  marketplace: string
  message_id: string
  buyer_id: string
  buyer_name: string
  subject: string
  body: string
  received_at: string
  urgency_level?: 'critical' | 'high' | 'medium' | 'low'
  ai_category?: string
}

/**
 * Shopeeメッセージを取得
 */
async function pollShopeeMessages(): Promise<Message[]> {
  try {
    // Shopee API を呼び出し
    // TODO: 実際のShopee Messaging APIを実装
    console.log('[MessageSync] Shopeeメッセージポーリング')

    // 仮の実装
    return []
  } catch (error) {
    console.error('[MessageSync] Shopeeポーリングエラー:', error)
    return []
  }
}

/**
 * eBayメッセージを取得
 */
async function pollEbayMessages(): Promise<Message[]> {
  try {
    // eBay Trading API を呼び出し
    // TODO: 実際のeBay Trading APIを実装
    console.log('[MessageSync] eBayメッセージポーリング')

    return []
  } catch (error) {
    console.error('[MessageSync] eBayポーリングエラー:', error)
    return []
  }
}

/**
 * Amazonメッセージを取得
 */
async function pollAmazonMessages(): Promise<Message[]> {
  try {
    // Amazon SP-API を呼び出し
    // TODO: 実際のAmazon SP-APIを実装
    console.log('[MessageSync] Amazonメッセージポーリング')

    return []
  } catch (error) {
    console.error('[MessageSync] Amazonポーリングエラー:', error)
    return []
  }
}

/**
 * Mercariメッセージを取得
 */
async function pollMercariMessages(): Promise<Message[]> {
  try {
    // Mercari API を呼び出し
    console.log('[MessageSync] Mercariメッセージポーリング')

    return []
  } catch (error) {
    console.error('[MessageSync] Mercariポーリングエラー:', error)
    return []
  }
}

/**
 * AI で緊急度を判定
 */
async function classifyUrgencyWithAI(message: Message): Promise<{
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  ai_category: string
  suggested_response?: string
}> {
  try {
    // Gemini API を呼び出してメッセージの緊急度を判定
    const response = await fetch('/api/ai/classify-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: message.subject,
        body: message.body,
        marketplace: message.marketplace,
      }),
    })

    const result = await response.json()

    if (result.success) {
      return {
        urgency_level: result.urgency_level,
        ai_category: result.category,
        suggested_response: result.suggested_response,
      }
    }

    // デフォルト判定（キーワードベース）
    return classifyUrgencyByKeywords(message)
  } catch (error) {
    console.error('[MessageSync] AI判定エラー:', error)
    return classifyUrgencyByKeywords(message)
  }
}

/**
 * キーワードベースの緊急度判定（フォールバック）
 */
function classifyUrgencyByKeywords(message: Message): {
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  ai_category: string
} {
  const text = `${message.subject} ${message.body}`.toLowerCase()

  // クリティカル: 返金、クレーム、法的問題
  if (
    text.includes('返金') ||
    text.includes('refund') ||
    text.includes('クレーム') ||
    text.includes('complaint') ||
    text.includes('弁護士') ||
    text.includes('lawyer') ||
    text.includes('詐欺') ||
    text.includes('fraud')
  ) {
    return { urgency_level: 'critical', ai_category: 'クレーム・返金' }
  }

  // 高優先度: 配送問題、商品不良
  if (
    text.includes('届かない') ||
    text.includes('not received') ||
    text.includes('破損') ||
    text.includes('damaged') ||
    text.includes('不良品') ||
    text.includes('defective')
  ) {
    return { urgency_level: 'high', ai_category: '配送・商品問題' }
  }

  // 中優先度: 一般的な質問
  if (
    text.includes('質問') ||
    text.includes('question') ||
    text.includes('サイズ') ||
    text.includes('size') ||
    text.includes('色') ||
    text.includes('color')
  ) {
    return { urgency_level: 'medium', ai_category: '商品に関する質問' }
  }

  // 低優先度: その他
  return { urgency_level: 'low', ai_category: 'その他' }
}

/**
 * メッセージをDBに保存
 */
async function saveMessage(
  message: Message,
  urgency: {
    urgency_level: 'critical' | 'high' | 'medium' | 'low'
    ai_category: string
    suggested_response?: string
  }
): Promise<void> {
  await supabase.from('messages').insert({
    marketplace: message.marketplace,
    message_id: message.message_id,
    buyer_id: message.buyer_id,
    buyer_name: message.buyer_name,
    subject: message.subject,
    body: message.body,
    received_at: message.received_at,
    urgency_level: urgency.urgency_level,
    ai_category: urgency.ai_category,
    suggested_response: urgency.suggested_response,
    status: urgency.urgency_level === 'critical' ? 'urgent' : 'pending',
  })
}

/**
 * 全モールからメッセージをポーリング（I4-5）
 */
export async function pollAllMalls(): Promise<{
  total_messages: number
  critical: number
  high: number
  medium: number
  low: number
  by_marketplace: Record<string, number>
}> {
  console.log('[MessageSyncService] メッセージポーリング開始')

  try {
    // 各モールからメッセージを取得
    const [shopeeMessages, ebayMessages, amazonMessages, mercariMessages] = await Promise.all([
      pollShopeeMessages(),
      pollEbayMessages(),
      pollAmazonMessages(),
      pollMercariMessages(),
    ])

    const allMessages = [...shopeeMessages, ...ebayMessages, ...amazonMessages, ...mercariMessages]

    if (allMessages.length === 0) {
      console.log('[MessageSyncService] 新着メッセージなし')
      return {
        total_messages: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        by_marketplace: {},
      }
    }

    console.log(`[MessageSyncService] 新着メッセージ: ${allMessages.length}件`)

    let critical = 0
    let high = 0
    let medium = 0
    let low = 0
    const by_marketplace: Record<string, number> = {}

    // 各メッセージの緊急度を判定
    for (const message of allMessages) {
      const urgency = await classifyUrgencyWithAI(message)

      // DBに保存
      await saveMessage(message, urgency)

      // カウント
      switch (urgency.urgency_level) {
        case 'critical':
          critical++
          break
        case 'high':
          high++
          break
        case 'medium':
          medium++
          break
        case 'low':
          low++
          break
      }

      by_marketplace[message.marketplace] = (by_marketplace[message.marketplace] || 0) + 1

      // クリティカルなメッセージは通知
      if (urgency.urgency_level === 'critical') {
        console.warn(`[MessageSync] 🚨 クリティカルメッセージ: ${message.marketplace} - ${message.subject}`)
        // TODO: Slack/Email通知を実装
      }
    }

    console.log('[MessageSyncService] メッセージポーリング完了')
    console.log(`  新着: ${allMessages.length}件`)
    console.log(`  クリティカル: ${critical}件`)
    console.log(`  高優先度: ${high}件`)
    console.log(`  中優先度: ${medium}件`)
    console.log(`  低優先度: ${low}件`)

    return {
      total_messages: allMessages.length,
      critical,
      high,
      medium,
      low,
      by_marketplace,
    }
  } catch (error) {
    console.error('[MessageSyncService] メッセージポーリングエラー:', error)
    throw error
  }
}
