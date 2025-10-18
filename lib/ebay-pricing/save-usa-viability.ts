/**
 * USA DDP出品可否判定をDBに保存
 */

import { createClient } from '@/lib/supabase/client'
import { calculateSimpleUsaPrice } from './simple-usa-calculator'

export async function saveUsaDdpViability(params: {
  productId: number
  costJPY: number
  weight_kg: number
  targetMargin: number
  hsCode: string
  originCountry: string
  fvfRate?: number
  exchangeRate?: number
}) {
  const {
    productId,
    costJPY,
    weight_kg,
    targetMargin,
    hsCode,
    originCountry,
    fvfRate = 0.1315,
    exchangeRate = 154.32
  } = params

  console.log(`📊 商品ID ${productId} のUSA出品可否をチェック中...`)

  try {
    // DDP価格を計算
    const result = await calculateSimpleUsaPrice({
      costJPY,
      weight_kg,
      targetMargin,
      hsCode,
      originCountry,
      fvfRate,
      exchangeRate
    })

    const supabase = createClient()

    // 結果をDBに保存
    const { error } = await supabase
      .from('yahoo_scraped_products')
      .update({
        usa_ddp_viable: result.isViable || false,
        usa_ddp_min_margin: result.minAchievableMargin || result.profitMargin || null,
        usa_ddp_reason: result.isViable 
          ? `目標利益率${targetMargin}%で出品可能`
          : (result.viabilityReason || result.error || '計算エラー'),
        usa_ddp_checked_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (error) {
      console.error(`❌ 商品ID ${productId} の更新に失敗:`, error)
      return false
    }

    if (result.isViable) {
      console.log(`✅ 商品ID ${productId}: USA出品可能 (利益率${result.profitMargin?.toFixed(1)}%)`)
    } else {
      console.warn(`⚠️ 商品ID ${productId}: USA出品不可`)
      console.warn(`   理由: ${result.viabilityReason || result.error}`)
      console.warn(`   最大利益率: ${result.minAchievableMargin?.toFixed(1)}%`)
    }

    return true

  } catch (error) {
    console.error(`❌ 商品ID ${productId} の計算エラー:`, error)
    
    // エラーもDBに記録
    const supabase = createClient()
    await supabase
      .from('yahoo_scraped_products')
      .update({
        usa_ddp_viable: false,
        usa_ddp_reason: error instanceof Error ? error.message : '不明なエラー',
        usa_ddp_checked_at: new Date().toISOString()
      })
      .eq('id', productId)

    return false
  }
}

/**
 * 全商品のUSA出品可否を一括チェック
 */
export async function batchCheckUsaViability(params: {
  limit?: number
  targetMargin?: number
}) {
  const { limit = 100, targetMargin = 15 } = params

  const supabase = createClient()

  // チェック対象の商品を取得
  const { data: products, error } = await supabase
    .from('yahoo_scraped_products')
    .select('id, cost_jpy, weight_kg, origin_country, hs_code')
    .is('usa_ddp_checked_at', null)  // 未チェックの商品
    .limit(limit)

  if (error || !products || products.length === 0) {
    console.log('チェック対象の商品がありません')
    return { success: 0, failed: 0, total: 0 }
  }

  console.log(`📊 ${products.length}件の商品をチェックします`)

  let success = 0
  let failed = 0

  for (const product of products) {
    const result = await saveUsaDdpViability({
      productId: product.id,
      costJPY: product.cost_jpy,
      weight_kg: product.weight_kg || 0.5,
      targetMargin,
      hsCode: product.hs_code || '9620.00.20.00',
      originCountry: product.origin_country || 'JP'
    })

    if (result) {
      success++
    } else {
      failed++
    }

    // 進捗表示
    if ((success + failed) % 10 === 0) {
      console.log(`進捗: ${success + failed}/${products.length}`)
    }
  }

  console.log(`✅ 完了: 成功${success}件 / 失敗${failed}件 / 合計${products.length}件`)

  return { success, failed, total: products.length }
}
