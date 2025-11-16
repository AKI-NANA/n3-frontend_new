// app/api/tools/sellermirror-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

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

    console.log(`✅ 商品データ取得成功: ${products.length}件`)

    let successCount = 0
    const results = []
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    for (const product of products) {
      try {
        const ebayTitle = product.english_title || product.ebay_api_data?.title || ''
        const ebayCategoryId = product.ebay_api_data?.category_id || ''

        if (!ebayTitle) {
          console.warn(`⚠️ 商品 ${product.id}: 英語タイトルが未設定`)
          results.push({ id: product.id, success: false, error: '英語タイトル未設定' })
          continue
        }

        console.log(`📊 商品 ${product.id}: "${ebayTitle}" でSM分析実行`)

        // ステップ1: SellerMirror分析
        const smResponse = await fetch(`${baseUrl}/api/sellermirror/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            ebayTitle,
            ebayCategoryId
          })
        })

        if (!smResponse.ok) {
          console.error(`❌ 商品 ${product.id}: SM分析失敗`)
          results.push({ id: product.id, success: false, error: 'SM分析失敗' })
          continue
        }

        const smResult = await smResponse.json()

        if (!smResult.success) {
          console.warn(`⚠️ 商品 ${product.id}: ${smResult.error}`)
          results.push({ id: product.id, success: false, error: smResult.error })
          continue
        }

        console.log(`✅ 商品 ${product.id}: SM分析完了（販売数: ${smResult.soldCount}件）`)

        // ✅ 新規追加: sellermirror_analysisテーブルに保存
        try {
          const referenceItems = smResult.listingData?.referenceItems || []
          
          // 価格情報を集計
          const prices = referenceItems
            .map((item: any) => parseFloat(item.price))
            .filter((p: number) => !isNaN(p) && p > 0)
          
          const avgPrice = prices.length > 0 
            ? prices.reduce((sum, p) => sum + p, 0) / prices.length 
            : null
          
          const minPrice = prices.length > 0 ? Math.min(...prices) : null
          const maxPrice = prices.length > 0 ? Math.max(...prices) : null
          
          console.log(`  💰 価格情報: 平均=${avgPrice}, 最小=${minPrice}, 最大=${maxPrice}`)
          
          // Item Specificsを集計（最頻値を取得）
          const commonAspects = extractCommonAspects(referenceItems)
          console.log(`  📋 共通Item Specifics:`, commonAspects)
          
          // sellermirror_analysisに保存
          const smAnalysisResponse = await fetch(`${baseUrl}/api/sm-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: product.id,
              competitor_count: referenceItems.length,
              avg_price_usd: avgPrice,
              min_price_usd: minPrice,
              max_price_usd: maxPrice,
              common_aspects: commonAspects,
              analyzed_at: new Date().toISOString()
            })
          })
          
          if (smAnalysisResponse.ok) {
            const smAnalysisResult = await smAnalysisResponse.json()
            console.log(`  ✅ sellermirror_analysisに保存完了`)
            console.log(`  🔄 トリガーによりproductsテーブルも更新されました`)
          } else {
            const errorData = await smAnalysisResponse.json()
            console.error(`  ❌ sellermirror_analysis保存エラー:`, errorData)
          }
          
        } catch (smAnalysisError: any) {
          console.error(`  ❌ sellermirror_analysis保存エラー:`, smAnalysisError.message)
        }

        // ステップ2: 詳細取得を自動実行（Item Specifics取得）
        console.log(`📥 商品 ${product.id}: 詳細取得を自動実行`)
        
        try {
          // ebay_api_dataから参照商品のItem IDsを取得
          const { data: updatedProduct } = await supabase
            .from('products_master')
            .select('ebay_api_data')
            .eq('id', product.id)
            .single()

          const referenceItems = updatedProduct?.ebay_api_data?.listing_reference?.referenceItems || []
          const itemIds = referenceItems.map((item: any) => item.itemId).filter(Boolean)

          if (itemIds.length > 0) {
            console.log(`  Item IDs: ${itemIds.length}件`)

            const detailsResponse = await fetch(`${baseUrl}/api/sellermirror/batch-details`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemIds,
                productId: product.id
              })
            })

            if (detailsResponse.ok) {
              const detailsResult = await detailsResponse.json()
              
              if (detailsResult.success) {
                console.log(`  ✅ 詳細取得成功: ${detailsResult.summary.success}件`)
                
                // ✅ 詳細取得後、再度sellermirror_analysisを更新
                const { data: finalProduct } = await supabase
                  .from('products_master')
                  .select('ebay_api_data')
                  .eq('id', product.id)
                  .single()
                
                const detailedItems = finalProduct?.ebay_api_data?.listing_reference?.referenceItems || []
                const updatedCommonAspects = extractCommonAspects(detailedItems)
                
                // 詳細データで再度更新
                await fetch(`${baseUrl}/api/sm-analysis`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    product_id: product.id,
                    competitor_count: detailedItems.length,
                    avg_price_usd: calculateAvgPrice(detailedItems),
                    min_price_usd: calculateMinPrice(detailedItems),
                    max_price_usd: calculateMaxPrice(detailedItems),
                    common_aspects: updatedCommonAspects,
                    analyzed_at: new Date().toISOString()
                  })
                })
                
                console.log(`  🔄 詳細データでsellermirror_analysisを更新しました`)
              } else {
                console.warn(`  ⚠️ 詳細取得失敗: ${detailsResult.error}`)
              }
            }
          } else {
            console.warn(`  ⚠️ Item IDsが見つかりません`)
          }
        } catch (detailError: any) {
          console.warn(`  ⚠️ 詳細取得エラー:`, detailError.message)
        }

        // ステップ3: 必須項目のフォールバック処理
        console.log(`🔍 商品 ${product.id}: 必須項目チェック`)
        
        const { data: finalProduct } = await supabase
          .from('products_master')
          .select('listing_data, ebay_api_data, scraped_data')
          .eq('id', product.id)
          .single()

        const listingData = finalProduct?.listing_data || {}
        const itemSpecifics = listingData.item_specifics || {}
        
        let needsUpdate = false
        const updates: any = {}

        // Type が未設定の場合、カテゴリから推定
        if (!itemSpecifics.Type) {
          const categoryName = finalProduct?.ebay_api_data?.category_name || ''
          const detectedType = detectTypeFromCategory(categoryName, product.title)
          
          if (detectedType) {
            itemSpecifics.Type = detectedType
            needsUpdate = true
            console.log(`  ✅ Type を推定: ${detectedType}`)
          }
        }

        // Model が未設定の場合、タイトルから抽出
        if (!itemSpecifics.Model) {
          const detectedModel = extractModelFromTitle(product.title || product.english_title)
          
          if (detectedModel) {
            itemSpecifics.Model = detectedModel
            needsUpdate = true
            console.log(`  ✅ Model を抽出: ${detectedModel}`)
          }
        }

        // Brand が未設定の場合、タイトルから抽出
        if (!itemSpecifics.Brand && !itemSpecifics.MPN) {
          const detectedBrand = extractBrandFromTitle(product.title || product.english_title)
          
          if (detectedBrand) {
            itemSpecifics.Brand = detectedBrand
            needsUpdate = true
            console.log(`  ✅ Brand を抽出: ${detectedBrand}`)
          }
        }

        // Color が未設定の場合、タイトルから抽出
        if (!itemSpecifics.Color) {
          const detectedColor = extractColorFromTitle(product.title || product.english_title)
          
          if (detectedColor) {
            itemSpecifics.Color = detectedColor
            needsUpdate = true
            console.log(`  ✅ Color を抽出: ${detectedColor}`)
          }
        }

        // Size が未設定の場合、タイトルから抽出
        if (!itemSpecifics.Size) {
          const detectedSize = extractSizeFromTitle(product.title || product.english_title)
          
          if (detectedSize) {
            itemSpecifics.Size = detectedSize
            needsUpdate = true
            console.log(`  ✅ Size を抽出: ${detectedSize}`)
          }
        }

        // Material が未設定の場合、タイトルから抽出
        if (!itemSpecifics.Material) {
          const detectedMaterial = extractMaterialFromTitle(product.title || product.english_title)
          
          if (detectedMaterial) {
            itemSpecifics.Material = detectedMaterial
            needsUpdate = true
            console.log(`  ✅ Material を抽出: ${detectedMaterial}`)
          }
        }

        // 更新が必要な場合はDBに保存
        if (needsUpdate) {
          updates.listing_data = {
            ...listingData,
            item_specifics: itemSpecifics
          }

          await supabase
            .from('products_master')
            .update(updates)
            .eq('id', product.id)

          console.log(`  💾 必須項目を自動補完しました`)
        }

        // ステップ4: Browse APIで競合価格と利益率を計算
        console.log(`💰 商品 ${product.id}: Browse APIで利益計算`)
        
        try {
          const browseResponse = await fetch(`${baseUrl}/api/ebay/browse/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              ebayTitle,
              ebayCategoryId,
              weightG: product.listing_data?.weight_g || 500,
              actualCostJPY: product.price_jpy || 0
            })
          })

          if (browseResponse.ok) {
            const browseResult = await browseResponse.json()
            
            if (browseResult.success) {
              console.log(`  ✅ 利益計算完了: 利益率 ${browseResult.profitMargin}%`)
            }
          }
        } catch (browseError: any) {
          console.warn(`  ⚠️ Browse APIエラー:`, browseError.message)
        }

        successCount++
        results.push({
          id: product.id,
          success: true,
          listingData: smResult.listingData
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

    console.log(`✅ SellerMirror分析完了: ${successCount}/${validIds.length}件`)

    return NextResponse.json({
      success: true,
      updated: successCount,
      total: validIds.length,
      results,
      message: `${successCount}件のSM分析と詳細取得が完了しました`
    })

  } catch (error: any) {
    console.error('❌ SellerMirror分析エラー:', error)
    return NextResponse.json(
      { error: error.message || 'SellerMirror分析に失敗しました' },
      { status: 500 }
    )
  }
}

// ========================================
// ✅ 新規追加: Item Specificsの共通項目を抽出
// ========================================
function extractCommonAspects(items: any[]): any {
  if (!items || items.length === 0) return {}
  
  const aspectCounts: Record<string, Record<string, number>> = {}
  
  // 各アイテムのItem Specificsをカウント
  items.forEach(item => {
    // itemSpecificsは複数の場所に存在する可能性がある
    const specifics = item.itemSpecifics || item.item_specifics || item.localizedAspects || {}
    
    Object.entries(specifics).forEach(([key, value]) => {
      if (!aspectCounts[key]) aspectCounts[key] = {}
      const strValue = String(value)
      aspectCounts[key][strValue] = (aspectCounts[key][strValue] || 0) + 1
    })
  })
  
  // 最頻出の値を取得
  const commonAspects: Record<string, string> = {}
  Object.entries(aspectCounts).forEach(([key, valueCounts]) => {
    const maxCount = Math.max(...Object.values(valueCounts))
    const mostCommonValue = Object.entries(valueCounts)
      .find(([_, count]) => count === maxCount)?.[0]
    if (mostCommonValue) {
      commonAspects[key] = mostCommonValue
    }
  })
  
  return commonAspects
}

// ========================================
// ✅ 新規追加: 価格計算ヘルパー関数
// ========================================
function calculateAvgPrice(items: any[]): number | null {
  if (!items || items.length === 0) return null
  const prices = items.map(i => parseFloat(i.price)).filter(p => !isNaN(p) && p > 0)
  if (prices.length === 0) return null
  return Number((prices.reduce((sum, p) => sum + p, 0) / prices.length).toFixed(2))
}

function calculateMinPrice(items: any[]): number | null {
  if (!items || items.length === 0) return null
  const prices = items.map(i => parseFloat(i.price)).filter(p => !isNaN(p) && p > 0)
  return prices.length > 0 ? Math.min(...prices) : null
}

function calculateMaxPrice(items: any[]): number | null {
  if (!items || items.length === 0) return null
  const prices = items.map(i => parseFloat(i.price)).filter(p => !isNaN(p) && p > 0)
  return prices.length > 0 ? Math.max(...prices) : null
}

// ========================================
// ヘルパー関数: カテゴリからTypeを推定
// ========================================
function detectTypeFromCategory(categoryName: string, title: string): string | null {
  const text = `${categoryName} ${title}`.toLowerCase()
  
  // よくあるパターン
  if (text.includes('figure') || text.includes('フィギュア')) return 'Action Figure'
  if (text.includes('toy') || text.includes('おもちゃ')) return 'Toy'
  if (text.includes('card') || text.includes('カード')) return 'Trading Card'
  if (text.includes('game') || text.includes('ゲーム')) return 'Video Game'
  if (text.includes('book') || text.includes('本')) return 'Book'
  if (text.includes('clothing') || text.includes('apparel') || text.includes('服')) return 'Clothing'
  if (text.includes('electronics') || text.includes('電子')) return 'Electronics'
  if (text.includes('collectible') || text.includes('コレクション')) return 'Collectible'
  
  return null
}

// ========================================
// ヘルパー関数: タイトルからModelを抽出
// ========================================
function extractModelFromTitle(title: string): string | null {
  if (!title) return null
  
  // モデル番号パターン（例: ABC-123, XYZ123, Model 123）
  const modelPatterns = [
    /\b([A-Z]{2,4}[-\s]?\d{3,4}[A-Z]?)\b/i,
    /\bModel[\s:]+([\w\-]+)/i,
    /\b(Ver\.?\s*\d+\.?\d*)\b/i,
  ]
  
  for (const pattern of modelPatterns) {
    const match = title.match(pattern)
    if (match) return match[1].trim()
  }
  
  return null
}

// ========================================
// ヘルパー関数: タイトルからBrandを抽出
// ========================================
function extractBrandFromTitle(title: string): string | null {
  if (!title) return null
  
  // 有名ブランドのリスト
  const brands = [
    'Nintendo', 'Sony', 'Microsoft', 'Apple', 'Samsung',
    'Bandai', 'Takara', 'Tomy', 'Good Smile', 'Kotobukiya',
    'Pokemon', 'Disney', 'Marvel', 'Star Wars', 'LEGO',
    'Funko', 'Hasbro', 'Mattel', 'Hot Wheels', 'Barbie'
  ]
  
  const lowerTitle = title.toLowerCase()
  
  for (const brand of brands) {
    if (lowerTitle.includes(brand.toLowerCase())) {
      return brand
    }
  }
  
  return null
}

// ========================================
// ヘルパー関数: タイトルからColorを抽出
// ========================================
function extractColorFromTitle(title: string): string | null {
  if (!title) return null
  
  const colors = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow',
    'Pink', 'Purple', 'Orange', 'Gray', 'Silver', 'Gold',
    '黒', '白', '赤', '青', '緑', '黄', 'ピンク', '紫'
  ]
  
  const lowerTitle = title.toLowerCase()
  
  for (const color of colors) {
    if (lowerTitle.includes(color.toLowerCase())) {
      return color
    }
  }
  
  return null
}

// ========================================
// ヘルパー関数: タイトルからSizeを抽出
// ========================================
function extractSizeFromTitle(title: string): string | null {
  if (!title) return null
  
  // サイズパターン
  const sizePatterns = [
    /\b(XS|S|M|L|XL|XXL|XXXL)\b/i,
    /\b(\d+)\s*(cm|mm|inch|in|")\b/i,
    /\b(Small|Medium|Large|Extra Large)\b/i,
  ]
  
  for (const pattern of sizePatterns) {
    const match = title.match(pattern)
    if (match) return match[0].trim()
  }
  
  return null
}

// ========================================
// ヘルパー関数: タイトルからMaterialを抽出
// ========================================
function extractMaterialFromTitle(title: string): string | null {
  if (!title) return null
  
  const materials = [
    'Plastic', 'Metal', 'Wood', 'Glass', 'Ceramic',
    'Cotton', 'Polyester', 'Leather', 'Rubber', 'Silicone',
    'プラスチック', '金属', '木', 'ガラス', '陶器', '綿', 'レザー'
  ]
  
  const lowerTitle = title.toLowerCase()
  
  for (const material of materials) {
    if (lowerTitle.includes(material.toLowerCase())) {
      return material
    }
  }
  
  return null
}
