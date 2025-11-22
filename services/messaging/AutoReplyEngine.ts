/**
 * AutoReplyEngine.ts
 *
 * AI自動返信エンジン（Gemini API連携）
 *
 * 機能:
 * - 顧客メッセージを分析し、緊急度を判定
 * - 注文情報と配送状況を含めた返信メールを自動生成
 * - Gemini 2.5 Flash APIで高速かつ高品質な応答を実現
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

interface CustomerMessage {
  id: string
  customer_name: string
  customer_email: string
  message_body: string
  order_id?: string
  marketplace: string
  received_at: string
}

interface OrderContext {
  order_id: string
  product_name: string
  order_date: string
  order_status: string
  tracking_number?: string
  estimated_delivery?: string
}

interface AutoReplyResult {
  success: boolean
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  suggested_reply: string
  requires_human_review: boolean
  analysis: {
    sentiment: 'positive' | 'neutral' | 'negative'
    intent: string
    key_concerns: string[]
  }
  error?: string
}

export class AutoReplyEngine {
  private genAI: GoogleGenerativeAI | null = null
  private apiKey: string | null = null

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
      console.log('✅ Gemini API initialized')
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set - AutoReplyEngine will run in fallback mode')
    }
  }

  /**
   * 顧客メッセージを分析し、自動返信を生成
   */
  async generateReply(
    message: CustomerMessage,
    orderContext?: OrderContext
  ): Promise<AutoReplyResult> {
    try {
      // APIキー未設定時のフォールバック
      if (!this.genAI || !this.apiKey) {
        return this.getFallbackReply(message, orderContext)
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      // プロンプト構築
      const prompt = this.buildPrompt(message, orderContext)

      console.log('🤖 Gemini APIにリクエスト送信中...')

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // レスポンスをパース
      const parsedResult = this.parseGeminiResponse(text)

      console.log('✅ Gemini APIレスポンス受信:', {
        urgency: parsedResult.urgency_level,
        requiresReview: parsedResult.requires_human_review,
      })

      return {
        success: true,
        ...parsedResult,
      }

    } catch (error: any) {
      console.error('❌ Gemini API エラー:', error)

      return {
        success: false,
        urgency_level: 'high',
        suggested_reply: '',
        requires_human_review: true,
        analysis: {
          sentiment: 'neutral',
          intent: 'unknown',
          key_concerns: [],
        },
        error: error.message,
      }
    }
  }

  /**
   * Gemini APIへのプロンプトを構築
   */
  private buildPrompt(message: CustomerMessage, orderContext?: OrderContext): string {
    const contextInfo = orderContext
      ? `
【注文情報】
- 注文ID: ${orderContext.order_id}
- 商品名: ${orderContext.product_name}
- 注文日: ${orderContext.order_date}
- ステータス: ${orderContext.order_status}
${orderContext.tracking_number ? `- 追跡番号: ${orderContext.tracking_number}` : ''}
${orderContext.estimated_delivery ? `- 配送予定日: ${orderContext.estimated_delivery}` : ''}
`
      : '【注文情報】なし'

    return `
あなたはEコマースのカスタマーサポート担当AIです。以下の顧客からのメッセージを分析し、適切な返信を生成してください。

【顧客情報】
- 名前: ${message.customer_name}
- メールアドレス: ${message.customer_email}
- マーケットプレイス: ${message.marketplace}
- 受信日時: ${message.received_at}

${contextInfo}

【顧客メッセージ】
${message.message_body}

【指示】
以下のJSON形式で返答してください:

{
  "urgency_level": "critical|high|medium|low",
  "requires_human_review": true|false,
  "sentiment": "positive|neutral|negative",
  "intent": "問い合わせの意図を要約",
  "key_concerns": ["懸念事項1", "懸念事項2"],
  "suggested_reply": "顧客への返信メール文面（日本語、丁寧語、具体的な情報を含む）"
}

【緊急度の判定基準】
- critical: 配送トラブル、返金要求、クレーム
- high: 配送状況の問い合わせ、商品不具合の報告
- medium: 一般的な質問、使い方の問い合わせ
- low: お礼、レビュー、一般的なフィードバック

【返信メールの条件】
1. 顧客名で呼びかける
2. 注文情報がある場合は必ず言及する
3. 具体的な解決策や次のステップを提示
4. 丁寧で親しみやすいトーン
5. 署名は「カスタマーサポートチーム」

JSONのみを返してください。説明文は不要です。
`.trim()
  }

  /**
   * Gemini APIのレスポンスをパース
   */
  private parseGeminiResponse(text: string): Omit<AutoReplyResult, 'success' | 'error'> {
    try {
      // JSONブロックを抽出（```json ... ``` の形式に対応）
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                       text.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        throw new Error('JSONレスポンスが見つかりません')
      }

      const jsonText = jsonMatch[1] || jsonMatch[0]
      const parsed = JSON.parse(jsonText)

      return {
        urgency_level: parsed.urgency_level || 'medium',
        suggested_reply: parsed.suggested_reply || '',
        requires_human_review: parsed.requires_human_review ?? true,
        analysis: {
          sentiment: parsed.sentiment || 'neutral',
          intent: parsed.intent || '',
          key_concerns: parsed.key_concerns || [],
        },
      }
    } catch (error) {
      console.error('❌ Geminiレスポンスのパースエラー:', error)
      console.error('Raw response:', text)

      // パースエラー時はテキストをそのまま返信として使用
      return {
        urgency_level: 'medium',
        suggested_reply: text,
        requires_human_review: true,
        analysis: {
          sentiment: 'neutral',
          intent: 'unknown',
          key_concerns: [],
        },
      }
    }
  }

  /**
   * APIキー未設定時のフォールバックロジック
   */
  private getFallbackReply(
    message: CustomerMessage,
    orderContext?: OrderContext
  ): AutoReplyResult {
    console.warn('⚠️ Gemini API未設定 - フォールバックモードで動作')

    // 簡易的なキーワードベースの緊急度判定
    const urgentKeywords = ['至急', '緊急', 'クレーム', '返金', 'キャンセル', '届かない', '壊れ']
    const highKeywords = ['配送', '追跡', '遅延', 'いつ', '発送']

    const messageBody = message.message_body.toLowerCase()

    let urgency: 'critical' | 'high' | 'medium' | 'low' = 'medium'

    if (urgentKeywords.some(kw => messageBody.includes(kw))) {
      urgency = 'critical'
    } else if (highKeywords.some(kw => messageBody.includes(kw))) {
      urgency = 'high'
    }

    const fallbackReply = `${message.customer_name} 様

お問い合わせいただきありがとうございます。

${orderContext ? `ご注文（注文ID: ${orderContext.order_id}）に関するお問い合わせを承りました。` : 'お問い合わせ内容を確認いたしました。'}

担当者が詳細を確認の上、できるだけ早くご返信させていただきます。
今しばらくお待ちくださいますようお願い申し上げます。

何かご不明な点がございましたら、お気軽にお問い合わせください。

カスタマーサポートチーム
`

    return {
      success: true,
      urgency_level: urgency,
      suggested_reply: fallbackReply,
      requires_human_review: true,
      analysis: {
        sentiment: 'neutral',
        intent: 'Fallback mode - manual review required',
        key_concerns: ['APIキー未設定のため詳細分析不可'],
      },
    }
  }

  /**
   * 一括メッセージ処理
   */
  async processMessages(messages: CustomerMessage[]): Promise<Map<string, AutoReplyResult>> {
    const results = new Map<string, AutoReplyResult>()

    for (const message of messages) {
      try {
        // 注文IDがある場合は注文情報を取得（実装は省略）
        const orderContext = message.order_id
          ? await this.fetchOrderContext(message.order_id)
          : undefined

        const result = await this.generateReply(message, orderContext)
        results.set(message.id, result)

        // レート制限対策（1秒あたり最大15リクエスト）
        await new Promise(resolve => setTimeout(resolve, 70))

      } catch (error) {
        console.error(`❌ メッセージ ${message.id} の処理エラー:`, error)
      }
    }

    return results
  }

  /**
   * 注文情報を取得（Supabaseから）
   */
  private async fetchOrderContext(orderId: string): Promise<OrderContext | undefined> {
    try {
      // TODO: Supabaseから注文情報を取得
      // const { createClient } = await import('@/lib/supabase/client')
      // const supabase = createClient()
      // const { data } = await supabase.from('marketplace_orders').select('*').eq('order_id', orderId).single()

      return undefined
    } catch (error) {
      console.error('注文情報の取得エラー:', error)
      return undefined
    }
  }
}

/**
 * シングルトンインスタンス
 */
let autoReplyEngineInstance: AutoReplyEngine | null = null

export function getAutoReplyEngine(): AutoReplyEngine {
  if (!autoReplyEngineInstance) {
    autoReplyEngineInstance = new AutoReplyEngine()
  }
  return autoReplyEngineInstance
}

/**
 * 使用例:
 *
 * const engine = getAutoReplyEngine()
 * const result = await engine.generateReply({
 *   id: 'msg-123',
 *   customer_name: '山田太郎',
 *   customer_email: 'yamada@example.com',
 *   message_body: '商品がまだ届いていません。追跡番号を教えてください。',
 *   order_id: 'order-456',
 *   marketplace: 'amazon_jp',
 *   received_at: new Date().toISOString(),
 * })
 *
 * if (result.success) {
 *   console.log('緊急度:', result.urgency_level)
 *   console.log('返信案:', result.suggested_reply)
 * }
 */
