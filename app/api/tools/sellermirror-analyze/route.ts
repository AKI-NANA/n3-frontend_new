// app/api/tools/sellermirror-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '商品IDが必要です' },
        { status: 400 }
      )
    }

    console.log(`🔍 SellerMirror分析開始: ${productIds.length}件`)
    console.log('productIds:', productIds)

    // 商品データを取得
    const { data: products, error: fetchError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .in('id', productIds)

    // DBクエリエラーの処理
    if (fetchError) {
      console.error('❌ 商品取得エラー:', fetchError)
      console.error('詳細:', JSON.stringify(fetchError, null, 2))
      return NextResponse.json(
        { 
          success: false, 
          error: `商品データの取得に失敗しました: ${fetchError.message}` 
        },
        { status: 500 }
      )
    }

    // デバッグログの追加
    console.log(`📋 Supabase取得結果: ${products ? products.length : 0}件のレコードを取得しました`)
    if (products && products.length > 0) {
      console.log('📋 取得した最初のレコードID:', products[0].id)
      console.log('📋 取得した全ID:', products.map(p => p.id))
    }

    // データが見つからなかった場合の処理
    if (!products || products.length === 0) {
      console.warn(`⚠️ 警告: データベースで指定されたIDの商品が見つかりませんでした`)
      console.warn(`⚠️ 検索したID: [${productIds.join(', ')}]`)
      
      // DBに実際にどんなIDがあるか確認
      const { data: allIds } = await supabase
        .from('yahoo_scraped_products')
        .select('id')
        .limit(10)
      
      console.warn(`⚠️ DBに存在するIDのサンプル (最初の10件):`, allIds?.map(p => p.id))
      
      return NextResponse.json(
        { success: false, error: '商品が見つかりませんでした' },
        { status: 404 }
      )
    }

    console.log('✅ 商品データ取得成功。SellerMirror分析へ進みます。')

    let successCount = 0
    const results = []

    for (const product of products) {
      try {
        // 英語タイトルを優先使用
        const ebayApiData = product.ebay_api_data || {}
        const ebayTitle = product.english_title || ebayApiData.title || ebayApiData.english_title || ''
        const ebayCategoryId = ebayApiData.category_id || ''
        const actualCostJPY = product.actual_cost_jpy || product.current_price || product.acquired_price_jpy

        if (!ebayTitle) {
          console.warn(`⚠️ 商品 ${product.id}: 英語タイトルが設定されていません`)
          console.warn(`  title (日本語): ${product.title}`)
          console.warn(`  english_title: ${product.english_title}`)
          console.warn(`  ebay_api_data:`, ebayApiData)
          results.push({
            id: product.id,
            success: false,
            error: '英語タイトルが設定されていません'
          })
          continue
        }

        console.log(`📊 商品 ${product.id}: "${ebayTitle}" で分析`)

        // SellerMirror API呼び出し
        const smResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'}/api/sellermirror/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            ebayTitle,
            ebayCategoryId,
            yahooPrice: product.current_price || 0,
            weightG: product.weight_g || 500,
            actualCostJPY: actualCostJPY || 0
          })
        })

        if (!smResponse.ok) {
          console.error(`❌ 商品 ${product.id}: SellerMirror APIエラー`)
          continue
        }

        const smResult = await smResponse.json()

        if (!smResult.success) {
          console.warn(`⚠️ 商品 ${product.id}: ${smResult.error}`)
          continue
        }

        // SM結果をDBに保存
        const sellMirrorData = {
          lowest_price: smResult.lowestPrice,
          average_price: smResult.averagePrice,
          competitor_count: smResult.competitorCount,
          top_competitors: smResult.topCompetitors,
          profit_analysis: smResult.profitAnalysis,
          analyzed_at: new Date().toISOString()
        }

        // ebay_api_dataを更新
        const updatedApiData = {
          ...ebayApiData,
          sell_mirror: sellMirrorData
        }

        const { error: updateError } = await supabase
          .from('yahoo_scraped_products')
          .update({
            ebay_api_data: updatedApiData,
            sm_lowest_price: smResult.lowestPrice,
            sm_average_price: smResult.averagePrice,
            sm_competitor_count: smResult.competitorCount,
            sm_profit_margin: smResult.profitAnalysis?.profitMargin || null,
            sm_profit_amount_usd: smResult.profitAnalysis?.profitAmount || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) {
          console.error(`❌ 商品 ${product.id}: DB更新エラー:`, updateError)
          continue
        }

        console.log(`✅ 商品 ${product.id}: SM分析完了 - 最安値 $${smResult.lowestPrice}`)
        successCount++
        results.push({
          id: product.id,
          success: true,
          lowestPrice: smResult.lowestPrice
        })

      } catch (error: any) {
        console.error(`❌ 商品 ${product.id}: エラー:`, error)
        results.push({
          id: product.id,
          success: false,
          error: error.message
        })
      }
    }

    console.log(`✅ SellerMirror分析完了: ${successCount}/${products.length}件`)

    return NextResponse.json({
      success: true,
      updated: successCount,
      total: products.length,
      results
    })

  } catch (error: any) {
    console.error('❌ SellerMirror分析エラー:', error)
    return NextResponse.json(
      { error: error.message || 'SellerMirror分析に失敗しました' },
      { status: 500 }
    )
  }
}
