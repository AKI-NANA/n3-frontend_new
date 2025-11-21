/**
 * 無在庫輸入出品API
 *
 * POST /api/dropship/list
 * Body: { productIds: string[], testMode?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { autoListProduct, bulkAutoList } from '@/lib/dropship/listing-manager'
import { getDropshipProducts, recordListingHistory } from '@/lib/dropship/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, testMode = false } = body

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds配列が必要です' },
        { status: 400 }
      )
    }

    // 商品を取得
    const { data: products, error: fetchError } = await getDropshipProducts()

    if (fetchError || !products) {
      return NextResponse.json(
        { error: '商品取得に失敗しました' },
        { status: 500 }
      )
    }

    // 指定されたIDの商品のみフィルタリング
    const targetProducts = products.filter(p => productIds.includes(p.id))

    if (targetProducts.length === 0) {
      return NextResponse.json(
        { error: '対象商品が見つかりません' },
        { status: 404 }
      )
    }

    // 一括出品
    const listingResults = await bulkAutoList(targetProducts, {
      autoListToAmazon: true,
      autoListToEbay: true,
      scoreThreshold: 60,
      testMode,
    })

    // 出品履歴を記録
    const historyPromises = []
    for (const [productId, results] of listingResults.entries()) {
      for (const result of results) {
        historyPromises.push(
          recordListingHistory({
            product_id: productId,
            sku: result.sku,
            marketplace: result.marketplace,
            listing_id: result.listingId,
            listing_url: result.listingUrl,
            listing_status: result.success ? 'active' : 'failed',
            action: 'created',
          })
        )
      }
    }

    await Promise.all(historyPromises)

    // 結果を集計
    const flatResults = Array.from(listingResults.values()).flat()
    const successCount = flatResults.filter(r => r.success).length
    const failedCount = flatResults.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      results: Array.from(listingResults.entries()).map(([productId, results]) => ({
        productId,
        results,
      })),
      summary: {
        total: flatResults.length,
        success: successCount,
        failed: failedCount,
      },
    })
  } catch (error) {
    console.error('[List API] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
