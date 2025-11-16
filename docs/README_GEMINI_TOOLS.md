# 📚 Geminiツール変換ドキュメント - 完全ガイド

`src/utils`にあるGemini生成ツールをNext.js 14に変換するための完全ドキュメント集です。

---

## 🎯 今すぐ始める

### 【最速】5分でツール変換を開始
👉 **[QUICKSTART.md](./QUICKSTART.md)**

**こんな人におすすめ:**
- とにかく早くツールを使いたい
- 詳細は後で読みたい
- 具体的な手順だけ知りたい

**内容:**
- ⚡ 3ステップでツール変換
- 📝 ツール別の具体例
- 🔧 よくある質問と解決策

---

## 📖 完全マニュアル

### 【詳細】変換ルールとテンプレート集
👉 **[gemini-tool-conversion-instruction.md](./gemini-tool-conversion-instruction.md)**

**こんな人におすすめ:**
- 変換ルールを完全に理解したい
- カスタマイズしたい
- 品質の高いコードを生成したい

**内容:**
- 📋 変換対象ファイル一覧
- 📝 変換ルール（必須項目）
- 🎨 UIデザインガイドライン
- 🔄 変換テンプレート（シンプル版・Supabase版）
- ✅ 変換チェックリスト
- 🔧 トラブルシューティング

---

## 🤖 Geminiへの依頼テンプレート

### 【コピペ】すぐに使える依頼文
👉 **[gemini-conversion-templates.md](./gemini-conversion-templates.md)**

**こんな人におすすめ:**
- テンプレートをコピペしたい
- ツール別の依頼文を見たい
- 進捗管理したい

**内容:**
- 🎯 優先度1: 最優先5ツールの依頼文
- 📋 優先度2: その他ツールの依頼文
- 🔄 変換後の作業フロー
- 💡 Tips集（エラー対処、機能追加等）
- 📊 進捗管理チェックリスト

---

## 📊 ドキュメント構成

```
docs/
├── QUICKSTART.md                          # ⚡ 5分クイックスタート
├── gemini-tool-conversion-instruction.md  # 📖 完全マニュアル
├── gemini-conversion-templates.md         # 🤖 コピペ用テンプレート
└── README_GEMINI_TOOLS.md                 # 📚 このファイル
```

---

## 🎯 変換対象ツール一覧

### ✅ 優先度1: 最優先（ビジネス直結）

| No | ツール名 | 元ファイル | 保存先 | 状態 |
|----|---------|-----------|--------|------|
| 1 | AIラジオ生成器 | `AIラジオ風コンテンツジェネレーター` | `app/tools/ai-radio-generator/` | ⬜ 未着手 |
| 2 | BUYMA仕入れシミュレーター | `BUYMA無在庫仕入れ戦略シミュレーター` | `app/tools/buyma-simulator/` | ⬜ 未着手 |
| 3 | 業務委託支払い管理 | `業務委託支払い管理システム（ロール分離` | `app/tools/contractor-payment/` | ⬜ 未着手 |
| 4 | 古物買取管理 | `古物買取・在庫進捗管理システム` | `app/tools/kobutsu-management/` | ⬜ 未着手 |
| 5 | 刈り取り自動選定 | `刈り取り自動選定＆自動購入プロトタイプ` | `app/tools/arbitrage-selector/` | ⬜ 未着手 |

### ⚡ 優先度2: 便利ツール

| No | ツール名 | 元ファイル | 保存先 | 状態 |
|----|---------|-----------|--------|------|
| 6 | コンテンツ自動化 | `コンテンツ自動化コントロールパネル` | `app/tools/content-automation/` | ⬜ 未着手 |
| 7 | 統合パーソナル管理 | `統合パーソナルマネジメントダッシュボード` | `app/tools/personal-management/` | ⬜ 未着手 |
| 8 | 製品主導型仕入れ | `製品主導型仕入れ管理システム` | `app/tools/product-sourcing/` | ⬜ 未着手 |
| 9 | 楽天せどり | `楽天せどり_SP-API模擬ツール` | `app/tools/rakuten-arbitrage/` | ⬜ 未着手 |

### 📝 優先度3: あると便利

| No | ツール名 | 元ファイル | 保存先 | 状態 |
|----|---------|-----------|--------|------|
| 10 | 統合コンテンツ生成 | `Integrated_Content_Generator` | `app/tools/integrated-content/` | ⬜ 未着手 |
| 11 | 翻訳・翻案モジュール | `Translation_and_Adaptation_Module` | `app/tools/translation-module/` | ⬜ 未着手 |
| 12 | SNS自動投稿 | `sns_auto_post_generator.py` | `app/tools/sns-auto-post/` | ⬜ 未着手 |

