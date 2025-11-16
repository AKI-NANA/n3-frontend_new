# 🚀 自動出品スケジューラー - 完全自動化システム

## ✅ 実装完了機能

### 1. 完全自動実行システム ✨ NEW
- **Cronエンドポイント**: `/api/cron/execute-schedules`
- **実行頻度**: 1分ごと（Vercel Cron）
- **動作**: PC不要で24時間365日自動稼働
- **処理内容**:
  - 現在時刻±5分のスケジュールを自動検出
  - eBay APIで順次出品
  - 実行ログを記録
  - エラー時の自動リトライ

### 2. カテゴリ分散ロジック ✨ NEW
- **SEO最適化**: 検索エンジン露出を最大化
- **分析機能**: 直近N日間の出品カテゴリを統計分析
- **自動調整**: 出品が少ないカテゴリを優先選択
- **バランス設定**: スコアとカテゴリのバランスを調整可能
- **設定UI**: 専用タブで簡単に設定変更

### 3. スケジュール生成システム
- **優先度ベースソート**: priority → AI score → profit
- **カテゴリバランス**: 出品頻度を考慮した分散配置
- **モール別設定**: eBay、Shopee、Amazon JPなど
- **ランダム化**: 時刻・セッション数・商品間隔

### 4. eBay API統合
- **Inventory API**: 在庫管理・出品・更新
- **OAuth認証**: User Token方式（18ヶ月有効）
- **2アカウント対応**: account1, account2
- **レート制限対策**: 商品間隔の自動調整

### 5. データベース統合
- **スケジュール管理**: `listing_schedules`
- **出品履歴**: `listing_history`
- **実行ログ**: `cron_execution_logs` ✨ NEW
- **カテゴリ設定**: `category_distribution_settings` ✨ NEW

---

## 📁 ファイル構成

```
n3-frontend_new/
├── app/api/cron/execute-schedules/
│   └── route.ts                    # ✨ NEW: Cron自動実行エンドポイント
├── lib/
│   ├── smart-scheduler-v2.ts       # ✨ NEW: カテゴリ分散対応スケジューラー
│   ├── smart-scheduler.ts          # 旧バージョン（互換性維持）
│   └── ebay/
│       ├── inventory.ts            # eBay出品API
│       └── oauth.ts                # eBay認証
├── app/listing-management/
│   └── page.tsx                    # ✨ UPDATED: カテゴリ分散タブ追加
├── database/migrations/
│   └── add_category_distribution_and_cron_logs.sql  # ✨ NEW: DB拡張SQL
├── vercel.json                     # ✨ NEW: Vercel Cron設定
├── docs/
│   ├── DEPLOYMENT_GUIDE.md         # ✨ NEW: デプロイメントガイド
│   └── development_plan_listing_automation.md  # 開発計画書
└── .env.example                    # ✨ NEW: 環境変数テンプレート
```

---

## 🎯 使い方

### Step 1: データベースセットアップ

Supabase SQL Editorで実行：
```sql
-- database/migrations/add_category_distribution_and_cron_logs.sql
```

### Step 2: 環境変数設定

`.env.local` に追加：
```bash
CRON_SECRET=your-secure-random-string
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
EBAY_AUTH_TOKEN=your-token
```

### Step 3: スケジュール生成

1. http://localhost:3000/listing-management にアクセス
2. **カテゴリ分散** タブで設定：
   - 有効化: ON
   - 分析期間: 7日
   - 最低カテゴリ数: 1個
   - 重み: 0.3（バランス型）
3. **スケジュール生成** ボタンをクリック

### Step 4: 自動実行開始

Vercelにデプロイ：
```bash
git add .
git commit -m "Deploy automated scheduler"
git push origin main
```

デプロイ後、自動的に1分ごとにCronが実行されます。

---

## 🎨 カテゴリ分散の仕組み

### 動作フロー

```
1. 直近N日間の出品カテゴリを分析
   ↓
2. 各カテゴリの出品頻度・最終出品日を計算
   ↓
3. 商品にスコアを付与
   - 基本スコア = priority + AI score + profit
   - カテゴリスコア = 出品が少ないほど高い
   ↓
4. 重み付け合成
   - 最終スコア = 基本スコア × (1-重み) + カテゴリスコア × 重み
   ↓
5. 最終スコア順にソート
   ↓
6. 1日最低N個の異なるカテゴリから選択
```

