// lib/shipping/policy-generator.ts
// 配送ポリシー自動生成エンジン - デバッグ強化版

import { createClient } from '@/lib/supabase/client'
import { getCpassRate, calculateDisplayShipping } from './cpass-fedex-reference'

interface PolicyGenerationParams {
  policyName: string
  weightCategory: string
  weightMinKg: number
  weightMaxKg: number
  targetMargin: number
  referenceProductPrice: number
}

interface CountryShippingRate {
  country_code: string
  country_name: string
  zone_code: string
  shipping_cost: number
  handling_fee: number
  service_available: boolean
  calculated_margin: number
}

/**
 * メイン: 配送ポリシー自動生成
 */
export async function generateShippingPolicy(params: PolicyGenerationParams) {
  console.log('🚀 配送ポリシー自動生成開始...')
  console.log('パラメータ:', params)
  
  const supabase = createClient()
  
  try {
    // 1. ポリシーマスター作成
    const { data: policy, error: policyError } = await supabase
      .from('ebay_fulfillment_policies')
      .insert({
        policy_name: params.policyName,
        marketplace_id: 'EBAY_US',
        category_type: 'ALL_EXCLUDING_MOTORS_VEHICLES',
        handling_time_days: 10,
        weight_category: params.weightCategory,
        weight_min_kg: params.weightMinKg,
        weight_max_kg: params.weightMaxKg,
        local_pickup: false,
        freight_shipping: false,
        global_shipping: false,
        is_active: true
      })
      .select()
      .single()
    
    if (policyError) {
      console.error('❌ ポリシー作成エラー:', policyError)
      throw new Error(`ポリシー作成失敗: ${policyError.message}`)
    }
    
    console.log('✅ ポリシーマスター作成完了:', policy.id)
    
    // 2. 国リスト取得（代替方法を直接使用）
    console.log('📍 国リスト取得開始...')
    
    let countries
    try {
      countries = await getCountriesAlternative(supabase)
      console.log('📍 代替方法の結果:', { hasData: !!countries, count: countries?.length || 0 })
    } catch (altError: any) {
      console.error('❌ 代替方法でエラー:', altError)
      throw new Error(`国リスト取得失敗: ${altError.message}`)
    }
    
    if (!countries || countries.length === 0) {
      console.error('❌ 最終結果: 国データが0件です')
      throw new Error('国データが見つかりません。Supabaseのテーブルを確認してください。')
    }
    
    console.log(`📊 対象国数: ${countries.length}カ国`)
    
    // 3. 全国の送料計算と保存
    const result = await processCountries(supabase, policy.id, countries, params)
    
    console.log('✅ 全国設定完了')
    
    return result
    
  } catch (error: any) {
    console.error('❌ エラー:', error)
    throw error
  }
}

/**
 * 代替方法: 個別に取得してマージ
 */
