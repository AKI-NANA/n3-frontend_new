import { supabase } from '@/lib/supabase'
import type {
  ShippingCalculationParams,
  ShippingCalculationResult,
  APIResponse
} from '@/types/shipping'

const USD_JPY_RATE = 154.32

/**
 * 容積重量計算
 */
export function calculateVolumetricWeight(
  length: number,
  width: number,
  height: number,
  unit: 'cm' | 'inch' = 'cm'
): number {
  const factor = unit === 'cm' ? 5000 : 139
  return (length * width * height) / factor
}

/**
 * 請求重量計算（業者別の計算方法）
 */
export function calculateChargeableWeight(
  actualWeight: number,
  volumetricWeight: number,
  carrier: string = 'DEFAULT'
): number {
  if (carrier.includes('DHL') || carrier.includes('FEDEX') || carrier.includes('UPS') || 
      carrier.includes('ELOJI') || carrier.includes('CPASS')) {
    return Math.max(actualWeight, volumetricWeight)
  }
  
  if (carrier.includes('JPPOST') || carrier.includes('日本郵便')) {
    return volumetricWeight > actualWeight * 2 ? volumetricWeight : actualWeight
  }
  
  return Math.max(actualWeight, volumetricWeight)
}

/**
 * 国コードからZONEを検索する関数
 */
