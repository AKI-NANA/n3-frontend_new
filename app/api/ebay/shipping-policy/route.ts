import { NextRequest, NextResponse } from 'next/server'
import { getEbayAccessToken } from '@/lib/ebay/token'

const EBAY_API_BASE = 'https://api.ebay.com'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // ヘッダーからアカウント指定を取得
    const accountHeader = request.headers.get('X-eBay-Account') || 'mjt'
    const account = accountHeader as 'mjt' | 'green'

    console.log('📦 Creating eBay Shipping Policy...')
    console.log('🎯 Target Account:', account)
    console.log('📝 Payload:', JSON.stringify(payload, null, 2))

    // 🔥 自動的に最新のトークンを取得
    console.log('🔄 Fetching fresh access token...')
    const accessToken = await getEbayAccessToken(account)
    console.log('✅ Got fresh token (length:', accessToken.length, ')')

    // eBay Fulfillment Policy API
    const ebayResponse = await fetch(
      `${EBAY_API_BASE}/sell/account/v1/fulfillment_policy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Language': 'en-US'
        },
        body: JSON.stringify(payload)
      }
    )

    const responseText = await ebayResponse.text()
    console.log('🟢 eBay Response Status:', ebayResponse.status)
    console.log('🟢 eBay Response Body:', responseText)

    if (!ebayResponse.ok) {
      let errorMessage = responseText
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.errors?.[0]?.message || errorData.error_description || responseText
      } catch (e) {
        // JSON parse失敗時はそのまま使用
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          status: ebayResponse.status,
          fullResponse: responseText,
          account: account
        },
        { status: ebayResponse.status }
      )
    }

    const data = JSON.parse(responseText)

    return NextResponse.json({
      success: true,
      fulfillmentPolicyId: data.fulfillmentPolicyId,
      account: account,
      ...data
    })

  } catch (error: any) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
