import { supabase } from '@/lib/supabase'
import type {
  ShippingCalculationParams,
  ShippingCalculationResult,
  APIResponse
} from '@/types/shipping'

const USD_JPY_RATE = 154.32

/**
 * V4 API: ebay_shipping_master から全サービスを取得
 * 配送会社ごとにグループ化して返す
 */
export async function calculateShippingFromMaster(
  params: ShippingCalculationParams
): Promise<APIResponse<ShippingCalculationResult[]>> {
  try {
    console.log('=== V4 Master API: 送料計算開始 ===', params)
    
    const actualWeightKg = params.weight_g / 1000
    // クーリエの最小重量は0.5kgなので、0.5kg未満は0.5kgとして検索
    const searchWeightKg = Math.max(actualWeightKg, 0.5)
    const countryCode = params.destination_country

    console.log(`検索条件: 国=${countryCode}, 実重量=${actualWeightKg}kg, 検索重量=${searchWeightKg}kg`)

    // ebay_shipping_master から取得
    const { data, error } = await supabase
      .from('ebay_shipping_master')
      .select('*')
      .eq('country_code', countryCode)
      .lte('weight_from_kg', searchWeightKg)
      .gte('weight_to_kg', searchWeightKg)
      .order('base_rate_jpy', { ascending: true })

    if (error) {
      console.error('ebay_shipping_master取得エラー:', error)
      return { 
        error: { 
          message: 'データ取得に失敗しました', 
          timestamp: new Date().toISOString() 
        } 
      }
    }

    if (!data || data.length === 0) {
      console.log('該当データなし')
      return { data: [] }
    }

    console.log(`取得データ: ${data.length}件`)
    console.log('キャリア別件数:', data.reduce((acc, row) => {
      acc[row.carrier_name] = (acc[row.carrier_name] || 0) + 1
      return acc
    }, {} as Record<string, number>))

    // ShippingCalculationResult 形式に変換
    const results: ShippingCalculationResult[] = data.map(row => {
      // 基本送料（base_rate_jpy）
      const basePrice = row.base_rate_jpy
      
      // 燃油サーチャージ
      const fuelSurcharge = row.fuel_surcharge_jpy || 0
      
      // 保険料（商品価値の percentage）
      const insuranceFee = params.need_insurance && row.insurance_fee_percentage ?
        Math.max(
          (row.insurance_fee_base_usd || 0) * USD_JPY_RATE,
          (params.declared_value_jpy || 0) * (row.insurance_fee_percentage / 100)
        ) : 0
      
      // 署名料
      const signatureFee = params.need_signature ?
        (row.signature_fee_usd || 0) * USD_JPY_RATE : 0
      
      // 推奨販売価格（全込み）
      const recommendedPrice = Math.round(row.shipping_cost_with_margin_usd * USD_JPY_RATE)
      
      // 合計（オプションによって変動）
      const totalPrice = basePrice + fuelSurcharge + insuranceFee + signatureFee

      return {
        id: `master_${row.id}`,
        carrier_code: row.service_code.split('_')[0], // JPPOST, FEDEX, etc.
        carrier_name: row.carrier_name,
        service_code: row.service_code,
        service_name: row.service_name,
        service_type: row.service_type, // Express, Standard, Economy
        zone_code: row.country_code,
        zone_name: row.country_name_ja || row.country_name_en,
        weight_used_g: params.weight_g,
        volumetric_weight_g: 0,
        chargeable_weight_g: params.weight_g,
        base_price_jpy: basePrice,
        fuel_surcharge_jpy: fuelSurcharge,
        demand_surcharge_jpy: 0,
        peak_surcharge_jpy: 0,
        residential_surcharge_jpy: 0,
        remote_area_surcharge_jpy: 0,
        customs_clearance_jpy: 0,
        declared_value_jpy: params.declared_value_jpy || 0,
        insurance_fee_jpy: insuranceFee,
        signature_fee_jpy: signatureFee,
        oversize_fee_jpy: 0,
        total_price_jpy: totalPrice,
        total_price_usd: totalPrice / USD_JPY_RATE,
        recommended_price_jpy: recommendedPrice,
        recommended_price_usd: row.shipping_cost_with_margin_usd,
        delivery_days_min: row.delivery_days_min || 3,
        delivery_days_max: row.delivery_days_max || 14,
        delivery_days_text: row.delivery_days_min && row.delivery_days_max ?
          `${row.delivery_days_min}-${row.delivery_days_max}営業日` : '3-14営業日',
        tracking: true,
        insurance_included: row.service_code.includes('REG'),
        signature_available: true,
        max_dimensions: {
          length_cm: 150,
          width_cm: 150,
          height_cm: 150
        },
        restrictions: [],
        warnings: [],
        source_table: 'ebay_shipping_master',
        calculation_timestamp: new Date().toISOString()
      }
    })

    console.log(`変換後: ${results.length}件`)

    // 配送会社ごとにグループ化してソート
    const groupedByCarrier = results.reduce((acc, result) => {
      const key = result.carrier_name
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(result)
      return acc
    }, {} as Record<string, ShippingCalculationResult[]>)

    console.log('グループ化後:', Object.keys(groupedByCarrier).map(k => `${k}: ${groupedByCarrier[k].length}件`))

    // 各配送会社内で価格順にソート
    Object.keys(groupedByCarrier).forEach(carrier => {
      groupedByCarrier[carrier].sort((a, b) => a.base_price_jpy - b.base_price_jpy)
    })

    // フラットな配列に戻す（配送会社順）
    const sortedResults = Object.values(groupedByCarrier).flat()

    console.log(`=== V4 Master API: 完了 ${sortedResults.length}件 ===`)
    console.log('最終結果（先頭5件）:', sortedResults.slice(0, 5).map(r => `${r.carrier_name} - ${r.service_name}`))
    
    return {
      data: sortedResults,
      meta: {
        total_count: sortedResults.length,
        execution_time_ms: Date.now(),
        by_carrier: Object.keys(groupedByCarrier).reduce((acc, carrier) => {
          acc[carrier] = groupedByCarrier[carrier].length
          return acc
        }, {} as Record<string, number>)
      }
    }
  } catch (error) {
    console.error('=== V4 Master API: エラー ===', error)
    return {
      error: {
        message: '送料計算中にエラーが発生しました: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }
}
