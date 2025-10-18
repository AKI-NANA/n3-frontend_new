// lib/shipping/auto-policy-generator.ts
// CPASS料金から自動で配送ポリシーを生成

import { createClient } from '@/lib/supabase/client'

interface AutoGenerateParams {
  policyName: string
  weightCategory: string
  weightMinKg: number
  weightMaxKg: number
  handlingDays: number
}

export async function autoGenerateShippingPolicy(params: AutoGenerateParams) {
  console.log('🚀 自動配送ポリシー生成開始...')
  
  const supabase = createClient()
  
  try {
    // 1. ポリシーマスター作成
    const { data: policy, error: policyError } = await supabase
      .from('ebay_fulfillment_policies')
      .insert({
        name: params.policyName,
        marketplace_id: 'EBAY_US',
        category_types: ['ALL_EXCLUDING_MOTORS_VEHICLES'],
        handling_time_value: params.handlingDays,
        handling_time_unit: 'BUSINESS_DAY',
        ship_to_locations: ['WORLDWIDE'],
        is_active: true
      })
      .select()
      .single()
    
    if (policyError) throw new Error(`ポリシー作成失敗: ${policyError.message}`)
    
    console.log('✅ ポリシー作成:', policy.id)
    
    // 2. デフォルト除外国を取得
    const { data: excludedCountries } = await supabase
      .from('excluded_countries_master')
      .select('country_code')
      .eq('is_default_excluded', true)
    
    // 3. 除外国設定
    if (excludedCountries) {
      for (const country of excludedCountries) {
        await supabase
          .from('ebay_shipping_exclusions')
          .insert({
            policy_id: policy.id,
            exclude_ship_to_location: country.country_code
          })
      }
      console.log(`✅ 除外国設定: ${excludedCountries.length}カ国`)
    }
    
    // 4. 地域データ取得
    const { data: regions } = await supabase
      .from('shipping_regions')
      .select('*')
      .gte('sort_order', 10) // 国際配送のみ
      .order('sort_order')
    
    if (!regions) throw new Error('地域データ取得失敗')
    
    // 5. Economy配送サービス作成
    const { data: economyService } = await supabase
      .from('ebay_shipping_services')
      .insert({
        policy_id: policy.id,
        service_type: 'INTERNATIONAL',
        shipping_carrier_code: 'OTHER',
        shipping_service_code: 'EconomyShippingFromOutsideUS',
        free_shipping: true,
        shipping_cost_value: 0,
        additional_shipping_cost_value: 0,
        ship_to_locations: ['WORLDWIDE'],
        min_transit_time_value: 13,
        max_transit_time_value: 23,
        min_transit_time_unit: 'BUSINESS_DAY',
        max_transit_time_unit: 'BUSINESS_DAY',
        sort_order: 0
      })
      .select()
      .single()
    
    if (!economyService) throw new Error('Economyサービス作成失敗')
    console.log('✅ Economy配送サービス作成')
    
    // 6. Expedited配送サービス作成
    const { data: expeditedService } = await supabase
      .from('ebay_shipping_services')
      .insert({
        policy_id: policy.id,
        service_type: 'INTERNATIONAL',
        shipping_carrier_code: 'OTHER',
        shipping_service_code: 'ExpeditedShippingFromOutsideUS',
        free_shipping: false,
        shipping_cost_value: 14.00,
        additional_shipping_cost_value: 14.00,
        ship_to_locations: ['WORLDWIDE'],
        min_transit_time_value: 7,
        max_transit_time_value: 15,
        min_transit_time_unit: 'BUSINESS_DAY',
        max_transit_time_unit: 'BUSINESS_DAY',
        sort_order: 1
      })
      .select()
      .single()
    
    if (!expeditedService) throw new Error('Expeditedサービス作成失敗')
    console.log('✅ Expedited配送サービス作成')
    
    // 7. 地域別料金設定（Expeditedのみ）
    const regionRates = calculateRegionRates(params.weightMinKg, params.weightMaxKg)
    
    for (const region of regions) {
      const rate = regionRates[region.region_code] || 14.00
      
      await supabase
        .from('shipping_rate_tables')
        .insert({
          policy_id: policy.id,
          service_id: expeditedService.id,
          region_code: region.region_code,
          shipping_cost: rate,
          additional_item_cost: rate,
          currency: 'USD',
          weight_min_kg: params.weightMinKg,
          weight_max_kg: params.weightMaxKg
        })
    }
    
    console.log(`✅ 地域別料金設定: ${regions.length}地域`)
    
    return {
      success: true,
      policyId: policy.id,
      regions: regions.length,
      excludedCountries: excludedCountries?.length || 0
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error)
    throw error
  }
}

// 重量に基づく地域別料金計算
function calculateRegionRates(minKg: number, maxKg: number): Record<string, number> {
  const avgWeight = (minKg + maxKg) / 2
  
  // 基本料金（仮想CPASS料金）
  const baseRate = 10 + (avgWeight * 5)
  
  return {
    'ASIA': baseRate * 0.8,           // アジア: 安い
    'NORTH_AMERICA': baseRate * 1.2,  // 北米: 標準
    'EUROPE': baseRate * 1.3,         // ヨーロッパ: やや高い
    'OCEANIA': baseRate * 1.4,        // オセアニア: 高い
    'MIDDLE_EAST': baseRate * 1.5,    // 中東: 高い
    'AFRICA': baseRate * 1.6,         // アフリカ: 高い
    'SOUTH_AMERICA': baseRate * 1.7,  // 南米: 非常に高い
    'CENTRAL_AMERICA_CARIBBEAN': baseRate * 1.5, // 中米: 高い
    'SOUTHEAST_ASIA': baseRate * 0.9  // 東南アジア: やや安い
  }
}
