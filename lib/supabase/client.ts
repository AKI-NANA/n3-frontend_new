// lib/supabase/client.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://zdzfpucdyxdlavkgrvil.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDYxNjUsImV4cCI6MjA3NDYyMjE2NX0.iQbmWDhF4ba0HF3mCv74Kza5aOMScJCVEQpmWzbMAYU'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  console.error('URL:', supabaseUrl)
  console.error('Key:', supabaseAnonKey ? '設定済み' : '未設定')
}

console.log('✅ Supabase初期化:', supabaseUrl)

// シングルトンインスタンスを作成
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// レガシー対応: createClient関数もエクスポート
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

// TypeScript型定義
export type HSCode = {
  code: string
  description: string
  base_duty: number
  section301: boolean
  section301_rate?: number
  category?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export type EbayCategoryFee = {
  id: number
  category_key: string
  category_name: string
  category_path?: string
  fvf: number
  cap?: number
  insertion_fee: number
  paypal_fee_percent?: number
  paypal_fee_fixed?: number
  active: boolean
  is_select_category?: boolean
  created_at?: string
  updated_at?: string
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
  created_at?: string
  updated_at?: string
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
  created_at?: string
  updated_at?: string
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
  created_at?: string
  updated_at?: string
}

export type ExchangeRate = {
  id: number
  currency_from: string
  currency_to: string
  spot_rate: number
  buffer_percent: number
  safe_rate: number
  source?: string
  created_at?: string
}

export type OriginCountry = {
  code: string
  name: string
  name_ja?: string
  fta_agreements?: string[]
  active: boolean
  created_at?: string
  updated_at?: string
}
