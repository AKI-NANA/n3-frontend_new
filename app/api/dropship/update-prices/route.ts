/**
 * 無在庫輸入価格更新API
 *
 * POST /api/dropship/update-prices
 * Body: { productIds?: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { monitorAndUpdatePrices } from '@/lib/dropship/price-updater'
import { getDropshipProducts, recordPriceHistory } from '@/lib/dropship/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds } = body

    // 商品を取得
    const { data: products, error: fetchError } = await getDropshipProducts({
      status: ['listed_on_multi'],
    })

    if (fetchError || !products) {
      return NextResponse.json(
        { error: '商品取得に失敗しました' },
        { status: 500 }
      )
    }

    // 指定されたIDの商品のみフィルタリング（指定がない場合は全商品）
    const targetProducts = productIds && productIds.length > 0
      ? products.filter(p => productIds.includes(p.id))
      : products

    if (targetProducts.length === 0) {
      return NextResponse.json(
        { error: '対象商品が見つかりません' },
        { status: 404 }
      )
    }

    // 価格監視と更新を実行
    const updateResults = await monitorAndUpdatePrices(targetProducts, {
      checkInterval: 60,
      minProfitMargin: 15,
      priceChangeThreshold: 5,
      exchangeRate: 150,
    })

    // 価格変更があった商品の履歴を記録
    const historyPromises = updateResults
      .filter(r => r.updated)
      .map(r =>
        recordPriceHistory({
          product_id: r.productId,
          sku: r.sku,
          supplier: 'Amazon_US', // 仮
          supplier_price: r.newSupplierPrice,
          selling_price_jp: r.newPrice,
          profit_margin: r.newProfitMargin,
          change_reason: 'supplier_price_change',
        })
      )

    await Promise.all(historyPromises)

    // 結果を集計
    const updatedCount = updateResults.filter(r => r.updated).length
    const skippedCount = updateResults.filter(r => !r.updated).length

    return NextResponse.json({
      success: true,
      results: updateResults,
      summary: {
        total: updateResults.length,
        updated: updatedCount,
        skipped: skippedCount,
      },
    })
  } catch (error) {
    console.error('[UpdatePrices API] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
