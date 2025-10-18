// app/api/sellermirror/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  incrementApiCallCount, 
  getApiCallStatus, 
  waitBeforeApiCall,
  canMakeApiCallSafely
} from '@/lib/research/api-call-tracker'
import { analyzeLowestPrice, calculateProfitAtLowestPrice, type CompetitorData } from '@/lib/research/profit-analyzer'
import { saveResearchResults } from '@/lib/research/research-db'

const EBAY_FINDING_API = 'https://svcs.ebay.com/services/search/FindingService/v1'
const API_NAME = 'ebay_finding_active' // 現在出品中の商品用

interface SellerMirrorRequest {
  productId: string
  ebayTitle: string  // 英語タイトル（必須）
  ebayCategoryId?: string
  yahooPrice?: number
  weightG?: number
  actualCostJPY?: number // 実際の仕入れ価格
}

export async function POST(request: NextRequest) {
  try {
    const body: SellerMirrorRequest = await request.json()
    
    const {
      productId,
      ebayTitle,
      ebayCategoryId,
      yahooPrice,
      weightG = 500, // デフォルト500g
      actualCostJPY
    } = body

    console.log('🔍 SellerMirror分析開始:', {
      productId,
      ebayTitle,
      ebayCategoryId,
      weightG,
      actualCostJPY
    })

    if (!ebayTitle) {
      return NextResponse.json(
        { success: false, error: '英語タイトルは必須です' },
        { status: 400 }
      )
    }

    // キャッシュキーを生成
    const cacheKey = `${ebayTitle.toLowerCase()}_${ebayCategoryId || ''}`
    
    // キャッシュを確認
    console.log('💾 キャッシュ確認:', cacheKey)
    const { data: cachedData } = await supabase
      .from('ebay_analysis_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (cachedData) {
      console.log('✅ キャッシュヒット! API呼び出しをスキップ')
      
      // ヒットカウントを増加
      await supabase
        .from('ebay_analysis_cache')
        .update({ 
          hit_count: cachedData.hit_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', cachedData.id)
      
      // キャッシュから利益計算
      const profitResult = calculateProfitAtLowestPrice(
        cachedData.lowest_price_usd,
        actualCostJPY || 0,
        weightG
      )
      
      return NextResponse.json({
        success: true,
        fromCache: true,
        competitorCount: cachedData.competitor_count,
        lowestPrice: cachedData.lowest_price_usd,
        averagePrice: cachedData.average_price_usd,
        profitMargin: profitResult.profitMargin,
        profitAmount: profitResult.profitAmount
      })
    }
    
    console.log('🔄 キャッシュミス - API呼び出し実行')
    
    // API呼び出し可能かチェック
    const safetyCheck = await canMakeApiCallSafely(API_NAME)
    
    if (!safetyCheck.canCall) {
      console.error(`❌ API呼び出し制限: ${safetyCheck.reason}`)
      return NextResponse.json(
        { 
          success: false, 
          error: safetyCheck.reason || 'API呼び出し制限に達しました',
          errorCode: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }

    // 環境変数チェック
    const appId = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID_MJT
    
    if (!appId) {
      return NextResponse.json(
        { success: false, error: 'EBAY_APP_ID が設定されていません' },
        { status: 500 }
      )
    }

    // API呼び出し前の待機
    await waitBeforeApiCall()

    // eBay Finding API パラメータ構築（現在出品中の商品）
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findItemsAdvanced', // 現在出品中の商品を検索
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': ebayTitle, // 英語タイトルで検索
      'paginationInput.entriesPerPage': '100',
      'paginationInput.pageNumber': '1',
      'sortOrder': 'PricePlusShippingLowest', // 価格+送料の合計が安い順
    })

    // カテゴリフィルター
    let filterIndex = 0
    if (ebayCategoryId) {
      params.append('categoryId', ebayCategoryId)
    }

    // 現在出品中の商品のみ（ListingTypeフィルター不要 - findItemsAdvancedはデフォルトで現在出品中）
    // HideDuplicateItems: 同じ出品者の重複を除外
    params.append(`itemFilter(${filterIndex}).name`, 'HideDuplicateItems')
    params.append(`itemFilter(${filterIndex}).value`, 'true')
    filterIndex++

    // 最低価格フィルター（$1以上）- 無料商品を除外
    params.append(`itemFilter(${filterIndex}).name`, 'MinPrice')
    params.append(`itemFilter(${filterIndex}).value`, '1')
    filterIndex++

    const apiUrl = `${EBAY_FINDING_API}?${params.toString()}`
    console.log('📡 eBay API呼び出し（SellerMirror）')
    console.log('🔗 API URL:', apiUrl)
    console.log('📝 パラメータ:', {
      keywords: ebayTitle,
      categoryId: ebayCategoryId,
      appId: appId.substring(0, 10) + '...'
    })

    // API呼び出しカウントを増加
    await incrementApiCallCount(API_NAME)

    // API呼び出し
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    console.log('📡 eBay APIレスポンスステータス:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ eBay APIエラーレスポンス:', errorText.substring(0, 500))
      throw new Error(`eBay API Error: ${response.status}`)
    }

    const data = await response.json()
    const findItemsResponse = data.findItemsAdvancedResponse?.[0]
    
    if (!findItemsResponse || findItemsResponse.ack?.[0] !== 'Success') {
      throw new Error('eBay API Error: Invalid response')
    }

    const items = findItemsResponse.searchResult?.[0]?.item || []
    
    if (items.length === 0) {
      return NextResponse.json({
        success: false,
        error: '競合商品が見つかりませんでした',
        competitorCount: 0
      })
    }

    console.log(`✅ 現在出品中の商品取得: ${items.length}件`)

    // 競合データを整形（現在出品中の商品）
    const competitors: CompetitorData[] = items.map((item: any) => {
      const sellingStatus = item.sellingStatus?.[0]
      const price = parseFloat(sellingStatus?.currentPrice?.[0]?.__value__ || '0')
      // 現在出品中の商品にはquantitySoldがないので、代わりにwatchCountを使用
      const watchCount = parseInt(item.listingInfo?.[0]?.watchCount?.[0] || '0')
      const seller = item.sellerInfo?.[0]?.sellerUserName?.[0] || ''
      const condition = item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown'
      
      return {
        price,
        soldCount: watchCount, // ウォッチ数を代用（人気度の指標）
        seller,
        condition
      }
    }).filter(comp => comp.price > 0) // 価格0の商品を除外

    // 最安値分析
    const lowestPriceAnalysis = analyzeLowestPrice(competitors)

    console.log(`💰 現在の最安値: ${lowestPriceAnalysis.lowestPrice}`)
    console.log(`📈 現在の平均価格: ${lowestPriceAnalysis.averagePrice.toFixed(2)}`)
    console.log(`🏪 現在出品中の競合数: ${lowestPriceAnalysis.competitorCount}`)

    // 利益計算（仕入れ価格が指定されている場合）
    let profitAnalysis = null
    if (actualCostJPY) {
      const exchangeRate = 150 // TODO: 実際の為替レートを取得
      
      profitAnalysis = await calculateProfitAtLowestPrice(
        lowestPriceAnalysis.lowestPrice,
        actualCostJPY,
        weightG,
        exchangeRate
      )

      console.log(`✅ 利益率: ${profitAnalysis.profitMargin.toFixed(1)}%`)
      console.log(`💵 利益額: $${profitAnalysis.profitAmount.toFixed(2)}`)
    }

    // 上位10件の競合情報（価格が安い順）
    const topCompetitors = competitors
      .sort((a, b) => a.price - b.price)
      .slice(0, 10)
      .map(comp => ({
        price: comp.price,
        watchCount: comp.soldCount, // soldCountはwatchCountの代用
        seller: comp.seller,
        condition: comp.condition
      }))

    const result = {
      success: true,
      productId,
      ebayTitle,
      lowestPrice: lowestPriceAnalysis.lowestPrice,
      averagePrice: lowestPriceAnalysis.averagePrice,
      competitorCount: lowestPriceAnalysis.competitorCount,
      topCompetitors,
      profitAnalysis,
      weightG,
      timestamp: new Date().toISOString()
    }

    // キャッシュに保存（24時間有効）
    console.log('💾 SellerMirror結果をキャッシュに保存...')
    await supabase
      .from('ebay_analysis_cache')
      .upsert({
        search_query: ebayTitle,
        category_id: ebayCategoryId,
        competitor_count: lowestPriceAnalysis.competitorCount,
        lowest_price_usd: lowestPriceAnalysis.lowestPrice,
        average_price_usd: lowestPriceAnalysis.averagePrice,
        items_data: { topCompetitors },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24時間後
      }, {
        onConflict: 'cache_key'
      })
    
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ SellerMirror分析エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'SellerMirror分析に失敗しました' 
      },
      { status: 500 }
    )
  }
}
