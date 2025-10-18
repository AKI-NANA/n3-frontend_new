// lib/shipping/rate-calculator.ts
// 送料計算の核心ロジック - DBマトリックスと完全統合

import { createClient } from '@/lib/supabase/client'

interface ShippingCalculationParams {
  destinationCountry: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  serviceType?: 'standard' | 'express'
  isDDP: boolean
  productPrice?: number  // DDP Handling計算用
  hsCode?: string        // 関税率取得用
}

interface ShippingCalculationResult {
  success: boolean
  
  // 基本送料
  baseShipping: number
  fuelSurcharge: number
  demandSurcharge: number
  remoteFee: number
  
  // DDP関連
  handlingFee: number
  ddpServiceFee: number
  tariff: number
  mpf: number
  hmf: number
  
  // 合計
  totalShipping: number
  totalDDPCosts: number
  
  // メタ情報
  zone: string
  zoneName: string
  carrier: string
  serviceName: string
  chargeableWeight: number
  
  // 詳細
  breakdown: any
  error?: string
}

/**
 * メイン送料計算関数
 * DBマトリックスから最適な送料を計算
 */
export async function calculateShippingRate(
  params: ShippingCalculationParams
): Promise<ShippingCalculationResult> {
  const supabase = createClient()
  
  try {
    // 1. Zone特定
    const zoneResult = await supabase
      .from('shipping_country_zones')
      .select(`
        zone_id,
        zone:shipping_zones(
          id,
          zone_code,
          zone_name
        )
      `)
      .eq('country_code', params.destinationCountry)
      .eq('is_active', true)
      .single()
    
    if (!zoneResult.data) {
      throw new Error(`Zone not found for country: ${params.destinationCountry}`)
    }
    
    const zone = zoneResult.data.zone
    
    // 2. 容積重量計算
    const volumetricWeight = calculateVolumetricWeight(
      params.lengthCm,
      params.widthCm,
      params.heightCm
    )
    const chargeableWeight = Math.max(params.weightKg, volumetricWeight)
    
    // 3. 基本送料取得（shipping_rates）
    const baseRate = await getBaseShippingRate(
      supabase,
      zone.id,
      chargeableWeight,
      params.serviceType || 'standard'
    )
    
    // 4. 燃油サーチャージ
    const fuelSurcharge = await getFuelSurcharge(
      supabase,
      baseRate.carrierId,
      baseRate.baseShipping
    )
    
    // 5. 需要サーチャージ
    const demandSurcharge = await getDemandSurcharge(
      supabase,
      params.destinationCountry
    )
    
    // 6. リモートエリア料金
    const remoteFee = await getRemoteFee(
      supabase,
      params.destinationCountry
    )
    
    // 7. DDP計算
    let ddpCosts = {
      handlingFee: 0,
      ddpServiceFee: 0,
      tariff: 0,
      mpf: 0,
      hmf: 0
    }
    
    if (params.isDDP) {
      ddpCosts = await calculateDDPCosts(
        supabase,
        params.destinationCountry,
        params.productPrice || 0,
        params.hsCode,
        baseRate.baseShipping
      )
    }
    
    // 8. 総合計
    const totalShipping = 
      baseRate.baseShipping +
      fuelSurcharge +
      demandSurcharge +
      remoteFee
    
    const totalDDPCosts = 
      ddpCosts.tariff +
      ddpCosts.mpf +
      ddpCosts.hmf +
      ddpCosts.ddpServiceFee
    
    return {
      success: true,
      
      // 基本送料
      baseShipping: baseRate.baseShipping,
      fuelSurcharge,
      demandSurcharge,
      remoteFee,
      
      // DDP関連
      handlingFee: ddpCosts.handlingFee,
      ddpServiceFee: ddpCosts.ddpServiceFee,
      tariff: ddpCosts.tariff,
      mpf: ddpCosts.mpf,
      hmf: ddpCosts.hmf,
      
      // 合計
      totalShipping,
      totalDDPCosts,
      
      // メタ情報
      zone: zone.zone_code,
      zoneName: zone.zone_name,
      carrier: baseRate.carrierName,
      serviceName: baseRate.serviceName,
      chargeableWeight,
      
      // 詳細
      breakdown: {
        baseRate: baseRate.baseShipping,
        perKgRate: baseRate.perKgRate,
        weightUsed: chargeableWeight,
        volumetricWeight,
        actualWeight: params.weightKg,
        fuelSurchargeRate: fuelSurcharge / baseRate.baseShipping,
        ...ddpCosts
      }
    }
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      baseShipping: 0,
      fuelSurcharge: 0,
      demandSurcharge: 0,
      remoteFee: 0,
      handlingFee: 0,
      ddpServiceFee: 0,
      tariff: 0,
      mpf: 0,
      hmf: 0,
      totalShipping: 0,
      totalDDPCosts: 0,
      zone: '',
      zoneName: '',
      carrier: '',
      serviceName: '',
      chargeableWeight: 0,
      breakdown: {}
    }
  }
}

/**
 * 容積重量計算
 */
function calculateVolumetricWeight(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  // 国際配送の標準: 5000で割る
  return (lengthCm * widthCm * heightCm) / 5000
}

