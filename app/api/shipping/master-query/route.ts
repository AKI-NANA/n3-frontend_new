import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// レスポンスの型定義
interface ShippingMasterRecord {
  id: number
  service_type: string
  carrier_name: string
  service_code: string
  service_name: string | null
  data_source: string
  country_code: string
  country_name_en: string | null
  country_name_ja: string | null
  weight_from_kg: number
  weight_to_kg: number
  base_rate_jpy: number
  base_rate_usd: number
  fuel_surcharge_jpy: number | null
  fuel_surcharge_usd: number | null
  total_actual_cost_usd: number
  shipping_cost_with_margin_usd: number
  additional_item_usd: number
  delivery_days_min: number | null
  delivery_days_max: number | null
  max_item_value_usd: number | null
  max_weight_kg: number | null
  created_at: string
  updated_at: string
}

interface ServiceTypeResults {
  service_type: string
  records: ShippingMasterRecord[]
  cheapest: ShippingMasterRecord | null
  count: number
}

interface MasterQueryResponse {
  success: boolean
  query: {
    country_code: string
    weight_kg: number
    service_types?: string[]
  }
  results: {
    economy: ServiceTypeResults
    standard: ServiceTypeResults
    express: ServiceTypeResults
  }
  overall_cheapest: ShippingMasterRecord | null
  error?: string
}

