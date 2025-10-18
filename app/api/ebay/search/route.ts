import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  incrementApiCallCount, 
  getApiCallStatus, 
  canMakeApiCall,
  waitBeforeApiCall,
  canMakeApiCallSafely
} from '@/lib/research/api-call-tracker'
import { analyzeLowestPrice, calculateProfitAtLowestPrice, type CompetitorData } from '@/lib/research/profit-analyzer'
import { saveResearchResults, type ResearchResult } from '@/lib/research/research-db'

// eBay Finding API エンドポイント
const EBAY_FINDING_API = 'https://svcs.ebay.com/services/search/FindingService/v1'
const API_NAME = 'ebay_finding_completed'

// Supabaseクライアント（キャッシュ用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EbaySearchParams {
  keywords: string
  categoryId?: string
  condition?: string
  minPrice?: string
  maxPrice?: string
  minSold?: string
  listingType?: string // 追加
  entriesPerPage?: number
  sortOrder?: string
}

// キャッシュキーを生成
function getCacheKey(params: EbaySearchParams): string {
  return `ebay_search_${params.keywords}_${params.categoryId || 'all'}_${params.condition || 'all'}_${params.entriesPerPage}`
}

// キャッシュから取得（24時間有効）
async function getFromCache(cacheKey: string) {
  try {
    const { data, error } = await supabase
      .from('api_call_cache')
      .select('response_data, created_at')
      .eq('cache_key', cacheKey)
      .single()

    if (error || !data) return null

    // 24時間以内のキャッシュのみ有効
    const cacheAge = Date.now() - new Date(data.created_at).getTime()
    if (cacheAge > 24 * 60 * 60 * 1000) {
      console.log('⏰ キャッシュが古いため無視')
      return null
    }

    console.log('✅ キャッシュヒット:', cacheKey)
    return data.response_data
  } catch (error) {
    console.error('キャッシュ取得エラー:', error)
    return null
  }
}

