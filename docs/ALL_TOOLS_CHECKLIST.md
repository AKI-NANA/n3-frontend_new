# 🔍 全ツール共通 問題チェックリスト
## products_master移行に伴う問題の発見と修正

---

## 📋 このチェックリストの使い方

各ツールのAPIエンドポイントで、以下の項目を順番にチェックしてください。
問題が見つかったら、対応する修正を実施します。

---

## ✅ チェック項目

### 🔴 **CRITICAL（必須）** - データ取得の基本

#### 1. Supabaseクライアントの確認
```typescript
// ❌ 古い書き方（Service Role Key直接使用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ 新しい書き方（統一されたヘルパー関数）
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

**影響するツール**: 全ツール

---

#### 2. テーブル名の確認
```typescript
// ❌ 古いテーブル名
.from('yahoo_scraped_products')
.from('inventory_products')
.from('ebay_inventory')

// ✅ 新しいテーブル名
.from('products_master')
```

**影響するツール**: 全ツール

---

#### 3. フィールド名の確認（価格）
```typescript
// ❌ 古いフィールド名
product.current_price
product.purchase_price
product.price

// ✅ 新しいフィールド名
product.price_jpy
```

**対応が必要な箇所**:
- 送料計算: `price_jpy`を使用
- 利益計算: `price_jpy`を使用
- カテゴリ分析: 価格フィルタリング
- HTML生成: 価格表示

---

#### 4. フィールド名の確認（重量・サイズ）
```typescript
// ❌ 古い書き方（直接カラム）
product.weight
product.length
product.width
product.height

// ✅ 新しい書き方（listing_data内）
product.listing_data?.weight_g
product.listing_data?.length_cm
product.listing_data?.width_cm
product.listing_data?.height_cm
```

**対応が必要な箇所**:
- 送料計算: `listing_data.weight_g`を使用
- 配送サービス選択: サイズ情報
- HTML生成: 商品仕様表示

---

### 🟡 **IMPORTANT（重要）** - データ検証

#### 5. NULL/undefined チェック
```typescript
// ❌ 危険な書き方（エラーになる）
const weight = product.listing_data.weight_g

// ✅ 安全な書き方
const weight = product.listing_data?.weight_g

// ✅ さらに安全（デフォルト値付き）
const weight = product.listing_data?.weight_g || 0
```

**必須チェック**:
```typescript
if (!product.price_jpy) {
  console.error(`❌ price_jpy不足: ID=${product.id}`)
  return // エラー処理
}

if (!product.listing_data?.weight_g) {
  console.error(`❌ weight_g不足: ID=${product.id}`)
  return // エラー処理
}
```

---

#### 6. 型の確認
```typescript
// listing_dataはJSONBなので、型を確認する
console.log('listing_data型:', typeof product.listing_data)
console.log('weight_g型:', typeof product.listing_data?.weight_g)

// 数値に変換する場合
const weight = Number(product.listing_data?.weight_g || 0)
const price = Number(product.price_jpy || 0)
```

---

### 🟢 **NICE TO HAVE（推奨）** - デバッグ・エラーハンドリング

#### 7. 詳細なログ出力
```typescript
// 🔍 各商品の処理開始時
console.log(`\n🔍 商品処理: ID=${product.id}`)
console.log(`  タイトル: ${product.title?.substring(0, 50)}`)
console.log(`  price_jpy: ${product.price_jpy}`)
console.log(`  listing_data:`, product.listing_data)

// 🔍 重要なフィールドの確認
const weight = product.listing_data?.weight_g
const price = product.price_jpy

console.log(`  → weight_g: ${weight} (型: ${typeof weight})`)
console.log(`  → price_jpy: ${price} (型: ${typeof price})`)

// ✅ 処理成功
console.log(`✅ 処理成功: ID=${product.id}`)

