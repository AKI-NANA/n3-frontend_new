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
      expense_master: {
        Row: {
          id: string
          keyword: string
          category_id: string
          account_title: string
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          keyword: string
          category_id: string
          account_title: string
          description: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          keyword?: string
          category_id?: string
          account_title?: string
          description?: string
          created_at?: string
          updated_at?: string
        }
      }
      accounting_final_ledger: {
        Row: {
          id: string
          date: string
          account_title: string
          amount: number
          category: string
          transaction_summary: string
          order_id: string | null
          is_verified: boolean
          money_cloud_transaction_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          account_title: string
          amount: number
          category: string
          transaction_summary: string
          order_id?: string | null
          is_verified?: boolean
          money_cloud_transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          account_title?: string
          amount?: number
          category?: string
          transaction_summary?: string
          order_id?: string | null
          is_verified?: boolean
          money_cloud_transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_analysis_results: {
        Row: {
          id: string
          analysis_date: string
          evaluation_summary: string
          gross_profit_rate: number | null
          net_profit_rate: number | null
          expense_ratio: number | null
          cash_balance: number | null
          issues: string[]
          policy_recommendation: string[]
          reference_data_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          analysis_date: string
          evaluation_summary: string
          gross_profit_rate?: number | null
          net_profit_rate?: number | null
          expense_ratio?: number | null
          cash_balance?: number | null
          issues: string[]
          policy_recommendation: string[]
          reference_data_ids: string[]
          created_at?: string
        }
        Update: {
          id?: string
          analysis_date?: string
          evaluation_summary?: string
          gross_profit_rate?: number | null
          net_profit_rate?: number | null
          expense_ratio?: number | null
          cash_balance?: number | null
          issues?: string[]
          policy_recommendation?: string[]
          reference_data_ids?: string[]
          created_at?: string
        }
      }
      money_cloud_sync_logs: {
        Row: {
          id: string
          sync_type: string
          sync_status: string
          synced_records_count: number
          error_message: string | null
          sync_started_at: string | null
          sync_completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sync_type: string
          sync_status: string
          synced_records_count?: number
          error_message?: string | null
          sync_started_at?: string | null
          sync_completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sync_type?: string
          sync_status?: string
          synced_records_count?: number
          error_message?: string | null
          sync_started_at?: string | null
          sync_completed_at?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
