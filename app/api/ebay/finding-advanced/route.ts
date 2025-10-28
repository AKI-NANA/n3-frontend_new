import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  incrementApiCallCount,
  getApiCallStatus,
  canMakeApiCallSafely,
  waitBeforeApiCall
} from '@/lib/research/api-call-tracker'

const EBAY_FINDING_API = 'https://svcs.ebay.com/services/search/FindingService/v1'
const API_NAME = 'ebay_finding_advanced'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * findItemsAdvanced を使用（現在の出品価格から最安値を推測）
 * findCompletedItems のレート制限を回避
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

    console.log('🔍 Finding API (findItemsAdvanced) 検索リクエスト:', {
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

    const appId = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID_MJT

    if (!appId) {
      return NextResponse.json(
        { success: false, error: 'EBAY_APP_ID が設定されていません' },
        { status: 500 }
      )
    }

    console.log(`📊 API呼び出し状況: ${apiStatus.callCount}/${apiStatus.dailyLimit}`)

    await waitBeforeApiCall()

    // findItemsAdvanced を使用（現在の出品商品を検索）
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findItemsAdvanced',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': ebayTitle,
      'paginationInput.entriesPerPage': '100',
      'paginationInput.pageNumber': '1',
      'sortOrder': 'PricePlusShippingLowest', // 価格の安い順
    })

    // カテゴリフィルター
    if (ebayCategoryId && ebayCategoryId !== '99999') {
      params.append('categoryId', ebayCategoryId)
    }

    // New商品のみ
    params.append('itemFilter(0).name', 'Condition')
    params.append('itemFilter(0).value', '1000') // 1000 = New

    // Buy It Now（即決価格）のみ
    params.append('itemFilter(1).name', 'ListingType')
    params.append('itemFilter(1).value', 'FixedPrice')

    const apiUrl = `${EBAY_FINDING_API}?${params.toString()}`
    console.log('📡 Finding API (findItemsAdvanced) 呼び出し')

    await incrementApiCallCount(API_NAME)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ eBay API Error:', errorText)
      throw new Error(`eBay API Error: ${response.status}`)
    }

    const data = await response.json()
    const findItemsResponse = data.findItemsAdvancedResponse?.[0]

    if (!findItemsResponse) {
      throw new Error('eBay APIレスポンスの形式が不正です')
    }

    const ack = findItemsResponse.ack?.[0]

    if (ack !== 'Success') {
      const errorMessage = findItemsResponse.errorMessage?.[0]?.error?.[0]?.message?.[0] || 'Unknown error'
      const errorId = findItemsResponse.errorMessage?.[0]?.error?.[0]?.errorId?.[0] || ''

      if (errorId === '10001') {
        console.error('❌ レート制限エラー: findItemsAdvancedの1日の上限に達しました')
        return NextResponse.json(
          {
            success: false,
            error: 'eBay APIのレート制限に達しました。24時間後に再度お試しください。',
            errorCode: '10001',
            apiStatus
          },
          { status: 429 }
        )
      }

      throw new Error(`eBay API Error: ${errorMessage}`)
    }

    const searchResult = findItemsResponse.searchResult?.[0]
    const items = searchResult?.item || []
    const totalEntries = parseInt(searchResult?.['@count'] || '0')

    console.log(`✅ 取得成功: ${items.length}件 / 総数: ${totalEntries}件`)

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

    // 価格を抽出
    const prices = items
      .map((item: any) => {
        const sellingStatus = item.sellingStatus?.[0]
        return parseFloat(sellingStatus?.currentPrice?.[0]?.__value__ || '0')
      })
      .filter((price: number) => price > 0)

    if (prices.length === 0) {
      return NextResponse.json({
        success: true,
        lowestPrice: 0,
        averagePrice: 0,
        competitorCount: 0,
        profitAmount: 0,
        profitMargin: 0,
        message: '価格情報が見つかりませんでした',
        apiStatus: await getApiCallStatus(API_NAME)
      })
    }

    // 最安値・平均価格を計算
    const lowestPrice = Math.min(...prices)
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length

    console.log('💰 最安値分析:', {
      lowestPrice: lowestPrice.toFixed(2),
      averagePrice: averagePrice.toFixed(2),
      competitorCount: items.length
    })

    // 利益計算
    const JPY_TO_USD = 0.0067
    const costUSD = actualCostJPY * JPY_TO_USD

    let shippingCostUSD = 12.99
    if (weightG > 1000) shippingCostUSD = 18.99
    if (weightG > 2000) shippingCostUSD = 24.99

    const ebayFeeRate = 0.129
    const ebayFee = lowestPrice * ebayFeeRate

    const paypalFeeRate = 0.0349
    const paypalFixedFee = 0.49
    const paypalFee = lowestPrice * paypalFeeRate + paypalFixedFee

    const totalCost = costUSD + shippingCostUSD + ebayFee + paypalFee
    const profitAmount = lowestPrice - totalCost
    const profitMargin = lowestPrice > 0 ? (profitAmount / lowestPrice) * 100 : 0

    console.log('💵 利益分析:', {
      profitAmount: profitAmount.toFixed(2),
      profitMargin: profitMargin.toFixed(2)
    })

    // Supabaseに保存
    if (productId) {
      try {
        const { error } = await supabase
          .from('yahoo_scraped_products')
          .update({
            competitors_lowest_price: parseFloat(lowestPrice.toFixed(2)),
            competitors_average_price: parseFloat(averagePrice.toFixed(2)),
            competitors_count: items.length,
            profit_amount_usd: parseFloat(profitAmount.toFixed(2)),
            profit_margin: parseFloat(profitMargin.toFixed(2)),
            sm_lowest_price: parseFloat(lowestPrice.toFixed(2)),
            research_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)

        if (error) throw error
        console.log('✅ Supabaseに保存完了')
      } catch (error) {
        console.error('❌ DB保存失敗:', error)
      }
    }

    return NextResponse.json({
      success: true,
      lowestPrice: parseFloat(lowestPrice.toFixed(2)),
      averagePrice: parseFloat(averagePrice.toFixed(2)),
      competitorCount: items.length,
      profitAmount: parseFloat(profitAmount.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      breakdown: {
        sellingPriceUSD: lowestPrice,
        costUSD: parseFloat(costUSD.toFixed(2)),
        shippingCostUSD,
        ebayFee: parseFloat(ebayFee.toFixed(2)),
        paypalFee: parseFloat(paypalFee.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2))
      },
      items: items.slice(0, 10),
      apiStatus: await getApiCallStatus(API_NAME)
    })

  } catch (error: any) {
    console.error('❌ Finding API Error:', error)
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
