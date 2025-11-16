# Phase 5: eBay出品システム統合 - 実装完了ドキュメント

## 📋 実装概要

products_masterテーブルからeBay APIへの直接出品機能を実装しました。

## 🎯 実装内容

### 1. APIエンドポイント

#### `/api/ebay/listing` (POST)
- products_masterから商品を取得しeBayに出品
- 出品成功後、products_masterを自動更新
- 必須フィールドの検証機能

**リクエスト:**
```json
{
  "productId": 123,
  "account": "account1"  // または "account2"
}
```

**レスポンス:**
```json
{
  "success": true,
  "listingId": "123456789012",
  "offerId": "987654321",
  "url": "https://www.ebay.com/itm/123456789012",
  "product": {
    "id": 123,
    "sku": "SKU-001",
    "title": "Product Title"
  }
}
```

#### `/api/ebay/sync` (POST/GET)
- eBay在庫状態とproducts_masterの同期
- 在庫数、価格、ステータスの自動更新

**同期実行 (POST):**
```json
{
  "account": "account1",
  "syncAll": true
}
```

**ステータス確認 (GET):**
```
GET /api/ebay/sync?sku=SKU-001
```

### 2. データベース同期トリガー

#### `ebay_products_sync_triggers.sql`

**自動同期機能:**
1. `ebay_inventory` → `products_master`: eBayから取得したデータを自動反映
2. `products_master` → `ebay_inventory`: 出品情報を自動同期
3. 削除時処理: eBay削除時にフラグをfalseに設定

**データ整合性チェック:**
```sql
SELECT * FROM check_ebay_data_integrity();
```

### 3. フロントエンドコンポーネント

#### `EbayListingButton.tsx`
- products_master承認画面からワンクリック出品
- アカウント選択機能
- 出品状態のリアルタイム表示

**使用例:**
```tsx
import { EbayListingButton } from '@/components/ebay/EbayListingButton'

<EbayListingButton
  productId={product.id}
  sku={product.sku}
  title={product.title_en || product.title_ja}
  onSuccess={(listingId) => {
    console.log('Listed:', listingId)
  }}
/>
```

#### `EbaySyncBadge.tsx`
- eBay出品状態の視覚的表示
- Listing IDへのリンク
- 最終同期時刻の表示

**使用例:**
```tsx
import { EbaySyncBadge, EbaySyncDetails } from '@/components/ebay/EbaySyncBadge'

<EbaySyncBadge
  ebayListed={product.ebay_listed}
  ebayListingId={product.ebay_listing_id}
  ebayApiData={product.ebay_api_data}
/>

<EbaySyncDetails product={product} />
```

## 🔧 セットアップ手順

### 1. データベーストリガーの適用

```bash
psql -h [SUPABASE_HOST] -U postgres -d postgres -f database/migrations/ebay_products_sync_triggers.sql
```

### 2. 環境変数の確認

`.env.local`に以下が設定されていることを確認:

```env
# eBay Account 1 (メインアカウント)
EBAY_USER_ACCESS_TOKEN=v^1.1|...
EBAY_AUTH_TOKEN=v^1.1|...

# eBay Account 2 (サブアカウント)
EBAY_USER_TOKEN_GREEN=v^1.1|...

# eBay API Credentials
EBAY_CLIENT_ID_GREEN=...
EBAY_CLIENT_SECRET_GREEN=...
```

### 3. 既存データの初期同期

```sql
-- ebay_inventoryから取得
SELECT sync_ebay_inventory_to_products_master()
FROM ebay_inventory
LIMIT 100;

-- データ整合性の確認
SELECT * FROM check_ebay_data_integrity();
```

## 📊 products_masterの必須フィールド

eBay出品には以下のフィールドが必要です:

### `listing_data` (JSONB)
```json
{
  "condition": "Used",
  "html_description": "<h1>Product Description</h1>",
  "ddp_price_usd": 29.99,
  "ddu_price_usd": 24.99,
  "shipping_service": "International Priority Shipping",
  "shipping_cost_usd": 5.00,
  "weight_g": 100,
  "width_cm": 7,
  "height_cm": 1,
  "length_cm": 10
}
```

