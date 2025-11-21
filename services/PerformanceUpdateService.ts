/**
 * パフォーマンス更新サービス
 *
 * 販売実績データの自動収集とパフォーマンススコアの自動計算を行う
 */

import { createClient } from '@/utils/supabase/server';

export class PerformanceUpdateService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  /**
   * 販売実績データを外部システムから取得（モック実装）
   * TODO: 実際の受注管理システムAPIと連携
   */
  private async fetchSalesData(): Promise<any[]> {
    // 仮実装: DBから直接取得（本番では外部APIから取得）
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PerformanceUpdate] Failed to fetch sales data:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 販売実績データをsales_historyテーブルに記録
   */
  async collectSalesData(): Promise<{ inserted: number; updated: number }> {
    console.log('[PerformanceUpdate] Collecting sales data');

    try {
      const salesData = await this.fetchSalesData();

      if (salesData.length === 0) {
        console.log('[PerformanceUpdate] No new sales data');
        return { inserted: 0, updated: 0 };
      }

      let inserted = 0;
      let updated = 0;

      for (const order of salesData) {
        // sales_historyに既に存在するかチェック
        const { data: existing } = await this.supabase
          .from('sales_history')
          .select('id')
          .eq('order_id', order.id)
          .single();

        if (existing) {
          // 既存レコードを更新
          await this.supabase
            .from('sales_history')
            .update({
              quantity_sold: order.quantity,
              sale_price_jpy: order.price_jpy,
              profit_jpy: order.profit_jpy,
              updated_at: new Date().toISOString(),
            })
            .eq('order_id', order.id);

          updated++;
        } else {
          // 新規レコードを挿入
          await this.supabase.from('sales_history').insert({
            sku: order.sku,
            platform: order.platform,
            order_id: order.id,
            quantity_sold: order.quantity,
            sale_price_jpy: order.price_jpy,
            profit_jpy: order.profit_jpy,
            sold_at: order.created_at,
            created_at: new Date().toISOString(),
          });

          inserted++;
        }
      }

      console.log(
        `[PerformanceUpdate] Sales data collection complete: ${inserted} inserted, ${updated} updated`
      );

      return { inserted, updated };
    } catch (error) {
      console.error('[PerformanceUpdate] Error collecting sales data:', error);
      throw error;
    }
  }

  /**
   * SKUごとのパフォーマンススコアを計算
   */
  private async calculateScoreForSku(sku: string): Promise<{
    totalSales: number;
    profitMargin: number;
    inventoryTurnover: number;
    performanceScore: number;
  }> {
    // 1. 総売上を取得（直近90日）
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const { data: salesData } = await this.supabase
      .from('sales_history')
      .select('sale_price_jpy, profit_jpy, quantity_sold')
      .eq('sku', sku)
      .gte('sold_at', ninetyDaysAgo.toISOString());

    const totalSales =
      salesData?.reduce(
        (sum: number, s: any) =>
          sum + (s.sale_price_jpy || 0) * (s.quantity_sold || 0),
        0
      ) || 0;

    const totalProfit =
      salesData?.reduce((sum: number, s: any) => sum + (s.profit_jpy || 0), 0) ||
      0;

    const totalQuantitySold =
      salesData?.reduce(
        (sum: number, s: any) => sum + (s.quantity_sold || 0),
        0
      ) || 0;

    // 2. 利益率を計算
    const profitMargin = totalSales > 0 ? totalProfit / totalSales : 0;

    // 3. 在庫回転率を計算
    const { data: stockData } = await this.supabase
      .from('products_master')
      .select('stock_quantity')
      .eq('sku', sku)
      .single();

    const averageStock = stockData?.stock_quantity || 1;
    const inventoryTurnover =
      averageStock > 0 ? totalQuantitySold / averageStock : 0;

    // 4. パフォーマンススコアを計算
    // スコア = 売上スコア(40点) + 利益率スコア(30点) + 在庫回転率スコア(30点)
    const salesScore = Math.min((totalSales / 100000) * 40, 40); // 10万円で40点満点
    const profitScore = Math.min(profitMargin * 100, 30); // 利益率30%で30点満点
    const turnoverScore = Math.min(inventoryTurnover * 10, 30); // 回転率3で30点満点

    const performanceScore = salesScore + profitScore + turnoverScore;

    return {
      totalSales,
      profitMargin,
      inventoryTurnover,
      performanceScore: Math.min(performanceScore, 100),
    };
  }

  /**
   * パフォーマンススコアを自動計算・更新
   */
  async updatePerformanceScores(): Promise<{ updated: number }> {
    console.log('[PerformanceUpdate] Updating performance scores');

    try {
      // 全SKUを取得
      const { data: products } = await this.supabase
        .from('products_master')
        .select('sku');

      if (!products || products.length === 0) {
        console.log('[PerformanceUpdate] No products found');
        return { updated: 0 };
      }

      let updated = 0;

      for (const product of products) {
        const sku = product.sku;

        // スコアを計算
        const {
          totalSales,
          profitMargin,
          inventoryTurnover,
          performanceScore,
        } = await this.calculateScoreForSku(sku);

        // sales_performanceテーブルを更新
        const { data: existing } = await this.supabase
          .from('sales_performance')
          .select('id')
          .eq('sku', sku)
          .single();

        if (existing) {
          // 既存レコードを更新
          await this.supabase
            .from('sales_performance')
            .update({
              total_sales: totalSales,
              profit_margin: profitMargin,
              inventory_turnover: inventoryTurnover,
              performance_score: performanceScore,
              updated_at: new Date().toISOString(),
            })
            .eq('sku', sku);
        } else {
          // 新規レコードを挿入
          await this.supabase.from('sales_performance').insert({
            sku,
            total_sales: totalSales,
            profit_margin: profitMargin,
            inventory_turnover: inventoryTurnover,
            performance_score: performanceScore,
            created_at: new Date().toISOString(),
          });
        }

        updated++;
      }

      console.log(
        `[PerformanceUpdate] Performance scores updated: ${updated} SKUs`
      );

      return { updated };
    } catch (error) {
      console.error('[PerformanceUpdate] Error updating scores:', error);
      throw error;
    }
  }

  /**
   * メイン実行メソッド
   */
  async execute(): Promise<{
    salesDataCollected: { inserted: number; updated: number };
    scoresUpdated: { updated: number };
  }> {
    console.log('[PerformanceUpdate] Starting performance update batch');

    // 1. 販売実績データを収集
    const salesDataCollected = await this.collectSalesData();

    // 2. パフォーマンススコアを更新
    const scoresUpdated = await this.updatePerformanceScores();

    console.log('[PerformanceUpdate] Batch complete', {
      salesDataCollected,
      scoresUpdated,
    });

    return {
      salesDataCollected,
      scoresUpdated,
    };
  }
}
