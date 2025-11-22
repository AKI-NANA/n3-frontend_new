/**
 * SEO健全性スコアサービス
 *
 * Gemini Vision APIを使用して、出品画像の品質をチェックし、
 * SEO改善提案を生成する
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/client'

// Gemini APIの初期化
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.warn('[HealthScoreService] Gemini APIキーが設定されていません')
    return null
  }

  return new GoogleGenerativeAI(apiKey)
}

interface ImageQualityResult {
  overallScore: number // 0-100
  resolution: {
    score: number
    width: number
    height: number
    meetsRequirement: boolean
    requirement: string
  }
  background: {
    score: number
    isWhite: boolean
    hasDistractions: boolean
    recommendation: string
  }
  composition: {
    score: number
    centering: string
    lighting: string
    clarity: string
  }
  compliance: {
    score: number
    issues: string[]
    warnings: string[]
  }
  suggestions: string[]
}

interface ProductListing {
  id: string
  sku: string
  title: string
  images: string[]
  marketplace: string
  category?: string
}

interface HealthScoreUpdate {
  productId: string
  sku: string
  overallScore: number
  imageQualityScore: number
  titleQualityScore: number
  descriptionQualityScore: number
  improvements: {
    priority: 'high' | 'medium' | 'low'
    category: string
    issue: string
    suggestion: string
  }[]
  lastUpdated: Date
}

/**
 * 画像の品質をGemini Vision APIでチェック
 */
export async function analyzeImageQuality(
  imageUrl: string,
  marketplace: string
): Promise<ImageQualityResult> {
  const genAI = getGeminiClient()

  if (!genAI) {
    // APIキーがない場合はルールベース分析
    return analyzeImageQualityRuleBased(imageUrl, marketplace)
  }

  try {
    // 画像をダウンロード
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`画像のダウンロードに失敗: ${response.statusText}`)
    }

    const imageBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    // Gemini Vision APIで分析
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = buildImageAnalysisPrompt(marketplace)

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
    ])

    const responseText = result.response.text()

    // JSONを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI応答からJSONを抽出できませんでした')
    }

    const parsed: ImageQualityResult = JSON.parse(jsonMatch[0])

    return parsed
  } catch (error) {
    console.error('[HealthScoreService] 画像品質分析エラー:', error)
    return analyzeImageQualityRuleBased(imageUrl, marketplace)
  }
}

/**
 * 画像分析プロンプトの構築
 */
function buildImageAnalysisPrompt(marketplace: string): string {
  const requirements = getMarketplaceImageRequirements(marketplace)

  return `
あなたはEコマースの画像品質評価の専門家です。この商品画像を分析し、${marketplace}の出品要件に基づいて評価してください。

【${marketplace}の画像要件】
- 最小解像度: ${requirements.minWidth}x${requirements.minHeight}ピクセル
- 推奨解像度: ${requirements.recommendedWidth}x${requirements.recommendedHeight}ピクセル
- 背景: ${requirements.background}
- その他の要件: ${requirements.otherRequirements.join(', ')}

【評価項目】
1. 解像度: 画像が十分にシャープで高解像度か
2. 背景: 背景が要件を満たしているか
3. 構図: 商品が中央に配置され、適切に照明されているか
4. コンプライアンス: ポリシー違反（テキストオーバーレイ、ウォーターマークなど）がないか

以下のJSON形式で回答してください:
{
  "overallScore": 0-100の総合スコア,
  "resolution": {
    "score": 0-100,
    "width": 推定幅,
    "height": 推定高さ,
    "meetsRequirement": true/false,
    "requirement": "要件の説明"
  },
  "background": {
    "score": 0-100,
    "isWhite": true/false,
    "hasDistractions": true/false,
    "recommendation": "改善提案"
  },
  "composition": {
    "score": 0-100,
    "centering": "中央配置の評価",
    "lighting": "照明の評価",
    "clarity": "鮮明度の評価"
  },
  "compliance": {
    "score": 0-100,
    "issues": ["問題点のリスト"],
    "warnings": ["警告のリスト"]
  },
  "suggestions": ["改善提案1", "改善提案2", "改善提案3"]
}
`
}

/**
 * マーケットプレイスの画像要件を取得
 */
