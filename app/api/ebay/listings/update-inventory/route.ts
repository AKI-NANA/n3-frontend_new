import { NextResponse } from 'next/server'
import { callEbayTradingAPI, isEbayApiSuccess, extractEbayErrors } from '@/lib/ebay-api'

/**
 * eBay リスティング在庫更新API
 * POST /api/ebay/listings/update-inventory
 * 
 * Body:
 * {
 *   "listingId": "123456789012",
 *   "quantity": 5
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { listingId, quantity } = body

    // バリデーション
    if (!listingId) {
      return NextResponse.json(
        { success: false, error: 'listingId is required' },
        { status: 400 }
      )
    }

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'quantity must be 0 or greater' },
        { status: 400 }
      )
    }

    console.log('Updating eBay listing inventory:', { listingId, quantity })

    // ReviseInventoryStatus API呼び出し
    const xmlBody = `
  <InventoryStatus>
    <ItemID>${listingId}</ItemID>
    <Quantity>${quantity}</Quantity>
  </InventoryStatus>`

    const xmlResponse = await callEbayTradingAPI({
      callName: 'ReviseInventoryStatus',
      body: xmlBody,
    })

    // レスポンス確認
    if (isEbayApiSuccess(xmlResponse)) {
      console.log('eBay inventory update successful:', listingId)
      return NextResponse.json({
        success: true,
        listingId,
        quantity,
        message: 'Inventory updated successfully',
      })
    } else {
      const errors = extractEbayErrors(xmlResponse)
      console.error('eBay inventory update failed:', { listingId, errors })
      
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
    console.error('Error updating eBay listing inventory:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update listing inventory',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
