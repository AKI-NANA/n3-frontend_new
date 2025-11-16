import { NextRequest, NextResponse } from 'next/server'
import { resolveProductStrategy, resolveBulkStrategies } from '@/lib/pricing/strategy-resolver'
import { calculatePrice, calculateBulkPrices, PriceCalculationInput } from '@/lib/pricing/pricing-engine'

/**
 * POST /api/pricing-engine/calculate
 * 商品の価格を計算する
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, products } = body

    // 単一商品の計算
    if (product_id) {
      const strategy = await resolveProductStrategy(product_id)
      
      if (!strategy) {
        return NextResponse.json({
          success: false,
          error: '戦略の解決に失敗しました'
        }, { status: 400 })
      }

      const input: PriceCalculationInput = {
        product_id,
        cost_jpy: body.cost_jpy || 0,
        shipping_cost_jpy: body.shipping_cost_jpy || 0,
        competitor_lowest_price_usd: body.competitor_lowest_price_usd,
        competitor_average_price_usd: body.competitor_average_price_usd,
        current_price_usd: body.current_price_usd,
        exchange_rate: body.exchange_rate
      }

      const result = await calculatePrice(input, strategy)

      return NextResponse.json({
        success: true,
        data: result
      })
    }

    // 一括計算
    if (products && Array.isArray(products)) {
      const productIds = products.map(p => p.product_id)
      const strategies = await resolveBulkStrategies(productIds)

      const inputs: PriceCalculationInput[] = products.map(p => ({
        product_id: p.product_id,
        cost_jpy: p.cost_jpy || 0,
        shipping_cost_jpy: p.shipping_cost_jpy || 0,
        competitor_lowest_price_usd: p.competitor_lowest_price_usd,
        competitor_average_price_usd: p.competitor_average_price_usd,
        current_price_usd: p.current_price_usd,
        exchange_rate: p.exchange_rate
      }))

      const results = await calculateBulkPrices(inputs, strategies)

      return NextResponse.json({
        success: true,
        data: results
      })
    }

    return NextResponse.json({
      success: false,
      error: 'product_id または products が必要です'
    }, { status: 400 })

  } catch (error) {
    console.error('[PricingEngine API] エラー:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '価格計算に失敗しました'
    }, { status: 500 })
  }
}
