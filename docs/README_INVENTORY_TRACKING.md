# 在庫・価格追従システム (B-3)

多販路対応の在庫・価格追従システム - 完全自動化ソリューション

## 📋 目次

1. [概要](#概要)
2. [主な機能](#主な機能)
3. [システム構成](#システム構成)
4. [クイックスタート](#クイックスタート)
5. [ドキュメント](#ドキュメント)

## 概要

このシステムは、複数の仕入先URLを登録し、在庫切れ時に自動的に別の仕入先に切り替えることで、在庫切れリスクを最小化します。

### 解決する課題

- 🚨 **在庫切れリスク**: 単一仕入先に依存すると、在庫切れ時に販売機会を失う
- 💰 **価格変動**: 仕入先の価格変動を手動で監視するのは困難
- 🔄 **モール同期**: 複数モールの在庫を手動で更新するのは非効率
- ⏰ **セール対応**: Shopeeセール時に高頻度で在庫をチェックする必要がある

### 提供する価値

✅ **自動URL切替**: 在庫切れ時に自動的に次の仕入先に切り替え
✅ **価格監視**: 複数URLの価格から中央値を自動計算
✅ **モール同期**: 在庫変動を自動的に全モールに反映
✅ **高頻度チェック**: セール時の在庫変動をリアルタイムで検知

## 主な機能

### 1. 複数URL管理

```typescript
// 商品に複数の仕入先URLを登録
{
  reference_urls: [
    { url: "https://example.com/product1", price: 5000, is_available: true },  // 最優先
    { url: "https://example.com/product2", price: 5500, is_available: true },  // 第二優先
    { url: "https://example.com/product3", price: 6000, is_available: true }   // 第三優先
  ]
}
```

### 2. 自動URL切替

- URL1（最優先）が在庫切れの場合、自動的にURL2に切替
- 切替履歴を記録し、UIで確認可能
- 全URLが在庫切れの場合、全モールで在庫をゼロに設定

### 3. 中央値価格計算

- 登録された全URLの価格から中央値を自動計算
- 価格変動の異常検知に活用

### 4. チェック頻度制御

- **通常頻度**: 毎日2時に実行（日次チェック）
- **高頻度**: 30分ごとに実行（セール対応）

### 5. モール同期

- 在庫変動を自動的に各モールに反映
- Shopee、eBay、Mercari などに対応
- キュー方式でリトライ機能を搭載

## システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    在庫・価格追従システム                      │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐      ┌──────▼──────┐      ┌─────▼──────┐
   │スケジューラ│      │  APIサーバー │      │     UI     │
   │(Cron Jobs)│      │             │      │(Next.js)   │
   └────┬─────┘      └──────┬──────┘      └─────┬──────┘
        │                    │                    │
   ┌────▼────────────────────▼────────────────────▼──────┐
   │              InventoryTracker サービス               │
   │  - 複数URLチェック                                   │
   │  - 自動URL切替                                       │
   │  - 中央値価格計算                                    │
   └────┬─────────────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────────┐
   │            InventorySyncWorker                    │
   │  - キュー処理                                      │
   │  - モール同期                                      │
   │  - リトライ機能                                    │
   └────┬───────────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────────┐
   │                  Supabase                         │
   │  - products (商品マスター)                         │
   │  - inventory_tracking_logs (履歴)                  │
   │  - inventory_sync_queue (同期キュー)                │
   └───────────────────────────────────────────────────┘
```

## クイックスタート

### 1. 環境構築

```bash
# リポジトリをクローン
git clone https://github.com/your-repo/n3-frontend_new.git
cd n3-frontend_new

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を編集して Supabase の接続情報を設定
```

### 2. データベースセットアップ

```bash
# Supabase SQL Editor でマイグレーションを実行
# migrations/20251121_add_inventory_tracking_fields.sql の内容を実行
```

### 3. 開発サーバー起動

```bash
npm run dev
```

### 4. UIにアクセス

```
http://localhost:3000/inventory-monitoring
```

「在庫追従システム」タブで以下が可能：
- 登録商品の一覧表示
- 参照URLの管理
- チェック頻度の切り替え
- 履歴の確認

### 5. 商品データの準備

```javascript
// 商品に参照URLを設定
await supabase
  .from('products')
  .update({
    reference_urls: [
      { url: "https://example.com/product1", price: 5000, is_available: true },
      { url: "https://example.com/product2", price: 5500, is_available: true },
    ],
    check_frequency: '通常'
  })
  .eq('id', 'your-product-id')
```

### 6. バッチ実行テスト

```bash
# 手動でバッチを実行
curl "http://localhost:3000/api/inventory-tracking/execute?max_items=5"
```

## ドキュメント

### 📚 詳細ドキュメント

- [システム詳細](./INVENTORY_TRACKING_SYSTEM.md) - 詳細な機能説明とAPI仕様
- [デプロイメントガイド](./DEPLOYMENT_GUIDE.md) - 本番環境へのデプロイ手順

### 🗂️ ファイル構成

```
n3-frontend_new/
├── app/
│   ├── api/
│   │   ├── inventory-tracking/          # 在庫追従API
│   │   │   ├── execute/route.ts        # バッチ実行
│   │   │   └── frequency/route.ts      # 頻度制御
│   │   ├── inventory-sync/
│   │   │   └── worker/route.ts         # 同期ワーカー
│   │   └── cron/
│   │       └── inventory-tracking/route.ts  # Cron Jobs
│   └── inventory-monitoring/
│       ├── page.tsx                    # メインページ
│       └── components/
│           └── InventoryTrackingTab.tsx  # 在庫追従タブ
├── services/
│   ├── InventoryTracker.ts             # コアロジック
│   └── InventorySyncWorker.ts          # 同期ワーカー
├── lib/
│   └── scheduler/
│       └── inventory-tracking-scheduler.ts  # スケジューラ
├── types/
│   └── product.ts                       # 型定義
├── migrations/
│   └── 20251121_add_inventory_tracking_fields.sql  # DB拡張
└── docs/
    ├── INVENTORY_TRACKING_SYSTEM.md     # システム詳細
    ├── DEPLOYMENT_GUIDE.md              # デプロイガイド
    └── README_INVENTORY_TRACKING.md     # このファイル
```

### 🔧 主要API

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/inventory-tracking/execute` | GET | バッチ実行（複数商品） |
| `/api/inventory-tracking/execute` | POST | 単一商品チェック |
| `/api/inventory-tracking/frequency` | POST | チェック頻度変更 |
| `/api/inventory-sync/worker` | GET | 同期ワーカー実行 |
| `/api/cron/inventory-tracking` | GET | Cron Jobs用 |

### 📊 データベーススキーマ

#### products テーブル（拡張フィールド）

```sql
reference_urls JSONB          -- 複数の仕入先URL
median_price DECIMAL(10, 2)   -- 中央値価格
current_stock_count INTEGER   -- 現在在庫数
last_check_time TIMESTAMP     -- 最終チェック時刻
check_frequency TEXT          -- チェック頻度
```

#### inventory_tracking_logs テーブル

```sql
id UUID PRIMARY KEY
product_id UUID
checked_at TIMESTAMP
check_status TEXT             -- 'success' | 'out_of_stock' | 'error'
source_switched BOOLEAN       -- 仕入先切替フラグ
switched_from_url TEXT
switched_to_url TEXT
```

#### inventory_sync_queue テーブル

```sql
id UUID PRIMARY KEY
product_id UUID
marketplace TEXT              -- 'shopee' | 'ebay' | 'mercari'
action TEXT                   -- 'update_stock' | 'update_price' | 'delist'
status TEXT                   -- 'pending' | 'processing' | 'completed' | 'failed'
```

## 運用例

### 日常運用

```bash
# 自動実行（Vercel Cron Jobs）
# - 毎日2時: 通常頻度チェック
# - 30分ごと: 高頻度チェック
# - 5分ごと: 同期ワーカー
```

### Shopeeセール対応

```javascript
// セール開始前: 高頻度チェックに切り替え
await fetch('/api/inventory-tracking/frequency', {
  method: 'POST',
  body: JSON.stringify({
    product_ids: ['product-id-1', 'product-id-2'],
    frequency: '高頻度'
  })
})

// セール終了後: 通常頻度に戻す
await fetch('/api/inventory-tracking/frequency', {
  method: 'POST',
  body: JSON.stringify({
    product_ids: ['product-id-1', 'product-id-2'],
    frequency: '通常'
  })
})
```

## トラブルシューティング

### よくある問題

1. **在庫チェックが実行されない**
   - `reference_urls` が設定されているか確認
   - スケジューラが正しく設定されているか確認

2. **仕入先が自動切替されない**
   - `reference_urls` の順序を確認
   - 各URLの `is_available` フラグを確認

3. **モール同期が実行されない**
   - `inventory_sync_queue` テーブルを確認
   - 同期ワーカーが起動しているか確認

詳細は [デプロイメントガイド](./DEPLOYMENT_GUIDE.md) を参照してください。

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## サポート

問題が発生した場合は、GitHub Issues で報告してください。
