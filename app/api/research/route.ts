// app/api/research/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  generateSellerMirrorOptimizedQueries,
  filterByItemSpecifics,
  calculateTitleSimilarity,
  type ItemSpecifics
} from '@/lib/search-optimizer'

/**
 * 🚀 汎用リサーチAPI - 1000件対応バッチ処理版
 * 
 * 特徴:
 * - あらゆる商品カテゴリに対応（トレカ、電子機器、書籍等）
 * - SellerMirror Item Specificsを活用した高精度検索
 * - 段階的検索戦略で最適な結果を取得
 * - 並列処理で高速化
 * - レート制限対応
 */

/**
 * バッチ処理設定
 */
const BATCH_CONFIG = {
  CONCURRENT_REQUESTS: 5,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT_PER_PRODUCT: 30000
}

/**
 * スリープ関数
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * リトライ付きFetch
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = BATCH_CONFIG.MAX_RETRIES
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
        console.warn(`⏳ レート制限: ${retryAfter}秒待機`)
        await sleep(retryAfter * 1000)
        continue
      }
      
      if (!response.ok && i < retries - 1) {
        console.warn(`⚠️ リトライ ${i + 1}/${retries}`)
        await sleep(BATCH_CONFIG.RETRY_DELAY * (i + 1))
        continue
      }
      
      return response
      
    } catch (error) {
      if (i === retries - 1) throw error
      console.warn(`⚠️ エラー発生、リトライ ${i + 1}/${retries}`)
      await sleep(BATCH_CONFIG.RETRY_DELAY * (i + 1))
    }
  }
  
  throw new Error('Max retries exceeded')
}

/**
 * 単一商品のリサーチ処理
 */
