import { supabase } from './supabase'
import type { Service } from './supabase'

export interface ShippingCalculationInput {
  weight_g: number
  length_cm: number
  width_cm: number
  height_cm: number
  country_code: string
  zone_code?: string
  item_value_usd: number
  need_signature: boolean
  need_insurance: boolean
  signature_type?: 'STANDARD' | 'ADULT'
  selected_carrier?: string
  selected_service?: string
}

export interface ShippingCalculationResult {
  service: Service
  carrier_name: string
  carrier_code: string
  base_price_jpy: number
  base_price_usd: number
  fuel_surcharge_jpy: number
  fuel_surcharge_usd: number
  oversize_fee_jpy: number
  oversize_fee_usd: number
  insurance_fee_jpy: number
  insurance_fee_usd: number
  signature_fee_jpy: number
  signature_fee_usd: number
  total_jpy: number
  total_usd: number
  marketplace: string
  available: boolean
  reason?: string
  packaging_materials?: Array<{
    material_code: string
    material_name: string
    description: string
    max_dimensions: string
  }>
}

/**
 * 容積重量を計算（DHL/FedEx標準: 5000で割る）
 */
export function calculateVolumetricWeight(length: number, width: number, height: number): number {
  return (length * width * height) / 5000
}

/**
 * 請求重量を計算（実重量 vs 容積重量の大きい方）
 */
export function calculateBillingWeight(weightG: number, length: number, width: number, height: number): number {
  const actualWeightKg = weightG / 1000
  const volumetricWeightKg = calculateVolumetricWeight(length, width, height)
  return Math.max(actualWeightKg, volumetricWeightKg)
}

/**
 * 3辺合計を計算
 */
export function calculateGirth(length: number, width: number, height: number): number {
  return length + width + height
}

/**
 * 最大辺を取得
 */
export function getMaxDimension(length: number, width: number, height: number): number {
  return Math.max(length, width, height)
}

/**
 * 最新の為替レートを取得
 */
export async function getExchangeRate(): Promise<number> {
  try {
    const { data } = await supabase
      .from('exchange_rates')
      .select('usd_to_jpy')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    return data?.usd_to_jpy || 154.32
  } catch (error) {
    console.log('為替レート取得エラー（デフォルト値を使用）:', error)
    return 154.32
  }
}

/**
 * アクティブな配送業者とサービスを取得（モックデータ）
 */
