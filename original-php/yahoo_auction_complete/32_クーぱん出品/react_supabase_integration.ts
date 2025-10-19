// ========================================
// src/lib/supabase.ts
// Supabase クライアント設定
// ========================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ========================================
// src/types/database.ts
// TypeScript 型定義
// ========================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          phone: string | null
          default_profit_margin: number
          auto_sync_enabled: boolean
          amazon_api_credentials: any | null
          coupang_api_credentials: any | null
          shipping_settings: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          phone?: string | null
          default_profit_margin?: number
          auto_sync_enabled?: boolean
          amazon_api_credentials?: any | null
          coupang_api_credentials?: any | null
          shipping_settings?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          phone?: string | null
          default_profit_margin?: number
          auto_sync_enabled?: boolean
          amazon_api_credentials?: any | null
          coupang_api_credentials?: any | null
          shipping_settings?: any
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          amazon_asin: string
          amazon_price: number | null
          amazon_stock_status: string
          amazon_category: string | null
          amazon_rank: number | null
          amazon_data: any | null
          coupang_product_id: string | null
          coupang_listing_status: string
          coupang_category_id: string | null
          coupang_data: any | null
          product_name: string
          product_name_kr: string | null
          brand: string | null
          description: string | null
          description_kr: string | null
          cost_price: number | null
          selling_price_krw: number | null
          profit_margin: number
          weight_kg: number
          dimensions: any | null
          shipping_cost_usd: number | null
          images: any | null
          is_active: boolean
          auto_sync: boolean
          sync_frequency: number
          tags: string[] | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amazon_asin: string
          amazon_price?: number | null
          amazon_stock_status?: string
          amazon_category?: string | null
          amazon_rank?: number | null
          amazon_data?: any | null
          coupang_product_id?: string | null
          coupang_listing_status?: string
          coupang_category_id?: string | null
          coupang_data?: any | null
          product_name: string
          product_name_kr?: string | null
          brand?: string | null
          description?: string | null
          description_kr?: string | null
          cost_price?: number | null
          selling_price_krw?: number | null
          profit_margin?: number
          weight_kg?: number
          dimensions?: any | null
          shipping_cost_usd?: number | null
          images?: any | null
          is_active?: boolean
          auto_sync?: boolean
          sync_frequency?: number
          tags?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amazon_asin?: string
          amazon_price?: number | null
          amazon_stock_status?: string
          amazon_category?: string | null
          amazon_rank?: number | null
          amazon_data?: any | null
          coupang_product_id?: string | null
          coupang_listing_status?: string
          coupang_category_id?: string | null
          coupang_data?: any | null
          product_name?: string
          product_name_kr?: string | null
          brand?: string | null
          description?: string | null
          description_kr?: string | null
          cost_price?: number | null
          selling_price_krw?: number | null
          profit_margin?: number
          weight_kg?: number
          dimensions?: any | null
          shipping_cost_usd?: number | null
          images?: any | null
          is_active?: boolean
          auto_sync?: boolean
          sync_frequency?: number
          tags?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          coupang_order_id: string
          coupang_order_item_id: string | null
          amazon_order_id: string | null
          amazon_order_item_id: string | null
          amazon_tracking_number: string | null
          product_name: string
          quantity: number
          unit_price_krw: number
          total_amount_krw: number
          customer_info: any
          shipping_address: any
          shipping_method: string
          shipping_cost_usd: number | null
          tracking_number: string | null
          order_status: string
          fulfillment_method: string
          coupang_order_date: string
          amazon_order_date: string | null
          shipped_date: string | null
          delivered_date: string | null
          completed_date: string | null
          cost_usd: number | null
          shipping_cost_krw: number | null
          coupang_fee_krw: number | null
          profit_krw: number | null
          notes: string | null
          issues: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          coupang_order_id: string
          coupang_order_item_id?: string | null
          amazon_order_id?: string | null
          amazon_order_item_id?: string | null
          amazon_tracking_number?: string | null
          product_name: string
          quantity?: number
          unit_price_krw: number
          total_amount_krw: number
          customer_info: any
          shipping_address: any
          shipping_method?: string
          shipping_cost_usd?: number | null
          tracking_number?: string | null
          order_status?: string
          fulfillment_method?: string
          coupang_order_date: string
          amazon_order_date?: string | null
          shipped_date?: string | null
          delivered_date?: string | null
          completed_date?: string | null
          cost_usd?: number | null
          shipping_cost_krw?: number | null
          coupang_fee_krw?: number | null
          profit_krw?: number | null
          notes?: string | null
          issues?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          coupang_order_id?: string
          coupang_order_item_id?: string | null
          amazon_order_id?: string | null
          amazon_order_item_id?: string | null
          amazon_tracking_number?: string | null
          product_name?: string
          quantity?: number
          unit_price_krw?: number
          total_amount_krw?: number
          customer_info?: any
          shipping_address?: any
          shipping_method?: string
          shipping_cost_usd?: number | null
          tracking_number?: string | null
          order_status?: string
          fulfillment_method?: string
          coupang_order_date?: string
          amazon_order_date?: string | null
          shipped_date?: string | null
          delivered_date?: string | null
          completed_date?: string | null
          cost_usd?: number | null
          shipping_cost_krw?: number | null
          coupang_fee_krw?: number | null
          profit_krw?: number | null
          notes?: string | null
          issues?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      price_history: {
        Row: {
          id: string
          product_id: string
          amazon_price: number | null
          selling_price_krw: number | null
          exchange_rate: number | null
          profit_margin: number | null
          shipping_cost_usd: number | null
          change_reason: string | null
          change_details: any | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          amazon_price?: number | null
          selling_price_krw?: number | null
          exchange_rate?: number | null
          profit_margin?: number | null
          shipping_cost_usd?: number | null
          change_reason?: string | null
          change_details?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          amazon_price?: number | null
          selling_price_krw?: number | null
          exchange_rate?: number | null
          profit_margin?: number | null
          shipping_cost_usd?: number | null
          change_reason?: string | null
          change_details?: any | null
          created_at?: string
        }
      }
      sync_logs: {
        Row: {
          id: string
          user_id: string | null
          sync_type: string
          status: string
          target_id: string | null
          target_type: string | null
          processed_count: number
          success_count: number
          error_count: number
          details: any | null
          error_message: string | null
          started_at: string
          completed_at: string | null
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          sync_type: string
          status: string
          target_id?: string | null
          target_type?: string | null
          processed_count?: number
          success_count?: number
          error_count?: number
          details?: any | null
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          sync_type?: string
          status?: string
          target_id?: string | null
          target_type?: string | null
          processed_count?: number
          success_count?: number
          error_count?: number
          details?: any | null
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
      }
      coupang_categories: {
        Row: {
          id: string
          name_kr: string
          name_en: string | null
          parent_id: string | null
          level: number
          commission_rate: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name_kr: string
          name_en?: string | null
          parent_id?: string | null
          level?: number
          commission_rate?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name_kr?: string
          name_en?: string | null
          parent_id?: string | null
          level?: number
          commission_rate?: number | null
          is_active?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_stats: {
        Args: {
          user_uuid: string
        }
        Returns: Json
      }
      calculate_selling_price: {
        Args: {
          amazon_price_usd: number
          exchange_rate?: number
          profit_margin_percent?: number
          shipping_cost_usd?: number
          coupang_fee_rate?: number
          vat_rate?: number
        }
        Returns: Json
      }
      check_api_rate_limit: {
        Args: {
          user_uuid: string
          api_name_param: string
          calls_limit_param?: number
          window_minutes?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type PriceHistory = Database['public']['Tables']['price_history']['Row']
export type SyncLog = Database['public']['Tables']['sync_logs']['Row']
export type CoupangCategory = Database['public']['Tables']['coupang_categories']['Row']

// ========================================
// src/hooks/useAuth.ts
// 認証フック
// ========================================

import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 現在のセッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // セッション変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }
}

// ========================================
// src/hooks/useProducts.ts
// 商品データフック
// ========================================

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import { Product } from '../types/database'

export function useProducts() {
  const queryClient = useQueryClient()

  const {
    data: products = [],
    isLoading,
    error,
    refetch
  } = useQuery<Product[]>('products', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  })

  // 商品追加
  const addProductMutation = useMutation(
    async (productData: Database['public']['Tables']['products']['Insert']) => {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products')
      },
    }
  )

  // 商品更新
  const updateProductMutation = useMutation(
    async ({ id, updates }: { id: string; updates: Database['public']['Tables']['products']['Update'] }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products')
      },
    }
  )

  // 商品削除
  const deleteProductMutation = useMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products')
      },
    }
  )

  // 価格同期
  const syncPriceMutation = useMutation(
    async (productId: string) => {
      const { data, error } = await supabase.functions.invoke('amazon-product-sync', {
        body: {
          productIds: [productId],
          action: 'sync_price'
        }
      })

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products')
      },
    }
  )

  // Coupang出品
  const listToCoupangMutation = useMutation(
    async ({ productId, listingData }: { 
      productId: string; 
      listingData: {
        productNameKr: string;
        categoryId: string;
        description?: string;
        sellingPrice?: number;
      }
    }) => {
      const { data, error } = await supabase.functions.invoke('coupang-listing', {
        body: {
          productId,
          action: 'list',
          listingData
        }
      })

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products')
      },
    }
  )

  return {
    products,
    isLoading,
    error,
    refetch,
    addProduct: addProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    syncPrice: syncPriceMutation.mutate,
    listToCoupang: listToCoupangMutation.mutate,
    isAddingProduct: addProductMutation.isLoading,
    isUpdatingProduct: updateProductMutation.isLoading,
    isDeletingProduct: deleteProductMutation.isLoading,
    isSyncingPrice: syncPriceMutation.isLoading,
    isListingToCoupang: listToCoupangMutation.isLoading,
  }
}

