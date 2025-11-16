# SellerMirror詳細取得時の自動翻訳実装 - 完全版

## 📋 実装内容

SellerMirror詳細取得時に、以下のデータを自動翻訳してデータベースに保存:

1. **タイトル** → `english_title`
2. **説明** → `english_description`
3. **状態** → `english_condition`
4. **カテゴリ** → `english_category`

---

## 🔧 修正ファイル

**ファイル:** `app/api/sellermirror/batch-details/route.ts`

### 修正箇所1: Google Apps Script翻訳APIの呼び出し追加

```typescript
const GAS_TRANSLATE_URL = process.env.GOOGLE_APPS_SCRIPT_TRANSLATE_URL

// 翻訳ヘルパー関数を追加
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

### 修正箇所2: 詳細取得後に翻訳実行

```typescript
// 現在の位置（行389付近）
const firstItemTitle = updatedItems[0]?.title
const shouldUpdateEnglishTitle = !!firstItemTitle

if (shouldUpdateEnglishTitle) {
  console.log(`  🏷️ english_title更新: "${firstItemTitle}"`)
}

// ↓ これを以下に変更:

// 🔥 翻訳を実行
const firstItemTitle = updatedItems[0]?.title
const firstItemDescription = updatedItems[0]?.description || updatedItems[0]?.shortDescription
const firstItemCondition = updatedItems[0]?.condition
const firstItemCategory = updatedItems[0]?.categoryPath

console.log('  📡 Google翻訳API呼び出し中...')

// タイトル翻訳
let englishTitle = ''
if (firstItemTitle) {
  englishTitle = await translateText(firstItemTitle)
  console.log(`  ✅ タイトル翻訳: "${firstItemTitle}" → "${englishTitle}"`)
}

// 説明翻訳
let englishDescription = ''
if (firstItemDescription) {
  englishDescription = await translateText(firstItemDescription)
  console.log(`  ✅ 説明翻訳完了: ${englishDescription.substring(0, 50)}...`)
}

// 状態翻訳
let englishCondition = ''
if (firstItemCondition) {
  englishCondition = await translateText(firstItemCondition)
  console.log(`  ✅ 状態翻訳: "${firstItemCondition}" → "${englishCondition}"`)
}

// カテゴリ翻訳
let englishCategory = ''
if (firstItemCategory) {
  englishCategory = await translateText(firstItemCategory)
  console.log(`  ✅ カテゴリ翻訳: "${firstItemCategory}" → "${englishCategory}"`)
}
```

### 修正箇所3: データベース保存時に翻訳結果を含める

```typescript
const { error: updateError } = await supabase
  .from('products_master')
  .update({
    ebay_api_data: {
      ...existingData,
      listing_reference: {
        ...listingReference,
        referenceItems: updatedItems
      }
    },
    listing_data: updatedListingData,
    // 🔥 翻訳結果を保存
    ...(englishTitle && { english_title: englishTitle }),
    ...(englishDescription && { english_description: englishDescription }),
    ...(englishCondition && { english_condition: englishCondition }),
    ...(englishCategory && { english_category: englishCategory }),
    // 統計情報
    ...(mostCommonCountry && { origin_country: mostCommonCountry }),
    ...(mostCommonMaterial && { material: mostCommonMaterial }),
    sold_count: totalSold,
    updated_at: new Date().toISOString()
  })
  .eq('id', productId)
```

---

## 📊 データフロー

### 修正後の完全なフロー

```
1. SellerMirror詳細取得ボタン押下
   ↓
2. eBay APIから日本語データ取得
   - title: "ポケモン ピカチュウ トートバッグ"
   - description: "この商品は高品質で..."
   - condition: "新品"
   ↓
3. 🔥 Google Apps Script翻訳API呼び出し（自動）
   ↓
4. 翻訳結果を取得
   - english_title: "Pokemon Pikachu Tote Bag"
   - english_description: "This product is high quality..."
   - english_condition: "New"
   ↓
5. データベースに両方を保存
   {
     title: "ポケモン...",
     english_title: "Pokemon...",
     description: "この商品は...",
     english_description: "This product...",
     ...
   }
   ↓
6. HTMLボタン押下時
   ↓
7. english_title, english_description を使用してHTML生成
   ↓
8. 英語HTMLが生成される ✅
```

---

## 🎯 期待される結果

### SellerMirror詳細取得後

```javascript
{
  id: 123,
  title: "ポケモン ピカチュウ トートバッグ",
  english_title: "Pokemon Pikachu Tote Bag",  // ← 自動保存
  description: "この商品は高品質で、厳選された素材を使用しています。",
  english_description: "This product is high quality and made with carefully selected materials.",  // ← 自動保存
  condition: "新品",
  english_condition: "New",  // ← 自動保存
  origin_country: "JP",
  material: "Cotton",
  sold_count: 150
}
```

### HTMLボタン押下後

```html
<h1>Pokemon Pikachu Tote Bag</h1>  <!-- ← english_title使用 -->

<h2>Product Description</h2>
<p>This product is high quality and made with carefully selected materials.</p>  <!-- ← english_description使用 -->

<table>
  <tr><td>Condition</td><td>New</td></tr>  <!-- ← english_condition使用 -->
  <tr><td>Material</td><td>Cotton</td></tr>
  <tr><td>Country of Origin</td><td>JP</td></tr>
</table>
```

---

## 📝 データベーススキーマ追加

以下のカラムも追加する必要があります:

```sql
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS english_description TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS english_condition TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS english_category TEXT;

COMMENT ON COLUMN products_master.english_description IS '商品説明（英語）';
COMMENT ON COLUMN products_master.english_condition IS '状態（英語）';
COMMENT ON COLUMN products_master.english_category IS 'カテゴリ（英語）';
```

---

次のステップで実装を開始しますか？
