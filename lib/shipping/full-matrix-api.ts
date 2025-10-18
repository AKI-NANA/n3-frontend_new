/**
 * 実データベース全データ取得API
 * 
 * 仕様：
 * - CPass: 999kg, 234重量帯
 * - 日本郵便: 30kg, 32重量帯
 * - 全データを取得してマトリックス表示
 */

import { supabase } from '@/lib/supabase'

const USD_JPY_RATE = 154.32

/**
 * 配送会社別全マトリックスデータ取得
 */
export async function getFullCarrierMatrix(carrierType: string): Promise<APIResponse<FullMatrixData>> {
  try {
    console.log('=== 全マトリックスデータ取得開始 ===', carrierType)
    
    if (carrierType === 'JPPOST') {
      return await getJapanPostFullMatrix()
    } else if (carrierType.startsWith('ELOJI_')) {
      return await getElojiFullMatrix(carrierType)
    } else if (carrierType.startsWith('CPASS_') || carrierType.startsWith('DIRECT_')) {
      return await getCPassFullMatrix(carrierType)
    }
    
    throw new Error('未対応の配送会社: ' + carrierType)
  } catch (error) {
    console.error('全マトリックス取得エラー:', error)
    return {
      error: {
        message: '全マトリックスデータの取得に失敗しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * 日本郵便全マトリックス取得
 */
async function getJapanPostFullMatrix(): Promise<APIResponse<FullMatrixData>> {
  console.log('日本郵便全データ取得開始')
  
  // 全ゾーン取得
  const { data: zones, error: zonesError } = await supabase
    .from('shipping_zones')
    .select(`
      id,
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
  
  // 全重量帯取得
  const { data: allRates, error: ratesError } = await supabase
    .from('shipping_rates')
    .select(`
      id,
      weight_from_g,
      weight_to_g,
      base_price_jpy,
      shipping_services!inner(
        service_code,
        service_name,
        shipping_carriers!inner(carrier_code)
      ),
      shipping_zones!inner(
        zone_code,
        zone_name
      )
    `)
    .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')
    .order('weight_from_g')
    
  if (ratesError) throw ratesError
  
  console.log('日本郵便データ取得完了:', allRates?.length, '件')
  
  // 重量帯を生成
  const weightRanges = [...new Set(
    allRates?.map(r => `${r.weight_from_g}g-${r.weight_to_g}g`) || []
  )].sort((a, b) => {
    const aWeight = parseInt(a.split('g-')[0])
    const bWeight = parseInt(b.split('g-')[0])
    return aWeight - bWeight
  })
  
  // ゾーンデータを整理
  const zoneData = zones?.map(zone => ({
    code: zone.zone_code,
    name: zone.zone_name,
    countries: zone.shipping_country_zones?.map(scz => 
      scz.shipping_countries?.country_name
    ).filter(Boolean) || []
  })) || []
  
  // サービスデータを整理
  const services = [...new Set(zones?.map(z => z.shipping_services.service_name))].map(name => {
    const serviceData = zones?.find(z => z.shipping_services.service_name === name)?.shipping_services
    return {
      code: serviceData?.service_code || '',
      name: name || ''
    }
  })
  
  // 料金マトリックスを構築
  const rates: Record<string, Record<string, Record<string, number>>> = {}
  
  allRates?.forEach(rate => {
    const serviceCode = rate.shipping_services.service_code
    const zoneCode = rate.shipping_zones.zone_code
    const weightRange = `${rate.weight_from_g}g-${rate.weight_to_g}g`
    
    if (!rates[serviceCode]) rates[serviceCode] = {}
    if (!rates[serviceCode][zoneCode]) rates[serviceCode][zoneCode] = {}
    
    rates[serviceCode][zoneCode][weightRange] = parseFloat(rate.base_price_jpy.toString())
  })
  
  const matrixData: FullMatrixData = {
    carrier_code: 'JPPOST',
    carrier_name: '日本郵便',
    weight_unit: 'g',
    min_weight: '25g',
    max_weight: '30kg',
    source_table: 'shipping_rates',
    total_records: allRates?.length || 0,
    weight_ranges: weightRanges,
    zones: zoneData,
    services: services,
    rates: rates,
    generated_at: new Date().toISOString()
  }
  
  console.log('日本郵便マトリックス生成完了')
  console.log('- 重量帯:', weightRanges.length)
  console.log('- ゾーン数:', zoneData.length)  
  console.log('- サービス数:', services.length)
  
  return { data: matrixData }
}

/**
 * Eloji全マトリックス取得
 */
async function getElojiFullMatrix(carrierType: string): Promise<APIResponse<FullMatrixData>> {
  console.log('Eloji全データ取得開始:', carrierType)
  
  // サービスコードを特定
  const servicePrefix = carrierType.replace('ELOJI_', 'ELOJI_')
  
  // 全データ取得（制限解除）
  const { data: allRates, error: ratesError } = await supabase
    .from('cpass_rates')
    .select(`
      id,
      weight_from_kg,
      weight_to_kg,
      rate_jpy,
      cpass_services!inner(
        service_code,
        service_name_ja,
        service_name_en
      ),
      cpass_countries!inner(
        country_code,
        country_name_ja
      )
    `, { count: 'exact' })
    .like('cpass_services.service_code', `${servicePrefix}%`)
    .order('weight_from_kg')
    .limit(10000)
    
  if (ratesError) throw ratesError
  
  console.log('Eloji データ取得完了:', allRates?.length, '件')
  
  // 重量帯を生成
  const weightRanges = [...new Set(
    allRates?.map(r => `${r.weight_from_kg}kg-${r.weight_to_kg}kg`) || []
  )].sort((a, b) => {
    const aWeight = parseFloat(a.split('kg-')[0])
    const bWeight = parseFloat(b.split('kg-')[0])
    return aWeight - bWeight
  })
  
  // ゾーンデータを整理
  const zones = [...new Set(
    allRates?.map(r => r.cpass_countries.country_code) || []
  )].map(code => {
    const country = allRates?.find(r => r.cpass_countries.country_code === code)?.cpass_countries
    return {
      code: code,
      name: country?.country_name_ja || code,
      countries: [country?.country_name_ja || code]
    }
  })
  
  // サービスデータを整理
  const services = [...new Set(
    allRates?.map(r => r.cpass_services.service_name_ja) || []
  )].map(name => {
    const serviceData = allRates?.find(r => r.cpass_services.service_name_ja === name)?.cpass_services
    return {
      code: serviceData?.service_code || '',
      name: name || ''
    }
  })
  
  // 料金マトリックスを構築
  const rates: Record<string, Record<string, Record<string, number>>> = {}
  
  allRates?.forEach(rate => {
    const serviceCode = rate.cpass_services.service_code
    const zoneCode = rate.cpass_countries.country_code
    const weightRange = `${rate.weight_from_kg}kg-${rate.weight_to_kg}kg`
    
    if (!rates[serviceCode]) rates[serviceCode] = {}
    if (!rates[serviceCode][zoneCode]) rates[serviceCode][zoneCode] = {}
    
    rates[serviceCode][zoneCode][weightRange] = rate.rate_jpy
  })
  
  const matrixData: FullMatrixData = {
    carrier_code: carrierType.split('_')[1], // DHL, FEDEX, etc.
    carrier_name: carrierType.replace('ELOJI_', 'Eloji '),
    weight_unit: 'kg',
    min_weight: '0.1kg',
    max_weight: '999kg',
    source_table: 'cpass_rates',
    total_records: allRates?.length || 0,
    weight_ranges: weightRanges,
    zones: zones,
    services: services,
    rates: rates,
    generated_at: new Date().toISOString()
  }
  
  console.log('Eloji マトリックス生成完了')
  console.log('- 重量帯:', weightRanges.length)
  console.log('- ゾーン数:', zones.length)
  console.log('- サービス数:', services.length)
  
  return { data: matrixData }
}

/**
 * CPass全マトリックス取得
 */
async function getCPassFullMatrix(carrierType: string): Promise<APIResponse<FullMatrixData>> {
  console.log('CPass全データ取得開始:', carrierType)
  
  // Elojiサービス以外のCPassサービス
  const excludeServices = [
    'ELOJI_DHL_EXPRESS',
    'ELOJI_FEDEX_ECONOMY', 
    'ELOJI_FEDEX_ICP',
    'ELOJI_FEDEX_IP',
    'ELOJI_IE'
  ]
  
  // 全データ取得（制限解除）
  const { data: allRates, error: ratesError } = await supabase
    .from('cpass_rates')
    .select(`
      id,
      weight_from_kg,
      weight_to_kg,
      rate_jpy,
      cpass_services!inner(
        service_code,
        service_name_ja,
        service_name_en
      ),
      cpass_countries!inner(
        country_code,
        country_name_ja
      )
    `, { count: 'exact' })
    .not('cpass_services.service_code', 'in', `(${excludeServices.join(',')})`)
    .order('weight_from_kg')
    .limit(10000)
    
  if (ratesError) throw ratesError
  
  console.log('CPass データ取得完了:', allRates?.length, '件')
  
  // 以下は getElojiFullMatrix と同じ処理...
  const weightRanges = [...new Set(
    allRates?.map(r => `${r.weight_from_kg}kg-${r.weight_to_kg}kg`) || []
  )].sort((a, b) => {
    const aWeight = parseFloat(a.split('kg-')[0])
    const bWeight = parseFloat(b.split('kg-')[0])
    return aWeight - bWeight
  })
  
  const zones = [...new Set(
    allRates?.map(r => r.cpass_countries.country_code) || []
  )].map(code => {
    const country = allRates?.find(r => r.cpass_countries.country_code === code)?.cpass_countries
    return {
      code: code,
      name: country?.country_name_ja || code,
      countries: [country?.country_name_ja || code]
    }
  })
  
  const services = [...new Set(
    allRates?.map(r => r.cpass_services.service_name_ja) || []
  )].map(name => {
    const serviceData = allRates?.find(r => r.cpass_services.service_name_ja === name)?.cpass_services
    return {
      code: serviceData?.service_code || '',
      name: name || ''
    }
  })
  
  const rates: Record<string, Record<string, Record<string, number>>> = {}
  
  allRates?.forEach(rate => {
    const serviceCode = rate.cpass_services.service_code
    const zoneCode = rate.cpass_countries.country_code
    const weightRange = `${rate.weight_from_kg}kg-${rate.weight_to_kg}kg`
    
    if (!rates[serviceCode]) rates[serviceCode] = {}
    if (!rates[serviceCode][zoneCode]) rates[serviceCode][zoneCode] = {}
    
    rates[serviceCode][zoneCode][weightRange] = rate.rate_jpy
  })
  
  const matrixData: FullMatrixData = {
    carrier_code: 'CPASS',
    carrier_name: 'CPass',
    weight_unit: 'kg',
    min_weight: '0.1kg',
    max_weight: '999kg',
    source_table: 'cpass_rates',
    total_records: allRates?.length || 0,
    weight_ranges: weightRanges,
    zones: zones,
    services: services,
    rates: rates,
    generated_at: new Date().toISOString()
  }
  
  console.log('CPass マトリックス生成完了')
  console.log('- 重量帯:', weightRanges.length)
  console.log('- ゾーン数:', zones.length)
  console.log('- サービス数:', services.length)
  
  return { data: matrixData }
}

// 型定義
interface FullMatrixData {
  carrier_code: string
  carrier_name: string
  weight_unit: 'g' | 'kg'
  min_weight: string
  max_weight: string
  source_table: string
  total_records: number
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