// キャッシュに保存
async function saveToCache(cacheKey: string, data: any) {
  try {
    await supabase
      .from('api_call_cache')
      .upsert({
        cache_key: cacheKey,
        api_name: 'ebay_finding',
        response_data: data,
        created_at: new Date().toISOString()
      })
    console.log('💾 キャッシュ保存:', cacheKey)
  } catch (error) {
    console.error('キャッシュ保存エラー:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EbaySearchParams = await request.json()
    
    const {
      keywords,
      categoryId,
      condition,
      minPrice,
      maxPrice,
      minSold,
      listingType, // 追加
      entriesPerPage = 100,
      sortOrder = 'BestMatch'
    } = body

    console.log('🔍 eBay検索リクエスト:', { keywords, categoryId, condition, entriesPerPage })

    if (!keywords) {
      return NextResponse.json(
        { success: false, error: 'キーワードは必須です' },
        { status: 400 }
      )
    }

    // キャッシュチェック
    const cacheKey = getCacheKey(body)
    const cachedData = await getFromCache(cacheKey)
    
    if (cachedData) {
      console.log('🚀 キャッシュから返却（API呼び出しなし）')
      
      // API呼び出し状況も返す
      const apiStatus = await getApiCallStatus(API_NAME)
      
      return NextResponse.json({
        ...cachedData,
        cached: true,
        apiStatus
      })
    }

    // API呼び出し可能か詳細チェック（レート制限考慮）
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

    // 環境変数チェック
    const appId = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID_MJT
    
    if (!appId) {
      console.error('❌ EBAY_APP_ID が設定されていません')
      return NextResponse.json(
        { 
          success: false, 
          error: '環境変数 EBAY_APP_ID が設定されていません',
          apiStatus
        },
        { status: 500 }
      )
    }

    console.log('✅ EBAY_APP_ID:', appId.substring(0, 10) + '...')
    console.log(`📊 API呼び出し状況: ${apiStatus.callCount}/${apiStatus.dailyLimit} (残り${apiStatus.remaining}回) | 1時間: ${apiStatus.hourlyCount || 0}/500回`)

    // API呼び出し前の待機処理（レート制限対策）
    await waitBeforeApiCall()
    console.log('✅ API呼び出し間隔OK')

    // eBay Finding API用のパラメータ構築
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': keywords,
      'paginationInput.entriesPerPage': Math.min(entriesPerPage, 100).toString(),
      'paginationInput.pageNumber': '1',
      'sortOrder': sortOrder,
    })

    // カテゴリフィルター
    if (categoryId) {
      params.append('categoryId', categoryId)
    }

    // コンディションフィルター
    let filterIndex = 0
    if (condition && condition !== '') {
      let conditionId = ''
      switch (condition) {
        case 'New':
          conditionId = '1000'
          break
        case 'Used':
          conditionId = '3000'
          break
        case 'Refurbished':
          conditionId = '2000'
          break
        case 'For parts or not working':
          conditionId = '7000'
          break
      }
      if (conditionId) {
        params.append(`itemFilter(${filterIndex}).name`, 'Condition')
        params.append(`itemFilter(${filterIndex}).value`, conditionId)
        filterIndex++
      }
    }

    // 価格範囲フィルター
    if (minPrice) {
      params.append(`itemFilter(${filterIndex}).name`, 'MinPrice')
      params.append(`itemFilter(${filterIndex}).value`, minPrice)
      filterIndex++
    }

    if (maxPrice) {
      params.append(`itemFilter(${filterIndex}).name`, 'MaxPrice')
      params.append(`itemFilter(${filterIndex}).value`, maxPrice)
      filterIndex++
    }

    // 販売済み商品のみ
    params.append(`itemFilter(${filterIndex}).name`, 'SoldItemsOnly')
    params.append(`itemFilter(${filterIndex}).value`, 'true')
    filterIndex++

    // 売上数フィルター（ユーザーが選択）
    if (minSold && parseInt(minSold) > 0) {
      params.append(`itemFilter(${filterIndex}).name`, 'MinQuantitySold')
      params.append(`itemFilter(${filterIndex}).value`, minSold)
      filterIndex++
      console.log(`📊 売上数フィルター: ${minSold}以上`)
    }

    // リスティングタイプフィルター
    if (listingType && listingType !== '') {
      params.append(`itemFilter(${filterIndex}).name`, 'ListingType')
      params.append(`itemFilter(${filterIndex}).value`, listingType)
      filterIndex++
      console.log(`💰 リスティングタイプ: ${listingType}`)
    }

    const apiUrl = `${EBAY_FINDING_API}?${params.toString()}`
    console.log('📡 eBay API呼び出し（販売済み商品）')

    // API呼び出しカウントを増加（実際に呼び出す前に記録）
    await incrementApiCallCount(API_NAME)

    // レート制限対策：リトライロジック
    let retries = 3
    let response: Response | null = null
    
    while (retries > 0) {
      try {
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) break

        const errorText = await response.text()
        
        // レート制限エラーの場合
        if (errorText.includes('10001') || errorText.includes('RateLimiter')) {
          console.warn(`⚠️ レート制限エラー（残り${retries}回）- 10秒待機...`)
          await new Promise(resolve => setTimeout(resolve, 10000))
          retries--
          continue
        }

        // その他のエラー
        console.error('❌ eBay API Error:', errorText)
        throw new Error(`eBay API Error: ${response.status}`)
        
      } catch (error) {
        if (retries === 1) throw error
        console.warn(`⚠️ リトライ（残り${retries}回）`)
        retries--
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    if (!response || !response.ok) {
      throw new Error('eBay API呼び出し失敗（リトライ回数超過）')
    }

    const data = await response.json()
    console.log('📥 eBay APIレスポンス受信')

    // レスポンスの解析
    const findItemsResponse = data.findCompletedItemsResponse?.[0]
    
    if (!findItemsResponse) {
      return NextResponse.json(
        { success: false, error: 'eBay APIレスポンスの形式が不正です', apiStatus },
        { status: 500 }
      )
    }

    const ack = findItemsResponse.ack?.[0]
    
    if (ack !== 'Success') {
      const errorMessage = findItemsResponse.errorMessage?.[0]?.error?.[0]?.message?.[0] || 'Unknown error'
      const errorId = findItemsResponse.errorMessage?.[0]?.error?.[0]?.errorId?.[0] || ''
      
      // レート制限エラー
      if (errorId === '10001') {
        console.error('❌ レート制限エラー: findCompletedItemsの1日の上限に達しました')
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
      
      return NextResponse.json(
        { success: false, error: `eBay API Error: ${errorMessage}`, apiStatus },
        { status: 500 }
      )
    }

    const searchResult = findItemsResponse.searchResult?.[0]
    const items = searchResult?.item || []
    const totalEntries = parseInt(searchResult?.['@count'] || '0')

    console.log(`✅ 取得成功: ${items.length}件 / 総数: ${totalEntries}件`)

    // データを整形
    const formattedItems = items.map((item: any) => {
      const itemId = item.itemId?.[0] || ''
      const title = item.title?.[0] || ''
      const categoryName = item.primaryCategory?.[0]?.categoryName?.[0] || ''
      const categoryId = item.primaryCategory?.[0]?.categoryId?.[0] || ''
      
      // 画像URL
      const galleryURL = item.galleryURL?.[0] || ''
      const pictureURLLarge = item.pictureURLLarge?.[0] || ''
      const pictureURLSuperSize = item.pictureURLSuperSize?.[0] || ''
      const imageUrl = pictureURLSuperSize || pictureURLLarge || galleryURL || ''

      // 価格情報
      const sellingStatus = item.sellingStatus?.[0]
      const currentPrice = parseFloat(sellingStatus?.currentPrice?.[0]?.__value__ || '0')
      const currency = sellingStatus?.currentPrice?.[0]?.['@currencyId'] || 'USD'
      const quantitySold = parseInt(sellingStatus?.quantitySold?.[0] || '0')

      // コンディション
      const conditionObj = item.condition?.[0]
      const conditionId = conditionObj?.conditionId?.[0] || ''
      const conditionDisplayName = conditionObj?.conditionDisplayName?.[0] || '不明'

      // セラー情報
      const sellerInfo = item.sellerInfo?.[0]
      const sellerUserName = sellerInfo?.sellerUserName?.[0] || ''
      const feedbackScore = parseInt(sellerInfo?.feedbackScore?.[0] || '0')
      const positiveFeedbackPercent = parseFloat(sellerInfo?.positiveFeedbackPercent?.[0] || '0')

      // 商品の国
      const country = item.country?.[0] || 'US'
      const location = item.location?.[0] || ''

      // リスティング情報
      const listingType = item.listingInfo?.[0]?.listingType?.[0] || ''
      const startTime = item.listingInfo?.[0]?.startTime?.[0] || ''
      const endTime = item.listingInfo?.[0]?.endTime?.[0] || ''

      // 配送情報
      const shippingInfo = item.shippingInfo?.[0]
      const shippingType = shippingInfo?.shippingType?.[0] || ''
      const shipToLocations = shippingInfo?.shipToLocations?.[0] || ''
      const shippingServiceCost = parseFloat(shippingInfo?.shippingServiceCost?.[0]?.__value__ || '0')

      return {
        itemId,
        title,
        category: {
          name: categoryName,
          id: categoryId
        },
        image: imageUrl,
        price: {
          value: currentPrice,
          currency: currency
        },
        soldCount: quantitySold,
        condition: {
          id: conditionId,
          name: conditionDisplayName
        },
        seller: {
          username: sellerUserName,
          feedbackScore: feedbackScore,
          positiveFeedbackPercent: positiveFeedbackPercent
        },
        location: {
          country: country,
          city: location
        },
        listing: {
          type: listingType,
          startTime: startTime,
          endTime: endTime
        },
        shipping: {
          type: shippingType,
          cost: shippingServiceCost,
          shipTo: shipToLocations
        },
        viewItemURL: item.viewItemURL?.[0] || ''
      }
    })

    // 🆕 各商品に最安値情報を追加
    console.log('💰 最安値分析を開始...')
    
    const enrichedItems = await Promise.all(formattedItems.map(async (item) => {
      // 同一カテゴリ・同一コンディションの競合商品を抽出
      const competitors = formattedItems
        .filter(comp => 
          comp.category.id === item.category.id &&
          comp.condition.id === item.condition.id &&
          comp.price.value > 0
        )
        .map(comp => ({
          price: comp.price.value,
          soldCount: comp.soldCount,
          seller: comp.seller.username,
          condition: comp.condition.name
        })) as CompetitorData[]

      if (competitors.length === 0) {
        return item
      }

      // 最安値を分析
      const lowestPriceAnalysis = analyzeLowestPrice(competitors)

      // 重量を推定（実際には商品詳細から取得する必要があります）
      // ここではデフォルト値を使用
      const estimatedWeightG = 500 // 500g

      return {
        ...item,
        lowestPrice: lowestPriceAnalysis.lowestPrice,
        averagePrice: lowestPriceAnalysis.averagePrice,
        competitorCount: lowestPriceAnalysis.competitorCount,
        estimatedWeightG
      }
    }))

    console.log('✅ 最安値分析完了')

    // 💾 DB保存: リサーチ結果を保存
    console.log('💾 リサーチ結果をDBに保存...')
    const researchResults: ResearchResult[] = enrichedItems.map(item => ({
      search_keyword: keywords,
      ebay_item_id: item.itemId,
      title: item.title,
      price_usd: item.price.value,
      sold_count: item.soldCount,
      category_id: item.category.id,
      category_name: item.category.name,
      condition: item.condition.name,
      seller_username: item.seller.username,
      image_url: item.image,
      view_item_url: item.viewItemURL,
      lowest_price_usd: item.lowestPrice,
      average_price_usd: item.averagePrice,
      competitor_count: item.competitorCount,
      estimated_weight_g: item.estimatedWeightG,
      listing_type: item.listing.type,
      location_country: item.location.country,
      location_city: item.location.city,
      shipping_cost_usd: item.shipping.cost
    }))

    await saveResearchResults(researchResults)
    console.log('✅ DB保存完了')

    // 更新されたAPI状況を取得
    const updatedApiStatus = await getApiCallStatus(API_NAME)

    const result = {
      success: true,
      total: totalEntries,
      count: enrichedItems.length,
      items: enrichedItems,
      cached: false,
      apiStatus: updatedApiStatus
    }

    // キャッシュに保存（次回は即座に返却）
    await saveToCache(cacheKey, result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ eBay API Error:', error)
    
    // エラー時もAPI状況を返す
    const apiStatus = await getApiCallStatus(API_NAME)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        apiStatus
      },
      { status: 500 }
    )
  }
}
