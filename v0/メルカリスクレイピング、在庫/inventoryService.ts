// /services/inventoryService.ts

import { createClient } from '@/lib/supabase';
import { ScrapedInventoryData } from '@/lib/scraping-core';

const supabase = createClient();

/**
 * スクレイピング結果を inventory_history テーブルに保存する
 * @param data スクレイピングで取得した在庫データ
 */
export async function saveInventoryHistory(data: ScrapedInventoryData): Promise<void> {
    const { sku, asin, price, stock, totalSellers, scrapedAt } = data;

    // 1. 最新の在庫履歴を取得し、在庫差異をチェック
    const { data: latestHistory } = await supabase
        .from('inventory_history')
        .select('current_stock')
        .eq('product_sku', sku)
        .order('scraped_at', { ascending: false })
        .limit(1)
        .single();
        
    // 2. 棚卸し連携フラグを判定
    // 前回の記録と在庫が大きく異なる場合（例：50%以上減少）や、在庫が0になった場合など
    let isReconciliationNeeded = false;
    if (latestHistory && latestHistory.current_stock !== stock) {
        // 例: 在庫が0になった、または大きな変動があった場合にフラグを立てる
        if (stock === 0 || Math.abs(latestHistory.current_stock - stock) > 10) {
            isReconciliationNeeded = true;
        }
    }

    // 3. 履歴テーブルに挿入
    const { error } = await supabase
        .from('inventory_history')
        .insert({
            product_sku: sku,
            asin_id: asin,
            scraped_price: price,
            current_stock: stock,
            total_sellers: totalSellers,
            is_reconciliation_needed: isReconciliationNeeded,
            scraped_at: scrapedAt.toISOString(),
        });

    if (error) {
        console.error('Error saving inventory history:', error);
        throw new Error('在庫履歴の保存に失敗しました。');
    }

    console.log(`Inventory history saved for SKU: ${sku}. Reconciliation needed: ${isReconciliationNeeded}`);
}

// 💡 既存の在庫管理ツール（/inventory-monitoring）が利用するためのデータ取得関数などもここに実装