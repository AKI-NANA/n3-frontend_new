# スクレイピングバッチシステム - データベースマイグレーション手順

## 📋 概要

このマイグレーションは、**URL一括処理バッチ機能**のための2つの新規テーブルを作成します。

### 作成されるテーブル

1. **`scraping_batches`** - バッチ全体の管理テーブル
2. **`scraping_queue`** - 個々のURLタスクを管理するキューテーブル

---

## 🚀 マイグレーション実行手順

### 方法1: Supabase Studio（推奨）

1. **Supabase Studioにアクセス**
   - プロジェクトダッシュボード: https://supabase.com/dashboard
   - 対象プロジェクトを選択

2. **SQL Editorを開く**
   - 左サイドバーから「SQL Editor」をクリック
   - 「New Query」をクリック

3. **マイグレーションSQLを実行**
   - `20251122_create_scraping_batch_tables.sql` の内容をコピー
   - SQL Editorに貼り付け
   - 「Run」ボタンをクリック

4. **実行結果を確認**
   - エラーがないことを確認
   - 「Table Editor」でテーブルが作成されていることを確認

---

### 方法2: Supabase CLI

```bash
# Supabase CLIがインストールされている場合
supabase db push

# または、直接SQLを実行
supabase db execute --file ./supabase/migrations/20251122_create_scraping_batch_tables.sql
```

---

## ✅ マイグレーション後の確認

### 1. テーブルの存在確認

```sql
-- Supabase Studio > SQL Editorで実行
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('scraping_batches', 'scraping_queue');
```

**期待される結果:**
```
table_name
-----------------
scraping_batches
scraping_queue
```

### 2. テーブル構造の確認

```sql
-- scraping_batchesのカラム確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'scraping_batches'
ORDER BY ordinal_position;

-- scraping_queueのカラム確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'scraping_queue'
ORDER BY ordinal_position;
```

### 3. インデックスの確認

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('scraping_batches', 'scraping_queue');
```

### 4. 外部キー制約の確認

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'scraping_queue';
```

**期待される結果:**
```
table_name      | column_name | foreign_table_name | foreign_column_name
----------------|-------------|--------------------|-----------------
scraping_queue  | batch_id    | scraping_batches   | id
```

---

## 🧪 動作テスト

### テストデータの挿入

```sql
-- テストバッチの作成
INSERT INTO scraping_batches (batch_name, total_urls, status)
VALUES ('テストバッチ', 3, 'queued')
RETURNING id;

-- 上記で返されたIDを使用（例: '123e4567-e89b-12d3-a456-426614174000'）
-- テストキューの作成
INSERT INTO scraping_queue (batch_id, target_url, platform, status)
VALUES
  ('123e4567-e89b-12d3-a456-426614174000', 'https://auctions.yahoo.co.jp/item1', 'yahoo_auction', 'pending'),
  ('123e4567-e89b-12d3-a456-426614174000', 'https://auctions.yahoo.co.jp/item2', 'yahoo_auction', 'pending'),
  ('123e4567-e89b-12d3-a456-426614174000', 'https://auctions.yahoo.co.jp/item3', 'yahoo_auction', 'pending');

-- データ確認
SELECT
  b.batch_name,
  b.total_urls,
  b.status AS batch_status,
  COUNT(q.id) AS queue_count
FROM scraping_batches b
LEFT JOIN scraping_queue q ON b.id = q.batch_id
GROUP BY b.id, b.batch_name, b.total_urls, b.status;
```

### テストデータのクリーンアップ

```sql
-- テストデータ削除（CASCADE制約により、scraping_queueのレコードも自動削除される）
DELETE FROM scraping_batches WHERE batch_name = 'テストバッチ';
```

---

## 🔧 トラブルシューティング

### エラー: "relation already exists"

テーブルが既に存在する場合のエラーです。

**解決方法:**
```sql
-- 既存テーブルを削除してから再実行
DROP TABLE IF EXISTS scraping_queue CASCADE;
DROP TABLE IF EXISTS scraping_batches CASCADE;

-- その後、マイグレーションSQLを再実行
```

### エラー: "violates foreign key constraint"

外部キー制約のエラーです。

**原因:**
- `scraping_batches` テーブルが存在しない状態で `scraping_queue` を作成しようとした

**解決方法:**
- マイグレーションSQLを順番通りに実行（`scraping_batches` → `scraping_queue`）

---

## 📊 パフォーマンス最適化

大量のURLを処理する場合、以下のインデックスが自動作成されています：

- `idx_scraping_batches_status` - バッチステータスでのフィルタリング高速化
- `idx_scraping_batches_created_at` - 作成日時での並び替え高速化
- `idx_scraping_queue_status` - タスクステータスでのフィルタリング高速化
- `idx_scraping_queue_batch_id` - バッチIDでの検索高速化
- `idx_scraping_queue_status_batch_id` - 複合インデックス（ステータス + バッチID）
- `idx_scraping_queue_inserted_at` - 投入日時での並び替え高速化

---

## 🔐 権限設定（オプション）

デフォルトでは、Supabaseのサービスロールキーでのみアクセス可能です。

クライアントサイドからのアクセスを許可する場合（**非推奨**）：

```sql
-- 読み取り専用アクセスを許可
ALTER TABLE scraping_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "読み取り専用アクセス" ON scraping_batches
  FOR SELECT USING (true);

CREATE POLICY "読み取り専用アクセス" ON scraping_queue
  FOR SELECT USING (true);
```

**注意:** セキュリティ上の理由から、バッチ投入はサーバーサイド（API）経由で行うことを推奨します。

---

## 📝 次のステップ

マイグレーション完了後、以下のAPIが利用可能になります：

1. **バッチ投入API**: `POST /api/scraping/batch/submit`
2. **バッチ一覧取得API**: `GET /api/scraping/batch/submit`

詳細は `/app/api/scraping/batch/submit/route.ts` を参照してください。
