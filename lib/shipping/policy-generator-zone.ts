// lib/shipping/policy-generator-zone.ts
// Zone別配送ポリシー自動生成（正しいアプローチ）

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

/**
 * Zone別配送ポリシー自動生成
 */
export async function generateShippingPolicyByZone(params: PolicyGenerationParams) {
  console.log('🚀 Zone別配送ポリシー自動生成開始...')
  console.log('パラメータ:', params)
  
  const supabase = createClient()
  
  try {
    // 1. ポリシーマスター作成
    const { data: policy, error: policyError } = await supabase
      .from('ebay_fulfillment_policies')
      .insert({
        policy_name: params.policyName,
        marketplace_id: 'EBAY_US',
        handling_time_days: 10,
        weight_category: params.weightCategory,
        weight_min_kg: params.weightMinKg,
        weight_max_kg: params.weightMaxKg,
        is_active: true
      })
      .select()
      .single()
    
    if (policyError) {
      console.error('❌ ポリシー作成エラー:', policyError)
      throw new Error(`ポリシー作成失敗: ${policyError.message}`)
    }
    
    console.log('✅ ポリシーマスター作成完了:', policy.id)
    
    // 2. Zoneリスト取得（FedEx Zone 1-8）
    const { data: zones, error: zonesError } = await supabase
      .from('shipping_zones')
      .select('*')
      .order('zone_code')
    
    if (zonesError || !zones) {
      throw new Error('Zoneデータ取得失敗')
    }
    
    // FedExの主要Zone（ZONE1-ZONE5）のみフィルタ（重複除去）
    const seenZones = new Set<string>()
    const fedexZones = zones.filter(z => {
      if (!/^ZONE[1-5]$/.test(z.zone_code)) return false
      if (seenZones.has(z.zone_code)) return false
      seenZones.add(z.zone_code)
      return true
    })
    
    console.log(`📊 対象Zone数: ${fedexZones.length}件`)
    fedexZones.forEach(z => {
      console.log(`  - ${z.zone_code}: ${z.zone_name}`)
    })
    
    // 3. 各Zoneの送料計算
    const weightKg = (params.weightMinKg + params.weightMaxKg) / 2
    const zoneRates = []
    
    for (const zone of fedexZones) {
      // Zone codeを正規化（ZONE1 → ZONE_1）
      const normalizedZone = zone.zone_code.replace(/^ZONE(\d)$/, 'ZONE_$1')
      
      // 送料計算
      const cpassRate = getCpassRate(normalizedZone, weightKg)
      const adjustmentFactor = getZoneAdjustmentFactor(normalizedZone)
      const displayShipping = calculateDisplayShipping(normalizedZone, weightKg, adjustmentFactor)
      
      // Handling Fee
      const handlingFee = calculateHandlingFee(
        params.referenceProductPrice,
        cpassRate,
        params.targetMargin,
        displayShipping
      )
      
      zoneRates.push({
        zone_code: zone.zone_code,
        zone_name: zone.zone_name,
        shipping_cost: displayShipping,
        handling_fee: handlingFee,
        cpass_cost: cpassRate
      })
      
      console.log(`💰 ${zone.zone_code}: 送料$${displayShipping} + Handling$${handlingFee} (CPASS: $${cpassRate})`)
    }
    
    // 4. Zone設定をDBに保存
    for (const rate of zoneRates) {
      await supabase
        .from('ebay_zone_shipping_rates')
        .upsert({
          policy_id: policy.id,
          zone_code: rate.zone_code,
          shipping_cost: rate.shipping_cost,
          handling_fee: rate.handling_fee,
          additional_item_cost: 0
        }, {
          onConflict: 'policy_id,zone_code'
        })
    }
    
    console.log('✅ Zone別送料設定完了')
    
    return {
      success: true,
      policyId: policy.id,
      totalZones: zoneRates.length,
      zones: zoneRates
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error)
    throw error
  }
}

/**
 * Zone別調整係数
 */
function getZoneAdjustmentFactor(zoneCode: string): number {
  const factors: Record<string, number> = {
    'ZONE_1': 1.15,  // アジア近隣
    'ZONE_2': 1.20,  // アジア遠方
    'ZONE_3': 1.25,  // オセアニア・北米・ヨーロッパ
    'ZONE_4': 1.35,  // 米国
    'ZONE_5': 1.40   // 中南米・アフリカ
  }
  return factors[zoneCode] || 1.20
}

/**
 * Handling Fee計算
 */
function calculateHandlingFee(
  productPrice: number,
  cpassCost: number,
  targetMargin: number,
  displayShipping: number
): number {
  const totalCost = cpassCost + 5
  const targetRevenue = totalCost / (1 - targetMargin)
  const currentRevenue = productPrice + displayShipping
  let handlingFee = Math.max(targetRevenue - currentRevenue, 5)
  handlingFee = Math.min(handlingFee, 15)
  
  // 自然な金額に丸め
  if (handlingFee < 10) {
    return Math.ceil(handlingFee * 2) / 2
  }
  return Math.ceil(handlingFee)
}
