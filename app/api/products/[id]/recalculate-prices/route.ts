// app/api/products/[id]/recalculate-prices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 🔥 中央値を計算
 */
function calculateMedian(prices: number[]): number {
  if (prices.length === 0) return 0
  
  const sorted = [...prices].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  } else {
    return sorted[middle]
  }
}

/**
 * 🔥 日本人セラー判定
 */
function isJapaneseSeller(item: any): boolean {
  if (item.itemLocation?.country === 'JP') return true
  
  const address = item.itemLocation?.addressLine1 || ''
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(address)
  
  return hasJapanese
}

/**
 * チェックされた商品のみで価格を再計算
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const productId = params.id
    const body = await request.json()
    const { validItems, excludedItems } = body

    console.log('💰 価格再計算:', { 
      productId, 
      validCount: validItems?.length,
      excludedCount: excludedItems?.length 
    })

    if (!validItems || validItems.length === 0) {
      return NextResponse.json(
        { success: false, error: '有効な商品が選択されていません' },
        { status: 400 }
      )
    }

    // 🔥 価格を抽出
    const prices = validItems
      .map((item: any) => parseFloat(item.price?.value || item.price || '0'))
      .filter((price: number) => price > 0)

    if (prices.length === 0) {
      return NextResponse.json(
        { success: false, error: '有効な価格データがありません' },
        { status: 400 }
      )
    }

    // 🔥 最安値・平均値・中央値を計算
    const lowestPrice = Math.min(...prices)
    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
    const medianPrice = calculateMedian(prices)
    const jpSellerCount = validItems.filter((item: any) => isJapaneseSeller(item)).length

    console.log('📊 再計算結果:', {
      商品数: validItems.length,
      最安値: lowestPrice,
      平均価格: averagePrice,
      中央値: medianPrice,
      日本人セラー数: jpSellerCount
    })

    // 🔥 DBを更新
    const { data: product } = await supabase
      .from('products_master')
      .select('ebay_api_data')
      .eq('id', productId)
      .single()

    const existingApiData = product?.ebay_api_data || {}
    const browseResult = existingApiData?.browse_result || {}

    // 🔥 除外リストを保存
    const updatedBrowseResult = {
      ...browseResult,
      validItems,
      excludedItems,
      lowestPrice,
      averagePrice,
      medianPrice,
      jpSellerCount,
      competitorCount: validItems.length,
      recalculatedAt: new Date().toISOString()
    }

    const { error } = await supabase
      .from('products_master')
      .update({
        sm_lowest_price: Math.max(0, Math.min(9999.99, lowestPrice)),
        sm_average_price: Math.max(0, Math.min(9999.99, averagePrice)),
        sm_median_price_usd: Math.max(0, Math.min(9999.99, medianPrice)),
        sm_competitor_count: Math.max(0, Math.min(9999, validItems.length)),
        sm_jp_seller_count: Math.max(0, Math.min(9999, jpSellerCount)),
        ebay_api_data: {
          ...existingApiData,
          browse_result: updatedBrowseResult
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (error) {
      console.error('❌ DB更新エラー:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 価格を再計算しました')

    return NextResponse.json({
      success: true,
      message: '価格を再計算しました',
      data: {
        lowestPrice,
        averagePrice,
        medianPrice,
        competitorCount: validItems.length,
        jpSellerCount,
        excludedCount: excludedItems.length
      }
    })

  } catch (error: any) {
    console.error('❌ 再計算エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
