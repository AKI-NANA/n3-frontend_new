// /api/listing/integrated/route.ts
import { ListingItem, PerformanceGrade } from '@/types/listing';
import { fetchInventoryMaster, fetchPricingData, fetchMallListings } from '@/services/data/ListingDataService';

// 💡 モックSKUリスト（DB連携で置き換えが必要）
const MOCK_SKUS = ['SKU-001', 'SKU-002', 'SKU-003', 'SKU-004'];

/**
 * パフォーマンススコアを計算する内部ロジック
 */
const calculatePerformanceScore = (sales30d: number, syncErrors: number): PerformanceGrade => {
    if (sales30d >= 30 && syncErrors === 0) return 'A+';
    if (sales30d >= 10 && syncErrors <= 1) return 'B';
    if (sales30d < 5 || syncErrors > 2) return 'D';
    return 'C';
};

/**
 * 統合された出品データリストを生成する
 */
export async function GET(): Promise<Response> {
    const listings: ListingItem[] = [];

    for (const sku of MOCK_SKUS) {
        // 1. 各層データ取得 (Claude/MCPが実APIに置き換え)
        const invData = fetchInventoryMaster(sku);
        const pricingData = fetchPricingData(sku);
        const mallStatuses = fetchMallListings(sku);

        // 💡 III. 2. 在庫数の明確化: モック在庫詳細
        const stockDetails: StockDetail[] = [
            { source: '自社有在庫', count: (sku === 'SKU-004' ? 1 : 5), priority: 0 },
            { source: '仕入れ先A', count: 3, priority: 1 },
        ];
        const totalStockCount = stockDetails.reduce((sum, detail) => sum + detail.count, 0);

        // 2. スコア計算
        const sales30d = Math.floor(Math.random() * 50); // モック
        const syncErrors = mallStatuses.filter(s => s.status === 'SyncError').length;
        const score = calculatePerformanceScore(sales30d, syncErrors);

        const item: ListingItem = {
            sku: sku,
            title: `[${sku}] ${invData.verocity_risk === 'LOW' ? 'Classic' : 'High Risk'} Product Title`,
            description: 'Placeholder description.',
            current_price: pricingData.current_price,
            total_stock_count: totalStockCount,
            performance_score: score,
            sales_30d: sales30d,
            mall_statuses: mallStatuses,
            stock_details: stockDetails,
            listing_mode: pricingData.current_mode,
        };
        listings.push(item);
    }

    return new Response(JSON.stringify(listings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}