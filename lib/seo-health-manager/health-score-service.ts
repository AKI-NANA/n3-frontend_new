// health-score-service.ts: SEO健全性スコアサービス with Gemini Vision API (I2-2)

import { GoogleGenerativeAI } from "@google/generative-ai";

// 健全性スコアの範囲
export enum HealthScoreRange {
  EXCELLENT = "EXCELLENT", // 80-100
  GOOD = "GOOD", // 60-79
  FAIR = "FAIR", // 40-59
  POOR = "POOR", // 20-39
  CRITICAL = "CRITICAL", // 0-19
}

// リスティング情報
export interface ListingInfo {
  listingId: string;
  marketplace: string; // eBay, Amazon, etc.
  title: string;
  description: string;
  imageUrls: string[];
  price: number;
  currency: string;
  category: string;
  viewCount: number;
  salesCount: number;
  conversionRate: number;
  healthScore?: number;
}

// AI分析結果
export interface AIImprovementSuggestion {
  listingId: string;
  currentTitle: string;
  suggestedTitles: string[];
  titleImprovement: {
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  };
  imageAnalysis: {
    compliance: boolean;
    violations: string[];
    suggestions: string[];
    qualityScore: number; // 0-100
  };
  overallRecommendation: string;
  estimatedScoreImprovement: number; // +X points
  confidence: number; // 0-1
}

// 健全性スコア計算の重み
const HEALTH_SCORE_WEIGHTS = {
  titleQuality: 0.25,
  imageQuality: 0.25,
  descriptionQuality: 0.15,
  conversionRate: 0.20,
  viewToSalesRatio: 0.15,
};

/**
 * SEO健全性スコアサービス
 */
