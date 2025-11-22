/**
 * 一括価格計算APIエンドポイント
 *
 * POST /api/pricing/bulk
 *
 * リクエスト例:
 * {
 *   "items": [
 *     {
 *       "marketplace_id": "AMAZON_JP",
 *       "cost_jpy": 5000,
 *       "target_profit_rate": 0.20,
 *       "weight_g": 500
 *     },
 *     {
 *       "marketplace_id": "EBAY_US",
 *       "cost_jpy": 5000,
 *       "target_profit_rate": 0.25,
 *       "weight_g": 500
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { IntegratedPricingService, PricingInput } from '@/lib/pricing/IntegratedPricingService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must not be empty' },
        { status: 400 }
      )
    }

    // 各アイテムのバリデーション
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i]

      if (!item.marketplace_id) {
        return NextResponse.json(
          { error: `items[${i}].marketplace_id is required` },
          { status: 400 }
        )
      }

      if (!item.cost_jpy || item.cost_jpy <= 0) {
        return NextResponse.json(
          { error: `items[${i}].cost_jpy must be a positive number` },
          { status: 400 }
        )
      }

      if (!item.target_profit_jpy && !item.target_profit_rate) {
        return NextResponse.json(
          {
            error: `items[${i}]: Either target_profit_jpy or target_profit_rate is required`,
          },
          { status: 400 }
        )
      }
    }

    // PricingInputの配列に変換
    const inputs: PricingInput[] = body.items.map((item: any) => ({
      marketplace_id: item.marketplace_id,
      cost_jpy: item.cost_jpy,
      target_profit_jpy: item.target_profit_jpy,
      target_profit_rate: item.target_profit_rate,
      weight_g: item.weight_g,
      shipping_method: item.shipping_method,
      exchange_rate: item.exchange_rate,
      include_tax: item.include_tax,
      include_cross_border_fee: item.include_cross_border_fee,
      custom_shipping_cost: item.custom_shipping_cost,
    }))

    // IntegratedPricingServiceを使って一括計算
    const pricingService = new IntegratedPricingService()
    const results = await pricingService.calculateBulk(inputs)

    // 統計情報を計算
    const profitable_count = results.filter((r) => r.is_profitable).length
    const total_profit_jpy = results.reduce((sum, r) => sum + r.profit_jpy, 0)
    const avg_profit_margin =
      results.reduce((sum, r) => sum + r.profit_margin, 0) / results.length

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total_items: results.length,
          profitable_items: profitable_count,
          unprofitable_items: results.length - profitable_count,
          total_profit_jpy: Math.round(total_profit_jpy * 100) / 100,
          average_profit_margin: Math.round(avg_profit_margin * 10000) / 10000,
        },
      },
    })
  } catch (error: any) {
    console.error('Bulk pricing calculation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate bulk pricing',
      },
      { status: 500 }
    )
  }
}
