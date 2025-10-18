// lib/shipping/ebay-policy-with-existing-engine.ts
// 既存の価格計算エンジンを使用したeBay配送ポリシー生成

import { createClient } from '@/lib/supabase/client'
import { PriceCalculationEngine } from '../ebay-pricing/price-calculation-engine'
import { calculateShipping } from '../shipping-calculator'

interface PolicyGenerationParams {
  policyName: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  costJPY: number
  hsCode: string
  handlingDays: number
}

export async function generatePolicyWithExistingEngine(params: PolicyGenerationParams) {
  console.log('🚀 既存エンジンを使用してeBay配送ポリシー生成開始...')
  
  const supabase = createClient()
  
  try {
    // 1. ポリシーマスター作成
    const { data: policy, error: policyError } = await supabase
      .from('ebay_fulfillment_policies')
      .insert({
        policy_name: params.policyName,
        marketplace_id: 'EBAY_US',
        handling_time_days: params.handlingDays,
        weight_min_kg: params.weightKg * 0.9,
        weight_max_kg: params.weightKg * 1.1,
        is_active: true
      })
      .select()
      .single()
    
    if (policyError) throw new Error(`ポリシー作成失敗: ${policyError.message}`)
    
    console.log(`✅ ポリシーマスター作成: ID ${policy.id}`)
    
    // 2. 対象国リスト取得
    const { data: allCountries } = await supabase
      .from('region_country_mapping')
      .select('country_code, country_name')
    
    const { data: excludedCountries } = await supabase
      .from('excluded_countries_master')
      .select('country_code')
      .eq('is_default_excluded', true)
    
    const excludedCodes = new Set(excludedCountries?.map(c => c.country_code) || [])
    const targetCountries = allCountries?.filter(c => !excludedCodes.has(c.country_code)) || []
    
    console.log(`📊 対象国: ${targetCountries.length}カ国`)
    
    // 3. 除外国設定
    for (const code of excludedCodes) {
      await supabase
        .from('ebay_shipping_exclusions')
        .insert({
          policy_id: policy.id,
          exclude_ship_to_location: code
        })
    }
    
    // 4. 主要国の送料計算（既存の送料計算ツール使用）
    const sampleCountries = ['US', 'GB', 'DE', 'AU', 'CA', 'JP', 'CN', 'FR', 'IT', 'ES']
    const countryResults: any[] = []
    
    for (const countryCode of sampleCountries) {
      // 既存の送料計算ツールで送料取得
      const shippingCalc = await calculateShipping({
        weight_g: params.weightKg * 1000,
        length_cm: params.lengthCm,
        width_cm: params.widthCm,
        height_cm: params.heightCm,
        country_code: countryCode,
        item_value_usd: params.costJPY / 154.32, // 簡易USD変換
        need_signature: false,
        need_insurance: true
      })
      
      if (shippingCalc.length === 0) continue
      
      // Expressサービスを選択
      const bestService = shippingCalc
        .filter(s => s.service.service_type === 'express' && s.available)
        .sort((a, b) => a.total_usd - b.total_usd)[0]
      
      if (!bestService) continue
      
      // 推奨送料（保険込み）
      const recommendedShippingCost = bestService.total_usd
      
      // DDPかDDUか判定
      const isDDP = countryCode === 'US'
      
      // 見かけの送料を計算（簡易版：実際は既存エンジンで計算すべき）
      // ここでは推奨送料にマージンを加えたものを使用
      const apparentShippingCost = isDDP 
        ? recommendedShippingCost * 1.3  // DDP: 30%増し
        : recommendedShippingCost * 1.1  // DDU: 10%増し
      
      const handlingFee = isDDP ? 10.00 : 5.00
      
      countryResults.push({
        countryCode,
        isDDP,
        recommendedShippingCost,
        apparentShippingCost,
        handlingFee,
        actualCost: bestService.total_usd
      })
      
      console.log(`💰 ${countryCode}: 推奨$${recommendedShippingCost.toFixed(2)} → 見かけ$${apparentShippingCost.toFixed(2)} ${isDDP ? 'DDP' : 'DDU'}`)
    }
    
    // 5. 平均送料計算
    const avgShippingCost = countryResults.reduce((sum, r) => sum + r.apparentShippingCost, 0) / countryResults.length
    
    // 6. 国際配送サービス作成
    
    // Economy（送料無料）
    await supabase
      .from('ebay_shipping_services')
      .insert({
        policy_id: policy.id,
        service_type: 'INTERNATIONAL',
        shipping_carrier_code: 'OTHER',
        shipping_service_code: 'EconomyShippingFromOutsideUS',
        free_shipping: true,
        shipping_cost_value: 0,
        ship_to_locations: ['WORLDWIDE'],
        min_transit_time_value: 13,
        max_transit_time_value: 23,
        sort_order: 0
      })
    
    console.log('✅ Economy配送サービス作成（送料無料）')
    
    // Expedited（有料）
    const { data: expeditedService } = await supabase
      .from('ebay_shipping_services')
      .insert({
        policy_id: policy.id,
        service_type: 'INTERNATIONAL',
        shipping_carrier_code: 'OTHER',
        shipping_service_code: 'ExpeditedShippingFromOutsideUS',
        free_shipping: false,
        shipping_cost_value: avgShippingCost,
        additional_shipping_cost_value: avgShippingCost,
        ship_to_locations: ['WORLDWIDE'],
        min_transit_time_value: 7,
        max_transit_time_value: 15,
        sort_order: 1
      })
      .select()
      .single()
    
    console.log(`✅ Expedited配送サービス作成（平均送料$${avgShippingCost.toFixed(2)}）`)
    
    // 7. 国別設定保存
    for (const result of countryResults) {
      await supabase
        .from('ebay_country_shipping_settings')
        .insert({
          policy_id: policy.id,
          country_code: result.countryCode,
          shipping_cost: result.apparentShippingCost,
          additional_item_cost: result.apparentShippingCost,
          handling_fee: result.handlingFee,
          express_available: true,
          economy_available: true,
          is_ddp: result.isDDP
        })
    }
    
    console.log(`✅ 国別設定保存: ${countryResults.length}カ国`)
    
    return {
      success: true,
      policyId: policy.id,
      totalCountries: targetCountries.length,
      calculatedCountries: countryResults.length,
      avgShippingCost,
      countryResults
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error)
    throw error
  }
}
