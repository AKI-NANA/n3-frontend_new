/**
 * Keepa Deals Finder API
 * GET /api/keepa/deals?domain=1&minDiscount=30&maxPrice=100
 */

import { NextRequest, NextResponse } from 'next/server'
import { keepaClient } from '@/lib/keepa/keepa-api-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = parseInt(searchParams.get('domain') || '1', 10)
    const minDiscount = parseInt(searchParams.get('minDiscount') || '30', 10)
    const maxPrice = parseInt(searchParams.get('maxPrice') || '100', 10)
    const categoryId = searchParams.get('categoryId') || '0'

    const products = await keepaClient.findDeals({
      domain,
      minDiscount,
      maxCurrentPrice: maxPrice,
      categoryId
    })

    // P-1スコアを計算して優先順位付け
    const scoredProducts = products.map(product => {
      const p1Score = keepaClient.calculateP1Score(product)
      return {
        asin: product.asin,
        title: product.title,
        currentPrice: product.stats?.current?.[0],
        avgPrice: product.stats?.avg?.[0],
        bsr: product.stats?.current?.[3],
        p1Score,
        product
      }
    })

    // P-1スコアでソート
    scoredProducts.sort((a, b) => b.p1Score.totalScore - a.p1Score.totalScore)

    return NextResponse.json({
      deals: scoredProducts,
      count: scoredProducts.length
    })
  } catch (error) {
    console.error('Keepa deals API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deals from Keepa' },
      { status: 500 }
    )
  }
}
