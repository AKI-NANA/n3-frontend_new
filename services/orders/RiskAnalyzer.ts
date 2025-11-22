// RiskAnalyzer.ts: AI強化リスク分析サービス (I2-3)

import { GoogleGenerativeAI } from "@google/generative-ai";

// リスクレベル
export enum RiskLevel {
  CRITICAL = "CRITICAL", // 90-100
  HIGH = "HIGH", // 70-89
  MEDIUM = "MEDIUM", // 40-69
  LOW = "LOW", // 20-39
  MINIMAL = "MINIMAL", // 0-19
}

// 注文情報（orders_v2テーブル）
export interface OrderInfo {
  orderId: string;
  customerId: string;
  marketplace: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    itemId: string;
    itemName: string;
    supplierId?: string;
    supplierName?: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
  }>;
  shippingAddress: {
    country: string;
    city: string;
    postalCode: string;
  };
  customerHistory?: {
    totalOrders: number;
    totalSpent: number;
    returnRate: number;
    disputeCount: number;
  };
  createdAt: Date;
}

// 刈り取りアラート情報（karitori_alertsテーブル）
export interface KaritoriAlert {
  alertId: string;
  supplierId: string;
  supplierName: string;
  itemId: string;
  alertType: string; // PRICE_SPIKE, STOCK_OUT, DELIVERY_DELAY, etc.
  severity: string; // HIGH, MEDIUM, LOW
  message: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

// 楽天せどりログ（rakuten_arbitrage_logsテーブル）
export interface RakutenArbitrageLog {
  logId: string;
  itemId: string;
  rakutenPrice: number;
  amazonPrice: number;
  priceMargin: number;
  marginPercentage: number;
  salesRank: number;
  stockLevel: string; // IN_STOCK, LOW_STOCK, OUT_OF_STOCK
  priceVolatility: number; // 0-1
  seasonalityFactor: number; // 0-1
  recordedAt: Date;
}

// AI リスク分析結果
export interface RiskAnalysisResult {
  orderId: string;
  aiRiskScore: number; // 0-100
  riskLevel: RiskLevel;
  riskFactors: Array<{
    category: string;
    score: number;
    description: string;
    severity: string;
  }>;
  supplierReliability: {
    score: number; // 0-100
    issues: string[];
    historicalData: string;
  };
  priceRiskAnalysis: {
    volatilityScore: number; // 0-100
    seasonalRisk: boolean;
    recommendations: string[];
  };
  overallAssessment: string;
  actionableInsights: string[];
  confidence: number; // 0-1
}

/**
 * AI強化リスク分析サービス
 */
export class RiskAnalyzer {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || null;

