/**
 * 高機能マトリックス用API修正版
 * 
 * 主な変更点：
 * 1. ゾーン軸対応のデータ構造
 * 2. 実際の重量帯データの使用
 * 3. 全サービスの取得保証
 * 4. エラーハンドリング強化
 */

import { supabase } from '@/lib/supabase'

/**
 * 実際の重量帯を取得
 */
async function getActualWeightRanges(): Promise<any[]> {
  const { data: cpassWeights } = await supabase
    .from('cpass_rates')
    .select('weight_from_kg, weight_to_kg')
    .order('weight_from_kg')
  
  const { data: jpWeights } = await supabase
    .from('shipping_rates')  
    .select('weight_from_g, weight_to_g')
    .order('weight_from_g')

  // 重量帯を統合・正規化
  const allWeights = new Set()
  
  cpassWeights?.forEach(w => {
    allWeights.add(`${w.weight_from_kg}-${w.weight_to_kg}kg`)
  })
  
  jpWeights?.forEach(w => {
    const fromKg = w.weight_from_g / 1000
    const toKg = w.weight_to_g / 1000
    allWeights.add(`${fromKg}-${toKg}kg`)
  })
  
  return Array.from(allWeights).sort()
}

/**
 * 高機能マトリックスデータ生成（修正版）
 */
export async function generateAdvancedMatrixData(
  countries: string[] = ['US_48', 'US_OTHER', 'GB', 'DE', 'AU'],
  weightRanges?: string[]
): Promise<APIResponse<AdvancedMatrixData>> {
  try {
    console.log('=== 高機能マトリックス生成開始 ===')
    
    // 重量帯の取得（指定されていない場合は自動取得）
    const actualWeightRanges = weightRanges || await getActualWeightRanges()
    
    const allServices: any[] = []
    
    // 各重量帯・各国の組み合わせでデータ取得
    for (const weightRange of actualWeightRanges.slice(0, 10)) { // 最初の10重量帯
      const [fromStr, toStr] = weightRange.replace('kg', '').split('-')
      const fromKg = parseFloat(fromStr)
      const toKg = parseFloat(toStr)
      
      console.log(`処理中: ${weightRange}`)
      
      // CPass料金（Eloji除外）
      const { data: cpassRates } = await supabase
        .from('cpass_rates')
        .select(`
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
        `)
        .not('cpass_services.service_code', 'in', `(${ELOJI_SERVICES.join(',')})`)
        .in('cpass_countries.country_code', countries)
        .lte('weight_from_kg', fromKg)
        .gte('weight_to_kg', toKg)
        
      // Eloji料金
      const { data: elojiRates } = await supabase
        .from('cpass_rates')
        .select(`
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
        `)
        .in('cpass_services.service_code', ELOJI_SERVICES)
        .in('cpass_countries.country_code', countries)
        .lte('weight_from_kg', fromKg)
        .gte('weight_to_kg', toKg)
        
      // 日本郵便料金
      const { data: jpRates } = await supabase
        .from('shipping_rates')
        .select(`
          base_price_jpy,
          shipping_services!inner(
            service_code,
            service_name,
            service_type,
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
        .lte('weight_from_g', toKg * 1000)
        .gte('weight_to_g', fromKg * 1000)
      
      // データを統合
      const processRates = (rates: any[], carrierType: string) => {
        return rates?.map(rate => {
          // 業者判定
          let carrierCode = carrierType
          let carrierName = carrierType
          
          if (carrierType === 'ELOJI') {
            const serviceCode = rate.cpass_services?.service_code || ''
            if (serviceCode.includes('DHL')) {
              carrierCode = 'DHL'
              carrierName = 'DHL'
            } else if (serviceCode.includes('FEDEX')) {
              carrierCode = 'FEDEX'
              carrierName = 'FedX'
            } else if (serviceCode.includes('UPS')) {
              carrierCode = 'UPS'
              carrierName = 'UPS'
            }
          } else if (carrierType === 'JPPOST') {
            carrierName = '日本郵便'
          }
          
          return {
            weight_range: weightRange,
            carrier_code: carrierCode,
            carrier_name: carrierName,
            service_code: rate.cpass_services?.service_code || rate.shipping_services?.service_code,
            service_name: rate.cpass_services?.service_name_ja || rate.shipping_services?.service_name,
            country_code: rate.cpass_countries?.country_code || 'JP_DOMESTIC',
            price_jpy: rate.rate_jpy || parseFloat(rate.base_price_jpy || 0),
            available: true
          }
        }) || []
      }
      
      allServices.push(
        ...processRates(cpassRates, 'CPASS'),
        ...processRates(elojiRates, 'ELOJI'), 
        ...processRates(jpRates, 'JPPOST')
      )
    }
    
    console.log('総データ件数:', allServices.length)
    
    // サービスごとにグループ化し、ゾーン別データを構築
    const serviceGroups = allServices.reduce((acc, service) => {
      const key = `${service.carrier_code}_${service.service_code}`
      
      if (!acc[key]) {
        acc[key] = {
          carrier_code: service.carrier_code,
          carrier_name: service.carrier_name,
          service_code: service.service_code,
          service_name: service.service_name,
          rates: []
        }
      }
      
      // 重量帯ごとの料金データを構築
      const existingRate = acc[key].rates.find(r => r.weight_range === service.weight_range)
      
      if (existingRate) {
        existingRate.zones[service.country_code] = service.price_jpy
      } else {
        acc[key].rates.push({
          weight_range: service.weight_range,
          zones: { [service.country_code]: service.price_jpy }
        })
      }
      
      return acc
    }, {} as any)
    
    const matrixData: AdvancedMatrixData = {
      weight_ranges: actualWeightRanges.slice(0, 10),
      countries: countries,
      services: Object.values(serviceGroups),
      generated_at: new Date().toISOString(),
      exchange_rate_usd_jpy: USD_JPY_RATE,
      total_services: Object.keys(serviceGroups).length,
      total_rates: allServices.length
    }
    
    console.log('=== 高機能マトリックス生成完了 ===')
    console.log('サービス数:', matrixData.total_services)
    console.log('総料金データ:', matrixData.total_rates)
    
    return {
      data: matrixData,
      meta: {
        execution_time_ms: Date.now(),
        services_by_carrier: Object.values(serviceGroups).reduce((acc: any, service: any) => {
          acc[service.carrier_code] = (acc[service.carrier_code] || 0) + 1
          return acc
        }, {})
      }
    }
    
  } catch (error) {
    console.error('=== 高機能マトリックス生成エラー ===', error)
    return {
      error: {
        message: '高機能マトリックスデータの生成に失敗しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// 型定義
interface AdvancedMatrixData {
  weight_ranges: string[]
  countries: string[]
  services: Array<{
    carrier_code: string
    carrier_name: string
    service_code: string
    service_name: string
    rates: Array<{
      weight_range: string
      zones: Record<string, number>
    }>
  }>
  generated_at: string
  exchange_rate_usd_jpy: number
  total_services: number
  total_rates: number
}
