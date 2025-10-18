// テスト用のモックデータ（開発・テスト目的）

import type {
  ShippingCalculationResult,
  MatrixData,
  DatabaseStats,
  CPassRate,
  ShippingRate,
  ElojiRate
} from '@/types/shipping'

// モック送料計算結果
export const MOCK_CALCULATION_RESULTS: ShippingCalculationResult[] = [
  {
    id: '1',
    carrier_code: 'CPASS',
    carrier_name: 'CPass',
    service_code: 'SPEEDPAK_ECONOMY',
    service_name: 'SpeedPAK Economy',
    zone_code: 'US_ZONE4',
    zone_name: 'US (Zone 4)',
    weight_used_g: 1500,
    volumetric_weight_g: 1200,
    chargeable_weight_g: 1500,
    base_price_jpy: 1580,
    fuel_surcharge_jpy: 150,
    insurance_fee_jpy: 200,
    signature_fee_jpy: 0,
    oversize_fee_jpy: 0,
    total_price_jpy: 1930,
    total_price_usd: 12.51,
    delivery_days_min: 7,
    delivery_days_max: 14,
    delivery_days_text: '7-14営業日',
    tracking: true,
    insurance_included: true,
    signature_available: false,
    max_dimensions: {
      total_cm: 90
    },
    restrictions: [],
    warnings: [],
    source_table: 'cpass_rates',
    calculation_timestamp: new Date().toISOString()
  },
  {
    id: '2',
    carrier_code: 'JPPOST',
    carrier_name: '日本郵便',
    service_code: 'EMS',
    service_name: 'EMS',
    zone_code: 'ZONE4',
    zone_name: 'アメリカ (第4地帯)',
    weight_used_g: 1500,
    volumetric_weight_g: 1200,
    chargeable_weight_g: 1500,
    base_price_jpy: 2200,
    fuel_surcharge_jpy: 0,
    insurance_fee_jpy: 0,
    signature_fee_jpy: 460,
    oversize_fee_jpy: 0,
    total_price_jpy: 2660,
    total_price_usd: 17.24,
    delivery_days_min: 3,
    delivery_days_max: 6,
    delivery_days_text: '3-6営業日',
    tracking: true,
    insurance_included: true,
    signature_available: true,
    max_dimensions: {
      length_cm: 60,
      width_cm: 60,
      height_cm: 60
    },
    restrictions: [],
    warnings: [],
    source_table: 'shipping_rates',
    calculation_timestamp: new Date().toISOString()
  },
  {
    id: '3',
    carrier_code: 'ELOJI',
    carrier_name: 'Eloji',
    service_code: 'DHL_EXPRESS',
    service_name: 'DHL Express',
    zone_code: 'US_ZONE4',
    zone_name: 'US Zone 4',
    weight_used_g: 1500,
    volumetric_weight_g: 1200,
    chargeable_weight_g: 1500,
    base_price_jpy: 3200,
    fuel_surcharge_jpy: 320,
    insurance_fee_jpy: 280,
    signature_fee_jpy: 300,
    oversize_fee_jpy: 0,
    total_price_jpy: 4100,
    total_price_usd: 26.57,
    delivery_days_min: 2,
    delivery_days_max: 4,
    delivery_days_text: '2-4営業日',
    tracking: true,
    insurance_included: true,
    signature_available: true,
    max_dimensions: {
      length_cm: 120,
      width_cm: 80,
      height_cm: 80,
      total_cm: 300
    },
    restrictions: [],
    warnings: [],
    source_table: 'eloji_rates',
    calculation_timestamp: new Date().toISOString()
  },
  {
    id: '4',
    carrier_code: 'CPASS',
    carrier_name: 'CPass',
    service_code: 'DHL_EXPRESS',
    service_name: 'DHL Express',
    zone_code: 'US_ZONE4',
    zone_name: 'US (Zone 4)',
    weight_used_g: 1500,
    volumetric_weight_g: 1200,
    chargeable_weight_g: 1500,
    base_price_jpy: 2800,
    fuel_surcharge_jpy: 280,
    insurance_fee_jpy: 200,
    signature_fee_jpy: 300,
    oversize_fee_jpy: 0,
    total_price_jpy: 3580,
    total_price_usd: 23.20,
    delivery_days_min: 2,
    delivery_days_max: 4,
    delivery_days_text: '2-4営業日',
    tracking: true,
    insurance_included: true,
    signature_available: true,
    max_dimensions: {
      total_cm: 90
    },
    restrictions: [],
    warnings: [],
    source_table: 'cpass_rates',
    calculation_timestamp: new Date().toISOString()
  },
  {
    id: '5',
    carrier_code: 'JPPOST',
    carrier_name: '日本郵便',
    service_code: 'INTL_PARCEL',
    service_name: '国際小包（航空便）',
    zone_code: 'ZONE4',
    zone_name: 'アメリカ (第4地帯)',
    weight_used_g: 1500,
    volumetric_weight_g: 1200,
    chargeable_weight_g: 1500,
    base_price_jpy: 2650,
    fuel_surcharge_jpy: 0,
    insurance_fee_jpy: 0,
    signature_fee_jpy: 0,
    oversize_fee_jpy: 0,
    total_price_jpy: 2650,
    total_price_usd: 17.18,
    delivery_days_min: 6,
    delivery_days_max: 13,
    delivery_days_text: '6-13営業日',
    tracking: true,
    insurance_included: false,
    signature_available: false,
    max_dimensions: {
      length_cm: 150,
      total_cm: 300
    },
    restrictions: [],
    warnings: ['追跡は発送から24時間後に利用可能'],
    source_table: 'shipping_rates',
    calculation_timestamp: new Date().toISOString()
  }
]

