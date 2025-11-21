/**
 * 精密DDP計算API
 * POST /api/products/calculate-precise-ddp
 *
 * inventory_masterのsource_dataから重量・HSコード・原産国を取得し、
 * 既存のDDP計算ロジックで正確な損益分岐点価格（DDP cost）を算出
 *
 * 目的:
 * - バリエーション作成時の最大DDPコスト戦略に必要な精密計算
 * - 簡易的なcost_priceではなく、関税・MPF/HMF・容積重量を考慮
 * - 赤字リスクの構造的排除
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRate } from '@/lib/inventory-monitoring/price-recalculation'

// 定数
const DDP_SERVICE_FEE = 15  // DDP固定手数料
const MPF_RATE = 0.003464   // Merchandise Processing Fee
const DEFAULT_FVF_RATE = 0.1319  // eBay Final Value Fee (13.19%)
const DEFAULT_TARIFF_RATE = 0.058  // 基本関税率 5.8%

interface DDPCalculationRequest {
  items: Array<{
    sku: string
    cost_jpy: number
    weight_g: number
    hs_code?: string | null
    origin_country?: string | null
    selling_price_usd?: number  // オプション：既存価格がある場合
  }>
  exchange_rate?: number
  fvf_rate?: number
}

interface DDPCalculationResult {
  sku: string
  precise_ddp_cost_usd: number  // 損益分岐点価格（最小販売価格）
  breakdown: {
    base_cost_usd: number
    shipping_cost_usd: number
    ddp_fee_usd: number
    fvf_usd: number
    total_cost_usd: number
  }
  weight_info: {
    weight_g: number
    weight_kg: number
    selected_tier_kg: number
    shipping_rate_usd: number
  }
  tariff_info: {
    hs_code: string | null
    origin_country: string | null
    base_tariff_rate: number
    additional_tariff_rate: number
    total_tariff_rate: number
    effective_ddp_rate: number
  }
  warnings: string[]
  has_complete_data: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body: DDPCalculationRequest = await req.json()
    const {
      items,
      exchange_rate: providedExchangeRate,
      fvf_rate = DEFAULT_FVF_RATE
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'items配列が必要です' },
        { status: 400 }
      )
    }

    // ===== 為替レートのリアルタイム取得（4-C修正）=====
    let exchange_rate: number

    if (providedExchangeRate) {
      // 明示的に指定された場合はそれを使用
      exchange_rate = providedExchangeRate
      console.log(`💱 為替レート（指定値）: ¥${exchange_rate}/USD`)
    } else {
      // 未指定の場合は外部APIからリアルタイム取得
      try {
        const rateJpyToUsd = await getExchangeRate()  // 1円 = X ドル（例: 0.0067）
        exchange_rate = 1 / rateJpyToUsd  // 1ドル = Y 円（例: 149.25）に変換
        console.log(`💱 為替レート（リアルタイム取得）: ¥${exchange_rate.toFixed(2)}/USD`)
      } catch (error: any) {
        console.error('❌ 為替レート取得失敗:', error.message)

        // ⚠️ フォールバックは使用せず、出品をブロック
        return NextResponse.json({
          success: false,
          error: '為替レート取得に失敗しました',
          details: '外部為替レートAPIに接続できませんでした。ネットワーク接続を確認してから再試行してください。',
          technical_error: error.message,
          action_required: 'システム管理者に連絡するか、しばらく待ってから再試行してください'
        }, { status: 503 })
      }
    }

    const supabase = createClient()
    const results: DDPCalculationResult[] = []

    console.log(`\n💰 精密DDP計算開始: ${items.length}件`)
    console.log(`FVF率: ${(fvf_rate * 100).toFixed(2)}%`)

    for (const item of items) {
      try {
        const result = await calculatePreciseDDP(
          item,
          supabase,
          exchange_rate,
          fvf_rate
        )
        results.push(result)
      } catch (error: any) {
        console.error(`❌ SKU ${item.sku} の計算エラー:`, error)
        results.push(createErrorResult(item, error.message))
      }
    }

    // サマリー情報
    const completeDataCount = results.filter(r => r.has_complete_data).length
    const maxDdpCost = Math.max(...results.map(r => r.precise_ddp_cost_usd))
    const minDdpCost = Math.min(...results.map(r => r.precise_ddp_cost_usd))

    console.log(`\n📊 計算完了:`)
    console.log(`完全データ: ${completeDataCount}/${results.length}件`)
    console.log(`最大DDPコスト: $${maxDdpCost.toFixed(2)}`)
    console.log(`最小DDPコスト: $${minDdpCost.toFixed(2)}`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total_items: results.length,
        complete_data_count: completeDataCount,
        max_ddp_cost_usd: maxDdpCost,
        min_ddp_cost_usd: minDdpCost,
        avg_ddp_cost_usd: results.reduce((sum, r) => sum + r.precise_ddp_cost_usd, 0) / results.length
      }
    })

  } catch (error: any) {
    console.error('❌ 精密DDP計算APIエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: '精密DDP計算中にエラーが発生しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * 個別商品の精密DDP計算
 */
