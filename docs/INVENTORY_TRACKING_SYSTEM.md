# 在庫・価格追従システム (B-3) - 実装ドキュメント

## 概要

多販路対応の在庫・価格追従システムです。複数の仕入先URLを登録し、在庫切れ時に自動的に別の仕入先に切り替えることで、在庫切れリスクを最小化します。

## 主な機能

### 1. 複数URL管理
- 商品ごとに複数の仕入先URL（`reference_urls`）を登録可能
- 価格と在庫状況をJSONB形式で管理
- 優先順位は配列の順序で決定（最安値URLを優先）

### 2. 自動URL切替
- 優先URLが在庫切れの場合、自動的に次のURLに切り替え
- 切り替え履歴を `inventory_tracking_logs` に記録
- 全URLが在庫切れの場合、全モールで在庫をゼロに設定

### 3. 中央値価格計算
- 登録された全URLの価格から中央値を算出
- 価格変動の異常検知に活用

### 4. 高頻度チェック
- 通常頻度と高頻度の2種類のチェック間隔
- Shopeeセール時などに高頻度チェックに切り替え可能

### 5. モール同期キュー
- 在庫変動時に自動的に各モールの出品を更新
- `inventory_sync_queue` テーブルでキュー管理

## データベース構造

### 新しいフィールド（products テーブル）

```sql
-- 在庫・価格追従システム用フィールド
reference_urls JSONB          -- 複数の仕入先URL: [{url, price, is_available}]
median_price DECIMAL(10, 2)   -- 中央値価格
current_stock_count INTEGER   -- 現在在庫数
last_check_time TIMESTAMP     -- 最終チェック時刻
check_frequency TEXT          -- チェック頻度: '通常' | '高頻度'
```

### 新しいテーブル

#### inventory_tracking_logs
在庫追従システムのチェック履歴ログ

```sql
id UUID PRIMARY KEY
product_id UUID               -- 商品ID
checked_at TIMESTAMP          -- チェック時刻
reference_url TEXT            -- チェックしたURL
check_status TEXT             -- チェック結果: 'success' | 'out_of_stock' | 'error'
price_at_check DECIMAL        -- チェック時の価格
stock_at_check INTEGER        -- チェック時の在庫数
price_changed BOOLEAN         -- 価格変動フラグ
old_price DECIMAL             -- 旧価格
new_price DECIMAL             -- 新価格
stock_changed BOOLEAN         -- 在庫変動フラグ
old_stock INTEGER             -- 旧在庫数
new_stock INTEGER             -- 新在庫数
source_switched BOOLEAN       -- 仕入先切替フラグ
switched_from_url TEXT        -- 切替元URL
switched_to_url TEXT          -- 切替先URL
error_message TEXT            -- エラーメッセージ
```

#### inventory_sync_queue
モール出品への在庫・価格同期キュー

```sql
id UUID PRIMARY KEY
product_id UUID               -- 商品ID
marketplace TEXT              -- モール名: 'shopee' | 'ebay' | 'mercari'
action TEXT                   -- アクション: 'update_stock' | 'update_price' | 'delist'
new_stock INTEGER             -- 新在庫数
new_price DECIMAL             -- 新価格
status TEXT                   -- ステータス: 'pending' | 'processing' | 'completed' | 'failed'
retry_count INTEGER           -- リトライ回数
max_retries INTEGER           -- 最大リトライ回数
error_message TEXT            -- エラーメッセージ
last_attempted_at TIMESTAMP   -- 最終試行時刻
completed_at TIMESTAMP        -- 完了時刻
```

## セットアップ手順

### 1. データベースマイグレーション

```bash
# マイグレーションファイルを実行
psql -U postgres -d your_database -f migrations/20251121_add_inventory_tracking_fields.sql
```

または、Supabase ダッシュボードのSQL Editorから実行してください。

### 2. 商品データの準備

各商品に `reference_urls` を設定します：

```javascript
// 例: 商品に複数の仕入先URLを設定
const reference_urls = [
  {
    url: "https://example.com/product1", // 最優先（最安値）
    price: 5000,
    is_available: true
  },
  {
    url: "https://example.com/product2", // 第二優先
    price: 5500,
    is_available: true
  },
  {
    url: "https://example.com/product3", // 第三優先
    price: 6000,
    is_available: true
  }
]

await supabase
  .from('products')
  .update({ reference_urls })
  .eq('id', product_id)
```

### 3. スケジューラの設定

cron または Node-Cron を使用してバッチ実行をスケジュール：

```javascript
// 例: node-cron を使用
import cron from 'node-cron'

// 通常頻度: 1日1回（夜間2時）
cron.schedule('0 2 * * *', async () => {
  console.log('通常頻度チェック開始')
  await fetch('http://localhost:3000/api/inventory-tracking/execute?check_frequency=通常')
})

// 高頻度: 30分ごと
cron.schedule('*/30 * * * *', async () => {
  console.log('高頻度チェック開始')
  await fetch('http://localhost:3000/api/inventory-tracking/execute?check_frequency=高頻度')
})
```

## API エンドポイント

### 1. バッチ実行API

**GET** `/api/inventory-tracking/execute`

複数商品の在庫を一括チェック

**クエリパラメータ:**
- `max_items`: 最大処理件数（デフォルト: 50）
- `check_frequency`: 頻度フィルタ（'通常' | '高頻度'）
- `delay_min`: 最小待機時間（秒、デフォルト: 30）
- `delay_max`: 最大待機時間（秒、デフォルト: 120）