async function findZonesByCountryCode(
  countryCode: string,
  serviceCode?: string
): Promise<number[]> {
  try {
    const query = supabase
      .from('cpass_zone_countries')
      .select('zone_id, cpass_countries!inner(id, country_code)')
      .eq('country_code', countryCode)

    const { data, error } = await query

    if (error) {
      console.error('Zone lookup error:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.log(`国コード ${countryCode} に対応するゾーンが見つかりません`)
      return []
    }

    const zoneIds = data.map(d => d.zone_id)
    console.log(`国コード ${countryCode} のゾーンID:`, zoneIds)
    
    return zoneIds
  } catch (error) {
    console.error('Zone lookup exception:', error)
    return []
  }
}

/**
 * 燃油サーチャージを取得
 */
async function getFuelSurcharge(carrierId: string, basePrice: number): Promise<number> {
  try {
    const { data: surcharge } = await supabase
      .from('fuel_surcharges')
      .select('surcharge_rate')
      .eq('carrier_id', carrierId)
      .order('effective_month', { ascending: false })
      .limit(1)
      .single()
    
    if (surcharge && surcharge.surcharge_rate) {
      const rate = Number(surcharge.surcharge_rate) / 100
      return Math.round(basePrice * rate)
    }
    return 0
  } catch (error) {
    console.error('燃油サーチャージ取得エラー:', error)
    return 0
  }
}

/**
 * 需要サーチャージを取得（新規）
 */
async function getDemandSurcharges(
  carrierId: string, 
  basePrice: number,
  currentMonth: number = new Date().getMonth() + 1
): Promise<{
  peak: number
  residential: number
  remote_area: number
  customs_clearance: number
  total: number
}> {
  try {
    const { data: surcharges } = await supabase
      .from('demand_surcharges')
      .select('*')
      .eq('carrier_id', carrierId)
      .eq('is_active', true)

    let peak = 0
    let residential = 0
    let remote_area = 0
    let customs_clearance = 0

    if (surcharges) {
      for (const surcharge of surcharges) {
        let amount = 0

        // 適用月チェック
        if (surcharge.applicable_months && !surcharge.applicable_months.includes(currentMonth)) {
          continue
        }

        // 料金計算
        if (surcharge.surcharge_rate) {
          amount = Math.round(basePrice * (Number(surcharge.surcharge_rate) / 100))
        } else if (surcharge.surcharge_fixed_jpy) {
          amount = Number(surcharge.surcharge_fixed_jpy)
        }

        // タイプ別に振り分け
        switch (surcharge.surcharge_type) {
          case 'PEAK':
            peak += amount
            break
          case 'RESIDENTIAL':
            residential += amount
            break
          case 'REMOTE_AREA':
            remote_area += amount
            break
          case 'CUSTOMS_CLEARANCE':
            customs_clearance += amount
            break
        }
      }
    }

    const total = peak + residential + remote_area + customs_clearance

    return { peak, residential, remote_area, customs_clearance, total }
  } catch (error) {
    console.error('需要サーチャージ取得エラー:', error)
    return { peak: 0, residential: 0, remote_area: 0, customs_clearance: 0, total: 0 }
  }
}

/**
 * サイズ超過料金計算
 */
async function calculateOversizeFee(
  serviceId: string,
  length: number,
  width: number,
  height: number,
  weight: number
): Promise<number> {
  try {
    const { data: rules } = await supabase
      .from('oversize_rules')
      .select('*')
      .eq('service_id', serviceId)
    
    let oversizeFee = 0
    
    rules?.forEach(rule => {
      const { rule_type, threshold_value, surcharge_jpy } = rule
      
      switch(rule_type) {
        case 'length':
        case 'OVERSIZE_LENGTH':
          if (length > threshold_value) oversizeFee += Number(surcharge_jpy) || 0
          break
        case 'width':
          if (width > threshold_value) oversizeFee += Number(surcharge_jpy) || 0
          break
        case 'height':
          if (height > threshold_value) oversizeFee += Number(surcharge_jpy) || 0
          break
        case 'weight':
        case 'OVERWEIGHT':
          if (weight > threshold_value) oversizeFee += Number(surcharge_jpy) || 0
          break
        case 'girth':
          const girth = 2 * (width + height) + length
          if (girth > threshold_value) oversizeFee += Number(surcharge_jpy) || 0
          break
      }
    })
    
    return oversizeFee
  } catch (error) {
    console.error('サイズ超過料金計算エラー:', error)
    return 0
  }
}

/**
 * 保険料計算
 */
async function calculateInsuranceFee(
  serviceId: string,
  itemValue: number
): Promise<number> {
  try {
    const { data: rates } = await supabase
      .from('insurance_rates')
      .select('*')
      .eq('service_id', serviceId)
      .lte('item_value_from_usd', itemValue)
      .gte('item_value_to_usd', itemValue)
      .limit(1)
    
    if (rates && rates.length > 0) {
      return Number(rates[0].insurance_fee_jpy) || 0
    }
    return 0
  } catch (error) {
    console.error('保険料計算エラー:', error)
    return 0
  }
}

/**
 * 署名料金取得
 */
async function getSignatureFee(serviceId: string): Promise<number> {
  try {
    const { data: fee } = await supabase
      .from('signature_fees')
      .select('fee_jpy')
      .eq('service_id', serviceId)
      .eq('is_included', false)
      .limit(1)
      .single()
    
    return Number(fee?.fee_jpy) || 0
  } catch (error) {
    console.error('署名料金取得エラー:', error)
    return 0
  }
}

/**
 * CPass料金取得（完全版 - 全追加料金含む）
 */
export async function getCPassRates(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    console.log('CPass料金取得開始:', params)
    const weightKg = params.weight_g / 1000
    
    const zoneIds = await findZonesByCountryCode(params.destination_country)
    
    if (zoneIds.length === 0) {
      console.log('対応するゾーンが見つかりません')
      return { data: [] }
    }

    console.log('対象ゾーンID:', zoneIds, '重量:', weightKg)
    
    const { data, error } = await supabase
      .from('cpass_rates')
      .select(`
        *,
        cpass_services!inner(
          service_code,
          service_name_ja,
          service_name_en
        ),
        cpass_countries!inner(
          id,
          country_code,
          country_name_ja,
          zone_code
        )
      `)
      .in('country_id', zoneIds)
      .not('cpass_services.service_code', 'in', '(ELOJI_DHL_EXPRESS,ELOJI_FEDEX_ECONOMY,ELOJI_FEDEX_ICP,ELOJI_FEDEX_IP,ELOJI_IE)')
      .lte('weight_from_kg', weightKg)
      .gte('weight_to_kg', weightKg)
      .order('rate_jpy', { ascending: true })

    if (error) {
      console.error('CPass rates SQL error:', error)
      return { error: { message: 'CPass料金の取得に失敗しました', timestamp: new Date().toISOString() } }
    }

    console.log('CPass取得データ件数:', data?.length || 0)

    const results: ShippingCalculationResult[] = []
    
    if (data && data.length > 0) {
      for (const rate of data) {
        if (!rate.cpass_services || !rate.cpass_countries) continue

        const actualWeightKg = params.weight_g / 1000
        const volumetricWeightKg = params.length_cm && params.width_cm && params.height_cm ?
          calculateVolumetricWeight(params.length_cm, params.width_cm, params.height_cm) : 0
        const chargeableWeightG = calculateChargeableWeight(actualWeightKg, volumetricWeightKg, 'CPASS') * 1000
        
        // 基本料金
        const basePrice = rate.rate_jpy
        
        // 燃油サーチャージ
        const fuelSurcharge = await getFuelSurcharge(rate.service_id.toString(), basePrice)
        
        // 需要サーチャージ（ピーク、住宅配送、遠隔地、関税手数料）
        const demandSurcharges = await getDemandSurcharges(rate.service_id.toString(), basePrice)
        
        // サイズ超過料金
        const oversizeFee = await calculateOversizeFee(
          rate.service_id.toString(),
          params.length_cm || 0,
          params.width_cm || 0,
          params.height_cm || 0,
          chargeableWeightG / 1000
        )
        
        // 保険料
        const insuranceFee = params.need_insurance ? 
          await calculateInsuranceFee(rate.service_id.toString(), params.declared_value_jpy || 0) : 0
        
        // 署名料金
        const signatureFee = params.need_signature ? 
          await getSignatureFee(rate.service_id.toString()) : 0
        
        // 合計金額
        const totalPrice = basePrice + fuelSurcharge + demandSurcharges.total + 
                          oversizeFee + insuranceFee + signatureFee
        
        results.push({
          id: `cpass_${rate.id}`,
          carrier_code: 'CPASS',
          carrier_name: 'CPass',
          service_code: rate.cpass_services.service_code,
          service_name: rate.cpass_services.service_name_ja || rate.cpass_services.service_name_en,
          zone_code: rate.cpass_countries.zone_code || rate.cpass_countries.country_code,
          zone_name: rate.cpass_countries.country_name_ja,
          weight_used_g: params.weight_g,
          volumetric_weight_g: volumetricWeightKg * 1000,
          chargeable_weight_g: chargeableWeightG,
          base_price_jpy: basePrice,
          fuel_surcharge_jpy: fuelSurcharge,
          demand_surcharge_jpy: demandSurcharges.total,
          peak_surcharge_jpy: demandSurcharges.peak,
          residential_surcharge_jpy: demandSurcharges.residential,
          remote_area_surcharge_jpy: demandSurcharges.remote_area,
          customs_clearance_jpy: demandSurcharges.customs_clearance,
          insurance_fee_jpy: insuranceFee,
          signature_fee_jpy: signatureFee,
          oversize_fee_jpy: oversizeFee,
          total_price_jpy: totalPrice,
          total_price_usd: totalPrice / USD_JPY_RATE,
          delivery_days_min: 5,
          delivery_days_max: 14,
          delivery_days_text: '5-14営業日',
          tracking: true,
          insurance_included: insuranceFee > 0,
          signature_available: true,
          max_dimensions: {},
          restrictions: [],
          warnings: [],
          source_table: 'cpass_rates',
          calculation_timestamp: new Date().toISOString()
        })
      }
    }

    console.log('CPass処理完了:', results.length, '件')
    return { data: results }
  } catch (error) {
    console.error('CPass rates catch error:', error)
    return { error: { message: 'CPass料金の取得中にエラーが発生しました', timestamp: new Date().toISOString() } }
  }
}

