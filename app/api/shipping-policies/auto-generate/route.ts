import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// eBay API設定
const EBAY_API_BASE = process.env.EBAY_API_SANDBOX === 'true' 
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com'

interface ZoneRate {
  zone_name: string
  included_regions: string[]
  shipping_service_code: string
  cost_usd: number
  additional_cost_usd: number | null
  estimated_delivery_days_min: number
  estimated_delivery_days_max: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { policyIds } = body
    
    if (!policyIds || policyIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'ポリシーIDが指定されていません'
      }, { status: 400 })
    }
    
    const results = []
    let successCount = 0
    
    for (const policyId of policyIds) {
      try {
        // ポリシー情報を取得
        const { data: policy, error: policyError } = await supabase
          .from('ebay_shipping_policies_v2')
          .select('*')
          .eq('id', policyId)
          .single()
        
        if (policyError || !policy) {
          results.push({
            policyId,
            policyName: 'Unknown',
            success: false,
            error: 'ポリシーが見つかりません'
          })
          continue
        }
        
        // ゾーン別料金を取得
        const { data: zoneRates, error: ratesError } = await supabase
          .from('ebay_policy_zone_rates_v2')
          .select('*')
          .eq('policy_id', policyId)
          .order('zone_name', { ascending: true })
        
        if (ratesError || !zoneRates || zoneRates.length === 0) {
          results.push({
            policyId,
            policyName: policy.policy_name,
            success: false,
            error: 'ゾーン料金が設定されていません'
          })
          continue
        }
        
        // eBay API用のペイロードを構築
        const ebayPayload = buildEbayPayload(policy, zoneRates)
        
        // eBay APIにポリシーを登録
        const ebayResult = await registerToEbayAPI(ebayPayload)
        
        if (ebayResult.success) {
          // データベースを更新
          await supabase
            .from('ebay_shipping_policies_v2')
            .update({
              ebay_policy_id: ebayResult.fulfillmentPolicyId,
              synced_at: new Date().toISOString()
            })
            .eq('id', policyId)
          
          results.push({
            policyId,
            policyName: policy.policy_name,
            success: true,
            ebayPolicyId: ebayResult.fulfillmentPolicyId
          })
          successCount++
        } else {
          results.push({
            policyId,
            policyName: policy.policy_name,
            success: false,
            error: ebayResult.error
          })
        }
        
      } catch (error: any) {
        results.push({
          policyId,
          policyName: 'Error',
          success: false,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      successCount,
      totalCount: policyIds.length,
      results
    })
    
  } catch (error: any) {
    console.error('Auto-generate error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

function buildEbayPayload(policy: any, zoneRates: ZoneRate[]) {
  // 配送オプションを構築
  const shippingOptions = zoneRates.map(zone => ({
    optionType: 'INTERNATIONAL',
    costType: 'FLAT_RATE',
    
    // 配送サービス
    shippingServices: [{
      shippingServiceCode: zone.shipping_service_code,
      shippingCost: {
        value: zone.cost_usd.toFixed(2),
        currency: 'USD'
      },
      additionalShippingCost: zone.additional_cost_usd ? {
        value: zone.additional_cost_usd.toFixed(2),
        currency: 'USD'
      } : undefined,
      buyerResponsibleForShipping: false,
      buyerResponsibleForPickup: false,
      sortOrder: 1
    }],
    
    // 配送先地域
    shipToLocations: {
      regionIncluded: zone.included_regions.map(region => ({
        regionName: region,
        regionType: 'WORLDWIDE'
      }))
    },
    
    // 配送予定日数
    shippingEstimatedDelivery: {
      minDeliveryDays: zone.estimated_delivery_days_min,
      maxDeliveryDays: zone.estimated_delivery_days_max
    }
  }))
  
  return {
    name: policy.policy_name,
    description: policy.description || `配送ポリシー: ${policy.policy_name}`,
    marketplaceId: policy.marketplace_id || 'EBAY_US',
    categoryTypes: [{
      name: 'ALL_EXCLUDING_MOTORS_VEHICLES',
      default: true
    }],
    handlingTime: {
      value: policy.handling_time_days,
      unit: 'BUSINESS_DAY'
    },
    shippingOptions,
    globalShipping: false,
    pickupDropOff: false,
    freightShipping: false
  }
}

async function registerToEbayAPI(payload: any) {
  try {
    // eBay OAuth トークンを取得
    const accessToken = await getEbayAccessToken()
    
    if (!accessToken) {
      return {
        success: false,
        error: 'eBay認証トークンの取得に失敗しました'
      }
    }
    
    // Fulfillment Policy API を呼び出し
    const response = await fetch(`${EBAY_API_BASE}/sell/account/v1/fulfillment_policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': payload.marketplaceId
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.errors?.[0]?.message || 'eBay API エラー'
      }
    }
    
    const data = await response.json()
    
    return {
      success: true,
      fulfillmentPolicyId: data.fulfillmentPolicyId
    }
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function getEbayAccessToken(): Promise<string | null> {
  try {
    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      console.error('eBay credentials not configured')
      return null
    }
    
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const tokenUrl = process.env.EBAY_API_SANDBOX === 'true'
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token'
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    })
    
    if (!response.ok) {
      console.error('Failed to get eBay access token')
      return null
    }
    
    const data = await response.json()
    return data.access_token
    
  } catch (error) {
    console.error('Error getting eBay token:', error)
    return null
  }
}
