# 🔧 NAGANO-3 v2.0 完全修正ガイド
## products_master移行に伴う問題と解決策

---

## 📚 目次
1. [問題の全体像](#問題の全体像)
2. [なぜこの問題が起きたのか](#なぜこの問題が起きたのか)
3. [データの流れ](#データの流れ)
4. [具体的な問題点](#具体的な問題点)
5. [修正手順](#修正手順)
6. [他のツールへの適用](#他のツールへの適用)

---

## 🎯 問題の全体像

### **症状**
- Excelテーブルの「取得価格(JPY)」列が空白
- 送料計算ボタンを押すと「重量または価格情報が不足」エラー
- モーダルの「価格（USD）」が円のまま表示される
- 編集したデータが保存されない

### **原因**
products_masterテーブルに移行したことで、以下の3つの問題が発生：

1. **フィールド名の不一致**
   - 旧: `current_price`, `purchase_price`
   - 新: `price_jpy`
   
2. **データ構造の変化**
   - 旧: 個別のカラム（`weight`, `length`など）
   - 新: JSONBカラム（`listing_data.weight_g`など）

3. **データ取得ロジックの未対応**
   - 旧テーブルからのデータを前提としたコード
   - 新テーブルの構造に対応していない

---

## 🤔 なぜこの問題が起きたのか

### **Before（旧システム）**
```
yahoo_scraped_products テーブル
├── id: INTEGER
├── current_price: DECIMAL  ← 価格はここ
├── weight: DECIMAL         ← 重量はここ
├── length: DECIMAL         ← 長さはここ
└── ...
```

### **After（新システム）**
```
products_master テーブル
├── id: BIGINT
├── price_jpy: DECIMAL      ← 価格はここ（名前変更）
├── listing_data: JSONB     ← 重量・サイズはこの中
│   ├── weight_g: 500
│   ├── length_cm: 10
│   └── ...
└── ...
```

### **なぜJSONBにしたのか？**
- 複数のソース（Yahoo, eBay, 在庫など）からデータを統合
- 各ソースで異なるフィールドがある
- JSONBなら柔軟にデータを格納できる

**しかし！** → 既存のコードは旧構造を前提にしていた

---

## 🔄 データの流れ

### **正常な流れ（期待される動作）**

```
1️⃣ データベース
   products_master.price_jpy = 1500
   products_master.listing_data = {"weight_g": 500}

2️⃣ フロントエンド取得 (lib/supabase/products.ts)
   fetchProducts() 
   ↓
   データをマッピング
   - price_jpy → そのまま
   - listing_data.weight_g → 取り出し

3️⃣ Excelテーブル表示
   取得価格(JPY): 1500  ← 表示される
   重さ(g): 500         ← 表示される

4️⃣ 編集
   ユーザーが値を変更
   ↓
   handleCellBlur() で変更を検知
   ↓
   updateLocalProduct() でメモリ更新

5️⃣ 保存
   「保存(1)」ボタン
   ↓
   updateProduct() でDB更新

6️⃣ API呼び出し
   「送料計算」ボタン
   ↓
   price_jpy と weight_g を使って計算
   ↓
   ✅ 成功！
```

### **現在の流れ（壊れている）**

```
1️⃣ データベース
   products_master.price_jpy = 1500  ✅
   products_master.listing_data = {"weight_g": 500}  ✅

2️⃣ フロントエンド取得
   fetchProducts()
   ↓
   ❌ データマッピングが不完全
   - price_jpy → 取得されるが表示されない
   - listing_data.weight_g → 正しく取り出せない

3️⃣ Excelテーブル表示
   取得価格(JPY): (空白)  ❌
   重さ(g): (空白)        ❌

4️⃣ API呼び出し
   「送料計算」ボタン
   ↓
   price_jpy = undefined  ❌
   weight_g = undefined   ❌
   ↓
   ❌ エラー: 重量または価格情報が不足
```

---

## 🐛 具体的な問題点

### **問題1: price_jpyが表示されない**

**場所**: EditingTable.tsx の表示ロジック

**現状のコード**:
```typescript
{ field: 'price_jpy', align: 'right' }
```

**問題**: 
- フィールド名は正しい
- しかし、データがproduct.price_jpyに入っていない可能性

**確認方法**:
```typescript
console.log('商品データ:', product)
console.log('price_jpy:', product.price_jpy)
```

**考えられる原因**:
1. データベースに`price_jpy`が入っていない
2. `fetchProducts`でフィールドを取得していない
3. マッピング処理で欠落している

---

### **問題2: listing_data.weight_gが取得できない**

**場所**: shipping-calculate/route.ts

**現状のコード**:
```typescript
const listingData = product.listing_data || {}
const weight_g = listingData.weight_g  // ❌ undefinedになる
```

**問題**:
- `product.listing_data`が空のオブジェクト `{}`
- または`weight_g`が存在しない

**確認方法**:
```typescript
console.log('listing_data:', product.listing_data)
console.log('weight_g:', product.listing_data?.weight_g)
console.log('listing_data型:', typeof product.listing_data)
```

---

### **問題3: モーダルの価格表示（USD変換が必要）**

**場所**: ProductModal.tsx（推測）

**現状**:
```
価格（USD）: 1500  ❌ これは円
```

**期待される表示**:
```
価格（USD）: $10.00  ✅ ドルに変換
```

**必要な処理**:
```typescript
// 円→ドル変換（為替レート150円/$）
const priceUsd = product.price_jpy / 150
// → 1500 / 150 = 10.00
```

---

## 🔧 修正手順

### **Step 1: データベースの確認**

まず、データベースに正しいデータが入っているか確認：

```sql
SELECT 
  id,
  title,
  price_jpy,
  listing_data,
  listing_data->>'weight_g' as weight_g_value
FROM products_master
WHERE id = 322;
```

**期待される結果**:
```
id: 322
title: "商品名"
price_jpy: 1500
listing_data: {"weight_g": 500, ...}
weight_g_value: "500"
```

**もしprice_jpyがNULLなら**:
```sql
UPDATE products_master
SET price_jpy = 1500
WHERE id = 322;
```

**もしlisting_dataがNULLまたは{}なら**:
```sql
UPDATE products_master
SET listing_data = jsonb_set(
  COALESCE(listing_data, '{}'::jsonb),
  '{weight_g}',
  '500'::jsonb
)
WHERE id = 322;
```

---

### **Step 2: fetchProductsのデバッグ**

**場所**: lib/supabase/products.ts

**現在のコード**:
```typescript
export async function fetchProducts(limit = 100, offset = 0) {
  const { data, error, count } = await supabase
    .from('products_master')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // ...マッピング処理
  const mappedData = (data || []).map(product => ({
    ...product,
    english_title: product.title_en,
  }))
  
  return { products: mappedData as Product[], total: count || 0 }
}
```

**追加すべきデバッグログ**:
```typescript
export async function fetchProducts(limit = 100, offset = 0) {
  const { data, error, count } = await supabase
    .from('products_master')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching products:', error)
    throw error
  }

  // 🔍 デバッグ: 最初の商品の生データを確認
  if (data && data.length > 0) {
    console.log('📊 最初の商品の生データ:', {
      id: data[0].id,
      price_jpy: data[0].price_jpy,          // ← これが undefined なら問題
      listing_data: data[0].listing_data,     // ← これが {} なら問題
      listing_data型: typeof data[0].listing_data,
      weight_g: data[0].listing_data?.weight_g
    })
  }

  // マッピング処理
  const mappedData = (data || []).map(product => ({
    ...product,
    english_title: product.title_en,
  }))
  
  // 🔍 デバッグ: マッピング後のデータを確認
  if (mappedData.length > 0) {
    console.log('📊 マッピング後の最初の商品:', {
      id: mappedData[0].id,
      price_jpy: mappedData[0].price_jpy,
      listing_data: mappedData[0].listing_data,
      weight_g: mappedData[0].listing_data?.weight_g
    })
  }

  return { products: mappedData as Product[], total: count || 0 }
}
```

---

### **Step 3: EditingTableの表示確認**

**場所**: app/tools/editing/components/EditingTable.tsx

**price_jpy列のコード**:
```typescript
{ field: 'price_jpy', align: 'right' }
```

これは正しいです。しかし、値が表示されない場合：

**デバッグ追加**:
```typescript
{[
  { field: 'sku', align: 'left' },
  { field: 'title', align: 'left' },
  { field: 'english_title', align: 'left' },
  { field: 'price_jpy', align: 'right' },  // ← ここ
  // ...
].map(({ field, align, jsonb, fallback }) => {
  let value = ''
  
  if (jsonb && field.includes('.')) {
    // JSONB処理
    const [obj, key] = field.split('.')
    value = product[obj as keyof Product]?.[key] ?? ''
  } else {
    // 通常フィールド
    value = product[field as keyof Product] ?? ''
    
    // 🔍 デバッグ: price_jpyの場合
    if (field === 'price_jpy') {
      console.log(`💰 商品ID=${product.id} price_jpy:`, {
        値: value,
        product_price_jpy: product.price_jpy,
        型: typeof product.price_jpy
      })
    }
  }
  
  return (
    <EditableCell
      key={field}
      value={String(value)}
      // ...
    />
  )
})}
```

---

### **Step 4: APIのデバッグ**

**場所**: app/api/tools/shipping-calculate/route.ts

**問題箇所**:
```typescript
const listingData = product.listing_data || {}
const weight_g = listingData.weight_g
const price_jpy = product.price_jpy

if (!weight_g || !price_jpy) {
  console.warn(`⚠️ 重量または価格情報不足: ${product.title}`)
  errors.push({ 
    id: product.id, 
    error: '重量または価格情報が不足しています' 
  })
  continue
}
```

**改善版（詳細デバッグ付き）**:
```typescript
console.log(`🔍 商品処理開始: ID=${product.id}`)
console.log(`  タイトル: ${product.title}`)

const listingData = product.listing_data || {}
console.log(`  listing_data:`, listingData)
console.log(`  listing_data型:`, typeof listingData)

const weight_g = listingData.weight_g
console.log(`  weight_g:`, weight_g, `(型: ${typeof weight_g})`)

const price_jpy = product.price_jpy
console.log(`  price_jpy:`, price_jpy, `(型: ${typeof price_jpy})`)

if (!weight_g || !price_jpy) {
  console.error(`❌ データ不足の詳細:`)
  console.error(`  price_jpy: ${price_jpy} (${price_jpy ? '✅' : '❌ NULL/undefined'})`)
  console.error(`  weight_g: ${weight_g} (${weight_g ? '✅' : '❌ NULL/undefined'})`)
  console.error(`  listing_data全体:`, JSON.stringify(listingData, null, 2))
  
  errors.push({ 
    id: product.id, 
    error: `重量または価格情報が不足: price_jpy=${price_jpy}, weight_g=${weight_g}`
  })
  continue
}
```

---

## 🎯 他のツールへの適用

### **同様の問題が起きる可能性のあるツール**

1. **利益計算** (`/api/tools/profit-calculate`)
2. **カテゴリ分析** (`/api/tools/category-analyze`)
3. **HTML生成** (`/api/tools/html-generate`)
4. **SM分析** (`/api/tools/sellermirror-analyze`)
5. **スコア計算** (まだ実装されていない場合)

### **チェックリスト**

各ツールで以下を確認：

#### ✅ **データ取得部分**
```typescript
// ❌ 古い書き方
const price = product.current_price
const weight = product.weight

// ✅ 新しい書き方
const price = product.price_jpy
const weight = product.listing_data?.weight_g
```

#### ✅ **フィールド名の確認**
```typescript
// products_master の構造
{
  price_jpy: number,           // 旧: current_price, purchase_price
  listing_data: {
    weight_g: number,          // 旧: weight
    length_cm: number,         // 旧: length
    width_cm: number,          // 旧: width
    height_cm: number,         // 旧: height
    ddp_price_usd: number,     // 計算結果
    ddu_price_usd: number,     // 計算結果
    // ...
  }
}
```

#### ✅ **エラーハンドリング**
```typescript
// 詳細なエラーメッセージ
if (!requiredField) {
  console.error(`❌ 必須フィールドが不足:`, {
    商品ID: product.id,
    タイトル: product.title,
    不足フィールド: 'field_name',
    現在の値: product.field_name,
    listing_data全体: product.listing_data
  })
}
```

---

## 📖 まとめ: 何が起きているのか

### **問題の本質**

1. **データベースは正しい** → products_masterにデータは入っている
2. **フロントエンド取得は正しい** → fetchProductsでデータを取得している
3. **問題は「データの橋渡し」** → 取得したデータが正しく使われていない

### **なぜ動かないのか**

```
データベース → [正常] → フロントエンド → [❌断絶] → 表示/API

この「断絶」の原因:
1. フィールド名の不一致（price vs price_jpy）
2. JSONB構造の理解不足（listing_data.weight_gの取り出し方）
3. デバッグログの不足（どこで問題が起きているか不明）
```

### **修正の方針**

1. **まずデータを見る** → console.logで実際のデータ構造を確認
2. **一箇所ずつ直す** → データベース → fetch → 表示 → API
3. **他のツールにも適用** → 同じパターンで修正

---

## 🚀 次のアクション

### **すぐにできること**

1. **ブラウザのコンソールを開く**
2. **ID=322の商品データを確認**
   ```javascript
   // EditingTableが表示されたら、コンソールに出力される
   // 「📦 EditingTable: productsデータ」を確認
   ```
3. **price_jpyとlisting_dataが正しく取得できているか確認**

### **データベースで確認**

```sql
SELECT 
  id, title, price_jpy,
  listing_data,
  listing_data->>'weight_g' as weight_g
FROM products_master
WHERE id = 322;
```

### **修正の順序**

1. データベースにデータがあるか確認 → なければ追加
2. fetchProductsで取得できているか確認 → できていなければ修正
3. EditingTableで表示されているか確認 → されていなければ修正
4. APIで受け取れているか確認 → 受け取れていなければ修正

---

この指示書を使って、一つずつ確認していけば、必ず問題が解決します！