/**
 * Eloji料金取得（完全版 - 全追加料金含む）
 */
export async function getElojiRates(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    console.log('Eloji料金取得開始:', params)
    const weightKg = params.weight_g / 1000
    
    const zoneIds = await findZonesByCountryCode(params.destination_country)
    
    if (zoneIds.length === 0) {
      console.log('対応するゾーンが見つかりません')
      return { data: [] }
    }

    console.log('Eloji - 対象ゾーンID:', zoneIds, '重量:', weightKg)
    
    const { data, error } = await supabase
      .from('cpass_rates')
      .select(`
        *,
        cpass_services!inner(
          service_code,
          service_name_ja,
          service_name_en
        ),
        cpass_countries!inner(
          id,
          country_code,
          country_name_ja,
          zone_code
        )
      `)
      .in('country_id', zoneIds)
      .in('cpass_services.service_code', ['ELOJI_DHL_EXPRESS', 'ELOJI_FEDEX_ECONOMY', 'ELOJI_FEDEX_ICP', 'ELOJI_FEDEX_IP', 'ELOJI_IE'])
      .lte('weight_from_kg', weightKg)
      .gte('weight_to_kg', weightKg)
      .order('rate_jpy', { ascending: true })

    if (error) {
      console.error('Eloji rates SQL error:', error)
      return { error: { message: 'Eloji料金の取得に失敗しました', timestamp: new Date().toISOString() } }
    }

    console.log('Eloji取得データ件数:', data?.length || 0)

    const results: ShippingCalculationResult[] = []
    
    if (data && data.length > 0) {
      for (const rate of data) {
        if (!rate.cpass_services || !rate.cpass_countries) continue

        const actualWeightKg = params.weight_g / 1000
        const volumetricWeightKg = params.length_cm && params.width_cm && params.height_cm ?
          calculateVolumetricWeight(params.length_cm, params.width_cm, params.height_cm) : 0
        const chargeableWeightG = calculateChargeableWeight(actualWeightKg, volumetricWeightKg, 'ELOJI') * 1000
        
        // 業者判定
        let actualCarrier = 'Eloji'
        let carrierCode = 'ELOJI'
        
        if (rate.cpass_services.service_code.includes('DHL')) {
          actualCarrier = 'DHL'
          carrierCode = 'DHL'
        } else if (rate.cpass_services.service_code.includes('FEDEX')) {
          actualCarrier = 'FedEx'
          carrierCode = 'FEDEX'
        } else if (rate.cpass_services.service_code.includes('UPS')) {
          actualCarrier = 'UPS'
          carrierCode = 'UPS'
        }
        
        // 基本料金
        const basePrice = rate.rate_jpy
        
        // 燃油サーチャージ
        const fuelSurcharge = await getFuelSurcharge(rate.service_id.toString(), basePrice)
        
        // 需要サーチャージ
        const demandSurcharges = await getDemandSurcharges(rate.service_id.toString(), basePrice)
        
        // サイズ超過料金
        const oversizeFee = await calculateOversizeFee(
          rate.service_id.toString(),
          params.length_cm || 0,
          params.width_cm || 0,
          params.height_cm || 0,
          chargeableWeightG / 1000
        )
        
        // 保険料
        const insuranceFee = params.need_insurance ? 
          await calculateInsuranceFee(rate.service_id.toString(), params.declared_value_jpy || 0) : 0
        
        // 署名料金
        const signatureFee = params.need_signature ? 
          await getSignatureFee(rate.service_id.toString()) : 0
        
        // 合計金額
        const totalPrice = basePrice + fuelSurcharge + demandSurcharges.total + 
                          oversizeFee + insuranceFee + signatureFee
        
        results.push({
          id: `eloji_${rate.id}`,
          carrier_code: carrierCode,
          carrier_name: actualCarrier,
          service_code: rate.cpass_services.service_code,
          service_name: rate.cpass_services.service_name_ja || rate.cpass_services.service_name_en,
          zone_code: rate.cpass_countries.zone_code || rate.cpass_countries.country_code,
          zone_name: rate.cpass_countries.country_name_ja,
          weight_used_g: params.weight_g,
          volumetric_weight_g: volumetricWeightKg * 1000,
          chargeable_weight_g: chargeableWeightG,
          base_price_jpy: basePrice,
          fuel_surcharge_jpy: fuelSurcharge,
          demand_surcharge_jpy: demandSurcharges.total,
          peak_surcharge_jpy: demandSurcharges.peak,
          residential_surcharge_jpy: demandSurcharges.residential,
          remote_area_surcharge_jpy: demandSurcharges.remote_area,
          customs_clearance_jpy: demandSurcharges.customs_clearance,
          insurance_fee_jpy: insuranceFee,
          signature_fee_jpy: signatureFee,
          oversize_fee_jpy: oversizeFee,
          total_price_jpy: totalPrice,
          total_price_usd: totalPrice / USD_JPY_RATE,
          delivery_days_min: rate.cpass_services.service_code.includes('EXPRESS') ? 1 : 3,
          delivery_days_max: rate.cpass_services.service_code.includes('EXPRESS') ? 3 : 7,
          delivery_days_text: rate.cpass_services.service_code.includes('EXPRESS') ? '1-3営業日' : '3-7営業日',
          tracking: true,
          insurance_included: insuranceFee > 0,
          signature_available: true,
          max_dimensions: {},
          restrictions: [],
          warnings: [],
          source_table: 'cpass_rates',
          calculation_timestamp: new Date().toISOString()
        })
      }
    }

    console.log('Eloji処理完了:', results.length, '件')
    return { data: results }
  } catch (error) {
    console.error('Eloji rates catch error:', error)
    return { error: { message: 'Eloji料金の取得中にエラーが発生しました', timestamp: new Date().toISOString() } }
  }
}

