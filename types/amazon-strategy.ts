// Amazon Research Strategy Types

export interface AmazonResearchStrategy {
  id: string
  user_id: string

  // 資産の保護（有在庫品・高スコア品）
  enable_inventory_protection: boolean
  min_profit_score_threshold: number // 例: 5000点

  // 市場の開拓（新規・特定の条件）
  enable_new_products: boolean
  new_products_days: number // 例: 30日以内

  monitor_categories: string[] // カテゴリーID配列
  monitor_keywords: string[] // キーワード配列

  price_range_min?: number // 価格帯フィルタ（下限）
  price_range_max?: number // 価格帯フィルタ（上限）

  // 競合の追跡（外部データとの連携）
  enable_competitor_tracking: boolean
  competitor_seller_ids: string[] // 競合セラーID配列
  enable_ebay_sold_tracking: boolean // eBay Sold実績追跡

  // 実行設定
  execution_frequency: 'daily' | 'twice_daily' | 'hourly' // 実行頻度
  max_asins_per_execution: number // 1回の実行で選定する最大ASIN数

  // ステータス
  is_active: boolean
  last_executed_at?: string

  created_at: string
  updated_at: string
}

export interface AmazonUpdateQueue {
  id: string
  asin: string
  source: 'inventory_protection' | 'high_score' | 'new_product' | 'category' | 'keyword' | 'competitor' | 'ebay_sold' | 'manual'
  priority: number // 1-10 (10が最高優先度)
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retry_count: number
  last_error?: string
  scheduled_at: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface QueueStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  bySource: Record<string, number>
  avgProcessingTime?: number
}

export interface StrategyExecutionResult {
  success: boolean
  asins_selected: number
  asins_queued: number
  asins_skipped: number
  breakdown: {
    inventory_protection: number
    high_score: number
    new_product: number
    category: number
    keyword: number
    competitor: number
    ebay_sold: number
  }
  errors?: string[]
}