async function researchSingleProduct(
  product: any,
  accessToken: string,
  appId: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // ===== 検索用タイトルを決定 =====
    const ebayTitle = product.english_title || product.ebay_api_data?.title || ''
    const ebayCategoryId = product.ebay_api_data?.category_id || ''
    
    // 常に english_title を使用（sm_title は日本語版の可能性があるため）
    const searchTitle = ebayTitle
    
    if (!searchTitle) {
      return { success: false, error: '検索タイトル未設定' }
    }
    
    console.log(`
📊 商品 ${product.id}`)
    console.log(`  📝 検索タイトル: "${searchTitle}"`)

    // ===== SellerMirror Item Specificsを取得 =====
    // 🔥 重要: 英語版のItem Specificsを優先する（日本版は違う番号体系）
    let itemSpecifics: ItemSpecifics | undefined
    
    // 1. まず英語版のリファレンスアイテムを確認
    const browseResult = product.ebay_api_data?.browse_result
    if (browseResult?.referenceItems?.[0]?.itemSpecifics) {
      itemSpecifics = browseResult.referenceItems[0].itemSpecifics
      console.log(`  🌎 英語版Item Specifics使用: Card Name="${itemSpecifics['Card Name']}", Card Number="${itemSpecifics['Card Number']}"`)
    }
    // 2. 英語版がなければSellerMirror版を使用（日本版の可能性）
    else if (product.ebay_api_data?.listing_reference?.referenceItems?.[0]?.itemSpecifics) {
      itemSpecifics = product.ebay_api_data.listing_reference.referenceItems[0].itemSpecifics
      console.log(`  🇯🇵 SellerMirror Item Specifics使用: Card Name="${itemSpecifics['Card Name']}", Card Number="${itemSpecifics['Card Number']}"`)
    }

    // ===== 1. 検索戦略を生成 =====
    const searchStrategies = generateSellerMirrorOptimizedQueries(searchTitle, itemSpecifics)
    console.log(`  📊 生成された検索戦略: ${searchStrategies.length}件`)

    // ===== 2. Finding API（販売実績） =====
    console.log('  1. 販売実績を取得中...')
    
    const findingStrategy = searchStrategies.find(s => s.level === 2) || searchStrategies[0]
    const findingKeywords = findingStrategy.query
    
    console.log(`  🎯 Finding API戦略: レベル${findingStrategy.level} (${findingStrategy.description})`)
    console.log(`  🔍 クエリ: "${findingKeywords}"`)

    const findingParams = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': findingKeywords,
      'paginationInput.entriesPerPage': '100',
      'paginationInput.pageNumber': '1',
      'sortOrder': 'PricePlusShippingLowest',
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'itemFilter(1).name': 'ListingType',
      'itemFilter(1).value': 'FixedPrice'
    })

    if (ebayCategoryId) {
      findingParams.set('categoryId', ebayCategoryId)
      console.log(`  📋 カテゴリーID: ${ebayCategoryId}`)
    }

    const findingUrl = `https://svcs.ebay.com/services/search/FindingService/v1?${findingParams.toString()}`
    const findingResponse = await fetchWithRetry(findingUrl, {})
    const findingData = await findingResponse.json()

    const findItemsResponse = findingData.findCompletedItemsResponse?.[0]
    const soldCount = parseInt(findItemsResponse?.searchResult?.[0]?.['@count'] || '0')

    console.log(`  ✅ 販売実績: ${soldCount}件`)

    // ===== 3. Browse API（現在出品中） =====
    console.log('  2. 出品中の最安値を取得中...')

    const browseStrategy = searchStrategies.find(s => s.level === 2) || 
                          searchStrategies.find(s => s.level === 3) || 
                          searchStrategies[0]
    const searchQuery = browseStrategy.query
    
    console.log(`  🎯 Browse API戦略: レベル${browseStrategy.level} (${browseStrategy.description})`)
    console.log(`  🔍 クエリ: "${searchQuery}"`)

    let browseUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `limit=100&` +
      `filter=buyingOptions:{FIXED_PRICE},price:[5..]`

    if (ebayCategoryId) {
      browseUrl += `&category_ids=${ebayCategoryId}`
    }

    console.log(`  🔍 Buy It Nowのみを検索 (オークションを除外, $5以上)`)

    const browseResponse = await fetchWithRetry(browseUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    })

    if (!browseResponse.ok) {
      throw new Error(`Browse API error: ${browseResponse.status}`)
    }

    const browseData = await browseResponse.json()
    const currentItems = browseData.itemSummaries || []
    console.log(`  ✅ 出品中の商品: ${currentItems.length}件`)

    // ===== 4. コンディション判定 =====
    let targetCondition = 'USED'
    let conditionSource = 'default'
    let isUngradedCard = false

    // 🔥 ポケモンカードやトレーディングカードは自動的にUngraded扱い
    const isPokemonCard = searchTitle.toLowerCase().includes('pokemon') || 
                          searchTitle.includes('ポケモン')
    const isTradingCard = ebayCategoryId === '183454' || // Pokemon TCG
                          ebayCategoryId === '183445' || // Yu-Gi-Oh!
                          ebayCategoryId === '183444'    // Magic: The Gathering
    
    if (isPokemonCard || isTradingCard) {
      isUngradedCard = true
      targetCondition = 'USED' // 形式的にUSEDだが、フィルターで緩和
      conditionSource = 'auto-detected (Trading Card)'
      console.log(`  🎴 トレーディングカード検出: Ungradedモード有効`)
    }
    else if (product.listing_data?.condition) {
      const listingCond = String(product.listing_data.condition).toUpperCase()
      if (listingCond.includes('NEW') || listingCond.includes('新品') || listingCond.includes('未使用')) {
        targetCondition = 'NEW'
        conditionSource = 'listing_data.condition'
      } else if (listingCond.includes('UNGRADED')) {
        targetCondition = 'USED'
        isUngradedCard = true
        conditionSource = 'listing_data.condition (Ungraded)'
      } else {
        targetCondition = 'USED'
        conditionSource = 'listing_data.condition'
      }
    } else if (product.scraped_data?.condition) {
      const scrapedCond = String(product.scraped_data.condition)
      if (scrapedCond.includes('新品') || scrapedCond.includes('未使用')) {
        targetCondition = 'NEW'
        conditionSource = 'scraped_data.condition'
      } else {
        targetCondition = 'USED'
        conditionSource = 'scraped_data.condition'
      }
    }

    console.log(`  🏷️ コンディション: ${targetCondition} (${conditionSource})${isUngradedCard ? ' [緩和モード]' : ''}`)

    // 同じコンディションの商品のみをフィルター（Ungradedカードの場合は緩和）
    let filteredItems = currentItems.filter((item: any) => {
      const itemCondition = item.condition?.toUpperCase() || ''
      
      // Ungradedトレーディングカードの場合、NEW/USEDどちらも含める
      if (isUngradedCard) {
        return itemCondition.includes('NEW') || 
               itemCondition.includes('USED') || 
               itemCondition.includes('UNGRADED') ||
               itemCondition.includes('PRE-OWNED') ||
               itemCondition.includes('LIKE NEW')
      }
      
      // 通常の商品は厳密にマッチング
      return itemCondition.includes(targetCondition)
    })
    console.log(`  📦 コンディションフィルター後: ${filteredItems.length}件 (${isUngradedCard ? 'Ungraded - 緩和モード' : targetCondition})`)

    // ===== 5. Item Specificsでフィルタリング =====
    if (itemSpecifics) {
      filteredItems = filterByItemSpecifics(filteredItems, itemSpecifics)
      console.log(`  🔢 Item Specificsフィルター後: ${filteredItems.length}件`)
    }

    // ===== 6. タイトル類似度でフィルタリング =====
    const minSimilarity = itemSpecifics ? 0.7 : 0.5
    filteredItems = filteredItems.filter((item: any) => {
      const similarity = calculateTitleSimilarity(searchTitle, item.title || '')
      return similarity >= minSimilarity
    })
    console.log(`  🎯 類似度フィルター後: ${filteredItems.length}件`)

    if (filteredItems.length === 0) {
      return { success: false, error: '関連性の高い競合商品が見つかりません' }
    }

    // ===== 7. 最安値計算 =====
    let lowestPriceWithShipping = Infinity
    let lowestPriceItem: any = null

    for (const item of filteredItems) {
      const price = parseFloat(item.price?.value || '0')
      const shippingCost = parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || '0')
      const totalPrice = price + shippingCost

      if (totalPrice < lowestPriceWithShipping && totalPrice > 0) {
        lowestPriceWithShipping = totalPrice
        lowestPriceItem = item
      }
    }

    if (lowestPriceWithShipping === Infinity) {
      return { success: false, error: '最安値が見つかりません' }
    }

    console.log(`  💰 最安値: $${lowestPriceWithShipping.toFixed(2)}`)

    // ===== 8. 利益計算 =====
    const actualCostJPY = product.actual_cost_jpy || product.price_jpy || product.scraped_data?.cost_price_jpy || 0
    const shippingCostUSD = product.shipping_cost_usd || product.listing_data?.shipping_cost_usd || 0
    const exchangeRate = 150

    const costUSD = actualCostJPY / exchangeRate
    const totalCostUSD = costUSD + shippingCostUSD

    const ebayFeeRate = 0.13
    const paypalFeeRate = 0.035
    const totalFees = lowestPriceWithShipping * (ebayFeeRate + paypalFeeRate)

    const profitAmountUSD = lowestPriceWithShipping - totalCostUSD - totalFees
    const profitMargin = (profitAmountUSD / lowestPriceWithShipping) * 100

    // ===== 9. データをDBに保存 =====
    const clippedLowestPrice = Math.max(0, Math.min(9999.99, lowestPriceWithShipping))
    const clippedProfitAmount = Math.max(-999.99, Math.min(999.99, profitAmountUSD))
    const clippedProfitMargin = Math.max(-999.99, Math.min(999.99, profitMargin))

    const researchData = {
      soldCount,
      currentCompetitorCount: filteredItems.length,
      lowestPriceItem: lowestPriceItem ? {
        title: lowestPriceItem.title,
        price: lowestPriceItem.price?.value,
        totalPrice: lowestPriceWithShipping,
        condition: lowestPriceItem.condition,
        itemWebUrl: lowestPriceItem.itemWebUrl,
        itemId: lowestPriceItem.itemId
      } : null,
      profitAnalysis: {
        lowestPriceWithShipping,
        costUSD,
        shippingCostUSD,
        profitAmountUSD,
        profitMargin
      },
      searchStrategy: {
        findingLevel: findingStrategy.level,
        browseLevel: browseStrategy.level,
        itemSpecificsUsed: !!itemSpecifics
      },
      analyzedAt: new Date().toISOString()
    }

    const existingData = product.ebay_api_data || {}

    const updateData: any = {
      ebay_api_data: {
        ...existingData,
        research: researchData
      },
      sm_sales_count: product.sm_sales_count || soldCount,
      sm_lowest_price: clippedLowestPrice,
      sm_profit_amount_usd: clippedProfitAmount,
      sm_profit_margin: clippedProfitMargin,
      sm_competitor_count: filteredItems.length,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('products_master')
      .update(updateData)
      .eq('id', product.id)

    if (updateError) {
      throw new Error(`DB更新エラー: ${updateError.message}`)
    }

    console.log(`✅ 商品 ${product.id}: リサーチ完了`)

    return {
      success: true,
      data: {
        lowestPrice: lowestPriceWithShipping,
        competitorCount: filteredItems.length,
        salesCount: soldCount,
        profitMargin: profitMargin
      }
    }

  } catch (error: any) {
    console.error(`❌ 商品 ${product.id}: エラー:`, error.message)
    return { success: false, error: error.message }
  }
}

