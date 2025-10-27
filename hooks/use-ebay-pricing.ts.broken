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
        .from('ebay_category_fees')
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
        .from('shipping_policies')
        .select('*')
        .eq('active', true)
        .order('weight_min')

      if (policiesError) throw policiesError

      // 各ポリシーのゾーン情報を取得
      const policiesWithZones = await Promise.all(
        (policiesData || []).map(async (policy) => {
          const { data: zonesData, error: zonesError } = await supabase
            .from('shipping_zones')
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

// 利益率設定フック
export function useProfitMargins() {
  const [margins, setMargins] = useState<{
    default: ProfitMarginSetting
    condition: Record<string, ProfitMarginSetting>
    country: Record<string, ProfitMarginSetting>
    category: Record<string, ProfitMarginSetting>
  }>({
    default: {
      id: 0,
      setting_type: 'default',
      setting_key: 'default',
      default_margin: 0.3,
      min_margin: 0.2,
      min_amount: 10.0,
      max_margin: 0.5,
      active: true,
    },
    condition: {},
    country: {},
    category: {},
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

      const marginsData = (data || []).reduce((acc, setting) => {
        if (setting.setting_type === 'default') {
          acc.default = setting
        } else if (setting.setting_type === 'condition') {
          acc.condition[setting.setting_key] = setting
        } else if (setting.setting_type === 'country') {
          acc.country[setting.setting_key] = setting
        } else if (setting.setting_type === 'category') {
          acc.category[setting.setting_key] = setting
        }
        return acc
      }, margins)

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

// 計算履歴保存フック
export function useSaveCalculation() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveCalculation = async (calculationData: any) => {
    try {
      setSaving(true)
      setError(null)

      const { data, error } = await supabase
        .from('calculation_history')
        .insert({
          user_id: undefined, // 後でauth実装時に対応
          ...calculationData,
        })
        .select()

      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }

  return { saveCalculation, saving, error }
}

// 計算履歴取得フック
export function useCalculationHistory(limit: number = 50) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [limit])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('calculation_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      setHistory(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { history, loading, error, refresh: fetchHistory }
}
