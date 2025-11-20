# AI仕入れ先候補探索機能 - 実装ドキュメント

## 概要

このドキュメントは、AI解析・リサーチツール改良機能の実装内容をまとめたものです。

### 主要機能

1. **AI仕入れ先候補探索**: AIが主要ECサイトを探索し、最も安価な仕入れ先候補を特定
2. **スコアリング機能**: 仕入れ先候補の価格を元に利益計算とスコアリングを実行
3. **リサーチ結果管理**: eBayリサーチ結果の一覧表示、フィルタリング、AI解析の実行
4. **CSV出力**: リサーチ結果と仕入れ先候補を含むCSVファイルの生成

---

## 📁 ファイル構成

### データベーススキーマ

```
docs/migrations/
├── 001_add_supplier_candidates_table.sql   # 仕入れ先候補テーブル
└── 002_extend_research_results_table.sql   # research_resultsテーブル拡張
```

**実行方法:**
Supabase Studioで上記のSQLファイルを実行してください。

### バックエンドAPI

```
app/api/research/
├── ai-supplier-search/route.ts    # AI仕入れ先候補探索API
├── calculate-scores/route.ts      # リサーチ結果スコア計算API
└── export-csv/route.ts            # CSV出力API
```

### ライブラリ

```
lib/research/
├── types.ts                       # 型定義
├── supplier-search.ts             # AI仕入れ先探索モジュール
└── research-db.ts                 # リサーチ結果のDB操作（既存）
```

### フロントエンドUI

```
app/research/
└── results/page.tsx               # リサーチ結果管理ページ

components/research/
├── ResearchResultsTable.tsx       # リサーチ結果一覧テーブル
└── AIAnalysisPanel.tsx            # AI解析パネル
```

---

## 🗄️ データベース構造

### 1. supplier_candidates テーブル

仕入れ先候補を保存するテーブルです。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | プライマリキー |
| product_id | UUID | products_masterへの外部キー |
| ebay_item_id | TEXT | research_resultsとの紐付け用 |
| sku | TEXT | SKUコード |
| product_name | TEXT | 商品名 |
| product_model | TEXT | 型番 |
| candidate_price_jpy | NUMERIC | 候補価格（仮原価） |
| estimated_domestic_shipping_jpy | NUMERIC | 推定国内送料 |
| total_cost_jpy | NUMERIC | 総仕入れコスト（自動計算） |
| supplier_url | TEXT | 仕入れ先URL |
| supplier_name | TEXT | 仕入れ先名 |
| supplier_type | TEXT | 仕入れ先タイプ（amazon_jp, rakuten等） |
| confidence_score | NUMERIC | 特定信頼度（0.0-1.0） |
| search_method | TEXT | 探索方法 |
| stock_status | TEXT | 在庫状況 |
| price_checked_at | TIMESTAMPTZ | 価格確認日時 |

### 2. research_results テーブル拡張

既存のresearch_resultsテーブルに以下のカラムを追加します。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| research_status | ENUM | NEW, SCORED, AI_QUEUED, AI_COMPLETED |
| last_research_date | TIMESTAMPTZ | 最終リサーチ日時 |
| ai_cost_status | BOOLEAN | AI仕入れ先特定完了フラグ |
| provisional_score | NUMERIC | 暫定Uiスコア |
| final_score | NUMERIC | 最終Uiスコア |
| ai_supplier_candidate_id | UUID | 仕入れ先候補への外部キー |
| ai_analyzed_at | TIMESTAMPTZ | AI解析完了日時 |
| score_details | JSONB | スコア計算の詳細 |

---

## 🔌 API仕様

### 1. AI仕入れ先候補探索API

**エンドポイント:** `POST /api/research/ai-supplier-search`