/**
 * 日本郵便料金取得（既存ロジック維持）
 */
export async function getJPPostRates(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    console.log('日本郵便料金取得開始:', params)
    const weightG = params.weight_g
    const countryCode = params.destination_country

    const { data: countryZones, error: zoneError } = await supabase
      .from('shipping_country_zones')
      .select(`
        zone_id,
        shipping_countries!inner(
          country_code
        )
      `)
      .eq('shipping_countries.country_code', countryCode)

    if (zoneError || !countryZones || countryZones.length === 0) {
      console.log(`国 ${countryCode} に対応するゾーンが見つかりません`)
      return { data: [] }
    }

    const zoneIds = countryZones.map(cz => cz.zone_id)
    
    const { data, error } = await supabase
      .from('shipping_rates')
      .select(`
        id,
        service_id,
        zone_id,
        weight_from_g,
        weight_to_g,
        base_price_jpy,
        shipping_services!inner(
          service_code,
          service_name,
          service_type,
          delivery_days_min,
          delivery_days_max,
          shipping_carriers!inner(
            carrier_code,
            carrier_name
          )
        ),
        shipping_zones!inner(
          zone_code,
          zone_name
        )
      `)
      .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')
      .in('zone_id', zoneIds)
      .lte('weight_from_g', weightG)
      .gte('weight_to_g', weightG)
      .order('base_price_jpy', { ascending: true })

    if (error) {
      console.error('JP Post rates SQL error:', error)
      return { error: { message: '日本郵便料金の取得に失敗しました', timestamp: new Date().toISOString() } }
    }

    const results: ShippingCalculationResult[] = []
    
    if (data && data.length > 0) {
      for (const rate of data) {
        if (!rate.shipping_services || !rate.shipping_zones) continue

        const actualWeightKg = params.weight_g / 1000
        const volumetricWeightKg = params.length_cm && params.width_cm && params.height_cm ?
          calculateVolumetricWeight(params.length_cm, params.width_cm, params.height_cm) : 0
        const chargeableWeightG = calculateChargeableWeight(actualWeightKg, volumetricWeightKg, 'JPPOST') * 1000
        
        const basePrice = Number(rate.base_price_jpy)
        const insuranceFee = params.need_insurance ? Math.max(200, basePrice * 0.015) : 0
        const signatureFee = params.need_signature ? 460 : 0
        const totalPrice = basePrice + insuranceFee + signatureFee
        
        results.push({
          id: `jppost_${rate.id}`,
          carrier_code: 'JPPOST',
          carrier_name: '日本郵便',
          service_code: rate.shipping_services.service_code,
          service_name: rate.shipping_services.service_name,
          zone_code: rate.shipping_zones.zone_code,
          zone_name: rate.shipping_zones.zone_name || '標準ゾーン',
          weight_used_g: params.weight_g,
          volumetric_weight_g: volumetricWeightKg * 1000,
          chargeable_weight_g: chargeableWeightG,
          base_price_jpy: basePrice,
          fuel_surcharge_jpy: 0,
          demand_surcharge_jpy: 0,
          insurance_fee_jpy: insuranceFee,
          signature_fee_jpy: signatureFee,
          oversize_fee_jpy: 0,
          total_price_jpy: totalPrice,
          total_price_usd: totalPrice / USD_JPY_RATE,
          delivery_days_min: rate.shipping_services.delivery_days_min || 3,
          delivery_days_max: rate.shipping_services.delivery_days_max || 14,
          delivery_days_text: `${rate.shipping_services.delivery_days_min || 3}-${rate.shipping_services.delivery_days_max || 14}営業日`,
          tracking: rate.shipping_services.service_code === 'EMS' || rate.shipping_services.service_code.includes('REG'),
          insurance_included: rate.shipping_services.service_code.includes('REG'),
          signature_available: true,
          max_dimensions: {
            length_cm: 105,
            width_cm: 105,
            height_cm: 105
          },
          restrictions: [],
          warnings: [],
          source_table: 'shipping_rates',
          calculation_timestamp: new Date().toISOString()
        })
      }
    }

    console.log('日本郵便処理完了:', results.length, '件')
    return { data: results }
  } catch (error) {
    console.error('JP Post rates catch error:', error)
    return { error: { message: '日本郵便料金の取得中にエラーが発生しました', timestamp: new Date().toISOString() } }
  }
}

