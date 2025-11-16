// app/api/batch/competitor-min-price/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 競合最安値自動取得
 * SM参照商品から最安値を抽出
 */
export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()
    
    let updatedCount = 0
    
    for (const productId of productIds) {
      const { data: product } = await supabase
        .from('products_master')
        .select('*, ebay_api_data')
        .eq('id', productId)
        .single()
      
      if (!product) continue
      
      const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
      
      if (referenceItems.length > 0) {
        // 価格+送料の合計で最安値を計算
        const prices = referenceItems.map((item: any) => {
          const itemPrice = parseFloat(item.price?.value || '0')
          const shippingCost = parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || '0')
          return {
            itemId: item.itemId,
            totalPrice: itemPrice + shippingCost,
            itemPrice,
            shippingCost,
            condition: item.condition
          }
        }).filter(p => p.totalPrice > 0)
        
        if (prices.length > 0) {
          // 最安値を取得
          prices.sort((a, b) => a.totalPrice - b.totalPrice)
          const minPriceItem = prices[0]
          const avgPrice = prices.reduce((sum, p) => sum + p.totalPrice, 0) / prices.length
          
          await supabase
            .from('products_master')
            .update({
              competitor_min_price_usd: minPriceItem.totalPrice,
              competitor_avg_price_usd: avgPrice,
              competitor_min_price_item_id: minPriceItem.itemId,
              competitor_count: prices.length
            })
            .eq('id', productId)
          
          updatedCount++
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      updated: updatedCount
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
