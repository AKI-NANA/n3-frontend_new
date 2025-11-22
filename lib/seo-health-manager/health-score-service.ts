/**
 * health-score-service.ts
 *
 * SEO健全性スコアサービス（Gemini Vision API連携）
 *
 * 機能:
 * - リスティングのタイトル、説明文、画像を総合的に分析
 * - Gemini Vision APIで画像品質とポリシー違反を検出
 * - より魅力的なタイトル案を生成
 * - SEO健全性スコア（0-100）を算出
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/client'

interface ListingData {
  id: string
  sku: string
  title: string
  description?: string
  images: string[]
  marketplace: string
  category?: string
  price?: number
}

interface HealthScoreResult {
  overall_score: number // 0-100
  title_score: number
  image_score: number
  description_score: number

  issues: {
    severity: 'critical' | 'high' | 'medium' | 'low'
    type: string
    message: string
  }[]

  improvements: {
    suggested_title?: string
    suggested_description?: string
    image_issues: string[]
  }

  ai_analysis?: {
    title_feedback: string
    image_feedback: string
    seo_keywords: string[]
  }
}

export class HealthScoreService {
  private genAI: GoogleGenerativeAI | null = null
  private apiKey: string | null = null

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
      console.log('✅ Gemini Vision API initialized for SEO analysis')
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set - HealthScoreService will run in basic mode')
    }
  }

  /**
   * リスティングの健全性スコアを算出
   */
  async calculateHealthScore(listing: ListingData): Promise<HealthScoreResult> {
    const result: HealthScoreResult = {
      overall_score: 0,
      title_score: 0,
      image_score: 0,
      description_score: 0,
      issues: [],
      improvements: {
        image_issues: [],
      },
    }

    // タイトルスコア算出
    result.title_score = this.analyzeTitleBasic(listing.title)

    // 画像スコア算出
    result.image_score = this.analyzeImagesBasic(listing.images)

    // 説明文スコア算出
    result.description_score = this.analyzeDescriptionBasic(listing.description)

    // Gemini API利用可能な場合はAI分析を追加
    if (this.genAI && this.apiKey && result.overall_score < 70) {
      try {
        const aiAnalysis = await this.analyzeWithGeminiVision(listing)
        result.ai_analysis = aiAnalysis

        // AI提案でスコアを調整
        if (aiAnalysis.suggested_title) {
          result.improvements.suggested_title = aiAnalysis.suggested_title
        }
        if (aiAnalysis.suggested_description) {
          result.improvements.suggested_description = aiAnalysis.suggested_description
        }

      } catch (error) {
        console.error('❌ Gemini Vision分析エラー:', error)
      }
    }

    // 総合スコア算出
    result.overall_score = Math.round(
      result.title_score * 0.4 +
      result.image_score * 0.4 +
      result.description_score * 0.2
    )

    // 問題点の抽出
    this.extractIssues(result, listing)

    return result
  }

  /**
   * Gemini Vision APIでリスティングを分析
   */
  private async analyzeWithGeminiVision(listing: ListingData): Promise<{
    title_feedback: string
    image_feedback: string
    seo_keywords: string[]
    suggested_title?: string
    suggested_description?: string
  }> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized')
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // 画像データを準備（最大3枚）
    const imagePromises = listing.images.slice(0, 3).map(async (imageUrl) => {
      try {
        const response = await fetch(imageUrl)
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        return {
          inlineData: {
            data: base64,
            mimeType: response.headers.get('content-type') || 'image/jpeg',
          },
        }
      } catch (error) {
        console.error('画像取得エラー:', imageUrl, error)
        return null
      }
    })

    const imageParts = (await Promise.all(imagePromises)).filter(img => img !== null)

    const prompt = `
あなたはEコマースのSEO専門家です。以下のリスティングを分析してください。

【リスティング情報】
- タイトル: ${listing.title}
- 説明文: ${listing.description || 'なし'}
- カテゴリ: ${listing.category || '不明'}
- マーケットプレイス: ${listing.marketplace}
- 価格: ${listing.price ? `¥${listing.price}` : '不明'}

【画像】
${listing.images.length}枚の画像を添付しました。

【分析タスク】
1. **タイトル分析**: 現在のタイトルの問題点と改善案を提示
2. **画像分析**: 画像の品質、マーケットプレイスポリシー違反の可能性を指摘
3. **SEOキーワード**: 検索されやすいキーワードを5-10個提案

【画像ポリシーチェック項目】
- 画質が低い、ぼやけている
- 商品が小さすぎる
- 背景が乱雑
- ウォーターマークや文字入れ（禁止されている場合）
- 商品以外のものが写り込んでいる
- プロフェッショナルな見た目でない

【タイトル改善の指針】
- SEOキーワードを前半に配置
- 商品の特徴・用途を明確に
- 数字やスペックを含める
- 80文字以内に収める

以下のJSON形式で返答してください:

{
  "title_feedback": "現在のタイトルの問題点と改善ポイント",
  "suggested_title": "改善されたタイトル案",
  "image_feedback": "画像の問題点と改善案",
  "image_issues": ["問題1", "問題2"],
  "seo_keywords": ["キーワード1", "キーワード2"],
  "suggested_description": "SEO最適化された説明文案（任意）"
}

JSONのみを返してください。説明文は不要です。
`.trim()

    console.log('🤖 Gemini Vision APIにリクエスト送信中...')

    const parts = [{ text: prompt }, ...imageParts]
    const result = await model.generateContent(parts as any)
    const response = await result.response
    const text = response.text()

    console.log('✅ Gemini Vision APIレスポンス受信')

    // JSONをパース
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('JSONレスポンスが見つかりません')
    }

    const jsonText = jsonMatch[1] || jsonMatch[0]
    const parsed = JSON.parse(jsonText)

    return {
      title_feedback: parsed.title_feedback || '',
      image_feedback: parsed.image_feedback || '',
      seo_keywords: parsed.seo_keywords || [],
      suggested_title: parsed.suggested_title,
      suggested_description: parsed.suggested_description,
    }
  }

  /**
   * タイトルの基本分析
   */
  private analyzeTitleBasic(title: string): number {
    let score = 50

    // 長さチェック
    if (title.length >= 30 && title.length <= 80) score += 20
    else if (title.length < 20) score -= 15

    // キーワード密度チェック
    const words = title.split(/\s+/)
    if (words.length >= 5) score += 10

    // 数字やスペックが含まれているか
    if (/\d+/.test(title)) score += 10

    // 記号が多すぎないか
    const symbolCount = (title.match(/[!?★☆]/g) || []).length
    if (symbolCount > 3) score -= 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 画像の基本分析
   */
  private analyzeImagesBasic(images: string[]): number {
    let score = 50

    // 画像数チェック
    if (images.length >= 5) score += 30
    else if (images.length >= 3) score += 20
    else if (images.length >= 1) score += 10
    else score = 0

    // 画像URLの品質チェック（簡易）
    const hasHighQualityUrls = images.some(url =>
      url.includes('large') || url.includes('1000') || url.includes('2000')
    )
    if (hasHighQualityUrls) score += 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 説明文の基本分析
   */
  private analyzeDescriptionBasic(description?: string): number {
    if (!description) return 0

    let score = 50

    // 長さチェック
    if (description.length >= 200 && description.length <= 2000) score += 30
    else if (description.length >= 100) score += 15

    // HTMLタグの有無
    if (/<[a-z][\s\S]*>/i.test(description)) score += 10

    // 改行やリストの使用
    if (description.includes('\n') || description.includes('<li>')) score += 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 問題点を抽出
   */
  private extractIssues(result: HealthScoreResult, listing: ListingData): void {
    if (result.title_score < 50) {
      result.issues.push({
        severity: 'high',
        type: 'title',
        message: 'タイトルが短すぎるか、SEOに最適化されていません',
      })
    }

    if (result.image_score < 50) {
      result.issues.push({
        severity: 'high',
        type: 'image',
        message: '画像が不足しているか、品質が低い可能性があります',
      })
    }

    if (listing.images.length === 0) {
      result.issues.push({
        severity: 'critical',
        type: 'image',
        message: '画像が1枚もありません',
      })
    }

    if (!listing.description || listing.description.length < 100) {
      result.issues.push({
        severity: 'medium',
        type: 'description',
        message: '説明文が不足しています',
      })
    }
  }

  /**
   * 全リスティングのスコアを更新（バッチ処理）
   */
  async updateAllListings(limit: number = 100): Promise<{
    processed: number
    updated: number
    errors: string[]
  }> {
    console.log('🔄 全リスティングのSEO健全性スコアを更新中...')

    const supabase = createClient()
    const errors: string[] = []
    let processed = 0
    let updated = 0

    try {
      // health_scoreが低い、または未計算のリスティングを取得
      const { data: listings, error } = await supabase
        .from('products_master')
        .select('id, sku, title, description, images, listing_data')
        .or('health_score.is.null,health_score.lt.70')
        .limit(limit)

      if (error) throw error

      console.log(`📊 ${listings?.length || 0}件のリスティングを処理`)

      for (const listing of listings || []) {
        try {
          const listingData: ListingData = {
            id: listing.id,
            sku: listing.sku,
            title: listing.title,
            description: listing.description,
            images: listing.images || [],
            marketplace: 'unknown',
          }

          const result = await this.calculateHealthScore(listingData)

          // Supabaseに更新
          const { error: updateError } = await supabase
            .from('products_master')
            .update({
              health_score: result.overall_score,
              health_score_details: result,
              health_score_updated_at: new Date().toISOString(),
            })
            .eq('id', listing.id)

          if (updateError) {
            errors.push(`${listing.sku}: ${updateError.message}`)
          } else {
            updated++
          }

          processed++

          // レート制限対策
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error: any) {
          console.error(`❌ ${listing.sku}の処理エラー:`, error)
          errors.push(`${listing.sku}: ${error.message}`)
        }
      }

    } catch (error: any) {
      console.error('❌ バッチ処理エラー:', error)
      errors.push(`Batch error: ${error.message}`)
    }

    console.log(`✅ 処理完了: ${processed}件処理、${updated}件更新`)

    return { processed, updated, errors }
  }
}

/**
 * シングルトンインスタンス
 */
let healthScoreServiceInstance: HealthScoreService | null = null

export function getHealthScoreService(): HealthScoreService {
  if (!healthScoreServiceInstance) {
    healthScoreServiceInstance = new HealthScoreService()
  }
  return healthScoreServiceInstance
}
