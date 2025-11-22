// services/orders/RiskAnalyzer.ts

/**
 * I2: AI連携の完全実装
 * 受注データAIリスク分析サービス（Gemini API統合）
 *
 * このモジュールは、受注データを分析し、赤字リスク、
 * トラブル予測、配送遅延リスクなどを評価します。
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// 型定義
// ============================================================================

/**
 * 受注データ
 */
export interface OrderData {
  id: string;
  orderId: string;
  marketplace: string;
  orderDate: Date;
  orderStatus: string;
  sku: string;
  quantity: number;
  sellingPrice: number;
  costPrice?: number;
  platformFee?: number;
  shippingFeePaid?: number;
  expectedProfit?: number;
  profitRate?: number;
  customerName?: string;
  shippingAddress?: string;
  shippingDeadline?: Date;
}

/**
 * リスク評価結果
 */
export interface RiskAssessment {
  orderId: string;
  overallRiskScore: number; // 0-100 (高いほど危険)
  isRedRisk: boolean; // 赤字リスク
  isDelayRisk: boolean; // 配送遅延リスク
  isTroubleRisk: boolean; // トラブル発生リスク
  riskFactors: RiskFactor[];
  aiInsights: string[];
  recommendations: string[];
  processingTime: number;
}

/**
 * リスク要因
 */
export interface RiskFactor {
  type: "financial" | "shipping" | "customer" | "product" | "operational";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  impact: string;
  mitigation: string;
}

// ============================================================================
// RiskAnalyzer クラス
// ============================================================================

/**
 * 受注データAIリスク分析サービス
 */
