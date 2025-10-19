// Supabase Client for eBay Pricing Calculator
// Browser環境用のクライアント設定

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript型定義
export type HSCode = {
  code: string
  description: string
  base_duty: number
  section301: boolean
  section301_rate?: number
  category: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export type EbayCategoryFee = {
  id: number
  category_key: string
  category_name: string
  fvf: number
  cap?: number
  insertion_fee: number
  store_discount_basic?: number
  store_discount_premium?: number
  store_discount_anchor?: number
  active: boolean
}

export type ShippingPolicy = {
  id: number
  policy_name: string
  ebay_policy_id?: string
  weight_min: number
  weight_max: number
  size_min: number
  size_max: number
  price_min: number
  price_max: number
  active: boolean
  zones?: ShippingZone[]
}

export type ShippingZone = {
  id: number
  policy_id: number
  country_code: string
  display_shipping: number
  actual_cost: number
  handling_ddp?: number
  handling_ddu: number
}

export type ProfitMarginSetting = {
  id: number
  setting_type: 'default' | 'category' | 'country' | 'condition'
  setting_key: string
  default_margin: number
  min_margin: number
  min_amount: number
  max_margin: number
  active: boolean
}

export type ExchangeRate = {
  id: number
  currency_from: string
  currency_to: string
  spot_rate: number
  buffer_percent: number
  safe_rate: number
  source: string
  created_at: string
}

export type OriginCountry = {
  code: string
  name: string
  name_ja?: string
  fta_agreements?: string[]
  active: boolean
}

export type CalculationHistory = {
  id: number
  user_id?: string
  cost_jpy: number
  actual_weight: number
  length: number
  width: number
  height: number
  dest_country: string
  origin_country: string
  hs_code?: string
  category?: string
  store_type?: string
  refundable_fees_jpy?: number
  product_price?: number
  shipping?: number
  handling?: number
  total_revenue?: number
  profit_usd_no_refund?: number
  profit_usd_with_refund?: number
  profit_jpy_no_refund?: number
  profit_jpy_with_refund?: number
  profit_margin?: number
  refund_amount?: number
  success: boolean
  error_message?: string
  created_at: string
}

// Database型定義（全体）
export type Database = {
  public: {
    Tables: {
      hs_codes: {
        Row: HSCode
        Insert: Omit<HSCode, 'created_at' | 'updated_at'>
        Update: Partial<Omit<HSCode, 'code' | 'created_at' | 'updated_at'>>
      }
      ebay_category_fees: {
        Row: EbayCategoryFee
        Insert: Omit<EbayCategoryFee, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EbayCategoryFee, 'id' | 'created_at' | 'updated_at'>>
      }
      shipping_policies: {
        Row: ShippingPolicy
        Insert: Omit<ShippingPolicy, 'id' | 'created_at' | 'updated_at' | 'zones'>
        Update: Partial<Omit<ShippingPolicy, 'id' | 'created_at' | 'updated_at' | 'zones'>>
      }
      shipping_zones: {
        Row: ShippingZone
        Insert: Omit<ShippingZone, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ShippingZone, 'id' | 'created_at' | 'updated_at'>>
      }
      profit_margin_settings: {
        Row: ProfitMarginSetting
        Insert: Omit<ProfitMarginSetting, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProfitMarginSetting, 'id' | 'created_at' | 'updated_at'>>
      }
      exchange_rates: {
        Row: ExchangeRate
        Insert: Omit<ExchangeRate, 'id' | 'created_at'>
        Update: never
      }
      origin_countries: {
        Row: OriginCountry
        Insert: Omit<OriginCountry, 'created_at' | 'updated_at'>
        Update: Partial<Omit<OriginCountry, 'code' | 'created_at' | 'updated_at'>>
      }
      calculation_history: {
        Row: CalculationHistory
        Insert: Omit<CalculationHistory, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: {
      latest_exchange_rate: {
        Row: {
          spot_rate: number
          buffer_percent: number
          safe_rate: number
          source: string
          created_at: string
        }
      }
    }
  }
}
