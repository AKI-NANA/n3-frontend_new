/**
 * I3-3: 価格更新API
 *
 * Amazon JP/eBay JP向けの出品・価格更新APIを実装
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { updateAmazonJPPrice, updateEbayJPPrice } from '@/lib/dropship/api-integrations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, marketplace } = body

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds配列が必要です' },
        { status: 400 }
      )
    }

    console.log(`[PriceUpdate] 価格更新開始: ${productIds.length}件, Marketplace=${marketplace || 'all'}`)

    const supabase = createClient()

    // 商品を取得
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)

    if (productError || !products || products.length === 0) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    const updateResults = []

    for (const product of products) {
      const result = await updateProductPrice(product, marketplace)
      updateResults.push(result)

      // レート制限を考慮
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const successCount = updateResults.filter(r => r.success).length
    const failedCount = updateResults.filter(r => !r.success).length

    console.log(`[PriceUpdate] 価格更新完了: ${successCount}件成功, ${failedCount}件失敗`)

    return NextResponse.json({
      success: true,
      results: updateResults,
      summary: {
        total: updateResults.length,
        success: successCount,
        failed: failedCount,
      },
    })
  } catch (error) {
    console.error('[PriceUpdate] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}

async function updateProductPrice(product: any, targetMarketplace?: string) {
  const results = []

  // Amazon JPを更新
  if ((!targetMarketplace || targetMarketplace === 'amazon') && product.amazon_jp_listing_id) {
    const amazonResult = await updateAmazonJPPrice(product.amazon_jp_listing_id, product.price)
    results.push({
      marketplace: 'Amazon_JP',
      success: amazonResult.success,
      error: amazonResult.error,
    })
  }

  // eBay JPを更新
  if ((!targetMarketplace || targetMarketplace === 'ebay') && product.ebay_jp_listing_id) {
    const ebayResult = await updateEbayJPPrice(product.ebay_jp_listing_id, product.price)
    results.push({
      marketplace: 'eBay_JP',
      success: ebayResult.success,
      error: ebayResult.error,
    })
  }

  return {
    productId: product.id,
    sku: product.sku,
    success: results.every(r => r.success),
    results,
  }
}