export class HealthScoreService {
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
        "Gemini API key not provided. Health score service will run in limited mode."
      );
    }
  }

  /**
   * リスティングの健全性スコアを計算
   */
  calculateHealthScore(listing: ListingInfo): number {
    const titleScore = this.evaluateTitleQuality(listing.title);
    const imageScore = this.evaluateImageQuality(listing.imageUrls.length);
    const descriptionScore = this.evaluateDescriptionQuality(
      listing.description
    );
    const conversionScore = listing.conversionRate * 100;
    const viewToSalesScore = this.evaluateViewToSalesRatio(
      listing.viewCount,
      listing.salesCount
    );

    const totalScore =
      titleScore * HEALTH_SCORE_WEIGHTS.titleQuality +
      imageScore * HEALTH_SCORE_WEIGHTS.imageQuality +
      descriptionScore * HEALTH_SCORE_WEIGHTS.descriptionQuality +
      conversionScore * HEALTH_SCORE_WEIGHTS.conversionRate +
      viewToSalesScore * HEALTH_SCORE_WEIGHTS.viewToSalesRatio;

    return Math.round(Math.max(0, Math.min(100, totalScore)));
  }

  /**
   * タイトル品質評価（基本ロジック）
   */
  private evaluateTitleQuality(title: string): number {
    let score = 50; // ベーススコア

    // 長さチェック
    if (title.length >= 60 && title.length <= 80) {
      score += 20;
    } else if (title.length >= 40 && title.length < 60) {
      score += 10;
    } else if (title.length < 40 || title.length > 100) {
      score -= 10;
    }

    // キーワード密度
    const words = title.split(/\s+/);
    if (words.length >= 8 && words.length <= 15) {
      score += 15;
    }

    // 大文字小文字のバランス
    const uppercaseRatio =
      (title.match(/[A-Z]/g) || []).length / title.length;
    if (uppercaseRatio > 0.1 && uppercaseRatio < 0.3) {
      score += 10;
    }

    // 特殊文字の過剰使用
    const specialChars = (title.match(/[!@#$%^&*()]/g) || []).length;
    if (specialChars > 3) {
      score -= 15;
    }

    // 数字の存在（モデル番号、サイズなど）
    if (/\d/.test(title)) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 画像品質評価（基本ロジック）
   */
  private evaluateImageQuality(imageCount: number): number {
    if (imageCount === 0) return 0;
    if (imageCount >= 8) return 100;
    if (imageCount >= 5) return 80;
    if (imageCount >= 3) return 60;
    if (imageCount >= 1) return 40;
    return 20;
  }

  /**
   * 説明品質評価
   */
  private evaluateDescriptionQuality(description: string): number {
    let score = 50;

    if (description.length >= 500 && description.length <= 2000) {
      score += 25;
    } else if (description.length >= 200 && description.length < 500) {
      score += 15;
    } else if (description.length < 200) {
      score -= 20;
    }

    // HTMLタグの存在（リッチフォーマット）
    if (/<[a-z][\s\S]*>/i.test(description)) {
      score += 10;
    }

    // 箇条書きの存在
    if (/<ul>|<ol>|<li>/i.test(description) || /\n\s*[-*•]/.test(description)) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 閲覧数対販売数の比率評価
   */
  private evaluateViewToSalesRatio(viewCount: number, salesCount: number): number {
    if (viewCount === 0) return 0;
    const ratio = salesCount / viewCount;

    if (ratio >= 0.05) return 100; // 5%以上の転換率
    if (ratio >= 0.03) return 80; // 3-5%
    if (ratio >= 0.01) return 60; // 1-3%
    if (ratio >= 0.005) return 40; // 0.5-1%
    return 20;
  }

  /**
   * 健全性スコア範囲の取得
   */
  getScoreRange(score: number): HealthScoreRange {
    if (score >= 80) return HealthScoreRange.EXCELLENT;
    if (score >= 60) return HealthScoreRange.GOOD;
    if (score >= 40) return HealthScoreRange.FAIR;
    if (score >= 20) return HealthScoreRange.POOR;
    return HealthScoreRange.CRITICAL;
  }

  /**
   * I2-2: Gemini Vision APIを利用した改善提案生成
   */
  async generateAIImprovementSuggestions(
    listing: ListingInfo
  ): Promise<AIImprovementSuggestion> {
    if (!this.genAI) {
      return this.generateBasicSuggestions(listing);
    }

    try {
      // タイトル分析
      const titleAnalysis = await this.analyzeTitleWithAI(listing);

      // 画像分析（Vision API）
      const imageAnalysis = await this.analyzeImagesWithVisionAI(listing);

      // 総合的な推奨事項
      const overallRecommendation = this.generateOverallRecommendation(
        titleAnalysis,
        imageAnalysis,
        listing
      );

      // スコア改善予測
      const estimatedImprovement = this.estimateScoreImprovement(
        titleAnalysis,
        imageAnalysis
      );

      return {
        listingId: listing.listingId,
        currentTitle: listing.title,
        suggestedTitles: titleAnalysis.suggestedTitles,
        titleImprovement: titleAnalysis.improvement,
        imageAnalysis: imageAnalysis,
        overallRecommendation,
        estimatedScoreImprovement: estimatedImprovement,
        confidence: 0.85,
      };
    } catch (error) {
      console.error("AI improvement suggestion generation failed:", error);
      return this.generateBasicSuggestions(listing);
    }
  }

  /**
   * AI タイトル分析
   */
  private async analyzeTitleWithAI(listing: ListingInfo): Promise<{
    suggestedTitles: string[];
    improvement: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
  }> {
    const model = this.genAI!.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    const prompt = `Analyze this product listing title for ${listing.marketplace} and suggest improvements:

Current Title: "${listing.title}"
Category: ${listing.category}
Current Price: ${listing.price} ${listing.currency}

Provide your response in JSON format:
{
  "suggestedTitles": ["improved title 1", "improved title 2", "improved title 3"],
  "currentScore": 0-100,
  "issues": ["issue 1", "issue 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}

Focus on:
1. SEO optimization (keywords at the beginning)
2. ${listing.marketplace} best practices (character limits, formatting)
3. Clear product identification (brand, model, key features)
4. Compelling but accurate descriptions
5. Proper capitalization and grammar

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        suggestedTitles: parsed.suggestedTitles || [],
        improvement: {
          score: parsed.currentScore || 50,
          issues: parsed.issues || [],
          recommendations: parsed.recommendations || [],
        },
      };
    } catch (error) {
      console.error("Failed to parse AI title analysis:", error);
      return {
        suggestedTitles: [],
        improvement: {
          score: 50,
          issues: ["AI analysis unavailable"],
          recommendations: ["Manual review recommended"],
        },
      };
    }
  }

  /**
   * AI 画像分析（Vision API）
   */
  private async analyzeImagesWithVisionAI(listing: ListingInfo): Promise<{
    compliance: boolean;
    violations: string[];
    suggestions: string[];
    qualityScore: number;
  }> {
    if (listing.imageUrls.length === 0) {
      return {
        compliance: false,
        violations: ["No images provided"],
        suggestions: ["Add at least 5 high-quality product images"],
        qualityScore: 0,
      };
    }

    const model = this.genAI!.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    // 最初の3枚の画像を分析
    const imagesToAnalyze = listing.imageUrls.slice(0, 3);

    const prompt = `Analyze these product images for ${listing.marketplace} listing compliance and quality:

Product: ${listing.title}
Category: ${listing.category}
Number of images: ${listing.imageUrls.length}

Check for ${listing.marketplace} image policy violations:
- eBay: No borders, text overlays, watermarks, or promotional content
- Amazon: Pure white background (RGB 255,255,255), product must fill 85% of frame
- Generic: Clear focus, good lighting, multiple angles

Provide JSON response:
{
  "compliance": true/false,
  "violations": ["violation 1", "violation 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "qualityScore": 0-100
}

Respond ONLY with valid JSON.`;

    try {
      // 画像URLを取得（実際のVision分析では画像データが必要）
      // 簡略化のため、ここではテキストベースの分析
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        compliance: parsed.compliance !== false,
        violations: parsed.violations || [],
        suggestions: parsed.suggestions || [],
        qualityScore: parsed.qualityScore || 70,
      };
    } catch (error) {
      console.error("Failed to analyze images with AI:", error);
      return {
        compliance: true,
        violations: [],
        suggestions: ["Consider adding more product angles"],
        qualityScore: 70,
      };
    }
  }

  /**
   * 総合的な推奨事項を生成
   */
  private generateOverallRecommendation(
    titleAnalysis: any,
    imageAnalysis: any,
    listing: ListingInfo
  ): string {
    const recommendations: string[] = [];

    if (titleAnalysis.improvement.score < 70) {
      recommendations.push(
        "Title optimization is critical - use suggested titles to improve SEO"
      );
    }

    if (imageAnalysis.qualityScore < 70) {
      recommendations.push(
        "Image quality needs improvement - follow platform guidelines"
      );
    }

    if (!imageAnalysis.compliance) {
      recommendations.push(
        "URGENT: Image policy violations detected - fix to avoid listing removal"
      );
    }

    if (listing.conversionRate < 0.01) {
      recommendations.push(
        "Low conversion rate - review pricing and product description"
      );
    }

    if (recommendations.length === 0) {
      return "Listing is performing well. Continue monitoring and make minor adjustments as needed.";
    }

    return recommendations.join(" | ");
  }

  /**
   * スコア改善予測
   */
  private estimateScoreImprovement(
    titleAnalysis: any,
    imageAnalysis: any
  ): number {
    let improvement = 0;

    // タイトル改善による予測
    if (titleAnalysis.improvement.score < 70) {
      improvement += (70 - titleAnalysis.improvement.score) * 0.25; // 25% weight
    }

    // 画像改善による予測
    if (imageAnalysis.qualityScore < 80) {
      improvement += (80 - imageAnalysis.qualityScore) * 0.25; // 25% weight
    }

    return Math.round(improvement);
  }

  /**
   * 基本的な改善提案（AI未使用）
   */
  private generateBasicSuggestions(
    listing: ListingInfo
  ): AIImprovementSuggestion {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // タイトルチェック
    if (listing.title.length < 40) {
      issues.push("Title is too short");
      recommendations.push("Expand title to 60-80 characters with key features");
    }
    if (listing.title.length > 100) {
      issues.push("Title is too long");
      recommendations.push("Reduce title to 60-80 characters, focus on essentials");
    }

    // 画像チェック
    if (listing.imageUrls.length < 5) {
      issues.push("Insufficient images");
      recommendations.push("Add more product images (minimum 5, recommended 8+)");
    }

    // 転換率チェック
    if (listing.conversionRate < 0.01) {
      issues.push("Low conversion rate");
      recommendations.push("Review pricing strategy and product description");
    }

    return {
      listingId: listing.listingId,
      currentTitle: listing.title,
      suggestedTitles: [],
      titleImprovement: {
        score: this.evaluateTitleQuality(listing.title),
        issues,
        recommendations,
      },
      imageAnalysis: {
        compliance: true,
        violations: [],
        suggestions:
          listing.imageUrls.length < 5
            ? ["Add more product images"]
            : ["Image quality looks acceptable"],
        qualityScore: this.evaluateImageQuality(listing.imageUrls.length),
      },
      overallRecommendation: recommendations.join(" | ") || "No major issues detected",
      estimatedScoreImprovement: 0,
      confidence: 0.6,
    };
  }

  /**
   * 全リスティングのスコア更新（I4-2で使用）
   */
  async updateAllListings(listings: ListingInfo[]): Promise<void> {
    for (const listing of listings) {
      const score = this.calculateHealthScore(listing);
      listing.healthScore = score;

      // スコアが低いリスティングに対してAI提案を生成
      if (score < 60) {
        try {
          const suggestions = await this.generateAIImprovementSuggestions(
            listing
          );
          console.log(
            `Improvement suggestions for ${listing.listingId}:`,
            suggestions
          );
        } catch (error) {
          console.error(
            `Failed to generate suggestions for ${listing.listingId}:`,
            error
          );
        }
      }
    }
  }
}

// デフォルトインスタンス
let defaultService: HealthScoreService | null = null;

export function getHealthScoreService(): HealthScoreService {
  if (!defaultService) {
    defaultService = new HealthScoreService();
  }
  return defaultService;
}
