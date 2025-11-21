/**
 * 無在庫輸入スコアリングAPI
 *
 * POST /api/dropship/score
 * Body: { productIds: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateDropshipScore } from '@/lib/research/dropship-scorer'
import { getDropshipProducts, updateProductScore, recordScoringHistory } from '@/lib/dropship/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds } = body

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds配列が必要です' },
        { status: 400 }
      )
    }

    // 商品を取得
    const { data: products, error: fetchError } = await getDropshipProducts()

    if (fetchError) {
      console.error('[Score API] 商品取得エラー:', fetchError)
      return NextResponse.json(
        { error: '商品取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 指定されたIDの商品のみフィルタリング
    const targetProducts = productIds.length > 0
      ? products.filter(p => productIds.includes(p.id))
      : products

    // スコアリング実行
    const scoringResults = []

    for (const product of targetProducts) {
      try {
        const score = calculateDropshipScore(product)

        // データベースに記録
        await updateProductScore(product.id, score.totalScore)

        await recordScoringHistory({
          product_id: product.id,
          sku: product.sku,
          total_score: score.totalScore,
          profit_score: score.profitScore,
          lead_time_score: score.leadTimeScore,
          reliability_score: score.reliabilityScore,
          selling_price_jp: score.profitAnalysis.sellingPriceJP,
          supplier_price_usd: score.profitAnalysis.supplierPriceUSD,
          net_profit: score.profitAnalysis.netProfit,
          profit_margin: score.profitAnalysis.profitMargin,
          lead_time_exceeded: score.riskFactors.leadTimeExceeded,
          low_profit_margin: score.riskFactors.lowProfitMargin,
          unreliable_supplier: score.riskFactors.unreliableSupplier,
          should_list: score.shouldList,
          listing_priority: score.listingPriority,
        })

        scoringResults.push({
          productId: product.id,
          sku: product.sku,
          score,
        })
      } catch (error) {
        console.error(`[Score API] スコアリングエラー: ${product.sku}`, error)
        scoringResults.push({
          productId: product.id,
          sku: product.sku,
          error: error instanceof Error ? error.message : 'スコアリング失敗',
        })
      }
    }

    return NextResponse.json({
      success: true,
      results: scoringResults,
      count: scoringResults.length,
    })
  } catch (error) {
    console.error('[Score API] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'productIdが必要です' },
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

    const product = products.find(p => p.id === productId)

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // スコアを計算
    const score = calculateDropshipScore(product)

    return NextResponse.json({
      success: true,
      productId,
      sku: product.sku,
      score,
    })
  } catch (error) {
    console.error('[Score API] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