    if (this.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
      } catch (error) {
        console.error("Failed to initialize Gemini API:", error);
        this.genAI = null;
      }
    } else {
      console.warn(
        "Gemini API key not provided. Risk analyzer will run in basic mode."
      );
    }
  }

  /**
   * I2-3: 包括的リスク分析
   */
  async analyzeOrderRisk(
    order: OrderInfo,
    karitoriAlerts: KaritoriAlert[] = [],
    arbitrageLogs: RakutenArbitrageLog[] = []
  ): Promise<RiskAnalysisResult> {
    // 基本リスクスコア計算
    const basicRiskScore = this.calculateBasicRiskScore(order);

    // サプライヤー信頼性分析
    const supplierReliability = this.analyzeSupplierReliability(
      order,
      karitoriAlerts
    );

    // 価格変動リスク分析
    const priceRiskAnalysis = this.analyzePriceRisk(order, arbitrageLogs);

    // AIによる包括的分析
    if (this.genAI) {
      try {
        const aiAnalysis = await this.performAIRiskAnalysis(
          order,
          karitoriAlerts,
          arbitrageLogs,
          basicRiskScore,
          supplierReliability,
          priceRiskAnalysis
        );

        return aiAnalysis;
      } catch (error) {
        console.error("AI risk analysis failed:", error);
        // フォールバック: 基本分析を返す
      }
    }

    // 基本分析結果を返す（AI未使用時）
    return this.generateBasicRiskAnalysis(
      order,
      basicRiskScore,
      supplierReliability,
      priceRiskAnalysis
    );
  }

  /**
   * 基本リスクスコア計算
   */
  private calculateBasicRiskScore(order: OrderInfo): number {
    let riskScore = 0;

    // 顧客履歴リスク
    if (order.customerHistory) {
      if (order.customerHistory.returnRate > 0.2) riskScore += 20; // 20%以上の返品率
      if (order.customerHistory.disputeCount > 2) riskScore += 25; // 3回以上の紛争
      if (order.customerHistory.totalOrders === 0) riskScore += 15; // 新規顧客
    }

    // 注文金額リスク
    if (order.totalAmount > 1000) riskScore += 10; // 高額注文
    if (order.totalAmount > 5000) riskScore += 15; // 超高額注文

    // 配送先リスク（高リスク国）
    const highRiskCountries = [
      "NG",
      "GH",
      "PK",
      "BD",
      "VN",
      "ID",
      "UA",
      "RU",
    ];
    if (highRiskCountries.includes(order.shippingAddress.country)) {
      riskScore += 20;
    }

    // アイテム数リスク
    if (order.items.length > 10) riskScore += 10; // 大量注文

    return Math.min(100, riskScore);
  }

  /**
   * サプライヤー信頼性分析
   */
  private analyzeSupplierReliability(
    order: OrderInfo,
    karitoriAlerts: KaritoriAlert[]
  ): {
    score: number;
    issues: string[];
    historicalData: string;
  } {
    const issues: string[] = [];
    let reliabilityScore = 100;

    // 各アイテムのサプライヤーをチェック
    for (const item of order.items) {
      if (!item.supplierId) continue;

      // このサプライヤーに関連するアラートを検索
      const supplierAlerts = karitoriAlerts.filter(
        (alert) =>
          alert.supplierId === item.supplierId && !alert.resolvedAt
      );

      for (const alert of supplierAlerts) {
        if (alert.severity === "HIGH") {
          reliabilityScore -= 20;
          issues.push(
            `${item.supplierName || item.supplierId}: ${alert.message}`
          );
        } else if (alert.severity === "MEDIUM") {
          reliabilityScore -= 10;
        }
      }

      // アラートタイプ別の追加ペナルティ
      const criticalAlerts = supplierAlerts.filter(
        (a) => a.alertType === "STOCK_OUT" || a.alertType === "DELIVERY_DELAY"
      );
      if (criticalAlerts.length > 0) {
        reliabilityScore -= 15;
        issues.push(
          `${item.supplierName || item.supplierId}: Stock/delivery issues detected`
        );
      }
    }

    reliabilityScore = Math.max(0, reliabilityScore);

    const historicalData = `Analyzed ${karitoriAlerts.length} alerts. ${issues.length} critical issues found.`;

    return {
      score: reliabilityScore,
      issues,
      historicalData,
    };
  }

  /**
   * 価格変動リスク分析
   */
  private analyzePriceRisk(
    order: OrderInfo,
    arbitrageLogs: RakutenArbitrageLog[]
  ): {
    volatilityScore: number;
    seasonalRisk: boolean;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let volatilityScore = 0;
    let seasonalRisk = false;

    if (arbitrageLogs.length === 0) {
      return {
        volatilityScore: 30, // デフォルト中程度リスク
        seasonalRisk: false,
        recommendations: ["Insufficient historical data for price risk analysis"],
      };
    }

    // アイテムごとの価格変動を分析
    for (const item of order.items) {
      const itemLogs = arbitrageLogs.filter((log) => log.itemId === item.itemId);

      if (itemLogs.length === 0) continue;

      // 平均価格変動率
      const avgVolatility =
        itemLogs.reduce((sum, log) => sum + log.priceVolatility, 0) /
        itemLogs.length;

      if (avgVolatility > 0.3) {
        volatilityScore += 30;
        recommendations.push(
          `${item.itemName}: High price volatility detected (${(avgVolatility * 100).toFixed(1)}%)`
        );
      }

      // 季節性リスク
      const avgSeasonality =
        itemLogs.reduce((sum, log) => sum + log.seasonalityFactor, 0) /
        itemLogs.length;

      if (avgSeasonality > 0.5) {
        seasonalRisk = true;
        recommendations.push(
          `${item.itemName}: Seasonal price variation detected - consider timing`
        );
      }

      // 在庫レベルリスク
      const lowStockLogs = itemLogs.filter(
        (log) => log.stockLevel === "LOW_STOCK" || log.stockLevel === "OUT_OF_STOCK"
      );
      if (lowStockLogs.length > itemLogs.length * 0.3) {
        volatilityScore += 20;
        recommendations.push(
          `${item.itemName}: Frequent stock shortages detected`
        );
      }

      // マージン減少トレンド
      if (itemLogs.length >= 3) {
        const recentLogs = itemLogs.slice(-3);
        const marginTrend =
          recentLogs[2].marginPercentage - recentLogs[0].marginPercentage;
        if (marginTrend < -5) {
          volatilityScore += 15;
          recommendations.push(
            `${item.itemName}: Declining profit margin trend detected (${marginTrend.toFixed(1)}%)`
          );
        }
      }
    }

    volatilityScore = Math.min(100, volatilityScore);

    return {
      volatilityScore,
      seasonalRisk,
      recommendations,
    };
  }

  /**
   * AIによる包括的リスク分析
   */
  private async performAIRiskAnalysis(
    order: OrderInfo,
    karitoriAlerts: KaritoriAlert[],
    arbitrageLogs: RakutenArbitrageLog[],
    basicRiskScore: number,
    supplierReliability: any,
    priceRiskAnalysis: any
  ): Promise<RiskAnalysisResult> {
    const model = this.genAI!.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    const prompt = this.buildAIRiskPrompt(
      order,
      karitoriAlerts,
      arbitrageLogs,
      basicRiskScore,
      supplierReliability,
      priceRiskAnalysis
    );

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return this.parseAIRiskResponse(
      text,
      order,
      basicRiskScore,
      supplierReliability,
      priceRiskAnalysis
    );
  }

  /**
   * AI リスク分析プロンプト構築
   */
  private buildAIRiskPrompt(
    order: OrderInfo,
    karitoriAlerts: KaritoriAlert[],
    arbitrageLogs: RakutenArbitrageLog[],
    basicRiskScore: number,
    supplierReliability: any,
    priceRiskAnalysis: any
  ): string {
    return `You are an AI risk analyst for an e-commerce business. Analyze this order and provide a comprehensive risk assessment.

Order Information:
- Order ID: ${order.orderId}
- Marketplace: ${order.marketplace}
- Total Amount: ${order.totalAmount} ${order.currency}
- Number of Items: ${order.items.length}
- Customer History: ${order.customerHistory ? `${order.customerHistory.totalOrders} orders, ${(order.customerHistory.returnRate * 100).toFixed(1)}% return rate, ${order.customerHistory.disputeCount} disputes` : "New customer"}
- Shipping Destination: ${order.shippingAddress.country}

Preliminary Risk Scores:
- Basic Risk Score: ${basicRiskScore}/100
- Supplier Reliability: ${supplierReliability.score}/100
- Price Volatility: ${priceRiskAnalysis.volatilityScore}/100

Supplier Issues:
${supplierReliability.issues.length > 0 ? supplierReliability.issues.join("\n") : "No critical issues"}

Price Risk Alerts:
${priceRiskAnalysis.recommendations.length > 0 ? priceRiskAnalysis.recommendations.join("\n") : "No significant price risks"}

Karitori Alerts: ${karitoriAlerts.length} active alerts
Arbitrage Logs: ${arbitrageLogs.length} historical records

Based on this data, provide your analysis in JSON format:
{
  "aiRiskScore": 0-100,
  "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW|MINIMAL",
  "riskFactors": [
    {
      "category": "Customer Risk | Supplier Risk | Price Risk | Geographic Risk",
      "score": 0-100,
      "description": "brief description",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW"
    }
  ],
  "overallAssessment": "comprehensive summary of risk analysis",
  "actionableInsights": ["insight 1", "insight 2", "insight 3"],
  "confidence": 0.0-1.0
}

Focus on:
1. Customer fraud risk indicators
2. Supplier reliability and fulfillment capability
3. Price volatility and seasonal factors
4. Geographic and shipping risks
5. Overall business risk exposure

Respond ONLY with valid JSON.`;
  }

  /**
   * AI リスク分析レスポンスのパース
   */
  private parseAIRiskResponse(
    text: string,
    order: OrderInfo,
    basicRiskScore: number,
    supplierReliability: any,
    priceRiskAnalysis: any
  ): RiskAnalysisResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        orderId: order.orderId,
        aiRiskScore: Math.max(0, Math.min(100, parsed.aiRiskScore || basicRiskScore)),
        riskLevel: this.validateRiskLevel(parsed.riskLevel),
        riskFactors: parsed.riskFactors || [],
        supplierReliability,
        priceRiskAnalysis,
        overallAssessment: parsed.overallAssessment || "Risk analysis completed",
        actionableInsights: parsed.actionableInsights || [],
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.75)),
      };
    } catch (error) {
      console.error("Failed to parse AI risk response:", error);
      return this.generateBasicRiskAnalysis(
        order,
        basicRiskScore,
        supplierReliability,
        priceRiskAnalysis
      );
    }
  }

  /**
   * リスクレベルの検証
   */
  private validateRiskLevel(level: string): RiskLevel {
    const validLevels = Object.values(RiskLevel);
    if (validLevels.includes(level as RiskLevel)) {
      return level as RiskLevel;
    }
    return RiskLevel.MEDIUM;
  }

  /**
   * 基本リスク分析結果生成（AI未使用時）
   */
  private generateBasicRiskAnalysis(
    order: OrderInfo,
    basicRiskScore: number,
    supplierReliability: any,
    priceRiskAnalysis: any
  ): RiskAnalysisResult {
    // 総合リスクスコア計算
    const aiRiskScore = Math.round(
      basicRiskScore * 0.4 +
        (100 - supplierReliability.score) * 0.3 +
        priceRiskAnalysis.volatilityScore * 0.3
    );

    const riskLevel = this.getRiskLevel(aiRiskScore);

    const riskFactors = [
      {
        category: "Customer Risk",
        score: basicRiskScore,
        description: order.customerHistory
          ? `${order.customerHistory.returnRate > 0.2 ? "High" : "Normal"} return rate, ${order.customerHistory.disputeCount} disputes`
          : "New customer - limited history",
        severity: basicRiskScore > 50 ? "HIGH" : "MEDIUM",
      },
      {
        category: "Supplier Risk",
        score: 100 - supplierReliability.score,
        description:
          supplierReliability.issues.length > 0
            ? `${supplierReliability.issues.length} active issues`
            : "No significant supplier issues",
        severity: supplierReliability.score < 70 ? "HIGH" : "LOW",
      },
      {
        category: "Price Risk",
        score: priceRiskAnalysis.volatilityScore,
        description: priceRiskAnalysis.seasonalRisk
          ? "Seasonal price variation detected"
          : "Price volatility within normal range",
        severity: priceRiskAnalysis.volatilityScore > 60 ? "HIGH" : "MEDIUM",
      },
    ];

    const actionableInsights: string[] = [];
    if (basicRiskScore > 50) {
      actionableInsights.push("Monitor customer behavior closely");
    }
    if (supplierReliability.score < 70) {
      actionableInsights.push("Consider alternative suppliers");
    }
    if (priceRiskAnalysis.volatilityScore > 60) {
      actionableInsights.push("Review pricing strategy");
    }

    return {
      orderId: order.orderId,
      aiRiskScore,
      riskLevel,
      riskFactors,
      supplierReliability,
      priceRiskAnalysis,
      overallAssessment: `Order carries ${riskLevel.toLowerCase()} risk based on customer history, supplier reliability, and price volatility.`,
      actionableInsights,
      confidence: 0.7,
    };
  }

  /**
   * リスクレベル判定
   */
  private getRiskLevel(score: number): RiskLevel {
    if (score >= 90) return RiskLevel.CRITICAL;
    if (score >= 70) return RiskLevel.HIGH;
    if (score >= 40) return RiskLevel.MEDIUM;
    if (score >= 20) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
  }
}

// デフォルトインスタンス
let defaultAnalyzer: RiskAnalyzer | null = null;

export function getRiskAnalyzer(): RiskAnalyzer {
  if (!defaultAnalyzer) {
    defaultAnalyzer = new RiskAnalyzer();
  }
  return defaultAnalyzer;
}
