# HTSコード分類キーワード自動生成ツール - セットアップガイド

## 📋 概要

このツールは、Gemini APIを使用してHTSコード（6桁）に関連する日本語・英語のキーワードを自動生成し、商品のHTS分類精度を向上させるためのシステムです。

## 🏗️ アーキテクチャ

### データフロー

```
┌─────────────────────────────────────────┐
│   管理者UIページ                         │
│   /admin/hs-keyword-generator           │
│   (CSVアップロード/Supabase取得)         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   キーワード生成API                      │
│   /api/admin/generate-hs-keywords       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   HSKeywordGeneratorService             │
│   ・Gemini API呼び出し                   │
│   ・レート制限対応・リトライ処理          │
│   ・非同期バッチ処理（5並列）             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   hs_keywords テーブル                  │
│   ・hs_code (6桁)                       │
│   ・keyword (キーワード)                 │
│   ・language (ja/en)                    │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   データ編集UI                           │
│   /tools/editing                        │
│   ・HTSコード入力時に自動キーワード表示   │
│   ・HTSClassificationModal統合           │
└─────────────────────────────────────────┘
```

### 3つのテーブル連携

1. **research_repository**: リサーチ履歴、AIが提案したhts_codeを格納
2. **hs_keywords**: HTSコードをキーとしてキーワードを格納（新規作成）
3. **products_master**: 承認された製品の確定hts_codeを格納

## 🚀 セットアップ手順

### ステップ1: Supabaseにテーブルを作成

`database/schema/hs_keywords.sql` をSupabaseで実行してください。

```bash
# Supabase Dashboard → SQL Editor → New Query
# database/schema/hs_keywords.sql の内容を貼り付けて実行
```

テーブル構造:
```sql
CREATE TABLE hs_keywords (
  id BIGSERIAL PRIMARY KEY,
  hs_code VARCHAR(10) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  language VARCHAR(2) NOT NULL CHECK (language IN ('ja', 'en')),
  created_by VARCHAR(10) DEFAULT 'AI' CHECK (created_by IN ('AI', 'MANUAL')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_hs_keyword UNIQUE (hs_code, keyword, language)
);
```

### ステップ2: 環境変数の設定

`.env.local` に以下を追加:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Gemini API Keyは以下から取得:
https://ai.google.dev/

### ステップ3: 依存パッケージのインストール

```bash
npm install @google/genai
```

### ステップ4: アプリケーションの起動

```bash
npm run dev
```

### ステップ5: データベースへの初期データ投入（オプション）

1. ブラウザで `/admin/hs-keyword-generator` にアクセス
2. CSVファイルをアップロード、またはSupabaseから取得
3. 「キーワード生成を開始」をクリック

CSVフォーマット:
```csv
hs_code,description_ja,description_en
854160,集積回路,Electronic integrated circuits
950300,その他のおもちゃ,Other toys
```

## 📂 ファイル構成

### 新規作成ファイル

```
/database/schema/
  hs_keywords.sql                              # データベーススキーマ

/lib/services/hts/
  HSKeywordGeneratorService.ts                 # キーワード生成サービス

/app/api/
  hts/keywords/[hts_code]/route.ts            # キーワードルックアップAPI
  admin/generate-hs-keywords/route.ts         # キーワード生成API

/app/admin/
  hs-keyword-generator/page.tsx               # 管理者UIページ

/components/
  HSKeywordDisplay.tsx                         # キーワード表示コンポーネント
```

### 変更ファイル

```
/components/layout/
  SidebarConfig.ts                             # 「HSキーワード生成」を追加

/components/
  HTSClassificationModal.tsx                   # キーワード表示統合
```

## 🔌 API仕様

### 1. キーワードルックアップAPI

**エンドポイント:** `GET /api/hts/keywords/[hts_code]`

**用途:** データ編集UIでHTSコード入力時にキーワードを取得

**リクエスト:**
```
GET /api/hts/keywords/854160
```

