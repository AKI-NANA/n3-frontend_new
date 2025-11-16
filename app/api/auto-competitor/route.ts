// app/api/auto-competitor/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 競合データ自動取得API
 * 
 * SM参照商品から最安値の競合を自動選択
 */
export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { success: false, error: '商品IDが必要です' },
        { status: 400 }
      )
    }

    console.log('🎯 競合データ自動取得開始:', productIds.length, '件')

    let updatedCount = 0

    for (const productId of productIds) {
      try {
        const { data: product, error: fetchError } = await supabase
          .from('products_master')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError || !product) continue

        const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
        
        if (referenceItems.length === 0) {
          console.log(`  ⏭️ ${productId}: 参照商品なし`)
          continue
        }

        // 価格情報がある商品のみフィルター
        const itemsWithPrice = referenceItems.filter((item: any) => 
          item.price?.value && item.price.value > 0
        )

        if (itemsWithPrice.length === 0) {
          console.log(`  ⏭️ ${productId}: 価格情報なし`)
          continue
        }

        // 最安値の商品を取得
        const cheapestItem = itemsWithPrice.reduce((min: any, item: any) => {
          const itemPrice = parseFloat(item.price.value)
          const minPrice = parseFloat(min.price.value)
          return itemPrice < minPrice ? item : min
        }, itemsWithPrice[0])

        // 平均価格を計算
        const avgPrice = itemsWithPrice.reduce((sum: number, item: any) => 
          sum + parseFloat(item.price.value), 0
        ) / itemsWithPrice.length

        // 競合データを構築
        const competitorData = {
          min_price: parseFloat(cheapestItem.price.value),
          max_price: Math.max(...itemsWithPrice.map((item: any) => parseFloat(item.price.value))),
          avg_price: avgPrice,
          total_count: itemsWithPrice.length,
          cheapest_item: {
            item_id: cheapestItem.itemId,
            title: cheapestItem.title,
            price: parseFloat(cheapestItem.price.value),
            currency: cheapestItem.price.currency,
            condition: cheapestItem.condition,
            item_location: cheapestItem.itemLocation
          }
        }

        // データベース更新
        const { error: updateError } = await supabase
          .from('products_master')
          .update({
            competitor_data: competitorData,
            competitor_min_price: competitorData.min_price,
            competitor_avg_price: competitorData.avg_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)

        if (!updateError) {
          console.log(`  ✅ ${productId}: 最安値 $${competitorData.min_price} (${itemsWithPrice.length}件中)`)
          updatedCount++
        }

      } catch (error: any) {
        console.error(`  ❌ ${productId}:`, error.message)
      }
    }

    console.log(`📊 競合データ自動取得完了: ${updatedCount}件更新`)

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: productIds.length
    })

  } catch (error: any) {
    console.error('❌ 競合データ自動取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