### 🏥 優先度4: 個人用（健康管理系）

| No | ツール名 | 元ファイル | 保存先 | 状態 |
|----|---------|-----------|--------|------|
| 13 | 予防医療プラットフォーム | `パーソナル予防医療プラットフォーム` | `app/tools/preventive-health/` | ⬜ 未着手 |
| 14 | 健康生活サポート | `健康生活サポートシステム` | `app/tools/health-support/` | ⬜ 未着手 |
| 15 | 健康管理 | `健康管理` | `app/tools/health-management/` | ⬜ 未着手 |
| 16 | 精神と睡眠管理 | `精神と睡眠の統合ウェルビーイング計画` | `app/tools/mental-sleep/` | ⬜ 未着手 |
| 17 | 栄養・献立管理 | `栄養・献立統合管理アプリ` | `app/tools/nutrition-menu/` | ⬜ 未着手 |

---

## 🚀 推奨ワークフロー

### フェーズ1: 即戦力ツール（1-2日）
1. ✅ BUYMA仕入れシミュレーター → ビジネス利益に直結
2. ✅ 古物買取管理 → 在庫管理に必須
3. ✅ 刈り取り自動選定 → 仕入れ効率化

### フェーズ2: 業務効率化（2-3日）
4. ✅ 業務委託支払い管理 → 経理業務の自動化
5. ✅ AIラジオ生成器 → コンテンツ制作支援
6. ✅ コンテンツ自動化 → マーケティング自動化

### フェーズ3: 補完ツール（3-5日）
7. ✅ 統合パーソナル管理
8. ✅ 製品主導型仕入れ
9. ✅ 楽天せどり

### フェーズ4: その他（任意）
10. ✅ 健康管理系ツール等

---

## ⚙️ 必要な準備

### 1. Supabase設定

ほとんどのツールはSupabaseを使用します:

```bash
# .env.localに追加
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Gemini API（一部ツールのみ）

AIラジオ生成器など、Gemini APIを使用するツール:

```bash
# .env.localに追加
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 3. その他のAPI

ツールによって必要:
- 楽天API
- Yahoo!ショッピングAPI
- その他

---

## 🎓 学習リソース

### Next.js 14
- 公式ドキュメント: https://nextjs.org/docs
- App Router: https://nextjs.org/docs/app

### shadcn/ui
- 公式サイト: https://ui.shadcn.com/
- コンポーネント一覧: https://ui.shadcn.com/docs/components

### Supabase
- 公式ドキュメント: https://supabase.com/docs
- クイックスタート: https://supabase.com/docs/guides/getting-started

### Tailwind CSS
- 公式ドキュメント: https://tailwindcss.com/docs
- チートシート: https://nerdcave.com/tailwind-cheat-sheet

---

## 📞 サポート

### よくある質問
👉 [QUICKSTART.md](./QUICKSTART.md) の「よくある質問」セクション

### トラブルシューティング
👉 [gemini-tool-conversion-instruction.md](./gemini-tool-conversion-instruction.md) の「トラブルシューティング」セクション

### Geminiへの追加質問
変換中に不明点があれば、Geminiに直接質問:
```
以下の点について教えてください:
[質問内容]
```

---

## ✅ 完了後の整理

全ツール変換完了後:

```bash
# src/utilsをアーカイブ
mkdir -p /Users/aritahiroaki/n3-frontend_new/archive/gemini-original
mv /Users/aritahiroaki/n3-frontend_new/src/utils/* /Users/aritahiroaki/n3-frontend_new/archive/gemini-original/

# サイドバーのstatusを全て"ready"に更新
# components/layout/SidebarConfig.ts を編集
```

---

## 🎉 次のステップ

全ツール変換後:

1. ✅ 各ツールの動作確認
2. ✅ ユーザーテスト
3. ✅ バグ修正・改善
4. ✅ ドキュメント作成（各ツールの使い方）
5. ✅ 本番環境へのデプロイ

---

## 📈 進捗管理

このREADMEの「変換対象ツール一覧」の状態欄を更新:

- ⬜ 未着手
- 🚧 作業中
- ✅ 完了
- ❌ スキップ

---

## 💪 頑張ってください！

段階的に進めれば、全17ツールの変換も完了できます。焦らず、1つずつ確実に進めましょう！

**まずは [QUICKSTART.md](./QUICKSTART.md) から始めてください！**
