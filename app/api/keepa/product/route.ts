/**
 * Keepa Product API
 * GET /api/keepa/product?asin=xxx&domain=1
 */

import { NextRequest, NextResponse } from 'next/server'
import { keepaClient } from '@/lib/keepa/keepa-api-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const asin = searchParams.get('asin')
    const domain = parseInt(searchParams.get('domain') || '1', 10)

    if (!asin) {
      return NextResponse.json(
        { error: 'ASIN parameter is required' },
        { status: 400 }
      )
    }

    const product = await keepaClient.getProduct(asin, domain)

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Keepa product API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product from Keepa' },
      { status: 500 }
    )
  }
}
