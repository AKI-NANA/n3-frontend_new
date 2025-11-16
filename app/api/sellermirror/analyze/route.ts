// app/api/sellermirror/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * SellerMirror分析API - 出品用データ取得 + 販売実績取得
 * eBay Browse APIから出品に必要な情報を取得
 * eBay Finding APIから過去の販売数を取得
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, ebayTitle, ebayCategoryId } = body

    console.log('🏷️ SellerMirror分析（出品用データ取得）開始')
    console.log('  productId:', productId)
    console.log('  ebayTitle:', ebayTitle)

    if (!ebayTitle) {
      return NextResponse.json(
        { success: false, error: 'eBayタイトルが必要です' },
        { status: 400 }
      )
    }

    // eBay Browse APIで現在出品中の商品を検索
    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'eBay認証情報が設定されていません' },
        { status: 500 }
      )
    }

    // Application Token取得
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

    // Browse APIで検索（最大10件取得して出品用データを収集）
    const searchUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(ebayTitle)}&limit=10`
    
    const browseResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    })

    if (!browseResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Browse API呼び出し失敗' },
        { status: 500 }
      )
    }

    const browseData = await browseResponse.json()
    const items = browseData.itemSummaries || []

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: '類似商品が見つかりませんでした' },
        { status: 404 }
      )
    }

    // ===== Browse API: 過去の販売数を取得（SOLD商品を検索） =====
    console.log('  📊 Browse APIで販売実績（SOLD商品）を取得中...')
    let soldCount = 0

    try {
      // SOLD（売り切れ）商品を検索
      const soldSearchUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(ebayTitle)}&limit=100&filter=buyingOptions:{SOLD}`
      
      console.log('  🔍 SOLD検索 URL:', soldSearchUrl.substring(0, 150) + '...')
      
      const soldResponse = await fetch(soldSearchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      })

      if (soldResponse.ok) {
        const soldData = await soldResponse.json()
        soldCount = soldData.total || 0
        
        console.log('  📊 SOLD商品検索結果:', {
          total: soldCount,
          itemsReturned: soldData.itemSummaries?.length || 0
        })
        
        console.log(`  ✅ 販売実績: ${soldCount}件`)
      } else {
        console.warn('  ⚠️ SOLD検索失敗:', soldResponse.status, await soldResponse.text())
      }
    } catch (error) {
      console.warn('  ⚠️ SOLD検索エラー（販売数は0として続行）:', error)
    }

    console.log(`  ✅ ${items.length}件の出品情報を取得`)
    console.log('  最初のアイテム:', {
      title: items[0]?.title,
      categoryId: items[0]?.categoryId,
      categories: items[0]?.categories
    })

    // 出品用データを収集（基本情報のみ、全10件）
    const listingData = {
      referenceItems: items.map((item: any) => ({
        title: item.title,
        price: item.price?.value,
        currency: item.price?.currency,
        condition: item.condition,
        categoryId: item.categories?.[0]?.categoryId,
        categoryPath: item.categories?.[0]?.categoryName,
        itemId: item.itemId,
        image: item.image?.imageUrl,
        seller: item.seller?.username,
        sellerFeedbackScore: item.seller?.feedbackScore,
        sellerFeedbackPercentage: item.seller?.feedbackPercentage,
        shippingCost: item.shippingOptions?.[0]?.shippingCost?.value || 0,
        shippingType: item.shippingOptions?.[0]?.shippingCostType,
        itemWebUrl: item.itemWebUrl,
        // 販売実績（あれば）
        soldQuantity: item.unitsSold || 0,
        // 詳細情報はまだ取得していない
        hasDetails: false
      })),
      suggestedCategory: items[0].categories?.[0]?.categoryId || ebayCategoryId,
      suggestedCategoryPath: items[0].categories?.[0]?.categoryName || '',
      soldCount: soldCount,  // Finding APIの販売実績
      totalAvailableQuantity: items.length,  // ✅ 現在市場にある競合商品数
      analyzedAt: new Date().toISOString()
    }

    // DBに保存
    if (productId) {
      const { data: product } = await supabase
        .from('products_master')
        .select('ebay_api_data')
        .eq('id', productId)
        .single()

      const existingData = product?.ebay_api_data || {}
      const existingListingRef = existingData.listing_reference || {}
      const existingItems = existingListingRef.referenceItems || []

      // ✅ 既存の詳細データを保護
      // hasDetails: true のアイテムは保持、新しいアイテムを追加
      const detailedItems = existingItems.filter((item: any) => item.hasDetails)
      const detailedItemIds = new Set(detailedItems.map((item: any) => item.itemId))
      
      // 新しいアイテム（詳細情報がないもの）を追加
      const newItems = listingData.referenceItems.filter(
        (item: any) => !detailedItemIds.has(item.itemId)
      )
      
      // 詳細データ + 新規データを結合
      const mergedItems = [...detailedItems, ...newItems]
      
      console.log(`  💾 データ保護状況:`)  
      console.log(`    - 保護した詳細アイテム: ${detailedItems.length}件`)
      console.log(`    - 新規追加アイテム: ${newItems.length}件`)
      console.log(`    - 合計: ${mergedItems.length}件`)

      const { error: updateError } = await supabase
        .from('products_master')
        .update({
          ebay_api_data: {
            ...existingData,
            listing_reference: {
              ...listingData,
              referenceItems: mergedItems  // ✅ マージしたアイテムを使用
            },
            category_id: listingData.suggestedCategory,
            category_name: listingData.suggestedCategoryPath
          },
          ebay_category_id: listingData.suggestedCategory,
          sm_sales_count: soldCount,  // 既存カラム（保持）
          sm_total_sold_quantity: soldCount,  // ✅ 新カラム（競合の総販売数）
          sm_analyzed_at: new Date().toISOString(),  // ✅ 分析日時も更新
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)

      if (updateError) {
        console.error('❌ DB更新エラー:', updateError)
      } else {
        console.log('✅ 出品用データをDBに保存')
        console.log('  カテゴリID:', listingData.suggestedCategory)
        console.log('  カテゴリパス:', listingData.suggestedCategoryPath)
        console.log('  販売数:', soldCount)
      }
    }

    return NextResponse.json({
      success: true,
      productId,
      listingData,
      soldCount,  // 販売数を返す
      message: `${items.length}件の出品情報、販売実績${soldCount}件を取得しました`
    })

  } catch (error: any) {
    console.error('❌ SellerMirror分析エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'SellerMirror分析に失敗しました' },
      { status: 500 }
    )
  }
}
