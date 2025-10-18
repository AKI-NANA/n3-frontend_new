/**
 * 動的ゾーン対応API
 * 
 * 各業者の異なるゾーン体系に完全対応
 */

import { supabase } from '@/lib/supabase'

/**
 * 業者別ゾーン一覧取得
 */
export async function getCarrierZones(carrierType: 'CPASS' | 'ELOJI' | 'JPPOST' | 'ALL'): Promise<APIResponse<CarrierZoneData[]>> {
  try {
    console.log('業者別ゾーン取得開始:', carrierType)
    
    if (carrierType === 'JPPOST') {
      // 日本郵便のゾーン取得
      const { data, error } = await supabase
        .from('shipping_zones')
        .select(`
          zone_code,
          zone_name,
          shipping_carriers!inner(carrier_code, carrier_name),
          shipping_country_zones(
            shipping_countries(country_code, country_name)
          )
        `)
        .eq('shipping_carriers.carrier_code', 'JPPOST')
        
      if (error) throw error
      
      return {
        data: [{
          carrier_code: 'JPPOST',
          carrier_name: '日本郵便',
          zones: data?.map(zone => ({
            zone_code: zone.zone_code,
            zone_name: zone.zone_name,
            countries: zone.shipping_country_zones?.map(scz => ({
              code: scz.shipping_countries.country_code,
              name: scz.shipping_countries.country_name
            })) || []
          })) || []
        }]
      }
    } else {
      // CPass系（Eloji含む）のゾーン取得
      const { data, error } = await supabase
        .from('cpass_countries')
        .select('country_code, country_name_ja, region')
        .order('country_code')
        
      if (error) throw error
      
      // 業者別にゾーンをグループ化
      const zoneGroups: Record<string, any> = {}
      
      data?.forEach(country => {
        // ゾーン判定ロジック
        let carrierCode = 'CPASS'
        let zoneName = country.country_name_ja
        
        if (country.country_code.startsWith('FEDEX_ZONE_')) {
          carrierCode = 'FEDEX'
          zoneName = country.country_name_ja
        } else if (country.country_code.startsWith('SPEEDPAK_DHL_ZONE_')) {
          carrierCode = 'DHL'
          zoneName = `DHL ${country.country_code.replace('SPEEDPAK_DHL_ZONE_', 'ゾーン')}`
        } else if (country.country_code.startsWith('UPS_')) {
          carrierCode = 'UPS'
          zoneName = country.country_name_ja
        }
        
        if (!zoneGroups[carrierCode]) {
          zoneGroups[carrierCode] = {
            carrier_code: carrierCode,
            carrier_name: carrierCode === 'FEDEX' ? 'FedX' : carrierCode === 'DHL' ? 'DHL' : carrierCode,
            zones: []
          }
        }
        
        zoneGroups[carrierCode].zones.push({
          zone_code: country.country_code,
          zone_name: zoneName,
          countries: [{ code: country.country_code, name: country.country_name_ja }]
        })
      })
      
      // フィルタリング
      let result = Object.values(zoneGroups)
      if (carrierType === 'ELOJI') {
        result = result.filter(group => ['DHL', 'FEDEX', 'UPS'].includes(group.carrier_code))
      } else if (carrierType === 'CPASS') {
        result = result.filter(group => !['DHL', 'FEDEX', 'UPS'].includes(group.carrier_code))
      }
      
      return { data: result }
    }
  } catch (error) {
    console.error('業者別ゾーン取得エラー:', error)
    return {
      error: {
        message: '業者別ゾーン情報の取得に失敗しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * ゾーン別料金マトリックス取得
 */
export async function getZoneRateMatrix(
  carrierType: 'ALL' | 'CPASS' | 'ELOJI' | 'JPPOST',
  weight_kg: number
): Promise<APIResponse<ZoneRateMatrix>> {
  try {
    console.log('ゾーン別料金マトリックス取得:', carrierType, weight_kg)
    
    const allRates: ZoneRateData[] = []
    
    // CPass系データ取得
    if (carrierType === 'ALL' || carrierType === 'CPASS' || carrierType === 'ELOJI') {
      const serviceFilter = carrierType === 'ELOJI' 
        ? ELOJI_SERVICES 
        : carrierType === 'CPASS' 
        ? CPASS_SERVICES 
        : [...ELOJI_SERVICES, ...CPASS_SERVICES]
        
      const { data: cpassRates } = await supabase
        .from('cpass_rates')
        .select(`
          rate_jpy,
          cpass_services!inner(service_code, service_name_ja),
          cpass_countries!inner(country_code, country_name_ja)
        `)
        .in('cpass_services.service_code', serviceFilter)
        .lte('weight_from_kg', weight_kg)
        .gte('weight_to_kg', weight_kg)
        
      cpassRates?.forEach(rate => {
        // 業者判定
        let carrierCode = 'CPASS'
        const serviceCode = rate.cpass_services.service_code
        
        if (serviceCode.includes('DHL')) carrierCode = 'DHL'
        else if (serviceCode.includes('FEDEX')) carrierCode = 'FEDEX'  
        else if (serviceCode.includes('UPS')) carrierCode = 'UPS'
        
        allRates.push({
          carrier_code: carrierCode,
          carrier_name: carrierCode === 'FEDEX' ? 'FedX' : carrierCode,
          service_code: serviceCode,
          service_name: rate.cpass_services.service_name_ja,
          zone_code: rate.cpass_countries.country_code,
          zone_name: rate.cpass_countries.country_name_ja,
          weight_kg,
          price_jpy: rate.rate_jpy,
          price_usd: rate.rate_jpy / USD_JPY_RATE
        })
      })
    }
    
    // 日本郵便データ取得
    if (carrierType === 'ALL' || carrierType === 'JPPOST') {
      const { data: jpRates } = await supabase
        .from('shipping_rates')
        .select(`
          base_price_jpy,
          shipping_services!inner(service_code, service_name),
          shipping_zones!inner(zone_code, zone_name)
        `)
        .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')
        .lte('weight_from_g', weight_kg * 1000)
        .gte('weight_to_g', weight_kg * 1000)
        
      jpRates?.forEach(rate => {
        allRates.push({
          carrier_code: 'JPPOST',
          carrier_name: '日本郵便',
          service_code: rate.shipping_services.service_code,
          service_name: rate.shipping_services.service_name,
          zone_code: rate.shipping_zones.zone_code,
          zone_name: rate.shipping_zones.zone_name,
          weight_kg,
          price_jpy: parseFloat(rate.base_price_jpy.toString()),
          price_usd: parseFloat(rate.base_price_jpy.toString()) / USD_JPY_RATE
        })
      })
    }
    
    // データをキャリア別、ゾーン別にグループ化
    const carrierGroups = allRates.reduce((acc, rate) => {
      const key = rate.carrier_code
      if (!acc[key]) {
        acc[key] = {
          carrier_code: rate.carrier_code,
          carrier_name: rate.carrier_name,
          services: {}
        }
      }
      
      const serviceKey = rate.service_code
      if (!acc[key].services[serviceKey]) {
        acc[key].services[serviceKey] = {
          service_code: rate.service_code,
          service_name: rate.service_name,
          zones: {}
        }
      }
      
      acc[key].services[serviceKey].zones[rate.zone_code] = {
        zone_code: rate.zone_code,
        zone_name: rate.zone_name,
        price_jpy: rate.price_jpy,
        price_usd: rate.price_usd
      }
      
      return acc
    }, {} as any)
    
    const matrix: ZoneRateMatrix = {
      weight_kg,
      carriers: Object.values(carrierGroups),
      generated_at: new Date().toISOString(),
      total_rates: allRates.length
    }
    
    console.log('ゾーン別マトリックス生成完了:', matrix.total_rates, '件')
    
    return { data: matrix }
  } catch (error) {
    console.error('ゾーン別マトリックス取得エラー:', error)
    return {
      error: {
        message: 'ゾーン別料金マトリックスの取得に失敗しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * 国別料金比較取得
 */
export async function getCountryRateComparison(
  targetCountries: string[],
  weight_kg: number
): Promise<APIResponse<CountryRateComparison[]>> {
  try {
    console.log('国別料金比較取得:', targetCountries, weight_kg)
    
    const countryRates: Record<string, any[]> = {}
    
    // 各国の料金を取得
    for (const country of targetCountries) {
      const rates: any[] = []
      
      // CPass系料金
      const { data: cpassRates } = await supabase
        .from('cpass_rates')
        .select(`
          rate_jpy,
          cpass_services!inner(service_code, service_name_ja),
          cpass_countries!inner(country_code, country_name_ja)
        `)
        .eq('cpass_countries.country_code', country)
        .lte('weight_from_kg', weight_kg)
        .gte('weight_to_kg', weight_kg)
        
      cpassRates?.forEach(rate => {
        let carrierCode = 'CPASS'
        if (rate.cpass_services.service_code.includes('DHL')) carrierCode = 'DHL'
        else if (rate.cpass_services.service_code.includes('FEDEX')) carrierCode = 'FEDEX'
        else if (rate.cpass_services.service_code.includes('UPS')) carrierCode = 'UPS'
        
        rates.push({
          carrier_code: carrierCode,
          carrier_name: carrierCode === 'FEDEX' ? 'FedX' : carrierCode,
          service_name: rate.cpass_services.service_name_ja,
          price_jpy: rate.rate_jpy,
          price_usd: rate.rate_jpy / USD_JPY_RATE
        })
      })
      
      // 日本郵便の該当ゾーンを検索
      const { data: jpRates } = await supabase
        .from('shipping_rates')
        .select(`
          base_price_jpy,
          shipping_services!inner(service_code, service_name),
          shipping_zones!inner(
            zone_code,
            zone_name,
            shipping_country_zones!inner(
              shipping_countries!inner(country_code)
            )
          )
        `)
        .eq('shipping_services.shipping_carriers.carrier_code', 'JPPOST')
        .eq('shipping_zones.shipping_country_zones.shipping_countries.country_code', country)
        .lte('weight_from_g', weight_kg * 1000)
        .gte('weight_to_g', weight_kg * 1000)
        
      jpRates?.forEach(rate => {
        rates.push({
          carrier_code: 'JPPOST',
          carrier_name: '日本郵便',
          service_name: rate.shipping_services.service_name,
          price_jpy: parseFloat(rate.base_price_jpy.toString()),
          price_usd: parseFloat(rate.base_price_jpy.toString()) / USD_JPY_RATE
        })
      })
      
      // 最安値順にソート
      rates.sort((a, b) => a.price_jpy - b.price_jpy)
      countryRates[country] = rates
    }
    
    const comparison = targetCountries.map(country => ({
      country_code: country,
      country_name: countryRates[country][0]?.country_name || country,
      rates: countryRates[country] || [],
      lowest_price_jpy: countryRates[country][0]?.price_jpy || 0,
      carrier_count: [...new Set(countryRates[country]?.map(r => r.carrier_code))].length
    }))
    
    console.log('国別比較完了:', comparison.length, '国')
    
    return { data: comparison }
  } catch (error) {
    console.error('国別料金比較エラー:', error)
    return {
      error: {
        message: '国別料金比較の取得に失敗しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// 型定義
interface CarrierZoneData {
  carrier_code: string
  carrier_name: string
  zones: Array<{
    zone_code: string
    zone_name: string
    countries: Array<{
      code: string
      name: string
    }>
  }>
}

interface ZoneRateData {
  carrier_code: string
  carrier_name: string
  service_code: string
  service_name: string
  zone_code: string
  zone_name: string
  weight_kg: number
  price_jpy: number
  price_usd: number
}

interface ZoneRateMatrix {
  weight_kg: number
  carriers: Array<{
    carrier_code: string
    carrier_name: string
    services: Record<string, {
      service_code: string
      service_name: string
      zones: Record<string, {
        zone_code: string
        zone_name: string
        price_jpy: number
        price_usd: number
      }>
    }>
  }>
  generated_at: string
  total_rates: number
}

interface CountryRateComparison {
  country_code: string
  country_name: string
  rates: Array<{
    carrier_code: string
    carrier_name: string
    service_name: string
    price_jpy: number
    price_usd: number
  }>
  lowest_price_jpy: number
  carrier_count: number
}
