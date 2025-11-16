import { NextRequest, NextResponse } from 'next/server'

const EBAY_TOKEN_API = 'https://api.ebay.com/identity/v1/oauth2/token'
const EBAY_ACCOUNT_API = 'https://api.ebay.com/sell/account/v1/fulfillment_policy'

/**
 * Sell API テスト - Account API (Fulfillment Policy取得)
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET
    const refreshToken = process.env.EBAY_REFRESH_TOKEN?.replace(/"/g, '')

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, または EBAY_REFRESH_TOKEN が設定されていません' 
        },
        { status: 500 }
      )
    }

    console.log('🔑 Sell API: User Access Token取得中...')

    // Step 1: Refresh TokenでUser Access Tokenを取得
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const tokenResponse = await fetch(EBAY_TOKEN_API, {
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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ トークン取得エラー:', errorText)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'User Access Token取得失敗',
          details: errorText,
          hint: 'Refresh Tokenが無効または期限切れの可能性があります'
        },
        { status: tokenResponse.status }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log('✅ User Access Token取得成功')
    console.log('📡 Account API (Fulfillment Policy) を呼び出し中...')

    // Step 2: Account API (Fulfillment Policy)を呼び出し
    const accountResponse = await fetch(
      `${EBAY_ACCOUNT_API}?marketplace_id=EBAY_US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      }
    )

    const accountText = await accountResponse.text()
    let accountData: any

    try {
      accountData = JSON.parse(accountText)
    } catch {
      accountData = { rawText: accountText }
    }

    if (!accountResponse.ok) {
      console.error('❌ Account API エラー:', accountData)
      
      return NextResponse.json(
        {
          success: false,
          tokenValid: true, // トークンは取得できた
          apiError: true,
          status: accountResponse.status,
          error: accountData.errors?.[0] || accountData,
          hint: 'Refresh Tokenは有効ですが、Account APIの呼び出しに失敗しました'
        },
        { status: accountResponse.status }
      )
    }

    console.log('✅ Account API 呼び出し成功')

    return NextResponse.json({
      success: true,
      tokenValid: true,
      apiValid: true,
      message: 'Sell API（Account API）が正常に動作しています',
      accountData: {
        fulfillmentPolicyCount: accountData.fulfillmentPolicies?.length || 0,
        policies: accountData.fulfillmentPolicies?.map((policy: any) => ({
          name: policy.name,
          policyId: policy.fulfillmentPolicyId,
          categoryTypes: policy.categoryTypes,
          marketplaceId: policy.marketplaceId
        })) || []
      },
      tokenInfo: {
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
        scope: tokenData.scope
      }
    })

  } catch (error: any) {
    console.error('❌ Sell API テストエラー:', error)
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
