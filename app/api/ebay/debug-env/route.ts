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

    // テスト2: Browse APIでテスト（Client Credentials使用）
    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET

    let browseTest: any = { skipped: true, reason: 'Client Credentials未設定' }

    if (clientId && clientSecret) {
      try {
        // Application Token取得（Client Credentials）
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'https://api.ebay.com/oauth/api_scope'
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

    // テスト3: Sell APIでテスト（Refresh Token使用）
    const refreshToken = process.env.EBAY_REFRESH_TOKEN?.replace(/"/g, '')
    let sellTest: any = { skipped: true, reason: 'Refresh Token未設定' }

    if (clientId && clientSecret && refreshToken) {
      try {
        // User Access Token取得（Refresh Token）
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

          // Account APIテスト
          const accountResponse = await fetch(
            'https://api.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
              }
            }
          )

          const accountText = await accountResponse.text()
          let accountParsed: any
          try {
            accountParsed = JSON.parse(accountText)
          } catch {
            accountParsed = { rawText: accountText }
          }

          sellTest = {
            status: accountResponse.status,
            success: accountResponse.ok,
            tokenValid: true,
            error: accountParsed.errors?.[0] || null,
            policyCount: accountParsed.fulfillmentPolicies?.length || 0,
            expiresIn: tokenData.expires_in
          }
        } else {
          const errorText = await tokenResponse.text()
          sellTest = {
            status: tokenResponse.status,
            success: false,
            tokenValid: false,
            error: 'Refresh Tokenが無効: ' + errorText
          }
        }
      } catch (error: any) {
        sellTest = {
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

      browseApiTest: browseTest,

      sellApiTest: sellTest,

      explanation: {
        findingApi: 'Finding APIはAPP_IDだけで使える公開APIです。認証不要です。',
        browseApi: 'Browse APIはClient Credentials（Application Token）で動作します。Refresh Tokenは不要です。',
        sellApi: 'Sell APIはRefresh Token（User Token）で動作します。商品管理・出品に必要です。'
      }
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