// モックマトリックスデータ
export const MOCK_MATRIX_DATA: MatrixData = {
  weights: [0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0, 20.0, 30.0],
  countries: ['US', 'GB', 'DE', 'AU'],
  services: [
    {
      carrier_code: 'CPASS',
      carrier_name: 'CPass',
      service_code: 'SPEEDPAK_ECONOMY',
      service_name: 'SpeedPAK Economy',
      zone_codes: ['US_ZONE4', 'GB_ZONE2', 'DE_ZONE2', 'AU_ZONE6'],
      rates: [
        // US向け
        { weight_g: 500, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 1580, price_usd: 10.24, available: true, restricted: false },
        { weight_g: 1000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 1980, price_usd: 12.83, available: true, restricted: false },
        { weight_g: 1500, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 2380, price_usd: 15.42, available: true, restricted: false },
        { weight_g: 2000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 2780, price_usd: 18.01, available: true, restricted: false },
        { weight_g: 3000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 3580, price_usd: 23.20, available: true, restricted: false },
        { weight_g: 5000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 5380, price_usd: 34.86, available: true, restricted: false },
        { weight_g: 10000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 9580, price_usd: 62.09, available: true, restricted: false },
        { weight_g: 20000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 18580, price_usd: 120.40, available: true, restricted: false },
        { weight_g: 30000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 27580, price_usd: 178.71, available: true, restricted: false }
      ]
    },
    {
      carrier_code: 'JPPOST',
      carrier_name: '日本郵便',
      service_code: 'EMS',
      service_name: 'EMS',
      zone_codes: ['ZONE4', 'ZONE2', 'ZONE2', 'ZONE6'],
      rates: [
        // US向け
        { weight_g: 500, country_code: 'US', zone_code: 'ZONE4', price_jpy: 2200, price_usd: 14.26, available: true, restricted: false },
        { weight_g: 1000, country_code: 'US', zone_code: 'ZONE4', price_jpy: 2700, price_usd: 17.50, available: true, restricted: false },
        { weight_g: 1500, country_code: 'US', zone_code: 'ZONE4', price_jpy: 3200, price_usd: 20.74, available: true, restricted: false },
        { weight_g: 2000, country_code: 'US', zone_code: 'ZONE4', price_jpy: 3700, price_usd: 23.98, available: true, restricted: false },
        { weight_g: 3000, country_code: 'US', zone_code: 'ZONE4', price_jpy: 4700, price_usd: 30.46, available: true, restricted: false },
        { weight_g: 5000, country_code: 'US', zone_code: 'ZONE4', price_jpy: 6700, price_usd: 43.42, available: true, restricted: false },
        { weight_g: 10000, country_code: 'US', zone_code: 'ZONE4', price_jpy: 11700, price_usd: 75.84, available: true, restricted: false },
        { weight_g: 20000, country_code: 'US', zone_code: 'ZONE4', price_jpy: 21700, price_usd: 140.66, available: true, restricted: false },
        { weight_g: 30000, country_code: 'US', zone_code: 'ZONE4', price_jpy: 31700, price_usd: 205.47, available: true, restricted: false }
      ]
    },
    {
      carrier_code: 'ELOJI',
      carrier_name: 'Eloji',
      service_code: 'DHL_EXPRESS',
      service_name: 'DHL Express',
      zone_codes: ['US_ZONE4', 'GB_ZONE2', 'DE_ZONE2', 'AU_ZONE6'],
      rates: [
        // US向け
        { weight_g: 500, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 3200, price_usd: 20.74, available: true, restricted: false },
        { weight_g: 1000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 3800, price_usd: 24.63, available: true, restricted: false },
        { weight_g: 1500, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 4400, price_usd: 28.52, available: true, restricted: false },
        { weight_g: 2000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 5000, price_usd: 32.40, available: true, restricted: false },
        { weight_g: 3000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 6200, price_usd: 40.18, available: true, restricted: false },
        { weight_g: 5000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 8600, price_usd: 55.74, available: true, restricted: false },
        { weight_g: 10000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 14600, price_usd: 94.63, available: true, restricted: false },
        { weight_g: 20000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 26600, price_usd: 172.40, available: true, restricted: false },
        { weight_g: 30000, country_code: 'US', zone_code: 'US_ZONE4', price_jpy: 38600, price_usd: 250.16, available: true, restricted: false }
      ]
    }
  ],
  generated_at: new Date().toISOString(),
  exchange_rate_usd_jpy: 154.32
}

