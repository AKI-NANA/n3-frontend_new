// lib/supabase/products.ts
import { createClient } from '@/lib/supabase/client'
import type { Product, ProductUpdate } from '@/app/tools/editing/types/product'

const supabase = createClient()

export async function fetchProducts(limit = 100, offset = 0) {
  const { data, error, count } = await supabase
    .from('yahoo_scraped_products')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching products:', error)
    throw error
  }

  return { products: data as Product[], total: count || 0 }
}

export async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from('yahoo_scraped_products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProduct(id: string, updates: ProductUpdate) {
  const { data, error } = await supabase
    .from('yahoo_scraped_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProducts(updates: { id: string; data: ProductUpdate }[]) {
  const results = await Promise.allSettled(
    updates.map(({ id, data }) => updateProduct(id, data))
  )

  const success = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason.message)

  return { success, failed, errors }
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('yahoo_scraped_products')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function deleteProducts(ids: string[]) {
  const { error } = await supabase
    .from('yahoo_scraped_products')
    .delete()
    .in('id', ids)

  if (error) throw error
}

// カテゴリ取得処理（モック）
export async function fetchCategories(itemIds: string[]) {
  // 実際のAPI実装に置き換え
  await new Promise(resolve => setTimeout(resolve, 1000))
  return itemIds.map(id => ({
    item_id: id,
    category_name: 'Electronics',
    category_number: '12345'
  }))
}

// 送料計算（モック）
export async function calculateShipping(products: Product[]) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return products.map(p => ({
    id: p.id,
    shipping_service: 'ePacket',
    shipping_cost_usd: 8.50,
    shipping_policy: 'Standard Shipping'
  }))
}

// 利益計算
export async function calculateProfit(products: Product[], exchangeRate = 150) {
  return products.map(p => {
    if (!p.acquired_price_jpy) return { id: p.id }
    
    const usd = p.acquired_price_jpy / exchangeRate
    return {
      id: p.id,
      ddp_price_usd: parseFloat((usd * 1.2).toFixed(2)),
      ddu_price_usd: parseFloat((usd * 1.15).toFixed(2))
    }
  })
}

// HTML生成（モック）
export async function generateHTML(products: Product[]) {
  await new Promise(resolve => setTimeout(resolve, 2000))
  return products.map(p => ({
    id: p.id,
    html_description: `<h1>${p.title}</h1><p>Condition: ${p.condition}</p>`,
    html_applied: true
  }))
}

// SellerMirror分析（モック）
export async function analyzeWithSellerMirror(products: Product[]) {
  await new Promise(resolve => setTimeout(resolve, 2000))
  return products.map(p => ({
    id: p.id,
    sm_competitors: Math.floor(Math.random() * 30) + 5,
    sm_min_price_usd: parseFloat((Math.random() * 200 + 50).toFixed(2)),
    sm_profit_margin: parseFloat((Math.random() * 30 - 10).toFixed(1)),
    sm_analyzed_at: new Date().toISOString()
  }))
}

// スコア計算
export async function calculateScores(products: Product[]) {
  return products.map(p => {
    let score = 50

    // 画像があればプラス
    if (p.image_count > 0) score += 10
    if (p.image_count >= 5) score += 10

    // サイズ情報があればプラス
    if (p.length_cm && p.width_cm && p.height_cm && p.weight_g) score += 15

    // HTMLがあればプラス
    if (p.html_applied) score += 10

    // SellerMirror分析済みならプラス
    if (p.sm_analyzed_at) score += 10

    // 利益率が高ければプラス
    if (p.sm_profit_margin && p.sm_profit_margin > 15) score += 15
    else if (p.sm_profit_margin && p.sm_profit_margin > 5) score += 10

    return {
      id: p.id,
      listing_score: Math.min(100, score),
      score_calculated_at: new Date().toISOString()
    }
  })
}
