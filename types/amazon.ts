export interface AmazonProduct {
  id: string
  asin: string
  title: string
  brand?: string
  manufacturer?: string
  product_group?: string
  binding?: string

  current_price?: number
  currency?: string
  price_min?: number
  price_max?: number
  savings_amount?: number
  savings_percentage?: number

  availability_status?: string
  availability_message?: string
  max_order_quantity?: number
  min_order_quantity?: number

  is_prime_eligible?: boolean
  is_free_shipping_eligible?: boolean
  is_amazon_fulfilled?: boolean
  shipping_charges?: number

  review_count?: number
  star_rating?: number

  sales_rank?: Record<string, any>
  category_ranks?: Record<string, any>[]

  images_primary?: {
    small?: string
    medium?: string
    large?: string
  }
  images_variants?: Array<{
    small?: string
    medium?: string
    large?: string
  }>

  features?: string[]
  product_dimensions?: Record<string, any>
  item_specifics?: Record<string, any>
  technical_details?: Record<string, any>

  browse_nodes?: Array<{
    id: string
    name: string
    ancestor?: string
  }>

  parent_asin?: string
  variation_summary?: Record<string, any>

  external_ids?: Record<string, string>
  merchant_info?: Record<string, any>
  promotions?: Record<string, any>[]

  profit_score?: number
  profit_amount?: number
  roi_percentage?: number
  ebay_competitive_price?: number
  ebay_lowest_price?: number
  seller_mirror_data?: Record<string, any>

  is_high_priority?: boolean
  is_listed_on_ebay?: boolean
  price_fluctuation_count?: number
  stock_change_count?: number

  last_price_check_at?: string
  last_stock_check_at?: string
  last_api_update_at?: string
  last_profit_calculation_at?: string

  data_completeness_score?: number
  api_error_count?: number
  last_api_error?: string

  created_at: string
  updated_at: string

  api_version?: string
  marketplace?: string
  data_source?: string

  user_id: string
}

export interface AmazonPriceHistory {
  id: string
  product_id: string
  asin: string
  price: number
  currency?: string
  price_type?: string
  previous_price?: number
  change_amount?: number
  change_percentage?: number
  availability_status?: string
  is_prime_eligible?: boolean
  promotion_active?: boolean
  recorded_at: string
  detection_method?: string
  alert_triggered?: boolean
  alert_sent_at?: string
}

export interface AmazonStockHistory {
  id: string
  product_id: string
  asin: string
  availability_status: string
  availability_message?: string
  previous_status?: string
  stock_quantity?: number
  max_order_quantity?: number
  min_order_quantity?: number
  status_changed?: boolean
  back_in_stock?: boolean
  out_of_stock?: boolean
  recorded_at: string
  detection_method?: string
  alert_triggered?: boolean
  alert_sent_at?: string
}

export interface AmazonSearchParams {
  keywords?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  primeOnly?: boolean
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'review_count'
  page?: number
  limit?: number
}

export interface ProfitCalculation {
  purchase_price: number
  amazon_shipping: number
  ebay_listing_fee: number
  ebay_final_value_fee: number
  ebay_shipping_to_buyer: number
  suggested_selling_price: number
  profit_amount: number
  profit_margin: number
  roi_percentage: number
}
