# スクレイピングバッチAPI - テスト手順書

## 📋 概要

フェーズ1 & 2で実装されたURL一括投入APIのテスト手順を説明します。

---

## 🔧 事前準備

### 1. マイグレーション実行

```bash
# Supabase Studioで以下のSQLを実行
# ファイル: supabase/migrations/20251122_create_scraping_batch_tables.sql
```

詳細は `supabase/migrations/README.md` を参照してください。

### 2. 環境変数の確認

`.env.local` に以下の変数が設定されていることを確認：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 開発サーバー起動

```bash
npm run dev
# または
yarn dev
```

---

## 🧪 APIテスト

### テスト1: URL配列でのバッチ投入

#### リクエスト

```bash
curl -X POST http://localhost:3000/api/scraping/batch/submit \
  -H "Content-Type: application/json" \
  -d '{
    "batchName": "Yahoo!オークションテスト_001",
    "urls": [
      "https://auctions.yahoo.co.jp/item1",
      "https://auctions.yahoo.co.jp/item2",
      "https://auctions.yahoo.co.jp/item3"
    ],
    "createdBy": "test_user"
  }'
```

#### 期待されるレスポンス

```json
{
  "success": true,
  "batchId": "123e4567-e89b-12d3-a456-426614174000",
  "totalUrls": 3,
  "validUrls": 3,
  "invalidUrls": 0,
  "duplicateUrls": 0,
  "message": "3件のURLをバッチキューに追加しました",
  "platformBreakdown": {
    "yahoo_auction": 3
  }
}
```

---

### テスト2: CSVテキストでのバッチ投入

#### リクエスト

```bash
curl -X POST http://localhost:3000/api/scraping/batch/submit \
  -H "Content-Type: application/json" \
  -d '{
    "batchName": "複数プラットフォームテスト",
    "csvText": "url\nhttps://auctions.yahoo.co.jp/item1\nhttps://jp.mercari.com/item2\nhttps://www.rakuten.co.jp/item3\nhttps://www.amazon.co.jp/dp/B001",
    "createdBy": "csv_import_user"
  }'
```

#### 期待されるレスポンス

```json
{
  "success": true,
  "batchId": "234f5678-f90c-23e4-b567-537725285111",
  "totalUrls": 4,
  "validUrls": 4,
  "invalidUrls": 0,
  "duplicateUrls": 0,
  "message": "4件のURLをバッチキューに追加しました",
  "platformBreakdown": {
    "yahoo_auction": 1,
    "mercari": 1,
    "rakuten": 1,
    "amazon": 1
  }
}
```

---

### テスト3: 無効なURLを含むリクエスト

#### リクエスト

```bash
curl -X POST http://localhost:3000/api/scraping/batch/submit \
  -H "Content-Type: application/json" \
  -d '{
    "batchName": "無効URLテスト",
    "urls": [
      "https://auctions.yahoo.co.jp/valid",
      "not-a-valid-url",
      "ftp://invalid-protocol.com",
      "https://auctions.yahoo.co.jp/valid2"
    ]
  }'
```

#### 期待されるレスポンス

```json
{
  "success": true,
  "batchId": "345g6789-g01d-34f5-c678-648836396222",
  "totalUrls": 2,
  "validUrls": 2,
  "invalidUrls": 2,
  "duplicateUrls": 0,
  "message": "2件のURLをバッチキューに追加しました",
  "platformBreakdown": {
    "yahoo_auction": 2
  }
}
```

---

### テスト4: 重複URLの検出

#### ステップ1: 最初のバッチ投入

```bash
curl -X POST http://localhost:3000/api/scraping/batch/submit \
  -H "Content-Type: application/json" \
  -d '{
    "batchName": "重複テスト_バッチ1",
    "urls": [
      "https://auctions.yahoo.co.jp/duplicate1",
      "https://auctions.yahoo.co.jp/duplicate2"
    ]
  }'
```

#### ステップ2: 同じURLで再投入

```bash
curl -X POST http://localhost:3000/api/scraping/batch/submit \
  -H "Content-Type: application/json" \
  -d '{
    "batchName": "重複テスト_バッチ2",
    "urls": [
      "https://auctions.yahoo.co.jp/duplicate1",
      "https://auctions.yahoo.co.jp/duplicate2",
      "https://auctions.yahoo.co.jp/new_url"
    ]
  }'
```

#### 期待されるレスポンス（ステップ2）

```json
{
  "success": true,
  "batchId": "456h7890-h12e-45g6-d789-759947407333",
  "totalUrls": 1,
  "validUrls": 3,
  "invalidUrls": 0,
  "duplicateUrls": 2,
  "message": "1件のURLをバッチキューに追加しました",
  "platformBreakdown": {
    "yahoo_auction": 1
  }
}
```

---

### テスト5: バッチ一覧取得

#### リクエスト（全バッチ取得）

```bash
curl -X GET "http://localhost:3000/api/scraping/batch/submit?limit=10"
```

#### リクエスト（ステータスでフィルタリング）

