import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Prefer': 'return=representation'
    }
  }
})

// Database types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      shipping_carriers: {
        Row: {
          id: string
          carrier_code: string
          carrier_name: string
          carrier_name_en: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          carrier_code: string
          carrier_name: string
          carrier_name_en?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          carrier_code?: string
          carrier_name?: string
          carrier_name_en?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      cpass_rates: {
        Row: {
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
      }
      cpass_surcharges: {
        Row: {
          id: string
          service_code: string
          surcharge_type: string
          calculation_method: string
          rate_percentage: number | null
          fixed_amount_jpy: number | null
          min_amount_jpy: number | null
          max_amount_jpy: number | null
          applies_to_countries: string[]
          effective_date: string
          expiry_date: string | null
          is_active: boolean
          note: string | null
          created_at: string
          updated_at: string
        }
      }
      shipping_rates: {
        Row: {
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
      }
      eloji_rates: {
        Row: {
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
      }
      products_master: {
        Row: {
          id: string
          sku: string
          title: string | null
          title_en: string | null
          english_title: string | null
          price_jpy: number | null
          purchase_price_jpy: number | null
          ddp_price_usd: number | null
          profit_amount_usd: number | null
          profit_margin: number | null
          profit_margin_percent: number | null
          listing_score: number | null
          score_calculated_at: string | null
          score_details: any | null
          category_name: string | null
          category_id: string | null
          hts_code: string | null
          listing_data: any | null
          scraped_data: any | null
          images: string[] | null
          eu_responsible_company_name: string | null
          eu_responsible_city: string | null
          // New offer-related fields
          auto_offer_enabled: boolean
          min_profit_margin_jpy: number | null
          max_discount_rate: number | null
          // Timestamps
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          title?: string | null
          title_en?: string | null
          english_title?: string | null
          price_jpy?: number | null
          purchase_price_jpy?: number | null
          ddp_price_usd?: number | null
          profit_amount_usd?: number | null
          profit_margin?: number | null
          profit_margin_percent?: number | null
          listing_score?: number | null
          score_calculated_at?: string | null
          score_details?: any | null
          category_name?: string | null
          category_id?: string | null
          hts_code?: string | null
          listing_data?: any | null
          scraped_data?: any | null
          images?: string[] | null
          eu_responsible_company_name?: string | null
          eu_responsible_city?: string | null
          auto_offer_enabled?: boolean
          min_profit_margin_jpy?: number | null
          max_discount_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string
          title?: string | null
          title_en?: string | null
          english_title?: string | null
          price_jpy?: number | null
          purchase_price_jpy?: number | null
          ddp_price_usd?: number | null
          profit_amount_usd?: number | null
          profit_margin?: number | null
          profit_margin_percent?: number | null
          listing_score?: number | null
          score_calculated_at?: string | null
          score_details?: any | null
          category_name?: string | null
          category_id?: string | null
          hts_code?: string | null
          listing_data?: any | null
          scraped_data?: any | null
          images?: string[] | null
          eu_responsible_company_name?: string | null
          eu_responsible_city?: string | null
          auto_offer_enabled?: boolean
          min_profit_margin_jpy?: number | null
          max_discount_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      ebay_category_limit: {
        Row: {
          id: string
          ebay_account_id: string
          category_id: string
          limit_type: '10000' | '50000' | 'other'
          current_listing_count: number
          max_limit: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          ebay_account_id: string
          category_id: string
          limit_type: '10000' | '50000' | 'other'
          current_listing_count?: number
          max_limit: number
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          ebay_account_id?: string
          category_id?: string
          limit_type?: '10000' | '50000' | 'other'
          current_listing_count?: number
          max_limit?: number
          last_updated?: string
          created_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
