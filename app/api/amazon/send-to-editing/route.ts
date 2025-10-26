import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    // Amazon商品データを取得
    const { data: amazonProduct, error: fetchError } = await supabase
      .from('amazon_products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !amazonProduct) {
      return NextResponse.json({ error: 'Amazon product not found' }, { status: 404 })
    }

    console.log('📦 Amazon商品取得:', amazonProduct.title)

    // eBay検索API呼び出し（既存APIを活用、キャッシュも活用）
    let ebayData = null
    let sellerMirrorData = null

    try {
      console.log('🔍 eBay競合検索開始...')
      const ebaySearchResponse = await fetch(`${request.nextUrl.origin}/api/ebay/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          keywords: amazonProduct.title,
          entriesPerPage: 20,
          minSold: '1'
        })
      })

      if (ebaySearchResponse.ok) {
        ebayData = await ebaySearchResponse.json()
        console.log('✅ eBay検索完了:', ebayData.cached ? 'キャッシュヒット' : 'API呼び出し')
      }
    } catch (error) {
      console.warn('⚠️ eBay検索スキップ:', error)
    }

    // SellerMirror分析（英語タイトルがある場合）
    if (amazonProduct.title) {
      try {
        console.log('🔍 SellerMirror分析開始...')
        const sellerMirrorResponse = await fetch(`${request.nextUrl.origin}/api/sellermirror/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            productId: amazonProduct.id,
            ebayTitle: amazonProduct.title,
            weightG: 500, // デフォルト値
            actualCostJPY: amazonProduct.current_price ? amazonProduct.current_price * 150 : 0 // USD→JPY概算
          })
        })

        if (sellerMirrorResponse.ok) {
          sellerMirrorData = await sellerMirrorResponse.json()
          console.log('✅ SellerMirror分析完了:', sellerMirrorData.fromCache ? 'キャッシュヒット' : 'API呼び出し')
        }
      } catch (error) {
        console.warn('⚠️ SellerMirror分析スキップ:', error)
      }
    }

    // yahoo_scraped_productsテーブルに保存
    const productData = {
      source_item_id: amazonProduct.asin,
      sku: `AMZN-${amazonProduct.asin}`,
      master_key: amazonProduct.asin,
      title: amazonProduct.title,
      english_title: amazonProduct.title,
      price_jpy: amazonProduct.current_price ? Math.round(amazonProduct.current_price * 150) : null,
      price_usd: amazonProduct.current_price,
      current_stock: amazonProduct.availability_status === 'In Stock' ? 999 : 0,
      status: 'ready_to_list',

      // SellerMirror分析結果
      sm_lowest_price: sellerMirrorData?.lowestPrice || null,
      sm_average_price: sellerMirrorData?.averagePrice || null,
      sm_competitor_count: sellerMirrorData?.competitorCount || null,
      sm_profit_margin: sellerMirrorData?.profitAnalysis?.profitMargin || null,
      sm_profit_amount_usd: sellerMirrorData?.profitAnalysis?.profitAmount || null,

      // 利益計算結果（Amazon PA-APIベース）
      profit_margin: amazonProduct.roi_percentage,
      profit_amount_usd: amazonProduct.profit_amount,

      // JSONBデータ
      scraped_data: {
        source: 'amazon',
        asin: amazonProduct.asin,
        brand: amazonProduct.brand,
        manufacturer: amazonProduct.manufacturer,
        product_group: amazonProduct.product_group,
        binding: amazonProduct.binding,
        features: amazonProduct.features,
        images_primary: amazonProduct.images_primary,
        images_variants: amazonProduct.images_variants,
        is_prime_eligible: amazonProduct.is_prime_eligible,
        star_rating: amazonProduct.star_rating,
        review_count: amazonProduct.review_count,
        amazon_url: `https://www.amazon.com/dp/${amazonProduct.asin}`
      },

      ebay_api_data: ebayData ? {
        total: ebayData.total,
        count: ebayData.count,
        items: ebayData.items?.slice(0, 10) || [], // 上位10件のみ保存
        lowest_price: ebayData.items?.[0]?.lowestPrice || null,
        average_price: ebayData.items?.[0]?.averagePrice || null,
        competitor_count: ebayData.items?.[0]?.competitorCount || null
      } : null,

      listing_data: {
        prepared: false,
        ebay_category_id: null,
        ebay_category_name: null,
        item_specifics: amazonProduct.item_specifics || {}
      }
    }

    console.log('💾 yahoo_scraped_productsに保存...')

    const { data: savedProduct, error: saveError } = await supabase
      .from('yahoo_scraped_products')
      .insert(productData)
      .select()
      .single()

    if (saveError) {
      console.error('❌ 保存エラー:', saveError)
      throw saveError
    }

    console.log('✅ データ編集ページに送信完了:', savedProduct.id)

    return NextResponse.json({
      success: true,
      product: savedProduct,
      ebayAnalyzed: !!ebayData,
      sellerMirrorAnalyzed: !!sellerMirrorData,
      message: 'データ編集ページに送信しました'
    })

  } catch (error: any) {
    console.error('❌ Send to editing error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send to editing' },
      { status: 500 }
    )
  }
}
