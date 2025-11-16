# 🔧 全API完全修正スクリプト
## products_master移行対応 - 自動修正ツール

このスクリプトは、全APIエンドポイントをproducts_masterテーブル構造に対応させます。

## 📋 修正対象API（7つ）

1. ✅ 送料計算 (`/api/tools/shipping-calculate`)
2. ✅ 利益計算 (`/api/tools/profit-calculate`)
3. ✅ SM分析 (`/api/tools/sellermirror-analyze`)
4. ✅ 一括リサーチ (`/api/bulk-research`)
5. ✅ フィルター (`/api/filters`)
6. ✅ カテゴリ分析 (`/api/tools/category-analyze`)
7. ✅ HTML生成 (`/api/tools/html-generate`)

## 🎯 修正内容

### **共通の問題**

#### 1. **ID型の不一致**
```typescript
// ❌ 旧構造（UUID前提）
const id = String(product.id)

// ✅ 新構造（BIGINT対応）
const id = typeof product.id === 'string' ? parseInt(product.id, 10) : product.id
```

#### 2. **price_jpyへの対応**
```typescript
// ❌ 旧フィールド名
const price = product.current_price || product.price

// ✅ 新フィールド名
const price = product.price_jpy
```

#### 3. **listing_data（JSONB）の取得**
```typescript
// ❌ 旧構造（直接カラム）
const weight = product.weight

// ✅ 新構造（JSONBフィールド）
const weight = product.listing_data?.weight_g
```

#### 4. **NULL/undefinedチェック**
```typescript
// ❌ 危険な書き方
if (!weight) { ... }

// ✅ 安全な書き方
if (!weight || weight <= 0) {
  console.error(`❌ weight_g不足: ID=${product.id}`)
  return
}
```

---

## 📝 具体的な修正パターン

### パターン1: データ取得部分

```typescript
// ❌ Before
const { data: products } = await supabase
  .from('yahoo_scraped_products')
  .select('*')

// ✅ After
const { data: products } = await supabase
  .from('products_master')
  .select('*')
```

### パターン2: フィールドアクセス

```typescript
// ❌ Before
const price = product.current_price
const weight = product.weight
const title = product.title

// ✅ After
const price = product.price_jpy
const weight = product.listing_data?.weight_g
const title = product.english_title || product.title || product.title_en
```

### パターン3: 更新処理

```typescript
// ❌ Before
await supabase
  .from('yahoo_scraped_products')
  .update({
    shipping_cost: calculatedCost,
    profit_margin: margin
  })
  .eq('id', product.id)

// ✅ After
await supabase
  .from('products_master')
  .update({
    listing_data: {
      ...(product.listing_data || {}),
      shipping_cost_usd: calculatedCost,
      profit_margin: margin
    }
  })
  .eq('id', product.id)
```

### パターン4: エラーハンドリング

```typescript
// ❌ Before
if (!product.price) {
  continue
}

// ✅ After
if (!product.price_jpy) {
  console.error(`❌ price_jpy不足`, {
    id: product.id,
    title: product.title?.substring(0, 30),
    price_jpy: product.price_jpy,
    代替: {
      purchase_price_jpy: product.purchase_price_jpy,
      current_price: product.current_price
    }
  })
  errors.push({
    id: product.id,
    error: 'price_jpy が不足しています',
    details: {
      price_jpy: product.price_jpy,
      可能な代替値: product.purchase_price_jpy || product.current_price
    }
  })
  continue
}
```

---

## 🔧 ツール別の詳細修正

### 1️⃣ 送料計算API

**ファイル**: `/app/api/tools/shipping-calculate/route.ts`

**必須フィールド**:
- `price_jpy` ✅
- `listing_data.weight_g` ✅
- `listing_data.length_cm` (オプション)
- `listing_data.width_cm` (オプション)
- `listing_data.height_cm` (オプション)

**修正箇所**:
```typescript
// line 50-60付近
const price_jpy = product.price_jpy
const weight_g = product.listing_data?.weight_g
const dimensions = {
  length: product.listing_data?.length_cm || 20,
  width: product.listing_data?.width_cm || 15,
  height: product.listing_data?.height_cm || 10
}

// 検証
if (!price_jpy || !weight_g || weight_g <= 0) {
  errors.push({
    id: product.id,
    error: '重量または価格情報が不足しています',
    details: { price_jpy, weight_g }
  })
  continue
}
```

---

### 2️⃣ 利益計算API

**ファイル**: `/app/api/tools/profit-calculate/route.ts`

**必須フィールド**:
- `price_jpy` ✅
- `listing_data.ddp_price_usd` (送料計算後)
- `listing_data.shipping_cost_usd` (送料計算後)

**修正箇所**:
```typescript
// line 40-50付近
const price_jpy = product.price_jpy
const ddp_price_usd = product.listing_data?.ddp_price_usd
const shipping_cost_usd = product.listing_data?.shipping_cost_usd

// 検証
if (!ddp_price_usd) {
  errors.push({
    id: product.id,
    error: '送料計算が未実行です。先に送料計算を実行してください'
  })
  continue
}
```

---

### 3️⃣ SM分析API