async function calculatePreciseDDP(
  item: DDPCalculationRequest['items'][0],
  supabase: any,
  exchangeRate: number,
  fvfRate: number
): Promise<DDPCalculationResult> {
  const warnings: string[] = []
  const { sku, cost_jpy, weight_g, hs_code, origin_country } = item

  console.log(`\n--- SKU: ${sku} ---`)
  console.log(`コスト: ¥${cost_jpy}`)
  console.log(`重量: ${weight_g}g`)

  // ===== ステップ1: 基本コストの算出 =====
  const baseCostUSD = cost_jpy / exchangeRate
  console.log(`基本コスト: $${baseCostUSD.toFixed(2)}`)

  // ===== ステップ2: 関税率の取得 =====
  let baseTariffRate = DEFAULT_TARIFF_RATE
  let additionalTariffRate = 0

  // HSCodeから基本関税率を取得
  if (hs_code) {
    const { data: hsData, error: hsError } = await supabase
      .from('hts_codes')
      .select('base_rate')
      .eq('code', hs_code)
      .maybeSingle()

    if (hsError) {
      console.warn(`⚠️ HSコード検索エラー: ${hsError.message}`)
      warnings.push('HSコード検索エラー（デフォルト5.8%使用）')
    } else if (hsData) {
      baseTariffRate = hsData.base_rate
      console.log(`関税率（HSコード ${hs_code}）: ${(baseTariffRate * 100).toFixed(1)}%`)
    } else {
      console.warn(`⚠️ HSコード ${hs_code} が見つかりません（デフォルト5.8%使用）`)
      warnings.push(`HSコード ${hs_code} 未登録`)
    }
  } else {
    console.warn('⚠️ HSコードなし（デフォルト5.8%使用）')
    warnings.push('HSコードなし')
  }

  // 原産国から追加関税を取得
  if (origin_country) {
    const { data: additionalData, error: additionalError } = await supabase
      .from('country_additional_tariffs')
      .select('additional_rate')
      .eq('country_code', origin_country)
      .eq('is_active', true)
      .maybeSingle()

    if (additionalError) {
      console.warn(`⚠️ 追加関税検索エラー: ${additionalError.message}`)
    } else if (additionalData) {
      additionalTariffRate = additionalData.additional_rate
      console.log(`追加関税（${origin_country}）: ${(additionalTariffRate * 100).toFixed(1)}%`)
    }
  } else {
    console.warn('⚠️ 原産国なし')
    warnings.push('原産国なし')
  }

  const totalTariffRate = baseTariffRate + additionalTariffRate
  const effectiveDDPRate = totalTariffRate + MPF_RATE + 0.08  // 関税 + MPF + 消費税還付
  console.log(`実効DDP率: ${(effectiveDDPRate * 100).toFixed(2)}%`)

  // ===== ステップ3: 重量帯と送料の取得 =====
  const weightKg = weight_g / 1000

  // 重量帯を選択（切り上げ）
  const { data: tierData, error: tierError } = await supabase
    .from('usa_ddp_rates')
    .select('weight, price_60')
    .gte('weight', weightKg)
    .order('weight', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (tierError || !tierData) {
    throw new Error(`重量${weightKg}kgの送料データが見つかりません`)
  }

  const selectedTierKg = tierData.weight
  const baseShippingUSD = tierData.price_60

  console.log(`送料: $${baseShippingUSD} (${selectedTierKg}kg重量帯)`)

  if (selectedTierKg > weightKg * 1.5) {
    warnings.push(`重量帯マージン大: 実重量${weightKg.toFixed(2)}kg → ${selectedTierKg}kg重量帯`)
  }

  // ===== ステップ4: 損益分岐点価格の計算 =====
  // 目標利益率0%で計算 = 最小販売価格（DDP cost）

  /*
   * 数式（利益率 = 0% の場合）:
   *
   * 総売上 = 商品価格(P) + 送料(S)
   * 総コスト = 基本コスト + 送料 + DDP費用 + FVF
   *
   * DDP費用 = P × effectiveDDPRate + DDP_SERVICE_FEE
   * FVF = (P + S) × fvfRate
   *
   * 利益率0%の場合:
   * P + S = 基本コスト + S + (P × effectiveDDPRate + DDP_SERVICE_FEE) + (P + S) × fvfRate
   *
   * 整理すると:
   * P = (基本コスト + DDP_SERVICE_FEE + S × fvfRate) / (1 - effectiveDDPRate - fvfRate)
   */

  const targetMargin = 0  // 損益分岐点
  const S = baseShippingUSD
  const D = effectiveDDPRate
  const V = fvfRate

  const numerator = baseCostUSD + S + DDP_SERVICE_FEE + S * V
  const denominator = 1 - D - V

  console.log(`分子: ${numerator.toFixed(2)}`)
  console.log(`分母: ${denominator.toFixed(4)}`)

  if (denominator <= 0.01) {
    throw new Error(
      `計算不可能: DDP率${(D*100).toFixed(1)}% + FVF${(V*100).toFixed(1)}% = ${((D+V)*100).toFixed(1)}% が高すぎます`
    )
  }

  const breakEvenPrice = numerator / denominator
  console.log(`損益分岐点価格: $${breakEvenPrice.toFixed(2)}`)

  // ===== ステップ5: 内訳の計算 =====
  const totalRevenue = breakEvenPrice + S
  const ddpFee = breakEvenPrice * effectiveDDPRate + DDP_SERVICE_FEE
  const fvf = totalRevenue * fvfRate
  const totalCost = baseCostUSD + S + ddpFee + fvf

  console.log(`内訳:`)
  console.log(`  基本コスト: $${baseCostUSD.toFixed(2)}`)
  console.log(`  送料: $${S.toFixed(2)}`)
  console.log(`  DDP費用: $${ddpFee.toFixed(2)}`)
  console.log(`  FVF: $${fvf.toFixed(2)}`)
  console.log(`  総コスト: $${totalCost.toFixed(2)}`)
  console.log(`  総売上: $${totalRevenue.toFixed(2)}`)
  console.log(`  利益: $${(totalRevenue - totalCost).toFixed(2)} (目標0%)`)

  // データ完全性チェック
  const hasCompleteData = !!(hs_code && origin_country && weight_g > 0)

  if (!hasCompleteData) {
    warnings.push('⚠️ データ不完全（HSコードまたは原産国が欠落）')
  }

  return {
    sku,
    precise_ddp_cost_usd: breakEvenPrice,
    breakdown: {
      base_cost_usd: baseCostUSD,
      shipping_cost_usd: S,
      ddp_fee_usd: ddpFee,
      fvf_usd: fvf,
      total_cost_usd: totalCost
    },
    weight_info: {
      weight_g,
      weight_kg: weightKg,
      selected_tier_kg: selectedTierKg,
      shipping_rate_usd: S
    },
    tariff_info: {
      hs_code: hs_code || null,
      origin_country: origin_country || null,
      base_tariff_rate: baseTariffRate,
      additional_tariff_rate: additionalTariffRate,
      total_tariff_rate: totalTariffRate,
      effective_ddp_rate: effectiveDDPRate
    },
    warnings,
    has_complete_data: hasCompleteData
  }
}

/**
 * エラー時のデフォルト結果を生成
 */
function createErrorResult(
  item: DDPCalculationRequest['items'][0],
  errorMessage: string
): DDPCalculationResult {
  return {
    sku: item.sku,
    precise_ddp_cost_usd: 0,
    breakdown: {
      base_cost_usd: 0,
      shipping_cost_usd: 0,
      ddp_fee_usd: 0,
      fvf_usd: 0,
      total_cost_usd: 0
    },
    weight_info: {
      weight_g: item.weight_g,
      weight_kg: item.weight_g / 1000,
      selected_tier_kg: 0,
      shipping_rate_usd: 0
    },
    tariff_info: {
      hs_code: item.hs_code || null,
      origin_country: item.origin_country || null,
      base_tariff_rate: 0,
      additional_tariff_rate: 0,
      total_tariff_rate: 0,
      effective_ddp_rate: 0
    },
    warnings: [`❌ 計算エラー: ${errorMessage}`],
    has_complete_data: false
  }
}
