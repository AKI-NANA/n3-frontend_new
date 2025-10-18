/**
 * 配送会社切り替えマトリックス用API
 */

import { supabase } from '@/lib/supabase'

/**
 * 配送会社別マトリックスデータ取得
 */
export async function getCarrierMatrixData(carrierType: string): Promise<APIResponse<CarrierMatrixData>> {
  try {
    console.log('配送会社別マトリックス取得:', carrierType)
    
    if (carrierType === 'JPPOST') {
      return await getJapanPostMatrix()
    } else if (carrierType.startsWith('ELOJI_')) {
      return await getElojiMatrix(carrierType)
    } else if (carrierType === 'CPASS') {
      return await getCPassMatrix()
    } else if (carrierType === 'ALL') {
      return await getAllCarriersMatrix()
    }
    
    throw new Error('未対応の配送会社: ' + carrierType)
  } catch (error) {
    console.error('配送会社別マトリックス取得エラー:', error)
    return {
      error: {
        message: '配送会社別マトリックスの取得に失敗しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * 日本郵便マトリックス取得
 */
async function getJapanPostMatrix(): Promise<APIResponse<CarrierMatrixData>> {
  const { data: zones, error: zonesError } = await supabase
    .from('shipping_zones')
    .select(`
      zone_code,
      zone_name,
      shipping_services!inner(
        service_code,
        service_name,
        shipping_carriers!inner(carrier_code)
      ),
      shipping_country_zones(
        shipping_countries(country_code, country_name)
      )
    `)
    .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')

  if (zonesError) throw zonesError

  // 重量帯を取得
  const { data: rates } = await supabase
    .from('shipping_rates')
    .select('weight_from_g, weight_to_g')
    .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')
    .order('weight_from_g')

  const weightRanges = [...new Set(
    rates?.map(r => `${r.weight_from_g}g-${r.weight_to_g}g`) || []
  )]

  // 実際の料金データを取得
  const { data: rateData } = await supabase
    .from('shipping_rates')
    .select(`
      base_price_jpy,
      weight_from_g,
      weight_to_g,
      shipping_services(service_code, service_name),
      shipping_zones(zone_code, zone_name)
    `)
    .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')

  const matrixData: CarrierMatrixData = {
    carrier_code: 'JPPOST',
    carrier_name: '日本郵便',
    weight_unit: 'g',
    weight_ranges: weightRanges.slice(0, 10), // 最初の10重量帯
    zones: zones?.map(zone => ({
      code: zone.zone_code,
      name: zone.zone_name,
      countries: zone.shipping_country_zones?.map(scz => 
        scz.shipping_countries.country_name
      ) || []
    })) || [],
    services: [...new Set(zones?.map(z => z.shipping_services.service_name))].map(name => {
      const serviceData = zones?.find(z => z.shipping_services.service_name === name)?.shipping_services
      return {
        code: serviceData?.service_code || '',
        name: name || ''
      }
    }),
    rates: rateData ? buildRatesMatrix(rateData) : {},
    generated_at: new Date().toISOString()
  }

  return { data: matrixData }
}

/**
 * Elojiマトリックス取得
 */
async function getElojiMatrix(carrierType: string): Promise<APIResponse<CarrierMatrixData>> {
  const servicePrefix = carrierType // 'ELOJI_DHL', 'ELOJI_FEDEX', etc.
  
  const { data: rates } = await supabase
    .from('cpass_rates')
    .select(`
      rate_jpy,
      weight_from_kg,
      weight_to_kg,
      cpass_services!inner(service_code, service_name_ja),
      cpass_countries!inner(country_code, country_name_ja)
    `)
    .like('cpass_services.service_code', `${servicePrefix}%`)
    .order('weight_from_kg')

  // 重量帯とゾーンを抽出
  const weightRanges = [...new Set(
    rates?.map(r => `${r.weight_from_kg}kg-${r.weight_to_kg}kg`) || []
  )]

  const zones = [...new Set(
    rates?.map(r => r.cpass_countries.country_code) || []
  )].map(code => {
    const country = rates?.find(r => r.cpass_countries.country_code === code)?.cpass_countries
    return {
      code: code,
      name: country?.country_name_ja || code,
      countries: [country?.country_name_ja || code]
    }
  })

  const matrixData: CarrierMatrixData = {
    carrier_code: carrierType.split('_')[1], // DHL, FEDEX, etc.
    carrier_name: carrierType.replace('ELOJI_', 'Eloji '),
    weight_unit: 'kg',
    weight_ranges: weightRanges.slice(0, 10),
    zones,
    services: [...new Set(rates?.map(r => r.cpass_services.service_name_ja))].map(name => {
      const serviceData = rates?.find(r => r.cpass_services.service_name_ja === name)?.cpass_services
      return {
        code: serviceData?.service_code || '',
        name: name || ''
      }
    }),
    rates: rates ? buildCPassRatesMatrix(rates) : {},
    generated_at: new Date().toISOString()
  }

  return { data: matrixData }
}

/**
 * 料金マトリックス構築ヘルパー
 */
function buildRatesMatrix(rateData: any[]): Record<string, Record<string, Record<string, number>>> {
  const matrix: Record<string, Record<string, Record<string, number>>> = {}

  rateData.forEach(rate => {
    const serviceCode = rate.shipping_services.service_code
    const zoneCode = rate.shipping_zones.zone_code
    const weightRange = `${rate.weight_from_g}g-${rate.weight_to_g}g`
    
    if (!matrix[serviceCode]) matrix[serviceCode] = {}
    if (!matrix[serviceCode][zoneCode]) matrix[serviceCode][zoneCode] = {}
    
    matrix[serviceCode][zoneCode][weightRange] = parseFloat(rate.base_price_jpy)
  })

  return matrix
}

function buildCPassRatesMatrix(rateData: any[]): Record<string, Record<string, Record<string, number>>> {
  const matrix: Record<string, Record<string, Record<string, number>>> = {}

  rateData.forEach(rate => {
    const serviceCode = rate.cpass_services.service_code
    const zoneCode = rate.cpass_countries.country_code
    const weightRange = `${rate.weight_from_kg}kg-${rate.weight_to_kg}kg`
    
    if (!matrix[serviceCode]) matrix[serviceCode] = {}
    if (!matrix[serviceCode][zoneCode]) matrix[serviceCode][zoneCode] = {}
    
    matrix[serviceCode][zoneCode][weightRange] = rate.rate_jpy
  })

  return matrix
}

// 型定義
interface CarrierMatrixData {
  carrier_code: string
  carrier_name: string
  weight_unit: 'g' | 'kg'
  weight_ranges: string[]
  zones: Array<{
    code: string
    name: string
    countries: string[]
  }>
  services: Array<{
    code: string
    name: string
  }>
  rates: Record<string, Record<string, Record<string, number>>>
  generated_at: string
}
