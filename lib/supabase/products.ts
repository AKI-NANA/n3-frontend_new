// lib/supabase/products.ts
import { createClient } from '@/lib/supabase/client'
import type { Product, ProductUpdate } from '@/app/tools/editing/types/product'

const supabase = createClient()

export async function fetchProducts(limit = 100, offset = 0) {
  // 🔧 修正: yahoo_scraped_products → products に変更
  // EU責任者情報フィールドを含むすべてのカラムを取得
  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching products:', error)
    throw error
  }

  console.log('📦 Fetched products with EU data:', data?.length || 0)
  
  // デバッグ: 最初の商品のEU情報を確認
  if (data && data.length > 0) {
    console.log('🇪🇺 First product EU info:', {
      company: data[0].eu_responsible_company_name,
      city: data[0].eu_responsible_city,
      country: data[0].eu_responsible_country
    })
  }

  // 各商品の出品履歴を取得（エラーが出ても続行）
  const productsWithHistory = await Promise.all(
    (data || []).map(async (product) => {
      try {
        const { data: history, error } = await supabase
          .from('listing_history')
          .select('marketplace, account, listing_id, status, error_message, listed_at')
          .eq('product_id', product.id)
          .order('listed_at', { ascending: false })
          .limit(5)
        
        if (error) {
          console.warn('⚠️ listing_history取得エラー（スキップ）:', error.message);
          return {
            ...product,
            listing_history: []
          }
        }
        
        return {
          ...product,
          listing_history: history || []
        }
      } catch (err) {
        console.warn('⚠️ listing_history取得エラー（スキップ）:', err);
        return {
          ...product,
          listing_history: []
        }
      }
    })
  )

  return { products: productsWithHistory as Product[], total: count || 0 }
}

export async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  
  // デバッグ出力
  console.log('📦 Fetched product by ID:', id)
  console.log('🇪🇺 EU info:', {
    company: data.eu_responsible_company_name,
    city: data.eu_responsible_city,
    country: data.eu_responsible_country
  })
  
  return data as Product
}

export async function updateProduct(id: string | number, updates: ProductUpdate) {
  // IDを文字列に正規化（UUIDは文字列のまま）
  const normalizedId = String(id)
  
  console.log('💾 保存しようとしているデータ:', { id: normalizedId, updates })
  
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', normalizedId)
    .select()
    .single()

  if (error) {
    console.error('❌ Supabaseエラー:', error)
    throw error
  }
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
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function deleteProducts(ids: string[]) {
  const { error } = await supabase
    .from('products')
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

    // 🇪🇺 EU情報があればプラス
    if (p.eu_responsible_company_name && p.eu_responsible_company_name !== 'N/A') {
      score += 5
    }

    return {
      id: p.id,
      listing_score: Math.min(100, score),
      score_calculated_at: new Date().toISOString()
    }
  })
}
