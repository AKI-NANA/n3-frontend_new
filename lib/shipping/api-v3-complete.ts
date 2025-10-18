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
  countryCode: string
): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('cpass_zone_countries')
      .select('zone_id, cpass_countries!inner(id, country_code)')
      .eq('country_code', countryCode)

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
 * 燃油サーチャージを計算（サービス情報から）
 */
function calculateFuelSurcharge(
  basePrice: number,
  fuelSurchargeRate: number | null,
  isIncluded: boolean
): number {
  // 既に含まれている場合は0
  if (isIncluded) return 0
  
  // レートがnullの場合は0
  if (!fuelSurchargeRate) return 0
  
  // パーセント計算
  return Math.round(basePrice * (Number(fuelSurchargeRate) / 100))
}

/**
 * 通関手数料計算（MPF: Merchandise Processing Fee）
 * 
 * 【商業貨物（$2,500以上）】
 * - FOB価格（送料のみ）の0.3464%
 * - 最低$32.71、最高$634.62（2024年10月1日以降）
 * 
 * 【小口貨物（$2,500未満）】
 * - 自動化処理: $2.62
 * - 手動処理: $2.62 + $3.93 = $6.55
 * - 郵便物: $7.20
 * 
 * ※ 商品価格は含まない
 * ※ デミニミス$800免税は2025年8月29日に廃止済み
 * ※ 現在はすべての商品に関税が発生
 */
function calculateCustomsClearanceFee(
  shippingPriceJpy: number,
  isCommercial: boolean = true // true: 商業貨物（$2,500以上）, false: 小口貨物
): number {
  const shippingPriceUsd = shippingPriceJpy / USD_JPY_RATE
  
  // 小口貨物（$2,500未満）の場合は固定料金
  if (!isCommercial || shippingPriceUsd < 2500) {
    // 自動化処理: $2.62
    return Math.round(2.62 * USD_JPY_RATE)
  }
  
  // 商業貨物の場合は0.3464%で計算
  const feeUsd = shippingPriceUsd * 0.003464
  
  // 2024年10月1日以降の料金
  const cappedFeeUsd = Math.max(32.71, Math.min(634.62, feeUsd))
  
  return Math.round(cappedFeeUsd * USD_JPY_RATE)
}

// ⚠️ 商品の関税・消費税計算は削除
// 理由: 品目・原産国・価格に依存するため、別ツールで計算すべき

/**
 * 保険料計算（デフォルトで常に計算）
 */
function calculateInsuranceFee(declaredValue: number): number {
  // 申告価格がない場合は¥10,000と仮定
  const value = declaredValue || 10000
  
  // 申告価格の0.5%、最低500円
  return Math.max(500, Math.round(value * 0.005))
}

/**
 * 署名料金（デフォルトで常に発生）
 */
function getSignatureFee(): number {
  // 常に¥500
  return 500
}

/**
 * ピークサーチャージ（常に計算して表示）
 * 繁忙期想定: 11月〜1月は12%
 */
function calculatePeakSurcharge(basePrice: number, currentMonth: number = new Date().getMonth() + 1): number {
  // 常に12%で計算（繁忙期想定）
  return Math.round(basePrice * 0.12)
}

/**
 * 住宅配送サーチャージ（常に計算して表示）
 * Elojiのみ¥210、それ以外は¥0
 */
function getResidentialSurcharge(carrierCode: string): number {
  // 常に計算（住宅配送想定）
  if (carrierCode.includes('ELOJI')) {
    return 210
  }
  return 0
}

/**
 * 遠隔地サーチャージ（常に計算して表示）
 * 固定¥850
 */
function getRemoteAreaSurcharge(): number {
  // 常に計算（遠隔地想定）
  return 850
}

/**
 * CPass & Eloji料金取得（完全版）
 */