export class RiskAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";

    if (!apiKey) {
      console.warn(
        "⚠️ [RiskAnalyzer] GEMINI_API_KEY is not set. AI features will be disabled."
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
    });
  }

  // ==========================================================================
  // メイン処理: リスク評価
  // ==========================================================================

  /**
   * 受注データのリスクを評価
   *
   * @param order - 受注データ
   * @returns リスク評価結果
   */
  async assessOrderRisk(order: OrderData): Promise<RiskAssessment> {
    const startTime = Date.now();

    console.log(
      `\n🔍 [RiskAnalyzer] Analyzing order: ${order.orderId} (${order.marketplace})`
    );

    try {
      // STEP 1: ルールベースのリスク検出
      const riskFactors = this.detectRiskFactors(order);

      console.log(`   📊 Risk factors detected: ${riskFactors.length}`);
      riskFactors.forEach((rf) => {
        console.log(`      ${rf.severity.toUpperCase()}: ${rf.type} - ${rf.description}`);
      });

      // STEP 2: AIを使用した総合評価
      const aiAnalysis = await this.performAIAnalysis(order, riskFactors);

      // STEP 3: 総合リスクスコアを計算
      const overallRiskScore = this.calculateOverallRiskScore(
        riskFactors,
        aiAnalysis
      );

      // STEP 4: 各種リスクフラグを設定
      const isRedRisk = this.checkRedRisk(order, riskFactors);
      const isDelayRisk = this.checkDelayRisk(order, riskFactors);
      const isTroubleRisk = this.checkTroubleRisk(riskFactors);

      const processingTime = Date.now() - startTime;

      console.log(`   ✅ Risk assessment completed:`);
      console.log(`      Overall risk score: ${overallRiskScore}/100`);
      console.log(`      Red risk: ${isRedRisk}`);
      console.log(`      Delay risk: ${isDelayRisk}`);
      console.log(`      Trouble risk: ${isTroubleRisk}`);
      console.log(`      Processing time: ${processingTime}ms`);

      return {
        orderId: order.orderId,
        overallRiskScore,
        isRedRisk,
        isDelayRisk,
        isTroubleRisk,
        riskFactors,
        aiInsights: aiAnalysis.insights,
        recommendations: aiAnalysis.recommendations,
        processingTime,
      };
    } catch (error) {
      console.error(`   ❌ [RiskAnalyzer] Analysis failed:`, error);

      // フォールバック: ルールベースのみ
      const riskFactors = this.detectRiskFactors(order);

      return {
        orderId: order.orderId,
        overallRiskScore: this.calculateBasicRiskScore(riskFactors),
        isRedRisk: this.checkRedRisk(order, riskFactors),
        isDelayRisk: this.checkDelayRisk(order, riskFactors),
        isTroubleRisk: this.checkTroubleRisk(riskFactors),
        riskFactors,
        aiInsights: ["AI分析が失敗しました。ルールベース評価のみを表示しています。"],
        recommendations: this.getDefaultRecommendations(riskFactors),
        processingTime: Date.now() - startTime,
      };
    }
  }

  // ==========================================================================
  // STEP 1: ルールベースのリスク検出
  // ==========================================================================

  /**
   * ルールベースでリスク要因を検出
   */
  private detectRiskFactors(order: OrderData): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 財務リスク: 赤字リスク
    if (order.expectedProfit !== undefined && order.expectedProfit < 0) {
      factors.push({
        type: "financial",
        severity: "critical",
        description: "この注文は赤字です",
        impact: `予想損失: ¥${Math.abs(order.expectedProfit).toLocaleString()}`,
        mitigation: "価格設定を見直すか、コスト削減を検討してください",
      });
    }

    // 財務リスク: 利益率が低い
    if (
      order.profitRate !== undefined &&
      order.profitRate < 0.1 &&
      order.profitRate >= 0
    ) {
      factors.push({
        type: "financial",
        severity: "high",
        description: "利益率が10%未満です",
        impact: "薄利多売となり、トラブル時に赤字化するリスクがあります",
        mitigation: "価格を見直すか、仕入れコストを削減してください",
      });
    }

    // 配送リスク: 配送期限が迫っている
    if (order.shippingDeadline) {
      const daysUntilDeadline = Math.floor(
        (order.shippingDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline < 0) {
        factors.push({
          type: "shipping",
          severity: "critical",
          description: "配送期限を過ぎています",
          impact: "顧客クレームやペナルティのリスクがあります",
          mitigation: "至急配送手配を行い、顧客に連絡してください",
        });
      } else if (daysUntilDeadline <= 1) {
        factors.push({
          type: "shipping",
          severity: "high",
          description: "配送期限まで1日以内です",
          impact: "遅延のリスクが高まっています",
          mitigation: "優先的に配送手配を行ってください",
        });
      } else if (daysUntilDeadline <= 3) {
        factors.push({
          type: "shipping",
          severity: "medium",
          description: "配送期限まで3日以内です",
          impact: "計画的な配送が必要です",
          mitigation: "配送スケジュールを確認してください",
        });
      }
    }

    // 商品リスク: 高額商品
    if (order.sellingPrice > 100000) {
      factors.push({
        type: "product",
        severity: "medium",
        description: "高額商品です（¥10万以上）",
        impact: "返品やクレーム時の損失が大きくなります",
        mitigation: "梱包を厳重にし、保険の加入を検討してください",
      });
    }

    // 運用リスク: 大量注文
    if (order.quantity > 10) {
      factors.push({
        type: "operational",
        severity: "medium",
        description: "大量注文です（10個以上）",
        impact: "在庫不足や梱包ミスのリスクがあります",
        mitigation: "在庫を確認し、慎重に梱包してください",
      });
    }

    return factors;
  }

  // ==========================================================================
  // STEP 2: AI総合評価
  // ==========================================================================

  /**
   * Gemini APIを使用してAI総合評価を実施
   */
  private async performAIAnalysis(
    order: OrderData,
    riskFactors: RiskFactor[]
  ): Promise<{
    insights: string[];
    recommendations: string[];
  }> {
    const prompt = `
あなたはECビジネスのリスク管理専門家です。
以下の受注データとリスク要因を分析し、総合的な洞察と推奨事項を提示してください。

【受注データ】
注文ID: ${order.orderId}
マーケットプレイス: ${order.marketplace}
注文日: ${order.orderDate.toISOString()}
ステータス: ${order.orderStatus}
SKU: ${order.sku}
数量: ${order.quantity}
販売価格: ¥${order.sellingPrice.toLocaleString()}
仕入れ価格: ¥${order.costPrice?.toLocaleString() || "不明"}
予想利益: ¥${order.expectedProfit?.toLocaleString() || "不明"}
利益率: ${order.profitRate !== undefined ? (order.profitRate * 100).toFixed(1) : "不明"}%

【検出されたリスク要因】
${riskFactors.map((rf, i) => `${i + 1}. [${rf.severity.toUpperCase()}] ${rf.type}: ${rf.description}`).join("\n")}

【指示】
以下のJSON形式で、洞察と推奨事項を生成してください:

{
  "insights": [
    "洞察1（この注文の全体的なリスク状況を簡潔に説明）",
    "洞察2（最も注意すべきポイント）",
    "洞察3（ビジネス上の影響）"
  ],
  "recommendations": [
    "推奨事項1（最優先で実施すべきアクション）",
    "推奨事項2（リスク軽減のための具体的な対策）",
    "推奨事項3（将来的な改善策）"
  ]
}

各項目は簡潔に、1-2文で記述してください。
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSONを抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from AI response");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
      };
    } catch (error) {
      console.error(`❌ [RiskAnalyzer] AI analysis failed:`, error);

      // フォールバック
      return {
        insights: this.getDefaultInsights(riskFactors),
        recommendations: this.getDefaultRecommendations(riskFactors),
      };
    }
  }

  // ==========================================================================
  // STEP 3: リスクスコア計算
  // ==========================================================================

  /**
   * 総合リスクスコアを計算
   */
  private calculateOverallRiskScore(
    riskFactors: RiskFactor[],
    aiAnalysis: { insights: string[]; recommendations: string[] }
  ): number {
    let score = 0;

    // リスク要因の深刻度に応じてスコアを加算
    for (const factor of riskFactors) {
      switch (factor.severity) {
        case "critical":
          score += 40;
          break;
        case "high":
          score += 25;
          break;
        case "medium":
          score += 15;
          break;
        case "low":
          score += 5;
          break;
      }
    }

    return Math.min(100, score);
  }

  /**
   * 基本的なリスクスコアを計算（AI使用なし）
   */
  private calculateBasicRiskScore(riskFactors: RiskFactor[]): number {
    return this.calculateOverallRiskScore(riskFactors, {
      insights: [],
      recommendations: [],
    });
  }

  // ==========================================================================
  // STEP 4: 各種リスクフラグの判定
  // ==========================================================================

  /**
   * 赤字リスクをチェック
   */
  private checkRedRisk(order: OrderData, riskFactors: RiskFactor[]): boolean {
    // 予想利益がマイナス
    if (order.expectedProfit !== undefined && order.expectedProfit < 0) {
      return true;
    }

    // 重大な財務リスクが存在
    const hasCriticalFinancialRisk = riskFactors.some(
      (rf) => rf.type === "financial" && rf.severity === "critical"
    );

    return hasCriticalFinancialRisk;
  }

  /**
   * 配送遅延リスクをチェック
   */
  private checkDelayRisk(order: OrderData, riskFactors: RiskFactor[]): boolean {
    // 配送期限関連の重大リスクが存在
    const hasShippingRisk = riskFactors.some(
      (rf) =>
        rf.type === "shipping" &&
        (rf.severity === "critical" || rf.severity === "high")
    );

    return hasShippingRisk;
  }

  /**
   * トラブル発生リスクをチェック
   */
  private checkTroubleRisk(riskFactors: RiskFactor[]): boolean {
    // 重大または高リスクが2つ以上存在
    const highRiskCount = riskFactors.filter(
      (rf) => rf.severity === "critical" || rf.severity === "high"
    ).length;

    return highRiskCount >= 2;
  }

  // ==========================================================================
  // フォールバック関数
  // ==========================================================================

  /**
   * デフォルトの洞察を取得
   */
  private getDefaultInsights(riskFactors: RiskFactor[]): string[] {
    const insights: string[] = [];

    const criticalCount = riskFactors.filter(
      (rf) => rf.severity === "critical"
    ).length;
    const highCount = riskFactors.filter((rf) => rf.severity === "high").length;

    if (criticalCount > 0) {
      insights.push(
        `重大なリスクが${criticalCount}件検出されました。早急な対応が必要です。`
      );
    } else if (highCount > 0) {
      insights.push(
        `高リスクが${highCount}件検出されました。注意深く対応してください。`
      );
    } else {
      insights.push("リスクは比較的低い状態です。通常の運用を継続してください。");
    }

    return insights;
  }

  /**
   * デフォルトの推奨事項を取得
   */
  private getDefaultRecommendations(riskFactors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    // リスク要因の緩和策を推奨事項として追加
    for (const factor of riskFactors) {
      if (factor.severity === "critical" || factor.severity === "high") {
        recommendations.push(factor.mitigation);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("現状のプロセスを維持してください。");
    }

    return recommendations.slice(0, 3); // 最大3つ
  }

  // ==========================================================================
  // バッチ処理
  // ==========================================================================

  /**
   * 複数の受注を一括評価
   */
  async assessBatch(orders: OrderData[]): Promise<RiskAssessment[]> {
    console.log(
      `\n🔄 [RiskAnalyzer] Analyzing batch of ${orders.length} orders...`
    );

    const results: RiskAssessment[] = [];

    for (const order of orders) {
      const result = await this.assessOrderRisk(order);
      results.push(result);

      // レート制限対策: 各リクエスト間に500ms待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const highRiskOrders = results.filter((r) => r.overallRiskScore >= 60).length;
    const redRiskOrders = results.filter((r) => r.isRedRisk).length;
    const delayRiskOrders = results.filter((r) => r.isDelayRisk).length;

    console.log(`\n✅ [RiskAnalyzer] Batch analysis completed:`);
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   High risk orders: ${highRiskOrders}`);
    console.log(`   Red risk orders: ${redRiskOrders}`);
    console.log(`   Delay risk orders: ${delayRiskOrders}`);

    return results;
  }
}

// ============================================================================
// エクスポート: シングルトンインスタンス
// ============================================================================

let riskAnalyzerInstance: RiskAnalyzer | null = null;

/**
 * RiskAnalyzerのシングルトンインスタンスを取得
 */
export function getRiskAnalyzer(): RiskAnalyzer {
  if (!riskAnalyzerInstance) {
    riskAnalyzerInstance = new RiskAnalyzer();
  }
  return riskAnalyzerInstance;
}
