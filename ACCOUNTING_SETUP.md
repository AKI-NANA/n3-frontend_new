# 会計・AI経営分析ハブ セットアップガイド

このドキュメントは、マネークラウド統合とAI経営分析ハブのセットアップ手順を説明します。

## 📋 目次

1. [必要な環境変数](#必要な環境変数)
2. [データベースセットアップ](#データベースセットアップ)
3. [使用方法](#使用方法)
4. [API エンドポイント](#api-エンドポイント)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🔐 必要な環境変数

`.env.local` ファイルに以下の環境変数を追加してください：

```bash
# Supabase (既存)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# マネーフォワードクラウド連携
MONEY_CLOUD_ACCESS_TOKEN=your_access_token
MONEY_CLOUD_REFRESH_TOKEN=your_refresh_token
MONEY_CLOUD_OFFICE_ID=your_office_id
MONEY_CLOUD_CLIENT_ID=your_client_id
MONEY_CLOUD_CLIENT_SECRET=your_client_secret

# AI分析（Gemini API）
GEMINI_API_KEY=your_gemini_api_key
```

### 環境変数の取得方法

#### マネーフォワードクラウド

1. [マネーフォワードクラウド開発者ポータル](https://developer.moneyforward.com/)にアクセス
2. アプリケーションを登録
3. OAuth2認証フローで `access_token` と `refresh_token` を取得
4. 事業所IDは、マネークラウド管理画面のURLから取得可能

#### Gemini API

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 「Create API Key」をクリック
3. 生成されたAPIキーを `GEMINI_API_KEY` に設定

---

## 🗄️ データベースセットアップ

### 方法1: Supabase Web UI（推奨）

1. Supabaseプロジェクトのダッシュボードにアクセス
2. 左メニューから「SQL Editor」を選択
3. `supabase/migrations/20250122_create_accounting_tables.sql` の内容をコピー＆ペースト
4. 「RUN」をクリックして実行

### 方法2: Supabase CLI

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref your_project_ref

# マイグレーションを実行
supabase db push
```

### 作成されるテーブル

| テーブル名 | 説明 |
|-----------|------|
| `expense_master` | 経費マスターデータ（自動分類用） |
| `accounting_final_ledger` | 最終会計台帳 |
| `ai_analysis_results` | AI経営分析結果 |
| `money_cloud_sync_logs` | マネークラウド同期ログ |

---

## 🚀 使用方法

### 1. マネークラウドとの同期

#### API経由で同期を実行

```bash
curl -X POST http://localhost:3000/api/accounting/sync-money-cloud \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }'
```

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "syncedCount": 150,
    "classifiedCount": 150,
    "savedCount": 145,
    "highConfidenceCount": 120,
    "requiresApprovalCount": 30
  }
}
```

### 2. AI経営分析の実行

#### 週次分析を実行

```bash
curl -X POST http://localhost:3000/api/accounting/ai-analysis \
  -H "Content-Type: application/json" \
  -d '{"period": "WEEKLY"}'
```

#### 月次分析を実行

```bash
curl -X POST http://localhost:3000/api/accounting/ai-analysis \
  -H "Content-Type: application/json" \
  -d '{"period": "MONTHLY"}'
```

### 3. ダッシュボードで確認

ブラウザで `/dashboard` にアクセスすると、以下のセクションが表示されます：

- 🧠 **AI経営方針提言パネル**: 最新のAI分析結果と提言
- 📊 **月次P/Lサマリー**: 売上、経費、利益の概要
- 🎨 **経費の内訳**: 経費カテゴリー別の円グラフ

---

## 🔌 API エンドポイント

### 財務サマリー取得

```
GET /api/accounting/financial-summary?period=MONTHLY
```

**クエリパラメータ:**
- `period`: `WEEKLY` または `MONTHLY`
- または `startDate` と `endDate` を指定（YYYY-MM-DD形式）

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "totalRevenue": 5000000,
    "totalCOGS": 2000000,
    "totalExpenses": 1500000,
    "netProfit": 1500000,
    "grossProfit": 3000000,
    "grossProfitRate": 60.0,
    "netProfitRate": 30.0,
    "expenseRatio": 30.0,
    "periodStart": "2025-01-01",
    "periodEnd": "2025-01-31"
  }
}
```

### 経費内訳取得

```
GET /api/accounting/expense-breakdown?period=MONTHLY
```

**レスポンス:**

```json
{
  "success": true,
  "data": [
    {
      "category_id": "SHIPPING_FEE",
      "account_title": "発送費",
      "total_amount": 500000,
      "percentage": 33.3
    },
    {
      "category_id": "PLATFORM_FEE",
      "account_title": "支払手数料",
      "total_amount": 400000,
      "percentage": 26.7
    }
  ]
}
```

### AI分析結果取得

```
GET /api/accounting/ai-analysis?limit=1
```

**レスポンス:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "analysis_date": "2025-01-22",
      "evaluation_summary": "粗利率60.0%、純利益率30.0%で推移...",
      "gross_profit_rate": 60.0,
      "net_profit_rate": 30.0,
      "expense_ratio": 30.0,
      "cash_balance": 0,
      "issues": [
        "配送費が経費の33%を占めています",
        "一部カテゴリーで利益率が低下しています"
      ],
      "policy_recommendation": [
        "配送費の削減: FedEx契約の見直しを優先すべき",
        "高利益率カテゴリーへの集中投資を推奨"
      ],
      "reference_data_ids": ["2025-01-01_2025-01-31"]
    }
  ]
}
```

### マネークラウド同期

```
POST /api/accounting/sync-money-cloud
```

**リクエストボディ:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

---

## 🛠️ トラブルシューティング

### マネークラウド連携エラー

#### エラー: "認証情報が設定されていません"

**原因:** 環境変数が正しく設定されていない

**解決方法:**
1. `.env.local` に必要な環境変数が設定されているか確認
2. Next.js開発サーバーを再起動（`npm run dev`）

#### エラー: "トークンリフレッシュに失敗"

**原因:** `refresh_token` が無効または期限切れ

**解決方法:**
1. マネーフォワードクラウドで再認証
2. 新しい `access_token` と `refresh_token` を取得

### AI分析エラー

#### エラー: "GEMINI_API_KEYが設定されていません"

**原因:** Gemini APIキーが未設定

**解決方法:**
1. Google AI StudioでAPIキーを取得
2. `.env.local` に `GEMINI_API_KEY=your_key` を追加
3. サーバーを再起動

**注意:** APIキー未設定の場合、モックデータが返されます。

### データベースエラー

#### エラー: "relation 'expense_master' does not exist"

**原因:** マイグレーションが未実行

**解決方法:**
1. [データベースセットアップ](#データベースセットアップ)の手順に従ってマイグレーションを実行

---

## 📚 関連ドキュメント

- [マネーフォワードクラウド API ドキュメント](https://developer.moneyforward.com/docs)
- [Gemini API ドキュメント](https://ai.google.dev/docs)
- [Supabase ドキュメント](https://supabase.com/docs)

---

## 🎯 次のステップ

1. ✅ データベースマイグレーションを実行
2. ✅ 環境変数を設定
3. ✅ マネークラウドと同期
4. ✅ AI分析を実行
5. ✅ ダッシュボードで結果を確認

---

## 📞 サポート

質問や問題がある場合は、開発チームにお問い合わせください。
