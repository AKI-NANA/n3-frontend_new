/**
 * B-3: 在庫・価格追従システム (回転率対策)
 *
 * 回転率の高い商品の在庫切れ・価格変動リスクを最小化する。
 *
 * 機能：
 * 1. 複数URL登録対応（仕入先候補を複数登録）
 * 2. 在庫追従ロジック（URL[0]在庫切れ → URL[1]に自動切り替え）
 * 3. Shopeeセール時：check_frequencyを'高頻度'に変更
 * 4. 価格管理（min/max/median）
 */

import { createClient } from '@/lib/supabase/server';
import { ReferenceUrl } from '@/types/product';

export interface StockCheckResult {
  success: boolean;
  sku: string;
  current_url: string;
  current_price: number;
  stock_available: boolean;
  switched_to_backup: boolean;
  message: string;
}

export class StockTrackingService {
  /**
   * 在庫チェック＆自動切り替え
   * URL[0]が在庫切れの場合、URL[1]に自動切り替え
   */
  static async checkAndSwitchStock(
    sku: string
  ): Promise<StockCheckResult> {
    try {
      const supabase = await createClient();

      // 商品データを取得
      const { data: product, error } = await supabase
        .from('products_master')
        .select('id, sku, reference_urls, current_stock_count')
        .eq('sku', sku)
        .single();

      if (error || !product) {
        throw new Error('商品が見つかりません');
      }

      const referenceUrls = product.reference_urls as ReferenceUrl[] | null;

      if (!referenceUrls || referenceUrls.length === 0) {
        throw new Error('参照URLが登録されていません');
      }

      // URL[0]の在庫をチェック
      const primaryUrl = referenceUrls[0];
      const stockAvailable = await this.checkStockAvailability(primaryUrl.url);

      if (stockAvailable) {
        // 在庫あり → そのまま使用
        await this.updateProductStockInfo(product.id, {
          current_url: primaryUrl.url,
          current_price: primaryUrl.price,
          current_stock_count: 1, // 在庫あり
          last_check_time: new Date().toISOString(),
        });

        return {
          success: true,
          sku,
          current_url: primaryUrl.url,
          current_price: primaryUrl.price,
          stock_available: true,
          switched_to_backup: false,
          message: 'URL[0]の在庫を確認しました',
        };
      }

      // URL[0]が在庫切れ → URL[1]に切り替え
      if (referenceUrls.length > 1) {
        const backupUrl = referenceUrls[1];
        const backupStockAvailable = await this.checkStockAvailability(backupUrl.url);

        if (backupStockAvailable) {
          await this.updateProductStockInfo(product.id, {
            current_url: backupUrl.url,
            current_price: backupUrl.price,
            current_stock_count: 1, // 在庫あり
            last_check_time: new Date().toISOString(),
          });

          return {
            success: true,
            sku,
            current_url: backupUrl.url,
            current_price: backupUrl.price,
            stock_available: true,
            switched_to_backup: true,
            message: 'URL[0]在庫切れ → URL[1]に切り替えました',
          };
        }
      }

      // すべてのURLで在庫切れ
      await this.updateProductStockInfo(product.id, {
        current_url: primaryUrl.url,
        current_price: primaryUrl.price,
        current_stock_count: 0, // 在庫切れ
        last_check_time: new Date().toISOString(),
      });

      return {
        success: false,
        sku,
        current_url: primaryUrl.url,
        current_price: primaryUrl.price,
        stock_available: false,
        switched_to_backup: false,
        message: 'すべてのURLで在庫切れです',
      };
    } catch (error) {
      console.error('❌ Stock Check Error:', error);
      throw error;
    }
  }

  /**
   * 在庫の有無をチェック（モックロジック）
   * 実際の実装では、外部APIやスクレイピングで在庫を確認する
   */
  private static async checkStockAvailability(url: string): Promise<boolean> {
    // TODO: 実際のスクレイピング/API呼び出しに置き換える
    // 現在はモックとしてランダムに在庫あり/なしを返す
    console.log(`[Mock] Checking stock for: ${url}`);
    return Math.random() > 0.3; // 70%の確率で在庫あり
  }

