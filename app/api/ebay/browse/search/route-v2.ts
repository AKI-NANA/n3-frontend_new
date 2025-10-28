// app/api/ebay/browse/search/route-v2.ts
// Refresh Tokenを使用したバージョン（代替案）

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  incrementApiCallCount,
  getApiCallStatus,
  canMakeApiCallSafely,
  waitBeforeApiCall
} from '@/lib/research/api-call-tracker'

const EBAY_BROWSE_API = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const EBAY_TOKEN_API = 'https://api.ebay.com/identity/v1/oauth2/token'
const API_NAME = 'ebay_browse'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let cachedToken: {
  accessToken: string
  expiresAt: number
} | null = null

/**
 * Refresh Tokenを使用してUser Access Token取得
 */
async function getUserAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    console.log('✅ キャッシュされたトークンを使用')
    return cachedToken.accessToken
  }

  const clientId = process.env.EBAY_CLIENT_ID
  const clientSecret = process.env.EBAY_CLIENT_SECRET
  const refreshToken = process.env.EBAY_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, または EBAY_REFRESH_TOKEN が設定されていません')
  }

  console.log('🔑 Refresh Tokenを使用してアクセストークンを取得中...')

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(EBAY_TOKEN_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken.replace(/"/g, '') // クォートを削除
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ トークン取得エラー:', errorText)
    throw new Error(`トークン取得失敗: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  }

  console.log('✅ User Access Token取得成功')
  return data.access_token
}

/**
 * Browse APIで商品検索
 */
async function searchItems(accessToken: string, searchParams: {
  query: string
  categoryId?: string
  limit?: number
}) {
  const { query, categoryId, limit = 100 } = searchParams

  const params = new URLSearchParams({
    q: query,
    limit: Math.min(limit, 200).toString(),
    sort: 'price'
  })

  if (categoryId) {
    params.append('category_ids', categoryId)
  }

  const apiUrl = `${EBAY_BROWSE_API}?${params.toString()}`
  console.log('📡 Browse API呼び出し')

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Browse API Error:', errorText)
    
    if (response.status === 429) {
      throw new Error('eBay Browse APIのレート制限に達しました')
    }

    throw new Error(`Browse API Error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

function analyzePrices(items: any[]) {
  const prices = items
    .map((item: any) => parseFloat(item.price?.value || '0'))
    .filter((price: number) => price > 0)

  if (prices.length === 0) {
    return { lowestPrice: 0, averagePrice: 0, competitorCount: 0 }
  }

  const lowestPrice = Math.min(...prices)
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length

  return {
    lowestPrice: parseFloat(lowestPrice.toFixed(2)),
    averagePrice: parseFloat(averagePrice.toFixed(2)),
    competitorCount: items.length
  }
}

function calculateProfit(lowestPriceUSD: number, costJPY: number, weightG: number) {
  const JPY_TO_USD = 0.0067
  const costUSD = costJPY * JPY_TO_USD

  let shippingCostUSD = 12.99
  if (weightG > 1000) shippingCostUSD = 18.99
  if (weightG > 2000) shippingCostUSD = 24.99

  const ebayFeeRate = 0.129
  const ebayFee = lowestPriceUSD * ebayFeeRate

  const paypalFeeRate = 0.0349
  const paypalFixedFee = 0.49
  const paypalFee = lowestPriceUSD * paypalFeeRate + paypalFixedFee

  const totalCost = costUSD + shippingCostUSD + ebayFee + paypalFee
  const profitAmount = lowestPriceUSD - totalCost
  const profitMargin = lowestPriceUSD > 0 ? (profitAmount / lowestPriceUSD) * 100 : 0

  return {
    profitAmount: parseFloat(profitAmount.toFixed(2)),
    profitMargin: parseFloat(profitMargin.toFixed(2)),
    breakdown: {
      sellingPriceUSD: lowestPriceUSD,
      costUSD: parseFloat(costUSD.toFixed(2)),
      shippingCostUSD,
      ebayFee: parseFloat(ebayFee.toFixed(2)),
      paypalFee: parseFloat(paypalFee.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2))
    }
  }
}

async function saveToDatabase(productId: string, data: any) {
  try {
    const { error } = await supabase
      .from('yahoo_scraped_products')
      .update({
        competitors_lowest_price: data.lowestPrice,
        competitors_average_price: data.averagePrice,
        competitors_count: data.competitorCount,
        profit_amount_usd: data.profitAmount,
        profit_margin: data.profitMargin,
        sm_lowest_price: data.lowestPrice,
        research_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (error) throw error
    console.log('✅ Supabaseに保存完了')
  } catch (error) {
    console.error('❌ DB保存失敗:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productId,
      ebayTitle,
      ebayCategoryId,
      weightG = 500,
      actualCostJPY = 0
    } = body

    console.log('🔍 Browse API検索リクエスト (User Token版):', {
      productId,
      ebayTitle,
      ebayCategoryId,
      weightG
    })

    if (!ebayTitle) {
      return NextResponse.json(
        { success: false, error: 'ebayTitle（英語タイトル）は必須です' },
        { status: 400 }
      )
    }

    const safetyCheck = await canMakeApiCallSafely(API_NAME)
    const apiStatus = await getApiCallStatus(API_NAME)

    if (!safetyCheck.canCall) {
      console.error(`❌ API呼び出し制限: ${safetyCheck.reason}`)
      return NextResponse.json(
        {
          success: false,
          error: safetyCheck.reason || 'API呼び出し制限に達しました',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          apiStatus
        },
        { status: 429 }
      )
    }

    console.log(`📊 API呼び出し状況: ${apiStatus.callCount}/${apiStatus.dailyLimit}`)

    await waitBeforeApiCall()
    console.log('✅ API呼び出し間隔OK')

    // User Access Token取得（Refresh Token使用）
    const accessToken = await getUserAccessToken()

    await incrementApiCallCount(API_NAME)

    const searchResult = await searchItems(accessToken, {
      query: ebayTitle,
      categoryId: ebayCategoryId,
      limit: 100
    })

    const items = searchResult.itemSummaries || []
    console.log(`✅ 商品取得: ${items.length}件`)

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        lowestPrice: 0,
        averagePrice: 0,
        competitorCount: 0,
        profitAmount: 0,
        profitMargin: 0,
        message: '該当商品が見つかりませんでした',
        apiStatus: await getApiCallStatus(API_NAME)
      })
    }

    const priceAnalysis = analyzePrices(items)
    console.log('💰 最安値分析:', priceAnalysis)

    const profitAnalysis = calculateProfit(
      priceAnalysis.lowestPrice,
      actualCostJPY,
      weightG
    )
    console.log('💵 利益分析:', profitAnalysis)

    if (productId) {
      await saveToDatabase(productId, {
        ...priceAnalysis,
        ...profitAnalysis
      })
    }

    return NextResponse.json({
      success: true,
      lowestPrice: priceAnalysis.lowestPrice,
      averagePrice: priceAnalysis.averagePrice,
      competitorCount: priceAnalysis.competitorCount,
      profitAmount: profitAnalysis.profitAmount,
      profitMargin: profitAnalysis.profitMargin,
      breakdown: profitAnalysis.breakdown,
      items: items.slice(0, 10),
      apiStatus: await getApiCallStatus(API_NAME)
    })

  } catch (error: any) {
    console.error('❌ Browse API Error:', error)
    const apiStatus = await getApiCallStatus(API_NAME)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        apiStatus
      },
      { status: 500 }
    )
  }
}
