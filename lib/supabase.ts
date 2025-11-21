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
      inquiry_knowledge_base: {
        Row: {
          id: string
          inquiry_id: string
          ai_category: string
          customer_message_raw: string
          final_response_text: string
          response_template_used: string | null
          response_score: number
          order_id: string | null
          response_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          ai_category: string
          customer_message_raw: string
          final_response_text: string
          response_template_used?: string | null
          response_score?: number
          order_id?: string | null
          response_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          ai_category?: string
          customer_message_raw?: string
          final_response_text?: string
          response_template_used?: string | null
          response_score?: number
          order_id?: string | null
          response_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inquiries: {
        Row: {
          id: string
          inquiry_id: string
          order_id: string | null
          customer_name: string | null
          customer_message_raw: string
          level0_choice: string | null
          ai_category: string | null
          ai_draft_text: string | null
          final_response_text: string | null
          status: string
          tracking_number: string | null
          shipping_status: string | null
          response_score: number
          response_date: string | null
          received_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          order_id?: string | null
          customer_name?: string | null
          customer_message_raw: string
          level0_choice?: string | null
          ai_category?: string | null
          ai_draft_text?: string | null
          final_response_text?: string | null
          status?: string
          tracking_number?: string | null
          shipping_status?: string | null
          response_score?: number
          response_date?: string | null
          received_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          order_id?: string | null
          customer_name?: string | null
          customer_message_raw?: string
          level0_choice?: string | null
          ai_category?: string | null
          ai_draft_text?: string | null
          final_response_text?: string | null
          status?: string
          tracking_number?: string | null
          shipping_status?: string | null
          response_score?: number
          response_date?: string | null
          received_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      inquiry_templates: {
        Row: {
          id: string
          template_id: string
          ai_category: string
          template_name: string
          template_content: string
          variables: any
          usage_count: number
          average_score: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          ai_category: string
          template_name: string
          template_content: string
          variables?: any
          usage_count?: number
          average_score?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          ai_category?: string
          template_name?: string
          template_content?: string
          variables?: any
          usage_count?: number
          average_score?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      inquiry_kpi: {
        Row: {
          id: string
          staff_id: string | null
          inquiry_id: string | null
          response_time_seconds: number | null
          ai_draft_used: boolean
          manual_edit_count: number
          customer_satisfaction_score: number | null
          resolved_on_first_contact: boolean
          created_at: string
        }
        Insert: {
          id?: string
          staff_id?: string | null
          inquiry_id?: string | null
          response_time_seconds?: number | null
          ai_draft_used?: boolean
          manual_edit_count?: number
          customer_satisfaction_score?: number | null
          resolved_on_first_contact?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          staff_id?: string | null
          inquiry_id?: string | null
          response_time_seconds?: number | null
          ai_draft_used?: boolean
          manual_edit_count?: number
          customer_satisfaction_score?: number | null
          resolved_on_first_contact?: boolean
          created_at?: string
        }
      }
      inquiry_filter_bot_log: {
        Row: {
          id: string
          inquiry_id: string
          customer_message: string
          bot_question_sent: string
          customer_choice: string | null
          choice_timestamp: string | null
          next_action: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          customer_message: string
          bot_question_sent: string
          customer_choice?: string | null
          choice_timestamp?: string | null
          next_action?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          customer_message?: string
          bot_question_sent?: string
          customer_choice?: string | null
          choice_timestamp?: string | null
          next_action?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
