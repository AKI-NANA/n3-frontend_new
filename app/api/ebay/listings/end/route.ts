import { NextResponse } from 'next/server'
import { callEbayTradingAPI, isEbayApiSuccess, extractEbayErrors } from '@/lib/ebay-api'

/**
 * eBay リスティング終了API
 * POST /api/ebay/listings/end
 * 
 * Body:
 * {
 *   "listingId": "123456789012",
 *   "reason": "NotAvailable" | "Incorrect" | "LostOrBroken" | "OtherListingError"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { listingId, reason = 'NotAvailable' } = body

    // バリデーション
    if (!listingId) {
      return NextResponse.json(
        { success: false, error: 'listingId is required' },
        { status: 400 }
      )
    }

    // 有効な終了理由のチェック
    const validReasons = ['NotAvailable', 'Incorrect', 'LostOrBroken', 'OtherListingError']
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
        },
        { status: 400 }
      )
    }

    console.log('Ending eBay listing:', { listingId, reason })

    // EndFixedPriceItem API呼び出し
    const xmlBody = `
  <ItemID>${listingId}</ItemID>
  <EndingReason>${reason}</EndingReason>`

    const xmlResponse = await callEbayTradingAPI({
      callName: 'EndFixedPriceItem',
      body: xmlBody,
    })

    // レスポンス確認
    if (isEbayApiSuccess(xmlResponse)) {
      console.log('eBay listing ended successfully:', listingId)
      return NextResponse.json({
        success: true,
        listingId,
        reason,
        message: 'Listing ended successfully',
      })
    } else {
      const errors = extractEbayErrors(xmlResponse)
      console.error('eBay listing end failed:', { listingId, errors })
      
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
    console.error('Error ending eBay listing:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to end listing',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
