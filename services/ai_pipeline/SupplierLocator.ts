/**
 * AI仕入れ先特定モジュール
 *
 * 優先順位：
 * 1. 商品名・型番での検索
 * 2. 画像解析による検索
 * 3. 仕入れ先データベースとの照合
 */

import {
  SupplierCandidate,
  SupplierSearchRequest,
  SupplierSearchResult,
  MatchingMethod,
  SupplierPlatform,
} from '@/types/supplier';

/**
 * 検索設定
 */
interface SearchConfig {
  enableTitleSearch: boolean;
  enableImageSearch: boolean;
  enableDatabaseSearch: boolean;
  maxCandidates: number;
  minConfidenceThreshold: number;
  estimatedShippingJpy: number; // デフォルト国内送料
}

/**
 * 検索結果（内部用）
 */
interface RawSearchResult {
  url: string;
  platform: SupplierPlatform;
  price: number;
  title?: string;
  inStock: boolean;
  stockQuantity?: number;
  matchingMethod: MatchingMethod;
  similarityScore?: number;
}

/**
 * SupplierLocatorクラス
 */
export class SupplierLocator {
  private config: SearchConfig;

  constructor(config?: Partial<SearchConfig>) {
    this.config = {
      enableTitleSearch: true,
      enableImageSearch: true,
      enableDatabaseSearch: true,
      maxCandidates: 10,
      minConfidenceThreshold: 0.3,
      estimatedShippingJpy: 500, // デフォルト500円
      ...config,
    };
  }

  /**
   * メイン処理：仕入れ先を探索
   */
  async searchSuppliers(
    request: SupplierSearchRequest
  ): Promise<SupplierSearchResult> {
    const { product_id, title, english_title, image_urls, keywords, priority } = request;

    console.log(`[SupplierLocator] 商品 ${product_id} の仕入れ先探索を開始`);

    const rawResults: RawSearchResult[] = [];
    const methodsUsed: MatchingMethod[] = [];

    try {
      // 優先順位1: 商品名・型番での検索
      if (this.config.enableTitleSearch && (title || english_title)) {
        console.log('[SupplierLocator] 商品名・型番検索を実行中...');
        const titleResults = await this.searchByTitle(
          title,
          english_title,
          keywords
        );
        rawResults.push(...titleResults);
        methodsUsed.push('title_match');
      }

      // 優先順位2: 画像解析による検索
      if (this.config.enableImageSearch && image_urls && image_urls.length > 0) {
        console.log('[SupplierLocator] 画像検索を実行中...');
        const imageResults = await this.searchByImage(image_urls);
        rawResults.push(...imageResults);
        methodsUsed.push('image_search');
      }

      // 優先順位3: 仕入れ先データベースとの照合
      if (this.config.enableDatabaseSearch) {
        console.log('[SupplierLocator] DB照合を実行中...');
        const dbResults = await this.searchByDatabase(title, keywords);
        rawResults.push(...dbResults);
        methodsUsed.push('database_match');
      }

      // 結果の重複排除と信頼度スコアリング
      const candidates = this.processResults(rawResults, product_id);

      // 信頼度でフィルタリング
      const filteredCandidates = candidates.filter(
        (c) => c.confidence_score >= this.config.minConfidenceThreshold
      );

      // 最大候補数に制限
      const topCandidates = filteredCandidates
        .sort((a, b) => b.confidence_score - a.confidence_score)
        .slice(0, this.config.maxCandidates);

      // 最良の候補を選定（最も信頼度が高く、価格が低い）
      const bestCandidate = this.selectBestCandidate(topCandidates);

      console.log(
        `[SupplierLocator] 探索完了: ${topCandidates.length}件の候補を発見`
      );

      return {
        product_id,
        success: topCandidates.length > 0,
        candidates: topCandidates,
        best_candidate: bestCandidate,
        search_method_used: methodsUsed,
        searched_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[SupplierLocator] 探索エラー:', error);
      return {
        product_id,
        success: false,
        candidates: [],
        search_method_used: methodsUsed,
        error: error instanceof Error ? error.message : 'Unknown error',
        searched_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 優先順位1: 商品名・型番での検索
   */
  private async searchByTitle(
    title?: string,
    englishTitle?: string,
    keywords?: string[]
  ): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];

    // 検索キーワードの生成
    const searchTerms = this.generateSearchTerms(title, englishTitle, keywords);

    // 各プラットフォームで検索
    for (const platform of this.getSupportedPlatforms()) {
      try {
        const platformResults = await this.searchPlatform(platform, searchTerms);
        results.push(...platformResults);
      } catch (error) {
        console.warn(`[SupplierLocator] ${platform}での検索に失敗:`, error);
      }
    }

    return results;
  }

  /**
   * 優先順位2: 画像解析による検索
   */
  private async searchByImage(imageUrls: string[]): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];

    // 最初の画像のみを使用（複数画像対応は将来実装）
    const primaryImageUrl = imageUrls[0];

    try {
      // Google Lens API、またはSerpApiなどの画像検索API統合
      // ここではプレースホルダー実装
      const imageSearchResults = await this.performImageSearch(primaryImageUrl);
      results.push(...imageSearchResults);
    } catch (error) {
      console.warn('[SupplierLocator] 画像検索に失敗:', error);
    }

    return results;
  }

