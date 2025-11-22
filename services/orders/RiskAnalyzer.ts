/**
 * AI注文リスク分析サービス
 *
 * Gemini APIを使用して、注文時のリスクをリアルタイムで分析し、
 * orders_v2.ai_risk_scoreを更新
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/client'

// Gemini APIの初期化
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.warn('[RiskAnalyzer] Gemini APIキーが設定されていません')
    return null
  }

  return new GoogleGenerativeAI(apiKey)
}

interface OrderContext {
  orderId: string
  customerId?: string
  productSku: string
  productTitle: string
  quantity: number
  totalAmount: number
  marketplace: string
  shippingAddress?: string
  customerHistory?: {
    totalOrders: number
    cancelledOrders: number
    disputedOrders: number
    averageRating: number
  }
}

interface SupplierHistory {
  supplierId: string
  supplierName: string
  totalOrders: number
  successfulOrders: number
  failedOrders: number
  averageLeadTime: number
  qualityIssues: number
  recentProblems: Array<{
    date: Date
    issue: string
    severity: 'low' | 'medium' | 'high'
  }>
}

interface MarketCondition {
  productSku: string
  currentPrice: number
  priceHistory: Array<{
    date: Date
    price: number
  }>
  competitorCount: number
  marketTrend: 'rising' | 'stable' | 'declining'
  volatilityScore: number // 0-100
}

interface RiskAnalysisResult {
  overallRiskScore: number // 0-100 (高いほどリスクが高い)
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: {
    supplier: {
      score: number
      issues: string[]
      reliability: number
    }
    market: {
      score: number
      volatility: number
      priceStability: number
      issues: string[]
    }
    customer: {
      score: number
      trustLevel: number
      issues: string[]
    }
    inventory: {
      score: number
      availability: boolean
      leadTime: number
      issues: string[]
    }
  }
  recommendations: string[]
  requiresManualReview: boolean
  confidence: number // 0-1
}

/**
 * 注文のリスクを分析
 */
export async function analyzeOrderRisk(
  orderContext: OrderContext,
  supplierHistory: SupplierHistory,
  marketCondition: MarketCondition
): Promise<RiskAnalysisResult> {
  const genAI = getGeminiClient()

  if (!genAI) {
    // APIキーがない場合はルールベース分析
    return analyzeOrderRiskRuleBased(orderContext, supplierHistory, marketCondition)
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = buildRiskAnalysisPrompt(orderContext, supplierHistory, marketCondition)

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // JSONを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI応答からJSONを抽出できませんでした')
    }

    const analysis: RiskAnalysisResult = JSON.parse(jsonMatch[0])

    // データベースに保存
    await saveRiskScore(orderContext.orderId, analysis.overallRiskScore, analysis)

    return analysis
  } catch (error) {
    console.error('[RiskAnalyzer] リスク分析エラー:', error)
    return analyzeOrderRiskRuleBased(orderContext, supplierHistory, marketCondition)
  }
}

/**
 * リスク分析プロンプトの構築
 */
