# HTS判別システム - ハイブリッドLLM対応

## 📋 概要

商品タイトルと素材情報から **HTSコードを自動推論** し、正確な関税計算を可能にするシステムです。

### 主要機能

1. **ハイブリッドLLM対応**
   - Gemini API または Claude API を使用
   - 環境変数で自動切り替え
   - フォールバックモード搭載

2. **HTS推論**
   - LLMによるキーワード生成
   - Supabase全文検索
   - 関連度スコア付き候補リスト

3. **UI統合**
   - 商品モーダルの編集タブ
   - ワンクリックでHTS候補表示
   - クリック選択で入力

## 🔧 セットアップ

### 1. 必要なパッケージのインストール

```bash
# Gemini APIを使う場合
npm install @google/generative-ai

# Claude APIを使う場合
npm install @anthropic-ai/sdk

# 両方インストールしても可
npm install @google/generative-ai @anthropic-ai/sdk
```

### 2. 環境変数の設定

`.env.local`に以下のいずれかを追加:

```bash
# オプション1: Gemini API（推奨 - 無料枠あり）
GEMINI_API_KEY=your_gemini_api_key_here

# オプション2: Claude API
ANTHROPIC_API_KEY=your_claude_api_key_here
```

**優先順位**: Gemini > Claude > Fallback Mode

### 3. データベースマイグレーション実行

Supabase SQL Editorで実行:

```sql
-- /database/migrations/add_hts_fields.sql の内容を実行
```

### 4. サーバー起動

```bash
npm run dev
```

## 📡 API使用方法

### HTS推論API

```typescript
const response = await fetch('/api/products/hts-lookup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productTitle: 'Pokemon Trading Card Charizard PSA 10',
    material: 'Card Stock'  // オプション
  })
})

const data = await response.json()

if (data.success) {
  console.log('HTS候補:', data.data.candidates)
  console.log('使用AI:', data.data.llmProvider.providerName)
  // → "Google Gemini" または "Anthropic Claude" または "None (Fallback Mode)"
}
```

### レスポンス例

```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "hts_number": "9504.90.3000",
        "heading_description": "Video game consoles and machines",
        "subheading_description": "Other",
        "detail_description": "Trading cards",
        "description_ja": "トレーディングカード",
        "general_rate_of_duty": "Free",
        "special_rate_of_duty": "Free",
        "relevance_score": 120
      },
      ...
    ],
    "count": 10,
    "llmProvider": {
      "provider": "gemini",
      "available": true,
      "providerName": "Google Gemini"
    }
  }
}
```

## 🎨 UI使用方法

### 1. 商品モーダルを開く

`/tools/editing` ページで商品をクリック

### 2. 「編集」タブに移動

新しく追加された「TabEditing」が表示されます

### 3. 素材・原産国を入力（オプション）

- **素材**: 例: Cotton, Plastic, Metal
- **原産国**: 例: JP, CN, US（ISO 3166-1 alpha-2コード）

### 4. 「🤖 HTS候補を推論」ボタンをクリック

LLMが商品タイトルと素材からHTSコードを推論します

### 5. 候補リストから選択

関連度の高い順に表示される候補をクリックして選択

### 6. 「💾 HTS情報を保存」をクリック

Supabaseに保存されます

## 🧪 テスト

### ヘルスチェック

```bash
curl http://localhost:3000/api/products/hts-lookup
```

### HTS推論テスト

```bash
curl -X POST http://localhost:3000/api/products/hts-lookup \
  -H "Content-Type: application/json" \
  -d '{
    "productTitle": "Pokemon Card PSA 10 Charizard",
    "material": "Card Stock"
  }'
```

## 🔍 デバッグ

### LLMプロバイダー確認

```typescript
import { getLLMProviderInfo } from '@/lib/tariffService'

const info = getLLMProviderInfo()
console.log(info)
// → { provider: 'gemini', available: true, providerName: 'Google Gemini' }
```

### キーワード生成のみテスト

```typescript
import { generateHtsKeywords } from '@/lib/tariffService'

const keywords = await generateHtsKeywords(
  'ポケモンカード リザードン PSA10',
  'Card Stock'
)
console.log(keywords)
// → "trading cards, game cards, collectible, paper, graded"
```

### DB検索のみテスト

```typescript
import { lookupHtsCandidates } from '@/lib/tariffService'

const candidates = await lookupHtsCandidates('trading cards, game')
console.log(candidates)
```

## 📊 フォールバックモード

LLM APIキーが設定されていない場合、自動的にフォールバックモードに切り替わります:

1. **シンプルなキーワード抽出**
   - 商品タイトルから主要キーワードを抽出
   - 事前定義されたパターンマッチング

2. **データベース検索**
   - 抽出されたキーワードで全文検索
   - 関連度スコア計算

**精度**: LLMモード > フォールバックモード

## 🚀 本番環境への適用

### 環境変数の設定

Vercel / AWS / その他のホスティングサービスで環境変数を設定:

```bash
GEMINI_API_KEY=your_production_key
# または
ANTHROPIC_API_KEY=your_production_key
```

### APIキーの取得

- **Gemini API**: https://makersuite.google.com/app/apikey
- **Claude API**: https://console.anthropic.com/

### コスト見積もり

#### Gemini API（推奨）
- **無料枠**: 月60リクエスト/分
- **有料**: $0.00025/1Kトークン（入力）
- **推定コスト**: 1商品あたり約$0.001

#### Claude API
- **Claude 3.5 Sonnet**: $3/1Mトークン（入力）
- **推定コスト**: 1商品あたり約$0.003

#### フォールバック（無料）
- **コスト**: $0
- **精度**: 中程度

## 📁 ファイル構造

```
n3-frontend_new/
├── lib/
│   └── tariffService.ts              # ハイブリッドLLMサービス層
├── app/api/products/
│   ├── hts-lookup/
│   │   └── route.ts                  # HTS推論API
│   └── update/
│       └── route.ts                  # 商品更新API（既存）
├── components/ProductModal/
│   └── components/Tabs/
│       └── TabEditing.tsx            # HTS編集タブUI
├── database/migrations/
│   └── add_hts_fields.sql            # DBマイグレーション
└── types/
    └── product.ts                    # 型定義（既存）
```

## ✅ チェックリスト

- [ ] パッケージインストール完了
- [ ] 環境変数設定完了（GEMINI_API_KEY または ANTHROPIC_API_KEY）
- [ ] DBマイグレーション実行完了
- [ ] ヘルスチェックAPI確認
- [ ] HTS推論APIテスト実行
- [ ] UIで商品モーダル → 編集タブ確認
- [ ] HTS候補推論動作確認
- [ ] 保存機能動作確認

## 🐛 トラブルシューティング

### LLMが動作しない

```bash
# 環境変数を確認
echo $GEMINI_API_KEY
# または
echo $ANTHROPIC_API_KEY

# パッケージを確認
npm list @google/generative-ai
npm list @anthropic-ai/sdk
```

### HTS候補が見つからない

- 商品タイトルが英語でない場合、翻訳してから推論
- 素材フィールドを追加すると精度向上
- `v_hts_master_data`ビューにデータが存在するか確認

### 保存エラー

- `products_master`テーブルに`hts_code`カラムが存在するか確認
- マイグレーションSQLを再実行

## 📞 サポート

- Gemini API: https://ai.google.dev/docs
- Claude API: https://docs.anthropic.com/
- Supabase: https://supabase.com/docs

---

**実装完了日**: 2025-01-14  
**Status**: ✅ 実装完了  
**LLM対応**: Gemini API, Claude API, Fallback Mode
