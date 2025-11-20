/**
 * NAGANO-3 products_master 完全型定義
 * 
 * 生成日: 2025-01-15
 * 目的: 全ツールのカラムを含む完全なTypeScript型定義
 */

/**
 * 基本商品情報
 */
export interface ProductsMaster {
  // ===== 基本情報 =====
  id: string;
  source_table: string;
  source_id: string;
  
  // ===== タイトル・説明 =====
  title: string | null;
  english_title: string | null;
  description: string | null;
  
  // ===== 価格情報 =====
  price_jpy: number | null;
  actual_cost_jpy: number | null;
  
  // ===== 送料計算関連 (Shipping Calculate API) =====
  ddu_price_usd: number | null;          // 商品価格のみ
  ddp_price_usd: number | null;          // DDP価格 (商品+送料)
  shipping_cost_usd: number | null;      // DDP送料 (顧客が支払う送料)
  shipping_policy: string | null;        // 送料ポリシー名
  profit_margin: number | null;          // 利益率 (送料・利益計算用)
  profit_amount_usd: number | null;      // 利益額 (送料・利益計算用)
  
  // ===== カテゴリ分析関連 (Category Analyze API) =====
  category_name: string | null;          // カテゴリ名
  category_number: string | null;        // カテゴリ番号
  
  // ===== フィルター関連 (Filters API) =====
  filter_passed: boolean | null;         // フィルター通過フラグ
  filter_reasons: string | null;         // フィルター除外理由
  filter_checked_at: string | null;      // フィルター確認日時
  
  // ===== SellerMirror分析関連 (SellerMirror Analyze API) =====
  ebay_category_id: string | null;       // eBayカテゴリID
  sm_sales_count: number | null;         // 販売実績数
  
  // ===== Browse API検索関連 (Browse Search API & Research API) =====
  sm_lowest_price: number | null;        // 最安値
  sm_average_price: number | null;       // 平均価格
  sm_competitor_count: number | null;    // 競合数
  sm_profit_amount_usd: number | null;   // 利益額 (SellerMirror用)
  sm_profit_margin: number | null;       // 利益率 (SellerMirror用)
  
  // ===== 画像・メディア =====
  images: string[] | null;
  primary_image: string | null;
  
  // ===== JSONB データ =====
  listing_data: ListingData | null;
  ebay_api_data: EbayApiData | null;
  scraped_data: any | null;

  // ===== バリエーション・セット品関連 (2025-11-20追加) =====
  parent_sku_id: string | null;                    // 親SKU参照 (バリエーション/セット品の親子関係)
  variation_type: 'Parent' | 'Child' | 'Single';   // バリエーションタイプ
  policy_group_id: string | null;                  // ポリシーグループID (カテゴリ + DDPティア + サイズティア)
  external_tool_sync_status: string | null;        // 外部ツール連携ステータス (Ebaymugなど)

  // ===== メタ情報 =====
  created_at: string;
  updated_at: string;
  status: string | null;
}

/**
 * listing_data の型定義
 */
export interface ListingData {
  // 送料計算関連
  usa_shipping_policy_name?: string;
  shipping_service?: string;
  base_shipping_usd?: number;           // 実送料 (配送会社に支払う)
  product_price_usd?: number;

  // 利益情報
  profit_margin?: number;               // 利益率 (還付前)
  profit_amount_usd?: number;           // 利益額 (還付前)
  profit_margin_refund?: number;        // 利益率 (還付後)
  profit_amount_refund?: number;        // 利益額 (還付後)

  // 商品情報
  weight_g?: number;
  hs_code?: string;
  condition?: string;

  // ===== バリエーション・セット品関連 (2025-11-20追加) =====

  // 親SKU用フィールド
  min_ddp_cost_usd?: number;            // 最低DDPコスト（統一Item Price）
  variation_attributes?: string[];      // バリエーション属性名（例: ["Color", "Size"]）
  variations?: VariationChild[];        // 子SKU情報

  // 子SKU用フィールド
  variation_sku?: string;               // バリエーションSKU
  actual_ddp_cost_usd?: number;         // 本来のDDPコスト
  shipping_surcharge_usd?: number;      // USA向け送料加算額
  attributes?: VariationAttribute[];    // このバリエーションの属性値

  // セット品用フィールド
  components?: BundleComposition[];     // 構成品情報
  total_component_cost?: number;        // 構成品の合計コスト

  // その他
  [key: string]: any;
}

/**
 * バリエーション属性
 */
export interface VariationAttribute {
  name: string;   // 例: "Color", "Size"
  value: string;  // 例: "Red", "Large"
}

/**
 * 子SKU情報（親SKUのlisting_data.variationsに格納）
 */
