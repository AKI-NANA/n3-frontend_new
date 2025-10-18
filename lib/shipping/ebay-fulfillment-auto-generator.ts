// lib/shipping/ebay-fulfillment-auto-generator.ts
// eBay Fulfillment Policy 完全自動生成

import { createClient } from '@/lib/supabase/client'
import { calculateShippingAdjustment } from './ddp-ddu-calculator'
import { calculateShipping } from '../shipping-calculator'

interface AutoGenerateParams {
  policyName: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  productPriceUSD: number
  handlingDays: number
  targetMargin: number
}

export async function autoGenerateEbayFulfillmentPolicy(params: AutoGenerateParams) {
  console.log('🚀 eBay配送ポリシー自動生成開始...')
  console.log('目標: 全世界で利益率15%達成')
  
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
    
    // 2. 対象国リスト取得（除外国を除く）
    const { data: allCountries } = await supabase
      .from('region_country_mapping')
      .select('country_code, country_name, region_code')
    
    const { data: excludedCountries } = await supabase
      .from('excluded_countries_master')
      .select('country_code')
      .eq('is_default_excluded', true)
    
    const excludedCodes = new Set(excludedCountries?.map(c => c.country_code) || [])
    const targetCountries = allCountries?.filter(c => !excludedCodes.has(c.country_code)) || []
    
    console.log(`📊 対象国: ${targetCountries.length}カ国`)
    console.log(`🚫 除外国: ${excludedCodes.size}カ国`)
    
    // 3. 除外国設定
    for (const code of excludedCodes) {
      await supabase
        .from('ebay_shipping_exclusions')
        .insert({
          policy_id: policy.id,
          exclude_ship_to_location: code
        })
    }
    
    // 4. 主要国の送料計算（サンプル）
    const sampleCountries = ['US', 'GB', 'DE', 'AU', 'CA', 'JP', 'CN', 'FR']
    const shippingResults: any[] = []
    
    for (const countryCode of sampleCountries) {
      // 送料計算ツールで推奨送料を取得
      const shippingCalc = await calculateShipping({
        weight_g: params.weightKg * 1000,
        length_cm: params.lengthCm,
        width_cm: params.widthCm,
        height_cm: params.heightCm,
        country_code: countryCode,
        item_value_usd: params.productPriceUSD,
        need_signature: false,
        need_insurance: true
      })
      
      if (shippingCalc.length === 0) continue
      
      // 最も安いExpressサービスを選択
      const bestService = shippingCalc
        .filter(s => s.service.service_type === 'express' && s.available)
        .sort((a, b) => a.total_usd - b.total_usd)[0]
      
      if (!bestService) continue
      
      // DDP/DDU調整計算
      const adjustment = await calculateShippingAdjustment({
        countryCode,
        weightKg: params.weightKg,
        productPriceUSD: params.productPriceUSD,
        baseShippingCostUSD: bestService.base_price_usd,
        insuranceCostUSD: bestService.insurance_fee_usd,
        targetMargin: params.targetMargin
      })
      
      shippingResults.push({
        ...adjustment,
        actualShippingCost: bestService.total_usd
      })
      
      console.log(`💰 ${countryCode}: 推奨送料$${adjustment.recommendedShippingCost.toFixed(2)} → 見かけ$${adjustment.apparentShippingCost.toFixed(2)} (利益率${(adjustment.calculatedMargin * 100).toFixed(1)}%)`)
    }
    
    // 5. 地域別平均料金を計算
    const regionRates: Record<string, number> = {}
    
    for (const result of shippingResults) {
      const country = targetCountries.find(c => c.country_code === result.countryCode)
      if (!country) continue
      
      if (!regionRates[country.region_code]) {
        regionRates[country.region_code] = result.apparentShippingCost
      }
    }
    
    // 6. 国際配送サービス作成
    
    // Economy（送料無料）
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
    
    console.log('✅ Economy配送サービス作成（送料無料）')
    
    // Expedited（有料・国別料金）
    const avgShippingCost = shippingResults.reduce((sum, r) => sum + r.apparentShippingCost, 0) / shippingResults.length
    
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
        min_transit_time_unit: 'BUSINESS_DAY',
        max_transit_time_unit: 'BUSINESS_DAY',
        sort_order: 1
      })
      .select()
      .single()
    
    console.log(`✅ Expedited配送サービス作成（平均送料$${avgShippingCost.toFixed(2)}）`)
    
    // 7. 国別詳細設定を保存
    for (const result of shippingResults) {
      await supabase
        .from('ebay_country_shipping_settings')
        .insert({
          policy_id: policy.id,
          country_code: result.countryCode,
          country_name: result.countryName,
          shipping_cost: result.apparentShippingCost,
          additional_item_cost: result.apparentShippingCost,
          handling_fee: result.handlingFee,
          express_available: true,
          economy_available: true,
          is_ddp: result.isDDP,
          estimated_tariff: result.estimatedTariff,
          calculated_margin: result.calculatedMargin
        })
    }
    
    console.log(`✅ 国別設定保存: ${shippingResults.length}カ国`)
    
    // 8. 統計情報
    const avgMargin = shippingResults.reduce((sum, r) => sum + r.calculatedMargin, 0) / shippingResults.length
    const minMargin = Math.min(...shippingResults.map(r => r.calculatedMargin))
    const maxMargin = Math.max(...shippingResults.map(r => r.calculatedMargin))
    
    console.log(`📈 利益率統計:`)
    console.log(`  平均: ${(avgMargin * 100).toFixed(1)}%`)
    console.log(`  最小: ${(minMargin * 100).toFixed(1)}%`)
    console.log(`  最大: ${(maxMargin * 100).toFixed(1)}%`)
    
    return {
      success: true,
      policyId: policy.id,
      totalCountries: targetCountries.length,
      excludedCountries: excludedCodes.size,
      calculatedCountries: shippingResults.length,
      avgMargin,
      minMargin,
      maxMargin,
      shippingResults
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error)
    throw error
  }
}