/**
 * 統合送料計算（全データソース）
 */
export async function calculateShipping(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    console.log('=== 統合送料計算開始 (V2 - 全追加料金含む) ===', params)
    
    const [cpassResponse, jpPostResponse, elojiResponse] = await Promise.all([
      getCPassRates(params),
      getJPPostRates(params),
      getElojiRates(params)
    ])

    const allResults: ShippingCalculationResult[] = []

    if (cpassResponse.data) {
      allResults.push(...cpassResponse.data)
      console.log('✅ CPass データ取得成功:', cpassResponse.data.length, '件')
    }
    
    if (jpPostResponse.data) {
      allResults.push(...jpPostResponse.data)
      console.log('✅ 日本郵便 データ取得成功:', jpPostResponse.data.length, '件')
    }
    
    if (elojiResponse.data) {
      allResults.push(...elojiResponse.data)
      console.log('✅ Eloji データ取得成功:', elojiResponse.data.length, '件')
    }

    allResults.sort((a, b) => a.total_price_jpy - b.total_price_jpy)

    console.log('=== 最終結果 ===', allResults.length, '件')
    
    return {
      data: allResults,
      meta: {
        total_count: allResults.length,
        execution_time_ms: Date.now(),
        by_carrier: allResults.reduce((acc, r) => {
          acc[r.carrier_code] = (acc[r.carrier_code] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }
  } catch (error) {
    console.error('=== 送料計算中のエラー ===', error)
    return {
      error: {
        message: '送料計算中にエラーが発生しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}
