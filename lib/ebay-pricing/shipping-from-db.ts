/**
 * USA DDP送料をDBから直接取得するヘルパー関数
 * 
 * usa_ddp_ratesテーブルから重量と商品価格に応じた送料を取得
 */

import { createClient } from '@/lib/supabase/client'

export interface ShippingRateFromDB {
  weight_kg: number
  product_price_usd: number
  base_shipping: number
  ddp_fee: number
  total_shipping: number
}

/**
 * DBから最適な送料を取得
 * 
 * @param weight_kg 重量（kg）
 * @param productPrice_usd 商品価格（USD）
 * @returns 送料情報
 */
export async function getShippingFromDB(
  weight_kg: number,
  productPrice_usd: number
): Promise<ShippingRateFromDB | null> {
  try {
    const supabase = createClient()

    // まず1行取得してカラム名を確認
    const { data: sample, error: sampleError } = await supabase
      .from('usa_ddp_rates')
      .select('*')
      .limit(1)

    if (sampleError || !sample || sample.length === 0) {
      console.warn('⚠️ usa_ddp_ratesテーブルにアクセスできません。簡易計算にフォールバックします。')
      return null
    }

    // カラム名を検出
    const columns = Object.keys(sample[0])

    // 重量カラムを推測
    const weightColumn = columns.find(col => 
      col.toLowerCase().includes('weight') || 
      col.toLowerCase() === 'kg' ||
      col.toLowerCase() === 'wt'
    )

    if (!weightColumn) {
      console.warn('⚠️ 重量カラムが見つかりません')
      return null
    }

    // 重量に最も近いレコードを取得
    const { data: rates, error } = await supabase
      .from('usa_ddp_rates')
      .select('*')
      .gte(weightColumn, weight_kg)
      .order(weightColumn, { ascending: true })
      .limit(1)

    if (error) {
      console.warn(`⚠️ 重量${weight_kg}kgのデータ取得エラー`)
      return null
    }

    if (!rates || rates.length === 0) {
      console.warn(`⚠️ 重量${weight_kg}kgに対応する送料データがDBに見つかりません`)
      return null
    }

    const rate = rates[0]

    // 商品価格に最も近い列を見つける
    // usa_ddp_ratesテーブルの列名: price_50, price_100, price_150, ..., price_3500
    const priceColumns = []
    for (let price = 50; price <= 3500; price += 50) {
      priceColumns.push(`price_${price}`)
    }

    // 商品価格に最も近い列を選択
    let bestColumn = 'price_50'
    let bestDiff = Math.abs(50 - productPrice_usd)

    for (let price = 50; price <= 3500; price += 50) {
      const diff = Math.abs(price - productPrice_usd)
      if (diff < bestDiff) {
        bestDiff = diff
        bestColumn = `price_${price}`
      }
    }

    const totalShipping = rate[bestColumn]

    if (totalShipping === null || totalShipping === undefined) {
      console.warn(`⚠️ 列${bestColumn}のデータがありません`)
      return null
    }

    // DDP費用を分解（仮定: DDP fee = 総送料の30%）
    const baseShipping = totalShipping * 0.7
    const ddpFee = totalShipping * 0.3

    return {
      weight_kg: rate[weightColumn], // 💈 動的に取得
      product_price_usd: productPrice_usd,
      base_shipping: baseShipping,
      ddp_fee: ddpFee,
      total_shipping: totalShipping
    }
  } catch (error) {
    console.error('❌ 送料取得エラー:', error)
    return null
  }
}

/**
 * 複数の商品価格帯での送料を一括取得
 * 
 * @param weight_kg 重量（kg）
 * @param productPrices 商品価格の配列（USD）
 * @returns 送料情報の配列
 */
export async function getMultipleShippingRates(
  weight_kg: number,
  productPrices: number[]
): Promise<ShippingRateFromDB[]> {
  const results: ShippingRateFromDB[] = []

  for (const price of productPrices) {
    const rate = await getShippingFromDB(weight_kg, price)
    if (rate) {
      results.push(rate)
    }
  }

  return results
}

/**
 * 全重量帯のデータを取得
 */
export async function getAllWeightRanges(): Promise<number[]> {
  try {
    const supabase = createClient()

    // まず1行取得してカラム名を確認
    const { data: sample, error: sampleError } = await supabase
      .from('usa_ddp_rates')
      .select('*')
      .limit(1)

    if (sampleError || !sample || sample.length === 0) {
      console.error('❌ usa_ddp_ratesテーブルにアクセスできません')
      console.log('🔧 フォールバック: デフォルト重量を使用します')
      return [] // 空配列を返すことでフォールバックが動作する
    }

    // カラム名を検出
    const columns = Object.keys(sample[0])
    console.log('✅ 検出されたカラム:', columns)

    // 重量カラムを推測
    const weightColumn = columns.find(col => 
      col.toLowerCase().includes('weight') || 
      col.toLowerCase() === 'kg' ||
      col.toLowerCase() === 'wt'
    )

    if (!weightColumn) {
      console.error('⚠️ 重量カラムが見つかりません')
      console.log('利用可能なカラム:', columns)
      return []
    }

    console.log(`✅ 重量カラムを検出: ${weightColumn}`)

    // 全データを取得
    const { data, error } = await supabase
      .from('usa_ddp_rates')
      .select(weightColumn)
      .order(weightColumn, { ascending: true })

    if (error) {
      console.error('❌ DBエラー:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ usa_ddp_ratesテーブルにデータがありません')
      return []
    }

    return data.map(d => d[weightColumn])
  } catch (error) {
    console.error('❌ 重量帯取得エラー:', error)
    return []
  }
}

/**
 * 利用可能な商品価格帯を取得
 */
export function getAvailablePriceRanges(): number[] {
  const prices = []
  for (let price = 50; price <= 3500; price += 50) {
    prices.push(price)
  }
  return prices
}
