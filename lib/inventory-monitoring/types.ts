// 在庫監視システムの型定義

export interface MonitoringLog {
  id: string
  execution_type: 'scheduled' | 'manual'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

  target_count: number
  processed_count: number
  success_count: number
  error_count: number

  scheduled_at?: string
  started_at?: string
  completed_at?: string
  duration_seconds?: number

  changes_detected: number
  price_changes: number
  stock_changes: number
  page_errors: number

  product_ids?: string[]
  settings?: Record<string, any>

  error_message?: string
  error_details?: Record<string, any>

  created_at: string
  updated_at: string
}

export interface InventoryChange {
  id: string
  product_id: string
  log_id?: string

  change_type: 'price' | 'stock' | 'page_deleted' | 'page_changed' | 'page_error'

  old_value?: string
  new_value?: string
  old_price_jpy?: number
  new_price_jpy?: number
  old_stock?: number
  new_stock?: number

  recalculated_data?: Record<string, any>
  recalculated_profit_margin?: number
  recalculated_ebay_price_usd?: number
  recalculated_shipping_cost?: number

  status: 'pending' | 'reviewed' | 'applied' | 'ignored' | 'error'
  reviewed_by?: string
  reviewed_at?: string
  applied_at?: string

  applied_to_marketplace: boolean
  marketplace_update_status?: Record<string, string>
  ebay_update_attempted_at?: string
  ebay_update_success?: boolean
  ebay_update_error?: string

  detected_at: string
  notes?: string

  created_at: string
  updated_at: string

  // 商品情報（JOIN時）
  product?: {
    id: string
    sku: string
    title: string
    source_url: string
    ebay_listing_id?: string
  }
}

export interface MonitoringSchedule {
  id: string
  enabled: boolean
  name: string
  frequency: 'hourly' | 'daily' | 'custom'
  time_window_start: string
  time_window_end: string

  max_items_per_batch: number
  delay_min_seconds: number
  delay_max_seconds: number

  random_time_offset_minutes: number
  use_random_user_agent: boolean

  email_notification: boolean
  notification_emails: string[]
  notify_on_changes_only: boolean
  notify_on_errors: boolean

  next_execution_at?: string
  last_execution_at?: string
  last_execution_log_id?: string

  max_consecutive_errors: number
  pause_on_error_threshold: boolean

  created_at: string
  updated_at: string
}

export interface MonitoringError {
  id: string
  log_id?: string
  product_id?: string

  error_type: string
  error_message: string
  error_details?: Record<string, any>

  source_url?: string
  http_status_code?: number
  retry_count: number

  occurred_at: string
  resolved_at?: string
  resolution_notes?: string
}

export interface MonitoringTarget {
  id: string
  sku: string
  title: string
  source_url: string
  monitoring_enabled: boolean
  monitoring_status: string
  last_monitored_at?: string
  monitoring_error_count: number
  previous_price_jpy?: number
  previous_stock?: number
  current_stock?: number
  acquired_price_jpy?: number
}

export interface ScrapedData {
  success: boolean
  price_jpy?: number
  stock?: number
  status?: 'active' | 'ended' | 'deleted' | 'not_found'
  title?: string
  condition?: string
  error?: string
  raw_data?: any
}

export interface ChangeDetectionResult {
  hasChanges: boolean
  changes: Array<{
    type: 'price' | 'stock' | 'page_deleted' | 'page_changed'
    old_value: any
    new_value: any
  }>
}

export interface RecalculatedPricing {
  acquired_price_jpy: number
  shipping_cost_usd?: number
  profit_margin?: number
  profit_amount_usd?: number
  buy_it_now_price_usd?: number
  ddp_price_usd?: number
  ddu_price_usd?: number
}

export interface BatchExecutionOptions {
  type: 'scheduled' | 'manual'
  max_items?: number
  delay_min?: number
  delay_max?: number
  product_ids?: string[]
}

export interface BatchExecutionProgress {
  log_id: string
  status: string
  progress: number
  current_item: number
  total_items: number
  changes_detected: number
  errors: number
}