// ❌ 処理失敗
console.error(`❌ 処理失敗: ID=${product.id}`, {
  理由: 'エラーの詳細',
  price_jpy: product.price_jpy,
  weight_g: product.listing_data?.weight_g
})
```

---

#### 8. エラー情報の収集
```typescript
const errors: Array<{
  id: number | string
  error: string
  details?: any
}> = []

// 処理中
if (!product.price_jpy) {
  errors.push({
    id: product.id,
    error: 'price_jpy が不足しています',
    details: {
      price_jpy: product.price_jpy,
      purchase_price_jpy: product.purchase_price_jpy,
      current_price: product.current_price
    }
  })
  continue
}

// 最終結果
return NextResponse.json({
  success: errors.length === 0,
  updated: successCount,
  failed: errors.length,
  errors: errors
})
```

---

## 🎯 ツール別の具体的チェックポイント

### 1️⃣ 送料計算 (`/api/tools/shipping-calculate`)

**必須フィールド**:
- `price_jpy` ✅
- `listing_data.weight_g` ✅
- `listing_data.length_cm` (オプション)
- `listing_data.width_cm` (オプション)
- `listing_data.height_cm` (オプション)

**チェックコード**:
```typescript
// 最小限のチェック
if (!product.price_jpy || !product.listing_data?.weight_g) {
  errors.push({
    id: product.id,
    error: '価格または重量が不足',
    details: {
      price_jpy: product.price_jpy,
      weight_g: product.listing_data?.weight_g
    }
  })
  continue
}

// サイズ情報の取得（なければデフォルト値）
const dimensions = {
  length: product.listing_data?.length_cm || 20,
  width: product.listing_data?.width_cm || 15,
  height: product.listing_data?.height_cm || 10
}
```

---

### 2️⃣ 利益計算 (`/api/tools/profit-calculate`)

**必須フィールド**:
- `price_jpy` ✅
- `listing_data.ddp_price_usd` (送料計算後)
- `listing_data.shipping_cost_usd` (送料計算後)

**依存関係**: 送料計算が先に実行されている必要がある

**チェックコード**:
```typescript
// 送料計算が完了しているか確認
if (!product.listing_data?.ddp_price_usd) {
  errors.push({
    id: product.id,
    error: '送料計算が未実行です。先に送料計算を実行してください',
    details: {
      listing_data: product.listing_data
    }
  })
  continue
}

// 仕入れ価格の確認
if (!product.price_jpy) {
  errors.push({
    id: product.id,
    error: '仕入れ価格(price_jpy)が不足しています'
  })
  continue
}
```

---

### 3️⃣ カテゴリ分析 (`/api/tools/category-analyze`)

**必須フィールド**:
- `title` または `english_title`
- `price_jpy` (価格フィルタリング用)

**チェックコード**:
```typescript
// タイトルの確認
const title = product.english_title || product.title || product.title_en
if (!title) {
  errors.push({
    id: product.id,
    error: 'タイトルが不足しています'
  })
  continue
}

// 価格によるフィルタリング（オプション）
if (product.price_jpy && product.price_jpy > 100000) {
  console.log(`⚠️ 高額商品: ID=${product.id}, 価格=¥${product.price_jpy}`)
}
```

---

### 4️⃣ HTML生成 (`/api/tools/html-generate`)

**必須フィールド**:
- `title` または `english_title`
- `description` または `scraped_data.description`
- `images` または `scraped_data.images`

**チェックコード**:
```typescript
// 画像の取得
const images = product.images 
  || product.scraped_data?.images 
  || product.listing_data?.image_urls
  || []

if (!Array.isArray(images) || images.length === 0) {
  errors.push({
    id: product.id,
    error: '画像が不足しています'
  })
  continue
}

// 説明文の取得
const description = product.description 
  || product.scraped_data?.description
  || product.english_description
  || ''