```bash
curl -X GET "http://localhost:3000/api/scraping/batch/submit?status=queued&limit=5"
```

#### 期待されるレスポンス

```json
{
  "success": true,
  "batches": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "batch_name": "Yahoo!オークションテスト_001",
      "total_urls": 3,
      "processed_count": 0,
      "success_count": 0,
      "failed_count": 0,
      "status": "queued",
      "created_by": "test_user",
      "created_at": "2025-11-22T10:00:00.000Z",
      "started_at": null,
      "completed_at": null
    }
  ],
  "count": 1
}
```

---

## 🔍 データベース確認

### Supabase Studioでの確認手順

#### 1. バッチ一覧の確認

```sql
SELECT
  id,
  batch_name,
  total_urls,
  processed_count,
  success_count,
  failed_count,
  status,
  created_by,
  created_at
FROM scraping_batches
ORDER BY created_at DESC
LIMIT 10;
```

#### 2. キュー内容の確認

```sql
SELECT
  q.id,
  q.target_url,
  q.platform,
  q.status,
  q.retry_count,
  b.batch_name
FROM scraping_queue q
JOIN scraping_batches b ON q.batch_id = b.id
ORDER BY q.inserted_at DESC
LIMIT 20;
```

#### 3. バッチごとの統計

```sql
SELECT
  b.batch_name,
  b.total_urls,
  b.status AS batch_status,
  COUNT(q.id) AS queue_count,
  COUNT(CASE WHEN q.status = 'pending' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN q.status = 'processing' THEN 1 END) AS processing_count,
  COUNT(CASE WHEN q.status = 'completed' THEN 1 END) AS completed_count,
  COUNT(CASE WHEN q.status = 'failed' THEN 1 END) AS failed_count
FROM scraping_batches b
LEFT JOIN scraping_queue q ON b.id = q.batch_id
GROUP BY b.id, b.batch_name, b.total_urls, b.status
ORDER BY b.created_at DESC;
```

#### 4. プラットフォーム別集計

```sql
SELECT
  platform,
  COUNT(*) AS total_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) AS processing,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
FROM scraping_queue
GROUP BY platform
ORDER BY total_count DESC;
```

---

## 🧹 テストデータのクリーンアップ

### 全テストデータの削除

```sql
-- CASCADE制約により、scraping_queueのレコードも自動削除される
DELETE FROM scraping_batches
WHERE batch_name LIKE '%テスト%'
   OR created_by = 'test_user';
```

### 特定のバッチのみ削除

```sql
DELETE FROM scraping_batches
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

---

## 🐛 トラブルシューティング

### エラー: "urlsまたはcsvTextのいずれかを指定してください"

**原因:** リクエストボディに `urls` も `csvText` も含まれていない

**解決方法:**
```json
{
  "batchName": "テスト",
  "urls": ["https://example.com"]  // ← 追加
}
```

---

### エラー: "有効なURLが1つもありません"

**原因:** すべてのURLが無効な形式

**解決方法:**
- `http://` または `https://` で始まるURLを使用
- URLの形式を確認

---

### エラー: "すべてのURLが既にキューに存在します"

**原因:** 投入しようとしているURLがすべて既に `pending` または `processing` ステータスでキューに存在

**解決方法:**
1. 既存キューの確認:
```sql
SELECT target_url, status FROM scraping_queue
WHERE status IN ('pending', 'processing');
```

2. 既存タスクを完了させるか、新しいURLを投入

---

## 📊 パフォーマンステスト

### 大量URL投入テスト（100件）

```bash
# URLリストを生成
for i in {1..100}; do
  echo "https://auctions.yahoo.co.jp/item${i}"
done > test_urls.txt

# CSVテキストとして投入
curl -X POST http://localhost:3000/api/scraping/batch/submit \
  -H "Content-Type: application/json" \
  -d "{
    \"batchName\": \"大量URLテスト_100件\",
    \"csvText\": \"$(cat test_urls.txt | tr '\n' '\\n')\"
  }"
```

### 期待される処理時間

- 10 URLs: < 1秒
- 100 URLs: < 3秒
- 1000 URLs: < 10秒

---

## ✅ テスト完了チェックリスト

- [ ] テスト1: URL配列での投入成功
- [ ] テスト2: CSVテキストでの投入成功
- [ ] テスト3: 無効URLの適切な処理
- [ ] テスト4: 重複URLの検出と除外
- [ ] テスト5: バッチ一覧取得成功
- [ ] データベースにレコードが正しく挿入されている
- [ ] 外部キー制約が正常に機能している
- [ ] プラットフォーム判定が正しく動作している
- [ ] レスポンスのJSON形式が正しい

---

## 🚀 次のステップ

フェーズ1 & 2のテスト完了後、**フェーズ3: バッチ処理実行エンジン（S-3）**の実装に進みます。

実装予定機能：
- キューからタスクを取得して実行
- レート制限対策（3~7秒ランダム遅延）
- リトライロジック（最大3回）
- エラーハンドリング