**レスポンス:**
```json
{
  "hts_code": "854160",
  "keywords_ja": ["集積回路", "IC", "半導体", "電子部品"],
  "keywords_en": ["integrated circuit", "ic", "semiconductor", "electronic component"],
  "total": 8,
  "breakdown": {
    "japanese": 4,
    "english": 4
  }
}
```

### 2. キーワード一括生成API

**エンドポイント:** `POST /api/admin/generate-hs-keywords`

**用途:** 管理者UIから複数のHTSコードに対してキーワードを一括生成

**リクエスト:**
```json
{
  "hsCodes": [
    {
      "hs_code": "854160",
      "description_ja": "集積回路",
      "description_en": "Electronic integrated circuits"
    },
    {
      "hs_code": "950300",
      "description_ja": "その他のおもちゃ",
      "description_en": "Other toys"
    }
  ]
}
```

**レスポンス:**
```json
{
  "total": 2,
  "completed": 2,
  "succeeded": 2,
  "failed": 0,
  "errors": []
}
```

## 🎯 使い方

### 管理者: キーワード一括生成

1. サイドバー「システム管理」→「HSキーワード生成」にアクセス
2. データソースを選択:
   - CSVアップロード
   - Supabaseから取得
   - 手動入力（JSON）
3. 「キーワード生成を開始」をクリック
4. Gemini APIが各HTSコードに対して10-20個のキーワードを生成
5. 結果が自動的にデータベースに保存

### ユーザー: データ編集時のキーワード活用

1. `/tools/editing` でデータ編集画面を開く
2. HTSコードを入力または選択
3. 「関連キーワード」セクションに自動的にキーワードが表示される
4. キーワードを参考にして、より正確なHTS分類を行う

## ⚙️ 設定

### Gemini API設定

- **モデル**: `gemini-2.5-flash-preview-09-2025`
- **同時実行数**: 5リクエスト
- **レート制限ディレイ**: 2秒（指数バックオフ）
- **最大リトライ回数**: 3回

### システム命令（System Instruction）

```
You are an expert international trade and customs classification specialist.
Your task is to generate a comprehensive list of search keywords for a given
6-digit Harmonized System (HS) code description. These keywords must be highly
relevant for identifying goods in real-world shipping documents and commercial invoices.

Generate 10 to 20 keywords in Japanese.
Generate 10 to 20 keywords in English.

Keywords must include common synonyms, specific product types, components,
and typical industry jargon related to the classification.

The output must be a single JSON object conforming to the provided schema.
```

## 🐛 トラブルシューティング

### キーワードが表示されない

1. Supabaseでテーブルが作成されているか確認
2. 該当のHTSコードのキーワードが生成されているか確認（管理画面で再生成）
3. ブラウザのコンソールでエラーを確認

### Gemini APIエラー

1. `GEMINI_API_KEY` が正しく設定されているか確認
2. Gemini APIのクォータ制限を確認
3. レート制限エラーの場合は自動リトライが実行される

### データベースエラー

1. Supabaseの接続情報を確認
2. テーブルのスキーマが正しいか確認
3. ユニーク制約違反の場合は既存データを確認

## 📊 パフォーマンス

- **処理速度**: 約5並列で実行、100件あたり約2-3分
- **コスト**: Gemini 2.5 Flash は非常に安価（100万トークンあたり$0.075）
- **精度**: 実際の貿易書類に使用される専門用語を網羅

## 🔐 セキュリティ

- Gemini API Keyは環境変数で管理
- 管理者UIは `/admin/` 配下に配置（認証が必要な場合は追加実装）
- APIエンドポイントは適切なエラーハンドリングを実装

## 🚀 今後の拡張

- [ ] バッチ処理のジョブキュー化（Redis/BullMQ）
- [ ] リアルタイム進捗表示（WebSocket/SSE）
- [ ] キーワードの手動編集機能
- [ ] キーワードの利用統計・分析
- [ ] 他のLLMモデル対応（Claude, GPT-4など）

## 📝 ライセンス

MIT License

---

**作成日**: 2025-11-22
**バージョン**: 1.0.0
**開発者**: AKI-NANA Development Team