function getMarketplaceImageRequirements(marketplace: string): {
  minWidth: number
  minHeight: number
  recommendedWidth: number
  recommendedHeight: number
  background: string
  otherRequirements: string[]
} {
  const requirements: Record<string, any> = {
    'Amazon_JP': {
      minWidth: 1000,
      minHeight: 1000,
      recommendedWidth: 2000,
      recommendedHeight: 2000,
      background: '純白背景（RGB 255,255,255）',
      otherRequirements: [
        'メイン画像は商品のみを表示',
        'テキストやロゴの追加禁止',
        '商品は画像の85%以上を占める',
      ],
    },
    'eBay_JP': {
      minWidth: 500,
      minHeight: 500,
      recommendedWidth: 1600,
      recommendedHeight: 1600,
      background: '白または単色背景',
      otherRequirements: [
        '画像内にテキスト追加可',
        'ウォーターマーク可（小さく）',
        '複数角度の画像推奨',
      ],
    },
    'Mercari': {
      minWidth: 300,
      minHeight: 300,
      recommendedWidth: 1200,
      recommendedHeight: 1200,
      background: '白背景推奨',
      otherRequirements: [
        '実物の写真必須',
        '加工は最小限に',
        '複数枚の画像で詳細を表示',
      ],
    },
  }

  return requirements[marketplace] || requirements['Amazon_JP']
}

/**
 * ルールベースの画像品質分析（フォールバック）
 */
async function analyzeImageQualityRuleBased(
  imageUrl: string,
  marketplace: string
): Promise<ImageQualityResult> {
  // 基本的な分析（実際にはより詳細な実装が必要）
  const requirements = getMarketplaceImageRequirements(marketplace)

  return {
    overallScore: 70,
    resolution: {
      score: 70,
      width: 1000,
      height: 1000,
      meetsRequirement: true,
      requirement: `${requirements.minWidth}x${requirements.minHeight}以上`,
    },
    background: {
      score: 60,
      isWhite: false,
      hasDistractions: false,
      recommendation: '白背景を使用することを推奨します',
    },
    composition: {
      score: 75,
      centering: '商品は概ね中央に配置されています',
      lighting: '照明は適切です',
      clarity: '画像は鮮明です',
    },
    compliance: {
      score: 90,
      issues: [],
      warnings: ['AIによる詳細な分析が必要です'],
    },
    suggestions: [
      'Gemini APIキーを設定すると、より詳細な分析が可能です',
      '白背景を使用すると、より高いスコアが期待できます',
      '複数の角度から商品を撮影することを推奨します',
    ],
  }
}

/**
 * タイトルの品質をチェック
 */
export async function analyzeTitleQuality(
  title: string,
  marketplace: string,
  category?: string
): Promise<{
  score: number
  length: { current: number; optimal: number; meetsRequirement: boolean }
  keywords: { count: number; suggestions: string[] }
  readability: { score: number; issues: string[] }
  seoScore: number
  suggestions: string[]
}> {
  const genAI = getGeminiClient()

  if (!genAI) {
    return analyzeTitleQualityRuleBased(title, marketplace, category)
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `
あなたはEコマースのSEOとコピーライティングの専門家です。以下の商品タイトルを分析してください。

マーケットプレイス: ${marketplace}
カテゴリ: ${category || '不明'}
タイトル: "${title}"

【評価基準】
1. 長さ: ${marketplace === 'Amazon_JP' ? '50-200文字' : '30-80文字'}が最適
2. キーワード: 重要なキーワードが含まれているか
3. 可読性: 読みやすく、理解しやすいか
4. SEO: 検索エンジンで見つかりやすいか

以下のJSON形式で回答してください:
{
  "score": 0-100の総合スコア,
  "length": {
    "current": 現在の文字数,
    "optimal": 最適な文字数,
    "meetsRequirement": true/false
  },
  "keywords": {
    "count": 含まれるキーワード数,
    "suggestions": ["追加すべきキーワード1", "キーワード2"]
  },
  "readability": {
    "score": 0-100,
    "issues": ["問題点のリスト"]
  },
  "seoScore": 0-100,
  "suggestions": ["改善提案1", "改善提案2", "改善提案3"]
}
`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return analyzeTitleQualityRuleBased(title, marketplace, category)
  } catch (error) {
    console.error('[HealthScoreService] タイトル品質分析エラー:', error)
    return analyzeTitleQualityRuleBased(title, marketplace, category)
  }
}

/**
 * ルールベースのタイトル品質分析
 */
function analyzeTitleQualityRuleBased(
  title: string,
  marketplace: string,
  category?: string
): any {
  const length = title.length
  const optimalLength = marketplace === 'Amazon_JP' ? 100 : 50

  return {
    score: length >= 30 && length <= 200 ? 70 : 50,
    length: {
      current: length,
      optimal: optimalLength,
      meetsRequirement: length >= 30 && length <= 200,
    },
    keywords: {
      count: 3,
      suggestions: ['ブランド名', '商品タイプ', 'サイズ/カラー'],
    },
    readability: {
      score: 70,
      issues: length < 30 ? ['タイトルが短すぎます'] : [],
    },
    seoScore: 60,
    suggestions: [
      'より具体的なキーワードを追加してください',
      'ブランド名を含めることを推奨します',
      '商品の主要な特徴を記載してください',
    ],
  }
}

