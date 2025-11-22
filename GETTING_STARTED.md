# 🚀 運用開始ガイド

このドキュメントは、会計・AI経営分析ハブと財務データ統合価格計算の運用開始手順を説明します。

---

## 📋 前提条件

以下が完了していることを確認してください：

- ✅ Supabaseプロジェクトの作成
- ✅ Next.js開発環境のセットアップ
- ✅ マネーフォワードクラウドのアカウント
- ✅ Google Gemini APIキー

---

## ステップ1: データベースマイグレーション

### 1.1 マイグレーションファイルの実行

`supabase/migrations/20250122_create_accounting_tables.sql` をSupabaseに適用します。

#### 方法A: Supabase Web UI（推奨）

1. [Supabaseダッシュボード](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左メニューから **「SQL Editor」** をクリック
4. **「New query」** をクリック
5. `supabase/migrations/20250122_create_accounting_tables.sql` の内容をコピー＆ペースト
6. **「RUN」** をクリック

#### 方法B: Supabase CLI

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref your_project_ref

# マイグレーションを実行
supabase db push
```

### 1.2 マイグレーション確認

以下のコマンドで、テーブルが正しく作成されたことを確認します：

```sql
-- Supabase SQL Editorで実行
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'expense_master',
    'accounting_final_ledger',
    'ai_analysis_results',
    'money_cloud_sync_logs'
  );
```

4つのテーブルが表示されればOKです。

---

## ステップ2: 環境変数の設定

### 2.1 `.env.local` ファイルを作成

プロジェクトルートに `.env.local` ファイルを作成し、以下を追加します：

```bash
# ========================================
# Supabase（既存）
# ========================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ========================================
# マネーフォワードクラウド連携
# ========================================
MONEY_CLOUD_ACCESS_TOKEN=your_access_token
MONEY_CLOUD_REFRESH_TOKEN=your_refresh_token
MONEY_CLOUD_OFFICE_ID=your_office_id
MONEY_CLOUD_CLIENT_ID=your_client_id
MONEY_CLOUD_CLIENT_SECRET=your_client_secret

# ========================================
# AI分析（Gemini API）
# ========================================
GEMINI_API_KEY=your_gemini_api_key
```

### 2.2 環境変数の取得方法

#### マネーフォワードクラウド

1. [マネーフォワードクラウド開発者ポータル](https://developer.moneyforward.com/)にアクセス
2. アプリケーションを登録
3. OAuth2認証フローで `access_token` と `refresh_token` を取得
4. 事業所IDは、マネークラウド管理画面のURLから取得可能

#### Gemini API

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 「Create API Key」をクリック
3. 生成されたAPIキーを `GEMINI_API_KEY` に設定

### 2.3 開発サーバーの再起動

環境変数を設定したら、開発サーバーを再起動します：

```bash
npm run dev
```

---

## ステップ3: 初回データ同期

### 3.1 マネークラウドとの同期を実行

以下のコマンドで、マネークラウドから取引データを取得します：

```bash
curl -X POST http://localhost:3000/api/accounting/sync-money-cloud \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }'
```

**成功例:**

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

### 3.2 同期結果の確認

Supabase SQL Editorで、データが正しく保存されたことを確認します：

```sql
-- 会計台帳のレコード数を確認
SELECT COUNT(*) FROM accounting_final_ledger;

-- 最新の5件を表示
SELECT * FROM accounting_final_ledger
ORDER BY created_at DESC
LIMIT 5;
```

---

## ステップ4: AI経営分析の実行

### 4.1 初回分析を実行

以下のコマンドで、AI経営分析を実行します：

```bash
curl -X POST http://localhost:3000/api/accounting/ai-analysis \
  -H "Content-Type: application/json" \
  -d '{"period": "MONTHLY"}'
```

**成功例:**

```json
{
  "success": true,
  "data": {
    "analysis_date": "2025-01-22",
    "evaluation_summary": "粗利率60.0%、純利益率30.0%で推移しています...",
    "gross_profit_rate": 60.0,
    "net_profit_rate": 30.0,
    "expense_ratio": 30.0,
    "issues": [
      "配送費が経費の33%を占めています",
      "一部カテゴリーで利益率が低下しています"
    ],
    "policy_recommendation": [
      "配送費の削減: FedEx契約の見直しを優先すべき",
      "高利益率カテゴリーへの集中投資を推奨"
    ]
  }
}
```

### 4.2 分析結果の確認

```sql
-- AI分析結果を確認
SELECT * FROM ai_analysis_results
ORDER BY analysis_date DESC
LIMIT 1;
```

---

## ステップ5: ダッシュボードで確認

### 5.1 ダッシュボードにアクセス

ブラウザで以下のURLにアクセスします：

```
http://localhost:3000/dashboard
```

### 5.2 表示内容の確認

以下のセクションが表示されることを確認してください：

- ✅ **AI経営方針提言パネル**: 最新のAI分析結果と提言
- ✅ **月次P/Lサマリー**: 売上、経費、利益の概要
- ✅ **経費の内訳**: 経費カテゴリー別の円グラフ
- ✅ **主要KPI**: 粗利率、純利益率、経費率

---

## ステップ6: 財務データ統合価格計算の使用

### 6.1 既存の価格計算コードを更新

従来の価格計算コード：

```typescript
import { calculatePrice } from '@/lib/pricing/pricing-engine';

