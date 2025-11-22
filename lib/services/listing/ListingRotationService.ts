/**
 * 出品交代サービス (タスク5B - S-8)
 *
 * 機能:
 * - identifyLowScoreItems(): 低スコア商品を自動識別
 * - endListing(): eBay APIを使って出品を終了
 *
 * 要件:
 * - approval_products の ai_confidence_score や profit_margin_percent が低い商品を識別
 * - 複数の基準でスコアリング（AI信頼度、利益率、在庫期間など）
 * - eBay API統合（将来実装）
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ========================================
// 型定義
// ========================================

export interface LowScoreItemCriteria {
  min_ai_confidence_score?: number; // 最低AI信頼度（デフォルト: 0.7）
  min_profit_margin_percent?: number; // 最低利益率（%）（デフォルト: 15）
  max_days_in_inventory?: number; // 最大在庫日数（デフォルト: 90日）
  min_listing_score?: number; // 総合スコア閾値（デフォルト: 50）
  limit?: number; // 取得件数制限（デフォルト: 50）
}

export interface LowScoreItem {
  id: number;
  sku: string;
  title?: string;
  ebay_listing_id?: string;
  ai_confidence_score?: number;
  profit_margin_percent?: number;
  days_in_inventory?: number;
  listing_score: number; // 総合スコア（0-100）
  low_score_reasons: string[]; // 低スコアの理由
  source_table: string;
  created_at?: string;
  last_updated_at?: string;
}

export interface EndListingInput {
  product_id: number;
  ebay_listing_id: string;
  reason: string;
  archive?: boolean; // アーカイブするか（デフォルト: true）
}

export interface EndListingResult {
  success: boolean;
  listing_id?: string;
  ended_at?: string;
  archived?: boolean;
  error?: string;
}

export interface RotationSummary {
  total_identified: number;
  avg_listing_score: number;
  reasons_breakdown: Record<string, number>;
  recommendations: string[];
}

// ========================================
// 低スコア商品識別
// ========================================

/**
 * 低スコア商品を自動識別
 *
 * アルゴリズム:
 * 1. approval_products と products_master から商品データを取得
 * 2. 複数の基準でスコアリング:
 *    - AI信頼度スコア (0-40点)
 *    - 利益率スコア (0-40点)
 *    - 在庫期間スコア (0-20点)
 * 3. 総合スコアが閾値未満の商品を抽出
 *
 * @param criteria - 識別基準
 * @returns 低スコア商品リスト
 */
