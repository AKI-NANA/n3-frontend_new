/**
 * eBay USA配送ポリシーベースの価格計算
 * 
 * 重量と商品価格から、ebay_shipping_policiesテーブルを参照して
 * 適切な送料を計算します。
 */

import { supabase } from './supabase'

export interface EbayUsaShippingInput {
  weight_kg: number
  item_price_usd: number
}

export interface EbayUsaShippingResult {
  policy_id: number
  policy_name: string
  weight_range: string
  
  // 送料詳細
  base_rate_usd: number          // 実送料
  ddp_duty_usd: number           // 関税
  ddp_tax_usd: number            // 税金
  ddp_total_usd: number          // 合計送料（顧客に表示）
  additional_item_usd: number    // 追加アイテム送料
  
  // Rate Table情報
  rate_table_name: string
  ddp_type_code: string
  
  // ポリシー状態
  ebay_policy_id: string | null
  ebay_policy_status: string
  deployed_at: string | null
}

/**
 * 重量と商品価格から適切な配送ポリシーを取得
 */
export async function getEbayUsaShippingPolicy(
  input: EbayUsaShippingInput
): Promise<EbayUsaShippingResult | null> {
  const { weight_kg, item_price_usd } = input

  try {
    // 重量範囲に合致するポリシーを検索
    const { data, error } = await supabase
      .from('ebay_shipping_policies')
      .select('*')
      .lte('weight_from_kg', weight_kg)
      .gte('weight_to_kg', weight_kg)
      .order('weight_from_kg', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) {
      console.warn('配送ポリシーが見つかりません:', error?.message)
      return null
    }

    // DDP手数料の計算（商品価格ベース）
    // 注: 現在のテーブルには商品価格別のDDP手数料がないため、
    // 固定値を使用。将来的にはマトリックステーブルから取得
    const ddpDuty = data.usa_ddp_duty_usd || 0
    const ddpTax = data.usa_ddp_tax_usd || 0

    return {
      policy_id: data.id,
      policy_name: data.policy_name,
      weight_range: `${data.weight_from_kg}-${data.weight_to_kg}kg`,
      
      base_rate_usd: data.usa_ddp_base_rate_usd,
      ddp_duty_usd: ddpDuty,
      ddp_tax_usd: ddpTax,
      ddp_total_usd: data.usa_ddp_total_usd,
      additional_item_usd: data.usa_additional_item_usd,
      
      rate_table_name: data.rate_table_name,
      ddp_type_code: data.ddp_type_code,
      
      ebay_policy_id: data.ebay_policy_id,
      ebay_policy_status: data.ebay_policy_status,
      deployed_at: data.deployed_at
    }
  } catch (error) {
    console.error('配送ポリシー取得エラー:', error)
    return null
  }
}

/**
 * 複数アイテムの送料を計算
 */
export async function calculateMultiItemShipping(
  items: Array<{ weight_kg: number; price_usd: number; quantity: number }>
): Promise<{
  first_item_shipping: number
  additional_items_shipping: number
  total_shipping: number
  policies_used: EbayUsaShippingResult[]
} | null> {
  if (items.length === 0) {
    return null
  }

  // 最初のアイテム
  const firstItem = items[0]
  const firstPolicy = await getEbayUsaShippingPolicy({
    weight_kg: firstItem.weight_kg,
    item_price_usd: firstItem.price_usd
  })

  if (!firstPolicy) {
    return null
  }

  let totalShipping = firstPolicy.ddp_total_usd
  const policiesUsed = [firstPolicy]

  // 追加アイテム
  let additionalShipping = 0

  // 最初のアイテムの追加数量
  if (firstItem.quantity > 1) {
    additionalShipping += firstPolicy.additional_item_usd * (firstItem.quantity - 1)
  }

  // 他のアイテム
  for (let i = 1; i < items.length; i++) {
    const item = items[i]
    const policy = await getEbayUsaShippingPolicy({
      weight_kg: item.weight_kg,
      item_price_usd: item.price_usd
    })

    if (policy) {
      additionalShipping += policy.additional_item_usd * item.quantity
      policiesUsed.push(policy)
    }
  }

  totalShipping += additionalShipping

  return {
    first_item_shipping: firstPolicy.ddp_total_usd,
    additional_items_shipping: additionalShipping,
    total_shipping: totalShipping,
    policies_used: policiesUsed
  }
}

/**
 * 商品価格に基づくDDP手数料を計算（将来の実装用）
 * 
 * 現在は固定値を返すが、将来的には商品価格×重量のマトリックステーブルから取得
 */
export function calculateDdpFees(
  item_price_usd: number,
  weight_kg: number
): {
  duty_usd: number
  tax_usd: number
  total_ddp_usd: number
} {
  // 簡易計算（実際にはマトリックステーブルから取得すべき）
  const dutyRate = 0.03 // 3%
  const taxRate = 0.10  // 10%

  const duty = item_price_usd * dutyRate
  const tax = item_price_usd * taxRate

  return {
    duty_usd: Math.round(duty * 100) / 100,
    tax_usd: Math.round(tax * 100) / 100,
    total_ddp_usd: Math.round((duty + tax) * 100) / 100
  }
}

/**
 * USA DDP配送コストマトリックスから価格を取得（将来の実装）
 * 
 * エクセルデータがSupabaseに格納されたら、このfunction実装する
 */
export async function getUsaDdpMatrixPrice(
  weight_kg: number,
  item_price_usd: number
): Promise<{
  shipping_cost: number
  ddp_fee: number
  total: number
} | null> {
  // TODO: usa_ddp_cost_matrixテーブルが作成されたら実装
  // 現在はnullを返す
  return null
}
