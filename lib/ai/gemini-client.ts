/**
 * Gemini API クライアント
 * メッセージ分類、SEO改善提案、リスク分析
 */

export interface GeminiConfig {
  apiKey: string
  model: string
}

/**
 * Gemini設定を取得
 */
function getGeminiConfig(): GeminiConfig {
  return {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-pro',
  }
}

/**
 * Gemini APIを呼び出し
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const config = getGeminiConfig()

  if (!config.apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません')
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text
    }

    throw new Error('Gemini API から有効なレスポンスがありませんでした')
  } catch (error: any) {
    console.error('[Gemini] API呼び出しエラー:', error)
    throw error
  }
}

/**
 * メッセージの緊急度を分類
 */
export async function classifyMessageUrgency(message: {
  subject: string
  body: string
  marketplace: string
}): Promise<{
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  category: string
  reasoning: string
  suggested_response?: string
}> {
  const prompt = `
あなたはEコマースのカスタマーサポート専門家です。以下のメッセージの緊急度を判定してください。

モール: ${message.marketplace}
件名: ${message.subject}
本文: ${message.body}

以下の形式でJSON形式のみで回答してください：
{
  "urgency_level": "critical | high | medium | low",
  "category": "カテゴリ（例: クレーム・返金、配送問題、商品に関する質問）",
  "reasoning": "判定理由",
  "suggested_response": "推奨する返信内容（簡潔に）"
}

判定基準：
- critical: 返金要求、法的問題、重大なクレーム
- high: 配送遅延、商品不良、緊急の質問
- medium: 一般的な質問、サイズ・色の確認
- low: その他、定型的な問い合わせ
`

  try {
    const response = await callGeminiAPI(prompt)

    // JSONを抽出（\`\`\`json ... \`\`\` の形式に対応）
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/)
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response

    const result = JSON.parse(jsonText.trim())

    return {
      urgency_level: result.urgency_level || 'medium',
      category: result.category || 'その他',
      reasoning: result.reasoning || '',
      suggested_response: result.suggested_response,
    }
  } catch (error) {
    console.error('[Gemini] メッセージ分類エラー:', error)

    // フォールバック: キーワードベースの分類
    return {
      urgency_level: 'medium',
      category: 'その他',
      reasoning: 'AI分類に失敗したため、デフォルト値を使用',
    }
  }
}

/**
 * SEO改善提案を生成
 */
export async function generateSEOSuggestions(product: {
  title: string
  description: string
  category: string
  price: number
}): Promise<{
  title_suggestions: string[]
  description_suggestions: string[]
  keyword_suggestions: string[]
  overall_assessment: string
}> {
  const prompt = `
あなたはEコマースSEOの専門家です。以下の商品のSEOを改善するための提案をしてください。

商品タイトル: ${product.title}
商品説明: ${product.description}
カテゴリ: ${product.category}
価格: ¥${product.price}

以下の形式でJSON形式のみで回答してください：
{
  "title_suggestions": ["タイトル改善案1", "タイトル改善案2"],
  "description_suggestions": ["説明文改善案1", "説明文改善案2"],
  "keyword_suggestions": ["キーワード1", "キーワード2", "キーワード3"],
  "overall_assessment": "全体的な評価とアドバイス"
}

改善のポイント：
- タイトルは50-80文字が最適
- 具体的な特徴や利点を記載
- 検索されやすいキーワードを含める
- 箇条書きで特徴を明確に
`

  try {
    const response = await callGeminiAPI(prompt)

    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/)
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response

    const result = JSON.parse(jsonText.trim())

    return {
      title_suggestions: result.title_suggestions || [],
      description_suggestions: result.description_suggestions || [],
      keyword_suggestions: result.keyword_suggestions || [],
      overall_assessment: result.overall_assessment || '',
    }
  } catch (error) {
    console.error('[Gemini] SEO提案生成エラー:', error)

    return {
      title_suggestions: [],
      description_suggestions: [],
      keyword_suggestions: [],
      overall_assessment: 'AI提案生成に失敗しました',
    }
  }
}

/**
 * リスク分析
 */
export async function analyzeProductRisk(product: {
  title: string
  description: string
  price: number
  cost: number
  category: string
}): Promise<{
  risk_level: 'high' | 'medium' | 'low'
  risk_factors: string[]
  recommendations: string[]
}> {
  const profitMargin = ((product.price - product.cost) / product.price) * 100

  const prompt = `
あなたはEコマースのリスク分析専門家です。以下の商品のビジネスリスクを分析してください。

商品タイトル: ${product.title}
商品説明: ${product.description}
カテゴリ: ${product.category}
販売価格: ¥${product.price}
仕入価格: ¥${product.cost}
利益率: ${profitMargin.toFixed(1)}%

以下の形式でJSON形式のみで回答してください：
{
  "risk_level": "high | medium | low",
  "risk_factors": ["リスク要因1", "リスク要因2"],
  "recommendations": ["推奨アクション1", "推奨アクション2"]
}

評価ポイント：
- 利益率（30%以上が推奨）
- 価格競争力
- 市場需要
- 法的リスク（商標、知的財産権）
`

  try {
    const response = await callGeminiAPI(prompt)

    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/)
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response

    const result = JSON.parse(jsonText.trim())

    return {
      risk_level: result.risk_level || 'medium',
      risk_factors: result.risk_factors || [],
      recommendations: result.recommendations || [],
    }
  } catch (error) {
    console.error('[Gemini] リスク分析エラー:', error)

    return {
      risk_level: 'medium',
      risk_factors: [],
      recommendations: [],
    }
  }
}
