import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBulkStrategies } from '@/lib/pricing/strategy-resolver'
import { calculateBulkPrices, PriceCalculationInput } from '@/lib/pricing/pricing-engine'

/**
 * POST /api/pricing-automation/analyze
 * 赤字リスクのある商品を検出
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { exchange_rate } = body
    const exchangeRate = exchange_rate || 150

    const supabase = createClient()

    // 出品中の商品を取得
    const { data: products, error: fetchError } = await supabase
      .from('research_products')
      .select(`
        id,
        title,
        price_usd,
        acquired_price_jpy,
        sm_lowest_price,
        sm_average_price
      `)
      .not('price_usd', 'is', null)
      .limit(1000)

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'データ取得エラー: ' + fetchError.message
      }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        total_products: 0,
        red_flag_count: 0
      })
    }

    // 戦略を解決
    const productIds = products.map(p => p.id)
    const strategies = await resolveBulkStrategies(productIds)

    // 価格計算入力を準備
    const inputs: PriceCalculationInput[] = products.map(p => ({
      product_id: p.id,
      cost_jpy: p.acquired_price_jpy || 0,
      shipping_cost_jpy: 500,
      competitor_lowest_price_usd: p.sm_lowest_price,
      competitor_average_price_usd: p.sm_average_price,
      current_price_usd: p.price_usd,
      exchange_rate: exchangeRate
    }))

    // 一括価格計算
    const calculations = await calculateBulkPrices(inputs, strategies)

    // 赤字警告のある商品をカウント
    const redFlagCount = calculations.filter(c => c.red_flag).length

    return NextResponse.json({
      success: true,
      total_products: products.length,
      red_flag_count: redFlagCount,
      exchange_rate: exchangeRate
    })

  } catch (error) {
    console.error('[Analyze API] エラー:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '分析に失敗しました'
    }, { status: 500 })
  }
}
