/**
 * AI自動返信エンジン
 *
 * Gemini API (gemini-2.5-flash) を使用して、顧客メッセージに対する
 * コンプライアンス適合の返信を自動生成
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini APIの初期化
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.warn('[AutoReplyEngine] Gemini APIキーが設定されていません')
    return null
  }

  return new GoogleGenerativeAI(apiKey)
}

interface MessageContext {
  customerMessage: string
  orderId?: string
  orderStatus?: string
  productTitle?: string
  marketplace: string
  customerName?: string
  previousMessages?: Array<{
    sender: 'customer' | 'seller'
    message: string
    timestamp: Date
  }>
}

interface ReplyResult {
  success: boolean
  reply?: string
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  requiresManualReview?: boolean
  aiConfidence?: number
  error?: string
}

/**
 * 顧客メッセージの緊急度を判定
 */
export async function analyzeMessageUrgency(message: string): Promise<{
  urgency: 'low' | 'medium' | 'high' | 'critical'
  reason: string
}> {
  const genAI = getGeminiClient()

  if (!genAI) {
    // APIキーがない場合はルールベースで判定
    return analyzeUrgencyRuleBased(message)
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `
あなたはEコマースのカスタマーサポート管理者です。以下の顧客メッセージの緊急度を判定してください。

顧客メッセージ:
"""
${message}
"""

緊急度の定義:
- critical: 即座の対応が必要（返金要求、法的措置の示唆、重大なクレーム）
- high: 24時間以内の対応が必要（配送遅延のクレーム、商品の重大な問題）
- medium: 2-3日以内の対応で良い（一般的な質問、軽微な問題）
- low: 急ぎでない（一般的な問い合わせ）

以下のJSON形式で回答してください:
{
  "urgency": "low" | "medium" | "high" | "critical",
  "reason": "判定理由を日本語で簡潔に"
}
`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        urgency: parsed.urgency,
        reason: parsed.reason,
      }
    }

    // JSONが取得できない場合はルールベース
    return analyzeUrgencyRuleBased(message)
  } catch (error) {
    console.error('[AutoReplyEngine] 緊急度判定エラー:', error)
    return analyzeUrgencyRuleBased(message)
  }
}

/**
 * ルールベースの緊急度判定（フォールバック）
 */
function analyzeUrgencyRuleBased(message: string): {
  urgency: 'low' | 'medium' | 'high' | 'critical'
  reason: string
} {
  const lowerMessage = message.toLowerCase()

  // Critical keywords
  const criticalKeywords = [
    '返金', 'refund', '詐欺', 'fraud', '警察', 'police', '弁護士', 'lawyer',
    '訴訟', 'lawsuit', '消費者センター', '法的', 'legal'
  ]

  // High keywords
  const highKeywords = [
    '届かない', 'not received', '壊れ', 'broken', '違う', 'wrong', '不良品', 'defective',
    '至急', 'urgent', '緊急', 'emergency', 'いつ', 'when'
  ]

  // Medium keywords
  const mediumKeywords = [
    '質問', 'question', '確認', 'confirm', '変更', 'change', 'キャンセル', 'cancel'
  ]

  if (criticalKeywords.some(kw => lowerMessage.includes(kw))) {
    return {
      urgency: 'critical',
      reason: '返金要求や法的措置を示唆するキーワードが含まれています',
    }
  }

  if (highKeywords.some(kw => lowerMessage.includes(kw))) {
    return {
      urgency: 'high',
      reason: '配送や商品の重大な問題が報告されています',
    }
  }

  if (mediumKeywords.some(kw => lowerMessage.includes(kw))) {
    return {
      urgency: 'medium',
      reason: '一般的な質問や変更依頼です',
    }
  }

  return {
    urgency: 'low',
    reason: '通常の問い合わせです',
  }
}

/**
 * AI自動返信を生成
 */
export async function generateAutoReply(context: MessageContext): Promise<ReplyResult> {
  const genAI = getGeminiClient()

  if (!genAI) {
    return {
      success: false,
      error: 'Gemini APIキーが設定されていません。環境変数 GEMINI_API_KEY または GOOGLE_AI_API_KEY を設定してください。',
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // 緊急度を事前に判定
    const urgencyAnalysis = await analyzeMessageUrgency(context.customerMessage)

    // プロンプトの構築
    const prompt = buildReplyPrompt(context, urgencyAnalysis.urgency)

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI応答からJSONを抽出できませんでした')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      success: true,
      reply: parsed.reply,
      urgency: urgencyAnalysis.urgency,
      requiresManualReview: parsed.requiresManualReview || urgencyAnalysis.urgency === 'critical',
      aiConfidence: parsed.confidence || 0.8,
    }
  } catch (error) {
    console.error('[AutoReplyEngine] 返信生成エラー:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      urgency: 'high',
      requiresManualReview: true,
    }
  }
}

/**
 * 返信生成プロンプトの構築
 */
