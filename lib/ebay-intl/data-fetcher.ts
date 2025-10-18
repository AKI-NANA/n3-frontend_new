// lib/ebay-intl/data-fetcher.ts

import { createClient } from '@supabase/supabase-js'

// =====================================================
// 型定義
// =====================================================

export interface CalculationInput {
  productId: string
  costJPY: number
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  hsCode: string
  categoryId: number
  condition: 'New' | 'Used' | 'Refurbished'
  originCountry?: string
  targetCountries?: string[]
}

export interface ShippingInfo {
  country: string
  countryName: string
  zoneId: number
  baseRateJPY: number
  fuelSurchargeRate: number
  demandSurchargeRate: number
  totalSurchargeRate: number
  totalJPY: number
  totalUSD: number
  serviceName: string
  carrier: string
}

export interface TariffInfo {
  country: string
  tariffRate: number
  vatRate: number
  threshold: number
  minTariff?: number
  maxTariff?: number
  tariffCount?: number
}

export interface CategoryFeeInfo {
  categoryId: number
  feeTierGroup: string
  tier1Rate: number
  tier1Threshold: number
  tier2Rate: number
  perOrderFee: number
}

export interface ExchangeRateInfo {
  rate: number
  safetyMargin: number
  calculatedRate: number
  recordedAt: string
}

export interface GatheredData {
  exchangeRate: ExchangeRateInfo
  categoryFee: CategoryFeeInfo
  shippingData: ShippingInfo[]
  tariffData: TariffInfo[]
  profitSettings: {
    margin: number
    minimumProfit: number
  }
  sizeCategory: 'small' | 'medium' | 'large'
  costUSD: number
}

// =====================================================
// メイン関数: 全データ取得
// =====================================================

export async function gatherAllData(
  input: CalculationInput
): Promise<GatheredData> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const originCountry = input.originCountry || 'JP'
  const targetCountries = input.targetCountries || [
    'US', 'CA', 'UK', 'AU', 'JP', 'DE', 'FR'
  ]

  const [
    exchangeRate,
    categoryFee,
    shippingData,
    tariffData,
    profitSettings
  ] = await Promise.all([
    getExchangeRate(supabase),
    getCategoryFee(supabase, input.categoryId),
    getAllShippingRates(supabase, input, targetCountries),
    getAllTariffRates(supabase, input.hsCode, originCountry, targetCountries),
    getProfitSettings(supabase, input.categoryId, input.condition)
  ])

  const sizeCategory = determineSizeCategory(
    input.lengthCm,
    input.widthCm,
    input.heightCm,
    input.weightKg
  )

  const costUSD = input.costJPY / exchangeRate.calculatedRate

  return {
    exchangeRate,
    categoryFee,
    shippingData: shippingData.filter(Boolean),
    tariffData: tariffData.filter(Boolean),
    profitSettings,
    sizeCategory,
    costUSD
  }
}

// =====================================================
// 1. 為替レート取得
// =====================================================

async function getExchangeRate(supabase: any): Promise<ExchangeRateInfo> {
  const { data, error } = await supabase
    .from('ebay_exchange_rates')
    .select('rate, safety_margin, calculated_rate, recorded_at')
    .eq('currency_from', 'JPY')
    .eq('currency_to', 'USD')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return {
      rate: 148.5,
      safetyMargin: 5.0,
      calculatedRate: 155.93,
      recordedAt: new Date().toISOString()
    }
  }

  return {
    rate: data.rate,
    safetyMargin: data.safety_margin,
    calculatedRate: data.calculated_rate,
    recordedAt: data.recorded_at
  }
}

// =====================================================
// 2. カテゴリ手数料取得（tier構造対応）
// =====================================================

