// lib/shipping/ebay-policy-generator.ts
// eBay Fulfillment Policy API準拠の配送ポリシー生成

import { createClient } from '@/lib/supabase/client'

interface PolicyGenerationParams {
  name: string
  handlingTimeDays: number
  domesticServices: DomesticService[]
  internationalServices: InternationalService[]
  excludedLocations: string[]
}

interface DomesticService {
  carrierCode: string
  serviceCode: string
  freeShipping: boolean
  shippingCost: number
  additionalCost: number
}

interface InternationalService {
  carrierCode: string
  serviceCode: string
  freeShipping: boolean
  shippingCost: number
  additionalCost: number
  shipToLocations: string[] // ['WORLDWIDE'] or ['US', 'CA', 'GB']
  minTransitDays?: number
  maxTransitDays?: number
}

/**
 * eBay Fulfillment Policy作成
 */
export async function createEbayFulfillmentPolicy(params: PolicyGenerationParams) {
  console.log('🚀 eBay Fulfillment Policy作成開始...')
  
  const supabase = createClient()
  
  try {
    // 1. ポリシーマスター作成
    const { data: policy, error: policyError } = await supabase
      .from('ebay_fulfillment_policies')
      .insert({
        name: params.name,
        marketplace_id: 'EBAY_US',
        category_types: ['ALL_EXCLUDING_MOTORS_VEHICLES'],
        handling_time_value: params.handlingTimeDays,
        handling_time_unit: 'BUSINESS_DAY',
        ship_to_locations: ['WORLDWIDE'],
        is_active: true
      })
      .select()
      .single()
    
    if (policyError) {
      throw new Error(`ポリシー作成失敗: ${policyError.message}`)
    }
    
    console.log('✅ ポリシーマスター作成完了:', policy.id)
    
    // 2. 国内配送サービス作成
    for (const service of params.domesticServices) {
      await supabase
        .from('ebay_shipping_services')
        .insert({
          policy_id: policy.id,
          service_type: 'DOMESTIC',
          shipping_carrier_code: service.carrierCode,
          shipping_service_code: service.serviceCode,
          free_shipping: service.freeShipping,
          shipping_cost_value: service.shippingCost,
          additional_shipping_cost_value: service.additionalCost,
          shipping_cost_currency: 'USD',
          additional_shipping_cost_currency: 'USD'
        })
    }
    
    console.log(`✅ 国内配送サービス: ${params.domesticServices.length}件`)
    
    // 3. 国際配送サービス作成
    for (let i = 0; i < params.internationalServices.length; i++) {
      const service = params.internationalServices[i]
      await supabase
        .from('ebay_shipping_services')
        .insert({
          policy_id: policy.id,
          service_type: 'INTERNATIONAL',
          shipping_carrier_code: service.carrierCode,
          shipping_service_code: service.serviceCode,
          free_shipping: service.freeShipping,
          shipping_cost_value: service.shippingCost,
          additional_shipping_cost_value: service.additionalCost,
          shipping_cost_currency: 'USD',
          additional_shipping_cost_currency: 'USD',
          ship_to_locations: service.shipToLocations,
          min_transit_time_value: service.minTransitDays,
          max_transit_time_value: service.maxTransitDays,
          min_transit_time_unit: 'BUSINESS_DAY',
          max_transit_time_unit: 'BUSINESS_DAY',
          sort_order: i
        })
    }
    
    console.log(`✅ 国際配送サービス: ${params.internationalServices.length}件`)
    
    // 4. 除外国設定
    for (const location of params.excludedLocations) {
      await supabase
        .from('ebay_shipping_exclusions')
        .insert({
          policy_id: policy.id,
          exclude_ship_to_location: location
        })
        .onConflict('policy_id,exclude_ship_to_location')
    }
    
    console.log(`✅ 除外国: ${params.excludedLocations.length}カ国`)
    
    return {
      success: true,
      policyId: policy.id,
      domesticServices: params.domesticServices.length,
      internationalServices: params.internationalServices.length,
      excludedLocations: params.excludedLocations.length
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error)
    throw error
  }
}

/**
 * デフォルト除外国リスト
 */
export const DEFAULT_EXCLUDED_LOCATIONS = [
  'KP', // North Korea
  'SY', // Syria
  'IR', // Iran
  'CU', // Cuba
  'SD', // Sudan
  'SS', // South Sudan
  'AA', // APO/FPO Americas
  'AE', // APO/FPO Europe  
  'AP'  // APO/FPO Pacific
]

/**
 * 配送ポリシー詳細取得
 */
export async function getFulfillmentPolicyDetail(policyId: number) {
  const supabase = createClient()
  
  // ポリシー基本情報
  const { data: policy } = await supabase
    .from('ebay_fulfillment_policies')
    .select('*')
    .eq('id', policyId)
    .single()
  
  // 配送サービス
  const { data: services } = await supabase
    .from('ebay_shipping_services')
    .select('*')
    .eq('policy_id', policyId)
    .order('service_type, sort_order')
  
  // 除外国
  const { data: exclusions } = await supabase
    .from('ebay_shipping_exclusions')
    .select('*')
    .eq('policy_id', policyId)
  
  return {
    policy,
    services: services || [],
    exclusions: exclusions || []
  }
}
