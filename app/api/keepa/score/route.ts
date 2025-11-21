/**
 * Keepa Score API (P-4/P-1 Scoring)
 * POST /api/keepa/score
 * Body: { asin: string, domain?: number, strategy?: 'P-4' | 'P-1' | 'both' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { keepaClient } from '@/lib/keepa/keepa-api-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asin, domain = 1, strategy = 'both' } = body

    if (!asin) {
      return NextResponse.json(
        { error: 'asin is required' },
        { status: 400 }
      )
    }

    const product = await keepaClient.getProduct(asin, domain)

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found in Keepa' },
        { status: 404 }
      )
    }

    let response: any = {
      asin: product.asin,
      title: product.title,
      domain: product.domainId
    }

    if (strategy === 'P-4' || strategy === 'both') {
      response.p4Score = keepaClient.calculateP4Score(product)
    }

    if (strategy === 'P-1' || strategy === 'both') {
      response.p1Score = keepaClient.calculateP1Score(product)
    }

    if (strategy === 'both') {
      response.combined = keepaClient.calculateCombinedScore(product)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Keepa score API error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate scores' },
      { status: 500 }
    )
  }
}
