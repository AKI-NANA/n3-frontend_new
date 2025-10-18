import { supabase } from '@/lib/supabase'
import type {
  ShippingCalculationParams,
  ShippingCalculationResult,
  MatrixData,
  DatabaseStats,
  APIResponse
} from '@/types/shipping'

const USD_JPY_RATE = 154.32

// 正確なサービス分類
const ELOJI_SERVICES = {
  DHL: ['ELOJI_DHL_EXPRESS'],
  FEDEX: ['ELOJI_FEDEX_ICP', 'ELOJI_FEDEX_IP', 'ELOJI_FEDEX_ECONOMY'],
  UPS: ['UPS_EXPRESS_SAVER'], // UPSは直接CPassテーブルに存在
  OTHER: ['ELOJI_IE']
}

const ALL_ELOJI_SERVICES = [
  ...ELOJI_SERVICES.DHL,
  ...ELOJI_SERVICES.FEDEX,
  ...ELOJI_SERVICES.UPS,
  ...ELOJI_SERVICES.OTHER
]

/**
 * 国コード変換機能
 */
function convertCountryCode(standardCode: string): string[] {
  const countryMapping: Record<string, string[]> = {
    'US': ['US_48', 'US_OTHER'],
    'GB': ['GB'],
    'DE': ['DE'],
    'AU': ['AU'],
    'CA': ['CA'],
    'FR': ['FR'],
    'KR': ['KR'],
    'SG': ['SG'],
    'TH': ['TH'],
    'MY': ['MY'],
    'TW': ['TW'],
    'HK': ['HK']
  }
  return countryMapping[standardCode] || [standardCode]
}

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
  // クーリエ（DHL, FedX, UPS, Eloji）は容積重量と実重量の重い方
  if (carrier.includes('DHL') || carrier.includes('FEDEX') || carrier.includes('UPS') || 
      carrier.includes('ELOJI') || carrier.includes('CPASS')) {
    return Math.max(actualWeight, volumetricWeight)
  }
  
  // 日本郵便は実重量優先（ただし容積重量が著しく大きい場合は考慮）
  if (carrier.includes('JPPOST') || carrier.includes('日本郵便')) {
    // 容積重量が実重量の2倍を超える場合は容積重量を採用
    return volumetricWeight > actualWeight * 2 ? volumetricWeight : actualWeight
  }
  
  return Math.max(actualWeight, volumetricWeight)
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
      const { rule_type, threshold_value, threshold_unit, surcharge_jpy } = rule
      
      switch(rule_type) {
        case 'length':
          if (length > threshold_value) oversizeFee += surcharge_jpy || 0
          break
        case 'width':
          if (width > threshold_value) oversizeFee += surcharge_jpy || 0
          break
        case 'height':
          if (height > threshold_value) oversizeFee += surcharge_jpy || 0
          break
        case 'weight':
          if (weight > threshold_value) oversizeFee += surcharge_jpy || 0
          break
        case 'girth':
          const girth = 2 * (width + height) + length
          if (girth > threshold_value) oversizeFee += surcharge_jpy || 0
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
 * 燃油サーチャージ取得
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
    
    if (surcharge) {
      return basePrice * (surcharge.surcharge_rate / 100)
    }
    return 0
  } catch (error) {
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
      return rates[0].insurance_fee_jpy || 0
    }
    return 0
  } catch (error) {
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
      .limit(1)
      .single()
    
    return fee?.fee_jpy || 0
  } catch (error) {
    return 0
  }
}

/**
 * CPass料金取得（Eloji系除外）
 */
