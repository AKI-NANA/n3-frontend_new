/**
 * 配送ポリシー選択ロジック（最新版）
 * 
 * ebay_shipping_policies_final テーブルから選択
 * ポリシー名フォーマット: EXP_XX_YY
 * 
 * 重量と商品価格に基づいて最適なポリシーを選択
 */

import { supabase } from '@/lib/supabase'

interface ShippingPolicy {
  id: number
  policy_name: string
  weight_from_kg: number
  weight_to_kg: number
  product_price_usd: number
  usa_total_shipping_usd: number
  ebay_policy_id: string | null
}

/**
 * 配送ポリシーをDBから検索
 * 
 * @param weightG 重量（グラム）
 * @param priceUsd 商品価格（USD）
 * @returns 最適な配送ポリシー
 */
export async function findShippingPolicy(
  weightG: number,
  priceUsd: number
): Promise<ShippingPolicy | null> {
  try {
    const weightKg = weightG / 1000

    console.log(`🔍 配送ポリシー検索: 重量=${weightKg}kg, 価格=$${priceUsd}`)

    // 重量と価格の両方に一致するポリシーを検索
    const { data, error } = await supabase
      .from('ebay_shipping_policies_final')
      .select('*')
      .gte('weight_to_kg', weightKg)
      .lte('weight_from_kg', weightKg)
      .gte('product_price_usd', priceUsd * 0.9) // 価格の±10%で検索
      .lte('product_price_usd', priceUsd * 1.1)
      .order('product_price_usd')
      .limit(1)

    if (error) {
      console.error('配送ポリシー検索エラー:', error)
      
      // エラーの場合は重量のみで検索
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('ebay_shipping_policies_final')
        .select('*')
        .gte('weight_to_kg', weightKg)
        .lte('weight_from_kg', weightKg)
        .order('product_price_usd')
        .limit(1)

      if (fallbackError || !fallbackData || fallbackData.length === 0) {
        console.warn(`⚠️ 配送ポリシーが見つかりません`)
        return null
      }

      console.log(`✅ フォールバック: ${fallbackData[0].policy_name}`)
      return fallbackData[0] as ShippingPolicy
    }

    if (!data || data.length === 0) {
      // 完全一致が見つからない場合、最も近いポリシーを検索
      const { data: nearestData, error: nearestError } = await supabase
        .from('ebay_shipping_policies_final')
        .select('*')
        .gte('weight_to_kg', weightKg)
        .lte('weight_from_kg', weightKg)
        .order('product_price_usd')
        .limit(1)

      if (nearestError || !nearestData || nearestData.length === 0) {
        console.warn(`⚠️ 配送ポリシーが見つかりません`)
        return null
      }

      console.log(`✅ 最も近いポリシー: ${nearestData[0].policy_name}`)
      return nearestData[0] as ShippingPolicy
    }

    console.log(`✅ ポリシー見つかりました: ${data[0].policy_name}`)
    return data[0] as ShippingPolicy
  } catch (error) {
    console.error('配送ポリシー検索エラー:', error)
    return null
  }
}

/**
 * 配送ポリシー一覧を取得
 */
export async function listShippingPolicies(): Promise<ShippingPolicy[]> {
  try {
    const { data, error } = await supabase
      .from('ebay_shipping_policies_final')
      .select('*')
      .order('weight_from_kg, product_price_usd')

    if (error) throw error

    return (data || []) as ShippingPolicy[]
  } catch (error) {
    console.error('配送ポリシー一覧取得エラー:', error)
    return []
  }
}

/**
 * 送料計算時に使用する配送ポリシー選択
 */
export async function selectShippingPolicyForProduct(
  weightG: number,
  ddpPriceUsd: number
): Promise<string | null> {
  const policy = await findShippingPolicy(weightG, ddpPriceUsd)
  return policy?.policy_name || null
}

/**
 * ポリシーから送料を取得
 */
export async function getShippingCostFromPolicy(
  policyName: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('ebay_shipping_policies_final')
      .select('usa_total_shipping_usd')
      .eq('policy_name', policyName)
      .single()

    if (error || !data) return null

    return data.usa_total_shipping_usd
  } catch (error) {
    console.error('送料取得エラー:', error)
    return null
  }
}