// ========================================
// src/hooks/useOrders.ts
// 注文データフック
// ========================================

import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import { Order } from '../types/database'

export function useOrders() {
  const queryClient = useQueryClient()

  const {
    data: orders = [],
    isLoading,
    error,
    refetch
  } = useQuery<Order[]>('orders', async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        products (
          product_name,
          amazon_asin,
          brand
        )
      `)
      .order('coupang_order_date', { ascending: false })

    if (error) throw error
    return data
  })

  // 新규주문 처리
  const processNewOrdersMutation = useMutation(
    async () => {
      const { data, error } = await supabase.functions.invoke('order-processing', {
        body: {
          action: 'process_new_orders'
        }
      })

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('orders')
      },
    }
  )

  // 주문 이행
  const fulfillOrderMutation = useMutation(
    async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('order-processing', {
        body: {
          action: 'fulfill_order',
          orderId
        }
      })

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('orders')
      },
    }
  )

  // 추적정보 업데이트
  const updateTrackingMutation = useMutation(
    async ({ orderId, trackingInfo }: { 
      orderId: string; 
      trackingInfo: { trackingNumber: string; carrier: string } 
    }) => {
      const { data, error } = await supabase.functions.invoke('order-processing', {
        body: {
          action: 'update_tracking',
          orderId,
          trackingInfo
        }
      })

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('orders')
      },
    }
  )

  return {
    orders,
    isLoading,
    error,
    refetch,
    processNewOrders: processNewOrdersMutation.mutate,
    fulfillOrder: fulfillOrderMutation.mutate,
    updateTracking: updateTrackingMutation.mutate,
    isProcessingNewOrders: processNewOrdersMutation.isLoading,
    isFulfillingOrder: fulfillOrderMutation.isLoading,
    isUpdatingTracking: updateTrackingMutation.isLoading,
  }
}

// ========================================
// src/hooks/useDashboard.ts
// ダッシュボードデータフック
// ========================================

import { useQuery } from 'react-query'
import { supabase } from '../lib/supabase'

interface DashboardStats {
  total_products: number
  active_listings: number
  monthly_orders: number
  monthly_revenue_krw: number
  monthly_profit_krw: number
  avg_profit_margin: number
  pending_orders: number
}

export function useDashboard() {
  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useQuery<DashboardStats>('dashboard-stats', async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      user_uuid: user.id
    })

    if (error) throw error
    return data
  }, {
    refetchInterval: 5 * 60 * 1000, // 5분마다 새로고침
  })

  return {
    stats,
    isLoading,
    error,
    refetch,
  }
}

// ========================================
// src/hooks/usePricing.ts
// 価格計算フック
// ========================================

import { useMutation } from 'react-query'
import { supabase } from '../lib/supabase'

interface PricingParams {
  amazonPriceUsd: number
  exchangeRate?: number
  profitMarginPercent?: number
  shippingCostUsd?: number
  coupangFeeRate?: number
  vatRate?: number
}

interface PricingResult {
  base_price_krw: number
  shipping_cost_krw: number
  subtotal_krw: number
  final_price_krw: number
  profit_krw: number
  profit_margin_percent: number
  coupang_fee_krw: number
  exchange_rate_used: number
}

export function usePricing() {
  const calculatePriceMutation = useMutation(
    async (params: PricingParams): Promise<PricingResult> => {
      const { data, error } = await supabase.rpc('calculate_selling_price', {
        amazon_price_usd: params.amazonPriceUsd,
        exchange_rate: params.exchangeRate,
        profit_margin_percent: params.profitMarginPercent,
        shipping_cost_usd: params.shippingCostUsd,
        coupang_fee_rate: params.coupangFeeRate,
        vat_rate: params.vatRate,
      })

      if (error) throw error
      return data
    }
  )

  return {
    calculatePrice: calculatePriceMutation.mutate,
    calculatePriceAsync: calculatePriceMutation.mutateAsync,
    isCalculating: calculatePriceMutation.isLoading,
    calculationResult: calculatePriceMutation.data,
    calculationError: calculatePriceMutation.error,
  }
}

// ========================================
// src/hooks/useCategories.ts
// Coupangカテゴリフック
// ========================================

import { useQuery } from 'react-query'
import { supabase } from '../lib/supabase'
import { CoupangCategory } from '../types/database'

export function useCategories() {
  const {
    data: categories = [],
    isLoading,
    error
  } = useQuery<CoupangCategory[]>('coupang-categories', async () => {
    const { data, error } = await supabase
      .from('coupang_categories')
      .select('*')
      .eq('is_active', true)
      .order('name_kr')

    if (error) throw error
    return data
  })

  return {
    categories,
    isLoading,
    error,
  }
}

// ========================================
// src/hooks/useRealtime.ts
// リアルタイム更新フック
// ========================================

import { useEffect } from 'react'
import { useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'

export function useRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // 商品 테이블 변경 감지
    const productsSubscription = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Products changed:', payload)
          queryClient.invalidateQueries('products')
          queryClient.invalidateQueries('dashboard-stats')
        }
      )
      .subscribe()

    // 주문 테이블 변경 감지
    const ordersSubscription = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Orders changed:', payload)
          queryClient.invalidateQueries('orders')
          queryClient.invalidateQueries('dashboard-stats')
        }
      )
      .subscribe()

    return () => {
      productsSubscription.unsubscribe()
      ordersSubscription.unsubscribe()
    }
  }, [queryClient])
}

// ========================================
// src/components/AuthGuard.tsx
// 認証ガードコンポーネント
// ========================================

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner, Center } from '@chakra-ui/react'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ========================================
// src/components/LoginForm.tsx
// ログインフォームコンポーネント
// ========================================

import React, { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Link,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      navigate('/')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await signUp(email, password, fullName)
      if (error) throw error
      setMessage('確認메일을 확인해주세요!')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('이메일을 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await resetPassword(email)
      if (error) throw error
      setMessage('비밀번호 재설정 이메일을 발송했습니다')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
      <Text fontSize="2xl" fontWeight="bold" textAlign="center" mb={6}>
        Amazon-Coupang 판매 시스템
      </Text>

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {message && (
        <Alert status="success" mb={4}>
          <AlertIcon />
          {message}
        </Alert>
      )}

      <Tabs>
        <TabList>
          <Tab>로그인</Tab>
          <Tab>회원가입</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <form onSubmit={handleSignIn}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>이메일</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>비밀번호</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  width="100%"
                  isLoading={loading}
                >
                  로그인
                </Button>

                <Link color="blue.500" onClick={handleResetPassword}>
                  비밀번호를 잊으셨나요?
                </Link>
              </VStack>
            </form>
          </TabPanel>

          <TabPanel>
            <form onSubmit={handleSignUp}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>이름</FormLabel>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>이메일</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>비밀번호</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="green"
                  size="lg"
                  width="100%"
                  isLoading={loading}
                >
                  회원가입
                </Button>
              </VStack>
            </form>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}