export async function getActiveCarriersAndServices() {
  // Supabaseが未設定の場合はモックデータを返す
  const mockData = [
    {
      id: 'carrier-cpass',
      carrier_code: 'CPASS',
      carrier_name: 'CPass',
      marketplace_restriction: 'eBay only',
      is_active: true,
      is_future_support: false,
      services: [
        {
          id: 'service-cpass-speedpak-us',
          carrier_id: 'carrier-cpass',
          service_code: 'SPEEDPAK_US',
          service_name: 'SpeedPak 米国',
          service_type: 'economy',
          delivery_days_min: 8,
          delivery_days_max: 12,
          has_tracking: true,
          has_insurance_included: false,
          max_weight_g: null,
          is_active: true
        },
        {
          id: 'service-cpass-dhl',
          carrier_id: 'carrier-cpass',
          service_code: 'DHL_EXPRESS',
          service_name: 'DHL Express',
          service_type: 'express',
          delivery_days_min: 2,
          delivery_days_max: 4,
          has_tracking: true,
          has_insurance_included: false,
          max_weight_g: null,
          is_active: true
        },
        {
          id: 'service-cpass-fedex',
          carrier_id: 'carrier-cpass',
          service_code: 'FEDEX_PRIORITY',
          service_name: 'FedEx International Priority',
          service_type: 'express',
          delivery_days_min: 2,
          delivery_days_max: 3,
          has_tracking: true,
          has_insurance_included: false,
          max_weight_g: null,
          is_active: true
        }
      ]
    },
    {
      id: 'carrier-eloji',
      carrier_code: 'ELOJI',
      carrier_name: 'Eloji',
      marketplace_restriction: 'eBay only',
      is_active: true,
      is_future_support: false,
      services: [
        {
          id: 'service-eloji-ups',
          carrier_id: 'carrier-eloji',
          service_code: 'UPS_GROUND',
          service_name: 'UPS Ground',
          service_type: 'standard',
          delivery_days_min: 5,
          delivery_days_max: 7,
          has_tracking: true,
          has_insurance_included: false,
          max_weight_g: null,
          is_active: true
        },
        {
          id: 'service-eloji-dhl',
          carrier_id: 'carrier-eloji',
          service_code: 'DHL_EXPRESS',
          service_name: 'DHL Express',
          service_type: 'express',
          delivery_days_min: 2,
          delivery_days_max: 4,
          has_tracking: true,
          has_insurance_included: false,
          max_weight_g: null,
          is_active: true
        }
      ]
    },
    {
      id: 'carrier-jppost',
      carrier_code: 'JPPOST',
      carrier_name: '日本郵便',
      marketplace_restriction: 'All platforms (米国除く)',
      is_active: true,
      is_future_support: false,
      services: [
        {
          id: 'service-jppost-ems',
          carrier_id: 'carrier-jppost',
          service_code: 'EMS',
          service_name: 'EMS',
          service_type: 'express',
          delivery_days_min: 3,
          delivery_days_max: 6,
          has_tracking: true,
          has_insurance_included: true,
          max_weight_g: 30000,
          is_active: true
        },
        {
          id: 'service-jppost-small',
          carrier_id: 'carrier-jppost',
          service_code: 'SMALL_PACKET_REG',
          service_name: '小型包装物書留',
          service_type: 'economy',
          delivery_days_min: 7,
          delivery_days_max: 14,
          has_tracking: true,
          has_insurance_included: false,
          max_weight_g: 2000,
          is_active: true
        }
      ]
    }
  ]

  try {
    const { data: carriers } = await supabase
      .from('shipping_carriers')
      .select(`
        *,
        services:shipping_services(*)
      `)
      .eq('is_active', true)
      .order('carrier_name')

    if (carriers && carriers.length > 0) {
      return carriers
    }
  } catch (error) {
    console.log('Supabaseデータ取得エラー（モックデータを使用）:', error)
  }

  return mockData
}

/**
 * 送料を計算
 */
