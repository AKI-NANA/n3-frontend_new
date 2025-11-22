// lib/seo-health-manager/health-score-service.ts

/**
 * I2: AI連携の完全実装
 * SEO健全性スコア評価・改善提案サービス（Gemini API統合）
 *
 * このモジュールは、マーケットプレイスのリスティング品質を評価し、
 * AIを使用してSEO改善提案を生成します。
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// 型定義
// ============================================================================

/**
 * リスティングデータ
 */
export interface ListingData {
  id: string;
  sku: string;
  marketplace: string;
  listingTitle: string;
  category?: string;
  viewsCount: number;
  salesCount: number;
  currentPrice: number;
  competitorAvgPrice?: number;
  imageCount: number;
  descriptionLength: number;
  daysListed: number;
  lastUpdated?: Date;
}

/**
 * 健全性スコア
 */
export interface HealthScore {
  overall: number; // 0-100
  title: number; // 0-100
  pricing: number; // 0-100
  engagement: number; // 0-100
  freshness: number; // 0-100
  quality: number; // 0-100
}

/**
 * SEO改善提案
 */
export interface SEOSuggestion {
  category: "title" | "pricing" | "images" | "description" | "category" | "keywords";
  priority: "high" | "medium" | "low";
  suggestion: string;
  expectedImpact: string;
  actionRequired: string;
}

/**
 * AI分析結果
 */
export interface HealthAnalysisResult {
  listingId: string;
  healthScore: HealthScore;
  suggestions: SEOSuggestion[];
  isDeadListing: boolean;
  isDeclining: boolean;
  competitivenessScore: number; // 0-100
  aiInsights: string[];
  processingTime: number;
}

// ============================================================================
// HealthScoreService クラス
// ============================================================================

/**
 * SEO健全性スコア評価サービス
 */
