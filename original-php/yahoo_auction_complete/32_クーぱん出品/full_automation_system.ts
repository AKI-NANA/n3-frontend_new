// ========================================
// 完全自動化システム - メインオーケストレーター
// supabase/functions/auto-orchestrator/index.ts
// ========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AutomationConfig {
  minProfitMargin: number;
  maxCompetitorPriceDiff: number;
  autoListingEnabled: boolean;
  autoStockSyncEnabled: boolean;
  autoPricingEnabled: boolean;
  excludeCategories?: string[];
  maxDailyListings?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 1. 全ユーザーの自動化設定取得
    const { data: users } = await supabase
      .from('profiles')
      .select('id, auto_sync_enabled, default_profit_margin')
      .eq('auto_sync_enabled', true)

    const automationResults = []

    for (const user of users || []) {
      console.log(`🤖 Starting automation for user: ${user.id}`)
      
      try {
        const userResult = await runUserAutomation(supabase, user.id, {
          minProfitMargin: user.default_profit_margin,
          maxCompetitorPriceDiff: 10000, // 10,000 KRW
          autoListingEnabled: true,
          autoStockSyncEnabled: true,
          autoPricingEnabled: true,
          maxDailyListings: 50
        })

        automationResults.push({
          userId: user.id,
          status: 'success',
          ...userResult
        })

      } catch (error) {
        console.error(`❌ Automation failed for user ${user.id}:`, error)
        automationResults.push({
          userId: user.id,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedUsers: users?.length || 0,
        results: automationResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('🚨 Orchestrator error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// ========================================
// ユーザー別自動化実行
// ========================================
async function runUserAutomation(supabase: any, userId: string, config: AutomationConfig) {
  const results = {
    newProductsListed: 0,
    pricesUpdated: 0,
    stockSynced: 0,
    ordersProcessed: 0,
    errors: []
  }

  // 1. 新商品の自動出品
  if (config.autoListingEnabled) {
    try {
      const newListings = await autoListNewProducts(supabase, userId, config)
      results.newProductsListed = newListings.count
      results.errors.push(...newListings.errors)
    } catch (error) {
      results.errors.push(`Auto listing failed: ${error.message}`)
    }
  }

  // 2. 価格自動更新
  if (config.autoPricingEnabled) {
    try {
      const priceUpdates = await autoUpdatePrices(supabase, userId, config)
      results.pricesUpdated = priceUpdates.count
      results.errors.push(...priceUpdates.errors)
    } catch (error) {
      results.errors.push(`Auto pricing failed: ${error.message}`)
    }
  }

  // 3. 在庫自動同期
  if (config.autoStockSyncEnabled) {
    try {
      const stockSync = await autoSyncStock(supabase, userId)
      results.stockSynced = stockSync.count
      results.errors.push(...stockSync.errors)
    } catch (error) {
      results.errors.push(`Stock sync failed: ${error.message}`)
    }
  }

  // 4. 新規注文自動処理
  try {
    const orderProcessing = await autoProcessNewOrders(supabase, userId)
    results.ordersProcessed = orderProcessing.count
    results.errors.push(...orderProcessing.errors)
  } catch (error) {
    results.errors.push(`Order processing failed: ${error.message}`)
  }

  return results
}

// ========================================
// 1. 新商品自動出品
// ========================================
async function autoListNewProducts(supabase: any, userId: string, config: AutomationConfig) {
  const results = { count: 0, errors: [] }

  // 出品可能な商品を取得（draft状態で利益率が条件を満たすもの）
  const { data: draftProducts } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .eq('coupang_listing_status', 'draft')
    .eq('is_active', true)
    .gte('profit_margin', config.minProfitMargin)
    .eq('amazon_stock_status', 'in_stock')
    .limit(config.maxDailyListings || 50)

  for (const product of draftProducts || []) {
    try {
      // 利益性チェック
      if (!await isProfitable(product, config.minProfitMargin)) {
        continue
      }

      // 競合価格チェック
      const competitorPrices = await checkCompetitorPrices(product.product_name)
      if (competitorPrices.length > 0) {
        const minCompetitorPrice = Math.min(...competitorPrices)
        if (product.selling_price_krw > minCompetitorPrice + config.maxCompetitorPriceDiff) {
          // 価格を競合レベルまで調整
          const adjustedPrice = Math.floor(minCompetitorPrice * 0.95) // 5%安く設定
          const newPricing = await recalculatePrice(product, adjustedPrice)
          
          if (newPricing.profit_margin_percent < config.minProfitMargin) {
            console.log(`❌ Product ${product.id}: 調整後も利益率不足`)
            continue
          }

          // 価格更新
          await supabase
            .from('products')
            .update({
              selling_price_krw: adjustedPrice,
              profit_margin: newPricing.profit_margin_percent
            })
            .eq('id', product.id)
        }
      }

      // 韓国語翻訳（未翻訳の場合）
      let productNameKr = product.product_name_kr
      if (!productNameKr) {
        productNameKr = await translateToKorean(product.product_name)
      }

      // カテゴリマッピング
      const coupangCategoryId = await mapToCoupangCategory(product.amazon_category)
      
      // Coupang出品
      const listingResult = await listProductOnCoupang({
        productId: product.id,
        productNameKr,
        categoryId: coupangCategoryId,
        sellingPrice: product.selling_price_krw,
        description: await generateProductDescription(product),
        images: product.images || [],
        brand: product.brand,
        weight: product.weight_kg,
        dimensions: product.dimensions
      })

      if (listingResult.success) {
        // 出品成功 - ステータス更新
        await supabase
          .from('products')
          .update({
            coupang_product_id: listingResult.productId,
            coupang_listing_status: 'listed',
            product_name_kr: productNameKr,
            coupang_category_id: coupangCategoryId,
            coupang_data: listingResult.coupangData
          })
          .eq('id', product.id)

        results.count++
        console.log(`✅ Listed product: ${product.product_name}`)

      } else {
        results.errors.push(`Failed to list ${product.product_name}: ${listingResult.error}`)
      }

      // API制限対応 - 2秒間隔
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      results.errors.push(`Product ${product.id}: ${error.message}`)
    }
  }

  return results
}

// ========================================
// 2. 価格自動更新
// ========================================
async function autoUpdatePrices(supabase: any, userId: string, config: AutomationConfig) {
  const results = { count: 0, errors: [] }

  // 出品中の商品の価格チェック
  const { data: listedProducts } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .eq('coupang_listing_status', 'listed')
    .eq('auto_sync', true)

  const currentExchangeRate = await getCurrentExchangeRate()

  for (const product of listedProducts || []) {
    try {
      // Amazon価格の変動チェック
      const latestAmazonData = await fetchAmazonProductData(product.amazon_asin)
      
      if (!latestAmazonData || latestAmazonData.price === product.amazon_price) {
        continue // 価格変更なし
      }

      // 新しい販売価格計算
      const newPricing = await supabase.rpc('calculate_selling_price', {
        amazon_price_usd: latestAmazonData.price,
        exchange_rate: currentExchangeRate,
        profit_margin_percent: config.minProfitMargin,
        shipping_cost_usd: calculateShippingCost(product.weight_kg, product.dimensions)
      })

      // 利益率チェック
      if (newPricing.data.profit_margin_percent < config.minProfitMargin) {
        console.log(`⚠️ Product ${product.id}: 新価格では利益率不足`)
        continue
      }

      // 競合価格チェック
      const competitorPrices = await checkCompetitorPrices(product.product_name_kr || product.product_name)
      let finalPrice = newPricing.data.final_price_krw

      if (competitorPrices.length > 0) {
        const avgCompetitorPrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
        
        // 競合平均より高い場合は調整
        if (finalPrice > avgCompetitorPrice + config.maxCompetitorPriceDiff) {
          finalPrice = Math.floor(avgCompetitorPrice * 0.98) // 2%安く設定
          
          // 調整後の利益率再計算
          const adjustedProfitMargin = ((finalPrice - newPricing.data.subtotal_krw - (finalPrice * 0.12)) / finalPrice) * 100
          
          if (adjustedProfitMargin < config.minProfitMargin) {
            console.log(`❌ Product ${product.id}: 競合調整後も利益率不足`)
            continue
          }
        }
      }

      // 商品情報更新
      await supabase
        .from('products')
        .update({
          amazon_price: latestAmazonData.price,
          selling_price_krw: finalPrice,
          profit_margin: newPricing.data.profit_margin_percent,
          amazon_stock_status: latestAmazonData.availability,
          amazon_data: latestAmazonData
        })
        .eq('id', product.id)

      // Coupang価格更新
      if (product.coupang_product_id) {
        await updateCoupangPrice(product.coupang_product_id, finalPrice)
      }

      results.count++
      console.log(`💰 Updated price for: ${product.product_name} (${product.amazon_price} → ${latestAmazonData.price})`)

    } catch (error) {
      results.errors.push(`Price update failed for ${product.id}: ${error.message}`)
    }

    // API制限対応
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  return results
}

// ========================================
// 3. 在庫自動同期
// ========================================
async function autoSyncStock(supabase: any, userId: string) {
  const results = { count: 0, errors: [] }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .eq('coupang_listing_status', 'listed')
    .eq('auto_sync', true)

  for (const product of products || []) {
    try {
      const amazonData = await fetchAmazonProductData(product.amazon_asin)
      
      if (!amazonData) {
        continue
      }

      const oldStockStatus = product.amazon_stock_status
      const newStockStatus = amazonData.availability

      // 在庫状態に変化があった場合
      if (oldStockStatus !== newStockStatus) {
        
        if (newStockStatus === 'out_of_stock') {
          // 在庫切れ → Coupang出品一時停止
          await pauseCoupangListing(product.coupang_product_id)
          
          await supabase
            .from('products')
            .update({
              amazon_stock_status: newStockStatus,
              coupang_listing_status: 'paused',
              amazon_data: amazonData
            })
            .eq('id', product.id)

          console.log(`⏸️ Paused listing for out-of-stock: ${product.product_name}`)

        } else if (newStockStatus === 'in_stock' && oldStockStatus === 'out_of_stock') {
          // 在庫復活 → Coupang出品再開
          await resumeCoupangListing(product.coupang_product_id)
          
          await supabase
            .from('products')
            .update({
              amazon_stock_status: newStockStatus,
              coupang_listing_status: 'listed',
              amazon_data: amazonData
            })
            .eq('id', product.id)

          console.log(`▶️ Resumed listing for restocked: ${product.product_name}`)
        }

        results.count++
      }

    } catch (error) {
      results.errors.push(`Stock sync failed for ${product.id}: ${error.message}`)
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return results
}

// ========================================
// 4. 新規注文自動処理
// ========================================
async function autoProcessNewOrders(supabase: any, userId: string) {
  const results = { count: 0, errors: [] }

  // 処理待ちの注文取得
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select(`
      *,
      products (
        amazon_asin,
        amazon_price,
        weight_kg,
        dimensions,
        fulfillment_method
      )
    `)
    .eq('user_id', userId)
    .eq('order_status', 'received')

  for (const order of pendingOrders || []) {
    try {
      // 自動処理設定の商品のみ
      if (order.products?.fulfillment_method !== 'auto') {
        continue
      }

      // Amazon在庫確認
      const amazonData = await fetchAmazonProductData(order.products.amazon_asin)
      if (!amazonData || amazonData.availability !== 'in_stock') {
        // 在庫切れの場合は注文キャンセル処理
        await handleOutOfStockOrder(supabase, order.id)
        continue
      }

      // Amazon注文処理
      const amazonOrderResult = await placeAmazonOrder({
        asin: order.products.amazon_asin,
        quantity: order.quantity,
        shippingAddress: order.shipping_address,
        expeditedShipping: true // 韓国配送のため高速配送
      })

      if (amazonOrderResult.success) {
        // 注文成功 - 情報更新
        const shippingCostUSD = calculateShippingCost(
          order.products.weight_kg * order.quantity,
          order.products.dimensions
        )
        
        const exchangeRate = await getCurrentExchangeRate()
        const costUSD = (order.products.amazon_price * order.quantity) + shippingCostUSD
        const costKRW = costUSD * exchangeRate
        const coupangFeeKRW = order.total_amount_krw * 0.12
        const profitKRW = order.total_amount_krw - costKRW - coupangFeeKRW

        await supabase
          .from('orders')
          .update({
            amazon_order_id: amazonOrderResult.orderId,
            amazon_order_item_id: amazonOrderResult.orderItemId,
            order_status: 'amazon_ordered',
            amazon_order_date: new Date().toISOString(),
            shipping_cost_usd: shippingCostUSD,
            cost_usd: costUSD,
            shipping_cost_krw: costKRW,
            coupang_fee_krw: coupangFeeKRW,
            profit_krw: profitKRW
          })
          .eq('id', order.id)

        // Coupang에 처리 상태 업데이트
        await updateCoupangOrderStatus(order.coupang_order_id, 'PREPARING')

        results.count++
        console.log(`📦 Auto-fulfilled order: ${order.coupang_order_id}`)

      } else {
        // Amazon注문 실패 - 수동 처리로 변경
        await supabase
          .from('orders')
          .update({
            order_status: 'manual_required',
            fulfillment_method: 'manual',
            notes: `Auto fulfillment failed: ${amazonOrderResult.error}`
          })
          .eq('id', order.id)

        results.errors.push(`Order ${order.coupang_order_id}: ${amazonOrderResult.error}`)
      }

    } catch (error) {
      results.errors.push(`Order processing failed for ${order.id}: ${error.message}`)
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return results
}

// ========================================
// ヘルパー関数
// ========================================

async function isProfitable(product: any, minProfitMargin: number): Promise<boolean> {
  const currentExchangeRate = await getCurrentExchangeRate()
  const shippingCost = calculateShippingCost(product.weight_kg, product.dimensions)
  
  const baseCostKRW = (product.amazon_price + shippingCost) * currentExchangeRate
  const coupangFeeKRW = product.selling_price_krw * 0.12
  const profitKRW = product.selling_price_krw - baseCostKRW - coupangFeeKRW
  const actualProfitMargin = (profitKRW / product.selling_price_krw) * 100
  
  return actualProfitMargin >= minProfitMargin
}

async function checkCompetitorPrices(productName: string): Promise<number[]> {
  try {
    // Coupang 상품 검색 API로 경쟁사 가격 조회
    const response = await fetch(`https://api-gateway.coupang.com/v2/providers/marketplace/product-search?keyword=${encodeURIComponent(productName)}`, {
      headers: {
        'Authorization': await generateCoupangAuth(),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.products?.slice(0, 5).map((p: any) => p.sellingPrice) || []

  } catch (error) {
    console.error('Failed to check competitor prices:', error)
    return []
  }
}

async function translateToKorean(text: string): Promise<string> {
  try {
    const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY')
    if (!apiKey) return text + ' (번역 필요)'

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'ko',
        format: 'text'
      })
    })

    const result = await response.json()
    return result.data.translations[0].translatedText

  } catch (error) {
    console.error('Translation failed:', error)
    return text + ' (번역 실패)'
  }
}

async function generateProductDescription(product: any): Promise<string> {
  const features = []
  
  if (product.brand) features.push(`🏷️ 브랜드: ${product.brand}`)
  if (product.weight_kg) features.push(`📦 무게: ${product.weight_kg}kg`)
  if (product.amazon_data?.rating) features.push(`⭐ 아마존 평점: ${product.amazon_data.rating}/5`)
  
  features.push('🚚 미국 직배송')
  features.push('✅ 정품 보장')
  features.push('🔄 교환/반품 가능')

  return [
    product.product_name_kr || product.product_name,
    '',
    '✨ 상품 특징:',
    ...features,
    '',
    '📍 배송 정보:',
    '• 배송기간: 5-7일 (DHL Express)',
    '• 관세 포함 가격',
    '• 추적번호 제공'
  ].join('\n')
}

async function mapToCoupangCategory(amazonCategory: string): Promise<string> {
  const categoryMapping: Record<string, string> = {
    'Electronics': '1001',
    'Home & Garden': '1004',
    'Sports & Outdoors': '1006',
    'Books': '1007',
    'Beauty & Personal Care': '1008',
    'Health & Household': '1009',
    'Tools & Home Improvement': '1010'
  }

  return categoryMapping[amazonCategory] || '1001' // 기본값: 전자제품
}

async function handleOutOfStockOrder(supabase: any, orderId: string) {
  await supabase
    .from('orders')
    .update({
      order_status: 'cancelled',
      notes: 'Amazon 재고 부족으로 인한 자동 취소'
    })
    .eq('id', orderId)

  // Coupang에 취소 통지 (실제로는 고객 서비스 팀이 처리)
  console.log(`❌ Order ${orderId} cancelled due to Amazon stock shortage`)
}

// 이미 정의된 함수들 (이전 artifacts에서)
async function getCurrentExchangeRate(): Promise<number> { /* ... */ }
async function fetchAmazonProductData(asin: string): Promise<any> { /* ... */ }
async function calculateShippingCost(weight: number, dimensions: any): Promise<number> { /* ... */ }
async function listProductOnCoupang(data: any): Promise<any> { /* ... */ }
async function updateCoupangPrice(productId: string, price: number): Promise<boolean> { /* ... */ }
async function pauseCoupangListing(productId: string): Promise<boolean> { /* ... */ }
async function resumeCoupangListing(productId: string): Promise<boolean> { /* ... */ }
async function placeAmazonOrder(data: any): Promise<any> { /* ... */ }
async function updateCoupangOrderStatus(orderId: string, status: string): Promise<boolean> { /* ... */ }
async function generateCoupangAuth(): Promise<string> { /* ... */ }
async function recalculatePrice(product: any, targetPrice: number): Promise<any> { /* ... */ }