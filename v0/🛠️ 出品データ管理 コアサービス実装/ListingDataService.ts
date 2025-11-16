// /services/data/ListingDataService.ts

import { ListingItem, ListingMode, PerformanceGrade, ListingStatus, SourceMall, StockDetail, ItemSpecifics } from '@/types/listing';

// 💡 外部DB/APIからデータを取得するモック関数群
// Claude/MCPは、これらを実際のDB/APIコールに置き換えます。

/**
 * 外部DBから在庫マスター（第1層）のデータを取得するモック
 */
const fetchInventoryMaster = (sku: string) => ({
    sku: sku,
    base_cost: 50.00,
    safety_stock: 3,
    verocity_risk: 'LOW',
});

/**
 * 外部APIから価格ロジック（第4層）のデータを取得するモック
 */
const fetchPricingData = (sku: string) => ({
    current_price: 150.99,
    last_change_reason: 'Competitor Price Match',
    current_mode: '中古優先' as ListingMode,
});

/**
 * 外部DBから各モール出品データ（第3層）を取得するモック
 */
const fetchMallListings = (sku: string): ListingItem['mall_statuses'] => ([
    { mall: 'eBay_US' as SourceMall, status: 'Active' as ListingStatus, listing_id: 'EBAY-123' },
    { mall: 'Amazon_JP' as SourceMall, status: 'Inactive' as ListingStatus, listing_id: 'AMZN-001' },
    { mall: 'Shopee_TW' as SourceMall, status: 'SyncError' as ListingStatus, listing_id: 'SHP-456' },
]);