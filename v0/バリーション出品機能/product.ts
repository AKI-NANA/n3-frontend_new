// /types/product.ts

// 親SKUまたは単体SKUの基本情報
export interface Product {
    id: number;
    sku: string;
    product_name: string;
    parent_sku_id: number | null; // 親SKUのID
    variation_type: 'Parent' | 'Child' | 'Single'; // 'Parent', 'Child', 'Single'を区別
    status: string; // 'NeedsApproval: ShippingRisk', 'ExternalToolSyncFail' などを格納
    price_usd: number; // 統一 Item Price または単品価格
    policy_group_id: string; // グループ化マーク
    listing_data: ListingData;
    cost_price: number; // 仕入原価
    stock_quantity: number; // 在庫数
    // ... その他の基本フィールド
}

// ListingData - JSONBフィールドの内容
export interface ListingData {
    // 💡 統一 Item Priceの基準
    min_ddp_cost_usd?: number; // eBay統一 Item Priceの基準となる最低DDPコスト。
    
    // バリエーションを構成するアイテム（Grouping Boxで選択された構成品）
    // バリエーション子SKUの構成品（小要素）の在庫管理に使用
    components?: Array<{
        sku: string;
        quantity: number;
    }>;
    
    // バリエーション子SKUの詳細データ
    variations?: ProductVariation[]; 
    
    // ... 既存のフィールドは省略
}

// バリエーション子SKUの詳細データ (Child SKUs)
export interface ProductVariation {
    id?: number;
    name: string; // 例: "1M"
    
    // 外部ツールの識別子 (eBay SKU)
    variation_sku: string; // 例: "WIRE123-1M"
    
    // 💡 DDPコスト計算結果
    actual_ddp_cost_usd: number; // そのバリエーションの本来のDDPコスト
    
    // 💡 外部ツールに渡す「USA向け送料に追加すべき金額」 (手動Override可能)
    shipping_surcharge_usd: number; // 例: 1Mは $0.00, 3Mは $44.66
    
    // ユーザーが設定するバリエーション属性
    attributes: {
        [key: string]: string; // 例: { "Color": "Red", "Size": "1M" }
    };
    
    // 既存のフィールド (重量、寸法など) は省略
}

// Grouping Boxで選択されたアイテムの型
export interface GroupingItem {
    sku: string;
    product_name: string;
    image_url: string;
    current_stock: number;
    required_quantity: number; // セット品に必要な数量
}