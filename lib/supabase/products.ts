// lib/supabase/products.ts
import { createClient } from '@/lib/supabase/client'
import type { Product, ProductUpdate } from '@/app/tools/editing/types/product'

const supabase = createClient()

export async function fetchProducts(limit = 100, offset = 0) {
  // 🚾 デバッグ: 単一商品でテスト
  console.log('🔍 fetchProducts called with:', { limit, offset })
  
  // テスト: YAH-409933のデータを直接取得
  const { data: debugData, error: debugError } = await supabase
    .from('products_master')
    .select('id, sku, profit_margin_percent, profit_amount_usd, listing_data')
    .eq('sku', 'YAH-409933')
    .single()

  if (debugError) {
    console.error('❌ DEBUG: Single SKU Fetch Error:', debugError)
  } else {
    console.log('✅ DEBUG: Raw Supabase response for YAH-409933:')
    console.log('  profit_margin_percent:', debugData?.profit_margin_percent, typeof debugData?.profit_margin_percent)
    console.log('  profit_amount_usd:', debugData?.profit_amount_usd, typeof debugData?.profit_amount_usd)
    console.log('  listing_data.ddp_price_usd:', debugData?.listing_data?.ddp_price_usd)
    console.log('  Full object keys:', Object.keys(debugData || {}))
  }

  // ✅ products_master テーブルから取得（統合マスター）
  const { data, error, count } = await supabase
    .from('products_master')
    .select(`
      *,
      profit_margin_percent::text,
      profit_amount_usd,
      default_profit_margin,
      default_profit_amount_usd
    `, { count: 'exact', head: false }) // 🔥 head: false でキャッシュ無効化
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

  // 🔥 DBのカラム名をフロントエンドのカラム名にマッピング
  const mappedData = (data || []).map(product => {
    // 🔥 デバッグ: titleとtitle_enを確認
    if (product.id === 13 || product.id === 322) {
      console.log(`🔍 ID=${product.id}の商品データ(Supabaseから取得):`, {
        DB_title: product.title,
        DB_title_en: product.title_en,
        DB_english_title: product.english_title,
        DB_description: product.description?.substring(0, 30),
        DB_description_en: product.description_en?.substring(0, 30)
      });
    }
    
    const mapped = {
      ...product,
      // 🔥 titleはそのまま使用（日本語タイトル）
      // 🔥 title_en → english_title にマッピング
      english_title: product.title_en || product.english_title,
      english_description: product.description_en || product.english_description,
      english_condition: product.listing_data?.condition_en || product.english_condition,
    };
    
    // 🚾 デバッグ: YAH-409933のマッピング後データを確認
    if (product.sku === 'YAH-409933') {
      console.log('🚾 Mapping YAH-409933:')
      console.log('  Before mapping profit_margin_percent:', product.profit_margin_percent)
      console.log('  After mapping profit_margin_percent:', mapped.profit_margin_percent)
      console.log('  Mapped keys:', Object.keys(mapped).filter(k => k.includes('profit')))
    }
    
    if (product.id === 13 || product.id === 322) {
      console.log(`🔍 ID=${product.id}のマッピング後データ:`, {
        title: mapped.title,
        english_title: mapped.english_title
      });
    }
    
    return mapped;
  });

  // 各商品の出品履歴を取得（エラーが出ても続行）
  const productsWithHistory = await Promise.all(
    mappedData.map(async (product) => {
      try {
        // 🔥 SKUを使用して検索（UUID/INTEGER型の問題を回避）
        if (!product.sku) {
          return {
            ...product,
            listing_history: []
          }
        }
        
        // 🔥 listing_historyテーブルのカラム構造を確認
        // まずskuで試し、失敗したらproduct_idで試す
        let historyData = null
        let historyError = null
        
        // 試行1: skuカラムが存在する場合
        const skuResult = await supabase
          .from('listing_history')
          .select('marketplace, account, listing_id, status, error_message, listed_at')
          .eq('sku', product.sku)
          .order('listed_at', { ascending: false })
          .limit(5)
        
        if (!skuResult.error) {
          historyData = skuResult.data
        } else if (skuResult.error.message?.includes('does not exist')) {
          // 試行2: product_idカラムを使用
          const idResult = await supabase
            .from('listing_history')
            .select('marketplace, account, listing_id, status, error_message, listed_at')
            .eq('product_id', product.id)
            .order('listed_at', { ascending: false })
            .limit(5)
          
          if (!idResult.error) {
            historyData = idResult.data
          } else {
            historyError = idResult.error
          }
        } else {
          historyError = skuResult.error
        }
        
        if (historyError) {
          // エラーが出ても続行（警告のみ)
          console.warn('⚠️ listing_history取得エラー（スキップ）:', historyError.message)
          return {
            ...product,
            listing_history: []
          }
        }
        
        return {
          ...product,
          listing_history: historyData || []
        }
      } catch (err) {
        // エラーが出ても続行
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
    .from('products_master')
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
  
  // 🔥 DBのカラム名をフロントエンドのカラム名にマッピング
  const mappedData = {
    ...data,
    english_title: data.title_en, // title_en → english_title
  }
  
  return mappedData as Product
}

/**
 * 🔥 JSONB型フィールドを正しく処理する関数
 * 
 * products_masterテーブルには以下のJSONBカラムがあります:
 * - listing_data: { height_cm, width_cm, length_cm, weight_g, etc. }
 * - scraped_data: { item_id, url, seller_id, etc. }
 * - ebay_api_data: eBay APIからの生データ
 * - images: 画像URL配列
 * - image_urls: 画像URL配列
 * 
 * これらのフィールドは、フロントエンドから送られてきた場合、
 * オブジェクト全体として正しく処理する必要があります。
 */
function prepareUpdatesForDatabase(updates: ProductUpdate): Record<string, any> {
  const { listing_history, ...cleanUpdates } = updates as any
  
  // 🔥 フロントエンドのカラム名 → products_masterのカラム名にマッピング
  const mappedUpdates: any = {}
  
  // JSONBフィールドのリスト
  const jsonbFields = ['listing_data', 'scraped_data', 'ebay_api_data', 'images', 'image_urls', 
                       'filter_issues', 'target_marketplaces', 'html_templates', 'category_candidates']
  
  for (const [key, value] of Object.entries(cleanUpdates)) {
    // english_title → title_en にマッピング
    if (key === 'english_title') {
      mappedUpdates['title_en'] = value
      continue
    }
    
    // JSONBフィールドは値がオブジェクトまたは配列の場合のみ含める
    if (jsonbFields.includes(key)) {
      // nullまたはundefinedの場合はスキップ
      if (value === null || value === undefined) {
        continue
      }
      
      // オブジェクトまたは配列の場合のみ含める
      if (typeof value === 'object') {
        mappedUpdates[key] = value
      }
      continue
    }
    
    // ネストされたJSONBパス（例: listing_data.height_cm）を検出して除外
    if (key.includes('.')) {
      const [parentField, childField] = key.split('.')
      
      // 親フィールドがJSONBフィールドの場合
      if (jsonbFields.includes(parentField)) {
        // 既存のJSONBオブジェクトを取得または作成
        if (!mappedUpdates[parentField]) {
          mappedUpdates[parentField] = {}
        }
        
        // ネストされた値を設定
        if (typeof mappedUpdates[parentField] === 'object') {
          mappedUpdates[parentField][childField] = value
        }
        
        console.log(`🔧 ネストされたJSONBフィールドを統合: ${parentField}.${childField} = ${value}`)
        continue
      }
      
      // JSONBフィールドでない場合は警告して除外
      console.warn(`⚠️ 不正なネストされたフィールド名を検出（除外）: ${key}`)
      continue
    }
    
    // 通常のフィールドはそのまま
    mappedUpdates[key] = value
  }
  
  return mappedUpdates
}

export async function updateProduct(id: string | number, updates: ProductUpdate) {
  // IDを文字列に正規化（UUIDは文字列のまま）
  const normalizedId = String(id)
  
  console.log('💾 保存しようとしているデータ:', { id: normalizedId, updates })
  console.log('💾 updatesの型:', typeof updates)
  console.log('💾 updatesのキー:', Object.keys(updates))
  
  // 🔥 データベース用に整形
  const mappedUpdates = prepareUpdatesForDatabase(updates)
  
  console.log('💾 マッピング後のupdates:', mappedUpdates)
  console.log('💾 JSONBフィールド:', Object.keys(mappedUpdates).filter(k => 
    ['listing_data', 'scraped_data', 'ebay_api_data', 'images', 'image_urls'].includes(k)
  ))
  
  const { data, error } = await supabase
    .from('products_master')
    .update(mappedUpdates)
    .eq('id', normalizedId)
    .select()
    .single()

  if (error) {
    console.error('❌ Supabaseエラー詳細:')
    console.error('  message:', error.message)
    console.error('  details:', error.details)
    console.error('  hint:', error.hint)
    console.error('  code:', error.code)
    console.error('  full error:', JSON.stringify(error, null, 2))
    throw error
  }
  
  console.log('✅ UPDATE成功:', data)
  
  // 🔥 レスポンスデータを逆マッピング (title_en → english_title)
  const mappedData = {
    ...data,
    english_title: data.title_en,
  }
  
  return mappedData as Product
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
    .from('products_master')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function deleteProducts(ids: string[]) {
  console.log('🗑️ 削除開始:', {
    件数: ids.length,
    IDs: ids,
    IDsの型: ids.map(id => typeof id),
    最初ID: ids[0],
    最後ID: ids[ids.length - 1]
  })

  // ✅ 複数削除の場合、1件ずつ削除する
  if (ids.length > 1) {
    console.log('⚠️ 複数削除：1件ずつ処理します')
    let deletedCount = 0
    const errors: string[] = []

    for (const id of ids) {
      const { error } = await supabase
        .from('products_master')
        .delete()
        .eq('id', id)

      if (error) {
        console.error(`❌ ${id}: 削除失敗`, error)
        errors.push(`${id}: ${error.message}`)
      } else {
        console.log(`✅ ${id}: 削除成功`)
        deletedCount++
      }
    }

    if (errors.length > 0) {
      throw new Error(`削除失敗: ${errors.join(', ')}`)
    }

    console.log(`✅ 一括削除成功: ${deletedCount}件`)
    return { success: true, deleted: deletedCount }
  }

  // ⚡ 1件のみの場合
  const productId = ids[0]
  
  // 🔥 STEP 1: 関連テーブルのレコードを先に削除（エラーは無視）
  console.log('🧹 関連レコードを削除中...')
  
  // listing_historyの削除（エラー無視）
  await supabase
    .from('listing_history')
    .delete()
    .eq('product_id', productId)
  
  // product_html_generatedの削除（エラー無視）
  await supabase
    .from('product_html_generated')
    .delete()
    .eq('products_master_id', productId)
  
  // 🔥 STEP 2: 商品本体を削除
  const { data, error, count } = await supabase
    .from('products_master')
    .delete()
    .eq('id', productId)
    .select()

  console.log('🔍 Supabaseレスポンス:', {
    id: ids[0],
    data: data,
    error: error,
    count: count,
    hasError: !!error,
    errorType: error ? typeof error : 'no error',
    errorKeys: error ? Object.keys(error) : [],
  })

  if (error) {
    console.error('❌ 削除エラー詳細:', {
      error: error,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stringified: JSON.stringify(error),
      fullErrorDump: {...error} // スプレッドで全プロパティを展開
    })
    
    // RLSエラーの場合は詳細メッセージ
    if (error.code === '42501') {
      throw new Error('削除権限がありません。SupabaseのRLSポリシーを確認してください。')
    }
    
    // 409 Conflictエラーの場合
    if (error.code === '23503') {
      throw new Error('外部キー制約により削除できません。関連データを先に削除してください。')
    }
    
    throw new Error(error.message || '削除に失敗しました')
  }

  console.log('✅ 削除成功:', {
    削除件数: count || 1,
    削除されたデータ: data
  })

  return { success: true, deleted: count || 1 }
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