/**
 * メインAPI エンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '商品IDが必要です' },
        { status: 400 }
      )
    }

    console.log(`🔍 リサーチ開始: ${productIds.length}件`)

    // IDを文字列に統一
    const validIds = productIds
      .filter((id: any) => {
        if (id === null || id === undefined) return false
        if (typeof id === 'number') return !isNaN(id) && id > 0
        if (typeof id === 'string') return id.trim().length > 0
        return false
      })
      .map((id: any) => String(id))

    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '有効な商品IDがありません' },
        { status: 400 }
      )
    }

    console.log(`  有効なID: ${validIds.length}件`)

    // 商品データを取得
    const { data: products, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .in('id', validIds)

    if (fetchError || !products || products.length === 0) {
      return NextResponse.json(
        { success: false, error: '商品が見つかりませんでした' },
        { status: 404 }
      )
    }

    // eBay認証
    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET
    const appId = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID_MJT

    if (!clientId || !clientSecret || !appId) {
      return NextResponse.json(
        { success: false, error: 'eBay認証情報が設定されていません' },
        { status: 500 }
      )
    }

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

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'eBayトークン取得失敗' },
        { status: 500 }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 並列処理
    const results: any[] = []
    const queue = [...products]
    const inProgress = new Set<Promise<void>>()

    while (queue.length > 0 || inProgress.size > 0) {
      while (queue.length > 0 && inProgress.size < BATCH_CONFIG.CONCURRENT_REQUESTS) {
        const product = queue.shift()!
        
        const task = (async () => {
          const result = await researchSingleProduct(product, accessToken, appId)
          results.push({
            id: product.id,
            ...result
          })
        })()
        
        inProgress.add(task)
        task.finally(() => inProgress.delete(task))
        
        await sleep(200)
      }
      
      if (inProgress.size > 0) {
        await Promise.race(inProgress)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.length - successCount

    console.log(`\n✅ リサーチ完了: 成功${successCount}件, 失敗${failedCount}件`)

    return NextResponse.json({
      success: true,
      updated: successCount,
      total: results.length,
      results
    })

  } catch (error: any) {
    console.error('❌ リサーチエラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'リサーチに失敗しました' },
      { status: 500 }
    )
  }
}
