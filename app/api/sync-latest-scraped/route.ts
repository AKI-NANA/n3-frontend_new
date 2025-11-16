import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

export async function GET() {
  const results = []
  
  try {
    // 今日スクレイピングしたデータを取得
    const today = new Date().toISOString().split('T')[0]
    const { data: newData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .gte('created_at', today)
    
    if (!newData || newData.length === 0) {
      return NextResponse.json({
        success: false,
        message: '本日スクレイピングされたデータがありません',
        note: 'まずデータ収集ページでスクレイピングを実行してください'
      })
    }
    
    results.push({
      step: '新規データ取得',
      count: newData.length,
      items: newData.map(d => ({ id: d.id, sku: d.sku, title: d.title?.substring(0, 30) }))
    })
    
    // products_masterに同期
    let synced = 0
    let translated = 0
    
    for (const y of newData) {
      console.log(`📝 処理中: ${y.title}`)
      
      // 🔥 翻訳を実行
      let englishTitle = ''
      let englishDescription = ''
      let englishCondition = ''
      
      if (y.title) {
        console.log('  📡 タイトル翻訳中...')
        englishTitle = await translateText(y.title)
        console.log(`  ✅ "${y.title}" → "${englishTitle}"`)
        translated++
      }
      
      const description = y.listing_data?.html_description || y.description || ''
      if (description) {
        console.log('  📡 説明翻訳中...')
        englishDescription = await translateText(description)
        console.log(`  ✅ 説明翻訳完了: ${englishDescription.substring(0, 50)}...`)
      }
      
      const condition = y.scraped_data?.condition || y.listing_data?.condition || ''
      if (condition) {
        console.log('  📡 状態翻訳中...')
        englishCondition = await translateText(condition)
        console.log(`  ✅ "${condition}" → "${englishCondition}"`)
      }
      
      // 🔥 スクレイピングデータから情報を抽出
      const scrapedData = y.scraped_data || {}
      const imageUrls = scrapedData.images || scrapedData.image_urls || []
      const conditionFromData = scrapedData.condition || y.listing_data?.condition || 'Unknown'
      const categoryFromData = scrapedData.category || 'Uncategorized'
      const shippingCost = scrapedData.shipping_cost || 0
      
      // 🔥 価格計算: 本体価格 + 送料
      const basePrice = y.price_jpy || y.price_usd || 0
      const totalPriceJPY = basePrice + shippingCost
      
      console.log(`  💰 価格計算: ¥${basePrice} + 送料¥${shippingCost} = ¥${totalPriceJPY}`)
      
      // 既存チェック
      const { data: existing } = await supabase
        .from('products_master')
        .select('id')
        .eq('source_system', 'yahoo_scraped_products')
        .eq('source_id', String(y.id))
        .single()
      
      if (existing) {
        // 更新
        await supabase
          .from('products_master')
          .update({
            title: y.title,
            english_title: englishTitle,  // 🔥 翻訳結果
            description: description,
            english_description: englishDescription,  // 🔥 翻訳結果
            condition_name: conditionFromData,  // 🔥 scraped_dataから取得
            english_condition: englishCondition,  // 🔥 翻訳結果
            category: categoryFromData,  // 🔥 カテゴリー追加
            primary_image_url: imageUrls[0] || null,
            gallery_images: imageUrls,
            scraped_data: scrapedData,  // 🔥 生データも保存
            current_price: totalPriceJPY,  // 🔥 送料込み価格
            price_jpy: totalPriceJPY,  // 🔥 送料込み価格（JPY）
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        console.log(`  ✅ 更新完了: ID ${existing.id}`)
      } else {
        // 新規追加
        await supabase.from('products_master').insert({
          source_system: 'yahoo_scraped_products',
          source_id: String(y.id),
          sku: y.sku,
          title: y.title,
          english_title: englishTitle,  // 🔥 翻訳結果
          description: description,
          english_description: englishDescription,  // 🔥 翻訳結果
          condition_name: conditionFromData,  // 🔥 scraped_dataから取得
          english_condition: englishCondition,  // 🔥 翻訳結果
          category: categoryFromData,  // 🔥 カテゴリー追加
          scraped_data: scrapedData,  // 🔥 生データも保存
          current_price: totalPriceJPY,  // 🔥 送料込み価格
          price_jpy: totalPriceJPY,  // 🔥 送料込み価格（JPY）
          profit_amount: y.profit_amount_usd || 0,
          profit_margin: y.profit_margin || 0,
          workflow_status: y.status || 'scraped',
          approval_status: 'pending',
          listing_status: 'not_listed',
          listing_price: y.price_usd || 0,
          inventory_quantity: y.current_stock || 0,
          primary_image_url: imageUrls[0] || null,
          gallery_images: imageUrls,
          created_at: y.created_at,
          updated_at: y.updated_at
        })
        
        console.log(`  ✅ 新規追加完了: ${y.sku}`)
      }
      synced++
    }
    
    results.push({
      step: 'products_master同期完了',
      synced: synced,
      translated: translated
    })
    
    // 確認
    const { data: masterData } = await supabase
      .from('products_master')
      .select('id, sku, title, english_title, category, price_jpy, primary_image_url')
      .gte('created_at', today)
    
    results.push({
      step: '同期確認',
      data: masterData
    })
    
    return NextResponse.json({
      success: true,
      message: `✓ ${synced}件を同期し、${translated}件を翻訳しました`,
      results,
      next_step: 'http://localhost:3000/tools/editing で確認してください'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      results
    }, { status: 500 })
  }
}
