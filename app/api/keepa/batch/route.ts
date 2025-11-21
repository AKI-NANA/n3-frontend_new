/**
 * Keepa Batch Product API
 * POST /api/keepa/batch
 * Body: { asins: string[], domain?: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { keepaClient } from '@/lib/keepa/keepa-api-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asins, domain = 1 } = body

    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      return NextResponse.json(
        { error: 'asins array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (asins.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 ASINs per request' },
        { status: 400 }
      )
    }

    const products = await keepaClient.getProducts(asins, domain)

    return NextResponse.json({
      products,
      count: products.length
    })
  } catch (error) {
    console.error('Keepa batch API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products from Keepa' },
      { status: 500 }
    )
  }
}
