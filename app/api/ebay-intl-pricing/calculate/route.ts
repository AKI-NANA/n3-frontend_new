// app/api/ebay-intl-pricing/calculate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { gatherAllData, type CalculationInput } from '@/lib/ebay-intl/data-fetcher'
import { determineStrategy, calculateOptimalPricing } from '@/lib/ebay-intl/pricing-engine'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const input: CalculationInput = await request.json()

    // Phase 2: データ収集
    const data = await gatherAllData(input)

    // Phase 3: 戦略判定
    const strategy = determineStrategy(data)

    // Phase 3: 価格計算
    const pricing = calculateOptimalPricing(strategy, data)

    // DB保存
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data: savedCalculation } = await supabase
      .from('profit_calculations')
      .insert({
        item_id: input.productId,
        category_id: input.categoryId,
        item_condition: input.condition,
        price_jpy: input.costJPY,
        total_cost_usd: data.costUSD,
        recommended_price_usd: pricing.itemPrice,
        estimated_profit_usd: pricing.shippingByCountry[0]?.profit || 0,
        actual_profit_margin: pricing.summary.avgMargin,
        exchange_rate_used: data.exchangeRate.calculatedRate,
        calculation_source: 'ebay_intl_strategy'
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      elapsedTime: Date.now() - startTime,
      calculationId: savedCalculation?.id,
      strategy: {
        type: strategy.strategy,
        baseCountry: strategy.baseCountry,
        confidence: strategy.confidence,
        policyType: strategy.policyType
      },
      pricing: {
        itemPrice: pricing.itemPrice,
        avgMargin: pricing.summary.avgMargin.toFixed(2) + '%'
      },
      shippingByCountry: pricing.shippingByCountry.map(c => ({
        country: c.country,
        shipping: c.shippingFee,
        type: c.shippingType,
        multiplier: c.multiplier.toFixed(2),
        margin: c.margin.toFixed(2) + '%',
        feasible: c.feasible
      }))
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
