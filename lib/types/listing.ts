// /types/listing.ts

import { SourceMall } from './messaging'; // 既存のモール定義を使用

export type ListingMode = '中古優先' | '新品優先';
export type PerformanceGrade = 'A+' | 'A' | 'B' | 'C' | 'D';
export type ListingStatus = 'Active' | 'Inactive' | 'SoldOut' | 'PolicyViolation' | 'SyncError';

interface StockDetail {
    source: string; // '自社有在庫', '仕入れ先A', '仕入れ先B'
    count: number;
    priority: number; // 価格ロジックの参照優先度
}

export interface ListingItem {
    sku: string; // 在庫マスター (第1層)
    title: string;
    description: string;
    current_price: number;
    total_stock_count: number; // 有在庫 + 無在庫の合算
    performance_score: PerformanceGrade;
    sales_30d: number; // 売れ筋順ソート用
    
    // 3. 多販路統合ステータス
    mall_statuses: {
        mall: SourceMall;
        status: ListingStatus;
        listing_id: string; // ASIN, ItemIDなど
    }[];

    // 2. 在庫詳細 (SKUクリック時に表示)
    stock_details: StockDetail[];

    // 1. 出品モード
    listing_mode: ListingMode;
}

export interface ItemSpecifics {
    brand_name: string;
    mpn: string; // 型番
    condition: 'New' | 'Used';
}