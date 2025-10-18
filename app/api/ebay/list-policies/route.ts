import { NextRequest, NextResponse } from 'next/server'

const EBAY_API_BASE = 'https://api.ebay.com'

export async function GET(request: NextRequest) {
  try {
    let accessToken = process.env.EBAY_USER_ACCESS_TOKEN

    // 引用符を削除
    if (accessToken?.startsWith('"')) {
      accessToken = accessToken.slice(1, -1)
    }

    console.log('🔑 Token exists:', !!accessToken)
    console.log('🔑 Token length:', accessToken?.length)
    console.log('🔑 Token prefix:', accessToken?.substring(0, 30) + '...')

    if (!accessToken) {
      console.error('❌ No access token')
      return NextResponse.json(
        { error: 'eBay access token not configured' },
        { status: 500 }
      )
    }

    console.log('📦 Fetching eBay Fulfillment Policies...')

    // eBay Fulfillment Policy API - List
    const ebayResponse = await fetch(
      `${EBAY_API_BASE}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Language': 'en-US'
        }
      }
    )

    const responseText = await ebayResponse.text()
    console.log('🟢 eBay Response Status:', ebayResponse.status)

    if (!ebayResponse.ok) {
      console.error('❌ eBay Error:', responseText)
      return NextResponse.json(
        { error: 'Failed to fetch policies from eBay', details: responseText },
        { status: ebayResponse.status }
      )
    }

    const data = JSON.parse(responseText)
    console.log('✅ Found policies:', data.fulfillmentPolicies?.length || 0)

    return NextResponse.json({
      success: true,
      policies: data.fulfillmentPolicies || [],
      total: data.total || 0
    })

  } catch (error: any) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
