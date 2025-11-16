// app/api/tools/category-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

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
      .from('products_master')
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
          .from('products_master')
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

// カテゴリ取得: YahooカテゴリからeBayカテゴリへマッピング
async function fetchCategoryFromEbayAPI(product: any): Promise<{ name: string; number: string }> {
  // 1. Yahooカテゴリを取得
  const yahooCategory = product.scraped_data?.category || 
                        product.scraped_data?.category_name ||
                        product.category_name
  
  console.log(`🔍 Yahooカテゴリ: ${yahooCategory}`)
  
  if (!yahooCategory) {
    console.log(`⚠️  Yahooカテゴリがありません`)
    return { name: '不明 (Unknown)', number: '99999' }
  }
  
  // 2. Yahoo → eBay カテゴリマッピング
  const categoryMappings: Record<string, { name: string; number: string }> = {
    // ホビー、カルチャー
    'トレーディングカード': { name: 'Trading Cards', number: '183454' },
    'トレカ': { name: 'Trading Cards', number: '183454' },
    'ポケモンカードゲーム': { name: 'Trading Cards', number: '183454' },
    '遊戯王': { name: 'Trading Cards', number: '183454' },
    'デュエルマスターズ': { name: 'Trading Cards', number: '183454' },
    'フィギュア': { name: 'Toys & Hobbies', number: '220' },
    'プラモデル': { name: 'Toys & Hobbies', number: '220' },
    'おもちゃ': { name: 'Toys & Hobbies', number: '220' },
    'コレクション': { name: 'Collectibles', number: '1' },
    'アンティーク': { name: 'Antiques', number: '20081' },
    
    // 家電、AV、カメラ
    'カメラ': { name: 'Cameras & Photo', number: '625' },
    'デジタルカメラ': { name: 'Cameras & Photo', number: '625' },
    'レンズ': { name: 'Cameras & Photo', number: '625' },
    'パソコン': { name: 'Computers/Tablets & Networking', number: '58058' },
    'タブレット': { name: 'Computers/Tablets & Networking', number: '58058' },
    'スマートフォン': { name: 'Cell Phones & Accessories', number: '15032' },
    'iPhone': { name: 'Cell Phones & Accessories', number: '15032' },
    
    // ファッション
    '腕時計': { name: 'Jewelry & Watches', number: '281' },
    '時計': { name: 'Jewelry & Watches', number: '281' },
    'バッグ': { name: 'Clothing, Shoes & Accessories', number: '11450' },
    '財布': { name: 'Clothing, Shoes & Accessories', number: '11450' },
    'ファッション': { name: 'Clothing, Shoes & Accessories', number: '11450' },
    
    // エンタメ
    '本': { name: 'Books', number: '267' },
    '雑誌': { name: 'Books', number: '267' },
    'CD': { name: 'Music', number: '11233' },
    'DVD': { name: 'DVDs & Movies', number: '11232' },
    'ブルーレイ': { name: 'DVDs & Movies', number: '11232' },
    'ゲーム': { name: 'Video Games & Consoles', number: '139973' },
    'PlayStation': { name: 'Video Games & Consoles', number: '139973' },
    'Nintendo': { name: 'Video Games & Consoles', number: '139973' },
    
    // スポーツ
    'スポーツ': { name: 'Sporting Goods', number: '888' },
    'ゴルフ': { name: 'Sporting Goods', number: '888' },
    '釣り': { name: 'Sporting Goods', number: '888' },
  }
  
  // 3. 部分一致検索
  const yahooCategoryLower = yahooCategory.toLowerCase()
  
  for (const [keyword, ebayCategory] of Object.entries(categoryMappings)) {
    if (yahooCategoryLower.includes(keyword.toLowerCase())) {
      console.log(`✅ マッピング成功: ${keyword} → ${ebayCategory.name} (${ebayCategory.number})`)
      return ebayCategory
    }
  }
  
  // 4. 見つからない場合は「不明」
  console.log(`⚠️  マッピングが見つかりません: ${yahooCategory}`)
  return { name: '不明 (Unknown)', number: '99999' }
}
