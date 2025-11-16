// app/api/tools/html-generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const GAS_TRANSLATE_URL = process.env.GOOGLE_APPS_SCRIPT_TRANSLATE_URL

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '商品IDが指定されていません' },
        { status: 400 }
      )
    }

    console.log(`🎨 HTML生成開始: ${productIds.length}件`)

    // 商品データを取得
    const { data: products, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .in('id', productIds)

    if (fetchError) throw fetchError

    const updated: string[] = []
    const errors: any[] = []

    // 各商品のHTML生成と翻訳
    for (const product of products || []) {
      try {
        console.log(`📝 処理中: ${product.title}`)
        
        // 🔥 英語タイトルの翻訳（まだ無い場合）
        let englishTitle = product.english_title
        if (!englishTitle && product.title) {
          console.log('  📡 タイトル翻訳中...')
          englishTitle = await translateText(product.title)
          console.log(`  ✅ 英語タイトル: ${englishTitle}`)
        }
        
        // 🔥 日本語HTMLを生成
        const japaneseHTML = generateProductHTML(product, false)
        
        // 🔥 英語HTMLを生成（翻訳付き）
        console.log('  📡 HTML翻訳中...')
        const englishHTML = await translateProductHTML(product, englishTitle || product.title)
        console.log('  ✅ 英語HTML生成完了')

        // listing_dataを取得または初期化
        const listingData = product.listing_data || {}
        
        // 🔥 データベースに両方のHTMLを保存
        const { error: updateError } = await supabase
          .from('products_master')
          .update({
            english_title: englishTitle || product.title, // 🔥 english_titleに英語タイトル保存
            listing_data: {
              ...listingData,
              html_description: japaneseHTML,      // 日本語HTML（完全版）
              html_description_en: englishHTML,    // 英語HTML（完全版）
              html_description_body: extractBodyContent(englishHTML), // 🔥 差し込み用（bodyの中身のみ）
              html_applied: true,
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) throw updateError

        updated.push(product.id)
        console.log(`✅ HTML生成完了: ${product.title}`)
      } catch (err: any) {
        console.error(`❌ HTML生成エラー: ${product.title}`, err)
        errors.push({ id: product.id, error: err.message })
      }
    }

    console.log(`📊 HTML生成完了: ${updated.length}件成功, ${errors.length}件失敗`)

    return NextResponse.json({
      success: true,
      updated: updated.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ HTML生成エラー:', error)
    return NextResponse.json(
      { error: error.message || 'HTML生成に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * テキスト翻訳ヘルパー
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
 * HTMLから<body>の中身を抽出（差し込み用）
 */
function extractBodyContent(html: string): string {
  // <body>タグの中身を抽出
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1].trim()
  }
  // <body>がない場合はそのまま返す
  return html
}

/**
 * 商品データ全体の翻訳
 */
async function translateProductData(product: any, englishTitle: string) {
  // 🔥 english_descriptionにHTMLが入っている場合は使わない
  const isHtmlInDescription = product.english_description?.includes('<!DOCTYPE') || 
                              product.english_description?.includes('<html')
  
  // 🔥 翻訳済みテキストデータがあればそれを使用
  const hasTranslatedData = product.english_title && 
                            product.english_description && 
                            !isHtmlInDescription
  
  if (hasTranslatedData) {
    console.log('  ✅ 翻訳済みデータを使用');
    
    // conditionの英語化
    const conditionMap: Record<string, string> = {
      '新品': 'New',
      '未使用': 'New',
      '中古': 'Used',
      '中古品': 'Used',
      '開封済み': 'Open Box',
      'ジャンク': 'For Parts or Not Working'
    }
    
    return {
      title: product.english_title,
      description: product.english_description,
      condition: conditionMap[product.condition || ''] || 'Used',
      category_name: product.category_name || '',
      brand: product.brand
    }
  }
  
  // 🔥 翻訳済みデータがない場合はデフォルトテキストを使用
  console.log('  ⚠️ 翻訳データがないためデフォルトテキストを使用');
  
  const conditionMap: Record<string, string> = {
    '新品': 'New',
    '未使用': 'New',
    '中古': 'Used',
    '中古品': 'Used',
    '開封済み': 'Open Box',
    'ジャンク': 'For Parts or Not Working'
  }
  
  return {
    title: englishTitle,
    description: 'High-quality product made with carefully selected materials.',
    condition: conditionMap[product.condition || ''] || 'Used',
    category_name: product.category_name || '',
    brand: product.brand
  }
}

/**
 * 英語HTMLの生成（翻訳付き）
 */
async function translateProductHTML(product: any, englishTitle: string): string {
  // 商品データを翻訳
  const translated = await translateProductData(product, englishTitle)
  
  // 🔥 title_en と description_en を優先使用
  const finalTitle = product.english_title || translated.title
  const finalDescription = product.english_description || translated.description
  
  // 🔥 conditionを英語化（翻訳APIに依存せず直接変換）
  const conditionMap: Record<string, string> = {
    '新品': 'New',
    '未使用': 'New',
    '中古': 'Used',
    '中古品': 'Used',
    '開封済み': 'Open Box',
    'ジャンク': 'For Parts or Not Working'
  }
  const finalCondition = product.listing_data?.condition_en || 
                         conditionMap[product.condition || ''] || 
                         translated.condition || 
                         'Used'
  
  const imageHTML = product.image_urls && product.image_urls.length > 0
    ? product.image_urls.map((url: string, index: number) => 
        `<img src="${url}" alt="${finalTitle} - Image ${index + 1}" style="max-width: 100%; height: auto; margin: 10px 0;" />`
      ).join('\n')
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .product-container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .product-title { font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #2c3e50; }
    .product-images { margin: 20px 0; }
    .product-description { margin: 20px 0; font-size: 14px; }
    .product-specs { margin: 20px 0; }
    .specs-table { width: 100%; border-collapse: collapse; }
    .specs-table td { padding: 10px; border: 1px solid #ddd; }
    .specs-table td:first-child { background-color: #f5f5f5; font-weight: bold; width: 30%; }
    .shipping-info { background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="product-container">
    <h1 class="product-title">${finalTitle}</h1>
    
    <div class="product-images">
      ${imageHTML}
    </div>
    
    <div class="product-description">
      <h2>Product Description</h2>
      <p>${finalDescription}</p>
    </div>
    
    <div class="product-specs">
      <h2>Product Specifications</h2>
      <table class="specs-table">
        <tr>
          <td>Condition</td>
          <td>${finalCondition}</td>
        </tr>
        ${translated.category_name ? `<tr><td>Category</td><td>${translated.category_name}</td></tr>` : ''}
        ${product.weight_g ? `<tr><td>Weight</td><td>${product.weight_g}g</td></tr>` : ''}
        ${product.length_cm && product.width_cm && product.height_cm ? 
          `<tr><td>Dimensions</td><td>${product.length_cm} x ${product.width_cm} x ${product.height_cm} cm</td></tr>` : ''}
        <tr>
          <td>SKU</td>
          <td>${product.sku}</td>
        </tr>
        ${translated.brand ? `<tr><td>Brand</td><td>${translated.brand}</td></tr>` : ''}
        ${product.origin_country ? `<tr><td>Country of Origin</td><td>${product.origin_country}</td></tr>` : ''}
        ${product.material ? `<tr><td>Material</td><td>${product.material}</td></tr>` : ''}
      </table>
    </div>
    
    <div class="shipping-info">
      <h3>📦 Shipping Information</h3>
      <p><strong>Shipping Method:</strong> ${product.shipping_service || 'Standard Shipping'}</p>
      <p><strong>Handling Time:</strong> ${product.handling_time || '1-2 business days'}</p>
      <p>We ship safely and quickly. Tracking number will be provided.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * 日本語HTMLの生成（翻訳なし）
 */
function generateProductHTML(product: any, isJapanese: boolean = true): string {
  const imageHTML = product.image_urls && product.image_urls.length > 0
    ? product.image_urls.map((url: string, index: number) => 
        `<img src="${url}" alt="${product.title} - Image ${index + 1}" style="max-width: 100%; height: auto; margin: 10px 0;" />`
      ).join('\n')
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .product-container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .product-title { font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #2c3e50; }
    .product-images { margin: 20px 0; }
    .product-description { margin: 20px 0; font-size: 14px; }
    .product-specs { margin: 20px 0; }
    .specs-table { width: 100%; border-collapse: collapse; }
    .specs-table td { padding: 10px; border: 1px solid #ddd; }
    .specs-table td:first-child { background-color: #f5f5f5; font-weight: bold; width: 30%; }
    .shipping-info { background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="product-container">
    <h1 class="product-title">${product.title}</h1>
    
    <div class="product-images">
      ${imageHTML}
    </div>
    
    <div class="product-description">
      <h2>商品説明</h2>
      <p>${product.description || 'この商品は高品質で、厳選された素材を使用しています。'}</p>
    </div>
    
    <div class="product-specs">
      <h2>商品仕様</h2>
      <table class="specs-table">
        <tr>
          <td>状態</td>
          <td>${product.condition || '新品'}</td>
        </tr>
        ${product.category_name ? `<tr><td>カテゴリ</td><td>${product.category_name}</td></tr>` : ''}
        ${product.weight_g ? `<tr><td>重量</td><td>${product.weight_g}g</td></tr>` : ''}
        ${product.length_cm && product.width_cm && product.height_cm ? 
          `<tr><td>サイズ</td><td>${product.length_cm} x ${product.width_cm} x ${product.height_cm} cm</td></tr>` : ''}
        <tr>
          <td>SKU</td>
          <td>${product.sku}</td>
        </tr>
        ${product.brand ? `<tr><td>ブランド</td><td>${product.brand}</td></tr>` : ''}
        ${product.origin_country ? `<tr><td>原産国</td><td>${product.origin_country}</td></tr>` : ''}
        ${product.material ? `<tr><td>素材</td><td>${product.material}</td></tr>` : ''}
      </table>
    </div>
    
    <div class="shipping-info">
      <h3>📦 配送について</h3>
      <p><strong>配送方法:</strong> ${product.shipping_service || 'Standard Shipping'}</p>
      <p><strong>発送時期:</strong> ${product.handling_time || '1-2 business days'}</p>
      <p>安全かつ迅速に配送いたします。追跡番号が提供されます。</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