async function getCategoryFee(
  supabase: any,
  categoryId: number
): Promise<CategoryFeeInfo> {
  const { data, error } = await supabase
    .from('ebay_categories_cache')
    .select(`
      category_id,
      fee_tier_group,
      fee_tier_structures!inner(
        tier1_rate,
        tier1_threshold,
        tier2_rate,
        per_order_fee
      )
    `)
    .eq('category_id', categoryId)
    .single()

  if (error || !data) {
    return {
      categoryId,
      feeTierGroup: 'standard',
      tier1Rate: 0.129,
      tier1Threshold: 7500,
      tier2Rate: 0.0235,
      perOrderFee: 0.30
    }
  }

  return {
    categoryId: data.category_id,
    feeTierGroup: data.fee_tier_group,
    tier1Rate: data.fee_tier_structures.tier1_rate,
    tier1Threshold: data.fee_tier_structures.tier1_threshold,
    tier2Rate: data.fee_tier_structures.tier2_rate,
    perOrderFee: data.fee_tier_structures.per_order_fee
  }
}

// =====================================================
// 3. C-PASS送料取得
// =====================================================

async function getAllShippingRates(
  supabase: any,
  input: CalculationInput,
  targetCountries: string[]
): Promise<ShippingInfo[]> {
  const sizeCategory = determineSizeCategory(
    input.lengthCm,
    input.widthCm,
    input.heightCm,
    input.weightKg
  )

  const exchangeRate = await getExchangeRate(supabase)

  const results = await Promise.all(
    targetCountries.map(country => 
      getShippingRateForCountry(
        supabase,
        country,
        input.weightKg,
        sizeCategory,
        exchangeRate.calculatedRate
      )
    )
  )

  return results.filter(Boolean) as ShippingInfo[]
}

async function getShippingRateForCountry(
  supabase: any,
  countryCode: string,
  weightKg: number,
  sizeCategory: string,
  exchangeRate: number
): Promise<ShippingInfo | null> {
  try {
    const { data: countryData } = await supabase
      .from('cpass_countries')
      .select('zone_id, country_name')
      .eq('country_code', countryCode)
      .single()

    if (!countryData) return null

    const { data: rateData } = await supabase
      .from('cpass_rates')
      .select(`
        rate_jpy,
        service_id,
        cpass_services!inner(
          service_name,
          carrier
        )
      `)
      .eq('zone_id', countryData.zone_id)
      .eq('size_category', sizeCategory)
      .lte('weight_from', weightKg)
      .gte('weight_to', weightKg)
      .order('rate_jpy', { ascending: true })
      .limit(1)
      .single()

    if (!rateData) return null

    const { data: surcharges } = await supabase
      .from('cpass_surcharges')
      .select(`
        rate_percent,
        cpass_surcharge_types!inner(type_name)
      `)
      .eq('zone_id', countryData.zone_id)
      .lte('effective_date', new Date().toISOString())

    const fuelRate = surcharges?.find(
      s => s.cpass_surcharge_types.type_name === 'fuel'
    )?.rate_percent || 0

    const demandRate = surcharges?.find(
      s => s.cpass_surcharge_types.type_name === 'demand'
    )?.rate_percent || 0

    const totalSurchargeRate = fuelRate + demandRate
    const totalJPY = rateData.rate_jpy * (1 + totalSurchargeRate / 100)
    const totalUSD = totalJPY / exchangeRate

    return {
      country: countryCode,
      countryName: countryData.country_name,
      zoneId: countryData.zone_id,
      baseRateJPY: rateData.rate_jpy,
      fuelSurchargeRate: fuelRate,
      demandSurchargeRate: demandRate,
      totalSurchargeRate,
      totalJPY,
      totalUSD,
      serviceName: rateData.cpass_services.service_name,
      carrier: rateData.cpass_services.carrier
    }
  } catch (error) {
    console.error(`送料取得エラー [${countryCode}]:`, error)
    return null
  }
}

// =====================================================
// 4. 関税率取得
// =====================================================

async function getAllTariffRates(
  supabase: any,
  hsCode: string,
  originCountry: string,
  targetCountries: string[]
): Promise<TariffInfo[]> {
  const results = await Promise.all(
    targetCountries.map(country =>
      getTariffRateForCountry(supabase, hsCode, originCountry, country)
    )
  )

  return results.filter(Boolean) as TariffInfo[]
}