// モックデータベース統計
export const MOCK_DATABASE_STATS: DatabaseStats = {
  total_records: 9202,
  last_updated: new Date().toISOString(),
  carriers: [
    {
      carrier_code: 'CPASS',
      carrier_name: 'CPass',
      services_count: 7,
      rates_count: 6125,
      cheapest_price_jpy: 980,
      most_expensive_price_jpy: 45600,
      avg_price_jpy: 8950,
      countries_served: 185,
      weight_range_min_g: 100,
      weight_range_max_g: 30000
    },
    {
      carrier_code: 'JPPOST',
      carrier_name: '日本郵便',
      services_count: 5,
      rates_count: 270,
      cheapest_price_jpy: 1200,
      most_expensive_price_jpy: 66700,
      avg_price_jpy: 12800,
      countries_served: 190,
      weight_range_min_g: 25,
      weight_range_max_g: 30000
    },
    {
      carrier_code: 'ELOJI',
      carrier_name: 'Eloji',
      services_count: 15,
      rates_count: 2807,
      cheapest_price_jpy: 1580,
      most_expensive_price_jpy: 89400,
      avg_price_jpy: 18500,
      countries_served: 185,
      weight_range_min_g: 500,
      weight_range_max_g: 30000
    }
  ],
  services: [
    {
      service_code: 'SPEEDPAK_ECONOMY',
      service_name: 'SpeedPAK Economy',
      carrier_code: 'CPASS',
      service_type: 'economy',
      rates_count: 2450,
      countries_count: 48,
      avg_delivery_days: 10
    },
    {
      service_code: 'EMS',
      service_name: 'EMS',
      carrier_code: 'JPPOST',
      service_type: 'express',
      rates_count: 115,
      countries_count: 120,
      avg_delivery_days: 4
    },
    {
      service_code: 'DHL_EXPRESS',
      service_name: 'DHL Express',
      carrier_code: 'ELOJI',
      service_type: 'express',
      rates_count: 1400,
      countries_count: 220,
      avg_delivery_days: 3
    }
  ],
  countries_stats: {
    total_countries: 195,
    most_expensive_country: 'アフガニスタン',
    cheapest_country: 'アメリカ',
    avg_price_by_region: {
      'North America': 8500,
      'Europe': 12000,
      'Asia': 6500,
      'Oceania': 15000,
      'Africa': 25000,
      'South America': 18000
    }
  },
  weight_ranges: {
    total_ranges: 120,
    min_weight_g: 25,
    max_weight_g: 30000,
    most_common_increment_g: 500
  }
}