// 従来の方法（固定13%の経費率）
const result = await calculatePrice(
  {
    product_id: 123,
    cost_jpy: 10000,
    shipping_cost_jpy: 2000,
    exchange_rate: 150,
  },
  strategy
);
```

**新しい統合価格計算コード:**

```typescript
import { calculatePriceWithFinancialData } from '@/lib/pricing/integrated-pricing-engine';

// 会計システムから実際の経費率を自動取得して計算
const result = await calculatePriceWithFinancialData(
  {
    product_id: 123,
    cost_jpy: 10000,
    shipping_cost_jpy: 2000,
    exchange_rate: 150,
  },
  strategy
);
// ✨ 実際の経費率（例: 15.3%）が自動的に使用されます
```

### 6.2 一括計算の例

```typescript
import { calculateBulkPricesWithFinancialData } from '@/lib/pricing/integrated-pricing-engine';

// 複数商品の価格を一括計算（実際の経費率を使用）
const results = await calculateBulkPricesWithFinancialData(
  [
    { product_id: 1, cost_jpy: 10000, shipping_cost_jpy: 2000 },
    { product_id: 2, cost_jpy: 15000, shipping_cost_jpy: 3000 },
    { product_id: 3, cost_jpy: 8000, shipping_cost_jpy: 1500 },
  ],
  strategiesMap
);
```

### 6.3 損益分岐点の計算例

```typescript
import { calculateBreakEvenPrice } from '@/lib/pricing/integrated-pricing-engine';

// 実際の経費率を使用して損益分岐点を計算
const breakEven = await calculateBreakEvenPrice(
  10000, // 仕入れ原価（円）
  2000,  // 送料（円）
  150    // 為替レート
);

console.log(`損益分岐点: $${breakEven.breakEvenPriceUsd}`);
console.log(`経費率: ${breakEven.expenseRatio}%`);
console.log(`データソース: ${breakEven.dataSource}`); // 'REAL_DATA' または 'DEFAULT'
```

---

## 🔄 定期メンテナンス

### 週次タスク

```bash
# 1. マネークラウドとの同期（過去7日間）
curl -X POST http://localhost:3000/api/accounting/sync-money-cloud \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-15",
    "endDate": "2025-01-22"
  }'

# 2. 週次AI分析を実行
curl -X POST http://localhost:3000/api/accounting/ai-analysis \
  -H "Content-Type: application/json" \
  -d '{"period": "WEEKLY"}'
```

### 月次タスク

```bash
# 1. マネークラウドとの同期（過去30日間）
curl -X POST http://localhost:3000/api/accounting/sync-money-cloud \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }'

# 2. 月次AI分析を実行
curl -X POST http://localhost:3000/api/accounting/ai-analysis \
  -H "Content-Type: application/json" \
  -d '{"period": "MONTHLY"}'
```

### キャッシュのクリア

新しい会計データを同期した後は、財務指標のキャッシュをクリアすることを推奨します：

```typescript
import { clearFinancialMetricsCache } from '@/lib/pricing/integrated-pricing-engine';

// 会計データ同期後にキャッシュをクリア
clearFinancialMetricsCache();
```

---

## ❓ トラブルシューティング

### エラー: "認証情報が設定されていません"

**原因:** 環境変数が正しく設定されていない

**解決方法:**
1. `.env.local` に必要な環境変数が設定されているか確認
2. Next.js開発サーバーを再起動（`npm run dev`）

### エラー: "GEMINI_API_KEYが設定されていません"

**原因:** Gemini APIキーが未設定

**解決方法:**
1. Google AI StudioでAPIキーを取得
2. `.env.local` に `GEMINI_API_KEY=your_key` を追加
3. サーバーを再起動

**注意:** APIキー未設定の場合、モックデータが返されます。

### データが表示されない

**原因:** マイグレーションが未実行、またはデータ同期が未実行

**解決方法:**
1. ステップ1のマイグレーションを実行
2. ステップ3のデータ同期を実行
3. ステップ4のAI分析を実行

---

## 📊 システムの価値

このシステムにより、以下が実現されます：

✅ **完全な制度会計**: マネークラウドとの連携で、受注データと経費データを統合
✅ **自動化**: 経費の分類を手作業から自動化し、業務効率を大幅改善
✅ **経営の可視化**: リアルタイムな財務状況の把握
✅ **AI駆動の意思決定**: データに基づく具体的な経営方針の提言
✅ **正確な価格計算**: 実際の経費率に基づく精度の高い損益分岐点計算

---

## 📚 関連ドキュメント

- [会計セットアップガイド](./ACCOUNTING_SETUP.md) - 詳細な技術仕様
- [マネーフォワードクラウド API ドキュメント](https://developer.moneyforward.com/docs)
- [Gemini API ドキュメント](https://ai.google.dev/docs)
- [Supabase ドキュメント](https://supabase.com/docs)

---

**次は、タスク3以降の高優先度タスクに進んでください！**