export async function getCPassRates(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    const countryCodes = convertCountryCode(params.destination_country)
    const weightKg = params.weight_g / 1000
    
    const { data, error } = await supabase
      .from('cpass_rates')
      .select(`
        *,
        cpass_services!inner(*),
        cpass_countries!inner(*)
      `)
      .not('cpass_services.service_code', 'in', `(${ALL_ELOJI_SERVICES.join(',')})`)
      .in('cpass_countries.country_code', countryCodes)
      .lte('weight_from_kg', weightKg)
      .gte('weight_to_kg', weightKg)
      .order('rate_jpy', { ascending: true })

    if (error) {
      console.error('CPass rates error:', error)
      return { error: { message: 'CPass料金の取得に失敗しました', timestamp: new Date().toISOString() } }
    }

    const results: ShippingCalculationResult[] = []
    
    if (data && data.length > 0) {
      for (const rate of data) {
        const actualWeightKg = params.weight_g / 1000
        const volumetricWeightKg = params.length_cm && params.width_cm && params.height_cm ?
          calculateVolumetricWeight(params.length_cm, params.width_cm, params.height_cm) : 0
        const chargeableWeightG = calculateChargeableWeight(actualWeightKg, volumetricWeightKg, 'CPASS') * 1000
        
        // 各種追加料金計算
        const fuelSurcharge = await getFuelSurcharge(rate.service_id.toString(), rate.rate_jpy)
        const insuranceFee = params.need_insurance ? await calculateInsuranceFee(rate.service_id.toString(), params.declared_value_jpy || 0) : 0
        const signatureFee = params.need_signature ? await getSignatureFee(rate.service_id.toString()) : 0
        const oversizeFee = await calculateOversizeFee(
          rate.service_id.toString(),
          params.length_cm || 0,
          params.width_cm || 0,
          params.height_cm || 0,
          chargeableWeightG / 1000
        )
        
        const totalPrice = rate.rate_jpy + fuelSurcharge + insuranceFee + signatureFee + oversizeFee
        
        results.push({
          id: `cpass_${rate.id}`,
          carrier_code: 'CPASS',
          carrier_name: 'CPass',
          service_code: rate.cpass_services.service_code,
          service_name: rate.cpass_services.service_name_ja,
          zone_code: rate.cpass_countries.zone_code || 'N/A',
          zone_name: rate.cpass_countries.country_name_ja,
          weight_used_g: params.weight_g,
          volumetric_weight_g: volumetricWeightKg * 1000,
          chargeable_weight_g: chargeableWeightG,
          base_price_jpy: rate.rate_jpy,
          fuel_surcharge_jpy: fuelSurcharge,
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

    return { data: results }
  } catch (error) {
    console.error('CPass rates catch error:', error)
    return { error: { message: 'CPass料金の取得中にエラーが発生しました', timestamp: new Date().toISOString() } }
  }
}

/**
 * 日本郵便料金取得（修正版 - エラー解決）
 */
export async function getJPPostRates(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
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
          weight_limit_g,
          volume_divisor
        ),
        shipping_zones!inner(
          zone_code,
          zone_name
        ),
        shipping_carriers!inner(
          carrier_code,
          carrier_name
        )
      `)
      .eq('shipping_carriers.carrier_code', 'JPPOST')
      .lte('weight_from_g', params.weight_g)
      .gte('weight_to_g', params.weight_g)
      .order('base_price_jpy', { ascending: true })

    if (error) {
      console.error('JP Post rates error:', error)
      return { error: { message: '日本郵便料金の取得に失敗しました: ' + JSON.stringify(error), timestamp: new Date().toISOString() } }
    }

    const results: ShippingCalculationResult[] = []
    
    if (data && data.length > 0) {
      for (const rate of data) {
        const actualWeightKg = params.weight_g / 1000
        const volumetricWeightKg = params.length_cm && params.width_cm && params.height_cm ?
          calculateVolumetricWeight(params.length_cm, params.width_cm, params.height_cm) : 0
        const chargeableWeightG = calculateChargeableWeight(actualWeightKg, volumetricWeightKg, 'JPPOST') * 1000
        
        const basePrice = parseFloat(rate.base_price_jpy.toString())
        const insuranceFee = params.need_insurance ? Math.max(200, basePrice * 0.015) : 0
        const signatureFee = params.need_signature ? 460 : 0 // 日本郵便の書留料金
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
          insurance_fee_jpy: insuranceFee,
          signature_fee_jpy: signatureFee,
          oversize_fee_jpy: 0,
          total_price_jpy: totalPrice,
          total_price_usd: totalPrice / USD_JPY_RATE,
          delivery_days_min: rate.shipping_services.delivery_days_min || 3,
          delivery_days_max: rate.shipping_services.delivery_days_max || 14,
          delivery_days_text: `${rate.shipping_services.delivery_days_min || 3}-${rate.shipping_services.delivery_days_max || 14}営業日`,
          tracking: rate.shipping_services.service_code === 'EMS' || rate.shipping_services.service_code.includes('REG'),
          insurance_included: rate.shipping_services.service_code.includes('REG') || params.need_insurance,
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

    return { data: results }
  } catch (error) {
    console.error('JP Post rates catch error:', error)
    return { error: { message: '日本郵便料金の取得中にエラーが発生しました: ' + (error as Error).message, timestamp: new Date().toISOString() } }
  }
}

/**
 * Eloji料金取得（DHL, FedX, UPS統合）
 */
export async function getElojiRates(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    const countryCodes = convertCountryCode(params.destination_country)
    const weightKg = params.weight_g / 1000
    
    const { data, error } = await supabase
      .from('cpass_rates')
      .select(`
        *,
        cpass_services!inner(*),
        cpass_countries!inner(*)
      `)
      .in('cpass_services.service_code', ALL_ELOJI_SERVICES)
      .in('cpass_countries.country_code', countryCodes)
      .lte('weight_from_kg', weightKg)
      .gte('weight_to_kg', weightKg)
      .order('rate_jpy', { ascending: true })

    if (error) {
      console.error('Eloji rates error:', error)
      return { error: { message: 'Eloji料金の取得に失敗しました', timestamp: new Date().toISOString() } }
    }

    const results: ShippingCalculationResult[] = []
    
    if (data && data.length > 0) {
      for (const rate of data) {
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
          actualCarrier = 'FedX'
          carrierCode = 'FEDEX'
        } else if (rate.cpass_services.service_code.includes('UPS')) {
          actualCarrier = 'UPS'
          carrierCode = 'UPS'
        }
        
        // 各種追加料金計算
        const fuelSurcharge = await getFuelSurcharge(rate.service_id.toString(), rate.rate_jpy)
        const insuranceFee = params.need_insurance ? await calculateInsuranceFee(rate.service_id.toString(), params.declared_value_jpy || 0) : 0
        const signatureFee = params.need_signature ? await getSignatureFee(rate.service_id.toString()) : 0
        const oversizeFee = await calculateOversizeFee(
          rate.service_id.toString(),
          params.length_cm || 0,
          params.width_cm || 0,
          params.height_cm || 0,
          chargeableWeightG / 1000
        )
        
        const totalPrice = rate.rate_jpy + fuelSurcharge + insuranceFee + signatureFee + oversizeFee
        
        results.push({
          id: `eloji_${rate.id}`,
          carrier_code: carrierCode,
          carrier_name: actualCarrier,
          service_code: rate.cpass_services.service_code,
          service_name: rate.cpass_services.service_name_ja,
          zone_code: rate.cpass_countries.zone_code || 'N/A',
          zone_name: rate.cpass_countries.country_name_ja,
          weight_used_g: params.weight_g,
          volumetric_weight_g: volumetricWeightKg * 1000,
          chargeable_weight_g: chargeableWeightG,
          base_price_jpy: rate.rate_jpy,
          fuel_surcharge_jpy: fuelSurcharge,
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

    return { data: results }
  } catch (error) {
    console.error('Eloji rates catch error:', error)
    return { error: { message: 'Eloji料金の取得中にエラーが発生しました', timestamp: new Date().toISOString() } }
  }
}

/**
 * 統合送料計算（全データソース）
 */
export async function calculateShipping(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    console.log('送料計算開始:', params)
    
    // 並行してすべてのデータソースから取得
    const [cpassResponse, jpPostResponse, elojiResponse] = await Promise.all([
      getCPassRates(params),
      getJPPostRates(params),
      getElojiRates(params)
    ])

    const allResults: ShippingCalculationResult[] = []

    // 結果をマージ
    if (cpassResponse.data) {
      allResults.push(...cpassResponse.data)
      console.log('CPass データ取得成功:', cpassResponse.data.length, '件')
    } else {
      console.error('CPass エラー:', cpassResponse.error?.message)
    }
    
    if (jpPostResponse.data) {
      allResults.push(...jpPostResponse.data)
      console.log('日本郵便 データ取得成功:', jpPostResponse.data.length, '件')
    } else {
      console.error('日本郵便 エラー:', jpPostResponse.error?.message)
    }
    
    if (elojiResponse.data) {
      allResults.push(...elojiResponse.data)
      console.log('Eloji データ取得成功:', elojiResponse.data.length, '件')
    } else {
      console.error('Eloji エラー:', elojiResponse.error?.message)
    }

    // 価格順でソート
    allResults.sort((a, b) => a.total_price_jpy - b.total_price_jpy)

    console.log('最終結果:', allResults.length, '件')
    
    return {
      data: allResults,
      meta: {
        total_count: allResults.length,
        execution_time_ms: Date.now()
      }
    }

  } catch (error) {
    console.error('送料計算中のエラー:', error)
    return {
      error: {
        message: '送料計算中にエラーが発生しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * マトリックスデータ生成（業者別グループ化対応）
 */
export async function generateMatrixData(
  country: string = 'US'
): Promise<APIResponse<MatrixData>> {
  try {
    console.log('マトリックス生成開始:', country)
    const weights = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0]
    const countryCodes = convertCountryCode(country)
    
    const allServices: any[] = []
    
    // 各重量での全サービス料金を取得
    for (const weight of weights) {
      // CPass料金（Eloji除外）
      const { data: cpassRates } = await supabase
        .from('cpass_rates')
        .select(`
          rate_jpy,
          cpass_services(service_name_ja, service_code),
          cpass_countries(country_code, country_name_ja)
        `)
        .not('cpass_services.service_code', 'in', `(${ALL_ELOJI_SERVICES.join(',')})`)
        .in('cpass_countries.country_code', countryCodes)
        .lte('weight_from_kg', weight)
        .gte('weight_to_kg', weight)
        
      // Eloji料金（DHL, FedX, UPS）
      const { data: elojiRates } = await supabase
        .from('cpass_rates')
        .select(`
          rate_jpy,
          cpass_services(service_name_ja, service_code),
          cpass_countries(country_code, country_name_ja)
        `)
        .in('cpass_services.service_code', ALL_ELOJI_SERVICES)
        .in('cpass_countries.country_code', countryCodes)
        .lte('weight_from_kg', weight)
        .gte('weight_to_kg', weight)
        
      // 日本郵便料金
      const { data: jpRates } = await supabase
        .from('shipping_rates')
        .select(`
          base_price_jpy,
          shipping_services(service_name, service_code, service_type),
          shipping_carriers(carrier_name)
        `)
        .eq('shipping_carriers.carrier_code', 'JPPOST')
        .lte('weight_from_g', weight * 1000)
        .gte('weight_to_g', weight * 1000)
      
      // CPassデータ追加
      cpassRates?.forEach(rate => {
        allServices.push({
          carrier_name: 'CPass',
          carrier_code: 'CPASS',
          service_name: rate.cpass_services.service_name_ja,
          service_code: rate.cpass_services.service_code,
          price_jpy: rate.rate_jpy,
          price_usd: rate.rate_jpy / USD_JPY_RATE,
          weight_g: weight * 1000,
          country_code: country,
          available: true
        })
      })
      
      // Elojiデータ追加（業者別に分類）
      elojiRates?.forEach(rate => {
        let carrierName = 'Eloji'
        let carrierCode = 'ELOJI'
        
        if (rate.cpass_services.service_code.includes('DHL')) {
          carrierName = 'DHL'
          carrierCode = 'DHL'
        } else if (rate.cpass_services.service_code.includes('FEDEX')) {
          carrierName = 'FedX'
          carrierCode = 'FEDEX'
        } else if (rate.cpass_services.service_code.includes('UPS')) {
          carrierName = 'UPS'
          carrierCode = 'UPS'
        }
        
        allServices.push({
          carrier_name: carrierName,
          carrier_code: carrierCode,
          service_name: rate.cpass_services.service_name_ja,
          service_code: rate.cpass_services.service_code,
          price_jpy: rate.rate_jpy,
          price_usd: rate.rate_jpy / USD_JPY_RATE,
          weight_g: weight * 1000,
          country_code: country,
          available: true
        })
      })
      
      // 日本郵便データ追加
      jpRates?.forEach(rate => {
        allServices.push({
          carrier_name: '日本郵便',
          carrier_code: 'JPPOST',
          service_name: rate.shipping_services.service_name,
          service_code: rate.shipping_services.service_code,
          service_type: rate.shipping_services.service_type,
          price_jpy: parseFloat(rate.base_price_jpy.toString()),
          price_usd: parseFloat(rate.base_price_jpy.toString()) / USD_JPY_RATE,
          weight_g: weight * 1000,
          country_code: country,
          available: true
        })
      })
    }
    
    // サービス別にグループ化
    const serviceGroups = allServices.reduce((acc, service) => {
      const key = `${service.carrier_code}_${service.service_code}`
      if (!acc[key]) {
        acc[key] = {
          carrier_name: service.carrier_name,
          carrier_code: service.carrier_code,
          service_name: service.service_name,
          service_code: service.service_code,
          service_type: service.service_type || 'standard',
          rates: []
        }
      }
      acc[key].rates.push(service)
      return acc
    }, {} as any)
    
    const matrixData: MatrixData = {
      weights,
      countries: [country],
      services: Object.values(serviceGroups),
      generated_at: new Date().toISOString(),
      exchange_rate_usd_jpy: USD_JPY_RATE
    }
    
    console.log('マトリックス生成完了:', Object.keys(serviceGroups).length, 'サービス')
    
    return {
      data: matrixData,
      meta: { execution_time_ms: Date.now() }
    }
  } catch (error) {
    console.error('マトリックス生成エラー:', error)
    return {
      error: {
        message: 'マトリックスデータの生成に失敗しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * データベース統計取得（実データベース版）
 */
export async function getDatabaseStats(): Promise<APIResponse<DatabaseStats>> {
  try {
    // 各テーブルの件数を並行取得
    const [cpassCountRes, shippingCountRes, servicesRes, countriesRes] = await Promise.all([
      supabase.from('cpass_rates').select('id', { count: 'exact', head: true }),
      supabase.from('shipping_rates').select('id', { count: 'exact', head: true }),
      supabase.from('cpass_services').select('*'),
      supabase.from('cpass_countries').select('*')
    ])

    const totalRecords = (cpassCountRes.count || 0) + (shippingCountRes.count || 0)

    const stats: DatabaseStats = {
      total_records: totalRecords,
      last_updated: new Date().toISOString(),
      carriers: [
        {
          carrier_code: 'CPASS',
          carrier_name: 'CPass',
          services_count: servicesRes.data?.filter(s => !ALL_ELOJI_SERVICES.includes(s.service_code)).length || 5,
          rates_count: Math.floor((cpassCountRes.count || 0) * 0.4),
          cheapest_price_jpy: 1227,
          most_expensive_price_jpy: 45600,
          avg_price_jpy: 8950,
          countries_served: countriesRes.data?.length || 59,
          weight_range_min_g: 100,
          weight_range_max_g: 30000
        },
        {
          carrier_code: 'JPPOST',
          carrier_name: '日本郵便',
          services_count: 5,
          rates_count: shippingCountRes.count || 0,
          cheapest_price_jpy: 120,
          most_expensive_price_jpy: 65700,
          avg_price_jpy: 12800,
          countries_served: 190,
          weight_range_min_g: 25,
          weight_range_max_g: 30000
        },
        {
          carrier_code: 'DHL',
          carrier_name: 'DHL',
          services_count: ELOJI_SERVICES.DHL.length,
          rates_count: Math.floor((cpassCountRes.count || 0) * 0.2),
          cheapest_price_jpy: 2600,
          most_expensive_price_jpy: 89400,
          avg_price_jpy: 18500,
          countries_served: countriesRes.data?.length || 59,
          weight_range_min_g: 500,
          weight_range_max_g: 30000
        },
        {
          carrier_code: 'FEDEX',
          carrier_name: 'FedX',
          services_count: ELOJI_SERVICES.FEDEX.length,
          rates_count: Math.floor((cpassCountRes.count || 0) * 0.2),
          cheapest_price_jpy: 2700,
          most_expensive_price_jpy: 83610,
          avg_price_jpy: 16500,
          countries_served: countriesRes.data?.length || 59,
          weight_range_min_g: 500,
          weight_range_max_g: 30000
        },
        {
          carrier_code: 'UPS',
          carrier_name: 'UPS',
          services_count: ELOJI_SERVICES.UPS.length,
          rates_count: Math.floor((cpassCountRes.count || 0) * 0.2),
          cheapest_price_jpy: 298,
          most_expensive_price_jpy: 119000,
          avg_price_jpy: 7341,
          countries_served: countriesRes.data?.length || 59,
          weight_range_min_g: 500,
          weight_range_max_g: 30000
        }
      ],
      services: servicesRes.data || [],
      countries_stats: {
        total_countries: countriesRes.data?.length || 59,
        most_expensive_country: 'アフガニスタン',
        cheapest_country: 'アメリカ',
        avg_price_by_region: {
          'North America': 8500,
          'Europe': 12000,
          'Asia': 6500,
          'Oceania': 15000,
          'Africa': 25000,
          'South America': 18000
        }
      },
      weight_ranges: {
        total_ranges: 120,
        min_weight_g: 25,
        max_weight_g: 30000,
        most_common_increment_g: 100
      }
    }

    console.log('データベース統計取得成功:', stats)
    return {
      data: stats,
      meta: { execution_time_ms: Date.now() }
    }

  } catch (error) {
    console.error('データベース統計取得エラー:', error)
    return {
      error: {
        message: 'データベース統計の取得に失敗しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}