// app/tools/editing/types/product.ts

export interface Product {
  // 🔥 基本情報（products_master完全対応）
  id: number | string  // UUIDまたは数値ID
  source_system?: string  // 'yahoo_scraped_products', 'ebay_inventory', etc.
  source_id?: string
  source_item_id?: string
  sku: string | null
  master_key?: string | null
  
  // タイトル
  title: string
  title_en?: string | null
  english_title?: string | null
  
  // 説明
  description?: string | null
  description_en?: string | null
  
  // 価格
  price_jpy?: number | null
  price_usd?: number | null
  current_price?: number | null
  suggested_price?: number | null
  cost_price?: number | null
  listing_price?: number | null
  purchase_price_jpy?: number | null
  recommended_price_usd?: number | null
  break_even_price_usd?: number | null
  
  // 在庫
  current_stock?: number | null
  inventory_quantity?: number | null
  inventory_location?: string | null
  last_stock_check?: string | null
  stock_status?: string | null
  
  // ステータス
  status?: string | null
  workflow_status?: string | null
  approval_status?: string | null
  listing_status?: string | null
  
  // 利益計算
  profit_margin?: number | null
  profit_amount?: number | null
  profit_amount_usd?: number | null
  profit_margin_percent?: number | null
  
  // SellerMirror分析結果
  sm_sales_count?: number | null
  sm_lowest_price?: number | null
  sm_average_price?: number | null
  sm_competitor_count?: number | null
  sm_profit_margin?: number | null
  sm_profit_amount_usd?: number | null
  sm_data?: any
  sm_fetched_at?: string | null
  
  // 競合分析
  competitors_lowest_price?: number | null
  competitors_average_price?: number | null
  competitors_count?: number | null
  competitors_data?: any
  
  // リサーチ結果
  research_sold_count?: number | null
  research_competitor_count?: number | null
  research_lowest_price?: number | null
  research_profit_margin?: number | null
  research_profit_amount?: number | null
  research_data?: any
  research_completed?: boolean
  research_updated_at?: string | null
  
  // カテゴリ情報
  category?: string | null
  category_id?: string | null
  category_name?: string | null
  category_number?: string | null
  category_confidence?: number | null
  category_candidates?: any
  ebay_category_id?: string | null
  ebay_category_path?: string | null
  
  // コンディション
  condition?: string | null
  condition_name?: string | null
  recommended_condition?: string | null
  
  // HTS/関税情報
  hts_code?: string | null
  hts_description?: string | null  // HTSコードの商品説明
  hts_duty_rate?: number | null  // HTS関税率
  hts_confidence?: string | null  // 推定精度: uncertain/low/medium/high
  origin_country?: string | null
  origin_country_duty_rate?: number | null  // 原産国関税率
  material?: string | null  // 素材
  material_duty_rate?: number | null  // 素材関税率
  duty_rate?: number | null
  base_duty_rate?: number | null
  additional_duty_rate?: number | null
  
  // AI活用情報（手動入力）
  rewritten_english_title?: string | null  // AIリライトタイトル
  market_research_summary?: string | null  // 市場調査サマリー
  
  // 送料情報
  shipping_cost?: number | null
  shipping_cost_usd?: number | null
  shipping_method?: string | null
  shipping_policy?: string | null
  shipping_service?: string | null
  usa_shipping_policy_name?: string | null
  
  // フィルター状態
  filter_passed?: boolean | null
  filter_checked_at?: string | null
  export_filter_status?: string | null
  patent_filter_status?: string | null
  mall_filter_status?: string | null
  final_judgment?: string | null
  
  // VEROブランド
  is_vero_brand?: boolean
  vero_brand_name?: string | null
  vero_risk_level?: string | null
  vero_notes?: string | null
  vero_checked_at?: string | null
  
  // AI情報
  ai_confidence_score?: number | null
  ai_recommendation?: string | null
  
  // 承認情報
  approved_at?: string | null
  approved_by?: string | null
  rejected_at?: string | null
  rejected_by?: string | null
  rejection_reason?: string | null
  
  // 出品情報
  listing_priority?: string | null
  selected_mall?: string | null
  target_marketplaces?: string[]
  scheduled_listing_date?: string | null
  listing_session_id?: string | null
  ebay_item_id?: string | null
  ebay_listing_url?: string | null
  listed_at?: string | null
  
  // 通貨
  currency?: string | null
  
  // ソース情報
  source?: string | null
  source_table?: string | null
  source_url?: string | null
  seller?: string | null
  location?: string | null
  bid_count?: string | null
  
  // 🖼️ 画像データ（複数ソースに対応）
  primary_image_url?: string | null
  images?: any[] | string[] | null  // 配列またはJSONB
  image_urls?: string[] | null
  gallery_images?: string[] | null
  image_count?: number
  
  // JSONBデータ
  ebay_api_data?: any
  scraped_data?: any
  listing_data?: any
  html_templates?: any
  
  // HTML
  html_content?: string | null
  html_template_id?: number | null
  
  // タイムスタンプ
  created_at?: string
  updated_at?: string
  
  // 出品履歴（仮想フィールド - 別テーブルから取得）
  listing_history?: Array<{
    marketplace: string
    account: string
    listing_id: string | null
    status: 'success' | 'failed'
    error_message?: string | null
    listed_at: string
  }>
}

export interface ProductUpdate {
  [key: string]: any
}

export interface BatchProcessResult {
  success: number
  failed: number
  errors: string[]
}

export type Marketplace = 'ebay' | 'shopee' | 'shopify'

export interface MarketplaceSelection {
  all: boolean
  ebay: boolean
  shopee: boolean
  shopify: boolean
}
