// API Route for importing scraped products to products table
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateSKU } from '@/lib/sku/generator'
import { generateMasterKeyFromProduct } from '@/lib/master-key/generator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 為替レート（本番では外部APIから取得すべき）
const JPY_TO_USD_RATE = 150

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scrapedIds } = body

    if (!scrapedIds || scrapedIds.length === 0) {
      return NextResponse.json(
        { error: 'scrapedIdsは必須です' },
        { status: 400 }
      )
    }

    console.log(`[Import] ${scrapedIds.length}件の商品をインポートします`)

    // scraped_products から取得
    const { data: scrapedProducts, error: fetchError } = await supabase
      .from('scraped_products')
      .select('*')
      .in('id', scrapedIds)

    if (fetchError) {
      console.error('[Import] 取得エラー:', fetchError)
      return NextResponse.json(
        { error: '取得失敗: ' + fetchError.message },
        { status: 500 }
      )
    }

    if (!scrapedProducts || scrapedProducts.length === 0) {
      return NextResponse.json(
        { error: '指定されたIDの商品が見つかりません' },
        { status: 404 }
      )
    }

    const results = []
    const errors = []

    for (const scraped of scrapedProducts) {
      try {
        // マッピング: scraped_products → products
        const productData = {
          // 基本情報
          item_id: scraped.auction_id || `IMPORT-${scraped.id}`,  // eBay item_id (一時的)
          source_item_id: scraped.auction_id || scraped.id.toString(),
          sku: null,  // 後で生成
          master_key: null,
          title: scraped.title,
          english_title: null,  // 後でAI翻訳

          // 価格
          price_jpy: scraped.price,
          price_usd: scraped.price ? Number((scraped.price / JPY_TO_USD_RATE).toFixed(2)) : null,

          // 在庫
          current_stock: scraped.quantity ? parseInt(scraped.quantity) : 1,

          // ステータス
          status: 'imported',  // 新規インポート

          // 利益計算（後で計算し直す）
          profit_margin: null,
          profit_amount_usd: null,

          // SellerMirror分析結果（初期値null）
          sm_lowest_price: null,
          sm_average_price: null,
          sm_competitor_count: null,
          sm_profit_margin: null,
          sm_profit_amount_usd: null,

          // ★重要: scraped_data に元データ全保存★
          scraped_data: {
            platform: scraped.platform,
            source_url: scraped.source_url,
            cost_price_jpy: scraped.total_cost || scraped.price,  // 仕入れ値
            shipping_cost: scraped.shipping_cost,
            image_urls: scraped.images || [],  // ★モーダル表示用★
            description_jp: scraped.description,
            condition: scraped.condition,
            category_path: scraped.category_path,  // eBayカテゴリ選択用
            auction_id: scraped.auction_id,
            bid_count: scraped.bid_count,
            starting_price: scraped.starting_price,
            shipping_days: scraped.shipping_days,
            quantity: scraped.quantity,
            scraped_at: scraped.scraped_at,
            scraping_method: scraped.scraping_method
          },

          // listing_data（出品用データ、後で生成）
          listing_data: {
            html_description: null,  // 後でHTML生成
            ddp_price_usd: null  // 後でDDP計算
          },

          // ebay_api_data（カテゴリ情報など、後で設定）
          ebay_api_data: null,

          // タイムスタンプ
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        console.log('[Import] インポート実行:', productData.title)

        // 重複チェック: 既に同じitem_idが存在するか確認
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, item_id, title')
          .eq('item_id', productData.item_id)
          .maybeSingle()

        if (existingProduct) {
          console.log('[Import] スキップ (既に存在):', existingProduct.item_id)
          errors.push({
            scrapedId: scraped.id,
            title: scraped.title,
            error: `既に商品マスターに存在します (ID: ${existingProduct.id})`
          })
          continue
        }

        // products テーブルに挿入
        const { data: inserted, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single()

        if (insertError) {
          console.error('[Import] 挿入エラー:', insertError)
          errors.push({
            scrapedId: scraped.id,
            title: scraped.title,
            error: insertError.message
          })
          continue
        }

        console.log('[Import] 成功:', inserted.id)

        // SKUとMaster Keyを生成してアップデート
        try {
          const sku = generateSKU(inserted.id)
          const masterKey = generateMasterKeyFromProduct(inserted)

          console.log(`[Import] SKU生成: ${sku}`)
          console.log(`[Import] Master Key生成: ${masterKey.substring(0, 50)}...`)

          const { error: updateError } = await supabase
            .from('products')
            .update({
              sku,
              master_key: masterKey,
              updated_at: new Date().toISOString()
            })
            .eq('id', inserted.id)

          if (updateError) {
            console.error('[Import] SKU/Master Key更新エラー:', updateError)
            // エラーでも続行（商品自体はインポート済み）
          } else {
            console.log(`[Import] SKU/Master Key更新成功: ${inserted.id}`)
          }
        } catch (keyError) {
          console.error('[Import] SKU/Master Key生成エラー:', keyError)
          // エラーでも続行（商品自体はインポート済み）
        }

        results.push({
          scrapedId: scraped.id,
          productId: inserted.id,
          title: scraped.title,
          status: 'success'
        })

      } catch (error) {
        console.error('[Import] 処理エラー:', error)
        errors.push({
          scrapedId: scraped.id,
          title: scraped.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.length,
      failed: errors.length,
      results,
      errors
    })

  } catch (error) {
    console.error('[Import] エラー:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// GET: インポート可能な商品一覧を取得
export async function GET(request: NextRequest) {
  try {
    // まだインポートされていない商品を取得
    const { data: scraped, error } = await supabase
      .from('scraped_products')
      .select('id, title, price, total_cost, platform, scraped_at, images')
      .order('scraped_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: '取得失敗: ' + error.message },
        { status: 500 }
      )
    }

    // 既にインポート済みかチェック（source_item_idで）
    const importedCheck = await Promise.all(
      (scraped || []).map(async (item) => {
        const { data } = await supabase
          .from('products')
          .select('id')
          .eq('source_item_id', item.id.toString())
          .limit(1)

        return {
          ...item,
          imported: data && data.length > 0,
          imageCount: item.images ? item.images.length : 0
        }
      })
    )

    return NextResponse.json({
      products: importedCheck,
      total: importedCheck.length
    })

  } catch (error) {
    console.error('[Import] エラー:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
