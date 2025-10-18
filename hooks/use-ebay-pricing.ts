'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type {
  HSCode,
  EbayCategoryFee,
  ShippingPolicy,
  ShippingZone,
  ProfitMarginSetting,
  ExchangeRate,
  OriginCountry,
} from '@/lib/supabase/client'

// 🆕 eBay USA配送ポリシー型
export interface EbayUsaShippingPolicy {
  id: number
  policy_name: string
  weight_from_kg: number
  weight_to_kg: number
  usa_ddp_base_rate_usd: number
  usa_ddp_duty_usd: number
  usa_ddp_tax_usd: number
  usa_ddp_total_usd: number
  usa_additional_item_usd: number
  rate_table_name: string
  ddp_type_code: string
  ebay_policy_id: string | null
  ebay_policy_status: string
}

// HSコードデータベースフック
export function useHSCodes() {
  const [hsCodes, setHSCodes] = useState<HSCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHSCodes()
  }, [])

  const fetchHSCodes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('hs_codes')
        .select('*')
        .order('code')

      if (error) throw error
      setHSCodes(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getHSCode = (code: string) => {
    return hsCodes.find(hs => hs.code === code)
  }

  return { hsCodes, loading, error, refresh: fetchHSCodes, getHSCode }
}

// eBayカテゴリ手数料フック
export function useEbayCategoryFees() {
  const [categoryFees, setCategoryFees] = useState<Record<string, EbayCategoryFee>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategoryFees()
  }, [])

  const fetchCategoryFees = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ebay_pricing_category_fees')
        .select('*')
        .eq('active', true)

      if (error) throw error

      // category_keyをキーとするオブジェクトに変換
      const feesMap = (data || []).reduce((acc, fee) => {
        acc[fee.category_key] = fee
        return acc
      }, {} as Record<string, EbayCategoryFee>)

      setCategoryFees(feesMap)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryFee = (categoryKey: string) => {
    return categoryFees[categoryKey] || categoryFees['Default']
  }

  return { categoryFees, loading, error, refresh: fetchCategoryFees, getCategoryFee }
}

// 配送ポリシーフック
export function useShippingPolicies() {
  const [policies, setPolicies] = useState<ShippingPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      
      // ポリシーとゾーンを結合して取得
      const { data: policiesData, error: policiesError } = await supabase
        .from('ebay_shipping_policies')
        .select('*')
        .eq('active', true)
        .order('weight_min')

      if (policiesError) throw policiesError

      // 各ポリシーのゾーン情報を取得
      const policiesWithZones = await Promise.all(
        (policiesData || []).map(async (policy) => {
          const { data: zonesData, error: zonesError } = await supabase
            .from('ebay_shipping_zones')
            .select('*')
            .eq('policy_id', policy.id)

          if (zonesError) throw zonesError

          return {
            ...policy,
            zones: zonesData || [],
          }
        })
      )

      setPolicies(policiesWithZones)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectOptimalPolicy = (weight: number, estimatedPrice: number) => {
    for (const policy of policies) {
      if (
        weight >= policy.weight_min &&
        weight <= policy.weight_max &&
        estimatedPrice >= policy.price_min &&
        estimatedPrice <= policy.price_max
      ) {
        return policy
      }
    }
    return policies[policies.length - 1] // 最後のポリシーをデフォルトに
  }

  return { policies, loading, error, refresh: fetchPolicies, selectOptimalPolicy }
}

