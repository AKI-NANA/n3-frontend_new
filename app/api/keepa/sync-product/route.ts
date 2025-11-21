/**
 * Keepa Product Sync API
 * POST /api/keepa/sync-product
 * Body: { asin: string, domain?: number, productId?: string }
 *
 * Purpose: products_masterとKeepaデータを同期し、P-4/P-1スコアを計算・保存
 */

import { NextRequest, NextResponse } from 'next/server'
import { keepaClient } from '@/lib/keepa/keepa-api-client'
import { createClient } from '@/lib/supabase/server'
import type { KeepaProduct } from '@/types/keepa'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asin, domain = 1, productId } = body

    if (!asin) {
      return NextResponse.json(
        { error: 'asin is required' },
        { status: 400 }
      )
    }

    // Keepaデータ取得
    const keepaProduct = await keepaClient.getProduct(asin, domain)

    if (!keepaProduct) {
      return NextResponse.json(
        { error: 'Product not found in Keepa' },
        { status: 404 }
      )
    }

    // P-4/P-1スコア計算
    const combined = keepaClient.calculateCombinedScore(keepaProduct)

    // Supabaseクライアント作成
    const supabase = createClient()

    // products_masterへのデータ準備
    const productData = {
      asin: keepaProduct.asin,
      keepa_domain: keepaProduct.domainId,

      // P-4スコア
      p4_total_score: combined.p4Score.totalScore,
      p4_stock_out_frequency: combined.p4Score.stockOutFrequency,
      p4_price_increase: combined.p4Score.priceIncrease,
      p4_bsr_volatility: combined.p4Score.bsrVolatility,
      p4_current_opportunity: combined.p4Score.currentOpportunity,
      p4_recommendation: combined.p4Score.recommendation,

      // P-1スコア
      p1_total_score: combined.p1Score.totalScore,
      p1_price_drop_percentage: combined.p1Score.priceDropPercentage,
      p1_drop_speed: combined.p1Score.dropSpeed,
      p1_historical_stability: combined.p1Score.historicalStability,
      p1_sales_rank_quality: combined.p1Score.salesRankQuality,
      p1_recommendation: combined.p1Score.recommendation,

      // 統合スコア
      primary_strategy: combined.primaryStrategy,
      primary_score: combined.primaryScore,
      should_purchase: combined.shouldPurchase,
      urgency: combined.urgency,

      // BSR
      current_bsr: keepaProduct.stats?.current?.[3] || null,
      avg_bsr_30d: keepaProduct.stats?.avg30?.[3] || null,
      avg_bsr_90d: keepaProduct.stats?.avg90?.[3] || null,
      bsr_category: keepaProduct.categoryTree?.[0]?.name || null,

      // 価格
      current_amazon_price: keepaProduct.stats?.current?.[0] ? keepaProduct.stats.current[0] / 100 : null,
      avg_amazon_price_30d: keepaProduct.stats?.avg30?.[0] ? keepaProduct.stats.avg30[0] / 100 : null,
      avg_amazon_price_90d: keepaProduct.stats?.avg90?.[0] ? keepaProduct.stats.avg90[0] / 100 : null,
      min_amazon_price_90d: keepaProduct.stats?.min?.[0] ? keepaProduct.stats.min[0] / 100 : null,
      max_amazon_price_90d: keepaProduct.stats?.max?.[0] ? keepaProduct.stats.max[0] / 100 : null,

      // 在庫状態
      is_in_stock: keepaProduct.stats?.current?.[0] !== -1,
      stock_out_count_90d: calculateStockOutCount(keepaProduct),
      last_stock_out_date: findLastStockOutDate(keepaProduct),
      last_restock_date: findLastRestockDate(keepaProduct),

      // レビュー
      review_count: keepaProduct.reviewsCount || null,
      review_rating: keepaProduct.rating ? keepaProduct.rating / 10 : null,

      // Keepa生データ
      keepa_data: keepaProduct,
      keepa_last_updated: new Date().toISOString(),

      // 基本情報（新規の場合）
      title: keepaProduct.title || null,
      images: keepaProduct.imagesCSV ? [keepaProduct.imagesCSV.split(',')[0]] : null,
      primary_image: keepaProduct.imagesCSV ? keepaProduct.imagesCSV.split(',')[0] : null,
      updated_at: new Date().toISOString()
    }

    let result

    if (productId) {
      // 既存商品を更新
      const { data, error } = await supabase
        .from('products_master')
        .update(productData)
        .eq('id', productId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update product:', error)
        return NextResponse.json(
          { error: 'Failed to update product in database' },
          { status: 500 }
        )
      }

      result = data
    } else {
      // ASINで既存商品を検索
      const { data: existing, error: searchError } = await supabase
        .from('products_master')
        .select('id')
        .eq('asin', asin)
        .eq('keepa_domain', domain)
        .maybeSingle()

      if (searchError) {
        console.error('Failed to search existing product:', searchError)
      }

      if (existing) {
        // 更新
        const { data, error } = await supabase
          .from('products_master')
          .update(productData)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('Failed to update existing product:', error)
          return NextResponse.json(
            { error: 'Failed to update product in database' },
            { status: 500 }
          )
        }

        result = data
      } else {
        // 新規作成
        const { data, error } = await supabase
          .from('products_master')
          .insert({
            ...productData,
            source_table: 'keepa',
            source_id: asin,
            status: 'active',
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Failed to create product:', error)
          return NextResponse.json(
            { error: 'Failed to create product in database' },
            { status: 500 }
          )
        }

        result = data
      }
    }

    return NextResponse.json({
      success: true,
      product: result,
      scores: combined,
      message: 'Product synced successfully with Keepa data'
    })
  } catch (error) {
    console.error('Keepa sync API error:', error)
    return NextResponse.json(
      { error: 'Failed to sync product with Keepa' },
      { status: 500 }
    )
  }
}

/**
 * 90日間の在庫切れ回数を計算
 */
function calculateStockOutCount(product: KeepaProduct): number {
  if (!product.csv || !product.csv[0]) return 0

  const priceHistory = product.csv[0]
  let stockOutCount = 0

  for (let i = 0; i < priceHistory.length; i += 2) {
    const price = priceHistory[i + 1]
    if (price === -1) {
      stockOutCount++
    }
  }

  return stockOutCount
}

/**
 * 最終在庫切れ日を検出
 */
function findLastStockOutDate(product: KeepaProduct): string | null {
  if (!product.csv || !product.csv[0]) return null

  const priceHistory = product.csv[0]

  for (let i = priceHistory.length - 2; i >= 0; i -= 2) {
    const price = priceHistory[i + 1]
    if (price === -1) {
      const keepaMinutes = priceHistory[i]
      return keepaTimeToDate(keepaMinutes).toISOString()
    }
  }

  return null
}

/**
 * 最終再入荷日を検出
 */
function findLastRestockDate(product: KeepaProduct): string | null {
  if (!product.csv || !product.csv[0]) return null

  const priceHistory = product.csv[0]
  let wasOutOfStock = false

  for (let i = priceHistory.length - 2; i >= 0; i -= 2) {
    const price = priceHistory[i + 1]

    if (wasOutOfStock && price > 0) {
      const keepaMinutes = priceHistory[i]
      return keepaTimeToDate(keepaMinutes).toISOString()
    }

    wasOutOfStock = price === -1
  }

  return null
}

/**
 * Keepa時間をJavaScript Dateに変換
 */
function keepaTimeToDate(keepaMinutes: number): Date {
  const keepaEpoch = new Date('2011-01-01T00:00:00Z').getTime()
  return new Date(keepaEpoch + keepaMinutes * 60 * 1000)
}
