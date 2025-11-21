/**
 * B-2: AI処理優先度決定ロジック
 *
 * AI（Gemini）に投入するデータ順序を自動で決定し、外注作業の効率を高める。
 *
 * スコア算出ロジック:
 * 1. Sold数加点 (Ebay): +100〜+400 (指数関数的)
 * 2. 新製品加点: +200 (発売30日以内)
 * 3. ランキング加点: +50〜+150 (高ランキング優遇)
 * 4. 競合優位性: +0〜+100 (価格優位性など)
 *
 * 最終スコア: 0〜1000
 */

import { createClient } from '@/lib/supabase/server';

export interface ProductScoreData {
  id: string;
  sku: string;
  sales_count?: number | null; // Ebay Sold数
  release_date?: string | null; // 発売日
  ranking?: number | null; // ランキング
  price_jpy?: number | null; // 価格
  median_price?: number | null; // 中央値価格
  condition?: string | null; // コンディション
}

export interface ScoreBreakdown {
  sold_score: number; // Sold数スコア
  new_product_score: number; // 新製品スコア
  ranking_score: number; // ランキングスコア
  competitive_score: number; // 競合優位性スコア
  total_score: number; // 合計スコア (0-1000)
}

export class PriorityScoreService {
  /**
   * 優先度スコアを算出
   */
  static calculatePriorityScore(data: ProductScoreData): ScoreBreakdown {
    const soldScore = this.calculateSoldScore(data.sales_count);
    const newProductScore = this.calculateNewProductScore(data.release_date);
    const rankingScore = this.calculateRankingScore(data.ranking);
    const competitiveScore = this.calculateCompetitiveScore(
      data.price_jpy,
      data.median_price,
      data.condition
    );

    const totalScore = Math.min(
      1000,
      soldScore + newProductScore + rankingScore + competitiveScore
    );

    return {
      sold_score: soldScore,
      new_product_score: newProductScore,
      ranking_score: rankingScore,
      competitive_score: competitiveScore,
      total_score: Math.round(totalScore),
    };
  }

  /**
   * 1. Sold数加点 (Ebay): +100〜+400 (指数関数的)
   * 直近30日間のSold数が高いほど、指数関数的に加点
   */
  private static calculateSoldScore(salesCount: number | null | undefined): number {
    if (!salesCount || salesCount <= 0) {
      return 0;
    }

    // 指数関数的加点
    // 1-10個: 100点
    // 11-50個: 100-250点
    // 51-100個: 250-350点
    // 100+個: 350-400点
    if (salesCount <= 10) {
      return 100;
    } else if (salesCount <= 50) {
      return 100 + (salesCount - 10) * 3.75; // 最大250点
    } else if (salesCount <= 100) {
      return 250 + (salesCount - 50) * 2; // 最大350点
    } else {
      return Math.min(400, 350 + (salesCount - 100) * 0.5); // 最大400点
    }
  }

  /**
   * 2. 新製品加点: +200 (発売30日以内)
   */
  private static calculateNewProductScore(releaseDate: string | null | undefined): number {
    if (!releaseDate) {
      return 0;
    }

    const releaseDateObj = new Date(releaseDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - releaseDateObj.getTime()) / (1000 * 60 * 60 * 24));

    // 30日以内の新商品
    if (daysDiff >= 0 && daysDiff <= 30) {
      return 200;
    }