/**
 * 配送料金マスターテーブル検索API
 * GET /api/shipping/master-query?country_code=US&weight_kg=0.5&service_types=Economy,Standard,Express
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const countryCode = searchParams.get('country_code')
    const weightKgParam = searchParams.get('weight_kg')
    const serviceTypesParam = searchParams.get('service_types')

    // バリデーション
    if (!countryCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: '国コード（country_code）は必須です' 
        },
        { status: 400 }
      )
    }

    if (!weightKgParam) {
      return NextResponse.json(
        { 
          success: false, 
          error: '重量（weight_kg）は必須です' 
        },
        { status: 400 }
      )
    }

    const weightKg = parseFloat(weightKgParam)
    if (isNaN(weightKg) || weightKg <= 0 || weightKg > 30) {
      return NextResponse.json(
        { 
          success: false, 
          error: '重量は0.001kg〜30kgの範囲で指定してください' 
        },
        { status: 400 }
      )
    }

    // サービスタイプのフィルタリング（デフォルトは全て）
    const requestedServiceTypes = serviceTypesParam 
      ? serviceTypesParam.split(',').map(s => s.trim())
      : ['Economy', 'Standard', 'Express']

    // ベースクエリ：指定国・重量範囲に一致するレコードを取得
    let query = supabase
      .from('ebay_shipping_master')
      .select('*')
      .eq('country_code', countryCode.toUpperCase())
      .lte('weight_from_kg', weightKg)
      .gte('weight_to_kg', weightKg)
      .order('shipping_cost_with_margin_usd', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'データベースクエリでエラーが発生しました',
          details: error.message 
        },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        query: {
          country_code: countryCode.toUpperCase(),
          weight_kg: weightKg,
          service_types: requestedServiceTypes
        },
        results: {
          economy: { service_type: 'Economy', records: [], cheapest: null, count: 0 },
          standard: { service_type: 'Standard', records: [], cheapest: null, count: 0 },
          express: { service_type: 'Express', records: [], cheapest: null, count: 0 }
        },
        overall_cheapest: null
      })
    }

    // サービスタイプ別に分類
    const economyRecords = data.filter(r => r.service_type === 'Economy')
    const standardRecords = data.filter(r => r.service_type === 'Standard')
    const expressRecords = data.filter(r => r.service_type === 'Express')

    // 各サービスタイプの最安値を取得
    const economyCheapest = economyRecords.length > 0 ? economyRecords[0] : null
    const standardCheapest = standardRecords.length > 0 ? standardRecords[0] : null
    const expressCheapest = expressRecords.length > 0 ? expressRecords[0] : null

    // 全体の最安値
    const allRecords = [economyCheapest, standardCheapest, expressCheapest].filter(Boolean) as ShippingMasterRecord[]
    const overallCheapest = allRecords.length > 0
      ? allRecords.reduce((min, record) => 
          record.shipping_cost_with_margin_usd < min.shipping_cost_with_margin_usd ? record : min
        )
      : null

    const response: MasterQueryResponse = {
      success: true,
      query: {
        country_code: countryCode.toUpperCase(),
        weight_kg: weightKg,
        service_types: requestedServiceTypes
      },
      results: {
        economy: {
          service_type: 'Economy',
          records: economyRecords,
          cheapest: economyCheapest,
          count: economyRecords.length
        },
        standard: {
          service_type: 'Standard',
          records: standardRecords,
          cheapest: standardCheapest,
          count: standardRecords.length
        },
        express: {
          service_type: 'Express',
          records: expressRecords,
          cheapest: expressCheapest,
          count: expressRecords.length
        }
      },
      overall_cheapest: overallCheapest
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Master query API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST版も提供（複数国・複数重量の一括検索用）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { country_codes, weight_kg, service_types } = body

    if (!country_codes || !Array.isArray(country_codes) || country_codes.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '国コード配列（country_codes）は必須です' 
        },
        { status: 400 }
      )
    }

    if (!weight_kg || typeof weight_kg !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: '重量（weight_kg）は必須です' 
        },
        { status: 400 }
      )
    }

    if (weight_kg <= 0 || weight_kg > 30) {
      return NextResponse.json(
        { 
          success: false, 
          error: '重量は0.001kg〜30kgの範囲で指定してください' 
        },
        { status: 400 }
      )
    }

    const requestedServiceTypes = service_types || ['Economy', 'Standard', 'Express']

    // 複数国の一括検索
    const results: Record<string, any> = {}

    for (const countryCode of country_codes) {
      let query = supabase
        .from('ebay_shipping_master')
        .select('*')
        .eq('country_code', countryCode.toUpperCase())
        .lte('weight_from_kg', weight_kg)
        .gte('weight_to_kg', weight_kg)
        .order('shipping_cost_with_margin_usd', { ascending: true })

      const { data, error } = await query

      if (error) {
        console.error(`Query error for ${countryCode}:`, error)
        results[countryCode] = {
          success: false,
          error: error.message
        }
        continue
      }

      if (!data || data.length === 0) {
        results[countryCode] = {
          success: true,
          results: {
            economy: { service_type: 'Economy', records: [], cheapest: null, count: 0 },
            standard: { service_type: 'Standard', records: [], cheapest: null, count: 0 },
            express: { service_type: 'Express', records: [], cheapest: null, count: 0 }
          },
          overall_cheapest: null
        }
        continue
      }

      // サービスタイプ別に分類
      const economyRecords = data.filter(r => r.service_type === 'Economy')
      const standardRecords = data.filter(r => r.service_type === 'Standard')
      const expressRecords = data.filter(r => r.service_type === 'Express')

      const economyCheapest = economyRecords.length > 0 ? economyRecords[0] : null
      const standardCheapest = standardRecords.length > 0 ? standardRecords[0] : null
      const expressCheapest = expressRecords.length > 0 ? expressRecords[0] : null

      const allRecords = [economyCheapest, standardCheapest, expressCheapest].filter(Boolean) as ShippingMasterRecord[]
      const overallCheapest = allRecords.length > 0
        ? allRecords.reduce((min, record) => 
            record.shipping_cost_with_margin_usd < min.shipping_cost_with_margin_usd ? record : min
          )
        : null

      results[countryCode] = {
        success: true,
        results: {
          economy: {
            service_type: 'Economy',
            records: economyRecords,
            cheapest: economyCheapest,
            count: economyRecords.length
          },
          standard: {
            service_type: 'Standard',
            records: standardRecords,
            cheapest: standardCheapest,
            count: standardRecords.length
          },
          express: {
            service_type: 'Express',
            records: expressRecords,
            cheapest: expressCheapest,
            count: expressRecords.length
          }
        },
        overall_cheapest: overallCheapest
      }
    }

    return NextResponse.json({
      success: true,
      query: {
        country_codes,
        weight_kg,
        service_types: requestedServiceTypes
      },
      results
    })

  } catch (error) {
    console.error('Master query POST API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
