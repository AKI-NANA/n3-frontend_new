/**
 * 統合出品データ管理API - データ取得・集約エンドポイント
 *
 * SKU Master (第1層)、Price Log (第4層)、Strategy Decision Log (P-2) を結合し、
 * 統合管理テーブル用のデータを返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type {
  IntegratedListingResponse,
  ListingItem,
  MallStatus,
  PerformanceGrade,
  ListingFilter,
  ListingSort,
} from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

/**
 * スコアからグレードに変換
 */
function scoreToGrade(score: number): PerformanceGrade {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * 合計在庫数を計算（自社有在庫 + 無在庫仕入れ先の優先度順有効在庫）
 */
async function calculateTotalStock(
  supabase: any,
  sku: string
): Promise<number> {
  // 1. 自社有在庫を取得
  const { data: masterData } = await supabase
    .from('products_master')
    .select('stock_quantity')
    .eq('sku', sku)
    .single();

  const ownStock = masterData?.stock_quantity || 0;

  // 2. 無在庫仕入れ先の在庫を優先度順に取得
  const { data: suppliers } = await supabase
    .from('supplier_stocks')
    .select('stock_quantity, priority, is_active')
    .eq('sku', sku)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  const supplierStock =
    suppliers?.reduce(
      (sum: number, s: any) => sum + (s.stock_quantity || 0),
      0
    ) || 0;

  return ownStock + supplierStock;
}

/**
 * モール別ステータスを集約
 */
async function getMallStatuses(
  supabase: any,
  sku: string
): Promise<MallStatus[]> {
  const { data: listings } = await supabase
    .from('listing_data')
    .select(
      'platform, status, listing_id, error_message, last_synced_at, account_id'
    )
    .eq('sku', sku);

  if (!listings || listings.length === 0) {
    return [];
  }

  return listings.map((listing: any) => ({
    platform: listing.platform as Platform,
    status: listing.status || 'Inactive',
    listingId: listing.listing_id,
    errorMessage: listing.error_message,
    lastSyncedAt: listing.last_synced_at
      ? new Date(listing.last_synced_at)
      : undefined,
  }));
}

/**
 * 価格変動頻度を計算（直近30日）
 */
async function getPriceChangeFrequency(
  supabase: any,
  sku: string
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count } = await supabase
    .from('price_logs')
    .select('*', { count: 'exact', head: true })
    .eq('sku', sku)
    .gte('changed_at', thirtyDaysAgo.toISOString());

  return count || 0;
}

/**
 * パフォーマンススコアを計算（B-2ロジック）
 * TODO: 実際のB-2ロジックに置き換える
 */
async function calculatePerformanceScore(
  supabase: any,
  sku: string
): Promise<number> {
  // 仮実装: 売上実績、在庫回転率、利益率などから算出
  const { data: salesData } = await supabase
    .from('sales_performance')
    .select('total_sales, profit_margin, inventory_turnover')
    .eq('sku', sku)
    .single();

  if (!salesData) {
    return 50; // デフォルトスコア
  }

  // 簡易スコア計算（実際はもっと複雑なロジック）
  const salesScore = Math.min(salesData.total_sales / 1000, 40); // 最大40点
  const profitScore = (salesData.profit_margin || 0) * 100; // 最大30点（利益率30%想定）
  const turnoverScore = Math.min(
    (salesData.inventory_turnover || 0) * 10,
    30
  ); // 最大30点

  return Math.min(salesScore + profitScore + turnoverScore, 100);
}

/**
 * 推奨プラットフォームを取得（P-2戦略エンジンの結果）
 */
async function getRecommendedPlatform(
  supabase: any,
  sku: string
): Promise<Platform | undefined> {
  const { data } = await supabase
    .from('strategy_decisions')
    .select('recommended_platform')
    .eq('sku', sku)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data?.recommended_platform as Platform | undefined;
}

/**
 * 現在の価格を取得
 */
async function getCurrentPrice(supabase: any, sku: string): Promise<number> {
  const { data } = await supabase
    .from('products_master')
    .select('price_jpy')
    .eq('sku', sku)
    .single();

  return data?.price_jpy || 0;
}