export async function calculateShipping(
  input: ShippingCalculationInput
): Promise<ShippingCalculationResult[]> {
  const {
    weight_g,
    length_cm,
    width_cm,
    height_cm,
    country_code,
    item_value_usd,
    need_signature,
    need_insurance,
    signature_type = 'STANDARD',
    selected_carrier,
    selected_service
  } = input

  const exchangeRate = await getExchangeRate()
  const billingWeightG = calculateBillingWeight(weight_g, length_cm, width_cm, height_cm) * 1000

  // アクティブなサービスを取得
  const carriers = await getActiveCarriersAndServices()
  
  const results: ShippingCalculationResult[] = []

  for (const carrier of carriers) {
    if (selected_carrier && selected_carrier !== 'ALL' && carrier.carrier_code !== selected_carrier) {
      continue
    }

    for (const service of carrier.services) {
      if (selected_service && selected_service !== 'ALL' && service.service_code !== selected_service) {
        continue
      }

      // 重量制限チェック
      if (service.max_weight_g && weight_g > service.max_weight_g) {
        results.push({
          service: service as Service,
          carrier_name: carrier.carrier_name,
          carrier_code: carrier.carrier_code,
          base_price_jpy: 0,
          base_price_usd: 0,
          fuel_surcharge_jpy: 0,
          fuel_surcharge_usd: 0,
          oversize_fee_jpy: 0,
          oversize_fee_usd: 0,
          insurance_fee_jpy: 0,
          insurance_fee_usd: 0,
          signature_fee_jpy: 0,
          signature_fee_usd: 0,
          total_jpy: 0,
          total_usd: 0,
          marketplace: carrier.marketplace_restriction || 'All platforms',
          available: false,
          reason: `重量制限超過（最大${service.max_weight_g}g）`
        })
        continue
      }

      // 日本郵便の米国配送停止チェック
      if (carrier.carrier_code === 'JPPOST' && country_code === 'US') {
        results.push({
          service: service as Service,
          carrier_name: carrier.carrier_name,
          carrier_code: carrier.carrier_code,
          base_price_jpy: 0,
          base_price_usd: 0,
          fuel_surcharge_jpy: 0,
          fuel_surcharge_usd: 0,
          oversize_fee_jpy: 0,
          oversize_fee_usd: 0,
          insurance_fee_jpy: 0,
          insurance_fee_usd: 0,
          signature_fee_jpy: 0,
          signature_fee_usd: 0,
          total_jpy: 0,
          total_usd: 0,
          marketplace: carrier.marketplace_restriction || 'All platforms',
          available: false,
          reason: '現在アメリカへの配送停止中'
        })
        continue
      }

      // モック料金計算
      const baseRateJPY = 2000 + (billingWeightG / 1000) * 1500
      const baseRateUSD = baseRateJPY / exchangeRate

      // 燃油サーチャージ
      const fuelPct = carrier.carrier_code === 'JPPOST' ? 0 : (carrier.carrier_code === 'CPASS' ? 21.5 : 19.0)
      const fuelSurchargeJPY = baseRateJPY * (fuelPct / 100)
      const fuelSurchargeUSD = baseRateUSD * (fuelPct / 100)

      // 超過料金チェック（簡易版）
      const girth = calculateGirth(length_cm, width_cm, height_cm)
      const maxDim = getMaxDimension(length_cm, width_cm, height_cm)
      let oversizeFeeJPY = 0
      let oversizeFeeUSD = 0

      if (service.service_type === 'express') {
        if (maxDim >= 120 || girth >= 300) {
          oversizeFeeJPY = 5000
          oversizeFeeUSD = oversizeFeeJPY / exchangeRate
        }
      }

      // 保険料（商品価格の2%、最低500円）
      let insuranceFeeJPY = 0
      let insuranceFeeUSD = 0
      if (need_insurance && !service.has_insurance_included) {
        insuranceFeeJPY = Math.max(500, item_value_usd * exchangeRate * 0.02)
        insuranceFeeUSD = insuranceFeeJPY / exchangeRate
      }

      // サイン料金
      let signatureFeeJPY = 0
      let signatureFeeUSD = 0
      if (need_signature) {
        signatureFeeJPY = signature_type === 'ADULT' ? 800 : 500
        signatureFeeUSD = signatureFeeJPY / exchangeRate
      }

      // 合計
      const totalJPY = baseRateJPY + fuelSurchargeJPY + oversizeFeeJPY + insuranceFeeJPY + signatureFeeJPY
      const totalUSD = totalJPY / exchangeRate

      results.push({
        service: service as Service,
        carrier_name: carrier.carrier_name,
        carrier_code: carrier.carrier_code,
        base_price_jpy: baseRateJPY,
        base_price_usd: baseRateUSD,
        fuel_surcharge_jpy: fuelSurchargeJPY,
        fuel_surcharge_usd: fuelSurchargeUSD,
        oversize_fee_jpy: oversizeFeeJPY,
        oversize_fee_usd: oversizeFeeUSD,
        insurance_fee_jpy: insuranceFeeJPY,
        insurance_fee_usd: insuranceFeeUSD,
        signature_fee_jpy: signatureFeeJPY,
        signature_fee_usd: signatureFeeUSD,
        total_jpy: totalJPY,
        total_usd: totalUSD,
        marketplace: carrier.marketplace_restriction || 'All platforms',
        available: true
      })
    }
  }

  // 利用可能なものを料金順にソート
  const available = results.filter(r => r.available).sort((a, b) => a.total_jpy - b.total_jpy)
  const unavailable = results.filter(r => !r.available)

  return [...available, ...unavailable]
}

/**
 * 計算履歴を保存
 */
export async function saveCalculationHistory(
  input: ShippingCalculationInput,
  selectedResult: ShippingCalculationResult
) {
  try {
    const { error } = await supabase
      .from('calculation_history')
      .insert({
        weight_g: input.weight_g,
        length_cm: input.length_cm,
        width_cm: input.width_cm,
        height_cm: input.height_cm,
        country_code: input.country_code,
        zone_code: input.zone_code,
        item_value_usd: input.item_value_usd,
        selected_service_id: selectedResult.service.id,
        total_cost_jpy: selectedResult.total_jpy,
        total_cost_usd: selectedResult.total_usd
      })

    if (error) {
      console.error('履歴保存エラー:', error)
    }
  } catch (error) {
    console.log('履歴保存スキップ（テーブル未作成）:', error)
  }
}
