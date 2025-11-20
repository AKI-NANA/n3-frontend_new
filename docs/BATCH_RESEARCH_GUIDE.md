# 📚 eBay大規模データ一括取得バッチシステム - 実装ガイド

## 🎯 概要

このシステムは、**eBay Finding APIのレート制限を回避しつつ、特定のセラーが販売した直近の全Soldデータを日付で細かく分割して大量にストック・取得する**ヘッドレスバッチモジュールです。

### 主な機能

- ✅ **日付分割**: 大きな期間を1日または1週間単位に自動分割
- ✅ **ページネーション**: 100件超のデータを全ページ取得
- ✅ **レート制限対応**: タスク間5秒、ページ間2秒の遅延
- ✅ **自動リトライ**: エラー時に最大3回まで自動リトライ
- ✅ **進捗管理**: リアルタイムで進捗を追跡
- ✅ **VPS自動実行**: Cronで完全自動化

---

## 📁 ファイル構成

```
n3-frontend_new/
├── supabase/
│   └── migrations/
│       └── 20251119_batch_research_tables.sql      # DBマイグレーション
│
├── src/
│   └── db/
│       └── batch_research_schema.ts                # TypeScript型定義
│
├── lib/
│   └── research/
│       ├── date-splitter.ts                        # 日付分割ロジック
│       └── batch-executor.ts                       # バッチ実行エンジン
│
├── app/
│   ├── api/
│   │   └── batch-research/
│   │       ├── jobs/
│   │       │   ├── route.ts                       # ジョブ作成・一覧API
│   │       │   └── [jobId]/route.ts               # ジョブ詳細・管理API
│   │       ├── execute/route.ts                   # バッチ実行API
│   │       └── results/route.ts                   # 結果取得・エクスポートAPI
│   │
│   └── tools/
│       └── batch-research/
│           ├── page.tsx                            # メイン設定画面
│           └── [jobId]/page.tsx                   # ジョブ詳細画面
│
├── scripts/
│   └── batch-research-cron.sh                     # VPS用Cronスクリプト
│
└── docs/
    └── BATCH_RESEARCH_GUIDE.md                    # このファイル
```

---

## 🗄️ データベース設計

### 1. `research_batch_jobs` - ジョブ管理テーブル

複数の検索条件をグループ化し、ジョブ全体の進捗を管理。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| job_id | TEXT | ジョブの一意なID |
| job_name | TEXT | ジョブ名 |
| target_seller_ids | TEXT[] | ターゲットセラーIDリスト |
| keywords | TEXT[] | キーワードリスト（任意） |
| original_date_start/end | DATE | 元の日付範囲 |
| split_unit | TEXT | 分割単位（day/week） |
| status | TEXT | pending/running/completed/failed/paused |
| progress_percentage | DECIMAL | 進捗率 |
| total_tasks | INTEGER | 総タスク数 |
| tasks_completed | INTEGER | 完了タスク数 |

### 2. `research_condition_stock` - タスクストックテーブル

日付分割された個別のAPI実行タスクを管理。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| search_id | TEXT | タスクの一意なID |
| job_id | TEXT | 親ジョブID |
| target_seller_id | TEXT | セラーID（必須絞り込み条件） |
| keyword | TEXT | キーワード（任意） |
| date_start/end | DATE | 分割後の日付範囲 |
| status | TEXT | pending/processing/completed/failed |
| current_page | INTEGER | 現在のページ番号 |
| total_pages | INTEGER | 総ページ数 |
| items_retrieved | INTEGER | 取得済みアイテム数 |

### 3. `research_batch_results` - 結果保存テーブル

eBay Finding APIから取得したSoldデータを保存。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| ebay_item_id | TEXT | eBay Item ID |
| title | TEXT | 商品タイトル |
| seller_id | TEXT | セラーID |
| total_price_usd | DECIMAL | 合計金額（USD） |
| is_sold | BOOLEAN | 売れたかどうか |
| sold_date | TIMESTAMPTZ | 売れた日時 |
| raw_api_data | JSONB | 生のAPIレスポンス |

---

## 🚀 セットアップ手順

### 1. データベースマイグレーション

```bash
# Supabaseダッシュボードでマイグレーションを実行
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f supabase/migrations/20251119_batch_research_tables.sql
```

または、Supabase CLIを使用:

```bash
supabase db push
```

### 2. 環境変数の設定

