import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ProfitCalculator } from '@/lib/amazon/profit-calculator'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, ebaySellingPrice } = body

    // 商品データを取得
    const { data: product, error } = await supabase
      .from('amazon_products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const calculator = new ProfitCalculator()

    // eBay競合価格を取得（指定がない場合）
    let sellingPrice = ebaySellingPrice
    if (!sellingPrice) {
      const { competitive } = await calculator.fetchEbayCompetitivePrice(
        product.title,
        product.product_group
      )
      sellingPrice = competitive
    }

    // 利益計算
    const profitData = calculator.calculateProfit(product, sellingPrice)

    // スコア計算
    const profitScore = calculator.calculateProfitScore(product, sellingPrice)

    // データベースを更新
    await supabase
      .from('amazon_products')
      .update({
        profit_score: profitScore,
        profit_amount: profitData.profit,
        roi_percentage: profitData.roi,
        ebay_competitive_price: sellingPrice,
        last_profit_calculation_at: new Date().toISOString()
      })
      .eq('id', productId)

    return NextResponse.json({
      success: true,
      profit: profitData,
      score: profitScore
    })
  } catch (error: any) {
    console.error('Profit calculation error:', error)
    return NextResponse.json(
      { error: error.message || 'Calculation failed' },
      { status: 500 }
    )
  }
}