### 設定例

#### バランス型（推奨）
```typescript
{
  lookbackDays: 7,           // 直近7日間を分析
  minCategoriesPerDay: 1,     // 1日1カテゴリ以上
  categoryBalanceWeight: 0.3  // スコア7:カテゴリ3
}
```

**効果**: 高スコア商品を優先しつつ、カテゴリも分散

#### スコア重視型
```typescript
{
  lookbackDays: 3,
  minCategoriesPerDay: 1,
  categoryBalanceWeight: 0.1  // スコア9:カテゴリ1
}
```

**効果**: ほぼスコア順、カテゴリは最低限考慮

#### 分散重視型
```typescript
{
  lookbackDays: 14,
  minCategoriesPerDay: 2,
  categoryBalanceWeight: 0.6  // スコア4:カテゴリ6
}
```

**効果**: カテゴリ分散を最優先、SEO効果大

---

## 📊 監視とログ

### Vercelダッシュボード
- **Cron Jobs**: 実行状況を確認
- **Functions Logs**: エラーログを確認

### Supabaseクエリ

#### 実行履歴
```sql
SELECT * FROM cron_execution_logs 
ORDER BY execution_time DESC 
LIMIT 10;
```

#### 出品結果
```sql
SELECT * FROM listing_history 
WHERE status = 'success' 
ORDER BY listed_at DESC 
LIMIT 20;
```

#### カテゴリ統計
```sql
SELECT 
  (ebay_api_data->>'category_id') as category,
  COUNT(*) as count,
  MAX(listed_at) as last_listed
FROM yahoo_scraped_products
WHERE status = 'listed'
  AND listed_at >= NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY count DESC;
```

---

## 🔧 トラブルシューティング

### Cronが実行されない
1. `vercel.json` をコミット
2. Vercelで Cron Jobs を確認
3. `CRON_SECRET` を設定

### スケジュールが実行されない
1. `status='pending'` のレコードを確認
2. `scheduled_time` が現在時刻±5分か確認
3. 商品の `status='ready_to_list'` を確認

### eBay出品エラー
1. User Tokenの有効期限確認
2. 商品データの完全性確認
3. APIレート制限を確認

---

## 🎯 パフォーマンス

### 現在の制限
- **Vercel Cron**: 1分ごと
- **タイムアウト**: 60秒（Pro）
- **1回の実行**: 最大5セッション

### 大規模運用時
- VPS移行を検討（秒単位の実行が必要な場合）
- セッション数を調整（dailyMax を下げる）
- 複数アカウントで分散

---

## 📈 期待される効果

### SEO面
- ✅ カテゴリ分散により検索結果での露出増加
- ✅ 新規カテゴリの定期的な出品
- ✅ eBayアルゴリズムでの評価向上

### 運用面
- ✅ PC不要で24時間自動稼働
- ✅ 手動作業ゼロ
- ✅ エラー時の自動リトライ
- ✅ 詳細なログによる追跡可能性

### ビジネス面
- ✅ 高スコア商品を優先しつつカテゴリ分散
- ✅ 利益を最大化しながらSEO最適化
- ✅ 安定した出品ペース
- ✅ スケーラブルな運用

---

## 🚀 次のステップ

1. **テスト運用（1週間）**
   - スケジュール生成・自動実行の確認
   - エラーログの監視
   - カテゴリ分散の効果測定

2. **最適化**
   - カテゴリバランス重みの調整
   - 出品数上限の調整
   - セッション分割の最適化

3. **拡張機能**
   - 他マーケットプレイスへの対応
   - A/Bテスト機能
   - 自動価格調整

---

## 📞 サポート

質問・問題がある場合：
1. `docs/DEPLOYMENT_GUIDE.md` を確認
2. Supabaseのログを確認
3. Vercelのログを確認

---

**完成日**: 2025-11-02  
**バージョン**: 2.0  
**ステータス**: ✅ 本番運用可能  
