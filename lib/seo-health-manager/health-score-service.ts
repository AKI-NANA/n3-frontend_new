/**
 * I2: AI連携完全実装 - SEO健全性スコアサービス
 * Gemini Vision APIを使用して、リスティングの改善提案を生成
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ==========================================
// 型定義
// ==========================================

interface MarketplaceListing {
  id: string;
  marketplace: string;
  listingId: string;
  sku: string;
  title: string;
  description: string;
  price: number;
  mainImageUrl?: string;
  imageUrls: string[];
  healthScore: number;
  viewsCount: number;
  clicksCount: number;
  conversionRate: number;
  salesCount: number;
  status: string;
}

interface HealthScoreResult {
  healthScore: number;
  seoIssues: SEOIssue[];
  suggestedTitle?: string;
  suggestedImprovements: string[];
  autoTerminateRecommended: boolean;
  confidence: number;
}

interface SEOIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

interface ImageAnalysisResult {
  quality: number;
  policyViolations: string[];
  recommendations: string[];
}

// ==========================================
// SEO健全性スコアサービス
// ==========================================

export class HealthScoreService {
  private genAI: GoogleGenerativeAI;
  private textModel: any;
  private visionModel: any;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || '';

    if (!key) {
      throw new Error('GEMINI_API_KEY が設定されていません。');
    }

    this.genAI = new GoogleGenerativeAI(key);
    this.textModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * リスティングの健全性スコアを計算
   */
  async calculateHealthScore(listing: MarketplaceListing): Promise<HealthScoreResult> {
    console.log(`📊 健全性スコア計算開始: ${listing.listingId}`);

    try {
      // 各種指標を分析
      const performanceScore = this.calculatePerformanceScore(listing);
      const seoIssues = await this.detectSEOIssues(listing);
      const imageAnalysis = listing.mainImageUrl
        ? await this.analyzeImage(listing.mainImageUrl, listing.marketplace)
        : null;

      // 総合スコアを計算
      let totalScore = performanceScore;

      // SEO問題による減点
      seoIssues.forEach(issue => {
        switch (issue.severity) {
          case 'critical':
            totalScore -= 20;
            break;
          case 'high':
            totalScore -= 10;
            break;
          case 'medium':
            totalScore -= 5;
            break;
          case 'low':
            totalScore -= 2;
            break;
        }
      });

      // 画像品質による加減点
      if (imageAnalysis) {
        totalScore += (imageAnalysis.quality - 50) * 0.2;
        if (imageAnalysis.policyViolations.length > 0) {
          totalScore -= imageAnalysis.policyViolations.length * 10;
        }
      }

      // スコアを0-100の範囲に正規化
      const healthScore = Math.max(0, Math.min(100, totalScore));

      // AI提案タイトルを生成（スコアが70未満の場合）
      let suggestedTitle: string | undefined;
      if (healthScore < 70) {
        suggestedTitle = await this.generateImprovedTitle(listing);
      }

      // 改善提案を生成
      const suggestedImprovements = await this.generateImprovements(
        listing,
        seoIssues,
        imageAnalysis
      );

      // 自動終了推奨判定（スコアが30未満、かつ売上なし）
      const autoTerminateRecommended =
        healthScore < 30 && listing.salesCount === 0 && listing.viewsCount < 10;

      console.log(`✅ 健全性スコア計算完了: ${listing.listingId} - スコア: ${healthScore}`);

      return {
        healthScore: Math.round(healthScore),
        seoIssues,
        suggestedTitle,
        suggestedImprovements,
        autoTerminateRecommended,
        confidence: 85,
      };
    } catch (error: any) {
      console.error('❌ 健全性スコア計算エラー:', error.message);

      return {
        healthScore: 0,
        seoIssues: [],
        suggestedImprovements: [],
        autoTerminateRecommended: false,
        confidence: 0,
      };
    }
  }

  /**
   * パフォーマンススコア計算（基本指標）
   */
  private calculatePerformanceScore(listing: MarketplaceListing): number {
    let score = 50; // ベーススコア

    // ビュー数によるスコア加算
    if (listing.viewsCount > 100) score += 15;
    else if (listing.viewsCount > 50) score += 10;
    else if (listing.viewsCount > 10) score += 5;

    // クリック数によるスコア加算
    if (listing.clicksCount > 20) score += 10;
    else if (listing.clicksCount > 10) score += 5;

    // コンバージョン率によるスコア加算
    if (listing.conversionRate > 5) score += 15;
    else if (listing.conversionRate > 2) score += 10;
    else if (listing.conversionRate > 1) score += 5;

    // 売上数によるスコア加算
    if (listing.salesCount > 5) score += 10;
    else if (listing.salesCount > 0) score += 5;

    return score;
  }

  /**
   * SEO問題の検出
   */
  private async detectSEOIssues(listing: MarketplaceListing): Promise<SEOIssue[]> {
    const issues: SEOIssue[] = [];

    // タイトル長チェック
    if (listing.title.length < 20) {
      issues.push({
        type: 'title_too_short',
        severity: 'high',
        description: 'タイトルが短すぎます（20文字未満）',
        recommendation: 'タイトルを40-80文字程度に拡充し、商品の特徴を詳しく記載してください',
      });
    } else if (listing.title.length > 200) {
      issues.push({
        type: 'title_too_long',
        severity: 'medium',
        description: 'タイトルが長すぎます（200文字超過）',
        recommendation: 'タイトルを簡潔にし、重要なキーワードを前半に配置してください',
      });
    }

    // 説明文チェック
    if (!listing.description || listing.description.length < 50) {
      issues.push({
        type: 'description_too_short',
        severity: 'critical',
        description: '商品説明が不足しています',
        recommendation: '商品の詳細、特徴、使用方法などを200文字以上で記載してください',
      });
    }

    // 画像チェック
    if (!listing.mainImageUrl && listing.imageUrls.length === 0) {
      issues.push({
        type: 'no_images',
        severity: 'critical',
        description: '商品画像が設定されていません',
        recommendation: '高品質な商品画像を最低3枚以上アップロードしてください',
      });
    } else if (listing.imageUrls.length < 3) {
      issues.push({
        type: 'insufficient_images',
        severity: 'high',
        description: '画像数が不足しています',
        recommendation: '複数角度からの画像を追加し、最低5枚以上を目標にしてください',
      });
    }

    // AI による追加SEO分析
    const aiIssues = await this.analyzeWithAI(listing);
    issues.push(...aiIssues);

    return issues;
  }

  /**
   * AI によるSEO分析
   */
  private async analyzeWithAI(listing: MarketplaceListing): Promise<SEOIssue[]> {
    try {
      const prompt = `
あなたはECマーケットプレイス（${listing.marketplace}）のSEO専門家です。

以下の商品リスティングを分析し、SEO上の問題点をJSON配列形式で返してください:

【商品情報】
- タイトル: ${listing.title}
- 説明: ${listing.description}
- 価格: ¥${listing.price.toLocaleString()}
- 閲覧数: ${listing.viewsCount}
- クリック数: ${listing.clicksCount}
- コンバージョン率: ${listing.conversionRate}%
- 売上数: ${listing.salesCount}

【分析項目】
1. タイトルのキーワード最適化
2. 説明文の充実度
3. 価格競争力
4. その他のSEO要因

応答例:
[
  {
    "type": "keyword_missing",
    "severity": "high",
    "description": "タイトルに重要なキーワードが含まれていません",
    "recommendation": "「ブランド名」「サイズ」「カラー」などのキーワードを追加してください"
  }
]

JSON配列のみで応答してください:`;

      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }

      return [];
    } catch (error) {
      console.warn('⚠️ AI SEO分析でエラー:', error);
      return [];
    }
  }

  /**
   * 画像分析（Gemini Vision API使用）
   */
  private async analyzeImage(
    imageUrl: string,
    marketplace: string
  ): Promise<ImageAnalysisResult> {
    try {
      console.log(`🖼️ 画像分析開始: ${imageUrl}`);

      // 画像をフェッチ
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');

      const prompt = `
あなたは${marketplace}の画像ポリシー専門家です。

以下の商品画像を分析し、JSON形式で結果を返してください:

【分析項目】
1. 画質（0-100）
2. ポリシー違反の有無（透かし、過度な加工、誤解を招く表現など）
3. 改善推奨事項

応答例:
{
  "quality": 85,
  "policyViolations": ["画像に透かしが含まれています"],
  "recommendations": ["より明るい照明で撮影してください", "複数角度からの画像を追加してください"]
}

JSON形式のみで応答してください:`;

      const result = await this.visionModel.generateContent([
        { text: prompt },
        {
          inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`✅ 画像分析完了: 品質=${parsed.quality}`);
        return parsed;
      }

      return { quality: 50, policyViolations: [], recommendations: [] };
    } catch (error) {
      console.error('❌ 画像分析エラー:', error);
      return { quality: 50, policyViolations: [], recommendations: [] };
    }
  }

  /**
   * より売れるタイトル案を生成
   */
  private async generateImprovedTitle(listing: MarketplaceListing): Promise<string> {
    try {
      const prompt = `
あなたは${listing.marketplace}の商品タイトル最適化のプロです。

以下の商品リスティングのタイトルを、よりSEOに強く、購入意欲を高める内容に改善してください:

【現在のタイトル】
${listing.title}

【商品情報】
- 価格: ¥${listing.price.toLocaleString()}
- 現在の閲覧数: ${listing.viewsCount}
- 現在のコンバージョン率: ${listing.conversionRate}%

【改善ポイント】
1. 重要キーワードを前半に配置
2. 具体的な商品特徴を含める
3. ブランド名、サイズ、カラーなどを明記
4. 感情に訴えかける言葉を使用
5. ${listing.marketplace}のベストプラクティスに従う

改善されたタイトル案を1つだけ、装飾なしで返してください:`;

      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      const suggestedTitle = response.text().trim();

      console.log(`💡 改善タイトル生成: ${suggestedTitle}`);

      return suggestedTitle;
    } catch (error) {
      console.error('❌ タイトル生成エラー:', error);
      return listing.title;
    }
  }

  /**
   * 改善提案を生成
   */
  private async generateImprovements(
    listing: MarketplaceListing,
    seoIssues: SEOIssue[],
    imageAnalysis: ImageAnalysisResult | null
  ): Promise<string[]> {
    const improvements: string[] = [];

    // SEO問題からの改善提案
    seoIssues.forEach(issue => {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        improvements.push(issue.recommendation);
      }
    });

    // 画像分析からの改善提案
    if (imageAnalysis) {
      improvements.push(...imageAnalysis.recommendations);

      if (imageAnalysis.policyViolations.length > 0) {
        imageAnalysis.policyViolations.forEach(violation => {
          improvements.push(`画像ポリシー違反を修正: ${violation}`);
        });
      }
    }

    // パフォーマンスベースの改善提案
    if (listing.viewsCount < 10) {
      improvements.push('価格を5-10%引き下げて競争力を高めてください');
    }

    if (listing.conversionRate < 1) {
      improvements.push('商品説明を充実させ、高品質な画像を追加してください');
    }

    return improvements.slice(0, 5); // 上位5つの提案を返す
  }

  /**
   * 全リスティングの健全性スコアを一括更新
   */
  async updateAllListings(listings: MarketplaceListing[]): Promise<Map<string, HealthScoreResult>> {
    console.log(`🔄 全リスティング更新開始: ${listings.length} 件`);

    const results = new Map<string, HealthScoreResult>();

    for (const listing of listings) {
      try {
        const result = await this.calculateHealthScore(listing);
        results.set(listing.id, result);

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`❌ リスティング ${listing.id} の更新エラー:`, error.message);
      }
    }

    console.log(`✅ 全リスティング更新完了: ${results.size} 件処理済み`);
    return results;
  }
}

// ==========================================
// エクスポート
// ==========================================

export default HealthScoreService;

// シングルトンインスタンス
let healthScoreServiceInstance: HealthScoreService | null = null;

export function getHealthScoreService(apiKey?: string): HealthScoreService {
  if (!healthScoreServiceInstance) {
    healthScoreServiceInstance = new HealthScoreService(apiKey);
  }
  return healthScoreServiceInstance;
}
