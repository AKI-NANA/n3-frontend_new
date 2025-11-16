// app/api/ai-enrichment/prepare-prompt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * AIプロンプト準備API
 * 商品データ + セルミラーデータ + Supabaseデータを統合してプロンプト生成
 */
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'productIdが必要です' },
        { status: 400 }
      )
    }

    // 1. 商品データ取得
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 2. HTSコード候補をSupabaseから取得
    const { data: htsCandidates } = await supabase
      .from('hs_codes')
      .select('code, description, category, base_duty, section301_rate')
      .limit(50)
      .order('code')

    // 3. 原産国マスターデータ取得
    const { data: countries } = await supabase
      .from('hts_countries')
      .select('country_code, country_name')
      .order('country_code')

    // 4. セルミラーデータ取得
    const sellerMirrorData = product.ebay_api_data?.listing_reference || null

    // 5. 既存の寸法データ
    const existingDimensions = product.listing_data || {}

    // 6. プロンプトデータ構築
    const promptData = {
      product: {
        id: product.id,
        title: product.title,
        description: product.scraped_data?.description || '',
        price_jpy: product.price_jpy,
        images: product.scraped_data?.image_urls || [],
        category: product.scraped_data?.category || ''
      },
      existingData: {
        weight_g: existingDimensions.weight_g || null,
        length_cm: existingDimensions.length_cm || null,
        width_cm: existingDimensions.width_cm || null,
        height_cm: existingDimensions.height_cm || null,
        cost_jpy: existingDimensions.cost_jpy || null
      },
      sellerMirror: sellerMirrorData ? {
        referenceCount: sellerMirrorData.referenceItems?.length || 0,
        averagePrice: calculateAveragePrice(sellerMirrorData.referenceItems),
        categoryId: sellerMirrorData.suggestedCategory,
        categoryPath: sellerMirrorData.suggestedCategoryPath,
        topTitles: sellerMirrorData.referenceItems
          ?.slice(0, 3)
          .map((item: any) => item.title) || []
      } : null,
      databaseReferences: {
        htsCandidates: htsCandidates?.slice(0, 10).map(hts => ({
          code: hts.code,
          description: hts.description,
          category: hts.category,
          baseDuty: hts.base_duty,
          section301Rate: hts.section301_rate
        })) || [],
        countries: countries?.map(c => ({
          code: c.country_code,
          name: c.country_name
        })) || []
      }
    }

    // 7. AIプロンプト生成
    const prompt = generateAIPrompt(promptData)

    return NextResponse.json({
      success: true,
      promptData,
      prompt,
      productId
    })

  } catch (error: any) {
    console.error('AIプロンプト準備エラー:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// 平均価格計算
function calculateAveragePrice(items: any[]): number | null {
  if (!items || items.length === 0) return null
  
  const prices = items
    .map(item => item.price)
    .filter(price => typeof price === 'number' && price > 0)
  
  if (prices.length === 0) return null
  
  return prices.reduce((sum, price) => sum + price, 0) / prices.length
}

// AIプロンプト生成（続く）
function generateAIPrompt(data: any): string {
  const { product, existingData, sellerMirror, databaseReferences } = data

  return `# 商品データ強化タスク

## 📦 商品基本情報
- **商品名**: ${product.title}
- **説明**: ${product.description || '（なし）'}
- **価格**: ¥${product.price_jpy?.toLocaleString() || '不明'}
- **カテゴリ**: ${product.category || '不明'}
- **画像URL**: ${product.images[0] || '（なし）'}

${existingData.weight_g ? `
## 📏 既存の寸法データ（確認が必要）
- 重量: ${existingData.weight_g}g
- サイズ: ${existingData.length_cm}×${existingData.width_cm}×${existingData.height_cm}cm

⚠️ **重要**: この寸法データが正確か、Web検索で必ず確認してください。間違っていると大きな赤字になります。
` : ''}

${sellerMirror ? `
## 🔍 eBay競合分析データ（SellerMirror）
- 類似商品数: ${sellerMirror.referenceCount}件
- 平均価格: $${sellerMirror.averagePrice?.toFixed(2) || '不明'}
- eBayカテゴリ: ${sellerMirror.categoryPath} (ID: ${sellerMirror.categoryId})

**競合商品の英語タイトル例**:
${sellerMirror.topTitles.map((title: string, i: number) => `${i + 1}. ${title}`).join('\n')}

💡 これらの英語タイトルを参考に、SEO最適化されたタイトルを生成してください。
` : ''}

## 🗂️ Supabaseデータベース参照

### HTSコード候補（当システムに登録済み）
以下のHTSコードから最も適切なものを **3つ** 選んでください：

${databaseReferences.htsCandidates.map((hts: any) => 
  `- **${hts.code}**: ${hts.description} (基本関税: ${(hts.baseDuty * 100).toFixed(2)}%, Section 301: ${(hts.section301Rate * 100).toFixed(2)}%)`
).join('\n')}

⚠️ **必ず上記のコードから選択してください**。存在しないコードは使用できません。

### 原産国候補（当システムに登録済み）
${databaseReferences.countries.slice(0, 15).map((c: any) => 
  `- **${c.code}**: ${c.name}`
).join('\n')}

---

## 📋 実行タスク

### 1. 寸法データの確認・取得
${existingData.weight_g ? 
  '既存データをWeb検索で確認し、間違っていれば修正してください。' : 
  'Web検索で実物の寸法を取得してください（推測は絶対NG）。'
}

### 2. HTSコード判定
上記のデータベースから **最も適切な3つ** を選んでください。

### 3. 原産国判定
上記のデータベースから選択してください。

### 4. SEO最適化英語タイトル生成
多販路（eBay, Shopee, Shopify等）で使いまわせる汎用性を重視。

---

## 📤 回答フォーマット

\`\`\`json
{
  "dimensions": {
    "weight_g": 250,
    "length_cm": 20.5,
    "width_cm": 15.0,
    "height_cm": 5.0,
    "verification_source": "公式サイト名",
    "confidence": "verified"
  },
  "hts_candidates": [
    {
      "code": "8471.30.0100",
      "description": "portable automatic data processing machines",
      "reasoning": "選定理由",
      "confidence": 85
    },
    {
      "code": "8517.62.0050",
      "description": "smartphones",
      "reasoning": "選定理由",
      "confidence": 70
    },
    {
      "code": "6204.62.4031",
      "description": "women's trousers",
      "reasoning": "選定理由",
      "confidence": 60
    }
  ],
  "origin_country": {
    "code": "CN",
    "name": "China",
    "reasoning": "判定根拠"
  },
  "english_title": "premium wireless bluetooth headphones with noise cancellation"
}
\`\`\``
}