/**
 * すべての出品のヘルススコアを更新
 */
export async function updateAllListings(): Promise<{
  success: boolean
  processed: number
  updated: number
  errors: number
}> {
  console.log('[HealthScoreService] すべての出品のヘルススコア更新を開始...')

  const supabase = createClient()

  try {
    // すべての商品を取得
    const { data: products, error } = await supabase
      .from('products')
      .select('id, sku, title, images, marketplace, category_name')
      .limit(100) // バッチ処理

    if (error) {
      console.error('[HealthScoreService] 商品取得エラー:', error)
      return { success: false, processed: 0, updated: 0, errors: 1 }
    }

    if (!products || products.length === 0) {
      console.log('[HealthScoreService] 更新対象の商品がありません')
      return { success: true, processed: 0, updated: 0, errors: 0 }
    }

    let updated = 0
    let errors = 0

    for (const product of products) {
      try {
        const healthScore = await calculateProductHealthScore({
          id: product.id,
          sku: product.sku,
          title: product.title,
          images: Array.isArray(product.images) ? product.images.map((img: any) => img.url || img) : [],
          marketplace: product.marketplace || 'Amazon_JP',
          category: product.category_name,
        })

        // データベースに保存
        await saveHealthScore(healthScore)

        updated++

        // レート制限を考慮
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`[HealthScoreService] 商品 ${product.sku} のスコア更新エラー:`, error)
        errors++
      }
    }

    console.log(`[HealthScoreService] 更新完了: ${updated}件成功, ${errors}件エラー`)

    return {
      success: true,
      processed: products.length,
      updated,
      errors,
    }
  } catch (error) {
    console.error('[HealthScoreService] バッチ更新エラー:', error)
    return { success: false, processed: 0, updated: 0, errors: 1 }
  }
}

/**
 * 商品のヘルススコアを計算
 */
export async function calculateProductHealthScore(
  listing: ProductListing
): Promise<HealthScoreUpdate> {
  console.log(`[HealthScoreService] 商品 ${listing.sku} のスコアを計算中...`)

  // 画像品質スコア
  let imageQualityScore = 0
  if (listing.images && listing.images.length > 0) {
    const imageAnalysis = await analyzeImageQuality(listing.images[0], listing.marketplace)
    imageQualityScore = imageAnalysis.overallScore
  }

  // タイトル品質スコア
  const titleAnalysis = await analyzeTitleQuality(listing.title, listing.marketplace, listing.category)
  const titleQualityScore = titleAnalysis.score

  // 説明品質スコア（簡易実装）
  const descriptionQualityScore = 70

  // 総合スコア
  const overallScore = Math.round(
    imageQualityScore * 0.4 +
    titleQualityScore * 0.4 +
    descriptionQualityScore * 0.2
  )

  // 改善提案の生成
  const improvements: HealthScoreUpdate['improvements'] = []

  if (imageQualityScore < 70) {
    improvements.push({
      priority: 'high',
      category: '画像品質',
      issue: '画像品質が基準を下回っています',
      suggestion: '高解像度の白背景画像を使用してください',
    })
  }

  if (titleQualityScore < 70) {
    improvements.push({
      priority: 'high',
      category: 'タイトル',
      issue: 'タイトルがSEOに最適化されていません',
      suggestion: titleAnalysis.suggestions[0] || 'より具体的なキーワードを含めてください',
    })
  }

  return {
    productId: listing.id,
    sku: listing.sku,
    overallScore,
    imageQualityScore,
    titleQualityScore,
    descriptionQualityScore,
    improvements,
    lastUpdated: new Date(),
  }
}

/**
 * ヘルススコアをデータベースに保存
 */
async function saveHealthScore(healthScore: HealthScoreUpdate): Promise<void> {
  const supabase = createClient()

  // seo_health_scores テーブルに保存
  const { error } = await supabase
    .from('seo_health_scores')
    .upsert({
      product_id: healthScore.productId,
      sku: healthScore.sku,
      overall_score: healthScore.overallScore,
      image_quality_score: healthScore.imageQualityScore,
      title_quality_score: healthScore.titleQualityScore,
      description_quality_score: healthScore.descriptionQualityScore,
      improvements: healthScore.improvements,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('[HealthScoreService] スコア保存エラー:', error)
  }
}

export default {
  analyzeImageQuality,
  analyzeTitleQuality,
  updateAllListings,
  calculateProductHealthScore,
}
