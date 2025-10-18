/**
 * eBayカテゴリー送料上限チェック
 */

import { createClient } from '@/lib/supabase/client'

export interface ShippingLimit {
  category_id: string
  category_name: string
  max_shipping_usd: number
  requires_calculated: boolean
  notes: string
}

/**
 * カテゴリーIDから送料上限を取得
 */
export async function getShippingLimit(categoryId: string): Promise<ShippingLimit | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('ebay_category_shipping_limits')
      .select('*')
      .eq('category_id', categoryId)
      .single()

    if (error) {
      console.log(`ℹ️ カテゴリー${categoryId}には送料上限がありません`)
      return null
    }

    return data
  } catch (error) {
    console.error('❌ 送料上限取得エラー:', error)
    return null
  }
}

/**
 * HTSコードから推測されるeBayカテゴリーを取得
 * （簡易版：実際にはeBayカテゴリーマッピングテーブルが必要）
 */
export function inferCategoryFromHTS(htsCode: string): string | null {
  // Books
  if (htsCode.startsWith('4901')) {
    return '267' // Books
  }
  
  // DVDs/CDs
  if (htsCode.startsWith('8523')) {
    return '617' // DVDs & Blu-ray
  }
  
  // Vinyl Records
  if (htsCode.startsWith('8524')) {
    return '176984' // Vinyl Records
  }
  
  // Video Games
  if (htsCode.startsWith('9504')) {
    return '139973' // Video Games
  }
  
  return null
}

/**
 * 送料が上限を超えているかチェック
 */
export function checkShippingLimit(
  shipping: number,
  limit: ShippingLimit | null
): {
  isValid: boolean
  message: string | null
  adjustedShipping?: number
} {
  if (!limit) {
    // 上限がないカテゴリー
    return { isValid: true, message: null }
  }

  if (shipping <= limit.max_shipping_usd) {
    // 上限内
    return { isValid: true, message: null }
  }

  // 上限を超えている
  return {
    isValid: false,
    message: `送料$${shipping.toFixed(2)}が上限$${limit.max_shipping_usd}を超えています。商品価格に含める必要があります。`,
    adjustedShipping: limit.max_shipping_usd
  }
}

/**
 * 送料を商品価格に含める調整
 */
export function adjustPriceForShippingLimit(
  productPrice: number,
  shipping: number,
  limit: ShippingLimit
): {
  adjustedProductPrice: number
  adjustedShipping: number
  excessAmount: number
} {
  const excess = Math.max(0, shipping - limit.max_shipping_usd)
  
  return {
    adjustedProductPrice: productPrice + excess,
    adjustedShipping: limit.max_shipping_usd,
    excessAmount: excess
  }
}