export interface VariationChild {
  variation_sku: string;
  attributes: VariationAttribute[];
  actual_ddp_cost_usd: number;
  shipping_surcharge_usd: number;
  stock_quantity: number;
  image_url?: string;
}

/**
 * セット品の構成品
 */
export interface BundleComposition {
  child_sku: string;
  child_title: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
}

/**
 * ebay_api_data の型定義
 */
export interface EbayApiData {
  // SellerMirror出品用データ
  listing_reference?: {
    referenceItems: ReferenceItem[];
    suggestedCategory?: string;
    suggestedCategoryPath?: string;
    soldCount?: number;
    analyzedAt?: string;
  };
  
  // Browse API検索結果
  browse_result?: {
    lowestPrice?: number;
    averagePrice?: number;
    competitorCount?: number;
    profitAmount?: number;
    profitMargin?: number;
    breakdown?: any;
    items?: any[];
    referenceItems?: any[];
    searchedAt?: string;
    searchTitle?: string;
    searchLevel?: number;
  };
  
  // リサーチAPI結果
  research?: {
    soldCount?: number;
    currentCompetitorCount?: number;
    lowestPriceItem?: any;
    profitAnalysis?: any;
    searchStrategy?: any;
    analyzedAt?: string;
  };
  
  // カテゴリ情報
  category_id?: string;
  category_name?: string;
  
  // その他
  [key: string]: any;
}

/**
 * 参照商品情報
 */
export interface ReferenceItem {
  title?: string;
  price?: number;
  currency?: string;
  condition?: string;
  categoryId?: string;
  categoryPath?: string;
  itemId?: string;
  image?: string;
  seller?: string;
  sellerFeedbackScore?: number;
  sellerFeedbackPercentage?: number;
  shippingCost?: number;
  shippingType?: string;
  itemWebUrl?: string;
  hasDetails?: boolean;
  itemSpecifics?: ItemSpecifics;
}

/**
 * Item Specifics
 */
export interface ItemSpecifics {
  'Card Name'?: string;
  'Card Number'?: string;
  'Set'?: string;
  'Language'?: string;
  'Grading'?: string;
  'Professional Grader'?: string;
  'Grade'?: string;
  'Character'?: string;
  'Year Manufactured'?: string;
  'Brand'?: string;
  'Model'?: string;
  'Type'?: string;
  'Category'?: string;
  [key: string]: string | undefined;
}

/**
 * カラム使用目的マップ
 */
export const COLUMN_PURPOSE_MAP = {
  // 送料計算・利益計算 共通
  ddu_price_usd: '商品価格のみ (送料除く)',
  ddp_price_usd: 'DDP価格 (商品+送料)',
  shipping_cost_usd: 'DDP送料 (顧客が支払う)',
  shipping_policy: '送料ポリシー名',
  profit_margin: '利益率 (送料・利益計算用)',
  profit_amount_usd: '利益額 (送料・利益計算用)',
  
  // カテゴリ分析
  category_name: 'eBayカテゴリ名',
  category_number: 'eBayカテゴリ番号',
  
  // フィルター
  filter_passed: 'フィルター通過フラグ',
  filter_reasons: 'フィルター除外理由',
  filter_checked_at: 'フィルター確認日時',
  
  // SellerMirror・Browse API・Research API 共通
  ebay_category_id: 'eBayカテゴリID',
  sm_sales_count: '販売実績数',
  sm_lowest_price: '最安値',
  sm_average_price: '平均価格',
  sm_competitor_count: '競合数',
  sm_profit_amount_usd: '利益額 (SellerMirror用)',
  sm_profit_margin: '利益率 (SellerMirror用)',
} as const;

/**
 * API別使用カラム一覧
 */
export const API_COLUMN_USAGE = {
  'shipping-calculate': [
    'ddu_price_usd',
    'ddp_price_usd',
    'shipping_cost_usd',
    'shipping_policy',
    'profit_margin',
    'profit_amount_usd',
  ],
  
  'profit-calculate': [
    'ddu_price_usd',
    'ddp_price_usd',
    'shipping_cost_usd',
    'shipping_policy',
    'profit_margin',
    'profit_amount_usd',
  ],
  
  'category-analyze': [
    'category_name',
    'category_number',
  ],
  
  'filters': [
    'filter_passed',
    'filter_reasons',
    'filter_checked_at',
  ],
  
  'sellermirror-analyze': [
    'ebay_category_id',
    'sm_sales_count',
  ],
  
  'browse-search': [
    'sm_lowest_price',
    'sm_average_price',
    'sm_competitor_count',
    'sm_profit_amount_usd',
    'sm_profit_margin',
  ],
  
  'research': [
    'sm_sales_count',
    'sm_lowest_price',
    'sm_profit_amount_usd',
    'sm_profit_margin',
    'sm_competitor_count',
  ],
} as const;