async function getCountriesAlternative(supabase: any) {
  console.log('🔄 代替方法で国リストを取得中...')
  console.log('📊 Supabase client:', { hasClient: !!supabase })
  
  // 1. shipping_country_zones取得
  console.log('  📍 Step 1: shipping_country_zones 取得開始')
  const { data: zoneLinks, error: linksError } = await supabase
    .from('shipping_country_zones')
    .select('zone_id, country_id')
  
  console.log('  📍 Step 1 結果:', { 
    hasData: !!zoneLinks, 
    count: zoneLinks?.length || 0, 
    hasError: !!linksError,
    error: linksError 
  })
  
  if (linksError) {
    console.error('❌ zone links取得エラー:', linksError)
    return []
  }
  
  if (!zoneLinks || zoneLinks.length === 0) {
    console.error('❌ shipping_country_zones が空です')
    return []
  }
  
  console.log(`  - Zone Links: ${zoneLinks.length}件`)
  
  // 2. countries取得
  console.log('  📍 Step 2: countries 取得開始')
  const { data: countries, error: countriesError } = await supabase
    .from('countries')
    .select('id, country_code, country_name')
  
  console.log('  📍 Step 2 結果:', { 
    hasData: !!countries, 
    count: countries?.length || 0, 
    hasError: !!countriesError,
    error: countriesError 
  })
  
  if (countriesError) {
    console.error('❌ countries取得エラー:', countriesError)
    return []
  }
  
  if (!countries || countries.length === 0) {
    console.error('❌ countries が空です')
    return []
  }
  
  console.log(`  - Countries: ${countries.length}カ国`)
  
  // 3. shipping_zones取得
  console.log('  📍 Step 3: shipping_zones 取得開始')
  const { data: zones, error: zonesError } = await supabase
    .from('shipping_zones')
    .select('id, zone_code, zone_name')
  
  console.log('  📍 Step 3 結果:', { 
    hasData: !!zones, 
    count: zones?.length || 0, 
    hasError: !!zonesError,
    error: zonesError 
  })
  
  if (zonesError) {
    console.error('❌ zones取得エラー:', zonesError)
    return []
  }
  
  if (!zones || zones.length === 0) {
    console.error('❌ shipping_zones が空です')
    return []
  }
  
  console.log(`  - Zones: ${zones.length}件`)
  
  // 4. マージ（存在する国のみ）
  const countryMap = new Map(countries.map(c => [c.id, c]))
  const zoneMap = new Map(zones.map(z => [z.id, z]))
  
  console.log('  🔍 マージ前のデバッグ:')
  console.log('    - countryMap size:', countryMap.size)
  console.log('    - zoneMap size:', zoneMap.size)
  
  // フィルタリング: countriesテーブルに存在する国のみ
  const validZoneLinks = zoneLinks.filter(link => countryMap.has(link.country_id))
  console.log('    - 有効なリンク:', validZoneLinks.length, '/', zoneLinks.length)
  
  const merged = validZoneLinks.map(link => {
    const country = countryMap.get(link.country_id)!
    const zone = zoneMap.get(link.zone_id)
    
    if (!zone) {
      console.log('    ⚠️ Zone未発見:', link.zone_id)
      return null
    }
    
    return {
      country_code: country.country_code,
      country_name: country.country_name,
      zone_code: zone.zone_code
    }
  }).filter(Boolean)
  
  console.log(`✅ マージ完了: ${merged.length}カ国`)
  
  return merged
}

/**
 * 国リスト処理
 */
async function processCountries(
  supabase: any,
  policyId: number,
  countries: any[],
  params: PolicyGenerationParams
) {
  const countryRates: CountryShippingRate[] = []
  let processedCount = 0
  
  // 除外国リスト取得
  const { data: excludedCountries } = await supabase
    .from('shipping_excluded_countries')
    .select('country_code')
  
  const excludedCodes = new Set(excludedCountries?.map((c: any) => c.country_code) || [])
  
  console.log(`🚫 除外国数: ${excludedCodes.size}カ国`)
  
  for (const country of countries) {
    processedCount++
    
    if (processedCount % 50 === 0) {
      console.log(`⏳ 進捗: ${processedCount}/${countries.length} (${Math.round(processedCount/countries.length*100)}%)`)
    }
    
    // 除外国チェック
    if (excludedCodes.has(country.country_code)) {
      await supabase
        .from('ebay_country_shipping_settings')
        .upsert({
          policy_id: policyId,
          country_code: country.country_code,
          country_name: country.country_name,
          zone_code: country.zone_code,
          shipping_cost: 0,
          handling_fee: 0,
          is_excluded: true,
          exclusion_reason: '制裁国・APO/FPO',
          calculated_margin: 0
        }, {
          onConflict: 'policy_id,country_code'
        })
      
      continue
    }
    
    // 送料計算
    const rate = await calculateCountryShipping({
      country,
      weightKg: (params.weightMinKg + params.weightMaxKg) / 2,
      productPrice: params.referenceProductPrice,
      targetMargin: params.targetMargin
    })
    
    countryRates.push(rate)
    
    // DB保存
    await supabase
      .from('ebay_country_shipping_settings')
      .upsert({
        policy_id: policyId,
        country_code: country.country_code,
        country_name: country.country_name,
        zone_code: country.zone_code,
        shipping_cost: rate.shipping_cost,
        handling_fee: rate.handling_fee,
        express_available: true,
        standard_available: true,
        economy_available: false,
        is_ddp: country.country_code === 'US',
        calculated_margin: rate.calculated_margin,
        is_excluded: false
      }, {
        onConflict: 'policy_id,country_code'
      })
  }
  
  const avgMargin = countryRates.length > 0
    ? countryRates.reduce((sum, r) => sum + r.calculated_margin, 0) / countryRates.length
    : 0.15
  
  console.log(`\n📊 統計:`)
  console.log(`  - 処理した国: ${countries.length}カ国`)
  console.log(`  - 対応国: ${countryRates.length}カ国`)
  console.log(`  - 除外国: ${countries.length - countryRates.length}カ国`)
  console.log(`  - 平均利益率: ${(avgMargin * 100).toFixed(1)}%`)
  
  return {
    success: true,
    policyId,
    totalCountries: countryRates.length,
    averageMargin: avgMargin
  }
}