export class HealthScoreService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";

    if (!apiKey) {
      console.warn(
        "⚠️ [HealthScoreService] GEMINI_API_KEY is not set. AI features will be disabled."
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
    });
  }

  // ==========================================================================
  // メイン処理: 健全性スコア計算
  // ==========================================================================

  /**
   * リスティングの健全性スコアを計算し、改善提案を生成
   *
   * @param listing - リスティングデータ
   * @returns 健全性分析結果
   */
  async analyzeListingHealth(
    listing: ListingData
  ): Promise<HealthAnalysisResult> {
    const startTime = Date.now();

    console.log(
      `\n📊 [HealthScoreService] Analyzing listing: ${listing.sku} (${listing.marketplace})`
    );

    try {
      // STEP 1: 基本スコアを計算（ルールベース）
      const healthScore = this.calculateBasicHealthScore(listing);

      console.log(`   📈 Basic health score calculated:`);
      console.log(`      Overall: ${healthScore.overall}/100`);
      console.log(`      Title: ${healthScore.title}/100`);
      console.log(`      Pricing: ${healthScore.pricing}/100`);
      console.log(`      Engagement: ${healthScore.engagement}/100`);

      // STEP 2: AIを使用して改善提案を生成
      const suggestions = await this.generateAISuggestions(listing, healthScore);

      // STEP 3: 追加の指標を計算
      const isDeadListing = this.checkDeadListing(listing);
      const isDeclining = this.checkDeclining(listing);
      const competitivenessScore = this.calculateCompetitivenessScore(listing);

      // STEP 4: AIインサイトを生成
      const aiInsights = await this.generateAIInsights(
        listing,
        healthScore,
        suggestions
      );

      const processingTime = Date.now() - startTime;

      console.log(`   ✅ Analysis completed in ${processingTime}ms`);
      console.log(`      Dead listing: ${isDeadListing}`);
      console.log(`      Declining: ${isDeclining}`);
      console.log(`      Suggestions: ${suggestions.length}`);

      return {
        listingId: listing.id,
        healthScore,
        suggestions,
        isDeadListing,
        isDeclining,
        competitivenessScore,
        aiInsights,
        processingTime,
      };
    } catch (error) {
      console.error(`   ❌ [HealthScoreService] Analysis failed:`, error);

      // フォールバック: 基本スコアのみ
      return {
        listingId: listing.id,
        healthScore: this.calculateBasicHealthScore(listing),
        suggestions: [],
        isDeadListing: false,
        isDeclining: false,
        competitivenessScore: 50,
        aiInsights: ["AI分析が失敗しました。基本スコアのみを表示しています。"],
        processingTime: Date.now() - startTime,
      };
    }
  }

  // ==========================================================================
  // STEP 1: 基本スコア計算（ルールベース）
  // ==========================================================================

  /**
   * ルールベースで基本的な健全性スコアを計算
   */
  private calculateBasicHealthScore(listing: ListingData): HealthScore {
    // タイトルスコア（文字数、キーワード密度など）
    const title = this.calculateTitleScore(listing);

    // 価格スコア（競合との比較）
    const pricing = this.calculatePricingScore(listing);

    // エンゲージメントスコア（閲覧数、販売数）
    const engagement = this.calculateEngagementScore(listing);

    // 鮮度スコア（最終更新日）
    const freshness = this.calculateFreshnessScore(listing);

    // 品質スコア（画像、説明文）
    const quality = this.calculateQualityScore(listing);

    // 総合スコア（重み付け平均）
    const overall = Math.round(
      title * 0.25 +
      pricing * 0.20 +
      engagement * 0.30 +
      freshness * 0.10 +
      quality * 0.15
    );

    return {
      overall,
      title,
      pricing,
      engagement,
      freshness,
      quality,
    };
  }

  private calculateTitleScore(listing: ListingData): number {
    let score = 100;

    // タイトル長チェック
    const titleLength = listing.listingTitle.length;
    if (titleLength < 20) {
      score -= 30; // タイトルが短すぎる
    } else if (titleLength > 80) {
      score -= 10; // タイトルが長すぎる
    }

    // キーワード密度（簡易版）
    const hasNumbers = /\d/.test(listing.listingTitle);
    const hasBrand = /brand|メーカー|ブランド/i.test(listing.listingTitle);

    if (!hasNumbers) score -= 10;
    if (!hasBrand) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private calculatePricingScore(listing: ListingData): number {
    if (!listing.competitorAvgPrice) return 70; // デフォルト

    const priceRatio = listing.currentPrice / listing.competitorAvgPrice;

    // 競合平均価格の80%〜120%の範囲が理想
    if (priceRatio >= 0.8 && priceRatio <= 1.2) {
      return 100;
    } else if (priceRatio < 0.8) {
      return 60; // 安すぎる（利益率低下）
    } else if (priceRatio > 1.5) {
      return 40; // 高すぎる（売れにくい）
    } else {
      return 80;
    }
  }

  private calculateEngagementScore(listing: ListingData): number {
    const conversionRate =
      listing.viewsCount > 0 ? listing.salesCount / listing.viewsCount : 0;

    // コンバージョン率ベースのスコア
    if (conversionRate >= 0.05) return 100; // 5%以上は優秀
    if (conversionRate >= 0.03) return 80; // 3%以上は良好
    if (conversionRate >= 0.01) return 60; // 1%以上は普通
    if (conversionRate > 0) return 40; // 少しでも売れていればOK

    // 閲覧数がある場合
    if (listing.viewsCount > 100) return 30; // 閲覧はあるが売れていない
    if (listing.viewsCount > 10) return 20;

    return 10; // ほぼ放置状態
  }

  private calculateFreshnessScore(listing: ListingData): number {
    if (!listing.lastUpdated) return 50; // デフォルト

    const daysSinceUpdate =
      (Date.now() - listing.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate <= 7) return 100; // 1週間以内
    if (daysSinceUpdate <= 30) return 80; // 1ヶ月以内
    if (daysSinceUpdate <= 90) return 60; // 3ヶ月以内
    if (daysSinceUpdate <= 180) return 40; // 6ヶ月以内

    return 20; // 6ヶ月以上更新なし
  }

  private calculateQualityScore(listing: ListingData): number {
    let score = 100;

    // 画像数チェック
    if (listing.imageCount < 3) {
      score -= 30; // 画像が少なすぎる
    } else if (listing.imageCount < 5) {
      score -= 10;
    }

    // 説明文の長さチェック
    if (listing.descriptionLength < 100) {
      score -= 30; // 説明が短すぎる
    } else if (listing.descriptionLength < 200) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ==========================================================================
  // STEP 2: AI改善提案生成
  // ==========================================================================

  /**
   * Gemini APIを使用してSEO改善提案を生成
   */
  private async generateAISuggestions(
    listing: ListingData,
    healthScore: HealthScore
  ): Promise<SEOSuggestion[]> {
    const prompt = `
あなたはECマーケットプレイスのSEO専門家です。
以下のリスティングデータを分析し、SEO改善提案を生成してください。

【リスティング情報】
SKU: ${listing.sku}
マーケットプレイス: ${listing.marketplace}
タイトル: ${listing.listingTitle}
カテゴリ: ${listing.category || "不明"}
価格: ¥${listing.currentPrice.toLocaleString()}
競合平均価格: ¥${listing.competitorAvgPrice?.toLocaleString() || "不明"}
閲覧数: ${listing.viewsCount}
販売数: ${listing.salesCount}
画像数: ${listing.imageCount}
説明文の長さ: ${listing.descriptionLength}文字
出品日数: ${listing.daysListed}日

【健全性スコア】
総合: ${healthScore.overall}/100
タイトル: ${healthScore.title}/100
価格: ${healthScore.pricing}/100
エンゲージメント: ${healthScore.engagement}/100
鮮度: ${healthScore.freshness}/100
品質: ${healthScore.quality}/100

【指示】
以下のJSON配列形式で、最大5つのSEO改善提案を生成してください:

[
  {
    "category": "title | pricing | images | description | category | keywords",
    "priority": "high | medium | low",
    "suggestion": "改善提案の内容",
    "expectedImpact": "期待される効果",
    "actionRequired": "実行すべきアクション"
  },
  ...
]

優先度の判断基準:
- high: スコアが50未満の項目に関する提案
- medium: スコアが50-80の項目に関する提案
- low: スコアが80以上だが改善の余地がある項目
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSONを抽出
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from AI response");
      }

      const suggestions: SEOSuggestion[] = JSON.parse(jsonMatch[0]);

      return suggestions;
    } catch (error) {
      console.error(`❌ [HealthScoreService] AI suggestion generation failed:`, error);

      // フォールバック: ルールベースの提案
      return this.getRuleBasedSuggestions(listing, healthScore);
    }
  }

  // ==========================================================================
  // STEP 3: 追加指標の計算
  // ==========================================================================

  /**
   * デッドリスティングかをチェック
   */
  private checkDeadListing(listing: ListingData): boolean {
    // 30日以上出品されているが、閲覧数が10未満で販売が0の場合
    if (
      listing.daysListed >= 30 &&
      listing.viewsCount < 10 &&
      listing.salesCount === 0
    ) {
      return true;
    }

    return false;
  }

  /**
   * 衰退傾向かをチェック
   */
  private checkDeclining(listing: ListingData): boolean {
    // TODO: 過去のデータと比較して衰退傾向を判定
    // 現在は簡易版として、閲覧数が少なく販売が減少している場合を判定

    const conversionRate =
      listing.viewsCount > 0 ? listing.salesCount / listing.viewsCount : 0;

    // コンバージョン率が1%未満で、出品日数が30日以上の場合
    if (conversionRate < 0.01 && listing.daysListed >= 30) {
      return true;
    }

    return false;
  }

  /**
   * 競争力スコアを計算
   */
  private calculateCompetitivenessScore(listing: ListingData): number {
    if (!listing.competitorAvgPrice) return 50; // デフォルト

    let score = 50;

    // 価格競争力
    const priceRatio = listing.currentPrice / listing.competitorAvgPrice;
    if (priceRatio <= 0.95) {
      score += 30; // 競合より安い
    } else if (priceRatio > 1.1) {
      score -= 20; // 競合より高い
    }

    // エンゲージメント
    if (listing.viewsCount > 100) score += 10;
    if (listing.salesCount > 10) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  // ==========================================================================
  // STEP 4: AIインサイト生成
  // ==========================================================================

  /**
   * AI総合インサイトを生成
   */
  private async generateAIInsights(
    listing: ListingData,
    healthScore: HealthScore,
    suggestions: SEOSuggestion[]
  ): Promise<string[]> {
    const prompt = `
以下のリスティングデータと改善提案を踏まえて、
経営者向けの簡潔なインサイトを3つ生成してください。

【データ】
総合スコア: ${healthScore.overall}/100
閲覧数: ${listing.viewsCount}
販売数: ${listing.salesCount}
出品日数: ${listing.daysListed}日

【改善提案数】
${suggestions.length}件

各インサイトは1文で、具体的なアクションを含めてください。
以下の形式で返してください:

["インサイト1", "インサイト2", "インサイト3"]
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from AI response");
      }

      const insights: string[] = JSON.parse(jsonMatch[0]);

      return insights.slice(0, 3); // 最大3つ
    } catch (error) {
      console.error(`❌ [HealthScoreService] AI insights generation failed:`, error);

      // フォールバック
      return this.getDefaultInsights(healthScore);
    }
  }

  // ==========================================================================
  // フォールバック関数
  // ==========================================================================

  /**
   * ルールベースの改善提案を取得
   */
  private getRuleBasedSuggestions(
    listing: ListingData,
    healthScore: HealthScore
  ): SEOSuggestion[] {
    const suggestions: SEOSuggestion[] = [];

    if (healthScore.title < 70) {
      suggestions.push({
        category: "title",
        priority: "high",
        suggestion: "タイトルを最適化して検索性を向上させる",
        expectedImpact: "検索結果での表示回数が増加する見込み",
        actionRequired: "ブランド名、モデル番号、主要な特徴をタイトルに含める",
      });
    }

    if (healthScore.pricing < 70) {
      suggestions.push({
        category: "pricing",
        priority: "high",
        suggestion: "価格を競合相場に近づける",
        expectedImpact: "コンバージョン率が改善する見込み",
        actionRequired: "競合価格を調査し、適切な価格帯に調整する",
      });
    }

    if (healthScore.quality < 70) {
      suggestions.push({
        category: "images",
        priority: "medium",
        suggestion: "商品画像を追加する",
        expectedImpact: "購入意欲が高まる",
        actionRequired: "最低5枚以上の高品質な画像をアップロードする",
      });
    }

    return suggestions;
  }

  /**
   * デフォルトインサイトを取得
   */
  private getDefaultInsights(healthScore: HealthScore): string[] {
    const insights: string[] = [];

    if (healthScore.overall >= 80) {
      insights.push("総合的に良好な状態です。現状維持を心がけましょう。");
    } else if (healthScore.overall >= 60) {
      insights.push("改善の余地があります。優先度の高い項目から対応しましょう。");
    } else {
      insights.push("早急な改善が必要です。SEO最適化を実施してください。");
    }

    return insights;
  }

  // ==========================================================================
  // バッチ処理
  // ==========================================================================

  /**
   * 複数のリスティングを一括分析
   */
  async analyzeBatch(listings: ListingData[]): Promise<HealthAnalysisResult[]> {
    console.log(
      `\n🔄 [HealthScoreService] Analyzing batch of ${listings.length} listings...`
    );

    const results: HealthAnalysisResult[] = [];

    for (const listing of listings) {
      const result = await this.analyzeListingHealth(listing);
      results.push(result);

      // レート制限対策: 各リクエスト間に500ms待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const avgScore =
      results.reduce((sum, r) => sum + r.healthScore.overall, 0) /
      results.length;
    const deadListings = results.filter((r) => r.isDeadListing).length;

    console.log(`\n✅ [HealthScoreService] Batch analysis completed:`);
    console.log(`   Total: ${listings.length}`);
    console.log(`   Average score: ${avgScore.toFixed(1)}/100`);
    console.log(`   Dead listings: ${deadListings}`);

    return results;
  }
}

// ============================================================================
// エクスポート: シングルトンインスタンス
// ============================================================================

let healthScoreServiceInstance: HealthScoreService | null = null;

/**
 * HealthScoreServiceのシングルトンインスタンスを取得
 */
export function getHealthScoreService(): HealthScoreService {
  if (!healthScoreServiceInstance) {
    healthScoreServiceInstance = new HealthScoreService();
  }
  return healthScoreServiceInstance;
}
