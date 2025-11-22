/**
 * HealthScoreService - SEO健全性スコアの更新サービス
 * AI改善提案を含む、商品リスティングの健全性を評価
 */

import { supabase } from '@/lib/supabase'

interface HealthScoreResult {
  product_id: string
  sku: string
  overall_score: number
  seo_score: number
  image_score: number
  description_score: number
  pricing_score: number
  ai_suggestions: string[]
}

/**
 * SEOスコアの計算
 */
function calculateSEOScore(product: any): number {
  let score = 0

  // タイトル長（最適: 50-80文字）
  const titleLength = product.title?.length || 0
  if (titleLength >= 50 && titleLength <= 80) {
    score += 25
  } else if (titleLength >= 30 && titleLength < 50) {
    score += 15
  }

  // 説明文の存在
  if (product.description && product.description.length > 100) {
    score += 25
  }

  // キーワードの存在
  if (product.keywords && product.keywords.length > 0) {
    score += 25
  }

  // カテゴリの設定
  if (product.category_name) {
    score += 25
  }

  return score
}

/**
 * 画像スコアの計算
 */
function calculateImageScore(product: any): number {
  let score = 0

  const imageCount = product.images?.length || 0

  // 画像数（最適: 5枚以上）
  if (imageCount >= 5) {
    score += 50
  } else if (imageCount >= 3) {
    score += 30
  } else if (imageCount >= 1) {
    score += 10
  }

  // メイン画像の存在
  const hasMainImage = product.images?.some((img: any) => img.isMain)
  if (hasMainImage) {
    score += 50
  }

  return score
}

/**
 * 説明文スコアの計算
 */
function calculateDescriptionScore(product: any): number {
  let score = 0

  const descriptionLength = product.description?.length || 0

  // 説明文の長さ（最適: 500文字以上）
  if (descriptionLength >= 500) {
    score += 50
  } else if (descriptionLength >= 200) {
    score += 30
  } else if (descriptionLength >= 50) {
    score += 10
  }

  // 箇条書きの存在
  if (product.description?.includes('•') || product.description?.includes('-')) {
    score += 25
  }

  // HTMLタグの使用
  if (product.description?.includes('<ul>') || product.description?.includes('<li>')) {
    score += 25
  }

  return score
}

/**
 * 価格スコアの計算
 */
function calculatePricingScore(product: any): number {
  let score = 0

  // 価格の設定
  if (product.price && product.price > 0) {
    score += 25
  }

  // コストの設定
  if (product.cost && product.cost > 0) {
    score += 25
  }

  // 利益率の計算
  if (product.price && product.cost) {
    const profitMargin = ((product.price - product.cost) / product.price) * 100
    if (profitMargin >= 30) {
      score += 50
    } else if (profitMargin >= 15) {
      score += 25
    }
  }

  return score
}

/**
 * AI改善提案の生成
 */
function generateAISuggestions(product: any, scores: any): string[] {
  const suggestions: string[] = []

  // SEOスコアが低い場合
  if (scores.seo_score < 50) {
    if (!product.title || product.title.length < 50) {
      suggestions.push('タイトルを50-80文字に最適化してください')
    }
    if (!product.description || product.description.length < 100) {
      suggestions.push('詳細な商品説明を追加してください（推奨: 500文字以上）')
    }
    if (!product.keywords || product.keywords.length === 0) {
      suggestions.push('検索キーワードを追加してください')
    }
  }

  // 画像スコアが低い場合
  if (scores.image_score < 50) {
    const imageCount = product.images?.length || 0
    if (imageCount < 5) {
      suggestions.push(`商品画像を追加してください（現在: ${imageCount}枚、推奨: 5枚以上）`)
    }
  }

  // 説明文スコアが低い場合
  if (scores.description_score < 50) {
    suggestions.push('箇条書きを使用して商品の特徴を明確に記載してください')
  }

  // 価格スコアが低い場合
  if (scores.pricing_score < 50) {
    if (!product.cost) {
      suggestions.push('仕入れコストを設定してください')
    }
    if (product.price && product.cost) {
      const profitMargin = ((product.price - product.cost) / product.price) * 100
      if (profitMargin < 15) {
        suggestions.push(`利益率が低すぎます（現在: ${profitMargin.toFixed(1)}%、推奨: 30%以上）`)
      }
    }
  }

  return suggestions
}

/**
 * 単一商品の健全性スコアを更新
 */
async function updateProductHealthScore(product: any): Promise<HealthScoreResult> {
  const seo_score = calculateSEOScore(product)
  const image_score = calculateImageScore(product)
  const description_score = calculateDescriptionScore(product)
  const pricing_score = calculatePricingScore(product)

  const overall_score = Math.round((seo_score + image_score + description_score + pricing_score) / 4)

  const scores = { seo_score, image_score, description_score, pricing_score }
  const ai_suggestions = generateAISuggestions(product, scores)

  // スコアをDBに保存
  await supabase
    .from('products')
    .update({
      health_score: overall_score,
      seo_score,
      image_score,
      description_score,
      pricing_score,
      ai_suggestions,
      last_health_check: new Date().toISOString(),
    })
    .eq('id', product.id)

  return {
    product_id: product.id,
    sku: product.sku,
    overall_score,
    seo_score,
    image_score,
    description_score,
    pricing_score,
    ai_suggestions,
  }
}

/**
 * 全商品の健全性スコアを更新（I4-2）
 */
export async function updateAllListings(): Promise<{
  total_processed: number
  avg_overall_score: number
  low_score_count: number
}> {
  console.log('[HealthScoreService] 全商品の健全性スコア更新開始')

  try {
    // 全商品を取得
    const { data: products, error } = await supabase
      .from('products')
      .select('id, sku, title, description, price, cost, images, keywords, category_name')
      .limit(1000)

    if (error) {
      console.error('[HealthScoreService] 商品取得エラー:', error)
      throw error
    }

    if (!products || products.length === 0) {
      console.log('[HealthScoreService] 更新対象商品なし')
      return { total_processed: 0, avg_overall_score: 0, low_score_count: 0 }
    }

    console.log(`[HealthScoreService] ${products.length}件の商品を処理します`)

    let totalScore = 0
    let lowScoreCount = 0

    // 各商品のスコアを更新
    for (const product of products) {
      const result = await updateProductHealthScore(product)
      totalScore += result.overall_score

      if (result.overall_score < 50) {
        lowScoreCount++
      }
    }

    const avg_overall_score = Math.round(totalScore / products.length)

    console.log('[HealthScoreService] 全商品の健全性スコア更新完了')
    console.log(`  処理件数: ${products.length}件`)
    console.log(`  平均スコア: ${avg_overall_score}`)
    console.log(`  低スコア商品: ${lowScoreCount}件`)

    return {
      total_processed: products.length,
      avg_overall_score,
      low_score_count: lowScoreCount,
    }
  } catch (error) {
    console.error('[HealthScoreService] 健全性スコア更新エラー:', error)
    throw error
  }
}
