# 在庫・価格追従システム - デプロイメントガイド

## 概要

このガイドでは、在庫・価格追従システムを本番環境にデプロイする手順を説明します。

## 必要な環境変数

`.env.local` または Vercel の環境変数に以下を設定してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cron Job認証（本番環境のみ）
CRON_SECRET=your_random_secret_key

# アプリケーションURL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## デプロイ手順

### 1. データベースマイグレーション

Supabase ダッシュボードの SQL Editor で以下を実行：

```bash
# マイグレーションファイルの内容を実行
migrations/20251121_add_inventory_tracking_fields.sql
```

または、Supabase CLI を使用：

```bash
supabase db push
```

### 2. Vercel にデプロイ

#### vercel.json の確認

以下の Cron Jobs が設定されていることを確認：

```json
{
  "crons": [
    {
      "path": "/api/cron/inventory-tracking?type=NORMAL_FREQUENCY",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/inventory-tracking?type=HIGH_FREQUENCY",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/inventory-sync/worker",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### デプロイコマンド

```bash
# Vercel CLI でデプロイ
vercel --prod

# または GitHub連携で自動デプロイ
git push origin main
```

### 3. 環境変数の設定

Vercel ダッシュボードで以下を設定：

1. Settings → Environment Variables
2. `CRON_SECRET` を追加（ランダムな文字列を生成）
3. その他の環境変数を追加

### 4. Cron Jobs の有効化

Vercel Pro 以上のプランが必要です。

1. Vercel ダッシュボード → Settings → Cron Jobs
2. 3つの Cron Jobs が登録されていることを確認
3. すべて有効化

## デプロイ後の確認

### 1. データベース確認

```sql
-- テーブルが作成されているか確認
SELECT * FROM products LIMIT 1;
SELECT * FROM inventory_tracking_logs LIMIT 1;
SELECT * FROM inventory_sync_queue LIMIT 1;

-- フィールドが追加されているか確認
SELECT reference_urls, median_price, check_frequency
FROM products
WHERE reference_urls IS NOT NULL
LIMIT 5;
```

### 2. API エンドポイント確認

```bash
# 手動実行テスト
curl "https://your-domain.com/api/inventory-tracking/execute?max_items=1"

# 同期ワーカーテスト
curl "https://your-domain.com/api/inventory-sync/worker?max_items=1"
```

### 3. Cron Jobs 確認

Vercel ダッシュボードで：

1. Deployments → Cron Jobs
2. 実行履歴を確認
3. エラーがないか確認

## 初期データのセットアップ

### 1. 商品に参照URLを設定

```javascript
// Supabase SQL Editor または API経由で実行
UPDATE products
SET
  reference_urls = '[
    {"url": "https://example.com/product1", "price": 5000, "is_available": true},
    {"url": "https://example.com/product2", "price": 5500, "is_available": true}
  ]'::jsonb,
  check_frequency = '通常'
WHERE id = 'your-product-id';
```

### 2. 初回バッチ実行

```bash
# 手動で初回バッチを実行
curl -X GET "https://your-domain.com/api/inventory-tracking/execute?max_items=50"
```

## 運用スケジュール

### 自動実行スケジュール

| タスク | 頻度 | 説明 |
|--------|------|------|
| 通常頻度チェック | 毎日 2:00 AM | 通常頻度の商品を全件チェック |
| 高頻度チェック | 30分ごと | 高頻度設定の商品をチェック |
| 同期ワーカー | 5分ごと | キューから取得してモールに同期 |

### 手動実行

UIから手動で実行する場合：

1. `/inventory-monitoring` ページにアクセス
2. 「在庫追従システム」タブを選択
3. 「全件チェック」または「高頻度のみチェック」ボタンをクリック

## モニタリング

### ログの確認

```sql
-- 最新のチェック履歴
SELECT * FROM inventory_tracking_logs
ORDER BY checked_at DESC
LIMIT 20;

-- 仕入先切替の履歴
SELECT * FROM inventory_tracking_logs
WHERE source_switched = true
ORDER BY checked_at DESC
LIMIT 10;

-- 同期キューの状態
SELECT status, COUNT(*)
FROM inventory_sync_queue
GROUP BY status;

-- 失敗した同期タスク
SELECT * FROM inventory_sync_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### アラート設定

以下の条件でアラートを設定することを推奨：

1. **全商品在庫切れ**: `all_out_of_stock_count` が閾値を超えた場合
2. **同期失敗**: `inventory_sync_queue` の `failed` が蓄積した場合
3. **Cron Job 失敗**: Vercel の Cron Jobs でエラーが発生した場合

## トラブルシューティング

### Cron Jobs が実行されない

1. Vercel Pro プランか確認
2. `vercel.json` の設定を確認
3. Vercel ダッシュボードで Cron Jobs が有効か確認

### API が 401 エラーを返す

1. `CRON_SECRET` が正しく設定されているか確認
2. 環境変数が本番環境に反映されているか確認

### 在庫同期が失敗する

1. `inventory_sync_queue` テーブルを確認
2. `error_message` を確認
3. 各モールの API 認証情報を確認

### スクレイピングが失敗する

1. スクレイピング API が正常に動作しているか確認
2. レート制限に引っかかっていないか確認
3. 待機時間（delay）を調整

## パフォーマンス最適化

### バッチサイズの調整

```bash
# 処理件数を減らす（エラーが多い場合）
curl "https://your-domain.com/api/inventory-tracking/execute?max_items=20"

# 処理件数を増やす（安定している場合）
curl "https://your-domain.com/api/inventory-tracking/execute?max_items=100"
```

### 待機時間の調整

```bash
# 待機時間を長くする（レート制限対策）
curl "https://your-domain.com/api/inventory-tracking/execute?delay_min=60&delay_max=180"
```

### データベースインデックスの確認

```sql
-- インデックスが作成されているか確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('products', 'inventory_tracking_logs', 'inventory_sync_queue');
```

## セキュリティ

### API認証

- Cron Jobs は `CRON_SECRET` で認証
- 本番環境では必ず設定すること
- ランダムで推測困難な文字列を使用

### データベース権限

- Supabase の RLS (Row Level Security) を適切に設定
- サービスロールキーは環境変数で管理

## バックアップ

### データベースバックアップ

Supabase は自動バックアップを提供していますが、以下も推奨：

```bash
# 定期的にエクスポート
pg_dump -h your-supabase-host -U postgres -d postgres -t products -t inventory_tracking_logs -t inventory_sync_queue > backup.sql
```

### 設定のバージョン管理

- `vercel.json`
- 環境変数のリスト
- マイグレーションファイル

すべて Git で管理してください。

## まとめ

このシステムにより、以下が自動化されます：

✅ 夜間の自動在庫チェック
✅ セール時の高頻度チェック
✅ 在庫切れ時の自動仕入先切替
✅ 全モールへの自動在庫同期
✅ 変動履歴の自動記録

運用を開始する前に、必ずテスト環境で動作確認を行ってください。
