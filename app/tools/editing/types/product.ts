// app/tools/editing/types/product.ts

export interface Product {
  id: number
  source_item_id: string
  sku: string | null
  master_key: string | null  // Master Key追加
  title: string
  english_title: string | null
  
  // 価格
  price_jpy: number | null
  price_usd: number | null
  current_stock: number | null
  status: string | null
  
  // 利益計算
  profit_margin: number | null
  profit_amount_usd: number | null
  
  // SellerMirror分析結果
  sm_lowest_price: number | null
  sm_average_price: number | null
  sm_competitor_count: number | null
  sm_profit_margin: number | null
  sm_profit_amount_usd: number | null
  
  // JSONBデータ
  ebay_api_data: any
  scraped_data: any
  listing_data: any
  
  // タイムスタンプ
  created_at: string
  updated_at: string
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