**レスポンス:**
```json
{
  "success": true,
  "message": "バッチ処理が完了しました",
  "result": {
    "total_processed": 50,
    "successful": 48,
    "failed": 2,
    "changes_detected": 12,
    "sources_switched": 3,
    "all_out_of_stock_count": 1
  }
}
```

**使用例:**
```bash
# 通常頻度の商品を最大50件チェック
curl "http://localhost:3000/api/inventory-tracking/execute?check_frequency=通常&max_items=50"

# 高頻度の商品を最大20件チェック
curl "http://localhost:3000/api/inventory-tracking/execute?check_frequency=高頻度&max_items=20"
```

### 2. 単一商品チェックAPI

**POST** `/api/inventory-tracking/execute`

単一商品の在庫をチェック

**リクエストボディ:**
```json
{
  "product_id": "uuid-here"
}
```

**レスポンス:**
```json
{
  "success": true,
  "result": {
    "product_id": "uuid-here",
    "sku": "SKU-001",
    "success": true,
    "changes_detected": true,
    "source_switched": true,
    "switched_from_url": "https://example.com/product1",
    "switched_to_url": "https://example.com/product2",
    "old_price": 5000,
    "new_price": 5500,
    "old_stock": 10,
    "new_stock": 5,
    "all_out_of_stock": false
  }
}
```

### 3. チェック頻度制御API

**POST** `/api/inventory-tracking/frequency`

商品のチェック頻度を変更

**リクエストボディ:**
```json
{
  "product_ids": ["uuid1", "uuid2", "uuid3"],
  "frequency": "高頻度"  // or "通常"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "3件の商品のチェック頻度を高頻度に変更しました",
  "updated_count": 3
}
```

**使用例:**
```javascript
// Shopeeセール開始時: セール商品を高頻度チェックに切り替え
const shopee_product_ids = ['uuid1', 'uuid2', 'uuid3']
await fetch('/api/inventory-tracking/frequency', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_ids: shopee_product_ids,
    frequency: '高頻度'
  })
})

// セール終了時: 通常頻度に戻す
await fetch('/api/inventory-tracking/frequency', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_ids: shopee_product_ids,
    frequency: '通常'
  })
})
```

## UI連携（/inventory-monitoring）

既存の `/inventory-monitoring` ページに以下の機能を追加できます：

### 1. 参照URL表示
商品詳細エリアに、登録されている仕入先URLと在庫状況を表示

### 2. 切替履歴
`inventory_tracking_logs` テーブルから切替履歴を取得して表示

例：
```
2025-11-21 10:30:00 | 仕入先自動切替
  URL 1 → URL 2 に切替（在庫切れのため）
  価格: ¥5,000 → ¥5,500 (+¥500)
```

### 3. チェック頻度切替UI
ドロップダウンで「通常」「高頻度」を切り替え

```typescript
// 例: チェック頻度切替コンポーネント
<select
  value={product.check_frequency}
  onChange={async (e) => {
    await fetch('/api/inventory-tracking/frequency', {
      method: 'POST',
      body: JSON.stringify({
        product_ids: [product.id],
        frequency: e.target.value
      })
    })
  }}
>
  <option value="通常">通常</option>
  <option value="高頻度">高頻度</option>
</select>
```

## 運用フロー

### 日常運用

1. **夜間バッチ（2:00 AM）**
   - 通常頻度の商品を全件チェック
   - 在庫切れを検知し、自動的に別の仕入先に切り替え

2. **高頻度チェック（30分ごと）**
   - セール中の商品のみをチェック
   - 在庫変動をリアルタイムで検知

3. **モール同期**
   - `inventory_sync_queue` を処理し、各モールの出品を更新
   - 在庫切れ商品は自動的に出品停止

### Shopeeセール対応

1. **セール開始前**
   ```javascript
   // セール対象商品を高頻度チェックに切り替え
   await fetch('/api/inventory-tracking/frequency', {
     method: 'POST',
     body: JSON.stringify({
       product_ids: shopee_sale_products,
       frequency: '高頻度'
     })
   })
   ```

2. **セール期間中**
   - 30分ごとに在庫をチェック
   - 在庫切れ時は即座に別の仕入先に切替

3. **セール終了後**
   ```javascript
   // 通常頻度に戻す
   await fetch('/api/inventory-tracking/frequency', {
     method: 'POST',
     body: JSON.stringify({
       product_ids: shopee_sale_products,
       frequency: '通常'
     })
   })
   ```

## トラブルシューティング

### 在庫チェックが実行されない

1. `reference_urls` が設定されているか確認
   ```sql
   SELECT id, sku, reference_urls
   FROM products
   WHERE reference_urls IS NOT NULL
     AND jsonb_array_length(reference_urls) > 0;
   ```

2. スケジューラが正しく設定されているか確認

### 仕入先が自動切替されない

1. `reference_urls` の順序を確認（優先順位順になっているか）
2. 各URLの `is_available` フラグを確認

### モール同期が実行されない

1. `inventory_sync_queue` テーブルを確認
   ```sql
   SELECT * FROM inventory_sync_queue
   WHERE status = 'pending'
   ORDER BY created_at DESC;
   ```

2. 同期処理ワーカーが起動しているか確認

## まとめ

この在庫・価格追従システムにより、以下が実現されます：

✅ 複数仕入先の自動管理
✅ 在庫切れ時の自動URL切替
✅ Shopeeセール時の高頻度チェック
✅ 全モールへの自動在庫同期
✅ 在庫切れリスクの最小化

既存の `/inventory-monitoring` UIと統合することで、ユーザーフレンドリーな在庫管理システムが完成します。
