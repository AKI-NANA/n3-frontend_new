/**
 * eBay配送ポリシー一覧を取得するAPI
 */
import { NextRequest, NextResponse } from 'next/server'

const EBAY_CLIENT_ID = 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce'
const EBAY_CLIENT_SECRET = 'PRD-7fae13b2cf17-be72-4584-bdd6-4ea4'
const EBAY_REFRESH_TOKEN_GREEN = 'v^1.1#i^1#f^0#p^3#I^3#r^1#t^Ul4xMF82OjkyQUYxOTlENTQ4NjQ4QkQyMEJBRUJFRjA0M0YwRDZFXzFfMSNFXjI2MA=='

async function getAccessToken() {
  try {
    const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')

    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: EBAY_REFRESH_TOKEN_GREEN,
        scope: 'https://api.ebay.com/oauth/api_scope/sell.account'
      })
    })

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('❌ トークン取得エラー:', error)
    throw error
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔵 配送ポリシー一覧取得API呼び出し')
    
    const accessToken = await getAccessToken()
    
    if (!accessToken) {
      throw new Error('トークン取得失敗')
    }

    console.log('📋 eBayから配送ポリシー一覧を取得中...')
    const response = await fetch(
      'https://api.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ eBay APIエラー:', data)
      return NextResponse.json({ 
        success: false,
        error: data
      }, { status: 500 })
    }

    console.log(`✅ ${data.fulfillmentPolicies?.length || 0}個のポリシーを取得`)

    // ポリシーを整形
    const policies = (data.fulfillmentPolicies || []).map((policy: any) => {
      // USA送料を抽出
      const domesticService = policy.shippingOptions?.find((opt: any) => opt.optionType === 'DOMESTIC')
      const usaShipping = domesticService?.shippingServices?.[0]?.shippingCost?.value || '0'

      // Rate Tableを抽出
      const intlService = policy.shippingOptions?.find((opt: any) => opt.optionType === 'INTERNATIONAL')
      const rateTableId = intlService?.rateTableId || null

      // 配送サービスコード
      const domesticCode = domesticService?.shippingServices?.[0]?.shippingServiceCode || ''
      const intlCode = intlService?.shippingServices?.[0]?.shippingServiceCode || ''

      return {
        policyId: policy.fulfillmentPolicyId,
        name: policy.name,
        description: policy.description,
        usaShipping: parseFloat(usaShipping),
        rateTableId: rateTableId,
        domesticServiceCode: domesticCode,
        intlServiceCode: intlCode,
        handlingTime: policy.handlingTime?.value || 0,
        excludedCount: policy.shipToLocations?.regionExcluded?.length || 0
      }
    })

    // USA送料順にソート
    policies.sort((a: any, b: any) => a.usaShipping - b.usaShipping)

    return NextResponse.json({
      success: true,
      total: policies.length,
      policies: policies
    })

  } catch (error: any) {
    console.error('❌ エラー:', error)
    
    return NextResponse.json({ 
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
