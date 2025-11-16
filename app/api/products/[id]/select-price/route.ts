// app/api/products/[id]/select-price/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 利益計算（共通関数）
 */
function calculateProfit(sellingPriceUSD: number, costJPY: number, weightG: number) {
  const JPY_TO_USD = 0.0067 // 1円 = 0.0067ドル（概算）
  const costUSD = costJPY * JPY_TO_USD

  // 送料計算
  let shippingCostUSD = 12.99
  if (weightG > 1000) shippingCostUSD = 18.99
  if (weightG > 2000) shippingCostUSD = 24.99

  // eBay手数料（12.9%）
  const ebayFee = sellingPriceUSD * 0.129

  // PayPal手数料（3.49% + $0.49）
  const paypalFee = sellingPriceUSD * 0.0349 + 0.49

  // 総費用
  const totalCost = costUSD + shippingCostUSD + ebayFee + paypalFee

  // 利益額
  const profitAmount = sellingPriceUSD - totalCost

  // 利益率
  const profitMargin = sellingPriceUSD > 0 ? (profitAmount / sellingPriceUSD) * 100 : 0

  return {
    profitAmount: parseFloat(profitAmount.toFixed(2)),
    profitMargin: parseFloat(profitMargin.toFixed(2)),
    breakdown: {
      sellingPriceUSD,
      costUSD: parseFloat(costUSD.toFixed(2)),
      shippingCostUSD,
      ebayFee: parseFloat(ebayFee.toFixed(2)),
      paypalFee: parseFloat(paypalFee.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2))
    }
  }
}

/**
 * POST: 競合商品の価格を選択して利益を再計算
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id
    const body = await request.json()
    const { selectedItemId, selectedPrice, itemData } = body

    console.log('💰 価格選択API:', {
      productId,
      selectedItemId,
      selectedPrice,
      itemData
    })

    if (!selectedPrice || selectedPrice <= 0) {
      return NextResponse.json(
        { success: false, error: '有効な価格を選択してください' },
        { status: 400 }
      )
    }

    // 商品データを取得
    const { data: product, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { success: false, error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 利益を再計算
    const costJPY = product.price_jpy || product.cost_price || 0
    const weightG = product.listing_data?.weight_g || product.weight_g || 500
    
    const profitAnalysis = calculateProfit(selectedPrice, costJPY, weightG)

    console.log('📊 利益再計算:', profitAnalysis)

    // DBを更新
    const updateData: any = {
      sm_lowest_price: Math.max(0, Math.min(9999.99, selectedPrice)),
      sm_profit_amount_usd: Math.max(-999.99, Math.min(999.99, profitAnalysis.profitAmount)),
      sm_profit_margin: Math.max(-999.99, Math.min(999.99, profitAnalysis.profitMargin)),
      updated_at: new Date().toISOString()
    }

    // ebay_api_dataに選択情報を保存
    const existingApiData = product.ebay_api_data || {}
    const existingBrowseResult = existingApiData.browse_result || {}

    updateData.ebay_api_data = {
      ...existingApiData,
      browse_result: {
        ...existingBrowseResult,
        selectedItemId,
        selectedPrice,
        selectedItem: itemData, // 選択された商品の詳細情報
        profitAmount: profitAnalysis.profitAmount,
        profitMargin: profitAnalysis.profitMargin,
        breakdown: profitAnalysis.breakdown,
        selectedAt: new Date().toISOString()
      }
    }

    const { error: updateError } = await supabase
      .from('products_master')
      .update(updateData)
      .eq('id', productId)

    if (updateError) {
      console.error('❌ DB更新エラー:', updateError)
      return NextResponse.json(
        { success: false, error: 'データベース更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log('✅ 価格選択完了')

    return NextResponse.json({
      success: true,
      selectedPrice,
      profitAmount: profitAnalysis.profitAmount,
      profitMargin: profitAnalysis.profitMargin,
      breakdown: profitAnalysis.breakdown
    })

  } catch (error: any) {
    console.error('❌ 価格選択エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
