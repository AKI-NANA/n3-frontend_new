import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 環境変数の確認
    const envCheck = {
      EBAY_APP_ID: process.env.EBAY_APP_ID ? `${process.env.EBAY_APP_ID.substring(0, 15)}...` : '❌ 未設定',
      EBAY_CLIENT_ID_MJT: process.env.EBAY_CLIENT_ID_MJT ? `${process.env.EBAY_CLIENT_ID_MJT.substring(0, 15)}...` : '❌ 未設定',
      EBAY_CLIENT_ID: process.env.EBAY_CLIENT_ID ? `${process.env.EBAY_CLIENT_ID.substring(0, 15)}...` : '❌ 未設定',
      EBAY_CLIENT_SECRET: process.env.EBAY_CLIENT_SECRET ? '✅ 設定済み（非表示）' : '❌ 未設定',
      EBAY_REFRESH_TOKEN: process.env.EBAY_REFRESH_TOKEN ? '✅ 設定済み（非表示）' : '❌ 未設定',
      EBAY_ENVIRONMENT: process.env.EBAY_ENVIRONMENT || '未設定（デフォルト: production）'
    }

    // 実際に使用されるAPP_ID
    const actualAppId = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID_MJT

    // テスト1: Finding APIで直接テスト（APP_IDのみ）
    const testKeyword = 'iPhone'
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': actualAppId || '',
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': testKeyword,
      'paginationInput.entriesPerPage': '10',
      'paginationInput.pageNumber': '1',
      'sortOrder': 'PricePlusShippingLowest',
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true'
    })

    const apiUrl = `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`

    console.log('🧪 Finding API 直接テスト (APP_IDのみ):')
    console.log('APP_ID:', actualAppId?.substring(0, 20) + '...')

    const findingResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const findingText = await findingResponse.text()
    
    let findingParsed: any
    try {
      findingParsed = JSON.parse(findingText)
    } catch {
      findingParsed = { rawText: findingText }
    }

    const findItemsResponse = findingParsed.findCompletedItemsResponse?.[0]
    const findingAck = findItemsResponse?.ack?.[0]
    const findingError = findItemsResponse?.errorMessage?.[0]

    // テスト2: Browse APIでテスト（Refresh Token使用）
    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET
    const refreshToken = process.env.EBAY_REFRESH_TOKEN?.replace(/"/g, '')

    let browseTest: any = { skipped: true, reason: 'Refresh Token未設定' }

    if (clientId && clientSecret && refreshToken) {
      try {
        // Access Token取得
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          })
        })

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          const accessToken = tokenData.access_token

          // Browse APIテスト
          const browseResponse = await fetch(
            'https://api.ebay.com/buy/browse/v1/item_summary/search?q=iPhone&limit=10',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
              }
            }
          )

          const browseText = await browseResponse.text()
          let browseParsed: any
          try {
            browseParsed = JSON.parse(browseText)
          } catch {
            browseParsed = { rawText: browseText }
          }

          browseTest = {
            status: browseResponse.status,
            success: browseResponse.ok,
            error: browseParsed.errors?.[0] || null,
            itemCount: browseParsed.total || 0,
            response: browseParsed
          }
        } else {
          const errorText = await tokenResponse.text()
          browseTest = {
            status: tokenResponse.status,
            success: false,
            error: 'Token取得失敗: ' + errorText
          }
        }
      } catch (error: any) {
        browseTest = {
          success: false,
          error: error.message
        }
      }
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      actualAppIdUsed: actualAppId ? `${actualAppId.substring(0, 20)}...` : '❌ なし',
      
      findingApiTest: {
        method: 'APP_IDのみ（認証不要）',
        status: findingResponse.status,
        statusText: findingResponse.statusText,
        ack: findingAck,
        error: findingError ? {
          errorId: findingError.error?.[0]?.errorId?.[0],
          message: findingError.error?.[0]?.message?.[0],
          severity: findingError.error?.[0]?.severity?.[0]
        } : null,
        itemsFound: findItemsResponse?.searchResult?.[0]?.['@count'] || 0
      },

      browseApiTest: browseTest
    })

  } catch (error: any) {
    console.error('❌ Debug API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
