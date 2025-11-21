# AI対応最適化ハブ - セットアップ手順書

## 概要

この文書は、問い合わせ・通知管理ツール（AI対応最適化ハブ）のセットアップ手順を説明します。

## 目標

- 外注スタッフが「この問い合わせにはどう答えるべきか？」と迷う時間をゼロにする
- 日々の問い合わせ対応を**「AIが作成したドラフトの承認」**というシンプルな作業に置き換える
- 対応時間を80%以上削減する

## 機能概要

### 1. ナレッジベース構築
- 問い合わせデータを知識資産として蓄積
- 高スコアの対応例を自動で抽出・活用

### 2. フィルターボット（Level 0 フィルター）
- 顧客に自動で選択肢を提示
- 意図を絞り込んでからAI分析へ

### 3. AI自動分類・ドラフト生成
- Gemini APIを使用して問い合わせをカテゴリ分類
- 受注情報と連携して回答ドラフトを自動生成

### 4. 一括承認ビュー
- AIドラフトを一覧表示
- チェックを入れて一括送信

### 5. ナレッジサポート
- 対応マニュアルの統合表示
- 過去の成功事例を動的に表示

## セットアップ手順

### 1. 環境変数の設定

`.env.local` ファイルに以下の環境変数を追加してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### 2. データベースマイグレーションの実行

#### 方法1: Supabase ダッシュボード経由（推奨）

1. Supabase ダッシュボードにログイン
2. 「SQL Editor」タブを開く
3. `supabase/migrations/20250121_inquiry_knowledge_base.sql` の内容を貼り付け
4. 「Run」をクリックして実行

#### 方法2: APIエンドポイント経由

```bash
curl -X POST http://localhost:3000/api/inquiry/migrate
```

### 3. マイグレーション内容

以下のテーブルが作成されます：

- **inquiries**: 問い合わせ管理テーブル
- **inquiry_knowledge_base**: ナレッジベース（過去の対応例）
- **inquiry_templates**: AI回答テンプレート
- **inquiry_kpi**: スタッフのKPI追跡
- **inquiry_filter_bot_log**: フィルターボットのログ

初期データとして以下が挿入されます：

- 4つの回答テンプレート（配送遅延、商品不具合、商品仕様、その他）
- 3つのサンプル問い合わせ

### 4. アプリケーションの起動

```bash
npm run dev
```

### 5. 動作確認

1. ブラウザで `http://localhost:3000/inquiry-management` にアクセス
2. 問い合わせリストが表示されることを確認
3. サンプル問い合わせを選択
4. Level 0 フィルターの動作を確認
5. AI分類とドラフト生成を実行
6. 一括承認ビューを開いて、ドラフトを確認

## API エンドポイント

### 問い合わせ管理

- `GET /api/inquiry/list` - 問い合わせリスト取得
  - クエリパラメータ: `status`, `category`, `limit`, `offset`

- `POST /api/inquiry/process-level0` - Level 0 フィルター処理
  - ボディ: `{ inquiryId: string, choice: string }`

- `POST /api/inquiry/classify` - AI分類実行
  - ボディ: `{ inquiryId: string, customerMessage: string, level0Choice?: string }`

- `POST /api/inquiry/generate-draft` - 回答ドラフト生成
  - ボディ: `{ inquiryId?: string, bulkGenerate?: boolean }`

- `POST /api/inquiry/bulk-approve` - 一括承認・送信
  - ボディ: `{ inquiryIds: string[], staffId?: string }`

### ナレッジベース

- `GET /api/inquiry/knowledge-base` - 類似事例取得
  - クエリパラメータ: `category`, `limit`

- `POST /api/inquiry/knowledge-base` - ナレッジベース登録
  - ボディ: `{ inquiryId, aiCategory, customerMessage, finalResponse, responseScore?, orderId?, templateUsed? }`

## ワークフロー

### 新規問い合わせの処理フロー

1. **問い合わせ受信** (ステータス: `NEW`)
   - モールAPIから顧客メッセージを受信
   - フィルターボットが自動で選択肢を提示

2. **Level 0 フィルター** (ステータス: `LEVEL0_PENDING`)
   - 顧客が選択肢を選択（1.配送、2.返品、3.仕様、4.その他）
   - 選択内容に基づいて次のステップへ振り分け

3. **AI分析・分類** (ステータス: `DRAFT_PENDING`)
   - Gemini APIが問い合わせをカテゴリ分類
   - 受注管理ツールと連携して情報を取得

4. **ドラフト生成** (ステータス: `DRAFT_GENERATED`)
   - AIが回答ドラフトを自動生成
   - テンプレートと個別情報を組み合わせ

5. **承認・送信** (ステータス: `SENT` → `COMPLETED`)
   - 外注スタッフがドラフトを確認
   - 一括承認ボタンで複数件を同時送信
   - ナレッジベースに自動登録

## カスタマイズ

### テンプレートの追加

新しい回答テンプレートを追加するには、`inquiry_templates` テーブルに直接INSERT：

```sql
INSERT INTO public.inquiry_templates (
  template_id,
  ai_category,
  template_name,
  template_content,
  variables
) VALUES (
  'TPL-CUSTOM-001',
  'Custom_Category',
  'カスタムテンプレート',
  'テンプレート本文...',
  '["変数1", "変数2"]'::jsonb
);
```

### AI分類カテゴリの追加

`/app/api/inquiry/classify/route.ts` の `systemInstruction` を編集して、新しいカテゴリを追加します。

## トラブルシューティング

### マイグレーションが失敗する

**原因**: Supabaseの権限不足

**対処法**:
1. Supabase ダッシュボードの SQL Editor から直接実行
2. `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか確認

### AIドラフト生成が失敗する

**原因**: Gemini API キーが未設定、またはレート制限

**対処法**:
1. `GEMINI_API_KEY` が `.env.local` に設定されているか確認
2. APIのリトライロジックが動作しているか確認（3回まで自動リトライ）

### 問い合わせリストが表示されない

**原因**: データベース接続エラー

**対処法**:
1. Supabaseの接続情報が正しいか確認
2. ブラウザの開発者ツールでネットワークエラーを確認
3. サーバーログを確認

## 次のステップ

1. **受注管理ツールとの連携**: 実際の受注IDから追跡番号を自動取得
2. **モールAPIとの統合**: eBay Messages API等と連携して自動応答を実現
3. **KPIダッシュボード**: スタッフの対応時間、AIドラフト利用率を可視化
4. **週次分析機能**: AIによる自動パターン分析とテンプレート最適化

## サポート

問題が発生した場合は、以下を確認してください：

1. ブラウザの開発者ツール（コンソール、ネットワーク）
2. サーバーログ（`npm run dev` の出力）
3. Supabase ダッシュボードのログ

## ライセンス

内部利用限定
