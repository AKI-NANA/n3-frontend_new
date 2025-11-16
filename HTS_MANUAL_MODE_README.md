# HTS判別システム - 完全手動運用版（外部API課金¥0）

## 📋 概要

**外部API課金を完全に回避**しながら、無料AIサービスで生成したデータを活用してHTSコード分類を行うシステムです。

### 主要機能

1. **完全手動運用**
   - ❌ 外部LLM API呼び出しなし
   - ✅ ユーザーが無料AIで生成したデータを貼り付け
   - ✅ コスト: **¥0**

2. **5つの新規フィールド**
   - `hts_code` - HTSコード
   - `origin_country` - 原産国
   - `material` - 素材
   - `rewritten_english_title` - リライト英語タイトル
   - `market_research_summary` - 市場調査サマリー

3. **データベース検索**
   - Supabase全文検索
   - 関連度スコア計算
   - 上位10件候補表示

## 🔧 セットアップ

### 1. データベースマイグレーション実行

Supabase SQL Editorで実行:

```sql
-- /database/migrations/003_add_tariff_data.sql の内容を実行
```

### 2. サーバー起動

```bash
npm run dev
```

### 3. 動作確認

```bash
# ヘルスチェック
curl http://localhost:3000/api/products/hts-lookup

# テスト
curl -X POST http://localhost:3000/api/products/hts-lookup \
  -H "Content-Type: application/json" \
  -d '{"keywords":"trading cards, game cards, collectible, paper"}'
```

## 📖 使い方ガイド

### ステップ1: 無料AIでキーワード生成

無料AIサービス（Gemini, ChatGPT, Claude）を使用:

**プロンプト例:**
```
この商品のHTS分類に最適な英語キーワードを3-7個、カンマ区切りで生成してください。

商品タイトル: ポケモンカード リザードン PSA10 グレード
素材: Card Stock

キーワードは以下の要素を含めてください:
- 商品カテゴリ
- 素材・材質
- 用途
- 関連する業界用語
```

**AI回答例:**
```
trading cards, game cards, collectible, paper, graded
```

### ステップ2: N3アプリで検索

1. `/tools/editing` で商品をクリック
2. 「編集」タブに移動
3. 生成されたキーワードを「推論用キーワード」欄に貼り付け
4. 「🔍 HTS候補を検索」ボタンをクリック

### ステップ3: HTS候補から選択

- 関連度スコアの高い候補が表示されます
- クリックして選択
- 自動的にフォームに入力されます

### ステップ4: 追加情報を入力

**原産国・素材を入力:**
```
原産国: JP
素材: Card Stock
```

**オプション: リライトタイトル:**

無料AIに依頼:
```
この商品タイトルをSEO最適化された英語タイトルにリライトしてください:
ポケモンカード リザードン PSA10

要件:
- 最大80文字
- eBay/Shopee/Shopifyで使える汎用性
- SEOキーワードを自然に含める
```

**オプション: 市場調査サマリー:**

無料AIに依頼:
```
この商品の市場調査を行い、以下の情報をサマリーしてください:

商品: ポケモンカード リザードン PSA10
価格: $150

調査内容:
1. eBayでの競合商品数と価格帯
2. 需要トレンド
3. 推奨販売価格
4. 差別化ポイント
```

### ステップ5: 保存

「💾 全ての情報を保存」ボタンをクリック

## 🎯 サンプルワークフロー

### 例: ポケモンカード

#### 1. 商品情報
```
タイトル: ポケモンカード リザードン VMAX PSA10
価格: ¥150,000
```

#### 2. 無料AI（Gemini）でキーワード生成

**プロンプト:**
```
この商品のHTS分類に最適な英語キーワードを生成:
ポケモンカード リザードン VMAX PSA10 グレード品
素材: 紙（カードストック）とプラスチックスリーブ
```

**Gemini回答:**
```
trading cards, game cards, collectible, paper, graded, pokemon
```

#### 3. N3で検索 → 結果

```
✅ 10件のHTS候補が見つかりました

1. 9504.90.3000 - Video game consoles and machines (関連度: 180)
2. 9504.40.0000 - Playing cards (関連度: 165)
...
```

#### 4. 9504.90.3000 を選択

```
HTSコード: 9504.90.3000
関税率: Free
```

#### 5. 原産国・素材を入力

```
原産国: JP
素材: Graded Card Stock and Plastic Sleeve
```

#### 6. リライトタイトル（オプション）

