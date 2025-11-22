# 大規模データ一括取得バッチ機能 - マイグレーション手順

## 📋 概要

このディレクトリには、eBay Finding APIを使用した大規模データ一括取得バッチ機能のデータベースマイグレーションファイルが含まれています。

## 🗂️ マイグレーションファイル

1. **20251122_create_research_batch_tables.sql**
   - `research_batches` テーブル作成
   - `batch_tasks` テーブル作成
   - インデックス、トリガー、RLSポリシー設定

2. **20251122_create_batch_rpc_functions.sql**
   - バッチ統計更新用のRPC関数
   - バッチステータス自動更新トリガー

## 🚀 マイグレーション実行手順

### 方法 1: Supabase Dashboard（推奨）

1. Supabase ダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから **SQL Editor** を選択
4. 以下のファイルの内容を順番にコピー＆実行:
   - `20251122_create_research_batch_tables.sql`
   - `20251122_create_batch_rpc_functions.sql`

### 方法 2: Supabase CLI

```bash
# Supabase CLI がインストールされている場合
supabase db push

# または、個別に実行
supabase db execute --file supabase/migrations/20251122_create_research_batch_tables.sql
supabase db execute --file supabase/migrations/20251122_create_batch_rpc_functions.sql
```

### 方法 3: psql コマンド

```bash
# PostgreSQL クライアントから直接実行
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/20251122_create_research_batch_tables.sql
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/20251122_create_batch_rpc_functions.sql
```

## ✅ マイグレーション確認

マイグレーションが正しく実行されたことを確認します。

```sql
-- テーブルが作成されているか確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('research_batches', 'batch_tasks');

-- RPC関数が作成されているか確認
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%batch%';
```

期待される結果:
- テーブル: `research_batches`, `batch_tasks`
- 関数: `increment_batch_completed_tasks`, `increment_batch_failed_tasks`, `increment_batch_items_retrieved`, `update_batch_status`

## 📊 テーブル構造

### research_batches

| カラム名 | 型 | 説明 |
|---------|-----|------|
| batch_id | UUID | プライマリキー |
| user_id | UUID | ユーザーID（外部キー） |
| target_seller_ids | TEXT[] | ターゲットセラーIDリスト |
| start_date | TIMESTAMP | リサーチ開始日 |
| end_date | TIMESTAMP | リサーチ終了日 |
| keyword | TEXT | キーワード（オプション） |
| status | TEXT | ステータス（Pending/Processing/Completed/Failed） |
| total_tasks_count | INTEGER | 総タスク数 |
| completed_tasks_count | INTEGER | 完了タスク数 |
| failed_tasks_count | INTEGER | 失敗タスク数 |
| total_items_retrieved | INTEGER | 取得アイテム総数 |

### batch_tasks

| カラム名 | 型 | 説明 |
|---------|-----|------|
| task_id | UUID | プライマリキー |
| batch_id | UUID | 親バッチID（外部キー） |
| target_seller_id | TEXT | ターゲットセラーID |
| target_date_range | TEXT | 日付範囲（表示用） |
| date_start | TIMESTAMP | 開始日 |
| date_end | TIMESTAMP | 終了日 |
| status | TEXT | ステータス |
| processed_count | INTEGER | 処理済みアイテム数 |
| total_pages | INTEGER | 総ページ数 |
| current_page | INTEGER | 現在のページ |

## 🔧 トラブルシューティング

### エラー: "relation already exists"

テーブルが既に存在する場合は、以下のコマンドで削除してから再実行してください。

```sql
DROP TABLE IF EXISTS batch_tasks CASCADE;
DROP TABLE IF EXISTS research_batches CASCADE;
DROP FUNCTION IF EXISTS increment_batch_completed_tasks(UUID);
DROP FUNCTION IF EXISTS increment_batch_failed_tasks(UUID);
DROP FUNCTION IF EXISTS increment_batch_items_retrieved(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_batch_status();
```

### 権限エラー

Supabase Service Role Key を使用していることを確認してください。

## 📚 関連ドキュメント

- [API使用方法](../../app/api/research/batch/README.md)
- [バッチ処理ロジック](../../lib/research/batch-processor.ts)
