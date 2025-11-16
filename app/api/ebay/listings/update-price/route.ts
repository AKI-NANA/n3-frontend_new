import { NextResponse } from 'next/server'
import { callEbayTradingAPI, isEbayApiSuccess, extractEbayErrors } from '@/lib/ebay-api'

/**
 * eBay リスティング価格更新API
 * POST /api/ebay/listings/update-price
 * 
 * Body:
 * {
 *   "listingId": "123456789012",
 *   "newPrice": 29.99,
 *   "currency": "USD"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { listingId, newPrice, currency = 'USD' } = body

    // バリデーション
    if (!listingId) {
      return NextResponse.json(
        { success: false, error: 'listingId is required' },
        { status: 400 }
      )
    }

    if (!newPrice || newPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'newPrice must be greater than 0' },
        { status: 400 }
      )
    }

    console.log('Updating eBay listing price:', { listingId, newPrice, currency })

    // ReviseFixedPriceItem API呼び出し
    const xmlBody = `
  <Item>
    <ItemID>${listingId}</ItemID>
    <StartPrice>${newPrice}</StartPrice>
  </Item>`

    const xmlResponse = await callEbayTradingAPI({
      callName: 'ReviseFixedPriceItem',
      body: xmlBody,
    })

    // レスポンス確認
    if (isEbayApiSuccess(xmlResponse)) {
      console.log('eBay price update successful:', listingId)
      return NextResponse.json({
        success: true,
        listingId,
        newPrice,
        currency,
        message: 'Price updated successfully',
      })
    } else {
      const errors = extractEbayErrors(xmlResponse)
      console.error('eBay price update failed:', { listingId, errors })
      
      return NextResponse.json(
        {
          success: false,
          error: 'eBay API returned errors',
          details: errors,
          xmlResponse,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error updating eBay listing price:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update listing price',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