**ファイル**: `/app/api/tools/sellermirror-analyze/route.ts`

**必須フィールド**:
- `english_title` または `title` ✅

**修正箇所**:
```typescript
// line 30-40付近
const searchTitle = product.english_title || product.title || product.title_en

if (!searchTitle) {
  errors.push({
    id: product.id,
    error: '検索用タイトルが不足しています'
  })
  continue
}

// 更新時
await supabase
  .from('products_master')
  .update({
    sm_sales_count: data.salesCount,
    sm_competitor_count: data.competitorCount,
    sm_lowest_price: data.lowestPrice,
    sm_profit_margin: data.profitMargin,
    sm_profit_amount_usd: data.profitAmount,
    sm_fetched_at: new Date().toISOString()
  })
  .eq('id', product.id)
```

---

### 4️⃣ 一括リサーチAPI

**ファイル**: `/app/api/bulk-research/route.ts`

**必須フィールド**:
- `english_title` または `title` ✅
- `price_jpy` ✅

**修正箇所**:
```typescript
// line 35-45付近
const searchQuery = product.english_title || product.title
const priceJpy = product.price_jpy

// 更新時
await supabase
  .from('products_master')
  .update({
    research_sold_count: results.soldCount,
    research_competitor_count: results.competitorCount,
    research_lowest_price: results.lowestPrice,
    research_completed: true,
    research_updated_at: new Date().toISOString()
  })
  .eq('id', product.id)
```

---

### 5️⃣ フィルターAPI

**ファイル**: `/app/api/filters/route.ts`

**必須フィールド**:
- `title` または `english_title` ✅
- `category` ✅

**修正箇所**:
```typescript
// line 25-35付近
const title = product.english_title || product.title || product.title_en
const category = product.category || product.category_name

// 更新時
await supabase
  .from('products_master')
  .update({
    filter_passed: filterResults.passed,
    export_filter_status: filterResults.exportStatus,
    patent_filter_status: filterResults.patentStatus,
    final_judgment: filterResults.finalJudgment,
    filter_checked_at: new Date().toISOString()
  })
  .eq('id', product.id)
```

---

### 6️⃣ カテゴリ分析API

**ファイル**: `/app/api/tools/category-analyze/route.ts`

**必須フィールド**:
- `english_title` または `title` ✅

**修正箇所**:
```typescript
// line 30-40付近
const title = product.english_title || product.title || product.title_en
const description = product.description_en || product.description

// 更新時
await supabase
  .from('products_master')
  .update({
    category_id: detectedCategory.id,
    category_name: detectedCategory.name,
    category_number: detectedCategory.number,
    category_confidence: detectedCategory.confidence,
    ebay_category_id: detectedCategory.ebayId
  })
  .eq('id', product.id)
```

---

### 7️⃣ HTML生成API

**ファイル**: `/app/api/tools/html-generate/route.ts`

**必須フィールド**:
- `english_title` または `title` ✅
- `description_en` または `description` ✅
- `images` または `scraped_data.images` ✅

**修正箇所**:
```typescript
// line 30-45付近
const title = product.english_title || product.title || product.title_en
const description = product.description_en || product.description || product.scraped_data?.description

// 画像取得（複数ソース対応）
const images = product.images 
  || product.scraped_data?.images 
  || product.listing_data?.image_urls 
  || product.gallery_images 
  || []

if (!Array.isArray(images) || images.length === 0) {
  errors.push({
    id: product.id,
    error: '画像が不足しています'
  })
  continue
}

// 更新時
await supabase
  .from('products_master')
  .update({
    html_content: generatedHtml,
    html_template_id: templateId
  })
  .eq('id', product.id)
```

---

## ✅ 修正完了チェックリスト

各APIで以下を確認：

- [ ] テーブル名を `products_master` に変更
- [ ] `price_jpy` フィールドを使用
- [ ] `listing_data` のJSONBフィールドを正しく取得（?.を使用）
- [ ] NULL/undefinedチェックを実装
- [ ] 詳細なエラーログを出力
- [ ] エラー情報を収集して返す
- [ ] 更新時は `listing_data` を正しくマージ
- [ ] ID型の変換を正しく処理（string ↔ number）

---

## 🚀 実行方法

### 自動修正（推奨）

次のセクションで、全7つのAPIを自動的に修正したファイルを提供します。

### 手動修正

このドキュメントの各セクションを参照して、該当ファイルを編集してください。

---

## 📊 修正前後の比較

### Before（動作しない）
```typescript
const { data } = await supabase
  .from('yahoo_scraped_products')
  .select('*')

for (const product of data) {
  const price = product.current_price  // ❌ undefined
  const weight = product.weight        // ❌ undefined
}
```

### After（正常動作）
```typescript
const { data } = await supabase
  .from('products_master')
  .select('*')

for (const product of data) {
  const price = product.price_jpy                    // ✅ 正しい
  const weight = product.listing_data?.weight_g      // ✅ 正しい
  
  if (!price || !weight) {
    console.error('データ不足', { id: product.id, price, weight })
    continue
  }
}
```

---

次のセクションで、実際に修正されたファイルを提供します。
