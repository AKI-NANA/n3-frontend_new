// 送料計算パラメータ
export interface ShippingCalculationParams {
  weight_g: number
  length_cm?: number
  width_cm?: number
  height_cm?: number
  destination_country: string
  declared_value_jpy?: number
  need_signature?: boolean
  need_insurance?: boolean
  carrier_filter?: string[]
  service_type_filter?: string[]
}

// 送料計算結果
export interface ShippingCalculationResult {
  id: string
  carrier_code: string
  carrier_name: string
  service_code: string
  service_name: string
  service_type?: string  // Express / Standard / Economy
  zone_code: string
  zone_name: string
  
  // 重量情報
  weight_used_g: number
  volumetric_weight_g: number
  chargeable_weight_g: number
  
  // 料金詳細
  base_price_jpy: number
  fuel_surcharge_jpy: number
  demand_surcharge_jpy?: number          // 需要サーチャージ合計（新規追加）
  peak_surcharge_jpy?: number            // ピークサーチャージ（新規追加）
  residential_surcharge_jpy?: number     // 住宅配送サーチャージ（新規追加）
  remote_area_surcharge_jpy?: number     // 遠隔地サーチャージ（新規追加）
  customs_clearance_jpy?: number         // 通関手数料（新規追加）
  duties_taxes_jpy?: number              // 関税・消費税（新規追加）
  declared_value_jpy?: number            // 申告価格（保険料計算用）
  insurance_fee_jpy: number
  signature_fee_jpy: number
  oversize_fee_jpy: number
  total_price_jpy: number
  total_price_usd: number
  recommended_price_jpy?: number  // 推奨販売価格（全込み）
  recommended_price_usd?: number
  
  // マージン情報（新規追加）
  margin?: {
    base_rate_jpy: number
    margin_rate: number
    margin_amount_jpy: number
    recommended_price_jpy: number
    recommended_price_usd: number
  }
  
  // 配送情報
  delivery_days_min: number
  delivery_days_max: number
  delivery_days_text: string
  tracking: boolean
  insurance_included: boolean
  signature_available: boolean
  
  // 制限事項
  max_dimensions: {
    length_cm?: number
    width_cm?: number
    height_cm?: number
    total_cm?: number
  }
  restrictions: string[]
  warnings: string[]
  
  // メタ情報
  source_table: string
  calculation_timestamp: string
}

// マトリックスデータ
export interface MatrixData {
  weights: number[]
  countries: string[]
  services: Array<{
    carrier_name: string
    carrier_code: string
    service_name: string
    service_code: string
    service_type?: string
    zone_codes?: string[]
    rates: Array<{
      carrier_name?: string
      carrier_code?: string
      service_name?: string
      service_code?: string
      service_type?: string
      price_jpy: number
      price_usd: number
      weight_g: number
      country_code: string
      zone_code?: string
      available: boolean
      restricted?: boolean
    }>
  }>
  generated_at: string
  exchange_rate_usd_jpy: number
}

// データベース統計
export interface DatabaseStats {
  total_records: number
  last_updated: string
  carriers: Array<{
    carrier_code: string
    carrier_name: string
    services_count: number
    rates_count: number
    cheapest_price_jpy: number
    most_expensive_price_jpy: number
    avg_price_jpy: number
    countries_served: number
    weight_range_min_g: number
    weight_range_max_g: number
  }>
  services: any[]
  countries_stats: {
    total_countries: number
    most_expensive_country: string
    cheapest_country: string
    avg_price_by_region: Record<string, number>
  }
  weight_ranges: {
    total_ranges: number
    min_weight_g: number
    max_weight_g: number
    most_common_increment_g: number
  }
}

// 計算機の状態
export interface CalculatorState {
  layer: 1 | 2 | 3 | 4
  weight: string
  weight_unit: 'kg' | 'g'
  length: string
  width: string
  height: string
  dimension_unit: 'cm' | 'inch'
  country: string
  declared_value: string
  currency: 'USD' | 'JPY'
  need_signature: boolean
  need_insurance: boolean
  carrier_filter: string
  service_type_filter: string
  sort_by: 'price' | 'speed' | 'reliability'
  show_additional_fees: boolean
  show_restrictions: boolean
}

// APIレスポンス型
export interface APIResponse<T> {
  data?: T
  error?: {
    message: string
    timestamp: string
  }
  meta?: Record<string, any>
}

// CPass料金データ
export interface CPassRate {
  id: string
  service_code: string
  destination_country: string
  zone_code: string
  weight_from_g: number
  weight_to_g: number
  price_jpy: number
  price_usd: number
  delivery_days: string
  tracking: boolean
  insurance: boolean
  signature_required: boolean
  size_limit_cm: number | null
  effective_date: string
  note: string | null
  created_at: string
  updated_at: string
}

// 日本郵便料金データ
export interface ShippingRate {
  id: string
  carrier_id: string
  service_id: string
  zone_id: string
  weight_from_g: number
  weight_to_g: number
  price_jpy: number
  price_usd: number | null
  effective_date: string
  expiry_date: string | null
  is_active: boolean
  note: string | null
  created_at: string
  updated_at: string
}

// Eloji料金データ
export interface ElojiRate {
  id: string
  carrier_name: string
  service_name: string
  origin_country: string
  destination_country: string
  zone_code: string
  weight_from_g: number
  weight_to_g: number
  price_jpy: number
  price_usd: number
  delivery_days_min: number
  delivery_days_max: number
  tracking: boolean
  insurance_included: boolean
  signature_required: boolean
  max_length_cm: number | null
  max_width_cm: number | null
  max_height_cm: number | null
  max_total_dimension_cm: number | null
  volumetric_factor: number
  effective_date: string
  note: string | null
  created_at: string
  updated_at: string
}