**リクエスト:**
```json
{
  "ebay_item_ids": ["123456789", "987654321"],
  "product_ids": ["uuid-1", "uuid-2"],
  "search_params": {
    "product_name": "商品名",
    "product_model": "型番",
    "image_url": "画像URL"
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product_name": "商品名",
      "supplier_name": "Amazon Japan",
      "supplier_url": "https://...",
      "candidate_price_jpy": 5000,
      "estimated_domestic_shipping_jpy": 500,
      "total_cost_jpy": 5500,
      "confidence_score": 0.95,
      "stock_status": "in_stock"
    }
  ],
  "processed_count": 2
}
```

**使用例:**
```typescript
const response = await fetch('/api/research/ai-supplier-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ebay_item_ids: ['123456789']
  })
});

const data = await response.json();
console.log(`${data.processed_count}件処理完了`);
```

### 2. スコア計算API

**エンドポイント:** `POST /api/research/calculate-scores`

**リクエスト:**
```json
{
  "ebay_item_ids": ["123456789"],
  "use_ai_supplier_price": true
}
```

**レスポンス:**
```json
{
  "success": true,
  "updated": 1,
  "results": [
    {
      "ebay_item_id": "123456789",
      "provisional_score": 45000,
      "final_score": 67000,
      "score_details": {
        "profit_score": 800,
        "competition_score": 600,
        "trend_score": 700
      }
    }
  ]
}
```

### 3. CSV出力API

**エンドポイント:** `POST /api/research/export-csv`

**リクエスト:**
```json
{
  "ebay_item_ids": ["123456789", "987654321"],
  "include_supplier_info": true
}
```

**レスポンス:** CSV file

**CSVヘッダー:**
- eBay Item ID
- 商品名
- eBay価格（USD）
- 売上数
- 競合数
- 研究ステータス
- 暫定スコア
- 最終スコア
- AI解析済み
- AI特定仕入れ先名
- AI特定仕入れ先URL
- AI特定価格（JPY）
- 推定国内送料（JPY）
- 総仕入れコスト（JPY）
- 信頼度スコア
- 在庫状況
- ... その他

---

## 🎨 UI使用方法

### リサーチ結果管理ページ

**URL:** `/research/results`

#### 基本的なワークフロー:

1. **フィルター設定**
   - ステータス（NEW, SCORED, AI_QUEUED, AI_COMPLETED）
   - AI解析ステータス（完了/未完了）
   - スコア範囲（最小/最大）
   - 売上数範囲
   - キーワード検索

2. **商品選択**
   - チェックボックスで個別選択
   - 「全て選択」ボタン
   - 「上位10%を選択」「上位25%を選択」ボタン

3. **AI解析実行**
   - 右側のAI解析パネルで「AI仕入れ先候補探索を開始」をクリック
   - 処理が完了すると、自動的にスコアが再計算される

4. **結果の確認**
   - 暫定スコア: 仕入れ先未定の状態でのスコア
   - 最終スコア: AI特定の仕入れ先価格を含むスコア

5. **CSV出力**
   - 「CSV出力」ボタンで選択した商品のデータをダウンロード

---

## 🧮 スコア計算ロジック

### 暫定スコア（仕入れ先未定）

暫定スコアは、仕入れ先が未定の状態で計算されるスコアです。

```typescript
暫定スコア = S(売上数) × 0.2 + C(競合) × 0.15 + R(リスク) × 0.25 + T(トレンド) × 0.1
```

- P (利益性): 0点（仕入れ先未定のため計算不可）
- S (売上数): 20% - 売上数に基づくスコア
- C (競合): 15% - 競合が少ないほど高スコア
- R (リスク): 25% - 中間値（仮値）
- T (トレンド): 10% - 売上トレンド

### 最終スコア（AI特定価格込み）

最終スコアは、AI特定の仕入れ先価格を含めて計算されるスコアです。

```typescript
最終スコア = P(利益性) × 0.3 + S(売上数) × 0.2 + C(競合) × 0.15 + R(リスク) × 0.25 + T(トレンド) × 0.1
```

