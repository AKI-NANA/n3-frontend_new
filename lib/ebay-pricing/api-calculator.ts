// lib/ebay-pricing/api-calculator.ts
/**
 * 他のツールから呼び出すためのeBay価格計算API
 * 
 * tools/editing や他の出品管理ツールから、
 * 実際の商品データを渡して利益計算を行い、
 * 結果をデータベースに保存する
 */

import { supabase } from '@/lib/supabase/client'
import { PriceCalculationEngine } from './price-calculation-engine'
import type {
  CalculationParams,
  Policy,
  MarginSetting,
  CategoryFee,
  ExchangeRate,
  HSCodesDB,
} from './price-calculation-engine'

export interface ProductCalculationInput {
  // 商品基本情報
  productId?: string
  costJPY: number
  actualWeight: number
  length: number
  width: number
  height: number
  
  // 配送・関税情報
  destCountry: string
  originCountry: string
  hsCode: string
  
  // eBay情報
  category: string
  storeType: 'none' | 'basic' | 'premium' | 'anchor' | 'enterprise'
  
  // その他
  refundableFeesJPY?: number
}

export interface ProductCalculationResult {
  success: boolean
  productPrice?: number
  totalRevenue?: number
  profitUSD_NoRefund?: number
  profitUSD_WithRefund?: number
  profitJPY_NoRefund?: number
  profitJPY_WithRefund?: number
  profitMargin?: number
  error?: string
  calculationId?: number
}

/**
 * 商品の利益計算を実行し、結果をデータベースに保存
 * 
 * @param input 商品情報
 * @returns 計算結果とデータベースID
 */
export async function calculateProductProfit(
  input: ProductCalculationInput
): Promise<ProductCalculationResult> {
  try {
    // 1. 必要なデータをSupabaseから取得
    const [
      { data: hsCodes },
      { data: categoryFees },
      { data: policies },
      { data: margins },
      { data: exchangeRates },
    ] = await Promise.all([
      supabase.from('hs_codes').select('*'),
      supabase.from('ebay_pricing_category_fees').select('*').eq('active', true),
      supabase.from('ebay_shipping_policies').select('*, ebay_shipping_zones(*)').eq('active', true),
      supabase.from('profit_margin_settings').select('*').eq('active', true),
      supabase.from('ebay_exchange_rates').select('*').order('created_at', { ascending: false }).limit(1),
    ])

    if (!hsCodes || !categoryFees || !policies || !margins || !exchangeRates || exchangeRates.length === 0) {
      throw new Error('必要なデータの取得に失敗しました')
    }

    // 2. データを整形
    const hsCodesDB = hsCodes.reduce((acc: HSCodesDB, hs: any) => {
      acc[hs.code] = hs
      return acc
    }, {})

    const categoryFee = categoryFees.find((f: any) => f.category_key === input.category) || categoryFees[0]
    
    const effectiveWeight = PriceCalculationEngine.getEffectiveWeight(
      input.actualWeight,
      input.length,
      input.width,
      input.height
    )
    
    const estimatedPrice = (input.costJPY / exchangeRates[0].safe_rate) * 1.5
    
    // ポリシーを選択
    const policy = policies.find((p: any) => 
      effectiveWeight >= p.weight_min &&
      effectiveWeight <= p.weight_max &&
      estimatedPrice >= p.price_min &&
      estimatedPrice <= p.price_max
    ) || policies[0]

    // ゾーン情報を整形
    const policyWithZones: Policy = {
      ...policy,
      zones: policy.ebay_shipping_zones || [],
    }

    const marginSetting = margins.find((m: any) => 
      (m.setting_type === 'category' && m.setting_key === input.category) ||
      (m.setting_type === 'country' && m.setting_key === input.destCountry) ||
      m.setting_type === 'default'
    ) || margins[0]

    const exchangeRate: ExchangeRate = {
      spot: exchangeRates[0].spot_rate,
      buffer: exchangeRates[0].buffer_percent / 100,
      safe: exchangeRates[0].safe_rate,
    }

    // 3. 計算実行
    const calculationParams: CalculationParams = {
      costJPY: input.costJPY,
      actualWeight: input.actualWeight,
      length: input.length,
      width: input.width,
      height: input.height,
      destCountry: input.destCountry,
      originCountry: input.originCountry,
      hsCode: input.hsCode,
      storeType: input.storeType,
      refundableFeesJPY: input.refundableFeesJPY || 0,
    }

    const result = PriceCalculationEngine.calculate(
      calculationParams,
      policyWithZones,
      marginSetting,
      categoryFee,
      exchangeRate,
      hsCodesDB
    )

    // 4. 結果をデータベースに保存
    if (result.success) {
      const { data: savedData, error: saveError } = await supabase
        .from('ebay_calculation_history')
        .insert({
          user_id: null,
          cost_jpy: input.costJPY,
          actual_weight: input.actualWeight,
          length: input.length,
          width: input.width,
          height: input.height,
          dest_country: input.destCountry,
          origin_country: input.originCountry,
          hs_code: input.hsCode,
          category: input.category,
          store_type: input.storeType,
          refundable_fees_jpy: input.refundableFeesJPY || 0,
          product_price: result.productPrice,
          shipping: result.shipping,
          handling: result.handling,
          total_revenue: result.totalRevenue,
          profit_usd_no_refund: result.profitUSD_NoRefund,
          profit_usd_with_refund: result.profitUSD_WithRefund,
          profit_jpy_no_refund: result.profitJPY_NoRefund,
          profit_jpy_with_refund: result.profitJPY_WithRefund,
          profit_margin: result.profitMargin_NoRefund,
          refund_amount: result.refundAmount,
          success: true,
          error_message: null,
        })
        .select()
        .single()

      if (saveError) {
        console.error('履歴保存エラー:', saveError)
      }

      return {
        success: true,
        productPrice: result.productPrice,
        totalRevenue: result.totalRevenue,
        profitUSD_NoRefund: result.profitUSD_NoRefund,
        profitUSD_WithRefund: result.profitUSD_WithRefund,
        profitJPY_NoRefund: result.profitJPY_NoRefund,
        profitJPY_WithRefund: result.profitJPY_WithRefund,
        profitMargin: result.profitMargin_NoRefund,
        calculationId: savedData?.id,
      }
    } else {
      // 計算失敗の場合もエラーとして保存
      await supabase.from('ebay_calculation_history').insert({
        user_id: null,
        cost_jpy: input.costJPY,
        actual_weight: input.actualWeight,
        length: input.length,
        width: input.width,
        height: input.height,
        dest_country: input.destCountry,
        origin_country: input.originCountry,
        hs_code: input.hsCode,
        category: input.category,
        store_type: input.storeType,
        refundable_fees_jpy: input.refundableFeesJPY || 0,
        success: false,
        error_message: result.error,
      })

      return {
        success: false,
        error: result.error,
      }
    }
  } catch (error: any) {
    console.error('計算エラー:', error)
    return {
      success: false,
      error: error.message || '計算中にエラーが発生しました',
    }
  }
}

/**
 * 複数商品の一括計算
 * 
 * @param inputs 商品情報の配列
 * @returns 計算結果の配列
 */
export async function calculateMultipleProducts(
  inputs: ProductCalculationInput[]
): Promise<ProductCalculationResult[]> {
  const results: ProductCalculationResult[] = []

  for (const input of inputs) {
    const result = await calculateProductProfit(input)
    results.push(result)
  }

  return results
}
