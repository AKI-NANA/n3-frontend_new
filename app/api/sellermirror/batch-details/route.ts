// app/api/sellermirror/batch-details/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const GAS_TRANSLATE_URL = process.env.GOOGLE_APPS_SCRIPT_TRANSLATE_URL

/**
 * Google Apps Script翻訳API呼び出し
 */
async function translateText(text: string): Promise<string> {
  if (!text || !GAS_TRANSLATE_URL) return text

  try {
    const response = await fetch(GAS_TRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'single',
        text,
        sourceLang: 'ja',
        targetLang: 'en'
      })
    })

    const result = await response.json()
    
    if (result.success && result.translated) {
      return result.translated
    }
    
    return text
  } catch (error) {
    console.error('Translation error:', error)
    return text
  }
}

/**
 * Condition ID判定関数
 */
function determineConditionId(product: any): number {
  const condition = product.scraped_data?.condition || ''
  const title = product.title || ''
  
  const text = `${condition} ${title}`.toLowerCase()
  
  console.log(`  商品条件判定: condition="${condition}"`)
  
  if (text.includes('新品') || text.includes('未使用') || text.includes('new') || text.includes('unused')) {
    console.log(`  → 1000 (New)`)
    return 1000
  }
  
  if (text.includes('中古') || text.includes('used')) {
    console.log(`  → 3000 (Used)`)
    return 3000
  }
  
  console.log(`  → デフォルト: 1000 (New)`)
  return 1000
}

/**
 * Item Specificsを正しく抽出
 */
function extractItemSpecifics(itemData: any): Record<string, string> {
  const itemSpecifics: Record<string, string> = {}
  
  // localizedAspects配列から抽出
  const aspects = itemData.localizedAspects || []
  
  console.log(`    📋 localizedAspects: ${aspects.length}件`)
  
  aspects.forEach((aspect: any) => {
    if (aspect.name) {
      // valueが配列の場合は最初の要素を取得
      let value = aspect.value
      
      if (Array.isArray(value)) {
        value = value[0]
      }
      
      if (value && typeof value === 'string') {
        itemSpecifics[aspect.name] = value
        console.log(`      - ${aspect.name}: ${value}`)
      }
    }
  })
  
  return itemSpecifics
}