- **P (利益性): 30%**
  - 利益額スコア（70%）+ 利益率スコア（30%）
  - 利益額 >= ¥10,000: 1000点
  - 利益率: 1% = 20点

- **R (リスク): 25%**
  - 信頼度スコアが低い場合はペナルティ
  - 在庫切れの場合はペナルティ

---

## 🔧 セットアップ手順

### 1. データベースマイグレーション

Supabase Studioで以下のSQLファイルを実行してください:

```bash
docs/migrations/001_add_supplier_candidates_table.sql
docs/migrations/002_extend_research_results_table.sql
```

### 2. 環境変数の設定

`.env.local` に以下を追加してください:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. 依存関係のインストール

```bash
npm install @anthropic-ai/sdk
```

### 4. アプリケーションの起動

```bash
npm run dev
```

---

## 📊 使用例

### 例1: リサーチ結果のAI解析

```typescript
// 1. リサーチ結果を取得
const { data: researchResults } = await supabase
  .from('research_results')
  .select('*')
  .eq('research_status', 'NEW')
  .order('sold_count', { ascending: false })
  .limit(10);

// 2. AI解析を実行
const response = await fetch('/api/research/ai-supplier-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ebay_item_ids: researchResults.map(r => r.ebay_item_id)
  })
});

// 3. スコア再計算
await fetch('/api/research/calculate-scores', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ebay_item_ids: researchResults.map(r => r.ebay_item_id),
    use_ai_supplier_price: true
  })
});
```

### 例2: CSV出力

```typescript
// 選択された商品のCSVを出力
const response = await fetch('/api/research/export-csv', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ebay_item_ids: ['123456789', '987654321'],
    include_supplier_info: true
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'research_results.csv';
a.click();
```

---

## ⚠️ 注意事項

1. **API利用料金**
   - Claude APIの利用料金が発生します（1件あたり約$0.05〜$0.15）
   - 大量の商品を一度に処理すると、料金が高額になる可能性があります

2. **処理時間**
   - 1件あたり約30秒の処理時間がかかります
   - 大量の商品を処理する場合は、時間に余裕を持って実行してください

3. **信頼度スコア**
   - AIが特定した価格の信頼度は、confidence_scoreで確認できます
   - 信頼度が低い場合は、手動で確認することをお勧めします

4. **在庫状況**
   - 在庫状況は定期的に変わる可能性があります
   - 実際に発注する前に、必ず仕入れ先URLで在庫を確認してください

---

## 🚀 今後の拡張予定

1. **バッチ処理の最適化**
   - 並列処理による高速化
   - プログレスバーの実装

2. **仕入れ先データベースの充実**
   - 優良仕入れ先のDB登録
   - 過去の取引履歴との照合

3. **画像解析の強化**
   - Google Lens APIの統合
   - 類似商品検索の精度向上

4. **自動リサーチジョブ**
   - VPS環境での定期実行
   - 自動スコア更新

---

## 🐛 トラブルシューティング

### Q: AI解析が失敗する

A: 以下を確認してください:
- `ANTHROPIC_API_KEY`が正しく設定されているか
- ネットワーク接続が安定しているか
- リクエスト数がAPI制限を超えていないか

### Q: スコアが計算されない

A: 以下を確認してください:
- `research_status`が正しく更新されているか
- `ai_supplier_candidate_id`が設定されているか
- スコア計算APIが正しく呼ばれているか

### Q: CSV出力に仕入れ先情報が含まれない

A: `include_supplier_info`を`true`に設定しているか確認してください。

---

## 📞 サポート

問題が発生した場合は、以下の情報を含めてお問い合わせください:

- エラーメッセージ
- 再現手順
- ブラウザのコンソールログ
- サーバーログ

---

## 📝 更新履歴

- 2025-11-20: 初版作成
  - AI仕入れ先候補探索機能の実装
  - リサーチ結果管理UIの実装
  - スコアリング機能の実装
  - CSV出力機能の実装