/**
 * 基本送料取得
 */
async function getBaseShippingRate(
  supabase: any,
  zoneId: number,
  weightKg: number,
  serviceType: string
) {
  const { data, error } = await supabase
    .from('shipping_rates')
    .select(`
      *,
      carrier:shipping_carriers(carrier_name),
      service:shipping_services(service_name)
    `)
    .eq('zone_id', zoneId)
    .eq('service_type', serviceType)
    .gte('weight_max_kg', weightKg)
    .lte('weight_min_kg', weightKg)
    .order('weight_max_kg', { ascending: true })
    .limit(1)
    .single()
  
  if (error || !data) {
    throw new Error('Shipping rate not found')
  }
  
  const baseShipping = data.base_rate + 
    (weightKg - data.weight_min_kg) * data.per_kg_rate
  
  return {
    carrierId: data.carrier_id,
    carrierName: data.carrier.carrier_name,
    serviceName: data.service.service_name,
    baseShipping,
    perKgRate: data.per_kg_rate
  }
}

/**
 * 燃油サーチャージ取得
 */
async function getFuelSurcharge(
  supabase: any,
  carrierId: number,
  baseShipping: number
): Promise<number> {
  const { data } = await supabase
    .from('fuel_surcharges')
    .select('surcharge_rate')
    .eq('carrier_id', carrierId)
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (!data) return baseShipping * 0.15 // デフォルト15%
  
  return baseShipping * data.surcharge_rate
}

/**
 * 需要サーチャージ取得
 */
async function getDemandSurcharge(
  supabase: any,
  countryCode: string
): Promise<number> {
  const { data } = await supabase
    .from('demand_surcharges')
    .select('surcharge_amount')
    .eq('destination_country', countryCode)
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  return data?.surcharge_amount || 0
}

/**
 * リモートエリア料金取得
 */
async function getRemoteFee(
  supabase: any,
  countryCode: string
): Promise<number> {
  // TODO: リモートエリア判定ロジック
  return 0
}

/**
 * DDP関連コスト計算
 */
async function calculateDDPCosts(
  supabase: any,
  countryCode: string,
  productPrice: number,
  hsCode?: string,
  baseShipping?: number
) {
  // USA DDP計算
  if (countryCode === 'US') {
    // 1. 関税計算
    let tariffRate = 0.10 // デフォルト10%
    
    if (hsCode) {
      const { data: hsData } = await supabase
        .from('hs_codes')
        .select('base_duty, section_301_duty')
        .eq('code', hsCode)
        .single()
      
      if (hsData) {
        tariffRate = hsData.base_duty + (hsData.section_301_duty || 0)
      }
    }
    
    const tariff = productPrice * tariffRate
    
    // 2. MPF (0.3464% 最小$27.75、最大$528.33)
    const mpf = Math.min(
      Math.max(productPrice * 0.003464, 27.75),
      528.33
    )
    
    // 3. HMF (0.125% 海上輸送のみ)
    const hmf = 0 // 航空便なので0
    
    // 4. DDP手数料
    const ddpServiceFee = 12.00 // 固定
    
    // 5. Handling Fee計算
    const { data: handlingData } = await supabase
      .from('ebay_handling_fees')
      .select('*')
      .eq('destination_country', countryCode)
      .eq('is_ddp', true)
      .maybeSingle()
    
    let handlingFee = 10 // デフォルト
    
    if (handlingData && handlingData.calculation_method === 'PERCENTAGE') {
      // 関税の一部を回収
      handlingFee = Math.min(
        Math.max(
          tariff * handlingData.tariff_absorption_pct,
          handlingData.min_handling
        ),
        handlingData.max_handling
      )
    } else if (handlingData) {
      handlingFee = handlingData.fixed_amount
    }
    
    return {
      tariff,
      mpf,
      hmf,
      ddpServiceFee,
      handlingFee
    }
  }
  
  // その他の国のDDP
  return {
    tariff: 0,
    mpf: 0,
    hmf: 0,
    ddpServiceFee: 0,
    handlingFee: 8 // DDU国の最小Handling
  }
}

/**
 * 利益率均等化のためのHandling Fee最適化
 */
export async function optimizeHandlingForMargin(
  params: ShippingCalculationParams,
  targetMargin: number,
  costJPY: number,
  exchangeRate: number
): Promise<number> {
  // 送料計算
  const shipping = await calculateShippingRate(params)
  
  if (!shipping.success) return 0
  
  // 目標利益率達成のために必要なHandling
  const totalCosts = costJPY / exchangeRate + shipping.totalShipping + shipping.totalDDPCosts
  const targetRevenue = totalCosts / (1 - targetMargin)
  const currentRevenue = (params.productPrice || 0) + shipping.totalShipping
  
  const requiredHandling = targetRevenue - currentRevenue
  
  // 上限・下限チェック
  const minHandling = params.isDDP ? 10 : 5
  const maxHandling = params.isDDP ? 25 : 15
  
  return Math.min(Math.max(requiredHandling, minHandling), maxHandling)
}

export default calculateShippingRate
