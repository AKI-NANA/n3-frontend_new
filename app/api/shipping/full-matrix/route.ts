import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 配送会社別全マトリックスデータAPI
 * GET /api/shipping/full-matrix?carrier=JPPOST
 * GET /api/shipping/full-matrix?carrier=ELOJI_DHL_EXPRESS
 * 
 * 元のテーブル（shipping_rates, cpass_rates）から生データを取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const carrierType = searchParams.get('carrier') || searchParams.get('service')
    
    if (!carrierType) {
      return NextResponse.json(
        { error: 'carrier or service parameter is required' },
        { status: 400 }
      )
    }
    
    console.log('=== 全マトリックスデータ取得開始 ===', carrierType)
    
    // 日本郵便のサービスコードリスト
    const jppostServices = ['EMS', 'LETTER', 'LETTER_REG', 'SMALL_PACKET_REG', 'PARCEL']
    
    let result
    if (carrierType === 'JPPOST' || jppostServices.includes(carrierType)) {
      result = await getJapanPostFullMatrix(carrierType)
    } else {
      result = await getCPassFullMatrix(carrierType)
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('全マトリックス取得エラー:', error)
    return NextResponse.json(
      { 
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * 日本郵便全マトリックス取得
 */
async function getJapanPostFullMatrix(serviceCode?: string) {
  // 特定サービスか全サービスか
  let zonesQuery = supabase
    .from('shipping_zones')
    .select(`
      zone_code,
      zone_name,
      shipping_services!inner(service_code, service_name, shipping_carriers!inner(carrier_code)),
      shipping_country_zones(shipping_countries(country_name))
    `)
    .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')
  
  if (serviceCode && serviceCode !== 'JPPOST') {
    zonesQuery = zonesQuery.eq('shipping_services.service_code', serviceCode)
  }
  
  const { data: zones, error: zonesError } = await zonesQuery
    
  if (zonesError) throw zonesError
  
  let ratesQuery = supabase
    .from('shipping_rates')
    .select(`
      weight_from_g,
      weight_to_g,
      base_price_jpy,
      shipping_services!inner(service_code, shipping_carriers!inner(carrier_code)),
      shipping_zones!inner(zone_code)
    `)
    .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')
    .order('weight_from_g')
  
  if (serviceCode && serviceCode !== 'JPPOST') {
    ratesQuery = ratesQuery.eq('shipping_services.service_code', serviceCode)
  }
    
  const { data: allRates, error: ratesError } = await ratesQuery
    
  if (ratesError) throw ratesError
  
  const weightRanges = [...new Set(
    allRates?.map(r => `${r.weight_from_g / 1000}kg-${r.weight_to_g / 1000}kg`) || []
  )].sort((a, b) => parseFloat(a) - parseFloat(b))
  
  const zoneData = zones?.map(zone => ({
    code: zone.zone_code,
    name: zone.zone_name,
    countries: zone.shipping_country_zones?.map((scz: any) => 
      scz.shipping_countries?.country_name
    ).filter(Boolean) || []
  })) || []
  
  const rates: Record<string, Record<string, number>> = {}
  
  allRates?.forEach(rate => {
    const zoneCode = rate.shipping_zones.zone_code
    const weightRange = `${rate.weight_from_g / 1000}kg-${rate.weight_to_g / 1000}kg`
    
    if (!rates[zoneCode]) rates[zoneCode] = {}
    rates[zoneCode][weightRange] = parseFloat(rate.base_price_jpy.toString())
  })
  
  const serviceName = serviceCode && serviceCode !== 'JPPOST'
    ? zones?.[0]?.shipping_services?.service_name || serviceCode
    : '日本郵便全サービス'
  
  return {
    service_name: serviceName,
    weight_unit: 'kg',
    weight_levels: weightRanges.length,
    max_weight: weightRanges[weightRanges.length - 1],
    source_table: 'shipping_rates',
    total_records: allRates?.length || 0,
    weight_ranges: weightRanges,
    zones: zoneData,
    rates: rates
  }
}

/**
 * CPass/Eloji全マトリックス取得
 */
async function getCPassFullMatrix(serviceCode: string) {
  const { data: allRates, error } = await supabase
    .from('cpass_rates')
    .select(`
      weight_from_kg,
      weight_to_kg,
      rate_jpy,
      cpass_services!inner(service_code, service_name_ja),
      cpass_countries!inner(country_code, country_name_ja, country_name_en)
    `)
    .eq('cpass_services.service_code', serviceCode)
    .order('weight_from_kg')
    
  if (error) throw error
  if (!allRates || allRates.length === 0) {
    throw new Error(`No data found for: ${serviceCode}`)
  }
  
  const weightRanges = [...new Set(
    allRates.map(r => `${r.weight_from_kg}kg-${r.weight_to_kg}kg`)
  )].sort((a, b) => parseFloat(a) - parseFloat(b))
  
  const zones = [...new Set(allRates.map(r => r.cpass_countries.country_code))].map(code => {
    const country = allRates.find(r => r.cpass_countries.country_code === code)?.cpass_countries
    return {
      code,
      name: country?.country_name_ja || country?.country_name_en || code,
      countries: [country?.country_name_en || code]
    }
  })
  
  const rates: Record<string, Record<string, number>> = {}
  allRates.forEach(rate => {
    const zoneCode = rate.cpass_countries.country_code
    const weightRange = `${rate.weight_from_kg}kg-${rate.weight_to_kg}kg`
    if (!rates[zoneCode]) rates[zoneCode] = {}
    rates[zoneCode][weightRange] = rate.rate_jpy
  })
  
  return {
    service_name: allRates[0].cpass_services.service_name_ja,
    weight_unit: 'kg',
    weight_levels: weightRanges.length,
    max_weight: weightRanges[weightRanges.length - 1],
    source_table: 'cpass_rates',
    total_records: allRates.length,
    weight_ranges: weightRanges,
    zones,
    rates
  }
}