/**
 * GET /api/listing/integrated
 * クエリパラメータ: page, pageSize, filters, sort
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // パラメータ取得
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const filtersJson = searchParams.get('filters');
    const sortJson = searchParams.get('sort');

    const filters: ListingFilter = filtersJson
      ? JSON.parse(filtersJson)
      : {};
    const sort: ListingSort = sortJson
      ? JSON.parse(sortJson)
      : { field: 'sku', order: 'asc' };

    console.log('[IntegratedAPI] パラメータ:', {
      page,
      pageSize,
      filters,
      sort,
    });

    // 1. ベースクエリ構築（products_master から）
    let query = supabase
      .from('products_master')
      .select(
        'id, sku, title, category, condition, stock_quantity, price_jpy, updated_at',
        { count: 'exact' }
      );

    // 2. フィルター適用
    if (filters.searchQuery) {
      query = query.or(
        `sku.ilike.%${filters.searchQuery}%,title.ilike.%${filters.searchQuery}%`
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories);
    }

    if (filters.conditions && filters.conditions.length > 0) {
      query = query.in('condition', filters.conditions);
    }

    if (filters.minStock !== undefined) {
      query = query.gte('stock_quantity', filters.minStock);
    }

    if (filters.maxStock !== undefined) {
      query = query.lte('stock_quantity', filters.maxStock);
    }

    // 3. ソート適用
    const sortField = sort.field === 'currentPriceJpy' ? 'price_jpy' : sort.field;
    query = query.order(sortField, { ascending: sort.order === 'asc' });

    // 4. ページネーション適用
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // 5. データ取得
    const { data: products, error, count } = await query;

    if (error) {
      console.error('[IntegratedAPI] DB取得エラー:', error);
      return NextResponse.json(
        { error: 'データベースエラー', details: error.message },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        pageSize,
        availableFilters: {
          platforms: [],
          categories: [],
        },
      } as IntegratedListingResponse);
    }

    // 6. 各商品の詳細情報を並列取得
    const items: ListingItem[] = await Promise.all(
      products.map(async (product: any) => {
        const [
          totalStockCount,
          mallStatuses,
          priceChangeFrequency,
          performanceScore,
          recommendedPlatform,
        ] = await Promise.all([
          calculateTotalStock(supabase, product.sku),
          getMallStatuses(supabase, product.sku),
          getPriceChangeFrequency(supabase, product.sku),
          calculatePerformanceScore(supabase, product.sku),
          getRecommendedPlatform(supabase, product.sku),
        ]);

        const performanceGrade = scoreToGrade(performanceScore);

        return {
          sku: product.sku,
          productId: product.id,
          title: product.title || '',
          category: product.category || 'その他',
          condition: product.condition || 'New',
          totalStockCount,
          mallStatuses,
          performanceGrade,
          performanceScore,
          recommendedPlatform,
          currentPriceJpy: product.price_jpy || 0,
          priceChangeFrequency,
          lastUpdatedAt: new Date(product.updated_at || Date.now()),
        } as ListingItem;
      })
    );

    // 7. 動的フィルター情報を収集
    const { data: allCategories } = await supabase
      .from('products_master')
      .select('category')
      .not('category', 'is', null);

    const uniqueCategories = [
      ...new Set(allCategories?.map((c: any) => c.category) || []),
    ] as string[];

    // 全プラットフォームを取得（出品実績のあるもの）
    const { data: allPlatforms } = await supabase
      .from('listing_data')
      .select('platform')
      .not('platform', 'is', null);

    const uniquePlatforms = [
      ...new Set(allPlatforms?.map((p: any) => p.platform) || []),
    ] as Platform[];

    // 8. レスポンス返却
    const response: IntegratedListingResponse = {
      items,
      total: count || 0,
      page,
      pageSize,
      availableFilters: {
        platforms: uniquePlatforms,
        categories: uniqueCategories,
      },
    };

    console.log(
      `[IntegratedAPI] 成功: ${items.length}件取得（全${count}件中）`
    );

    return NextResponse.json(response);
  } catch (err) {
    console.error('[IntegratedAPI] 予期しないエラー:', err);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