`.env.local` に以下を追加:

```bash
# eBay API認証情報
EBAY_APP_ID=your_app_id
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# バッチAPI認証キー（任意の文字列に変更）
BATCH_API_KEY=your_secure_api_key_change_this

# アプリケーションURL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 3. 依存パッケージのインストール

```bash
npm install uuid
# または
yarn add uuid
```

### 4. アプリケーションのビルド・起動

```bash
npm run build
npm run start
# または
yarn build
yarn start
```

---

## 💻 使い方

### A. UI経由でジョブを作成

1. **設定画面にアクセス**
   ```
   http://localhost:3000/tools/batch-research
   ```

2. **ジョブを設定**
   - **ジョブ名**: 識別しやすい名前を入力
   - **ターゲットセラーID**: カンマ区切りで入力（例: `seller1, seller2`）
   - **キーワード**: 任意。空欄でセラーの全商品が対象
   - **期間**: 開始日と終了日を選択
   - **分割単位**: 1週間単位（推奨）または1日単位

3. **ジョブを作成**
   - 「バッチジョブを作成」ボタンをクリック
   - システムが自動的にタスクに分割して登録

4. **進捗を確認**
   - ジョブ一覧から該当ジョブをクリック
   - リアルタイムで進捗を確認可能

### B. API経由でジョブを作成

```bash
curl -X POST http://localhost:3000/api/batch-research/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "job_name": "Test Batch Job",
    "target_seller_ids": ["seller1", "seller2"],
    "keywords": ["Figure", "Anime"],
    "date_start": "2025-08-01",
    "date_end": "2025-10-31",
    "split_unit": "week",
    "execution_frequency": "once"
  }'
```

---

## 🤖 VPS自動実行の設定

### 1. Cronスクリプトに実行権限を付与

```bash
chmod +x /home/user/n3-frontend/scripts/batch-research-cron.sh
```

### 2. 環境変数を設定

`/etc/environment` または `~/.bashrc` に追加:

```bash
export BASE_URL="https://your-domain.com"
export BATCH_API_KEY="your_secure_api_key"
export MAX_TASKS=5
export LOG_DIR="/var/log/batch-research"
```

### 3. Cronジョブを登録

```bash
crontab -e
```

以下を追加（5分ごとに実行）:

```cron
*/5 * * * * /home/user/n3-frontend/scripts/batch-research-cron.sh >> /var/log/batch-research/cron.log 2>&1
```

**推奨実行間隔:**
- **5分ごと**: `*/5 * * * *` - 標準
- **10分ごと**: `*/10 * * * *` - 軽量
- **毎時**: `0 * * * *` - 低頻度

### 4. ログの確認

```bash
tail -f /var/log/batch-research/batch-research-$(date +%Y%m%d).log
```

---

## 📊 API仕様

### 1. ジョブ作成

**POST** `/api/batch-research/jobs`

リクエスト:
```json
{
  "job_name": "Test Job",
  "target_seller_ids": ["seller1"],
  "date_start": "2025-08-01",
  "date_end": "2025-08-31",
  "split_unit": "week"
}
```

レスポンス:
```json
{
  "success": true,
  "job_id": "job_1234567890_abc123",
  "summary": {
    "total_tasks": 13,
    "estimated_time": "1時間31分"
  }
}
```

### 2. バッチ実行

**POST** `/api/batch-research/execute`

ヘッダー:
```
Authorization: Bearer YOUR_API_KEY
```

リクエスト:
```json
{
  "max_tasks": 10
}
```

レスポンス:
```json
{
  "success": true,
  "executed": 5,
  "succeeded": 4,
  "failed": 1
}
```

### 3. ジョブ詳細取得

**GET** `/api/batch-research/jobs/{jobId}`

レスポンス:
```json
{
  "success": true,
  "job": {
    "job_id": "job_123",
    "status": "running",
    "progress_percentage": 45.5,
    "tasks_completed": 5,
    "total_tasks": 11
  },
  "tasks": [...]
}
```

### 4. 結果エクスポート

**POST** `/api/batch-research/results/export`

リクエスト:
```json
{
  "job_id": "job_123",
  "format": "csv"
}
```

レスポンス: CSVファイル

---

## ⚙️ システム設定

### レート制限対策

- **タスク間遅延**: 5秒（`delayBetweenTasksMs: 5000`）
- **ページ間遅延**: 2秒（`delayBetweenPagesMs: 2000`）
- **最大リトライ回数**: 3回（`maxRetries: 3`）

これらは `lib/research/batch-executor.ts` の `DEFAULT_CONFIG` で変更可能。

### 推奨システム要件

- **CPU**: 2コア以上
- **メモリ**: 2GB以上
- **ディスク**: 10GB以上の空き容量
- **Node.js**: v18以上
- **PostgreSQL**: 13以上（Supabase）

---

## 🔍 トラブルシューティング

### 1. タスクが実行されない

**原因**: Cronスクリプトの権限または環境変数の問題

**解決策**:
```bash
# 実行権限を確認
ls -l /home/user/n3-frontend/scripts/batch-research-cron.sh