  /**
   * 商品の在庫情報を更新
   */
  private static async updateProductStockInfo(
    productId: string,
    info: {
      current_url: string;
      current_price: number;
      current_stock_count: number;
      last_check_time: string;
    }
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('products_master')
      .update({
        external_url: info.current_url,
        price_jpy: info.current_price,
        current_stock_count: info.current_stock_count,
        last_check_time: info.last_check_time,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (error) {
      throw new Error(`在庫情報更新エラー: ${error.message}`);
    }
  }

  /**
   * 複数URLの価格情報を更新（min/max/median）
   */
  static async updatePriceStatistics(sku: string): Promise<{
    success: boolean;
    min_price: number | null;
    max_price: number | null;
    median_price: number | null;
  }> {
    try {
      const supabase = await createClient();

      const { data: product, error } = await supabase
        .from('products_master')
        .select('id, sku, reference_urls')
        .eq('sku', sku)
        .single();

      if (error || !product) {
        throw new Error('商品が見つかりません');
      }

      const referenceUrls = product.reference_urls as ReferenceUrl[] | null;

      if (!referenceUrls || referenceUrls.length === 0) {
        return {
          success: false,
          min_price: null,
          max_price: null,
          median_price: null,
        };
      }

      // 価格の配列を取得
      const prices = referenceUrls.map((url) => url.price).sort((a, b) => a - b);

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const medianPrice = this.calculateMedian(prices);

      // DBに保存
      await supabase
        .from('products_master')
        .update({
          median_price: medianPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      return {
        success: true,
        min_price: minPrice,
        max_price: maxPrice,
        median_price: medianPrice,
      };
    } catch (error) {
      console.error('❌ Price Statistics Error:', error);
      throw error;
    }
  }

  /**
   * 中央値を計算
   */
  private static calculateMedian(prices: number[]): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * Shopeeセール時：高頻度チェックモードに切り替え
   */
  static async enableHighFrequencyCheck(sku: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('products_master')
        .update({
          check_frequency: '高頻度',
          updated_at: new Date().toISOString(),
        })
        .eq('sku', sku);

      if (error) {
        throw new Error(`更新エラー: ${error.message}`);
      }

      return {
        success: true,
        message: `SKU: ${sku} を高頻度チェックモードに切り替えました`,
      };
    } catch (error) {
      console.error('❌ High Frequency Check Error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '切り替えに失敗しました',
      };
    }
  }

  /**
   * 通常チェックモードに戻す
   */
  static async disableHighFrequencyCheck(sku: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('products_master')
        .update({
          check_frequency: '通常',
          updated_at: new Date().toISOString(),
        })
        .eq('sku', sku);

      if (error) {
        throw new Error(`更新エラー: ${error.message}`);
      }

      return {
        success: true,
        message: `SKU: ${sku} を通常チェックモードに戻しました`,
      };
    } catch (error) {
      console.error('❌ Normal Frequency Check Error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '切り替えに失敗しました',
      };
    }
  }

  /**
   * バッチ処理: 高頻度チェック対象商品の在庫を一括確認
   */
  static async batchCheckHighFrequencyProducts(): Promise<{
    success: boolean;
    checked: number;
    results: StockCheckResult[];
  }> {
    try {
      const supabase = await createClient();

      const { data: products, error } = await supabase
        .from('products_master')
        .select('sku')
        .eq('check_frequency', '高頻度');

      if (error || !products || products.length === 0) {
        return {
          success: true,
          checked: 0,
          results: [],
        };
      }

      const results: StockCheckResult[] = [];

      for (const product of products) {
        try {
          const result = await this.checkAndSwitchStock(product.sku);
          results.push(result);
        } catch (error) {
          console.error(`❌ Error checking SKU: ${product.sku}`, error);
        }
      }

      return {
        success: true,
        checked: results.length,
        results,
      };
    } catch (error) {
      console.error('❌ Batch Stock Check Error:', error);
      throw error;
    }
  }
}
