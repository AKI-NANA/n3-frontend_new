import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 個別サービスマトリックスAPI（FullDatabaseMatrix専用）
 * GET /api/shipping/service-matrix?service=JPPOST_EMS
 * 
 * ebay_shipping_masterテーブルから特定サービスの全データを取得し、
 * FullDatabaseMatrixコンポーネントが期待する形式で返す
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const serviceCode = searchParams.get('service')
    
    if (!serviceCode) {
      return NextResponse.json(
        { error: 'service parameter is required' },
        { status: 400 }
      )
    }
    
    console.log(`[Service Matrix API] Loading data for: ${serviceCode}`)
    
    // サービスの全データを取得
    const { data: allData, error: dataError } = await supabase
      .from('ebay_shipping_master')
      .select('*')
      .eq('service_code', serviceCode)
      .order('country_code')
      .order('weight_from_kg')
    
    if (dataError) {
      throw new Error(dataError.message)
    }
    
    if (!allData || allData.length === 0) {
      return NextResponse.json({
        error: `No data found for service: ${serviceCode}`,
        service_code: serviceCode,
        total_records: 0
      })
    }
    
    console.log(`[Service Matrix API] Found ${allData.length} records`)
    
    // 国/地域を抽出（重複除去）
    const uniqueCountries = Array.from(
      new Map(allData.map(row => [
        row.country_code,
        {
          code: row.country_code,
          name: row.country_name_ja || row.country_name_en || row.country_code,
          countries: [row.country_name_en || row.country_code]
        }
      ])).values()
    )
    
    // 重量帯を抽出（重複除去してソート）
    const weightSet = new Set<number>()
    allData.forEach(row => {
      // 重量帯の中間値を使用
      const midWeight = (row.weight_from_kg + row.weight_to_kg) / 2
      weightSet.add(midWeight)
    })
    const weights = Array.from(weightSet).sort((a, b) => a - b)
    const weightRanges = weights.map(w => `${w}kg`)
    
    // 料金マトリックスを構築
    const rates: Record<string, Record<string, number>> = {}
    
    allData.forEach(row => {
      const countryCode = row.country_code
      const midWeight = (row.weight_from_kg + row.weight_to_kg) / 2
      const weightKey = `${midWeight}kg`
      
      if (!rates[countryCode]) {
        rates[countryCode] = {}
      }
      
      rates[countryCode][weightKey] = row.base_rate_jpy || 0
    })
    
    // サービス名を取得
    const serviceName = allData[0].service_code
      .replace('JPPOST_', '日本郵便 ')
      .replace('ELOJI_', 'Eloji ')
      .replace('SPEEDPAK_', 'SpeedPAK ')
      .replace('FEDEX_', 'FedEx ')
      .replace('_', ' ')
    
    const response = {
      service_name: serviceName,
      service_code: serviceCode,
      source_table: 'ebay_shipping_master',
      weight_unit: 'kg',
      weight_levels: weights.length,
      max_weight: `${Math.max(...weights)}kg`,
      zones: uniqueCountries,
      weight_ranges: weightRanges,
      rates: rates,
      total_records: allData.length,
      multiplier_info: {} // 現在は未使用
    }
    
    console.log(`[Service Matrix API] Response:`, {
      zones: response.zones.length,
      weights: response.weight_levels,
      total: response.total_records
    })
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[Service Matrix API] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        service_code: request.nextUrl.searchParams.get('service')
      },
      { status: 500 }
    )
  }
}