// 🆕 eBay USA配送ポリシーフック（新規）
export function useEbayUsaShippingPolicies() {
  const [usaPolicies, setUsaPolicies] = useState<EbayUsaShippingPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsaPolicies()
  }, [])

  const fetchUsaPolicies = async () => {
    try {
      setLoading(true)
      
      const { data, error: fetchError } = await supabase
        .from('ebay_shipping_policies')
        .select(`
          id,
          policy_name,
          weight_from_kg,
          weight_to_kg,
          usa_ddp_base_rate_usd,
          usa_ddp_duty_usd,
          usa_ddp_tax_usd,
          usa_ddp_total_usd,
          usa_additional_item_usd,
          rate_table_name,
          ddp_type_code,
          ebay_policy_id,
          ebay_policy_status
        `)
        .order('weight_from_kg', { ascending: true })

      if (fetchError) throw fetchError

      setUsaPolicies(data || [])
    } catch (err: any) {
      console.error('USA配送ポリシー取得エラー:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 重量から最適なポリシーを選択
  const selectUsaPolicy = (weight_kg: number): EbayUsaShippingPolicy | null => {
    const policy = usaPolicies.find(p => 
      weight_kg >= p.weight_from_kg && weight_kg <= p.weight_to_kg
    )
    return policy || null
  }

  // 複数アイテムの送料計算
  const calculateMultiItemShipping = (items: Array<{ weight_kg: number; quantity: number }>) => {
    if (items.length === 0) return null

    const firstItem = items[0]
    const firstPolicy = selectUsaPolicy(firstItem.weight_kg)
    
    if (!firstPolicy) return null

    let totalShipping = firstPolicy.usa_ddp_total_usd
    let additionalShipping = 0

    // 最初のアイテムの追加数量
    if (firstItem.quantity > 1) {
      additionalShipping += firstPolicy.usa_additional_item_usd * (firstItem.quantity - 1)
    }

    // 他のアイテム
    for (let i = 1; i < items.length; i++) {
      const item = items[i]
      const policy = selectUsaPolicy(item.weight_kg)
      if (policy) {
        additionalShipping += policy.usa_additional_item_usd * item.quantity
      }
    }

    return {
      first_item_shipping: firstPolicy.usa_ddp_total_usd,
      additional_shipping: additionalShipping,
      total_shipping: totalShipping + additionalShipping,
      policy: firstPolicy
    }
  }

  return { 
    usaPolicies, 
    loading, 
    error, 
    refresh: fetchUsaPolicies, 
    selectUsaPolicy,
    calculateMultiItemShipping
  }
}

// 利益率設定フック
export function useProfitMargins() {
  const [margins, setMargins] = useState<{
    default: ProfitMarginSetting
    category: Record<string, ProfitMarginSetting>
    country: Record<string, ProfitMarginSetting>
    condition: Record<string, ProfitMarginSetting>
  }>({
    default: {
      default_margin: 0.15,
      min_margin: 0.10,
      max_margin: 0.40,
    },
    category: {},
    country: {},
    condition: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMargins()
  }, [])

  const fetchMargins = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profit_margin_settings')
        .select('*')
        .eq('active', true)

      if (error) throw error

      const marginsData = {
        default: {
          default_margin: 0.15,
          min_margin: 0.10,
          max_margin: 0.40,
        },
        category: {} as Record<string, ProfitMarginSetting>,
        country: {} as Record<string, ProfitMarginSetting>,
        condition: {} as Record<string, ProfitMarginSetting>,
      }

      ;(data || []).forEach((setting) => {
        const marginSetting = {
          default_margin: setting.default_margin / 100,
          min_margin: setting.min_margin / 100,
          max_margin: setting.max_margin / 100,
        }

        if (setting.setting_type === 'default') {
          marginsData.default = marginSetting
        } else if (setting.setting_type === 'category' && setting.category_key) {
          marginsData.category[setting.category_key] = marginSetting
        } else if (setting.setting_type === 'country' && setting.country_code) {
          marginsData.country[setting.country_code] = marginSetting
        } else if (setting.setting_type === 'condition' && setting.condition_key) {
          marginsData.condition[setting.condition_key] = marginSetting
        }
      })

      setMargins(marginsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getMarginSetting = (
    category?: string,
    country?: string,
    condition?: string
  ): ProfitMarginSetting => {
    if (category && margins.category[category]) {
      return margins.category[category]
    }
    if (country && margins.country[country]) {
      return margins.country[country]
    }
    if (condition && margins.condition[condition]) {
      return margins.condition[condition]
    }
    return margins.default
  }

  return { margins, loading, error, refresh: fetchMargins, getMarginSetting }
}

// 為替レートフック
export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState<{
    spot: number
    buffer: number
    safe: number
  }>({
    spot: 154.0,
    buffer: 0.03,
    safe: 158.62,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLatestRate()
  }, [])

  const fetchLatestRate = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('latest_exchange_rate')
        .select('*')
        .single()

      if (error) throw error

      if (data) {
        setExchangeRate({
          spot: data.spot_rate,
          buffer: data.buffer_percent / 100,
          safe: data.safe_rate,
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { exchangeRate, loading, error, refresh: fetchLatestRate }
}

// 原産国フック
export function useOriginCountries() {
  const [countries, setCountries] = useState<OriginCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCountries()
  }, [])

  const fetchCountries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('origin_countries')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setCountries(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { countries, loading, error, refresh: fetchCountries }
}
