import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface MatrixCell {
  carrier_name: string
  service_code: string
  price_usd: number
  base_rate_jpy: number
  shipping_cost_with_margin_usd: number
  country_code: string
  weight_kg: number
}

interface MatrixRow {
  country_code: string
  country_name_en: string
  country_name_ja: string
  region: string
  weights: {
    [key: string]: MatrixCell | null
  }
}

/**
 * 配送料金マトリックスAPI（価格モード対応版）
 * GET /api/shipping/matrix?service_type=Express&weights=0.5,1,2,5,10,20&price_mode=base
 * GET /api/shipping/matrix?service=JPPOST_EMS (個別サービス指定)
 * 
 * price_mode: 'base' (基本送料) または 'recommended' (推奨価格)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const serviceCode = searchParams.get('service') // 個別サービス指定
    const serviceType = searchParams.get('service_type') || 'Express' // サービスタイプ指定
    const weightsParam = searchParams.get('weights') || '0.5,1,2,5,10,20'
    const priceMode = searchParams.get('price_mode') || 'base' // 'base' or 'recommended'
    
    // 重量リストをパース
    const weights = weightsParam.split(',').map(w => parseFloat(w.trim()))
    
    console.log(`[Matrix API] Service: ${serviceCode || serviceType}, Price Mode: ${priceMode}`)
    
    // クエリ条件を構築
    let query = supabase
      .from('ebay_shipping_master')
      .select('country_code, country_name_en, country_name_ja, region')
    
    // サービスコード指定の場合
    if (serviceCode) {
      query = query.eq('service_code', serviceCode)
    } else {
      // サービスタイプ指定の場合
      query = query.eq('service_type', serviceType)
    }
    
    // 全ての国コードを取得（重複除去）- ページネーションで全件取得
    let allCountriesData: any[] = []
    let hasMore = true
    let offset = 0
    const pageSize = 1000
    
    while (hasMore) {
      const { data: countriesData, error: countriesError } = await query
        .range(offset, offset + pageSize - 1)
      
      if (countriesError) {
        throw new Error(countriesError.message)
      }
      
      if (countriesData && countriesData.length > 0) {
        allCountriesData = [...allCountriesData, ...countriesData]
        offset += pageSize
        hasMore = countriesData.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    console.log(`[Matrix API] Raw countries data: ${allCountriesData.length} records`)
    
    // 重複を除去
    const uniqueCountries = Array.from(
      new Map(allCountriesData?.map(c => [c.country_code, c])).values()
    )
    
    console.log(`[Matrix API] Unique countries: ${uniqueCountries.length} countries`)
    
    // データクエリを構築（ソートなし、後でフィルタリング）
    let dataQuery = supabase
      .from('ebay_shipping_master')
      .select('carrier_name, service_code, shipping_cost_with_margin_usd, base_rate_jpy, country_code, weight_from_kg, weight_to_kg')
    
    // サービスコード指定の場合
    if (serviceCode) {
      dataQuery = dataQuery.eq('service_code', serviceCode)
    } else {
      // サービスタイプ指定の場合
      dataQuery = dataQuery.eq('service_type', serviceType)
    }
    
    // 全てのデータをページネーションで取得
    let allData: any[] = []
    hasMore = true
    offset = 0
    
    while (hasMore) {
      const { data: pageData, error: pageError } = await dataQuery
        .range(offset, offset + pageSize - 1)
      
      if (pageError) {
        throw new Error(pageError.message)
      }
      
      if (pageData && pageData.length > 0) {
        allData = [...allData, ...pageData]
        offset += pageSize
        hasMore = pageData.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    console.log(`[Matrix API] Total data records: ${allData.length}`)
    
    // 国・重量ごとに全データをグループ化（配列として保存）
    const dataByCountryWeight = new Map<string, any[]>()
    
    allData?.forEach(record => {
      weights.forEach(weight => {
        if (record.weight_from_kg <= weight && record.weight_to_kg >= weight) {
          const key = `${record.country_code}-${weight}`
          
          if (!dataByCountryWeight.has(key)) {
            dataByCountryWeight.set(key, [])
          }
          dataByCountryWeight.get(key)!.push({
            carrier_name: record.carrier_name,
            service_code: record.service_code,
            base_rate_jpy: record.base_rate_jpy,
            shipping_cost_with_margin_usd: record.shipping_cost_with_margin_usd,
            country_code: record.country_code,
            weight_kg: weight
          })
        }
      })
    })
    
    console.log(`[Matrix API] Grouped data: ${dataByCountryWeight.size} unique country-weight combinations`)
    
    // 価格モードに応じて各グループから最安値を選択
    const finalData = new Map<string, MatrixCell>()
    
    dataByCountryWeight.forEach((records, key) => {
      if (records.length === 0) return
      
      // 価格モードに応じてソート
      let sortedRecords: any[]
      if (priceMode === 'recommended') {
        // 推奨価格で最安値
        sortedRecords = records.sort((a, b) => 
          a.shipping_cost_with_margin_usd - b.shipping_cost_with_margin_usd
        )
      } else {
        // 基本送料で最安値
        sortedRecords = records.sort((a, b) => 
          a.base_rate_jpy - b.base_rate_jpy
        )
      }
      
      const cheapest = sortedRecords[0]
      
      finalData.set(key, {
        carrier_name: cheapest.carrier_name,
        service_code: cheapest.service_code,
        price_usd: cheapest.shipping_cost_with_margin_usd,
        base_rate_jpy: cheapest.base_rate_jpy,
        shipping_cost_with_margin_usd: cheapest.shipping_cost_with_margin_usd,
        country_code: cheapest.country_code,
        weight_kg: cheapest.weight_kg
      })
    })
    
    console.log(`[Matrix API] Final data: ${finalData.size} cells with cheapest services`)
    
    // マトリックスを構築
    const matrix: MatrixRow[] = uniqueCountries.map(country => {
      const row: MatrixRow = {
        country_code: country.country_code,
        country_name_en: country.country_name_en || country.country_code,
        country_name_ja: country.country_name_ja || country.country_code,
        region: country.region || '不明',
        weights: {}
      }
      
      weights.forEach(weight => {
        const key = `${country.country_code}-${weight}`
        row.weights[weight.toString()] = finalData.get(key) || null
      })
      
      return row
    })
    
    return NextResponse.json({
      success: true,
      service_code: serviceCode || undefined,
      service_type: serviceCode ? undefined : serviceType,
      price_mode: priceMode,
      weights: weights,
      weight_levels: weights.length,
      countries_count: matrix.length,
      matrix: matrix
    })
    
  } catch (error) {
    console.error('Matrix API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
