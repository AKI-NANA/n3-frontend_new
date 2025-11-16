# HTMLプレビューの英語表示とタイトル翻訳 - 修正内容

## 📋 問題点

### 1. プレビューが日本語のまま
- ProductModalで`listing_data.html_description`（日本語HTML）を表示
- `listing_data.html_description_en`（英語HTML）が生成されているが使われていない

### 2. タイトルが翻訳されていない
- 画面に表示される商品タイトルも日本語のまま

---

## 🔧 修正内容

### 修正1: ProductModalで英語HTMLを優先表示

**ファイル:** `app/tools/editing/components/ProductModal.tsx`

**修正箇所（71行目付近）:**
```typescript
// 修正前
description: product.listing_data?.html_description || product.description || '',

// 修正後
description: product.listing_data?.html_description_en ||  // ← 英語HTML優先
             product.listing_data?.html_description ||      // ← フォールバック
             product.description || 
             '',
```

**修正箇所（タイトル部分）:**
```typescript
// 修正前
title: product.title,

// 修正後  
title: product.english_title || product.title_en || product.title,  // ← 英語タイトル優先
```

---

### 修正2: EditingTableでタイトルに英語を表示

**ファイル:** `app/tools/editing/components/EditingTable.tsx`

**現状:** 既に英語タイトル列がある ✅

**追加修正:** 商品名列にも英語を表示

```typescript
// 商品名列の表示を変更
{ field: 'title', align: 'left' }
↓
表示時に english_title があれば優先表示
```

---

### 修正3: 言語切り替えボタンの追加（オプション）

ProductModalに日本語/英語切り替えボタンを追加

```typescript
const [displayLanguage, setDisplayLanguage] = useState<'ja' | 'en'>('en')

// 表示HTMLの選択
const displayHTML = displayLanguage === 'en' 
  ? product.listing_data?.html_description_en 
  : product.listing_data?.html_description
```

---

## 📝 実装手順

### Step 1: ProductModalの修正

2箇所を修正:
1. `description`フィールド - 英語HTML優先
2. `title`フィールド - 英語タイトル優先

### Step 2: 動作確認

1. HTMLボタンをクリック
2. プレビューが英語で表示されることを確認
3. タイトルも英語で表示されることを確認

---

## 🎯 期待される結果

### 修正前
```
プレビューモーダル:
- タイトル: "ポケモン ピカチュウ トートバッグ" ❌
- 説明: "商品説明\nこの商品は高品質です" ❌
```

### 修正後
```
プレビューモーダル:
- タイトル: "Pokemon Pikachu Tote Bag" ✅
- 説明: "Product Description\nThis product is high quality" ✅
```

---

次のステップで修正を実装しますか？