export async function getCPassAndElojiRates(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    console.log('CPass&Eloji料金取得開始:', params)
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
          id,
          service_code,
          service_name_ja,
          service_name_en,
          fuel_surcharge_included,
          fuel_surcharge_rate,
          fuel_surcharge_discount_rate
        ),
        cpass_countries!inner(
          id,
          country_code,
          country_name_ja,
          zone_code
        )
      `)
      .in('country_id', zoneIds)
      .lte('weight_from_kg', weightKg)
      .gte('weight_to_kg', weightKg)
      .order('rate_jpy', { ascending: true })

    if (error) {
      console.error('CPass rates SQL error:', error)
      return { error: { message: 'CPass料金の取得に失敗しました', timestamp: new Date().toISOString() } }
    }

    console.log('取得データ件数:', data?.length || 0)

    const results: ShippingCalculationResult[] = []
    
    if (data && data.length > 0) {
      for (const rate of data) {
        if (!rate.cpass_services || !rate.cpass_countries) continue

        const service = rate.cpass_services
        const actualWeightKg = params.weight_g / 1000
        const volumetricWeightKg = params.length_cm && params.width_cm && params.height_cm ?
          calculateVolumetricWeight(params.length_cm, params.width_cm, params.height_cm) : 0
        const chargeableWeightG = calculateChargeableWeight(actualWeightKg, volumetricWeightKg, 'CPASS') * 1000
        
        // 業者判定
        let carrierName = 'CPass'
        let carrierCode = 'CPASS'
        let isEloji = false
        
        if (service.service_code.startsWith('ELOJI_')) {
          isEloji = true
          if (service.service_code.includes('DHL')) {
            carrierName = 'Eloji DHL'
            carrierCode = 'ELOJI_DHL'
          } else if (service.service_code.includes('FEDEX')) {
            carrierName = 'Eloji FedEx'
            carrierCode = 'ELOJI_FEDEX'
          } else if (service.service_code.includes('UPS')) {
            carrierName = 'Eloji UPS'
            carrierCode = 'ELOJI_UPS'
          } else {
            carrierName = 'Eloji'
            carrierCode = 'ELOJI'
          }
        } else if (service.service_code.includes('SPEEDPAK')) {
          carrierName = 'SpeedPAK'
          carrierCode = 'SPEEDPAK'
        }
        
        // 基本料金
        let basePrice = rate.rate_jpy
        
        // 割引適用（ElojiのDHLは25%割引）
        if (isEloji && service.service_code.includes('DHL') && service.fuel_surcharge_discount_rate) {
          const discountRate = Number(service.fuel_surcharge_discount_rate) / 100
          const discount = Math.round(basePrice * discountRate)
          basePrice = basePrice - discount
          console.log(`[割引] ${service.service_code}: 元価格¥${rate.rate_jpy} → 割引後¥${basePrice} (${service.fuel_surcharge_discount_rate}%割引)`)
        }
        
        // 燃油サーチャージ
        const fuelSurcharge = calculateFuelSurcharge(
          basePrice,
          service.fuel_surcharge_rate,
          service.fuel_surcharge_included
        )
        
        // 通関手数料（送料ベース）
        const customsClearanceFee = calculateCustomsClearanceFee(basePrice + fuelSurcharge)
        
        // ピークサーチャージ
        const peakSurcharge = calculatePeakSurcharge(basePrice + fuelSurcharge)
        
        // 住宅配送サーチャージ
        const residentialSurcharge = getResidentialSurcharge(carrierCode)
        
        // 遠隔地サーチャージ
        const remoteAreaSurcharge = getRemoteAreaSurcharge()
        
        // 保険料（デフォルトで常に計算）
        const insuranceFee = calculateInsuranceFee(params.declared_value_jpy || 0)
        
        // 署名料金（デフォルトで常に発生）
        const signatureFee = getSignatureFee()
        
        // 合計金額（送料関連のみ）
        const totalPrice = (
          basePrice +
          fuelSurcharge +
          customsClearanceFee +
          insuranceFee +
          signatureFee +
          peakSurcharge +
          residentialSurcharge +
          remoteAreaSurcharge
        )
        
        results.push({
          id: `cpass_${rate.id}`,
          carrier_code: carrierCode,
          carrier_name: carrierName,
          service_code: service.service_code,
          service_name: service.service_name_ja || service.service_name_en,
          zone_code: rate.cpass_countries.zone_code || rate.cpass_countries.country_code,
          zone_name: rate.cpass_countries.country_name_ja,
          weight_used_g: params.weight_g,
          volumetric_weight_g: volumetricWeightKg * 1000,
          chargeable_weight_g: chargeableWeightG,
          base_price_jpy: basePrice,
          fuel_surcharge_jpy: fuelSurcharge,
          demand_surcharge_jpy: 0,
          peak_surcharge_jpy: peakSurcharge,
          residential_surcharge_jpy: residentialSurcharge,
          remote_area_surcharge_jpy: remoteAreaSurcharge,
          customs_clearance_jpy: customsClearanceFee,
          declared_value_jpy: params.declared_value_jpy || 0,
          insurance_fee_jpy: insuranceFee,
          signature_fee_jpy: signatureFee,
          oversize_fee_jpy: 0,
          total_price_jpy: totalPrice,
          total_price_usd: totalPrice / USD_JPY_RATE,
          delivery_days_min: service.service_code.includes('EXPRESS') ? 1 : 5,
          delivery_days_max: service.service_code.includes('EXPRESS') ? 3 : 14,
          delivery_days_text: service.service_code.includes('EXPRESS') ? '1-3営業日' : '5-14営業日',
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

    console.log('処理完了:', results.length, '件')
    return { data: results }
  } catch (error) {
    console.error('CPass rates catch error:', error)
    return { error: { message: 'CPass料金の取得中にエラーが発生しました', timestamp: new Date().toISOString() } }
  }
}

/**
 * 日本郵便料金取得
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
        
        // 通関手数料
        const customsClearanceFee = calculateCustomsClearanceFee(basePrice)
        
        // 保険・署名（デフォルトで常に計算）
        const insuranceFee = calculateInsuranceFee(params.declared_value_jpy || 0)
        const signatureFee = getSignatureFee()
        
        // ピーク・遠隔地
        const peakSurcharge = calculatePeakSurcharge(basePrice)
        const remoteAreaSurcharge = getRemoteAreaSurcharge()
        
        const totalPrice = (
          basePrice +
          customsClearanceFee +
          insuranceFee +
          signatureFee +
          peakSurcharge +
          remoteAreaSurcharge
        )
        
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
          peak_surcharge_jpy: peakSurcharge,
          residential_surcharge_jpy: 0,
          remote_area_surcharge_jpy: remoteAreaSurcharge,
          customs_clearance_jpy: customsClearanceFee,
          declared_value_jpy: params.declared_value_jpy || 0,
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
    console.log('=== 統合送料計算開始 (V3-Complete - 全追加料金正確計算) ===', params)
    
    const [cpassResponse, jpPostResponse] = await Promise.all([
      getCPassAndElojiRates(params),
      getJPPostRates(params)
    ])

    const allResults: ShippingCalculationResult[] = []

    if (cpassResponse.data) {
      allResults.push(...cpassResponse.data)
      console.log('✅ CPass&Eloji データ取得成功:', cpassResponse.data.length, '件')
    }
    
    if (jpPostResponse.data) {
      allResults.push(...jpPostResponse.data)
      console.log('✅ 日本郵便 データ取得成功:', jpPostResponse.data.length, '件')
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
