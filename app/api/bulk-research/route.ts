// app/api/bulk-research/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, includeFields } = body

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { success: false, error: 'productIds配列が必要です' },
        { status: 400 }
      )
    }

    if (productIds.length > 50) {
      return NextResponse.json(
        { success: false, error: '一度に処理できる商品は最大50件です' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const results = []

    console.log(`🔍 一括リサーチ開始: ${productIds.length}件`)

    // 各商品を処理
    for (const productId of productIds) {
      try {
        console.log(`\n━━━ 商品ID ${productId} 処理開始 ━━━`)
        
        const result: any = {
          productId,
          success: true,
          data: {}
        }

        // 商品データ取得
        const { data: product, error: fetchError } = await supabase
          .from('yahoo_scraped_products')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError || !product) {
          console.error(`❌ 商品ID ${productId}: 商品が見つかりません`)
          result.success = false
          result.error = '商品が見つかりません'
          results.push(result)
          continue
        }

        console.log(`✅ 商品取得成功: ${product.active_title || product.scraped_title}`)

        // 英語タイトルを取得
        const englishTitle = product.english_title || product.active_title
        if (!englishTitle) {
          console.warn(`⚠️ 商品ID ${productId}: 英語タイトルがありません`)
        }

        // カテゴリ判定
        if (includeFields?.category && englishTitle) {
          console.log(`📋 カテゴリ判定開始...`)
          result.data.category = await callCategoryDetectAPI(product)
        }

        // SellerMirror分析（競合分析 + 現在の最安値）
        if ((includeFields?.competitors || includeFields?.sellerMirror) && englishTitle) {
          console.log(`🔍 SellerMirror分析開始...`)
          const smResult = await callSellerMirrorAPI(product)
          
          if (smResult) {
            // 競合分析データ（現在の最安値）
            result.data.competitors = {
              lowest_price: smResult.lowestPrice,
              average_price: smResult.averagePrice,
              count: smResult.competitorCount,
              data: {
                search_keyword: englishTitle,
                condition: 'New',
                marketplace: 'eBay US',
                last_updated: new Date().toISOString()
              }
            }

            // SellerMirror分析データも同時に取得
            result.data.sellerMirror = {
              lowest_price: smResult.lowestPrice,
              sold_count_90days: smResult.competitorCount,
              confidence: 85,
              data: {
                search_keyword: englishTitle,
                similar_items: smResult.competitorCount
              }
            }
          }
        }

        // 送料計算（簡易版 - 実際の送料APIと連携する場合は修正）
        if (includeFields?.shipping) {
          console.log(`📦 送料計算...`)
          result.data.shipping = calculateShipping(product)
        }

        // 利益計算
        if (includeFields?.profit) {
          console.log(`💰 利益計算...`)
          result.data.profit = calculateProfit(product, result.data.competitors)
        }

        // データベース保存
        console.log(`💾 データ保存中...`)
        await saveResearchData(supabase, productId, result.data)
        console.log(`✅ 商品ID ${productId}: 完了`)

        results.push(result)

      } catch (error: any) {
        console.error(`❌ 商品ID ${productId}: エラー - ${error.message}`)
        results.push({
          productId,
          success: false,
          error: error.message || '処理エラー'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`\n🎉 一括リサーチ完了: 成功 ${successCount}/${results.length}`)

    return NextResponse.json({
      success: true,
      results,
      processed: results.length,
      successCount,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Bulk research API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// カテゴリ判定API呼び出し
async function callCategoryDetectAPI(product: any) {
  try {
    const title = product.english_title || product.active_title || product.scraped_title
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/category/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        price_jpy: product.active_price || product.scraped_price,
        description: product.active_description || product.scraped_description
      })
    })

    if (!response.ok) {
      throw new Error(`Category API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success && data.category) {
      console.log(`  ✅ カテゴリ: ${data.category.category_name} (信頼度: ${data.category.confidence}%)`)
      return {
        name: data.category.category_name,
        id: data.category.category_id,
        ebay_category_id: data.category.category_id,
        confidence: data.category.confidence / 100
      }
    }

    return null
  } catch (error: any) {
    console.error(`  ❌ カテゴリ判定エラー:`, error.message)
    return null
  }
}

// SellerMirror API呼び出し（競合分析 + 現在の最安値を含む）
// findCompletedItemsのレート制限を回避するため、findItemsAdvancedを使用
async function callSellerMirrorAPI(product: any) {
  try {
    const englishTitle = product.english_title || product.active_title
    const weightG = product.weight_g || 500
    const actualCostJPY = product.active_price || product.scraped_price || 0

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ebay/finding-advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: String(product.id),
        ebayTitle: englishTitle,
        ebayCategoryId: product.ebay_category_id,
        weightG,
        actualCostJPY
      })
    })

    if (!response.ok) {
      throw new Error(`SellerMirror API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`  ✅ 現在の最安値: ${data.lowestPrice}`)
      console.log(`  ✅ 平均価格: ${data.averagePrice}`)
      console.log(`  ✅ 出品数: ${data.competitorCount}件`)
      
      return {
        lowestPrice: data.lowestPrice,
        averagePrice: data.averagePrice,
        competitorCount: data.competitorCount,
        profitMargin: data.profitMargin,
        profitAmount: data.profitAmount
      }
    }

    return null
  } catch (error: any) {
    console.error(`  ❌ SellerMirror分析エラー:`, error.message)
    return null
  }
}

// 送料計算（簡易版）
function calculateShipping(product: any) {
  const weightG = product.weight_g || 500
  
  // 重量に応じた送料（簡易計算）
  let costUSD = 12.99
  if (weightG > 1000) costUSD = 18.99
  if (weightG > 2000) costUSD = 24.99

  return {
    cost_usd: costUSD,
    policy: 'Economy Shipping from Japan',
    service: 'ePacket'
  }
}

// 利益計算
function calculateProfit(product: any, competitorsData: any) {
  const purchasePrice = parseFloat(product.active_price || product.scraped_price || 0)
  const shippingCost = 12.99
  const ebayFee = purchasePrice * 0.15 // 15%手数料
  
  // 推奨価格は競合の最安値を基準
  const targetPrice = competitorsData?.lowest_price || (purchasePrice * 1.5)
  const recommendedPrice = targetPrice * 1.05 // 最安値の5%上

  const profit = recommendedPrice - (purchasePrice + shippingCost + ebayFee)
  const margin = (profit / recommendedPrice) * 100

  return {
    margin: Math.round(margin * 100) / 100,
    amount_usd: Math.round(profit * 100) / 100,
    recommended_price_usd: Math.round(recommendedPrice * 100) / 100,
    break_even_price_usd: Math.round((purchasePrice + shippingCost + ebayFee) * 100) / 100
  }
}

// リサーチデータ保存
async function saveResearchData(supabase: any, productId: number, data: any) {
  const updates: any = {
    research_data: data,
    research_completed: true,
    research_updated_at: new Date().toISOString()
  }

  if (data.category) {
    updates.category_name = data.category.name
    updates.category_number = data.category.id
    updates.ebay_category_id = data.category.ebay_category_id
    updates.category_confidence = data.category.confidence
  }

  if (data.competitors) {
    updates.competitors_lowest_price = data.competitors.lowest_price
    updates.competitors_average_price = data.competitors.average_price
    updates.competitors_count = data.competitors.count
    updates.competitors_data = data.competitors.data
  }

  if (data.shipping) {
    updates.shipping_cost_usd = data.shipping.cost_usd
    updates.shipping_policy = data.shipping.policy
    updates.shipping_service = data.shipping.service
  }

  if (data.profit) {
    updates.profit_margin = data.profit.margin
    updates.profit_amount_usd = data.profit.amount_usd
    updates.recommended_price_usd = data.profit.recommended_price_usd
    updates.break_even_price_usd = data.profit.break_even_price_usd
  }

  if (data.sellerMirror) {
    updates.sm_data = data.sellerMirror
    updates.sm_lowest_price = data.sellerMirror.lowest_price
    updates.sm_fetched_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('yahoo_scraped_products')
    .update(updates)
    .eq('id', productId)

  if (error) {
    throw new Error(`データ保存エラー: ${error.message}`)
  }
}
