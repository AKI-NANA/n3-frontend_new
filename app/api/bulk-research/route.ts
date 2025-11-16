// app/api/bulk-research/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * 一括リサーチAPI
 * 選択された商品に対して、カテゴリ、送料、リサーチ、SM分析を一括実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, includeFields } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '商品IDが必要です' },
        { status: 400 }
      )
    }

    console.log(`🔍 一括リサーチ開始: ${productIds.length}件`)
    console.log('  productIds:', productIds)
    console.log('  includeFields:', includeFields)

    // IDを文字列に統一
    const validIds = productIds
      .filter((id: any) => {
        if (id === null || id === undefined) return false
        if (typeof id === 'number') return !isNaN(id) && id > 0
        if (typeof id === 'string') return id.trim().length > 0 && id !== 'null' && id !== 'undefined'
        return false
      })
      .map((id: any) => String(id))

    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '有効な商品IDがありません' },
        { status: 400 }
      )
    }

    console.log('  validIds:', validIds)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const results = []

    // ===== ステップ1: カテゴリ分析（全商品一括） =====
    if (includeFields?.category) {
      console.log('\n📂 ステップ1: カテゴリ分析')
      try {
        const categoryResponse = await fetch(`${baseUrl}/api/tools/category-analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: validIds })
        })

        if (categoryResponse.ok) {
          const categoryResult = await categoryResponse.json()
          console.log(`  ✅ カテゴリ分析完了: ${categoryResult.updated}件`)
        } else {
          console.log('  ❌ カテゴリ分析失敗')
        }
      } catch (error) {
        console.error('  ❌ カテゴリ分析エラー:', error)
      }
    }

    // ===== ステップ2: 送料計算（全商品一括） =====
    if (includeFields?.shipping) {
      console.log('\n📦 ステップ2: 送料計算')
      try {
        const shippingResponse = await fetch(`${baseUrl}/api/tools/shipping-calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: validIds })
        })

        if (shippingResponse.ok) {
          const shippingResult = await shippingResponse.json()
          console.log(`  ✅ 送料計算完了: ${shippingResult.updated}件`)
        } else {
          console.log('  ❌ 送料計算失敗')
        }
      } catch (error) {
        console.error('  ❌ 送料計算エラー:', error)
      }
    }

    // ===== ステップ3: リサーチ（販売実績 + 最安値での利益計算）=====
    if (includeFields?.research) {
      console.log('\n🔍 ステップ3: リサーチ（販売実績 + 最安値利益計算）')
      try {
        const researchResponse = await fetch(`${baseUrl}/api/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: validIds })
        })

        if (researchResponse.ok) {
          const researchResult = await researchResponse.json()
          console.log(`  ✅ リサーチ完了: ${researchResult.updated}件`)
          
          // 結果を保存
          researchResult.results?.forEach((r: any) => {
            results.push({
              productId: r.id,
              success: r.success,
              lowestPrice: r.lowestPrice,
              profitAmount: r.profitAmount,
              profitMargin: r.profitMargin,
              soldCount: r.soldCount
            })
          })
        } else {
          console.log('  ❌ リサーチ失敗')
        }
      } catch (error) {
        console.error('  ❌ リサーチエラー:', error)
      }
    }

    // ===== ステップ4: Browse API分析（各商品ごとに実行）=====
    if (includeFields?.sellerMirror) {
      console.log('\n🏷️ ステップ4: Browse API分析（競合価格取得）')
      
      // Supabaseクライアントを作成
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      for (const id of validIds) {
        try {
          // 商品データを取得
          const { data: product } = await supabase
            .from('products_master')
            .select('*')
            .eq('id', id)
            .single()

          if (!product) {
            console.log(`  ⚠️ 商品 ${id}: データが見つかりません`)
            continue
          }

          // 🔍 デバッグ: タイトルの優先順位を確認
          console.log(`  🔍 デバッグ (${id}):`, {
            english_title: product.english_title,
            title: product.title,
            sm_title: product.ebay_api_data?.listing_reference?.referenceItems?.[0]?.title
          })

          // 🔥 重要: SellerMirrorで選択された参照商品のデータを使用
          const referenceItem = product.ebay_api_data?.listing_reference?.referenceItems?.[0]
          const searchTitle = referenceItem?.title || product.english_title || product.title
          const itemSpecifics = referenceItem?.itemSpecifics // 🔥 Item Specificsを取得
          
          console.log(`  🔍 検索タイトル: "${searchTitle}"`)
          console.log(`  📋 Item Specifics:`, itemSpecifics)
          console.log(`  📝 ソース: ${referenceItem?.title ? 'SM参照商品' : (product.english_title ? 'english_title' : 'title')}`)

          const smResponse = await fetch(`${baseUrl}/api/ebay/browse/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: id,
              ebayTitle: searchTitle, // 🔥 SM参照商品のタイトルを使用
              itemSpecifics: itemSpecifics, // 🔥 Item Specificsを渡す
              ebayCategoryId: product.ebay_category_id,
              weightG: product.listing_data?.weight_g || product.weight_g || 500,
              actualCostJPY: product.price_jpy || product.cost_price || 0
            })
          })

          if (smResponse.ok) {
            const smResult = await smResponse.json()
            console.log(`  ✅ 商品 ${id}: Browse API完了 (最安値: ${smResult.lowestPrice})`)
          } else {
            console.log(`  ❌ 商品 ${id}: Browse API失敗 (${smResponse.status})`)
          }
        } catch (error: any) {
          console.error(`  ❌ 商品 ${id}: エラー:`, error.message)
        }
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`\n✅ 一括リサーチ完了: 成功${successCount}/${validIds.length}件`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: validIds.length,
        successful: successCount,
        failed: validIds.length - successCount
      }
    })

  } catch (error: any) {
    console.error('❌ 一括リサーチエラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || '一括リサーチに失敗しました' },
      { status: 500 }
    )
  }
}
