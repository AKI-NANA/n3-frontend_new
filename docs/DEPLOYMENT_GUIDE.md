# 自動出品スケジューラー - デプロイメントガイド

## 🚀 セットアップ手順

### 1. データベースマイグレーション

Supabase SQL Editorで以下のSQLを実行：

```sql
-- ファイル: database/migrations/add_category_distribution_and_cron_logs.sql
```

このSQLは以下を実行します：
- `listing_schedules`テーブルにカテゴリ分布カラム追加
- `cron_execution_logs`テーブル作成
- `category_distribution_settings`テーブル作成
- 必要なインデックス作成

### 2. 環境変数の設定

`.env.local`ファイルに以下を追加：

```bash
# Cron認証シークレット（ランダムな文字列を生成）
CRON_SECRET=your-secure-random-string-here

# 既存の環境変数（確認）
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
EBAY_AUTH_TOKEN=...
EBAY_USER_TOKEN_GREEN=...
```

**CRON_SECRETの生成方法：**
```bash
# ターミナルで実行
openssl rand -base64 32
```

### 3. Vercelへのデプロイ

#### 3.1 Vercelプロジェクト設定

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables**
4. 以下の環境変数を追加：
   - `CRON_SECRET`: 生成したランダム文字列
   - その他の既存環境変数も確認

#### 3.2 デプロイ

```bash
# ローカルから
git add .
git commit -m "Add automated listing scheduler with category distribution"
git push origin main
```

または

```bash
# Vercel CLIから
vercel --prod
```

### 4. Cron設定の確認

デプロイ後、Vercelダッシュボードで確認：

1. **Deployments** → 最新のデプロイを選択
2. **Cron Jobs** タブを確認
3. `/api/cron/execute-schedules` が表示されていることを確認
4. スケジュール: `* * * * *` (1分ごと)

### 5. 動作確認

#### 5.1 ローカルテスト

```bash
# 開発サーバー起動
npm run dev

# 別ターミナルでCronエンドポイントをテスト
curl http://localhost:3000/api/cron/execute-schedules
```

#### 5.2 本番環境テスト

```bash
# 手動でCronをトリガー
curl -X GET https://your-domain.vercel.app/api/cron/execute-schedules \
  -H "Authorization: Bearer your-cron-secret"
```

### 6. スケジュール生成

1. `http://localhost:3000/listing-management` にアクセス
2. **カテゴリ分散** タブで設定を調整：
   - **有効化**: ON
   - **分析期間**: 7日
   - **最低カテゴリ数**: 1
   - **重み**: 0.3（バランス型）
3. **スケジュール生成** ボタンをクリック
4. 生成されたスケジュールをカレンダーで確認

### 7. 監視とログ

#### Vercelダッシュボード
- **Functions** → **Logs** でCron実行ログを確認
- エラーがあれば通知される

#### Supabaseダッシュボード
1. `cron_execution_logs` テーブルで実行履歴を確認
2. `listing_history` テーブルで出品結果を確認

---

## 🔧 トラブルシューティング

### Cronが実行されない

**確認事項：**
1. `vercel.json` が正しくコミットされているか
2. Vercelダッシュボードで Cron Jobs が表示されているか
3. 環境変数 `CRON_SECRET` が設定されているか

**解決方法：**
```bash
# 再デプロイ
git commit --allow-empty -m "Trigger redeploy for cron"
git push origin main
```

### スケジュールが実行されない

**確認事項：**
1. `listing_schedules` テーブルに `status='pending'` のレコードがあるか
2. `scheduled_time` が現在時刻±5分以内か
3. 商品の `status` が `'ready_to_list'` か

**デバッグ：**
```sql
-- Supabase SQL Editor
SELECT * FROM listing_schedules 
WHERE status = 'pending' 
ORDER BY scheduled_time DESC 
LIMIT 10;

SELECT * FROM yahoo_scraped_products 
WHERE status = 'ready_to_list' 
LIMIT 10;
```

### eBay出品エラー

**確認事項：**
1. eBay User Tokenが有効か（18ヶ月期限）
2. 商品データが完全か（title, category_id, priceなど）
3. eBay APIの日次制限を超えていないか

**ログ確認：**
```sql
SELECT * FROM listing_history 
WHERE status = 'failed' 
ORDER BY listed_at DESC 
LIMIT 20;
```

---

## 📊 カテゴリ分散の動作確認

### 統計の確認

```sql
-- 直近7日間のカテゴリ別出品数
SELECT 
  (ebay_api_data->>'category_id') as category_id,
  (ebay_api_data->>'category_name') as category_name,
  COUNT(*) as count,
  MAX(listed_at) as last_listed
FROM yahoo_scraped_products
WHERE status = 'listed'
  AND listed_at >= NOW() - INTERVAL '7 days'
GROUP BY ebay_api_data->>'category_id', ebay_api_data->>'category_name'
ORDER BY count DESC;
```

### スケジュールのカテゴリ分布

```sql
-- 今後のスケジュールのカテゴリ分布
SELECT 
  date,
  category_distribution
FROM listing_schedules
WHERE status = 'pending'
  AND date >= CURRENT_DATE
ORDER BY date, scheduled_time;
```

---

## ⚙️ 設定のカスタマイズ

### スコア重視型（高利益優先）

```typescript
categoryDistribution: {
  enabled: true,
  lookbackDays: 3,
  minCategoriesPerDay: 1,
  categoryBalanceWeight: 0.1  // スコア重視
}
```

### バランス型（推奨）

```typescript
categoryDistribution: {
  enabled: true,
  lookbackDays: 7,
  minCategoriesPerDay: 1,
  categoryBalanceWeight: 0.3  // バランス
}
```

### カテゴリ分散重視型（SEO最優先）

```typescript
categoryDistribution: {
  enabled: true,
  lookbackDays: 14,
  minCategoriesPerDay: 2,
  categoryBalanceWeight: 0.6  // カテゴリ優先
}
```

---

## 📈 パフォーマンス最適化

### Vercel Cron制限

- **Hobby**: 10秒タイムアウト
- **Pro**: 60秒タイムアウト
- **1回の実行**: 最大5セッション

### 大量出品の場合

商品数が多い場合、セッションを小分けに：

```typescript
limits: {
  dailyMin: 5,    // 最小を下げる
  dailyMax: 30,   // 最大を下げる
  weeklyMin: 50,
  weeklyMax: 150,
  monthlyMax: 400
}
```

---

## 🔐 セキュリティ

### 本番環境でのチェックリスト

- [ ] `CRON_SECRET` を強力なランダム文字列に変更
- [ ] Supabase RLSポリシーを確認
- [ ] eBay User Tokenを環境変数で管理
- [ ] エラーログを定期的に確認
- [ ] 不正なアクセスがないか監視

---

## 📝 次のステップ

1. **1週間の運用テスト**
   - スケジュール生成
   - 自動実行の確認
   - エラーログの監視

2. **カテゴリ分散の効果測定**
   - eBayでの検索順位の変化
   - ビュー数・ウォッチャー数の増加
   - 売上への影響

3. **将来的な拡張**
   - VPS移行（より高頻度実行が必要な場合）
   - 他マーケットプレイスへの対応
   - A/Bテスト機能の追加

---

**作成日**: 2025-11-02  
**バージョン**: 1.0  
**メンテナンス**: 定期的に実行ログを確認し、エラーがあれば対処してください。
