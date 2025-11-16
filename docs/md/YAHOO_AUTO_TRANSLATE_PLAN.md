# Yahoo商品の自動英語翻訳 - 実装計画

## 📋 正しいデータフロー

```
1. Yahoo商品スクレイピング（外部システム）
   ↓
   yahoo_scraped_products テーブルに保存:
   - title: "ポケモン ピカチュウ トートバッグ"
   - description: "この商品は高品質で..."
   - condition: "新品"
   ↓
2. 🔥 sync-latest-scraped API実行
   ↓
   自動翻訳実行:
   - english_title: "Pokemon Pikachu Tote Bag"
   - english_description: "This product is high quality..."
   - english_condition: "New"
   ↓
3. products_master に保存
   ↓
4. HTMLボタン → 英語HTMLが生成される ✅
```

---

## 🔧 修正ファイル

### ファイル1: `app/api/sync-latest-scraped/route.ts`

**修正内容:** Yahoo商品をproducts_masterに同期する際に、自動翻訳を実行

#### 修正箇所1: Google Apps Script翻訳関数の追加

```typescript
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
```

#### 修正箇所2: 同期時に翻訳を実行

```typescript
// products_masterに同期
let synced = 0
for (const y of newData) {
  console.log(`📝 処理中: ${y.title}`)
  
  // 🔥 翻訳を実行
  console.log('  📡 翻訳API呼び出し中...')
  
  const englishTitle = await translateText(y.title || '')
  console.log(`  ✅ タイトル翻訳: "${y.title}" → "${englishTitle}"`)
  
  const description = y.listing_data?.html_description || y.description || ''
  const englishDescription = description ? await translateText(description) : ''
  if (englishDescription) {
    console.log(`  ✅ 説明翻訳完了: ${englishDescription.substring(0, 50)}...`)
  }
  
  const condition = y.listing_data?.condition || y.condition || ''
  const englishCondition = condition ? await translateText(condition) : ''
  if (englishCondition) {
    console.log(`  ✅ 状態翻訳: "${condition}" → "${englishCondition}"`)
  }
  
  const category = y.category_name || ''
  const englishCategory = category ? await translateText(category) : ''
  if (englishCategory) {
    console.log(`  ✅ カテゴリ翻訳: "${category}" → "${englishCategory}"`)
  }
  
  // 既存チェック
  const { data: existing } = await supabase
    .from('products_master')
    .select('id')
    .eq('source_system', 'yahoo_scraped_products')
    .eq('source_id', String(y.id))
    .single()
  
  if (existing) {
    // 更新
    const imageUrls = y.scraped_data?.image_urls || []
    await supabase
      .from('products_master')
      .update({
        title: y.title,
        english_title: englishTitle,  // 🔥 翻訳結果
        description: description,
        english_description: englishDescription,  // 🔥 翻訳結果
        english_condition: englishCondition,  // 🔥 翻訳結果
        english_category: englishCategory,  // 🔥 翻訳結果
        primary_image_url: imageUrls[0] || null,
        gallery_images: imageUrls,
        current_price: y.price_usd || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // 新規追加
    const imageUrls = y.scraped_data?.image_urls || []
    await supabase.from('products_master').insert({
      source_system: 'yahoo_scraped_products',
      source_id: String(y.id),
      sku: y.sku,
      title: y.title,
      english_title: englishTitle,  // 🔥 翻訳結果
      description: description,
      english_description: englishDescription,  // 🔥 翻訳結果
      english_condition: englishCondition,  // 🔥 翻訳結果
      english_category: englishCategory,  // 🔥 翻訳結果
      current_price: y.price_usd || 0,
      profit_amount: y.profit_amount_usd || 0,
      profit_margin: y.profit_margin || 0,
      category: y.category_name || 'Uncategorized',
      condition_name: y.listing_data?.condition || 'Unknown',
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
  }
  synced++
}
```

---

### ファイル2: `app/api/tools/html-generate/route.ts`

**修正内容:** 翻訳済みデータを使用してHTML生成

#### 現在の問題
```typescript
// 現在: product.title を翻訳しようとしている
const englishTitle = await translateText(product.title)
```

#### 修正後
```typescript
// 修正後: 既に翻訳済みの english_title を使用
const englishTitle = product.english_title || await translateText(product.title)
const englishDescription = product.english_description || await translateText(product.description || '')
const englishCondition = product.english_condition || 'New'
```

---

## 📊 完全なデータフロー

### 1. Yahoo商品スクレイピング（既存）
```javascript
yahoo_scraped_products {
  id: 123,
  title: "ポケモン ピカチュウ トートバッグ",
  description: "この商品は高品質で...",
  condition: "新品",
  scraped_data: {
    image_urls: [...]
  }
}
```

### 2. sync-latest-scraped 実行（修正）
```javascript
// 自動翻訳実行
GET /api/sync-latest-scraped

Console:
📝 処理中: ポケモン ピカチュウ トートバッグ
  📡 翻訳API呼び出し中...
  ✅ タイトル翻訳: "ポケモン..." → "Pokemon Pikachu Tote Bag"
  ✅ 説明翻訳完了: This product is high quality...
  ✅ 状態翻訳: "新品" → "New"
  ✅ カテゴリ翻訳: "衣類、靴" → "Clothing, Shoes"

↓ products_master に保存

products_master {
  id: 456,
  title: "ポケモン ピカチュウ トートバッグ",
  english_title: "Pokemon Pikachu Tote Bag",  // ✅ 保存済み
  description: "この商品は高品質で...",
  english_description: "This product is high quality...",  // ✅ 保存済み
  english_condition: "New",  // ✅ 保存済み
  english_category: "Clothing, Shoes"  // ✅ 保存済み
}
```

### 3. HTML生成（既存APIを使用）
```javascript
// HTMLボタン押下
POST /api/tools/html-generate

// 既に翻訳済みデータを使用
const englishTitle = product.english_title  // "Pokemon Pikachu Tote Bag"
const englishDescription = product.english_description  // "This product is high quality..."

↓ 英語HTMLが生成される ✅

listing_data: {
  html_description: "<日本語HTML>",
  html_description_en: "<英語HTML>"  // ✅ 英語
}
```

---

## 🎯 期待される結果

### sync-latest-scraped 実行後
```
✅ Yahoo商品の日本語データ取得
✅ 自動的に英語翻訳
✅ products_master に両方保存
   - title + english_title
   - description + english_description
   - condition + english_condition
```

### HTMLボタン押下後
```
✅ 既に翻訳済みのデータを使用
✅ 追加の翻訳API呼び出し不要
✅ 英語HTMLが即座に生成される
```

---

## ✅ 実装チェックリスト

1. [ ] データベースマイグレーション実行
   - english_description
   - english_condition
   - english_category

2. [ ] sync-latest-scraped/route.ts 修正
   - 翻訳関数追加
   - 同期時に自動翻訳実行

3. [ ] html-generate/route.ts 修正
   - 翻訳済みデータを優先使用

4. [ ] 動作確認
   - sync-latest-scraped 実行
   - 翻訳ログ確認
   - HTMLボタンで英語HTML確認

---

次のステップで実装を開始しますか？
