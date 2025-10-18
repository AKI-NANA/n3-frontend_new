/**
 * USA DDP配送コストマトリックスからの料金取得
 * 
 * マトリックス構造:
 * - 縦軸: 60重量帯 (0.0-0.5kg, 0.5-0.75kg, ...)
 * - 横軸: 商品価格 ($50, $100, $150, ..., $900)
 * - 各セル: { 実送料, DDP手数料, 合計送料 }
 */

import { supabase } from '@/lib/supabase/client'

// 重量帯定義（60段階）
export const WEIGHT_BANDS = [
  { min: 0.0, max: 0.5 },
  { min: 0.5, max: 0.75 },
  { min: 0.75, max: 1.0 },
  // ... 続く
]

// 商品価格帯定義
export const PRICE_POINTS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900]

export interface UsaDdpRate {
  weight_min_kg: number
  weight_max_kg: number
  product_price_usd: number
  base_shipping_usd: number  // 実送料（固定）
  ddp_fee_usd: number        // DDP手数料（関税+税金）
  total_shipping_usd: number // 合計（顧客表示送料）
}

/**
 * USA DDP料金を取得（重量 × 商品価格）
 */
export async function getUsaDdpRate(
  weight_kg: number,
  productPrice_usd: number
): Promise<UsaDdpRate | null> {
  
  // STEP 1: 該当する重量帯を見つける
  // 重量範囲: weight_min_kg <= weight_kg < weight_max_kg
  const { data: weightBands, error: weightError } = await supabase
    .from('usa_ddp_rates')
    .select('weight_min_kg, weight_max_kg')
    .lte('weight_min_kg', weight_kg)
    .gt('weight_max_kg', weight_kg)
    .limit(1)
  
  if (weightError || !weightBands || weightBands.length === 0) {
    console.error('重量帯が見つかりません:', weight_kg, weightError)
    return null
  }
  
  const weightBand = weightBands[0]

  // STEP 2: 該当する商品価格帯を見つける（線形補間）
  const pricePoints = PRICE_POINTS.sort((a, b) => a - b)
  
  let lowerPrice = pricePoints[0]
  let upperPrice = pricePoints[pricePoints.length - 1]
  
  // 商品価格が範囲外の場合
  if (productPrice_usd < lowerPrice) {
    productPrice_usd = lowerPrice
  } else if (productPrice_usd > upperPrice) {
    productPrice_usd = upperPrice
  }
  
  // 商品価格が価格ポイント間にある場合は補間
  for (let i = 0; i < pricePoints.length - 1; i++) {
    if (productPrice_usd >= pricePoints[i] && productPrice_usd <= pricePoints[i + 1]) {
      lowerPrice = pricePoints[i]
      upperPrice = pricePoints[i + 1]
      break
    }
  }
  
  // STEP 3: データベースから下限と上限の料金を取得
  const { data: rates, error: ratesError } = await supabase
    .from('usa_ddp_rates')
    .select('*')
    .eq('weight_min_kg', weightBand.weight_min_kg)
    .eq('weight_max_kg', weightBand.weight_max_kg)
    .in('product_price_usd', [lowerPrice, upperPrice])
    .order('product_price_usd', { ascending: true })

  if (ratesError || !rates || rates.length === 0) {
    console.error('料金データが見つかりません:', { 
      weight: weightBand, 
      prices: [lowerPrice, upperPrice],
      error: ratesError 
    })
    return null
  }

  // STEP 4: 線形補間でDDP手数料を計算
  if (rates.length === 1 || productPrice_usd === lowerPrice) {
    // 完全一致または下限値
    return rates[0]
  }

  // 2つの料金ポイント間で補間
  const rate1 = rates[0]
  const rate2 = rates.length > 1 ? rates[1] : rates[0]
  
  if (productPrice_usd === upperPrice) {
    return rate2
  }

  const ratio = (productPrice_usd - lowerPrice) / (upperPrice - lowerPrice)
  const interpolatedDdpFee = rate1.ddp_fee_usd + (rate2.ddp_fee_usd - rate1.ddp_fee_usd) * ratio
  const interpolatedTotal = rate1.total_shipping_usd + (rate2.total_shipping_usd - rate1.total_shipping_usd) * ratio

  return {
    weight_min_kg: weightBand.weight_min_kg,
    weight_max_kg: weightBand.weight_max_kg,
    product_price_usd: productPrice_usd,
    base_shipping_usd: rate1.base_shipping_usd,  // 実送料は固定
    ddp_fee_usd: parseFloat(interpolatedDdpFee.toFixed(2)),
    total_shipping_usd: parseFloat(interpolatedTotal.toFixed(2))
  }
}

/**
 * 商品価格に最適な配送料金を検索
 * （商品価格比率を目標にする）
 */
export async function findOptimalShippingRate(
  weight_kg: number,
  totalRevenue_usd: number,
  targetProductPriceRatio: number = 0.8  // 80%
): Promise<UsaDdpRate | null> {
  
  // 目標商品価格
  const targetProductPrice = totalRevenue_usd * targetProductPriceRatio
  
  // 該当する重量帯の全料金を取得
  const { data: rates, error } = await supabase
    .from('usa_ddp_rates')
    .select('*')
    .lte('weight_min_kg', weight_kg)
    .gt('weight_max_kg', weight_kg)
    .order('product_price_usd', { ascending: true })
  
  if (error || !rates) {
    return null
  }

  // 最も近い料金を見つける
  let bestRate = rates[0]
  let bestDiff = Math.abs(targetProductPrice - (totalRevenue_usd - rates[0].total_shipping_usd))
  
  for (const rate of rates) {
    const resultProductPrice = totalRevenue_usd - rate.total_shipping_usd
    const diff = Math.abs(targetProductPrice - resultProductPrice)
    
    if (diff < bestDiff) {
      bestDiff = diff
      bestRate = rate
    }
  }
  
  return bestRate
}

/**
 * USA DDP料金マトリックス全体を取得（管理画面用）
 */
export async function getUsaDdpRateMatrix() {
  const { data, error } = await supabase
    .from('usa_ddp_rates')
    .select('*')
    .order('weight_min_kg', { ascending: true })
    .order('product_price_usd', { ascending: true })
  
  if (error) {
    console.error('マトリックス取得エラー:', error)
    return null
  }
  
  // 重量帯ごとにグループ化
  const matrix: Record<string, UsaDdpRate[]> = {}
  
  for (const rate of data) {
    const key = `${rate.weight_min_kg}-${rate.weight_max_kg}kg`
    if (!matrix[key]) {
      matrix[key] = []
    }
    matrix[key].push(rate)
  }
  
  return matrix
}