/**
 * eBay Batch Item Details API - 複数商品の詳細情報を並行取得
 * Item Specifics（必須項目）を含む完全な商品情報を取得
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemIds, productId, productIds } = body

    console.log('🔍 eBay商品詳細バッチ取得開始')
    console.log(`  取得件数: ${itemIds?.length || productIds?.length || 0}件`)

    // productIds配列での呼び出しに対応
    if (productIds && Array.isArray(productIds)) {
      console.log('  📦 複数商品の詳細を一括取得')
      const batchResults = []

      for (const pid of productIds) {
        try {
          const { data: product } = await supabase
            .from('products_master')
            .select('*')
            .eq('id', pid)
            .single()

          if (!product) continue

          const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
          const itemIdsForProduct = referenceItems.map((item: any) => item.itemId).filter(Boolean)

          if (itemIdsForProduct.length === 0) {
            console.log(`  ⏭️ 商品 ${pid}: Item IDsなし`)
            continue
          }

          const detailResponse = await POST(
            new NextRequest(request.url, {
              method: 'POST',
              body: JSON.stringify({ itemIds: itemIdsForProduct, productId: pid })
            })
          )

          const detailResult = await detailResponse.json()
          batchResults.push({ productId: pid, ...detailResult })

        } catch (error: any) {
          console.error(`  ❌ 商品 ${pid} エラー:`, error.message)
        }
      }

      return NextResponse.json({
        success: true,
        results: batchResults,
        message: `${batchResults.length}/${productIds.length}件の詳細取得完了`
      })
    }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Item IDsが必要です' },
        { status: 400 }
      )
    }

    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
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

    console.log('  📥 詳細情報を並行取得中...')
    const detailsPromises = itemIds.map(async (itemId: string) => {
      try {
        const itemUrl = `https://api.ebay.com/buy/browse/v1/item/${itemId}`
        
        const itemResponse = await fetch(itemUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
          }
        })

        if (!itemResponse.ok) {
          console.error(`  ❌ Item詳細取得失敗: ${itemId}`)
          return { itemId, success: false, error: 'API呼び出し失敗' }
        }

        const itemData = await itemResponse.json()
        
        // ✅ Item Specificsを正しく抽出
        console.log(`  🔍 ${itemId}: Item Specifics抽出中...`)
        const itemSpecifics = extractItemSpecifics(itemData)
        
        console.log(`  ✅ ${itemId}: Item Specifics ${Object.keys(itemSpecifics).length}件取得`)

        return {
          itemId: itemData.itemId,
          success: true,
          details: {
            title: itemData.title,
            price: itemData.price?.value,
            currency: itemData.price?.currency,
            condition: itemData.condition,
            conditionDescription: itemData.conditionDescription,
            categoryId: itemData.categories?.[0]?.categoryId,
            categoryPath: itemData.categoryPath,
            seller: {
              username: itemData.seller?.username,
              feedbackScore: itemData.seller?.feedbackScore,
              feedbackPercentage: itemData.seller?.feedbackPercentage
            },
            shippingOptions: itemData.shippingOptions?.map((opt: any) => ({
              shippingCost: opt.shippingCost?.value || 0,
              shippingCostType: opt.shippingCostType,
              minEstimatedDeliveryDate: opt.minEstimatedDeliveryDate,
              maxEstimatedDeliveryDate: opt.maxEstimatedDeliveryDate
            })),
            itemLocation: {
              city: itemData.itemLocation?.city,
              stateOrProvince: itemData.itemLocation?.stateOrProvince,
              postalCode: itemData.itemLocation?.postalCode,
              country: itemData.itemLocation?.country
            },
            itemSpecifics: itemSpecifics,
            quantitySold: itemData.unitsSold,
            quantityAvailable: itemData.estimatedAvailabilities?.[0]?.estimatedAvailableQuantity,
            itemWebUrl: itemData.itemWebUrl,
            image: itemData.image?.imageUrl,
            additionalImages: itemData.additionalImages?.map((img: any) => img.imageUrl) || [],
            description: itemData.description,
            shortDescription: itemData.shortDescription,
            hasDetails: true,
            detailsRetrievedAt: new Date().toISOString()
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Item詳細取得エラー (${itemId}):`, error.message)
        return { itemId, success: false, error: error.message }
      }
    })

    const results = await Promise.all(detailsPromises)
    
    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length
    
    console.log(`  ✅ 成功: ${successCount}件`)
    console.log(`  ❌ 失敗: ${failedCount}件`)

    // DBに保存（productIdがある場合）
    if (productId) {
      const { data: product } = await supabase
        .from('products_master')
        .select('*')
        .eq('id', productId)
        .single()

      if (product) {
        const existingData = product.ebay_api_data || {}
        const listingReference = existingData.listing_reference || {}
        const referenceItems = listingReference.referenceItems || []

        // 既存の参照商品に詳細情報をマージ（itemSpecificsを保持）
        const updatedItems = referenceItems.map((item: any) => {
          const detailResult = results.find(r => r.itemId === item.itemId)
          if (detailResult && detailResult.success) {
            // 🔍 デバッグ: details.itemSpecificsの内容を確認
            console.log(`  🔍 DEBUG - detailResult.details.itemSpecifics:`, detailResult.details.itemSpecifics)
            console.log(`  🔍 DEBUG - item.itemSpecifics:`, item.itemSpecifics)
            
            // ✅ 既存のitemSpecificsと新しいitemSpecificsをマージ
            const mergedSpecifics = {
              ...(item.itemSpecifics || {}),
              ...(detailResult.details.itemSpecifics || {})
            }
            
            console.log(`  🔍 DEBUG - mergedSpecifics:`, mergedSpecifics)
            console.log(`  🔍 DEBUG - mergedSpecifics keys:`, Object.keys(mergedSpecifics))
            
            // ✅ itemSpecificsを除外してからスプレッド
            const { itemSpecifics: _, ...detailsWithoutSpecifics } = detailResult.details
            
            const result = {
              ...item,
              ...detailsWithoutSpecifics,
              itemSpecifics: mergedSpecifics  // ✅ 最後に明示的に設定
            }
            
            console.log(`  🔍 DEBUG - result.itemSpecifics:`, result.itemSpecifics)
            console.log(`  🔍 DEBUG - result.itemSpecifics keys:`, Object.keys(result.itemSpecifics || {}))
            
            return result
          }
          return item
        })

        const firstItemTitle = updatedItems[0]?.title
        const shouldUpdateEnglishTitle = !!firstItemTitle
        
        if (shouldUpdateEnglishTitle) {
          console.log(`  🏷️ english_title更新: "${firstItemTitle}"`)
        }

        // 🔍 デバッグ: updatedItems[0]の内容を確認
        console.log(`  🔍 DEBUG - updatedItems.length:`, updatedItems.length)
        console.log(`  🔍 DEBUG - updatedItems[0] exists:`, !!updatedItems[0])
        if (updatedItems[0]) {
          console.log(`  🔍 DEBUG - updatedItems[0].itemSpecifics exists:`, !!updatedItems[0].itemSpecifics)
          console.log(`  🔍 DEBUG - updatedItems[0].itemSpecifics type:`, typeof updatedItems[0].itemSpecifics)
          console.log(`  🔍 DEBUG - updatedItems[0].itemSpecifics raw:`, updatedItems[0].itemSpecifics)
        }

        // ✅ results配列から直接取得（最も確実）
        const firstSuccessResult = results.find(r => r.success && r.details?.itemSpecifics)
        const firstItemSpecifics = firstSuccessResult?.details?.itemSpecifics || {}
        
        console.log(`  📋 取得したItem Specifics:`)
        console.log(`    件数: ${Object.keys(firstItemSpecifics).length}`)
        Object.entries(firstItemSpecifics).forEach(([key, value]) => {
          console.log(`    ${key}: ${value}`)
        })

        const conditionId = determineConditionId(product)
        const storageLocation = product.ebay_item_id ? 'Plus1（日本倉庫）' : '無在庫'

        // 🔥 競合商品の統計情報を計算
        const countries = updatedItems
          .map(item => item.itemLocation?.country)
          .filter(c => c)

        const countryCount: Record<string, number> = {}
        countries.forEach(c => countryCount[c] = (countryCount[c] || 0) + 1)
        const mostCommonCountry = Object.entries(countryCount)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || ''

        const materials = updatedItems
          .map(item => item.itemSpecifics?.Material)
          .filter(m => m)

        const materialCount: Record<string, number> = {}
        materials.forEach(m => materialCount[m] = (materialCount[m] || 0) + 1)
        const mostCommonMaterial = Object.entries(materialCount)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || ''

        const totalSold = updatedItems
          .map(item => parseInt(item.quantitySold) || 0)
          .reduce((sum, sold) => sum + sold, 0)

        // 🔥 最安値送料を計算
        const shippingCosts = updatedItems
          .map(item => {
            const shippingOptions = item.shippingOptions || []
            if (shippingOptions.length === 0) return null
            const costs = shippingOptions.map((opt: any) => parseFloat(opt.shippingCost) || 0)
            return costs.length > 0 ? Math.min(...costs) : null
          })
          .filter(cost => cost !== null && cost > 0)

        const lowestShippingCost = shippingCosts.length > 0 
          ? Math.min(...shippingCosts as number[])
          : null

        console.log(`  📊 統計情報:`)
        console.log(`    - 最頻出原産国: ${mostCommonCountry} (${countries.length}件中${countryCount[mostCommonCountry] || 0}件)`)
        console.log(`    - 最頻出素材: ${mostCommonMaterial} (${materials.length}件中${materialCount[mostCommonMaterial] || 0}件)`)
        console.log(`    - 競合販売数合計: ${totalSold}件`)
        console.log(`    - 最安値送料: ${lowestShippingCost ? `${lowestShippingCost.toFixed(2)}` : '取得なし'}`)

        // ✅ listing_dataを確実に更新（すべてfirstSuccessResultから取得）
        const updatedListingData = {
          ...(product.listing_data || {}),
          condition_id: conditionId,
          item_specifics: firstItemSpecifics,  // ✅ resultsから取得
          storage_location: storageLocation,
          ebay_category_id: firstSuccessResult?.details?.categoryId || '',  // ✅ resultsから取得
          ebay_category_name: firstSuccessResult?.details?.categoryPath || '',  // ✅ resultsから取得
          ...(lowestShippingCost !== null && {
            shipping_cost_usd: lowestShippingCost,  // 🔥 送料を自動保存
            base_shipping_usd: lowestShippingCost,  // 🔥 基本送料としても保存
          }),
        }

        console.log(`  💾 DB保存:`)
        console.log(`    - Condition ID: ${conditionId}`)
        console.log(`    - Item Specifics: ${Object.keys(firstItemSpecifics).length}件`)
        console.log(`    - Storage: ${storageLocation}`)

        const { error: updateError } = await supabase
          .from('products_master')
          .update({
            ebay_api_data: {
              ...existingData,
              listing_reference: {
                ...listingReference,
                referenceItems: updatedItems
              }
            },
            listing_data: updatedListingData,
            ...(shouldUpdateEnglishTitle && { english_title: firstItemTitle }),
            // 🔥 追加: 原産国・素材・販売数をトップレベルに保存
            ...(mostCommonCountry && { origin_country: mostCommonCountry }),
            ...(mostCommonMaterial && { material: mostCommonMaterial }),
            sm_sales_count: totalSold,  // ✅ 修正: sold_count → sm_sales_count
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)

        if (updateError) {
          console.error('❌ DB更新エラー:', updateError)
        } else {
          console.log('✅ 詳細情報をDBに保存完了')
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: itemIds.length,
        success: successCount,
        failed: failedCount
      },
      message: `${successCount}/${itemIds.length}件の詳細情報を取得しました`
    })

  } catch (error: any) {
    console.error('❌ バッチ詳細取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'バッチ詳細取得に失敗しました' },
      { status: 500 }
    )
  }
}
