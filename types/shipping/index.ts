// 修正版型定義（エラーを避けるため簡略化）

export interface ShippingCalculationParams {
  weight_g: number
  length_cm: number
  width_cm: number
  height_cm: number
  destination_country: string
  declared_value_jpy: number
  need_signature: boolean
  need_insurance: boolean
  carrier_filter?: string[]
  service_type_filter?: string[]
}

export interface ShippingCalculationResult {
  id: string
  carrier_code: string
  carrier_name: string
  service_code: string
  service_name: string
  zone_code: string
  zone_name: string
  weight_used_g: number
  volumetric_weight_g: number
  chargeable_weight_g: number
  base_price_jpy: number
  fuel_surcharge_jpy: number
  insurance_fee_jpy: number
  signature_fee_jpy: number
  oversize_fee_jpy: number
  total_price_jpy: number
  total_price_usd: number
  delivery_days_min: number
  delivery_days_max: number
  delivery_days_text: string
  tracking: boolean
  insurance_included: boolean
  signature_available: boolean
  max_dimensions: {
    length_cm?: number
    width_cm?: number
    height_cm?: number
    total_cm?: number
  }
  restrictions: string[]
  warnings: string[]
  source_table: string
  calculation_timestamp: string
}

export interface MatrixData {
  weights: number[]
  countries: string[]
  services: Array<{
    carrier_code: string
    carrier_name: string
    service_code: string
    service_name: string
    zone_codes: string[]
    rates: Array<{
      weight_g: number
      country_code: string
      zone_code: string
      price_jpy: number
      price_usd: number
      available: boolean
      restricted: boolean
      note?: string
    }>
  }>
  generated_at: string
  exchange_rate_usd_jpy: number
}

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
  services: Array<{
    service_code: string
    service_name: string
    carrier_code: string
    service_type: string
    rates_count: number
    countries_count: number
    avg_delivery_days: number
  }>
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

export interface CalculatorState {
  layer: 1 | 2 | 3 | 4
  weight: string
  weight_unit: 'g' | 'kg'
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
  service_type_filter: 'ALL' | 'express' | 'economy' | 'standard'
  sort_by: 'price' | 'speed' | 'reliability'
  show_additional_fees: boolean
  show_restrictions: boolean
}

export interface APIResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
    timestamp: string
  }
  meta?: {
    total_count?: number
    page?: number
    limit?: number
    execution_time_ms?: number
  }
}