export async function identifyLowScoreItems(
  criteria: LowScoreItemCriteria = {}
): Promise<{
  success: boolean;
  items?: LowScoreItem[];
  summary?: RotationSummary;
  error?: string;
}> {
  try {
    // デフォルト基準
    const {
      min_ai_confidence_score = 0.7,
      min_profit_margin_percent = 15.0,
      max_days_in_inventory = 90,
      min_listing_score = 50,
      limit = 50,
    } = criteria;

    console.log('[ListingRotation] 低スコア商品の識別を開始...');
    console.log('  基準:', {
      min_ai_confidence_score,
      min_profit_margin_percent,
      max_days_in_inventory,
      min_listing_score,
      limit,
    });

    // 1. approval_products から商品を取得
    const { data: approvalProducts, error: approvalError } = await supabase
      .from('approval_products')
      .select('*')
      .eq('approval_status', 'approved')
      .limit(1000); // 大量データ対策

    if (approvalError) {
      console.error('[ListingRotation] approval_products 取得エラー:', approvalError);
    }

    // 2. products_master から商品を取得
    const { data: masterProducts, error: masterError } = await supabase
      .from('products_master')
      .select('*')
      .limit(1000);

    if (masterError) {
      console.error('[ListingRotation] products_master 取得エラー:', masterError);
    }

    // 3. データを統合してスコアリング
    const lowScoreItems: LowScoreItem[] = [];
    const allProducts = [
      ...(approvalProducts || []).map((p) => ({ ...p, source_table: 'approval_products' })),
      ...(masterProducts || []).map((p) => ({ ...p, source_table: 'products_master' })),
    ];

    console.log(`[ListingRotation] ${allProducts.length}件の商品を評価中...`);

    for (const product of allProducts) {
      const aiScore = product.ai_confidence_score || 0;
      const profitMargin = product.profit_margin_percent || product.profit_margin || 0;
      const createdAt = product.created_at ? new Date(product.created_at) : new Date();
      const daysInInventory = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // スコアリング (0-100点)
      const aiScorePoints = Math.min(aiScore * 40, 40); // AI信頼度: 最大40点
      const profitScorePoints = Math.min((profitMargin / min_profit_margin_percent) * 40, 40); // 利益率: 最大40点
      const inventoryScorePoints = Math.max(20 - (daysInInventory / max_days_in_inventory) * 20, 0); // 在庫期間: 最大20点

      const listingScore = Math.round(aiScorePoints + profitScorePoints + inventoryScorePoints);

      // 低スコア判定
      const lowScoreReasons: string[] = [];

      if (aiScore < min_ai_confidence_score) {
        lowScoreReasons.push(`AI信頼度が低い (${(aiScore * 100).toFixed(1)}%)`);
      }

      if (profitMargin < min_profit_margin_percent) {
        lowScoreReasons.push(`利益率が低い (${profitMargin.toFixed(1)}%)`);
      }

      if (daysInInventory > max_days_in_inventory) {
        lowScoreReasons.push(`在庫期間が長い (${daysInInventory}日)`);
      }

      // 総合スコアが閾値未満の場合、リストに追加
      if (listingScore < min_listing_score && lowScoreReasons.length > 0) {
        lowScoreItems.push({
          id: product.id,
          sku: product.sku || `PRODUCT-${product.id}`,
          title: product.title || product.title_en,
          ebay_listing_id: product.ebay_listing_id,
          ai_confidence_score: aiScore,
          profit_margin_percent: profitMargin,
          days_in_inventory: daysInInventory,
          listing_score: listingScore,
          low_score_reasons: lowScoreReasons,
          source_table: product.source_table,
          created_at: product.created_at,
          last_updated_at: product.updated_at,
        });
      }
    }

    // スコアでソート（低い順）
    lowScoreItems.sort((a, b) => a.listing_score - b.listing_score);

    // 件数制限
    const limitedItems = lowScoreItems.slice(0, limit);

    console.log(`[ListingRotation] ${limitedItems.length}件の低スコア商品を識別しました`);

    // 4. サマリー作成
    const avgScore =
      limitedItems.length > 0
        ? limitedItems.reduce((sum, item) => sum + item.listing_score, 0) / limitedItems.length
        : 0;

    const reasonsBreakdown: Record<string, number> = {};
    limitedItems.forEach((item) => {
      item.low_score_reasons.forEach((reason) => {
        reasonsBreakdown[reason] = (reasonsBreakdown[reason] || 0) + 1;
      });
    });

    const recommendations: string[] = [];
    if (reasonsBreakdown['AI信頼度が低い']) {
      recommendations.push('AI信頼度が低い商品のカテゴリー分類を見直してください');
    }
    if (reasonsBreakdown['利益率が低い']) {
      recommendations.push('利益率が低い商品の価格戦略を再検討してください');
    }
    if (reasonsBreakdown['在庫期間が長い']) {
      recommendations.push('長期在庫商品の価格を下げるか、出品を終了してください');
    }

    const summary: RotationSummary = {
      total_identified: limitedItems.length,
      avg_listing_score: Math.round(avgScore * 10) / 10,
      reasons_breakdown: reasonsBreakdown,
      recommendations,
    };

    return {
      success: true,
      items: limitedItems,
      summary,
    };
  } catch (error) {
    console.error('[ListingRotation] エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

// ========================================
// 出品終了（eBay API統合）
// ========================================

/**
 * eBay出品を終了
 *
 * 注意: この関数は将来のeBay API統合タスクに依存します
 * 現在はプレースホルダー実装です
 *
 * @param input - 出品終了パラメータ
 * @returns 出品終了結果
 */
export async function endListing(input: EndListingInput): Promise<EndListingResult> {
  try {
    console.log('[ListingRotation] 出品終了開始:', input);

    const { product_id, ebay_listing_id, reason, archive = true } = input;

    // 1. 商品データを取得して検証
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      // approval_products からも検索
      const { data: approvalProduct } = await supabase
        .from('approval_products')
        .select('*')
        .eq('id', product_id)
        .single();

      if (!approvalProduct) {
        return {
          success: false,
          error: '商品が見つかりません',
        };
      }
    }

    // 2. eBay API呼び出し（プレースホルダー）
    // TODO: eBay Trading API の EndItem を実装
    console.warn('[ListingRotation] ⚠️ eBay API統合は未実装です。将来のタスクで実装されます。');

    const endedAt = new Date().toISOString();

    // 3. 商品ステータスを更新
    if (archive) {
      // アーカイブ処理（将来実装）
      console.log('[ListingRotation] 商品をアーカイブします...');

      // await supabase
      //   .from('products_master')
      //   .update({
      //     listing_status: 'ended',
      //     archived: true,
      //     archived_at: endedAt,
      //     archive_reason: reason,
      //   })
      //   .eq('id', product_id);
    }

    // 4. 終了履歴を保存（将来実装）
    // await supabase.from('listing_rotation_history').insert({
    //   product_id,
    //   ebay_listing_id,
    //   action: 'end_listing',
    //   reason,
    //   ended_at: endedAt,
    // });

    console.log(`[ListingRotation] ✅ 出品終了成功（モック）: ${ebay_listing_id}`);

    return {
      success: true,
      listing_id: ebay_listing_id,
      ended_at: endedAt,
      archived: archive,
    };
  } catch (error) {
    console.error('[ListingRotation] 出品終了エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

// ========================================
// バッチ出品終了
// ========================================

/**
 * 複数の出品を一括終了
 *
 * @param items - 低スコア商品リスト
 * @param reason - 終了理由
 * @returns 終了結果の配列
 */
export async function endBulkListings(
  items: LowScoreItem[],
  reason: string
): Promise<Map<number, EndListingResult>> {
  const results = new Map<number, EndListingResult>();

  console.log(`[ListingRotation] ${items.length}件の出品を一括終了開始...`);

  for (const item of items) {
    if (!item.ebay_listing_id) {
      console.warn(`[ListingRotation] 商品ID ${item.id} にはeBayリスティングIDがありません`);
      results.set(item.id, {
        success: false,
        error: 'eBayリスティングIDが見つかりません',
      });
      continue;
    }

    const result = await endListing({
      product_id: item.id,
      ebay_listing_id: item.ebay_listing_id,
      reason: `${reason} (スコア: ${item.listing_score}, 理由: ${item.low_score_reasons.join(', ')})`,
      archive: true,
    });

    results.set(item.id, result);

    // レート制限対策: 1秒待機
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const successCount = Array.from(results.values()).filter((r) => r.success).length;
  console.log(`[ListingRotation] バッチ終了完了: ${successCount}/${items.length}件成功`);

  return results;
}