/**
 * 国別送料計算
 */
async function calculateCountryShipping(params: {
  country: any
  weightKg: number
  productPrice: number
  targetMargin: number
}): Promise<CountryShippingRate> {
  
  const { country, weightKg, productPrice, targetMargin } = params
  
  // Zone code を正規化（ZONE1 → ZONE_1）
  const normalizedZone = country.zone_code.includes('_') 
    ? country.zone_code 
    : country.zone_code.replace(/^ZONE(\d)$/, 'ZONE_$1')
  
  // CPASS FedEx料金参照
  const cpassRate = getCpassRate(normalizedZone, weightKg)
  
  // 見かけ上の送料（調整係数適用）
  const adjustmentFactor = getZoneAdjustmentFactor(normalizedZone, country.country_code)
  const displayShipping = calculateDisplayShipping(normalizedZone, weightKg, adjustmentFactor)
  
  // Handling Fee計算
  let handlingFee = 5
  
  if (country.country_code === 'US') {
    const estimatedTariff = productPrice * 0.10
    handlingFee = Math.min(Math.max(estimatedTariff * 0.5, 10), 25)
  } else {
    const totalCost = cpassRate + 5
    const targetRevenue = totalCost / (1 - targetMargin)
    const currentRevenue = productPrice + displayShipping
    handlingFee = Math.max(targetRevenue - currentRevenue, 5)
    handlingFee = Math.min(handlingFee, 15)
  }
  
  handlingFee = roundToNatural(handlingFee)
  
  // 利益率計算
  const totalRevenue = productPrice + displayShipping + handlingFee
  const totalCost = productPrice * 0.7 + cpassRate + 5
  const margin = (totalRevenue - totalCost) / totalRevenue
  
  return {
    country_code: country.country_code,
    country_name: country.country_name,
    zone_code: country.zone_code,
    shipping_cost: displayShipping,
    handling_fee: handlingFee,
    service_available: true,
    calculated_margin: margin
  }
}

/**
 * Zone別調整係数
 */
function getZoneAdjustmentFactor(zoneCode: string, countryCode: string): number {
  if (countryCode === 'US') return 1.35
  
  const baseFactors: Record<string, number> = {
    'ZONE_1': 1.15,
    'ZONE_2': 1.20,
    'ZONE_3': 1.25,
    'ZONE_4': 1.35,
    'ZONE_5': 1.40
  }
  
  return baseFactors[zoneCode] || 1.20
}

/**
 * 自然な金額に丸める
 */
function roundToNatural(amount: number): number {
  if (amount < 10) return Math.ceil(amount * 2) / 2
  return Math.ceil(amount)
}
