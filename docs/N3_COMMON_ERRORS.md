# N3 よくあるエラーと解決策

## エラー 1: 画像が表示されない

### 原因

1. `gallery_images` が null または空配列
2. 画像 URL の優先順位が間違っている
3. モーダルコンポーネントが `scraped_data.images` を参照している

### 解決策

```typescript
// ✅ 正しい優先順位
const images =
  product.gallery_images ||
  product.scraped_data?.images ||
  product.images ||
  [];
```

## エラー 2: カテゴリーが表示されない

### 原因

`scraped_data.category` が存在しない

### 確認方法

```sql
SELECT scraped_data FROM products_master WHERE id = 123;
```

### 解決策

スクレイピングコードでカテゴリーを取得しているか確認

## エラー 3: 価格が 0 円表示

### 原因

1. `price_jpy` が null
2. マッピングが間違っている

### 解決策

```typescript
const priceJPY = product.price_jpy || product.cost_price || 0;
```

## エラー 4: origin_country カラムが見つからない

### エラーメッセージ

```
Could not find the 'origin_country' column
```

### 解決策

```sql
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS origin_country TEXT;
```

```

---

## 📤 Geminiへのアップロード手順

### ステップ1: ファイルを作成

上記の5つのMarkdownファイルを作成：
1. `N3_PROJECT_STRUCTURE.md`
2. `N3_DATABASE_SCHEMA.md`
3. `N3_CSS_MODULES_GUIDE.md`
4. `N3_DATA_FLOW.md`
5. `N3_COMMON_ERRORS.md`

### ステップ2: Google Driveにアップロード

プロジェクト専用フォルダを作成：
```

Google Drive/
└── N3 開発ドキュメント/
├── N3_PROJECT_STRUCTURE.md
├── N3_DATABASE_SCHEMA.md
├── N3_CSS_MODULES_GUIDE.md
├── N3_DATA_FLOW.md
└── N3_COMMON_ERRORS.md