async function getTariffRateForCountry(
  supabase: any,
  hsCode: string,
  originCountry: string,
  destinationCountry: string
): Promise<TariffInfo | null> {
  try {
    const { data: allRates } = await supabase
      .from('customs_duties')
      .select('tariff_rate, vat_rate, tariff_threshold')
      .eq('hs_code', hsCode)
      .eq('destination_country', destinationCountry)
      .eq('origin_country', originCountry)
      .lte('effective_date', new Date().toISOString())
      .order('effective_date', { ascending: false })

    if (!allRates || allRates.length === 0) {
      return getDefaultTariff(destinationCountry)
    }

    const tariffRates = allRates.map(r => r.tariff_rate)
    const minTariff = Math.min(...tariffRates)
    const maxTariff = Math.max(...tariffRates)
    const primaryRate = allRates[0]

    return {
      country: destinationCountry,
      tariffRate: primaryRate.tariff_rate,
      vatRate: primaryRate.vat_rate || 0,
      threshold: primaryRate.tariff_threshold || 0,
      minTariff,
      maxTariff,
      tariffCount: allRates.length
    }
  } catch (error) {
    return getDefaultTariff(destinationCountry)
  }
}

function getDefaultTariff(country: string): TariffInfo {
  const defaults: Record<string, TariffInfo> = {
    US: { country, tariffRate: 0.05, vatRate: 0, threshold: 800, minTariff: 0, maxTariff: 0.10, tariffCount: 1 },
    CA: { country, tariffRate: 0.18, vatRate: 0, threshold: 20, minTariff: 0.15, maxTariff: 0.25, tariffCount: 1 },
    UK: { country, tariffRate: 0.20, vatRate: 0.20, threshold: 135, minTariff: 0.15, maxTariff: 0.25, tariffCount: 1 },
    AU: { country, tariffRate: 0.05, vatRate: 0.10, threshold: 1000, minTariff: 0.05, maxTariff: 0.10, tariffCount: 1 },
    JP: { country, tariffRate: 0, vatRate: 0.10, threshold: 10000, minTariff: 0, maxTariff: 0.05, tariffCount: 1 },
    DE: { country, tariffRate: 0.20, vatRate: 0.19, threshold: 150, minTariff: 0.15, maxTariff: 0.25, tariffCount: 1 },
    FR: { country, tariffRate: 0.20, vatRate: 0.20, threshold: 150, minTariff: 0.15, maxTariff: 0.25, tariffCount: 1 }
  }

  return defaults[country] || {
    country,
    tariffRate: 0.15,
    vatRate: 0,
    threshold: 0,
    minTariff: 0.10,
    maxTariff: 0.30,
    tariffCount: 1
  }
}

// =====================================================
// 5. 利益率設定取得
// =====================================================

async function getProfitSettings(
  supabase: any,
  categoryId: number,
  condition: string
): Promise<{ margin: number; minimumProfit: number }> {
  const { data } = await supabase
    .from('profit_settings')
    .select('profit_margin_target, minimum_profit_amount')
    .or(`
      and(setting_type.eq.category,target_value.eq.${categoryId}),
      and(setting_type.eq.condition,target_value.eq.${condition}),
      and(setting_type.eq.global,target_value.eq.default)
    `)
    .eq('active', true)
    .order('priority_order', { ascending: true })
    .limit(1)
    .single()

  if (!data) {
    return {
      margin: 25.0,
      minimumProfit: 5.0
    }
  }

  return {
    margin: data.profit_margin_target,
    minimumProfit: data.minimum_profit_amount
  }
}

// =====================================================
// サイズカテゴリ判定
// =====================================================

function determineSizeCategory(
  length: number,
  width: number,
  height: number,
  weight: number
): 'small' | 'medium' | 'large' {
  const volume = length * width * height
  const longest = Math.max(length, width, height)

  if (volume <= 60000 && longest <= 60 && weight <= 2) {
    return 'small'
  }

  if (volume <= 120000 && longest <= 100 && weight <= 10) {
    return 'medium'
  }

  return 'large'
}