**無料AI（ChatGPT）に依頼:**
```
SEO最適化英語タイトル作成:
ポケモンカード リザードン VMAX PSA10
```

**ChatGPT回答:**
```
Pokemon Card Charizard VMAX PSA 10 Graded TCG Collectible
```

#### 7. 市場調査（オプション）

**無料AI（Claude）に依頼:**
```
市場調査サマリー:
商品: Pokemon Card Charizard VMAX PSA 10
価格: $1,000
```

**Claude回答:**
```
- eBay競合: 約50件、価格帯$800-$1,500
- 平均落札価格: $1,100
- 需要: 高（月間検索500回以上）
- 推奨価格: $1,050-$1,200
- 差別化: PSA10グレードは希少性高
```

#### 8. 保存完了

```
✅ 全ての情報を保存しました
```

## 📊 コスト比較

| 方式 | 1商品 | 100商品 | 1000商品 |
|------|-------|---------|----------|
| Claude API | ¥7.5 | ¥750 | ¥7,500 |
| Gemini API | ¥0.45 | ¥45 | ¥450 |
| **手動運用版** | **¥0** | **¥0** | **¥0** |

**コスト削減率**: 100%

## 🔍 トラブルシューティング

### HTS候補が見つからない

**原因**: キーワードが適切でない

**解決策**:
1. より一般的なカテゴリ名を使用
   - ❌ "Charizard" → ✅ "trading cards"
2. キーワード数を増やす（3-7個推奨）
3. 英語キーワードを使用

### 関連度スコアが低い

**原因**: キーワードがHTSデータベースの説明文と一致していない

**解決策**:
1. HTS用語を使用
   - 例: "game cards" → "playing cards"
2. 素材や用途を追加
   - 例: "paper, collectible, entertainment"

### サンプルキーワードが生成されない

**原因**: 商品タイトルに特定のキーワードが含まれていない

**解決策**:
1. 手動でキーワードを入力
2. 無料AIに依頼してキーワード生成

## 🚀 推奨無料AIサービス

### 1. Google Gemini（推奨）
- URL: https://gemini.google.com/
- 特徴: 無料、高精度、日本語対応

### 2. ChatGPT（OpenAI）
- URL: https://chat.openai.com/
- 特徴: GPT-3.5は無料、使いやすい

### 3. Claude（Anthropic）
- URL: https://claude.ai/
- 特徴: 長文処理に強い、無料枠あり

## 📁 ファイル構造

```
n3-frontend_new/
├── lib/
│   └── tariffService.ts              # 手動運用版サービス層
├── app/api/products/
│   ├── hts-lookup/
│   │   └── route.ts                  # HTS検索API
│   └── update/
│       └── route.ts                  # 商品更新API（既存）
├── components/ProductModal/
│   └── components/Tabs/
│       └── TabEditing.tsx            # 手動運用版UI
├── database/migrations/
│   └── 003_add_tariff_data.sql       # 5フィールド追加
└── types/
    └── product.ts                    # 型定義
```

## ✅ チェックリスト

- [ ] DBマイグレーション実行完了
- [ ] サーバー起動確認
- [ ] ヘルスチェックAPI確認
- [ ] 無料AIアカウント作成（Gemini/ChatGPT/Claude）
- [ ] テストキーワード生成
- [ ] UIで商品モーダル → 編集タブ確認
- [ ] HTS候補検索動作確認
- [ ] 保存機能動作確認

## 💡 Tips

### キーワード生成のコツ

1. **カテゴリ重視**: 商品カテゴリを最初に記載
2. **素材追加**: 素材情報は関税率に影響
3. **用途明記**: ゲーム/おもちゃ/衣料品など
4. **業界用語**: HTS分類で使われる専門用語

### AIプロンプトテンプレート

```
この商品のHTS分類用キーワードを生成:

商品情報:
- タイトル: {商品タイトル}
- 素材: {素材}
- カテゴリ: {カテゴリ}

要件:
- 英語キーワード
- カンマ区切り
- 3-7個
- HTS分類に使われる用語を優先
```

## 📞 サポート

- Supabase: https://supabase.com/docs
- Google Gemini: https://ai.google.dev/
- ChatGPT: https://help.openai.com/
- Claude: https://support.anthropic.com/

---

**実装完了日**: 2025-01-14  
**Status**: ✅ 実装完了  
**コスト**: **¥0** (完全無料)  
**方式**: 手動運用（外部API課金なし）