function buildRiskAnalysisPrompt(
  orderContext: OrderContext,
  supplierHistory: SupplierHistory,
  marketCondition: MarketCondition
): string {
  return `
あなたは無在庫輸入ビジネスのリスク管理専門家です。以下の注文データを分析し、リスクを評価してください。

【注文情報】
- 注文ID: ${orderContext.orderId}
- 商品: ${orderContext.productTitle} (SKU: ${orderContext.productSku})
- 数量: ${orderContext.quantity}
- 金額: ${orderContext.totalAmount}円
- マーケットプレイス: ${orderContext.marketplace}

【顧客履歴】
${orderContext.customerHistory ? `
- 総注文数: ${orderContext.customerHistory.totalOrders}
- キャンセル数: ${orderContext.customerHistory.cancelledOrders}
- クレーム数: ${orderContext.customerHistory.disputedOrders}
- 平均評価: ${orderContext.customerHistory.averageRating}/5.0
` : '- データなし'}

【仕入れ元履歴】
- 仕入れ元: ${supplierHistory.supplierName}
- 総注文数: ${supplierHistory.totalOrders}
- 成功率: ${((supplierHistory.successfulOrders / supplierHistory.totalOrders) * 100).toFixed(1)}%
- 平均リードタイム: ${supplierHistory.averageLeadTime}日
- 品質問題: ${supplierHistory.qualityIssues}件
- 最近の問題: ${supplierHistory.recentProblems.map(p => `${p.issue} (${p.severity})`).join(', ')}

【市場状況】
- 現在価格: ${marketCondition.currentPrice}円
- 市場トレンド: ${marketCondition.marketTrend}
- 競合数: ${marketCondition.competitorCount}
- 価格変動性: ${marketCondition.volatilityScore}/100

【リスク評価基準】
1. 仕入れ元リスク (30点):
   - 成功率が90%未満: リスク増
   - 品質問題が多い: リスク増
   - 最近のトラブル: リスク増

2. 市場リスク (30点):
   - 価格変動性が高い (>50): リスク増
   - 競合が急増: リスク増
   - 価格下落トレンド: リスク増

3. 顧客リスク (20点):
   - キャンセル率が高い: リスク増
   - クレーム履歴: リスク増
   - 新規顧客: リスク中

4. 在庫リスク (20点):
   - リードタイムが長い (>14日): リスク増
   - 仕入れ元の信頼性が低い: リスク増

以下のJSON形式で回答してください:
{
  "overallRiskScore": 0-100の総合リスクスコア,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "riskFactors": {
    "supplier": {
      "score": 0-100,
      "issues": ["問題点のリスト"],
      "reliability": 0-100
    },
    "market": {
      "score": 0-100,
      "volatility": 0-100,
      "priceStability": 0-100,
      "issues": ["問題点のリスト"]
    },
    "customer": {
      "score": 0-100,
      "trustLevel": 0-100,
      "issues": ["問題点のリスト"]
    },
    "inventory": {
      "score": 0-100,
      "availability": true/false,
      "leadTime": 日数,
      "issues": ["問題点のリスト"]
    }
  },
  "recommendations": ["推奨アクション1", "推奨アクション2"],
  "requiresManualReview": true/false,
  "confidence": 0.0-1.0
}

リスクレベルの定義:
- low (0-30): 通常通り処理
- medium (31-60): 注意して処理
- high (61-80): 手動確認推奨
- critical (81-100): 即座に手動確認必須
`
}

/**
 * ルールベースのリスク分析（フォールバック）
 */
function analyzeOrderRiskRuleBased(
  orderContext: OrderContext,
  supplierHistory: SupplierHistory,
  marketCondition: MarketCondition
): RiskAnalysisResult {
  let totalRisk = 0
  const issues: string[] = []
  const recommendations: string[] = []

  // 仕入れ元リスク
  const supplierSuccessRate = supplierHistory.successfulOrders / supplierHistory.totalOrders
  let supplierRisk = 0

  if (supplierSuccessRate < 0.9) {
    supplierRisk += 20
    issues.push('仕入れ元の成功率が90%未満です')
    recommendations.push('仕入れ元を変更することを検討してください')
  }

  if (supplierHistory.qualityIssues > 5) {
    supplierRisk += 15
    issues.push('仕入れ元の品質問題が多発しています')
  }

  if (supplierHistory.recentProblems.some(p => p.severity === 'high')) {
    supplierRisk += 20
    issues.push('最近、重大なトラブルが発生しています')
    recommendations.push('この注文は手動で確認してください')
  }

  // 市場リスク
  let marketRisk = 0

  if (marketCondition.volatilityScore > 50) {
    marketRisk += 20
    issues.push('市場価格の変動性が高いです')
    recommendations.push('価格を頻繁に監視してください')
  }

  if (marketCondition.marketTrend === 'declining') {
    marketRisk += 15
    issues.push('市場価格が下落傾向にあります')
  }

  // 顧客リスク
  let customerRisk = 0

  if (orderContext.customerHistory) {
    const cancelRate = orderContext.customerHistory.cancelledOrders / orderContext.customerHistory.totalOrders
    const disputeRate = orderContext.customerHistory.disputedOrders / orderContext.customerHistory.totalOrders

    if (cancelRate > 0.2) {
      customerRisk += 15
      issues.push('顧客のキャンセル率が高いです')
    }

    if (disputeRate > 0.1) {
      customerRisk += 15
      issues.push('顧客のクレーム履歴があります')
    }
  } else {
    customerRisk += 10
    issues.push('新規顧客です')
  }

  // 在庫リスク
  let inventoryRisk = 0

  if (supplierHistory.averageLeadTime > 14) {
    inventoryRisk += 20
    issues.push('リードタイムが14日を超えています')
    recommendations.push('顧客に納期を事前に通知してください')
  }

  totalRisk = supplierRisk + marketRisk + customerRisk + inventoryRisk

  let riskLevel: RiskAnalysisResult['riskLevel'] = 'low'
  if (totalRisk > 80) riskLevel = 'critical'
  else if (totalRisk > 60) riskLevel = 'high'
  else if (totalRisk > 30) riskLevel = 'medium'

  return {
    overallRiskScore: Math.min(100, totalRisk),
    riskLevel,
    riskFactors: {
      supplier: {
        score: supplierRisk,
        issues: issues.filter(i => i.includes('仕入れ元')),
        reliability: Math.round(supplierSuccessRate * 100),
      },
      market: {
        score: marketRisk,
        volatility: marketCondition.volatilityScore,
        priceStability: 100 - marketCondition.volatilityScore,
        issues: issues.filter(i => i.includes('市場')),
      },
      customer: {
        score: customerRisk,
        trustLevel: orderContext.customerHistory
          ? Math.round((1 - (orderContext.customerHistory.cancelledOrders + orderContext.customerHistory.disputedOrders) / orderContext.customerHistory.totalOrders) * 100)
          : 50,
        issues: issues.filter(i => i.includes('顧客')),
      },
      inventory: {
        score: inventoryRisk,
        availability: true,
        leadTime: supplierHistory.averageLeadTime,
        issues: issues.filter(i => i.includes('リードタイム') || i.includes('在庫')),
      },
    },
    recommendations,
    requiresManualReview: riskLevel === 'critical' || riskLevel === 'high',
    confidence: 0.7,
  }
}