// モック CPass データ
export const MOCK_CPASS_RATES: CPassRate[] = [
  {
    id: '1',
    service_code: 'SPEEDPAK_ECONOMY',
    destination_country: 'US',
    zone_code: 'US_ZONE4',
    weight_from_g: 0,
    weight_to_g: 2000,
    price_jpy: 1580,
    price_usd: 10.24,
    delivery_days: '7-14',
    tracking: true,
    insurance: true,
    signature_required: false,
    size_limit_cm: 90,
    effective_date: '2024-01-01',
    note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// モック 日本郵便データ
export const MOCK_SHIPPING_RATES: ShippingRate[] = [
  {
    id: '1',
    carrier_id: 'jppost-001',
    service_id: 'ems-001',
    zone_id: 'zone4-001',
    weight_from_g: 0,
    weight_to_g: 2000,
    price_jpy: 2200,
    price_usd: 14.26,
    effective_date: '2024-01-01',
    expiry_date: null,
    is_active: true,
    note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// モック Eloji データ
export const MOCK_ELOJI_RATES: ElojiRate[] = [
  {
    id: '1',
    carrier_name: 'DHL',
    service_name: 'DHL Express',
    origin_country: 'JP',
    destination_country: 'US',
    zone_code: 'US_ZONE4',
    weight_from_g: 0,
    weight_to_g: 2000,
    price_jpy: 3200,
    price_usd: 20.74,
    delivery_days_min: 2,
    delivery_days_max: 4,
    tracking: true,
    insurance_included: true,
    signature_required: true,
    max_length_cm: 120,
    max_width_cm: 80,
    max_height_cm: 80,
    max_total_dimension_cm: 300,
    volumetric_factor: 5000,
    effective_date: '2024-01-01',
    note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// 開発モード判定
export const isDevelopment = process.env.NODE_ENV === 'development'
export const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'

// モックデータ提供関数
export function getMockCalculationResults(params?: any): ShippingCalculationResult[] {
  // パラメータに応じてフィルタリング可能
  return MOCK_CALCULATION_RESULTS
}

export function getMockMatrixData(countries?: string[], weights?: number[]): MatrixData {
  const data = { ...MOCK_MATRIX_DATA }
  
  if (countries) {
    data.countries = countries
    // 対応する rates もフィルタリング
    data.services = data.services.map(service => ({
      ...service,
      rates: service.rates.filter(rate => countries.includes(rate.country_code))
    }))
  }
  
  if (weights) {
    data.weights = weights
    // 対応する rates もフィルタリング
    data.services = data.services.map(service => ({
      ...service,
      rates: service.rates.filter(rate => weights.includes(rate.weight_g / 1000))
    }))
  }
  
  return data
}

export function getMockDatabaseStats(): DatabaseStats {
  return MOCK_DATABASE_STATS
}