### `ebay_api_data` (JSONB)
```json
{
  "category_id": "183454",
  "title": "Product Title in English"
}
```

### `scraped_data` (JSONB)
```json
{
  "image_urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

## 🧪 テスト手順

### 1. 単一商品のテスト出品

```bash
curl -X POST http://localhost:3000/api/ebay/listing \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 123,
    "account": "account1"
  }'
```

### 2. eBay同期のテスト

```bash
# 同期実行
curl -X POST http://localhost:3000/api/ebay/sync \
  -H "Content-Type: application/json" \
  -d '{
    "account": "account1",
    "syncAll": true
  }'

# 同期状態確認
curl http://localhost:3000/api/ebay/sync?sku=SKU-001
```

### 3. フロントエンドからのテスト

1. 承認画面 (`/approval`) を開く
2. 商品カードに「eBay出品」ボタンが表示されることを確認
3. ボタンをクリックして出品ダイアログを開く
4. アカウントを選択して「出品する」をクリック
5. 成功メッセージとListing IDが表示されることを確認

## 🔍 トラブルシューティング

### エラー: "listing_data is missing"
**原因:** 商品に`listing_data`が設定されていない  
**解決:** 編集ツールで必須フィールドを設定

### エラー: "eBay category_id is missing"
**原因:** eBayカテゴリーが選択されていない  
**解決:** カテゴリー選択ツールでカテゴリーを設定

### エラー: "No images available"
**原因:** 商品画像が登録されていない  
**解決:** スクレイピングまたは手動で画像を追加

### 出品後にproducts_masterが更新されない
**原因:** トリガーが正しく設定されていない  
**解決:** トリガーSQLを再実行

```sql
-- トリガーの確認
SELECT * FROM pg_trigger 
WHERE tgname LIKE '%ebay%';

-- トリガーの再作成
\i database/migrations/ebay_products_sync_triggers.sql
```

## 📈 パフォーマンス最適化

### インデックス

実装済みのインデックス:
- `idx_products_master_ebay_listed`
- `idx_products_master_ebay_listing_id`
- `idx_products_master_sku_ebay`
- `idx_ebay_inventory_sku`
- `idx_ebay_inventory_ebay_item_id`
- `idx_ebay_inventory_status`

### バッチ処理

大量出品時は以下のアプローチを使用:

```typescript
// 複数商品を順次出品
const productIds = [1, 2, 3, 4, 5]

for (const productId of productIds) {
  const result = await fetch('/api/ebay/listing', {
    method: 'POST',
    body: JSON.stringify({ productId, account: 'account1' })
  })
  
  // eBay APIレート制限を考慮して待機
  await new Promise(resolve => setTimeout(resolve, 1000))
}
```

## 🔐 セキュリティ考慮事項

1. **認証トークンの保護**
   - User Tokenは環境変数で管理
   - フロントエンドに露出させない

2. **APIレート制限**
   - eBay APIの呼び出し制限に注意
   - エラー時はリトライ戦略を実装

3. **データ検証**
   - 出品前に必須フィールドを検証
   - 不正なデータでの出品を防止

## 📝 今後の拡張予定

1. **バッチ出品機能**
   - 複数商品の一括出品
   - スケジュール出品

2. **価格・在庫の自動更新**
   - リアルタイム同期
   - Webhookによる通知

3. **エラーリカバリー**
   - 自動リトライ機能
   - エラーログの詳細記録

4. **レポート機能**
   - 出品成功率の追跡
   - eBay手数料の自動計算

## ✅ 実装完了チェックリスト

- [x] APIエンドポイント作成 (`/api/ebay/listing`, `/api/ebay/sync`)
- [x] データベーストリガー実装
- [x] フロントエンドコンポーネント作成
- [x] エラーハンドリング実装
- [x] データ検証ロジック実装
- [x] ドキュメント作成

## 🎉 Phase 5完了

eBay出品システムの統合が完了しました。products_masterテーブルから直接eBayに出品でき、在庫状態も自動同期されます。
