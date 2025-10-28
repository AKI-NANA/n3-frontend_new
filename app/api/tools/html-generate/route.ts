// app/api/tools/html-generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
      .from('products')
      .select('*')
      .in('id', productIds)

    if (fetchError) throw fetchError

    const updated: string[] = []
    const errors: any[] = []

    // 各商品のHTML生成
    for (const product of products || []) {
      try {
        const html = generateProductHTML(product)

        // listing_dataを取得または初期化
        const listingData = product.listing_data || {}
        
        const { error: updateError } = await supabase
          .from('products')
          .update({
            listing_data: {
              ...listingData,
              html_description: html,
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

function generateProductHTML(product: any): string {
  const imageHTML = product.image_urls && product.image_urls.length > 0
    ? product.image_urls.map((url: string, index: number) => 
        `<img src="${url}" alt="${product.english_title || product.title} - Image ${index + 1}" style="max-width: 100%; height: auto; margin: 10px 0;" />`
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
    <h1 class="product-title">${product.english_title || product.title || 'Product Title'}</h1>
    
    <div class="product-images">
      ${imageHTML}
    </div>
    
    <div class="product-description">
      <h2>商品説明</h2>
      <p>${product.html_description || 'この商品は高品質で、厳選された素材を使用しています。'}</p>
    </div>
    
    <div class="product-specs">
      <h2>商品仕様</h2>
      <table class="specs-table">
        <tr>
          <td>状態</td>
          <td>${product.condition || 'New'}</td>
        </tr>
        ${product.category_name ? `<tr><td>カテゴリ</td><td>${product.category_name}</td></tr>` : ''}
        ${product.weight_g ? `<tr><td>重量</td><td>${product.weight_g}g</td></tr>` : ''}
        ${product.length_cm && product.width_cm && product.height_cm ? 
          `<tr><td>サイズ</td><td>${product.length_cm} x ${product.width_cm} x ${product.height_cm} cm</td></tr>` : ''}
        <tr>
          <td>SKU</td>
          <td>${product.sku}</td>
        </tr>
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