    return 0;
  }

  /**
   * 3. ランキング加点: +50〜+150 (高ランキング優遇)
   * ランキングが高い（数値が小さい）ほど加点
   */
  private static calculateRankingScore(ranking: number | null | undefined): number {
    if (!ranking || ranking <= 0) {
      return 0;
    }

    // ランキング1-100: 150点
    // ランキング101-1000: 100点
    // ランキング1001-10000: 50点
    // ランキング10000+: 0点
    if (ranking <= 100) {
      return 150;
    } else if (ranking <= 1000) {
      return 100;
    } else if (ranking <= 10000) {
      return 50;
    } else {
      return 0;
    }
  }

  /**
   * 4. 競合優位性: +0〜+100
   * 価格中央値からの差、コンディションなどで加点
   */
  private static calculateCompetitiveScore(
    price: number | null | undefined,
    medianPrice: number | null | undefined,
    condition: string | null | undefined
  ): number {
    let score = 0;

    // 価格優位性（中央値より安い場合に加点）
    if (price && medianPrice && medianPrice > 0) {
      const priceDiff = ((medianPrice - price) / medianPrice) * 100;

      if (priceDiff > 0) {
        // 中央値より安い = 競合優位性あり
        score += Math.min(50, priceDiff * 2); // 最大50点
      }
    }

    // コンディション加点（新品は優遇）
    if (condition) {
      const conditionLower = condition.toLowerCase();
      if (conditionLower.includes('new') || conditionLower.includes('新品')) {
        score += 30;
      } else if (conditionLower.includes('like new') || conditionLower.includes('未使用')) {
        score += 20;
      }
    }

    return Math.min(100, score);
  }

  /**
   * DB内の全商品に対してスコアを再計算
   */
  static async recalculateAllScores(): Promise<{
    success: boolean;
    processed: number;
    message: string;
  }> {
    try {
      const supabase = await createClient();

      // status: '取得完了' の商品のみを対象
      const { data: products, error } = await supabase
        .from('products_master')
        .select('id, sku, sales_count, release_date, ranking, price_jpy, median_price, condition')
        .eq('status', '取得完了');

      if (error) {
        throw new Error(`商品取得エラー: ${error.message}`);
      }

      if (!products || products.length === 0) {
        return {
          success: true,
          processed: 0,
          message: '処理対象の商品がありません（status: 取得完了）',
        };
      }

      let processed = 0;

      // 各商品のスコアを計算してDB更新
      for (const product of products) {
        const scoreBreakdown = this.calculatePriorityScore({
          id: product.id,
          sku: product.sku,
          sales_count: product.sales_count,
          release_date: product.release_date,
          ranking: product.ranking,
          price_jpy: product.price_jpy,
          median_price: product.median_price,
          condition: product.condition,
        });

        const { error: updateError } = await supabase
          .from('products_master')
          .update({
            priority_score: scoreBreakdown.total_score,
            status: '優先度決定済',
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        if (!updateError) {
          processed++;
        }
      }

      return {
        success: true,
        processed,
        message: `${processed}件の商品のスコアを再計算しました`,
      };
    } catch (error) {
      console.error('❌ Score Recalculation Error:', error);
      return {
        success: false,
        processed: 0,
        message: error instanceof Error ? error.message : 'スコア再計算に失敗しました',
      };
    }
  }

  /**
   * 単一商品のスコアを計算してDB更新
   */
  static async updateProductScore(productId: string): Promise<{
    success: boolean;
    score: number | null;
    message: string;
  }> {
    try {
      const supabase = await createClient();

      const { data: product, error } = await supabase
        .from('products_master')
        .select('id, sku, sales_count, release_date, ranking, price_jpy, median_price, condition')
        .eq('id', productId)
        .single();

      if (error || !product) {
        throw new Error('商品が見つかりません');
      }

      const scoreBreakdown = this.calculatePriorityScore({
        id: product.id,
        sku: product.sku,
        sales_count: product.sales_count,
        release_date: product.release_date,
        ranking: product.ranking,
        price_jpy: product.price_jpy,
        median_price: product.median_price,
        condition: product.condition,
      });

      const { error: updateError } = await supabase
        .from('products_master')
        .update({
          priority_score: scoreBreakdown.total_score,
          status: '優先度決定済',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) {
        throw new Error(`更新エラー: ${updateError.message}`);
      }

      return {
        success: true,
        score: scoreBreakdown.total_score,
        message: `スコア: ${scoreBreakdown.total_score}点`,
      };
    } catch (error) {
      console.error('❌ Score Update Error:', error);
      return {
        success: false,
        score: null,
        message: error instanceof Error ? error.message : 'スコア更新に失敗しました',
      };
    }
  }
}
