// app/api/tools/category-analyze/route.ts
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

    console.log(`📂 カテゴリ分析開始: ${productIds.length}件`)

    // 商品データを取得
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)

    if (fetchError) throw fetchError

    // カテゴリがない商品のみフィルタリング
    const productsWithoutCategory = products?.filter(
      p => !p.category_name || !p.category_number
    ) || []

    if (productsWithoutCategory.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        skipped: products?.length || 0,
        message: '全ての商品にカテゴリが設定済みです'
      })
    }

    console.log(`⚠️  ${productsWithoutCategory.length}件の商品にカテゴリがありません`)

    const updated: string[] = []
    const errors: any[] = []

    // TODO: 実際はここでeBay APIを呼び出して一括取得
    // 今は仮実装で個別処理
    for (const product of productsWithoutCategory) {
      try {
        // eBay API呼び出し（仮実装）
        const category = await fetchCategoryFromEbayAPI(product)

        const { error: updateError } = await supabase
          .from('products')
          .update({
            category_name: category.name,
            category_number: category.number,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) throw updateError

        updated.push(product.id)
        console.log(`✅ カテゴリ取得完了: ${product.title} -> ${category.name}`)
      } catch (err: any) {
        console.error(`❌ カテゴリ取得エラー: ${product.title}`, err)
        errors.push({ id: product.id, error: err.message })
      }
    }

    console.log(`📊 カテゴリ分析完了: ${updated.length}件成功, ${errors.length}件失敗`)

    return NextResponse.json({
      success: true,
      updated: updated.length,
      skipped: products!.length - productsWithoutCategory.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ カテゴリ分析エラー:', error)
    return NextResponse.json(
      { error: error.message || 'カテゴリ分析に失敗しました' },
      { status: 500 }
    )
  }
}

// eBay APIからカテゴリ取得（仮実装）
async function fetchCategoryFromEbayAPI(product: any): Promise<{ name: string; number: string }> {
  // TODO: 実際のeBay API呼び出し
  // const response = await fetch(`https://api.ebay.com/...`, { ... })
  
  // category_managementのDBから取得する方法もある
  // 今は簡単なキーワードマッチングで仮実装
  
  const title = product.title?.toLowerCase() || ''
  
  // より詳細なカテゴリマッピング
  const categoryMappings = [
    { keywords: ['camera', 'lens', 'canon', 'nikon', 'sony', 'カメラ', 'レンズ'], name: 'Cameras & Photo', number: '625' },
    { keywords: ['watch', 'clock', 'rolex', 'seiko', '時計', '腕時計'], name: 'Jewelry & Watches', number: '281' },
    { keywords: ['toy', 'doll', 'figure', 'lego', 'おもちゃ', 'フィギュア'], name: 'Toys & Hobbies', number: '220' },
    { keywords: ['book', 'magazine', 'novel', '本', '雑誌'], name: 'Books', number: '267' },
    { keywords: ['game', 'playstation', 'nintendo', 'xbox', 'ゲーム'], name: 'Video Games & Consoles', number: '139973' },
    { keywords: ['dvd', 'blu-ray', 'movie', 'film', '映画'], name: 'DVDs & Movies', number: '11232' },
    { keywords: ['cd', 'vinyl', 'record', 'music', '音楽', 'レコード'], name: 'Music', number: '11233' },
    { keywords: ['phone', 'iphone', 'android', 'smartphone', 'スマホ'], name: 'Cell Phones & Accessories', number: '15032' },
    { keywords: ['computer', 'laptop', 'tablet', 'ipad', 'pc', 'パソコン'], name: 'Computers/Tablets & Networking', number: '58058' },
    { keywords: ['clothing', 'shirt', 'dress', 'pants', '服', 'ファッション'], name: 'Clothing, Shoes & Accessories', number: '11450' },
    { keywords: ['bag', 'backpack', 'wallet', 'purse', 'バッグ', '財布'], name: 'Clothing, Shoes & Accessories', number: '11450' },
    { keywords: ['sport', 'fitness', 'golf', 'baseball', 'スポーツ'], name: 'Sporting Goods', number: '888' },
    { keywords: ['antique', 'vintage', 'art', 'アンティーク', 'ヴィンテージ'], name: 'Antiques', number: '20081' },
    { keywords: ['coin', 'stamp', 'card', 'memorabilia', 'コイン', '切手'], name: 'Collectibles', number: '1' },
  ]
  
  // タイトルにマッチするカテゴリを探す
  for (const mapping of categoryMappings) {
    if (mapping.keywords.some(keyword => title.includes(keyword))) {
      return { name: mapping.name, number: mapping.number }
    }
  }
  
  // マッチしない場合はCollectibles
  return { name: 'Collectibles', number: '1' }
}
