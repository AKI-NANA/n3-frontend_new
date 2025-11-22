/**
 * 統合価格計算APIエンドポイント
 *
 * POST /api/pricing/calculate
 *
 * リクエスト例:
 * {
 *   "marketplace_id": "AMAZON_JP",
 *   "cost_jpy": 5000,
 *   "target_profit_jpy": 1000,
 *   "weight_g": 500,
 *   "shipping_method": "FBA_STANDARD",
 *   "exchange_rate": 150
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { IntegratedPricingService, PricingInput } from '@/lib/pricing/IntegratedPricingService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 必須パラメータのバリデーション
    if (!body.marketplace_id) {
      return NextResponse.json(
        { error: 'marketplace_id is required' },
        { status: 400 }
      )
    }

    if (!body.cost_jpy || body.cost_jpy <= 0) {
      return NextResponse.json(
        { error: 'cost_jpy must be a positive number' },
        { status: 400 }
      )
    }

    // 目標利益または目標利益率のいずれかが必要
    if (!body.target_profit_jpy && !body.target_profit_rate) {
      return NextResponse.json(
        { error: 'Either target_profit_jpy or target_profit_rate is required' },
        { status: 400 }
      )
    }

    // PricingInputを構築
    const input: PricingInput = {
      marketplace_id: body.marketplace_id,
      cost_jpy: body.cost_jpy,
      target_profit_jpy: body.target_profit_jpy,
      target_profit_rate: body.target_profit_rate,
      weight_g: body.weight_g,
      shipping_method: body.shipping_method,
      exchange_rate: body.exchange_rate,
      include_tax: body.include_tax,
      include_cross_border_fee: body.include_cross_border_fee,
      custom_shipping_cost: body.custom_shipping_cost,
    }

    // IntegratedPricingServiceを使って計算
    const pricingService = new IntegratedPricingService()
    const result = await pricingService.calculate(input)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Pricing calculation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate pricing',
      },
      { status: 500 }
    )
  }
}

/**
 * 価格比較エンドポイント
 *
 * POST /api/pricing/compare
 *
 * リクエスト例:
 * {
 *   "cost_jpy": 5000,
 *   "target_profit_rate": 0.20,
 *   "weight_g": 500,
 *   "marketplace_ids": ["AMAZON_JP", "AMAZON_US", "EBAY_US"]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')

    if (mode === 'compare') {
      // 価格比較モード
      const cost_jpy = parseFloat(searchParams.get('cost_jpy') || '0')
      const target_profit_rate = parseFloat(searchParams.get('target_profit_rate') || '0.2')
      const weight_g = parseFloat(searchParams.get('weight_g') || '0')
      const marketplace_ids = searchParams.get('marketplace_ids')?.split(',') || []

      if (!cost_jpy || marketplace_ids.length === 0) {
        return NextResponse.json(
          { error: 'cost_jpy and marketplace_ids are required' },
          { status: 400 }
        )
      }

      const pricingService = new IntegratedPricingService()
      const comparison = await pricingService.comparePrices(
        {
          cost_jpy,
          target_profit_rate,
          weight_g,
        },
        marketplace_ids
      )

      return NextResponse.json({
        success: true,
        data: comparison,
      })
    }

    return NextResponse.json(
      { error: 'Invalid mode. Use mode=compare for price comparison' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Pricing comparison error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to compare prices',
      },
      { status: 500 }
    )
  }
}
