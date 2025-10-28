// app/api/ebay/browse/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  incrementApiCallCount,
  getApiCallStatus,
  canMakeApiCallSafely,
  waitBeforeApiCall
} from '@/lib/research/api-call-tracker'

// eBay Browse API エンドポイント
const EBAY_BROWSE_API = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const EBAY_TOKEN_API = 'https://api.ebay.com/identity/v1/oauth2/token'
const API_NAME = 'ebay_browse'

// Supabaseクライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// アクセストークンのキャッシュ（メモリ内）
let cachedToken: {
  accessToken: string
  expiresAt: number
} | null = null

/**
 * OAuth 2.0 トークン取得（Client Credentials Flow - Browse API用）
 */
async function getAccessToken(): Promise<string> {
  // キャッシュが有効な場合は再利用（5分前に期限切れを想定）
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    console.log('✅ キャッシュされたトークンを使用')
    return cachedToken.accessToken
  }

  const clientId = process.env.EBAY_CLIENT_ID
  const clientSecret = process.env.EBAY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('EBAY_CLIENT_ID または EBAY_CLIENT_SECRET が設定されていません')
  }

  console.log('🔑 Application Tokenを取得中（Browse API用）...')

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  // Browse API用Application Token取得（スコープ: https://api.ebay.com/oauth/api_scope）
  const response = await fetch(EBAY_TOKEN_API, {
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

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ トークン取得エラー:', errorText)
    throw new Error(`トークン取得失敗: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // トークンをキャッシュ（expires_in秒後に期限切れ）
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  }

  console.log('✅ Application Token取得成功')
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

  // URLパラメータ構築
  const params = new URLSearchParams({
    q: query,
    limit: Math.min(limit, 200).toString(), // Browse APIは最大200件
    sort: 'price' // 価格順（昇順）
  })

  if (categoryId) {
    params.append('category_ids', categoryId)
  }

  const apiUrl = `${EBAY_BROWSE_API}?${params.toString()}`
  console.log('📡 Browse API呼び出し:', apiUrl)

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
    
    // レート制限エラー
    if (response.status === 429) {
      throw new Error('eBay Browse APIのレート制限に達しました。しばらくしてから再度お試しください。')
    }

    throw new Error(`Browse API Error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data
}

/**
 * 最安値・平均価格を計算
 */
function analyzePrices(items: any[]) {
  const prices = items
    .map((item: any) => parseFloat(item.price?.value || '0'))
    .filter((price: number) => price > 0)

  if (prices.length === 0) {
    return {
      lowestPrice: 0,
      averagePrice: 0,
      competitorCount: 0
    }
  }

  const lowestPrice = Math.min(...prices)
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length

  return {
    lowestPrice: parseFloat(lowestPrice.toFixed(2)),
    averagePrice: parseFloat(averagePrice.toFixed(2)),
    competitorCount: items.length
  }
}

/**
 * 利益計算（簡易版）
 */
function calculateProfit(lowestPriceUSD: number, costJPY: number, weightG: number) {
  const JPY_TO_USD = 0.0067 // 1円 = 0.0067ドル（概算）
  const costUSD = costJPY * JPY_TO_USD

  // 送料計算（簡易版）
  let shippingCostUSD = 12.99
  if (weightG > 1000) shippingCostUSD = 18.99
  if (weightG > 2000) shippingCostUSD = 24.99

  // eBay手数料（12.9%）
  const ebayFeeRate = 0.129
  const ebayFee = lowestPriceUSD * ebayFeeRate

  // PayPal手数料（3.49% + $0.49）
  const paypalFeeRate = 0.0349
  const paypalFixedFee = 0.49
  const paypalFee = lowestPriceUSD * paypalFeeRate + paypalFixedFee

  // 総費用
  const totalCost = costUSD + shippingCostUSD + ebayFee + paypalFee

  // 利益額
  const profitAmount = lowestPriceUSD - totalCost

  // 利益率
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

/**
 * Supabaseに保存
 */
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

    if (error) {
      console.error('❌ DB保存エラー:', error)
      throw error
    }

    console.log('✅ Supabaseに保存完了')
  } catch (error) {
    console.error('❌ DB保存失敗:', error)
    throw error
  }
}

/**
 * POSTエンドポイント
 */
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

    console.log('🔍 Browse API検索リクエスト:', {
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

    // API呼び出し可能かチェック
    const safetyCheck = await canMakeApiCallSafely(API_NAME)
    const apiStatus = await getApiCallStatus(API_NAME)

    if (!safetyCheck.canCall) {
      console.error(`❌ API呼び出し制限: ${safetyCheck.reason}`)

      let errorMessage = safetyCheck.reason || 'API呼び出し制限に達しました'

      if (safetyCheck.waitTime) {
        const waitMinutes = Math.ceil(safetyCheck.waitTime / 60000)
        errorMessage += `\n\n${waitMinutes}分後に再度お試しください。`
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCode: 'RATE_LIMIT_EXCEEDED',
          apiStatus
        },
        { status: 429 }
      )
    }

    console.log(`📊 API呼び出し状況: ${apiStatus.callCount}/${apiStatus.dailyLimit} (残り${apiStatus.remaining}回)`)

    // API呼び出し前の待機処理
    await waitBeforeApiCall()
    console.log('✅ API呼び出し間隔OK')

    // 1. アクセストークン取得
    const accessToken = await getAccessToken()

    // 2. API呼び出しカウントを増加
    await incrementApiCallCount(API_NAME)

    // 3. Browse APIで商品検索
    const searchResult = await searchItems(accessToken, {
      query: ebayTitle,
      categoryId: ebayCategoryId,
      limit: 100
    })

    const items = searchResult.itemSummaries || []
    const totalCount = searchResult.total || 0

    console.log(`✅ 商品取得: ${items.length}件 / 総数: ${totalCount}件`)

    if (items.length === 0) {
      console.warn('⚠️ 該当商品が見つかりませんでした')
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

    // 4. 最安値・平均価格を計算
    const priceAnalysis = analyzePrices(items)
    console.log('💰 最安値分析:', priceAnalysis)

    // 5. 利益計算
    const profitAnalysis = calculateProfit(
      priceAnalysis.lowestPrice,
      actualCostJPY,
      weightG
    )
    console.log('💵 利益分析:', profitAnalysis)

    // 6. Supabaseに保存
    if (productId) {
      await saveToDatabase(productId, {
        ...priceAnalysis,
        ...profitAnalysis
      })
    }

    // 更新されたAPI状況を取得
    const updatedApiStatus = await getApiCallStatus(API_NAME)

    return NextResponse.json({
      success: true,
      lowestPrice: priceAnalysis.lowestPrice,
      averagePrice: priceAnalysis.averagePrice,
      competitorCount: priceAnalysis.competitorCount,
      profitAmount: profitAnalysis.profitAmount,
      profitMargin: profitAnalysis.profitMargin,
      breakdown: profitAnalysis.breakdown,
      items: items.slice(0, 10), // 最初の10件のみ返す
      apiStatus: updatedApiStatus
    })

  } catch (error: any) {
    console.error('❌ Browse API Error:', error)

    // エラー時もAPI状況を返す
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
