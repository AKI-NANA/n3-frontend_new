/**
 * B-1: 商品データ取得と重複排除エンジン
 *
 * スケジューラ実行時のデータ取得効率を最大化し、重複データを排除する。
 *
 * 機能：
 * 1. 重複判定処理（URL → ASIN/SKU → 新規登録）
 * 2. 価格・在庫・ランキングのみを更新
 * 3. ステータス管理 (status: '取得完了')
 */

import { createClient } from '@/lib/supabase/server';
import { Product } from '@/types/product';

export interface ScrapedProductData {
  external_url: string; // Primary Key
  asin_sku?: string | null; // Fallback Key
  title?: string;
  price?: number;
  category?: string;
  condition?: string;
  ranking?: number | null;
  sales_count?: number | null;
  release_date?: string | null;
  images?: string[];
  scraped_data?: any;
}

export interface DeduplicationResult {
  success: boolean;
  is_duplicate: boolean;
  product_id?: string;
  action: 'created' | 'updated' | 'skipped';
  message: string;
}

export class ProductDeduplicationService {
  /**
   * スクレイピング結果を重複チェックして登録・更新する
   */
  static async processScrapedProduct(
    data: ScrapedProductData
  ): Promise<DeduplicationResult> {
    try {
      const supabase = await createClient();

      // Step 1: Primary Key (外部サイトURL) で完全一致検索
      const { data: existingByUrl, error: urlError } = await supabase
        .from('products_master')
        .select('id, sku, price_jpy, ranking, sales_count, release_date, status')
        .eq('external_url', data.external_url)
        .single();

      if (!urlError && existingByUrl) {
        // 重複あり → 価格・在庫・ランキングのみ更新
        return await this.updateExistingProduct(existingByUrl.id, data);
      }

      // Step 2: Fallback Key (ASIN または SKU) で検索
      if (data.asin_sku) {
        const { data: existingByAsinSku, error: asinError } = await supabase
          .from('products_master')
          .select('id, sku, price_jpy, ranking, sales_count, release_date, status')
          .eq('asin_sku', data.asin_sku)
          .single();

        if (!asinError && existingByAsinSku) {
          // 重複あり → 価格・在庫・ランキングのみ更新
          return await this.updateExistingProduct(existingByAsinSku.id, data);
        }
      }

      // Step 3: 新規登録
      return await this.createNewProduct(data);
    } catch (error) {
      console.error('❌ ProductDeduplicationService Error:', error);
      return {
        success: false,
        is_duplicate: false,
        action: 'skipped',
        message: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * 既存商品の更新（価格・在庫・ランキングのみ）
   */
  private static async updateExistingProduct(
    productId: string,
    data: ScrapedProductData
  ): Promise<DeduplicationResult> {
    try {
      const supabase = await createClient();

      const updateData: any = {
        is_duplicate: true,
        status: '取得完了',
        updated_at: new Date().toISOString(),
      };

      // 価格・在庫・ランキングのみを更新
      if (data.price !== undefined) {
        updateData.price_jpy = data.price;
      }
      if (data.ranking !== undefined) {
        updateData.ranking = data.ranking;
      }
      if (data.sales_count !== undefined) {
        updateData.sales_count = data.sales_count;
      }

      const { error } = await supabase
        .from('products_master')
        .update(updateData)
        .eq('id', productId);

      if (error) {
        throw new Error(`更新エラー: ${error.message}`);
      }

      return {
        success: true,
        is_duplicate: true,
        product_id: productId,
        action: 'updated',
        message: '重複商品を更新しました（価格・在庫・ランキング）',
      };
    } catch (error) {
      console.error('❌ Update Error:', error);
      return {
        success: false,
        is_duplicate: true,
        product_id: productId,
        action: 'skipped',
        message: error instanceof Error ? error.message : '更新に失敗しました',
      };
    }
  }

  /**
   * 新規商品の登録
   */
  private static async createNewProduct(
    data: ScrapedProductData
  ): Promise<DeduplicationResult> {
    try {
      const supabase = await createClient();

      // SKUを自動生成（external_urlのハッシュ値を使用）
      const sku = await this.generateSKU(data.external_url);

      const insertData: any = {
        sku,
        external_url: data.external_url,
        asin_sku: data.asin_sku || null,
        title: data.title || 'Untitled Product',
        price_jpy: data.price || 0,
        category_name: data.category || null,
        condition: data.condition || 'New',
        ranking: data.ranking || null,
        sales_count: data.sales_count || null,
        release_date: data.release_date || null,
        is_duplicate: false,
        status: '取得完了',
        scraped_data: data.scraped_data || {},
        images: data.images || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newProduct, error } = await supabase
        .from('products_master')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        throw new Error(`新規登録エラー: ${error.message}`);
      }

      return {
        success: true,
        is_duplicate: false,
        product_id: newProduct.id,
        action: 'created',
        message: '新規商品を登録しました',
      };
    } catch (error) {
      console.error('❌ Create Error:', error);
      return {
        success: false,
        is_duplicate: false,
        action: 'skipped',
        message: error instanceof Error ? error.message : '登録に失敗しました',
      };
    }
  }

  /**
   * SKU生成（URLのハッシュ値から）
   */
  private static async generateSKU(url: string): Promise<string> {
    const timestamp = Date.now().toString(36);
    const hash = Buffer.from(url).toString('base64').slice(0, 8);
    return `AUTO-${timestamp}-${hash}`.replace(/[^A-Za-z0-9-]/g, '');
  }

  /**
   * バッチ処理: 複数の商品を一括で重複チェック＆登録
   */
  static async processBatch(
    products: ScrapedProductData[]
  ): Promise<DeduplicationResult[]> {
    const results: DeduplicationResult[] = [];

    for (const product of products) {
      const result = await this.processScrapedProduct(product);
      results.push(result);
    }

    return results;
  }
}
