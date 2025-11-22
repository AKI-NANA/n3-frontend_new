/**
 * RiskAnalyzer.ts
 *
 * 注文リスク分析サービス（AI強化版）
 *
 * 機能:
 * - 注文データ、仕入れ元情報、刈り取りアラートを総合分析
 * - Gemini AIで仕入れ元の信頼性と季節的価格変動リスクを評価
 * - AIリスクスコア（0-100）を算出し、orders_v2に記録
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/client'

interface OrderData {
  order_id: string
  product_id: string
  sku: string
  marketplace: string
  quantity: number
  sale_price: number
  customer_name: string
  order_date: string
}

interface SupplierData {
  supplier_url?: string
  supplier_name?: string
  supplier_rating?: number
  purchase_history_count?: number
  average_delivery_days?: number
}

interface ArbitrageAlertData {
  current_price: number
  historical_avg_price?: number
  price_volatility?: number
  bsr?: number
  profit_margin?: number
}

interface RiskAnalysisResult {
  ai_risk_score: number // 0-100（100が最も安全）
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_factors: {
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    mitigation?: string
  }[]
  ai_insights?: {
    supplier_trustworthiness: string
    price_volatility_analysis: string
    seasonal_risk: string
    recommendations: string[]
  }
}

export class RiskAnalyzer {
  private genAI: GoogleGenerativeAI | null = null
  private apiKey: string | null = null
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null
    this.supabase = createClient()

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
      console.log('✅ Gemini API initialized for risk analysis')
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set - RiskAnalyzer will use basic scoring')
    }
  }

  /**
   * 注文リスクを分析
   */
  async analyzeOrderRisk(orderData: OrderData): Promise<RiskAnalysisResult> {
    console.log(`🔍 注文リスク分析開始: ${orderData.order_id}`)

    // 仕入れ元データを取得
    const supplierData = await this.fetchSupplierData(orderData.product_id)

    // 刈り取りアラートデータを取得
    const arbitrageData = await this.fetchArbitrageData(orderData.product_id)

    // 基本リスクスコアを算出
    let baseScore = 100
    const riskFactors: RiskAnalysisResult['risk_factors'] = []

    // Phase 1: 基本的なリスク要因をチェック
    this.checkBasicRisks(orderData, supplierData, arbitrageData, riskFactors, baseScore)

    // Phase 2: AIによる高度な分析
    let aiInsights: RiskAnalysisResult['ai_insights'] | undefined

    if (this.genAI && this.apiKey && baseScore < 80) {
      try {
        aiInsights = await this.analyzeWithAI(orderData, supplierData, arbitrageData)

        // AI分析結果をスコアに反映
        if (aiInsights.supplier_trustworthiness.includes('低い') ||
            aiInsights.supplier_trustworthiness.includes('疑わしい')) {
          baseScore -= 15
          riskFactors.push({
            type: 'supplier_trust',
            severity: 'high',
            description: 'AI分析: 仕入れ元の信頼性に懸念あり',
            mitigation: aiInsights.recommendations[0],
          })
        }

        if (aiInsights.seasonal_risk.includes('高い')) {
          baseScore -= 10
          riskFactors.push({
            type: 'seasonal_volatility',
            severity: 'medium',
            description: 'AI分析: 季節的な価格変動リスクが高い',
            mitigation: '在庫を最小限に抑え、需要予測を強化',
          })
        }

      } catch (error) {
        console.error('❌ AI分析エラー:', error)
      }
    }

    // 最終スコアとリスクレベルを決定
    const finalScore = Math.max(0, Math.min(100, baseScore))
    const riskLevel = this.determineRiskLevel(finalScore)

    console.log(`✅ リスク分析完了: スコア=${finalScore}, レベル=${riskLevel}`)

    return {
      ai_risk_score: finalScore,
      risk_level: riskLevel,
      risk_factors: riskFactors,
      ai_insights: aiInsights,
    }
  }

  /**
   * 基本的なリスクチェック
   */
  private checkBasicRisks(
    order: OrderData,
    supplier: SupplierData,
    arbitrage: ArbitrageAlertData,
    riskFactors: RiskAnalysisResult['risk_factors'],
    baseScore: number
  ): void {
    // 仕入れ元の評価チェック
    if (supplier.supplier_rating && supplier.supplier_rating < 4.0) {
      baseScore -= 15
      riskFactors.push({
        type: 'supplier_rating',
        severity: 'high',
        description: `仕入れ元の評価が低い (${supplier.supplier_rating}/5.0)`,
        mitigation: '別の仕入れ元を検討するか、発注前に在庫を確認',
      })
    }

    // 仕入れ履歴チェック
    if (!supplier.purchase_history_count || supplier.purchase_history_count < 3) {
      baseScore -= 10
      riskFactors.push({
        type: 'supplier_history',
        severity: 'medium',
        description: '仕入れ元との取引履歴が少ない',
        mitigation: '初回は少量発注でテスト',
      })
    }

    // 配送日数チェック
    if (supplier.average_delivery_days && supplier.average_delivery_days > 7) {
      baseScore -= 5
      riskFactors.push({
        type: 'delivery_delay',
        severity: 'low',
        description: `配送に平均${supplier.average_delivery_days}日かかる`,
        mitigation: '顧客に配送日数を事前通知',
      })
    }

    // 価格変動リスク
    if (arbitrage.price_volatility && arbitrage.price_volatility > 0.3) {
      baseScore -= 12
      riskFactors.push({
        type: 'price_volatility',
        severity: 'high',
        description: `価格変動率が高い (${(arbitrage.price_volatility * 100).toFixed(1)}%)`,
        mitigation: '仕入れ価格を頻繁に確認し、利益率を維持',
      })
    }

    // 利益率チェック
    if (arbitrage.profit_margin && arbitrage.profit_margin < 0.15) {
      baseScore -= 8
      riskFactors.push({
        type: 'low_margin',
        severity: 'medium',
        description: `利益率が低い (${(arbitrage.profit_margin * 100).toFixed(1)}%)`,
        mitigation: '価格改定または販売中止を検討',
      })
    }

    // BSR（売れ行き）チェック
    if (arbitrage.bsr && arbitrage.bsr > 50000) {
      baseScore -= 6
      riskFactors.push({
        type: 'slow_sales',
        severity: 'low',
        description: `BSRが高く、売れ行きが遅い (${arbitrage.bsr}位)`,
        mitigation: '在庫保有期間を短く設定',
      })
    }
  }

  /**
   * AIによる高度な分析
   */
  private async analyzeWithAI(
    order: OrderData,
    supplier: SupplierData,
    arbitrage: ArbitrageAlertData
  ): Promise<RiskAnalysisResult['ai_insights']> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized')
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `
あなたはEコマースのリスク管理専門家です。以下の注文データを分析し、リスクを評価してください。

【注文情報】
- 注文ID: ${order.order_id}
- SKU: ${order.sku}
- マーケットプレイス: ${order.marketplace}
- 販売価格: ¥${order.sale_price}
- 注文日: ${order.order_date}

【仕入れ元情報】
- 仕入れ元: ${supplier.supplier_name || '不明'}
- URL: ${supplier.supplier_url || 'なし'}
- 評価: ${supplier.supplier_rating ? `${supplier.supplier_rating}/5.0` : '不明'}
- 取引履歴: ${supplier.purchase_history_count || 0}回
- 平均配送日数: ${supplier.average_delivery_days || '不明'}日

【刈り取りデータ】
- 現在価格: ¥${arbitrage.current_price}
- 過去平均価格: ¥${arbitrage.historical_avg_price || '不明'}
- 価格変動率: ${arbitrage.price_volatility ? `${(arbitrage.price_volatility * 100).toFixed(1)}%` : '不明'}
- BSR (ランキング): ${arbitrage.bsr || '不明'}
- 利益率: ${arbitrage.profit_margin ? `${(arbitrage.profit_margin * 100).toFixed(1)}%` : '不明'}

【分析タスク】
1. **仕入れ元の信頼性**: 評価、取引履歴、配送日数から総合的に判断
2. **価格変動リスク**: 過去の価格推移から今後の価格変動を予測
3. **季節的リスク**: 現在の時期（${new Date().toLocaleDateString('ja-JP')}）を考慮し、季節変動を分析
4. **推奨事項**: リスクを軽減するための具体的なアクションプラン

以下のJSON形式で返答してください:

{
  "supplier_trustworthiness": "仕入れ元の信頼性評価（50-100文字）",
  "price_volatility_analysis": "価格変動の分析と今後の予測（50-100文字）",
  "seasonal_risk": "季節的なリスクの評価（50-100文字）",
  "recommendations": ["推奨事項1", "推奨事項2", "推奨事項3"]
}

JSONのみを返してください。説明文は不要です。
`.trim()

    console.log('🤖 Gemini APIでリスク分析中...')

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log('✅ Gemini AIリスク分析完了')

    // JSONをパース
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('JSONレスポンスが見つかりません')
    }

    const jsonText = jsonMatch[1] || jsonMatch[0]
    const parsed = JSON.parse(jsonText)

    return {
      supplier_trustworthiness: parsed.supplier_trustworthiness || '評価不可',
      price_volatility_analysis: parsed.price_volatility_analysis || '分析不可',
      seasonal_risk: parsed.seasonal_risk || '不明',
      recommendations: parsed.recommendations || [],
    }
  }

  /**
   * リスクレベルを決定
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'low'
    if (score >= 60) return 'medium'
    if (score >= 40) return 'high'
    return 'critical'
  }

  /**
   * 仕入れ元データを取得
   */
  private async fetchSupplierData(productId: string): Promise<SupplierData> {
    try {
      const { data } = await this.supabase
        .from('products_master')
        .select('supplier_source_url, cost')
        .eq('id', productId)
        .single()

      // TODO: 仕入れ元の評価履歴を取得
      // const { data: historyData } = await this.supabase
      //   .from('arbitrage_orders')
      //   .select('*')
      //   .eq('product_id', productId)

      return {
        supplier_url: data?.supplier_source_url,
        supplier_name: '仕入れ元',
        supplier_rating: undefined,
        purchase_history_count: 0,
        average_delivery_days: undefined,
      }
    } catch (error) {
      console.error('仕入れ元データ取得エラー:', error)
      return {}
    }
  }

  /**
   * 刈り取りアラートデータを取得
   */
  private async fetchArbitrageData(productId: string): Promise<ArbitrageAlertData> {
    try {
      const { data } = await this.supabase
        .from('products_master')
        .select('cost, price, arbitrage_score, keepa_data')
        .eq('id', productId)
        .single()

      const profit_margin = data?.price && data?.cost
        ? (data.price - data.cost) / data.price
        : undefined

      return {
        current_price: data?.cost || 0,
        profit_margin,
        bsr: data?.keepa_data?.sales_rank,
        price_volatility: undefined,
      }
    } catch (error) {
      console.error('刈り取りデータ取得エラー:', error)
      return { current_price: 0 }
    }
  }

  /**
   * リスクスコアをDBに記録
   */
  async saveRiskScore(orderId: string, result: RiskAnalysisResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('marketplace_orders')
        .update({
          ai_risk_score: result.ai_risk_score,
          risk_level: result.risk_level,
          risk_analysis_data: result,
          risk_analyzed_at: new Date().toISOString(),
        })
        .eq('order_id', orderId)

      if (error) throw error

      console.log(`✅ リスクスコア保存完了: ${orderId}`)
    } catch (error) {
      console.error('❌ リスクスコア保存エラー:', error)
    }
  }
}

/**
 * シングルトンインスタンス
 */
let riskAnalyzerInstance: RiskAnalyzer | null = null

export function getRiskAnalyzer(): RiskAnalyzer {
  if (!riskAnalyzerInstance) {
    riskAnalyzerInstance = new RiskAnalyzer()
  }
  return riskAnalyzerInstance
}