/**
 * リスクスコアをデータベースに保存
 */
async function saveRiskScore(
  orderId: string,
  riskScore: number,
  analysis: RiskAnalysisResult
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('orders_v2')
    .update({
      ai_risk_score: riskScore,
      risk_analysis: analysis,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    console.error('[RiskAnalyzer] リスクスコア保存エラー:', error)
  } else {
    console.log(`[RiskAnalyzer] 注文 ${orderId} のリスクスコアを更新: ${riskScore}`)
  }
}

/**
 * 仕入れ元履歴を取得
 */
export async function getSupplierHistory(supplierId: string): Promise<SupplierHistory> {
  const supabase = createClient()

  // サンプル実装 - 実際はデータベースから取得
  return {
    supplierId,
    supplierName: 'Amazon US',
    totalOrders: 100,
    successfulOrders: 95,
    failedOrders: 5,
    averageLeadTime: 7,
    qualityIssues: 2,
    recentProblems: [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        issue: '配送遅延',
        severity: 'medium',
      },
    ],
  }
}

/**
 * 市場状況を取得
 */
export async function getMarketCondition(productSku: string): Promise<MarketCondition> {
  const supabase = createClient()

  // サンプル実装 - 実際はデータベースから取得
  return {
    productSku,
    currentPrice: 3500,
    priceHistory: [
      { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), price: 4000 },
      { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), price: 3800 },
      { date: new Date(), price: 3500 },
    ],
    competitorCount: 15,
    marketTrend: 'declining',
    volatilityScore: 45,
  }
}

/**
 * バッチ処理: 複数注文のリスク分析
 */
export async function analyzeBatchOrders(orderIds: string[]): Promise<Map<string, RiskAnalysisResult>> {
  console.log(`[RiskAnalyzer] ${orderIds.length}件の注文をバッチ分析中...`)

  const results = new Map<string, RiskAnalysisResult>()

  for (const orderId of orderIds) {
    try {
      // 注文情報を取得（実際はデータベースから）
      const orderContext: OrderContext = {
        orderId,
        productSku: 'SKU-001',
        productTitle: 'Sample Product',
        quantity: 1,
        totalAmount: 3500,
        marketplace: 'Amazon_JP',
      }

      const supplierHistory = await getSupplierHistory('SUPPLIER-001')
      const marketCondition = await getMarketCondition(orderContext.productSku)

      const analysis = await analyzeOrderRisk(orderContext, supplierHistory, marketCondition)
      results.set(orderId, analysis)

      // レート制限を考慮
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`[RiskAnalyzer] 注文 ${orderId} の分析エラー:`, error)
    }
  }

  console.log(`[RiskAnalyzer] バッチ分析完了: ${results.size}件`)

  return results
}

export default {
  analyzeOrderRisk,
  getSupplierHistory,
  getMarketCondition,
  analyzeBatchOrders,
}
