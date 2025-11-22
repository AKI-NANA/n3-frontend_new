/**
 * I2: AI連携完全実装 - 注文リスク分析エンジン
 * Gemini APIを使用して、潜在的なトラブル要因を特定し対応策を提示
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ==========================================
// 型定義
// ==========================================

interface Order {
  id: string;
  orderNumber: string;
  marketplace: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  orderDate: Date;
  paymentStatus: string;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;

  // Phase 1: 利益率分析
  costPrice?: number;
  sellingPrice?: number;
  shippingCost?: number;
  marketplaceFee?: number;
  paymentFee?: number;
  profitAmount?: number;
  profitRate?: number;
}

interface OrderItem {
  sku: string;
  productName: string;
  quantity: number;
  price: number;
  supplier?: string;
}

interface ShippingAddress {
  country: string;
  state?: string;
  city: string;
  postalCode: string;
  addressLine1: string;
}

interface RiskAnalysisResult {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isHighRisk: boolean;
  riskFactors: RiskFactor[];
  aiInsights: string[];
  recommendedActions: string[];
  confidence: number;
}

interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
}

// ==========================================
// RiskAnalyzer クラス
// ==========================================

export class RiskAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || '';

    if (!key) {
      throw new Error('GEMINI_API_KEY が設定されていません。');
    }

    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  /**
   * 注文のリスク分析を実行
   */
  async analyzeOrder(order: Order): Promise<RiskAnalysisResult> {
    console.log(`🔍 リスク分析開始: ${order.orderNumber}`);

    try {
      // ルールベースのリスク検出
      const ruleBasedFactors = this.detectRuleBasedRisks(order);

      // AI による高度なリスク分析
      const aiAnalysis = await this.analyzeWithAI(order, ruleBasedFactors);

      // リスクスコアを計算
      const riskScore = this.calculateRiskScore(ruleBasedFactors, aiAnalysis);

      // リスクレベルを判定
      const riskLevel = this.determineRiskLevel(riskScore);

      // 推奨アクションを生成
      const recommendedActions = await this.generateRecommendedActions(
        order,
        ruleBasedFactors,
        aiAnalysis
      );

      console.log(`✅ リスク分析完了: ${order.orderNumber} - スコア: ${riskScore}`);

      return {
        riskScore,
        riskLevel,
        isHighRisk: riskScore >= 70,
        riskFactors: ruleBasedFactors,
        aiInsights: aiAnalysis.insights,
        recommendedActions,
        confidence: aiAnalysis.confidence,
      };
    } catch (error: any) {
      console.error('❌ リスク分析エラー:', error.message);

      return {
        riskScore: 0,
        riskLevel: 'low',
        isHighRisk: false,
        riskFactors: [],
        aiInsights: [],
        recommendedActions: [],
        confidence: 0,
      };
    }
  }

  /**
   * ルールベースのリスク検出
   */
  private detectRuleBasedRisks(order: Order): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 利益率チェック
    if (order.profitRate !== undefined) {
      if (order.profitRate < 0) {
        factors.push({
          type: 'negative_profit',
          severity: 'critical',
          description: `利益率がマイナス（${order.profitRate.toFixed(2)}%）`,
          impact: '赤字取引となり、ビジネスに直接的な損失をもたらします',
        });
      } else if (order.profitRate < 10) {
        factors.push({
          type: 'low_profit',
          severity: 'high',
          description: `利益率が低い（${order.profitRate.toFixed(2)}%）`,
          impact: '利益が薄く、想定外のコスト増加で赤字転落のリスクがあります',
        });
      }
    }

    // 高額注文チェック
    if (order.totalAmount > 100000) {
      factors.push({
        type: 'high_value_order',
        severity: 'medium',
        description: `高額注文（¥${order.totalAmount.toLocaleString()}）`,
        impact: '詐欺や返品のリスクが高く、慎重な対応が必要です',
      });
    }

    // 未払いチェック
    if (order.paymentStatus !== 'paid') {
      factors.push({
        type: 'payment_not_confirmed',
        severity: 'high',
        description: '支払いが未確認',
        impact: '未払いのまま発送すると、売上損失のリスクがあります',
      });
    }

    // 海外配送チェック
    if (order.shippingAddress && order.shippingAddress.country !== 'Japan') {
      factors.push({
        type: 'international_shipping',
        severity: 'medium',
        description: `国際配送（${order.shippingAddress.country}）`,
        impact: '配送遅延、関税トラブル、紛失リスクが高まります',
      });
    }

    // 大量注文チェック
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity > 10) {
      factors.push({
        type: 'bulk_order',
        severity: 'low',
        description: `大量注文（${totalQuantity}個）`,
        impact: '在庫不足や発送遅延のリスクがあります',
      });
    }

    // 新規顧客チェック（メールアドレスがフリーメールの場合）
    const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const emailDomain = order.customerEmail.split('@')[1];
    if (freeEmailDomains.includes(emailDomain) && order.totalAmount > 50000) {
      factors.push({
        type: 'new_customer_high_value',
        severity: 'medium',
        description: '新規顧客による高額注文の可能性',
        impact: '詐欺や返品のリスクが高まります',
      });
    }

    return factors;
  }

  /**
   * AI による高度なリスク分析
   */
  private async analyzeWithAI(
    order: Order,
    ruleBasedFactors: RiskFactor[]
  ): Promise<{ insights: string[]; confidence: number; troubleFactors: string[] }> {
    try {
      const prompt = `
あなたはEC取引のリスク分析専門家です。

以下の注文情報を分析し、潜在的なトラブル要因を3点特定してください:

【注文情報】
- 注文番号: ${order.orderNumber}
- マーケットプレイス: ${order.marketplace}
- 顧客名: ${order.customerName}
- 金額: ¥${order.totalAmount.toLocaleString()}
- 支払いステータス: ${order.paymentStatus}
- 利益率: ${order.profitRate?.toFixed(2)}%
- 商品数: ${order.items.length}
- 配送先: ${order.shippingAddress?.country || 'Japan'}

【検出済みリスク】
${ruleBasedFactors.map(f => `- ${f.description}: ${f.impact}`).join('\n')}

【分析タスク】
以下の観点から、潜在的なトラブル要因を3点特定し、JSON形式で返してください:

1. 配送業者の評判・実績
2. 過去の仕入れ元トラブル
3. 顧客の購入パターン
4. 市場・経済動向
5. その他のリスク要因

応答例:
{
  "troubleFactors": [
    "配送業者の遅延率が高く、配送遅延のリスクが40%あります",
    "仕入れ元が過去3ヶ月で2回配送ミスを起こしており、在庫切れのリスクがあります",
    "顧客が高額商品を初回購入しており、返品率が25%と高いパターンです"
  ],
  "insights": [
    "支払い確認後に発送することを推奨します",
    "配送業者を信頼性の高い「ヤマト運輸」に変更することを検討してください",
    "顧客に詳細な商品情報を事前に提供し、返品リスクを低減してください"
  ],
  "confidence": 85
}

JSON形式のみで応答してください:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`🤖 AI分析完了: ${parsed.troubleFactors.length} 件のトラブル要因検出`);

        return {
          insights: parsed.insights || [],
          confidence: parsed.confidence || 0,
          troubleFactors: parsed.troubleFactors || [],
        };
      }

      return { insights: [], confidence: 0, troubleFactors: [] };
    } catch (error) {
      console.error('❌ AI分析エラー:', error);
      return { insights: [], confidence: 0, troubleFactors: [] };
    }
  }

  /**
   * リスクスコア計算
   */
  private calculateRiskScore(
    ruleBasedFactors: RiskFactor[],
    aiAnalysis: { insights: string[]; confidence: number; troubleFactors: string[] }
  ): number {
    let score = 0;

    // ルールベースのリスク要因からスコア加算
    ruleBasedFactors.forEach(factor => {
      switch (factor.severity) {
        case 'critical':
          score += 30;
          break;
        case 'high':
          score += 20;
          break;
        case 'medium':
          score += 10;
          break;
        case 'low':
          score += 5;
          break;
      }
    });

    // AIが検出したトラブル要因からスコア加算
    score += aiAnalysis.troubleFactors.length * 10;

    // スコアを0-100の範囲に正規化
    return Math.min(100, score);
  }

  /**
   * リスクレベル判定
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * 推奨アクション生成
   */
  private async generateRecommendedActions(
    order: Order,
    riskFactors: RiskFactor[],
    aiAnalysis: { insights: string[]; confidence: number; troubleFactors: string[] }
  ): Promise<string[]> {
    const actions: string[] = [];

    // AI の推奨アクションを追加
    actions.push(...aiAnalysis.insights);

    // ルールベースのアクション
    riskFactors.forEach(factor => {
      switch (factor.type) {
        case 'negative_profit':
        case 'low_profit':
          actions.push('価格を見直し、最低利益率15%を確保してください');
          break;
        case 'payment_not_confirmed':
          actions.push('支払い確認後に発送手配を開始してください');
          break;
        case 'high_value_order':
          actions.push('顧客に本人確認の連絡を行い、詐欺リスクを軽減してください');
          break;
        case 'international_shipping':
          actions.push('追跡番号付きの配送方法を選択し、保険を付けてください');
          break;
      }
    });

    // 重複を除去し、上位5つのアクションを返す
    return [...new Set(actions)].slice(0, 5);
  }

  /**
   * バッチ分析: 複数注文の一括リスク分析
   */
  async analyzeBatch(orders: Order[]): Promise<Map<string, RiskAnalysisResult>> {
    console.log(`🔄 バッチリスク分析開始: ${orders.length} 件の注文`);

    const results = new Map<string, RiskAnalysisResult>();

    for (const order of orders) {
      try {
        const result = await this.analyzeOrder(order);
        results.set(order.id, result);

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`❌ 注文 ${order.id} の分析エラー:`, error.message);
      }
    }

    console.log(`✅ バッチリスク分析完了: ${results.size} 件処理済み`);

    // 高リスク注文のサマリーを表示
    const highRiskOrders = Array.from(results.values()).filter(r => r.isHighRisk);
    console.log(`⚠️ 高リスク注文: ${highRiskOrders.length} 件`);

    return results;
  }

  /**
   * 簡易リスクスコア計算（AI なし）
   */
  quickRiskScore(order: Order): number {
    const factors = this.detectRuleBasedRisks(order);
    return this.calculateRiskScore(factors, { insights: [], confidence: 0, troubleFactors: [] });
  }
}

// ==========================================
// エクスポート
// ==========================================

export default RiskAnalyzer;

// シングルトンインスタンス
let riskAnalyzerInstance: RiskAnalyzer | null = null;

export function getRiskAnalyzer(apiKey?: string): RiskAnalyzer {
  if (!riskAnalyzerInstance) {
    riskAnalyzerInstance = new RiskAnalyzer(apiKey);
  }
  return riskAnalyzerInstance;
}