function buildReplyPrompt(context: MessageContext, urgency: string): string {
  const { customerMessage, orderId, orderStatus, productTitle, marketplace, customerName, previousMessages } = context

  let conversationHistory = ''
  if (previousMessages && previousMessages.length > 0) {
    conversationHistory = '\n過去のやり取り:\n'
    previousMessages.forEach((msg, idx) => {
      conversationHistory += `${idx + 1}. [${msg.sender === 'customer' ? '顧客' : '販売者'}] ${msg.message}\n`
    })
  }

  const prompt = `
あなたは${marketplace}で販売するプロフェッショナルなEコマースセラーのカスタマーサポート担当者です。
以下の顧客メッセージに対して、適切な返信を生成してください。

【重要なガイドライン】
1. 丁寧で親切な対応を心がけてください
2. モールのコンプライアンスポリシーに違反しない内容にしてください
3. 具体的で実行可能な解決策を提示してください
4. 必要に応じて謝罪し、迅速な対応を約束してください
5. 外部サイトへの誘導は避けてください（モールポリシー違反）
6. 個人情報の収集は最小限にしてください

【顧客情報】
- 顧客名: ${customerName || '不明'}
- 注文ID: ${orderId || 'なし'}
- 注文ステータス: ${orderStatus || '不明'}
- 商品: ${productTitle || '不明'}
- マーケットプレイス: ${marketplace}
- メッセージ緊急度: ${urgency}

【顧客メッセージ】
"""
${customerMessage}
"""
${conversationHistory}

【返信形式】
以下のJSON形式で返信を生成してください:
{
  "reply": "顧客への返信文（日本語、丁寧語）",
  "requiresManualReview": true/false（人間の確認が必要かどうか）,
  "confidence": 0.0-1.0（AIの自信度）,
  "suggestedActions": ["推奨される次のアクション1", "アクション2"]
}

【返信例】
緊急度が高い場合:
"○○様

この度はご不便をおかけして誠に申し訳ございません。
お問い合わせの件について、早急に確認し対応させていただきます。

[具体的な解決策や次のステップ]

24時間以内にご連絡いたしますので、今しばらくお待ちくださいませ。
何かご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。"

通常の問い合わせの場合:
"○○様

お問い合わせいただきありがとうございます。

[質問への回答や情報提供]

その他ご不明な点がございましたら、お気軽にお問い合わせください。
引き続きよろしくお願いいたします。"
`

  return prompt
}

/**
 * バッチ処理: 複数メッセージの自動返信生成
 */
export async function generateBatchReplies(
  messages: MessageContext[]
): Promise<Map<string, ReplyResult>> {
  const results = new Map<string, ReplyResult>()

  console.log(`[AutoReplyEngine] ${messages.length}件のメッセージを処理中...`)

  for (const message of messages) {
    const messageId = message.orderId || `msg_${Date.now()}`

    try {
      const result = await generateAutoReply(message)
      results.set(messageId, result)

      // レート制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`[AutoReplyEngine] メッセージ ${messageId} の処理エラー:`, error)
      results.set(messageId, {
        success: false,
        error: '処理エラー',
        requiresManualReview: true,
      })
    }
  }

  console.log(`[AutoReplyEngine] バッチ処理完了: ${results.size}件`)

  return results
}

/**
 * 返信のコンプライアンスチェック
 */
export async function checkReplyCompliance(reply: string, marketplace: string): Promise<{
  isCompliant: boolean
  issues: string[]
  suggestions: string[]
}> {
  const genAI = getGeminiClient()

  if (!genAI) {
    // ルールベースでチェック
    return checkComplianceRuleBased(reply, marketplace)
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `
あなたは${marketplace}のコンプライアンス専門家です。以下の返信メッセージがモールのポリシーに違反していないかチェックしてください。

返信メッセージ:
"""
${reply}
"""

チェック項目:
1. 外部サイトへの誘導がないか
2. 直接取引の提案がないか
3. 個人情報の過度な収集がないか
4. 不適切な表現がないか
5. 虚偽の情報提供がないか

以下のJSON形式で回答してください:
{
  "isCompliant": true/false,
  "issues": ["問題点1", "問題点2"],
  "suggestions": ["改善案1", "改善案2"]
}
`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed
    }

    return checkComplianceRuleBased(reply, marketplace)
  } catch (error) {
    console.error('[AutoReplyEngine] コンプライアンスチェックエラー:', error)
    return checkComplianceRuleBased(reply, marketplace)
  }
}

/**
 * ルールベースのコンプライアンスチェック
 */
function checkComplianceRuleBased(reply: string, marketplace: string): {
  isCompliant: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []

  const lowerReply = reply.toLowerCase()

  // 外部サイトへの誘導チェック
  const externalSitePatterns = [
    'http://', 'https://', 'www.', '.com', '.jp', '.co.jp',
    'line', 'メール', 'email', '電話番号', 'phone'
  ]

  externalSitePatterns.forEach(pattern => {
    if (lowerReply.includes(pattern)) {
      issues.push(`外部サイトへの誘導の可能性: "${pattern}"`)
      suggestions.push('モール内のメッセージング機能のみを使用してください')
    }
  })

  // 直接取引の提案チェック
  const directDealPatterns = ['直接', 'direct', '別途', '個別', '特別価格']
  directDealPatterns.forEach(pattern => {
    if (lowerReply.includes(pattern)) {
      issues.push(`直接取引の示唆の可能性: "${pattern}"`)
      suggestions.push('すべての取引はモールを通じて行ってください')
    }
  })

  // 個人情報収集チェック
  const personalInfoPatterns = ['住所', 'address', 'クレジットカード', 'credit card', '口座', 'account']
  personalInfoPatterns.forEach(pattern => {
    if (lowerReply.includes(pattern)) {
      issues.push(`個人情報の収集の可能性: "${pattern}"`)
      suggestions.push('個人情報はモールシステムを通じて管理してください')
    }
  })

  return {
    isCompliant: issues.length === 0,
    issues,
    suggestions,
  }
}

export default {
  analyzeMessageUrgency,
  generateAutoReply,
  generateBatchReplies,
  checkReplyCompliance,
}
