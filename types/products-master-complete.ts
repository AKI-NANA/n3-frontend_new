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

  // ===== Keepa統合・P-4/P-1戦略関連 =====
  asin: string | null;                   // Amazon ASIN
  keepa_domain: number | null;           // Keepaドメイン (1=US, 5=JP, etc.)

  // P-4スコア（市場枯渇戦略）
  p4_total_score: number | null;         // P-4総合スコア (0-100)
  p4_stock_out_frequency: number | null; // 在庫切れ頻度スコア (0-40)
  p4_price_increase: number | null;      // 価格上昇スコア (0-30)
  p4_bsr_volatility: number | null;      // BSRボラティリティスコア (0-20)
  p4_current_opportunity: number | null; // 現在の機会スコア (0-10)
  p4_recommendation: string | null;      // 推奨レベル (excellent/good/moderate/none)

  // P-1スコア（価格ミス戦略）
  p1_total_score: number | null;         // P-1総合スコア (0-100)
  p1_price_drop_percentage: number | null; // 価格下落率スコア (0-50)
  p1_drop_speed: number | null;          // 価格下落速度スコア (0-20)
  p1_historical_stability: number | null; // 歴史的安定性スコア (0-15)
  p1_sales_rank_quality: number | null;  // BSRクオリティスコア (0-15)
  p1_recommendation: string | null;      // 推奨レベル (excellent/good/moderate/none)

  // 統合スコア
  primary_strategy: string | null;       // 主要戦略 (P-4/P-1)
  primary_score: number | null;          // 主要スコア
  should_purchase: boolean | null;       // 購入推奨フラグ
  urgency: string | null;                // 緊急度 (high/medium/low)

  // Amazon BSR（ベストセラーランク）
  current_bsr: number | null;            // 現在のBSR
  avg_bsr_30d: number | null;            // 30日平均BSR
  avg_bsr_90d: number | null;            // 90日平均BSR
  bsr_category: string | null;           // BSRカテゴリー

  // Amazon価格履歴
  current_amazon_price: number | null;   // 現在のAmazon価格
  avg_amazon_price_30d: number | null;   // 30日平均Amazon価格
  avg_amazon_price_90d: number | null;   // 90日平均Amazon価格
  min_amazon_price_90d: number | null;   // 90日最安値
  max_amazon_price_90d: number | null;   // 90日最高値

  // 在庫状態
  is_in_stock: boolean | null;           // 現在の在庫状態
  stock_out_count_90d: number | null;    // 90日間の在庫切れ回数
  last_stock_out_date: string | null;    // 最終在庫切れ日
  last_restock_date: string | null;      // 最終再入荷日

  // レビュー情報
  review_count: number | null;           // レビュー数
  review_rating: number | null;          // レビュー評価 (0-5)

  // Keepa生データ（JSONB）
  keepa_data: KeepaData | null;          // Keepa完全データ
  keepa_last_updated: string | null;     // Keepa最終更新日時

  // ===== 画像・メディア =====
  images: string[] | null;
  primary_image: string | null;
  
  // ===== JSONB データ =====
  listing_data: ListingData | null;
  ebay_api_data: EbayApiData | null;
  scraped_data: any | null;
  
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
  
  // その他
  [key: string]: any;
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
 * Keepa完全データ（JSONB）
 */
export interface KeepaData {
  // 基本情報
  asin?: string;
  domainId?: number;
  title?: string;
  brand?: string;
  productGroup?: string;
  productType?: string;
  model?: string;
  color?: string;
  size?: string;

  // カテゴリー
  categoryTree?: Array<{ catId: number; name: string }>;
  rootCategory?: number;

  // 寸法・重量
  packageDimensions?: {
    width?: number;
    height?: number;
    length?: number;
    weight?: number;
  };
  itemDimensions?: {
    width?: number;
    height?: number;
    length?: number;
    weight?: number;
  };

  // 価格履歴（時系列データ）
  priceHistory?: {
    amazonPrice?: number[][];       // [timestamp, price][]
    newPrice?: number[][];
    usedPrice?: number[][];
    buyBoxPrice?: number[][];
  };

  // BSR履歴
  salesRankHistory?: {
    [categoryId: string]: number[][]; // [timestamp, rank][]
  };

  // 統計データ
  stats?: {
    current?: number[];
    avg?: number[];
    min?: number[];
    max?: number[];
    avg30?: number[];
    avg90?: number[];
  };

  // オファー情報
  offers?: Array<{
    sellerId?: string;
    condition?: number;
    price?: number;
    shipping?: number;
    isPrime?: boolean;
    isFBA?: boolean;
  }>;

  // レビュー
  reviewCount?: number;
  rating?: number;

  // その他
  trackingSince?: number;
  lastUpdate?: number;
  imagesCSV?: string;
  eanList?: string[];
  upcList?: string[];

  // 生データ保存
  raw?: any;
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