  /**
   * 優先順位3: 仕入れ先データベースとの照合
   */
  private async searchByDatabase(
    title?: string,
    keywords?: string[]
  ): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];

    try {
      // 内部DBの優良仕入れ先テーブルと照合
      // 実装は後続のA-2で行う（DB連携）
      const dbResults = await this.querySupplierDatabase(title, keywords);
      results.push(...dbResults);
    } catch (error) {
      console.warn('[SupplierLocator] DB照合に失敗:', error);
    }

    return results;
  }

  /**
   * 検索キーワード生成
   */
  private generateSearchTerms(
    title?: string,
    englishTitle?: string,
    keywords?: string[]
  ): string[] {
    const terms: string[] = [];

    if (title) terms.push(title);
    if (englishTitle) terms.push(englishTitle);
    if (keywords) terms.push(...keywords);

    // 重複削除
    return Array.from(new Set(terms));
  }

  /**
   * サポートされているプラットフォーム
   */
  private getSupportedPlatforms(): SupplierPlatform[] {
    return ['amazon_jp', 'rakuten', 'yahoo_shopping', 'mercari'];
  }

  /**
   * プラットフォーム別検索（実装プレースホルダー）
   */
  private async searchPlatform(
    platform: SupplierPlatform,
    searchTerms: string[]
  ): Promise<RawSearchResult[]> {
    // 各プラットフォームのAPIまたはスクレイピングロジック
    // ここではモック実装

    console.log(`[SupplierLocator] ${platform}で検索: ${searchTerms.join(', ')}`);

    // TODO: 実際のAPI統合
    // - Amazon Product Advertising API
    // - 楽天市場API
    // - Yahoo!ショッピングAPI
    // - メルカリAPI（非公式）

    // モック結果（開発用）
    if (process.env.NODE_ENV === 'development') {
      return this.generateMockResults(platform, searchTerms);
    }

    return [];
  }

  /**
   * 画像検索実行（プレースホルダー）
   */
  private async performImageSearch(
    imageUrl: string
  ): Promise<RawSearchResult[]> {
    console.log(`[SupplierLocator] 画像検索: ${imageUrl}`);

    // TODO: 画像検索API統合
    // - Google Lens API (非公式)
    // - SerpApi Google Lens
    // - TinEye Reverse Image Search API
    // - Azure Computer Vision

    // モック実装
    if (process.env.NODE_ENV === 'development') {
      return [];
    }

    return [];
  }

  /**
   * 仕入れ先DB照合（プレースホルダー）
   */
  private async querySupplierDatabase(
    title?: string,
    keywords?: string[]
  ): Promise<RawSearchResult[]> {
    console.log(`[SupplierLocator] DB照合: ${title}`);

    // TODO: 内部DBとの照合ロジック
    // A-2で実装

    return [];
  }

  /**
   * 検索結果の処理と信頼度スコアリング
   */
  private processResults(
    rawResults: RawSearchResult[],
    productId: string
  ): SupplierCandidate[] {
    // URL重複排除
    const uniqueResults = this.deduplicateByUrl(rawResults);

    // SupplierCandidate形式に変換
    return uniqueResults.map((raw) => {
      const confidence = this.calculateConfidence(raw);

      return {
        id: '', // DBに保存時に生成される
        product_id: productId,
        supplier_url: raw.url,
        supplier_platform: raw.platform,
        supplier_name: this.extractSupplierName(raw.url),
        candidate_price_jpy: raw.price,
        estimated_domestic_shipping_jpy: this.config.estimatedShippingJpy,
        total_cost_jpy: raw.price + this.config.estimatedShippingJpy,
        confidence_score: confidence,
        matching_method: raw.matchingMethod,
        similarity_score: raw.similarityScore,
        in_stock: raw.inStock,
        stock_quantity: raw.stockQuantity,
        stock_checked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verified_by_human: false,
        image_search_used: raw.matchingMethod === 'image_search',
      };
    });
  }

  /**
   * URL重複排除
   */
  private deduplicateByUrl(results: RawSearchResult[]): RawSearchResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      if (seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    });
  }

  /**
   * 信頼度スコア計算
   */
  private calculateConfidence(result: RawSearchResult): number {
    let confidence = 0.5; // ベーススコア

    // マッチング手法による加点
    if (result.matchingMethod === 'database_match') {
      confidence += 0.3; // DB照合は信頼度高
    } else if (result.matchingMethod === 'title_match') {
      confidence += 0.2;
    } else if (result.matchingMethod === 'image_search') {
      confidence += 0.1;
    }

    // 類似度スコアによる調整
    if (result.similarityScore !== undefined) {
      confidence = confidence * 0.5 + result.similarityScore * 0.5;
    }

    // 在庫状況による調整
    if (!result.inStock) {
      confidence *= 0.7; // 在庫切れはペナルティ
    }

    // 0.0 ~ 1.0に正規化
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * URLから仕入れ先名を抽出
   */
  private extractSupplierName(url: string): string | undefined {
    try {
      const hostname = new URL(url).hostname;
      // ドメインから仕入れ先名を推測
      if (hostname.includes('amazon')) return 'Amazon Japan';
      if (hostname.includes('rakuten')) return '楽天市場';
      if (hostname.includes('yahoo')) return 'Yahoo!ショッピング';
      if (hostname.includes('mercari')) return 'メルカリ';
      return hostname;
    } catch {
      return undefined;
    }
  }

  /**
   * 最良候補の選定
   */
  private selectBestCandidate(
    candidates: SupplierCandidate[]
  ): SupplierCandidate | undefined {
    if (candidates.length === 0) return undefined;

    // 信頼度0.6以上の候補から最安値を選択
    const highConfidenceCandidates = candidates.filter((c) => c.confidence_score >= 0.6);

    if (highConfidenceCandidates.length > 0) {
      return highConfidenceCandidates.reduce((best, current) =>
        current.total_cost_jpy < best.total_cost_jpy ? current : best
      );
    }

    // 信頼度が低い場合は、信頼度と価格のバランスを取る
    return candidates.reduce((best, current) => {
      const bestScore = best.confidence_score / (best.total_cost_jpy / 1000);
      const currentScore = current.confidence_score / (current.total_cost_jpy / 1000);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * モック結果生成（開発用）
   */
  private generateMockResults(
    platform: SupplierPlatform,
    searchTerms: string[]
  ): RawSearchResult[] {
    const basePrice = 1000 + Math.random() * 5000;

    return [
      {
        url: `https://${platform}.example.com/product/${Math.random().toString(36).substring(7)}`,
        platform,
        price: Math.round(basePrice),
        title: searchTerms[0] || 'Sample Product',
        inStock: true,
        matchingMethod: 'title_match',
        similarityScore: 0.7 + Math.random() * 0.3,
      },
      {
        url: `https://${platform}.example.com/product/${Math.random().toString(36).substring(7)}`,
        platform,
        price: Math.round(basePrice * 1.2),
        title: searchTerms[0] || 'Sample Product',
        inStock: true,
        matchingMethod: 'title_match',
        similarityScore: 0.6 + Math.random() * 0.2,
      },
    ];
  }
}

/**
 * シングルトンインスタンス
 */
export const supplierLocator = new SupplierLocator();