if (!description) {
  console.warn(`⚠️ 説明文なし: ID=${product.id}`)
}
```

---

### 5️⃣ SM分析 (`/api/tools/sellermirror-analyze`)

**必須フィールド**:
- `title` または `english_title`
- eBay API連携（外部API）

**チェックコード**:
```typescript
// タイトルの確認
const searchTitle = product.english_title || product.title
if (!searchTitle) {
  errors.push({
    id: product.id,
    error: '検索用タイトルが不足しています'
  })
  continue
}

// eBay APIレスポンスの保存
product.sm_data = {
  sales_count: data.salesCount,
  competitor_count: data.competitorCount,
  lowest_price: data.lowestPrice,
  analyzed_at: new Date().toISOString()
}
```

---

## 🔧 共通修正パターン

### パターン1: フィールド名の一括置換

```bash
# price関連の置換
product.current_price → product.price_jpy
product.purchase_price → product.price_jpy

# weight関連の置換
product.weight → product.listing_data?.weight_g
product.length → product.listing_data?.length_cm
product.width → product.listing_data?.width_cm
product.height → product.listing_data?.height_cm
```

### パターン2: デフォルト値の設定

```typescript
// 重量のデフォルト値（500g）
const weight = product.listing_data?.weight_g || 500

// サイズのデフォルト値（20x15x10 cm）
const dimensions = {
  length: product.listing_data?.length_cm || 20,
  width: product.listing_data?.width_cm || 15,
  height: product.listing_data?.height_cm || 10
}

// 価格のフォールバック
const price = product.price_jpy 
  || product.purchase_price_jpy 
  || product.current_price 
  || 0
```

### パターン3: エラーハンドリングの標準化

```typescript
// エラー収集配列
const errors: Array<{id: number | string, error: string, details?: any}> = []
const warnings: Array<{id: number | string, warning: string}> = []
let successCount = 0

// 各商品の処理
for (const product of products) {
  try {
    // 必須チェック
    if (!product.price_jpy) {
      errors.push({
        id: product.id,
        error: 'price_jpyが不足',
        details: { price_jpy: product.price_jpy }
      })
      continue
    }

    // 処理実行
    // ...

    successCount++
  } catch (error) {
    errors.push({
      id: product.id,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

// レスポンス
return NextResponse.json({
  success: errors.length === 0,
  processed: products.length,
  succeeded: successCount,
  failed: errors.length,
  errors: errors,
  warnings: warnings
})
```

---

## 📊 診断ツールの使用

### システム健全性チェック

```typescript
// ブラウザで実行
await fetch('/api/debug/system-check?id=322')
  .then(r => r.json())
  .then(console.log)
```

### データベース診断SQL

```sql
-- database_diagnostic.sql を実行
-- Supabase管理画面 → SQL Editor で実行
```

### フロントエンドUI

```typescript
// SystemHealthCheck コンポーネントを追加
import { SystemHealthCheck } from './components/SystemHealthCheck'

// ツールバーに追加
<SystemHealthCheck />
```

---

## ✅ 修正完了チェックリスト

各ツールで以下を確認：

- [ ] Supabaseクライアントを`createClient from '@/lib/supabase/server'`に統一
- [ ] テーブル名を`products_master`に変更
- [ ] `price_jpy`フィールドを使用
- [ ] `listing_data.weight_g`などJSONBフィールドを正しく取得
- [ ] NULL/undefinedチェックを実装
- [ ] 詳細なエラーログを出力
- [ ] エラー情報を収集して返す
- [ ] テストケースで動作確認

---

## 🚀 次のアクション

1. **診断実行**: `/api/debug/system-check?id=322`でシステムをチェック
2. **問題特定**: エラーログから問題箇所を特定
3. **修正実施**: このチェックリストに従って修正
4. **動作確認**: 実際のツールで動作確認
5. **他ツール展開**: 同じパターンで他のツールも修正

---

このチェックリストを使えば、全ツールの問題を体系的に発見・修正できます！