# 手動実行でテスト
bash /home/user/n3-frontend/scripts/batch-research-cron.sh

# 環境変数を確認
env | grep -E 'BASE_URL|BATCH_API_KEY'
```

### 2. API認証エラー（401）

**原因**: API_KEYが一致していない

**解決策**:
- `.env.local` の `BATCH_API_KEY` を確認
- Cronスクリプト内の `API_KEY` 環境変数を確認
- 両方が同じ値であることを確認

### 3. レート制限エラー（429）

**原因**: eBay APIの1日の制限（5000回）に達した

**解決策**:
- 24時間待機
- タスク間の遅延を増やす（`delayBetweenTasksMs` を10000に変更）
- 1回の実行タスク数を減らす（`MAX_TASKS=3`）

### 4. タスクが失敗し続ける

**原因**: セラーIDが存在しない、または日付範囲に該当データがない

**解決策**:
```sql
-- 失敗したタスクを確認
SELECT search_id, target_seller_id, error_message
FROM research_condition_stock
WHERE status = 'failed';

-- 失敗したタスクを再実行（Pendingに戻す）
UPDATE research_condition_stock
SET status = 'pending', retry_count = 0
WHERE status = 'failed';
```

---

## 📈 パフォーマンス最適化

### 1. 分割単位の選択

- **1週間単位（推奨）**: タスク数が少なく、管理が容易
- **1日単位**: より細かい粒度で進捗を追跡可能

**例**: 90日間のリサーチ
- 1週間単位: 13タスク（約1分30秒）
- 1日単位: 90タスク（約10分30秒）

### 2. 並列実行

現在は順次実行ですが、複数のVPSインスタンスで並列実行も可能:

```bash
# VPS1: ジョブAを実行
MAX_TASKS=5 bash batch-research-cron.sh

# VPS2: ジョブBを実行（別ジョブ）
MAX_TASKS=5 bash batch-research-cron.sh
```

### 3. データベースインデックス

マイグレーションで自動作成されるインデックス:
- `job_id`
- `status`
- `seller_id`
- `date_range`

追加のインデックスが必要な場合:
```sql
CREATE INDEX idx_custom ON research_batch_results (your_column);
```

---

## 🔐 セキュリティ

### 1. API認証

- **本番環境**: 必ず強力なAPI_KEYに変更
- **推奨**: 32文字以上のランダム文字列

```bash
# ランダムなAPI_KEYを生成
openssl rand -base64 32
```

### 2. Row Level Security (RLS)

マイグレーションでRLSを有効化済み。必要に応じてポリシーをカスタマイズ:

```sql
-- 特定ユーザーのみアクセス可能にする例
CREATE POLICY "User specific access" ON research_batch_jobs
  FOR ALL USING (created_by = auth.uid());
```

### 3. 環境変数の保護

- `.env.local` をGit管理から除外（`.gitignore`）
- VPSでは環境変数をシステムレベルで設定

---

## 📞 サポート

問題が発生した場合:

1. **ログを確認**: `/var/log/batch-research/`
2. **データベースを確認**: Supabaseダッシュボード
3. **GitHub Issues**: プロジェクトのIssueを作成

---

## 🎉 まとめ

このシステムにより、以下が実現できます:

✅ **大量のSoldデータ取得**: 日付分割により数万件のデータを自動取得
✅ **レート制限回避**: 適切な遅延でAPI制限を遵守
✅ **完全自動化**: VPS上でCronによる無人運用
✅ **進捗の可視化**: リアルタイムで進捗を追跡
✅ **データの保存と分析**: 取得したデータを即座にデータベースに保存

**Happy Researching! 🚀**
