// /lib/types/listing.ts

// モール定義
export type SourceMall = 'ebay' | 'amazon' | 'shopee' | 'shopify' | 'yahoo' | 'mercari' | 'rakuten';

export type ListingMode = '中古優先' | '新品優先';
export type PerformanceGrade = 'A+' | 'A' | 'B' | 'C' | 'D';
export type ListingStatus = 'Active' | 'Inactive' | 'SoldOut' | 'PolicyViolation' | 'SyncError';

export interface StockDetail {
    source: string; // '自社有在庫', '仕入れ先A', '仕入れ先B'
    count: number;
    priority: number; // 価格ロジックの参照優先度
    is_active_pricing: boolean; // 現在の価格計算に使用されているか
}

export interface MallStatus {
    mall: SourceMall;
    status: ListingStatus;
    listing_id: string; // ASIN, ItemIDなど
    variation_count?: number; // バリエーション数
    view_count?: number; // ビュー数（モール別）
    last_sync?: string; // 最終同期日時
}

export interface ListingItem {
    id: string; // システム内部ID
    sku: string; // 在庫マスター (第1層)
    title: string;
    description: string;
    current_price: number;
    total_stock_count: number; // 有在庫 + 無在庫の合算
    performance_score: PerformanceGrade;
    sales_30d: number; // 売れ筋順ソート用

    // 3. 多販路統合ステータス
    mall_statuses: MallStatus[];

    // 2. 在庫詳細 (SKUクリック時に表示)
    stock_details: StockDetail[];

    // 1. 出品モード
    listing_mode: ListingMode;

    // メタデータ
    created_at: string;
    updated_at: string;
}

export interface ItemSpecifics {
    brand_name: string;
    mpn: string; // 型番
    condition: 'New' | 'Used';
    省略ブランド名?: string;
    [key: string]: string | undefined; // その他のカスタム属性
}

// バリエーション関連
export interface VariationImage {
    id: string;
    url: string;
    position: number;
}

export interface Variation {
    child_sku: string;
    attributes: Record<string, string>; // 例: { "Color": "Red", "Size": "M" }
    images: VariationImage[];
    stock_count: number;
}

export interface ListingEditData {
    sku: string;
    title: string;
    description: string;
    item_specifics: ItemSpecifics;
    variations: Variation[];
    listing_mode: ListingMode;
}

// 履歴データ
export interface PriceChangeLog {
    id: string;
    sku: string;
    old_price: number;
    new_price: number;
    change_reason: string; // 例: '競合最安値追従', 'SOLD数による値上げ'
    change_percentage: number;
    triggered_by: string; // 自動 or 手動
    created_at: string;
}

export interface StockChangeLog {
    id: string;
    sku: string;
    source: string;
    old_count: number;
    new_count: number;
    change_type: 'increase' | 'decrease' | 'sync_error';
    notes?: string;
    created_at: string;
}

export interface OrderHistoryItem {
    id: string;
    sku: string;
    mall: SourceMall;
    order_id: string;
    quantity: number;
    price: number;
    order_date: string;
}

// フィルタリング
export interface ListingFilter {
    mall?: SourceMall;
    status?: ListingStatus;
    performance_grade?: PerformanceGrade;
    listing_mode?: ListingMode;
    search_query?: string;
    price_min?: number;
    price_max?: number;
    stock_min?: number;
    stock_max?: number;
}

// ソート
export type SortField = 'sku' | 'title' | 'current_price' | 'total_stock_count' | 'performance_score' | 'sales_30d' | 'updated_at';
export type SortOrder = 'asc' | 'desc';

export interface ListingSort {
    field: SortField;
    order: SortOrder;
}

// API レスポンス
export interface ListingResponse {
    success: boolean;
    data?: ListingItem[];
    total?: number;
    error?: string;
}

export interface ListingDetailResponse {
    success: boolean;
    data?: {
        listing: ListingItem;
        price_logs: PriceChangeLog[];
        stock_logs: StockChangeLog[];
        order_history: OrderHistoryItem[];
    };
    error?: string;
}