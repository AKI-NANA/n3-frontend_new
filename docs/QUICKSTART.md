# 🚀 Geminiツール変換 - クイックスタートガイド

このガイドに従えば、**5分でツール変換を開始**できます。

---

## ⚡ 最速手順（3ステップ）

### ステップ1: 元ファイルを開く

```bash
# Macターミナルで実行
open /Users/aritahiroaki/n3-frontend_new/src/utils/
```

変換したいファイルをテキストエディタで開いて**全文コピー**

---

### ステップ2: Geminiに依頼

1. **Gemini**を開く: https://gemini.google.com/
2. 以下のテンプレートをコピー:

```
以下のファイルをNext.js 14の`app/tools/ai-radio-generator/page.tsx`に変換してください。

【元ファイル】
[ここに元ファイルの全文を貼り付け]

【変換要件】
✅ 'use client'を追加
✅ HTMLをReactに変換
✅ shadcn/ui（Card, Button, Input）を使用
✅ Tailwind CSSのみ使用（<style>タグは削除）
✅ Firebase → Supabase
✅ onclick → onClick
✅ document.getElementById → useState

【UIデザイン】
- コンテナ: max-w-4xl、中央配置
- カード形式のレイアウト
- ボタン: 全幅、disabled対応
- エラー表示: 赤文字

【出力形式】
完全なpage.tsxのコードを出力してください。
```

3. `[ここに元ファイルの全文を貼り付け]` の部分に**コピーしたファイル内容を貼り付け**
4. **送信**

---

### ステップ3: コードを保存

1. Geminiの返答から`page.tsx`のコードをコピー
2. 以下のコマンドで保存:

```bash
# ディレクトリ作成
mkdir -p /Users/aritahiroaki/n3-frontend_new/app/tools/ai-radio-generator

# ファイル作成（VSCodeで開く）
code /Users/aritahiroaki/n3-frontend_new/app/tools/ai-radio-generator/page.tsx
```

3. コードを貼り付けて保存

---

## ✅ 動作確認

ブラウザで開く:
```
http://localhost:3000/tools/ai-radio-generator
```

エラーが出た場合は、エラーメッセージをGeminiに送って修正依頼:
```
以下のエラーが出ました。修正してください:

[エラーメッセージ]
```

---

## 📝 ツール別の具体例

### 🎙️ AIラジオ生成器

**元ファイル**: `src/utils/AIラジオ風コンテンツジェネレーター`
**保存先**: `app/tools/ai-radio-generator/page.tsx`
**URL**: `/tools/ai-radio-generator`

**特記事項**:
- Gemini API使用（環境変数が必要）
- PCM→WAV変換ロジックを維持

---

### 🛒 BUYMA仕入れシミュレーター

**元ファイル**: `src/utils/BUYMA無在庫仕入れ戦略シミュレーター (修正版)`
**保存先**: `app/tools/buyma-simulator/page.tsx`
**URL**: `/tools/buyma-simulator`

**特記事項**:
- 計算ロジックを完全に維持
- Supabaseテーブル作成が必要:

```sql
CREATE TABLE buyma_simulations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  product_name TEXT,
  purchase_price NUMERIC,
  selling_price NUMERIC,
  profit_amount NUMERIC,
  profit_rate NUMERIC,
  risk_score NUMERIC,
  memo TEXT
);
```

---

### 💰 業務委託支払い管理

**元ファイル**: `src/utils/業務委託支払い管理システム（ロール分離`
**保存先**: `app/tools/contractor-payment/page.tsx`
**URL**: `/tools/contractor-payment`

**特記事項**:
- Firebase → Supabaseに完全移行
- 3つのテーブルが必要（task_rates, work_entries, contractors）
- RLS（Row Level Security）設定が必要

---

### 📦 古物買取管理

**元ファイル**: `src/utils/古物買取・在庫進捗管理システム`
**保存先**: `app/tools/kobutsu-management/page.tsx`
**URL**: `/tools/kobutsu-management`

**特記事項**:
- 画像アップロード機能あり（Supabase Storage）
- ステータス管理（査定中→買取済→在庫中→出品済→売却済）

---

### 🎯 刈り取り自動選定

**元ファイル**: `src/utils/刈り取り自動選定＆自動購入プロトタイプ`
**保存先**: `app/tools/arbitrage-selector/page.tsx`
**URL**: `/tools/arbitrage-selector`

**特記事項**:
- 価格監視ロジック
- 利益計算機能
- 自動購入機能（オプション）

---

## 🔧 よくある質問

### Q1: Geminiの返答が途中で切れた
```
続きを出力してください
```
と送信

### Q2: エラーが出た
```
以下のエラーが出ました。修正してください:

[エラーメッセージをコピペ]
```

### Q3: 機能を追加したい
```
以下の機能を追加してください:
- XXX機能
- YYY機能

現在のコード:
[コードをコピペ]
```

### Q4: デザインを変更したい
```
以下のようにデザインを変更してください:
- ボタンを青色にする
- カードを3列表示にする

現在のコード:
[コードをコピペ]
```

---

## 📊 変換の優先順位

### 🔥 最優先（ビジネス直結）
1. ✅ BUYMA仕入れシミュレーター
2. ✅ 古物買取管理
3. ✅ 刈り取り自動選定

### ⚡ 優先度高（便利ツール）
4. ✅ AIラジオ生成器
5. ✅ 業務委託支払い管理
6. ✅ コンテンツ自動化

### 📝 優先度中（あると便利）
7. ✅ 統合パーソナル管理
8. ✅ 製品主導型仕入れ
9. ✅ 楽天せどりツール

### 🏥 優先度低（個人用）
10. ✅ 健康管理系ツール

---

## ⚙️ 環境変数の設定

一部のツールは環境変数が必要です。`.env.local`に追加:

```bash
# Gemini API（AIラジオ生成器で使用）
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here

# Supabase（全ツール共通）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🎯 完了後の確認リスト

各ツール変換後、以下を確認:

- [ ] ツールが正常に表示される
- [ ] エラーがコンソールに出ない
- [ ] ボタンが動作する
- [ ] データの保存・読み込みが動作する（該当する場合）
- [ ] レスポンシブデザインが機能する
- [ ] `SidebarConfig.ts`のstatusを`"ready"`に変更

---

## 🚀 さあ始めよう！

1. **最も必要なツール**を1つ選ぶ
2. **上記のステップ1-3**を実行
3. **動作確認**
4. 次のツールへ

詳細は以下のドキュメントを参照:
- `docs/gemini-tool-conversion-instruction.md` - 完全な変換ルール
- `docs/gemini-conversion-templates.md` - コピペ用テンプレート集

---

## 💪 頑張ってください！

全ツールの変換が完了すれば、`src/utils`の全機能がモダンなNext.js 14ツールとして使えるようになります！
