# 🤖 Geminiへの変換依頼テンプレート集

このファイルには、`src/utils`の各ツールをGeminiに変換依頼する際の**コピペ用テンプレート**が含まれています。

---

## 📋 使い方

1. 下記のテンプレートをコピー
2. `[ファイル内容]` の部分に元ファイルの全文を貼り付け
3. Geminiに送信
4. 返ってきたコードを `app/tools/[tool-name]/page.tsx` に保存

---

## 🎯 優先度1: 最優先ツール

### 1. AIラジオ風コンテンツジェネレーター

```
以下のHTMLファイルをNext.js 14の`app/tools/ai-radio-generator/page.tsx`に変換してください。

【元ファイル】
[src/utils/AIラジオ風コンテンツジェネレーター の全文をここに貼り付け]

【変換要件】
✅ 'use client'ディレクティブを追加
✅ HTMLタグを全てReactコンポーネントに変換
✅ Tailwind CDNを削除し、Tailwind CSSクラスのみ使用
✅ shadcn/uiコンポーネント（Card, Button, Input, Textarea）を使用
✅ <style>タグ内のCSSを削除し、Tailwindクラスに置き換え
✅ onclick → onClick、id属性 → useState、document.getElementById → useState
✅ Gemini API呼び出しは維持（環境変数 process.env.NEXT_PUBLIC_GEMINI_API_KEY を使用）
✅ PCM→WAV変換ロジックは維持
✅ base64デコード機能は維持

【UIデザイン】
- コンテナ: max-w-4xl、中央配置
- ヘッダー: h1タイトル + 説明文
- カード: 台本入力エリア（Textarea、8行）
- ボタン: 全幅、disabled状態対応
- 結果: audio要素 + ダウンロードリンク
- エラー表示: 赤文字、下部に表示

【出力形式】
完全な`page.tsx`のコードを出力してください。
- TypeScript型定義を含める
- エラーハンドリングを含める
- ローディング状態を含める
- コメントは最小限に

【参考】
docs/gemini-tool-conversion-instruction.md の「テンプレート1」を参照
```

---

### 2. BUYMA無在庫仕入れ戦略シミュレーター

```
以下のファイルをNext.js 14の`app/tools/buyma-simulator/page.tsx`に変換してください。

【元ファイル】
[src/utils/BUYMA無在庫仕入れ戦略シミュレーター (修正版) の全文をここに貼り付け]

【変換要件】
✅ 'use client'ディレクティブを追加
✅ 全てのHTMLをReactコンポーネントに変換
✅ shadcn/uiコンポーネント（Card, Button, Input, Table, Badge）を使用
✅ Firebase → Supabaseに変換（データ保存機能）
✅ 計算ロジック（利益率、在庫リスク、競合分析）は完全に維持
✅ グラフ表示は一旦削除（後で追加可能）
✅ 結果テーブルは shadcn/ui の Table コンポーネントを使用

【UIデザイン】
- 左カラム: 入力フォーム（仕入れ価格、販売価格、送料、為替レート等）
- 右カラム: 計算結果（利益額、利益率、リスクスコア）
- 下部: 保存済みシミュレーション一覧（Table）

【Supabaseテーブル設計】
テーブル名: buyma_simulations
カラム:
- id: bigint (primary key)
- created_at: timestamp
- product_name: text
- purchase_price: numeric
- selling_price: numeric
- profit_amount: numeric
- profit_rate: numeric
- risk_score: numeric
- memo: text

【出力形式】
1. 完全な`page.tsx`のコード
2. Supabaseテーブル作成SQL
3. 使用した型定義

【参考】
docs/gemini-tool-conversion-instruction.md の「テンプレート2」を参照
```

---

### 3. 業務委託支払い管理システム

```
以下のReactファイルをNext.js 14の`app/tools/contractor-payment/page.tsx`に変換してください。

【元ファイル】
[src/utils/業務委託支払い管理システム（ロール分離 の全文をここに貼り付け]

【変換要件】
✅ 'use client'ディレクティブを追加
✅ Firebase → Supabaseに完全移行
✅ 認証: Firebase Auth → Supabase Auth
✅ データ: Firestore → Supabase PostgreSQL
✅ ロール分離機能を維持（Manager/Contractor）
✅ shadcn/uiコンポーネント（Card, Button, Input, Table, Tabs, Select）を使用
✅ リアルタイム更新: onSnapshot → Supabase Realtime

【UIデザイン】
- タブ: 管理者モード / 外注先モード
- 管理者画面:
  - 単価設定テーブル
  - 外注先選択ドロップダウン
  - 業務報告一覧
  - 支払い承認ボタン
- 外注先画面:
  - 業務報告入力フォーム
  - 自分の報告履歴一覧

【Supabaseテーブル設計】
1. task_rates (単価マスタ)
   - id, task_name, unit_price, unit, created_at

2. work_entries (業務報告)
   - id, contractor_id, task_id, quantity, total_amount, status, date, memo, created_at

3. contractors (外注先マスタ)
   - id, name, email, created_at

【Supabase RLS (Row Level Security)】
- contractors: 自分のデータのみ閲覧・編集可能
- task_rates: 全員閲覧可、管理者のみ編集可
- work_entries: 自分のデータのみ編集可、管理者は全て閲覧可

【出力形式】
1. 完全な`page.tsx`のコード
2. Supabaseテーブル作成SQL（RLS含む）
3. Supabase Auth設定手順

【参考】
docs/gemini-tool-conversion-instruction.md の「テンプレート2」を参照
```

---

### 4. 古物買取・在庫進捗管理システム

```
以下のファイルをNext.js 14の`app/tools/kobutsu-management/page.tsx`に変換してください。

【元ファイル】
[src/utils/古物買取・在庫進捗管理システム の全文をここに貼り付け]

【変換要件】
✅ 'use client'ディレクティブを追加
✅ Firebase → Supabaseに変換
✅ shadcn/uiコンポーネント（Card, Button, Input, Table, Badge, Select, Dialog）を使用
✅ ステータス管理（査定中、買取済、在庫中、出品済、売却済）を維持
✅ 写真アップロード機能: Supabase Storageを使用
✅ 利益計算機能を維持

【UIデザイン】
- ヘッダー: フィルター（ステータス別）
- メイン: カード形式の商品一覧
- 各カード: 商品画像、名前、ステータスバッジ、買取価格、販売価格、利益
- モーダル: 商品詳細編集フォーム

【Supabaseテーブル設計】
テーブル名: kobutsu_items
カラム:
- id: bigint (primary key)
- created_at: timestamp
- product_name: text
- purchase_price: numeric
- selling_price: numeric
- profit: numeric
- status: text (enum: 査定中/買取済/在庫中/出品済/売却済)
- image_url: text
- memo: text
- purchased_at: date
- sold_at: date

【Supabase Storage】
バケット名: kobutsu-images
アクセス: public

【出力形式】
1. 完全な`page.tsx`のコード
2. Supabaseテーブル作成SQL
3. Supabase Storage設定手順

【参考】
docs/gemini-tool-conversion-instruction.md の「テンプレート2」を参照
```

---

### 5. 刈り取り自動選定＆自動購入プロトタイプ

```
以下のファイルをNext.js 14の`app/tools/arbitrage-selector/page.tsx`に変換してください。

【元ファイル】
[src/utils/刈り取り自動選定＆自動購入プロトタイプ の全文をここに貼り付け]

【変換要件】
✅ 'use client'ディレクティブを追加
✅ shadcn/uiコンポーネント（Card, Button, Input, Table, Badge）を使用
✅ 価格監視ロジックを維持
✅ 利益計算ロジックを維持
✅ 条件フィルター機能を維持
✅ データ保存: Supabaseを使用

【UIデザイン】
- 設定エリア: 監視条件（最低利益率、価格範囲等）
- 候補一覧: テーブル形式（商品名、現在価格、販売予想価格、利益、アクション）
- ステータス表示: 監視中商品数、候補数、購入済み数

【Supabaseテーブル設計】
1. arbitrage_settings (監視設定)
   - id, min_profit_rate, min_price, max_price, keywords, created_at

2. arbitrage_candidates (候補商品)
   - id, product_name, current_price, expected_price, profit_rate, url, status, created_at

【出力形式】
1. 完全な`page.tsx`のコード
2. Supabaseテーブル作成SQL
3. 使用した型定義

【参考】
docs/gemini-tool-conversion-instruction.md の「テンプレート1」を参照
```

---

## 🎯 優先度2: その他ツール

### 6. コンテンツ自動化コントロールパネル

```
以下のファイルをNext.js 14の`app/tools/content-automation/page.tsx`に変換してください。

【元ファイル】
[src/utils/コンテンツ自動化コントロールパネル の全文をここに貼り付け]

【変換要件】
✅ 変換ルールは上記と同様
✅ shadcn/uiコンポーネントを使用
✅ Supabaseでデータ管理

【出力形式】
完全な`page.tsx`のコードを出力してください。
```

### 7. 統合パーソナルマネジメントダッシュボード

```
以下のファイルをNext.js 14の`app/tools/personal-management/page.tsx`に変換してください。

【元ファイル】
[src/utils/統合パーソナルマネジメントダッシュボード の全文をここに貼り付け]

【変換要件】
✅ 変換ルールは上記と同様
✅ shadcn/uiコンポーネントを使用
✅ Supabaseでデータ管理

【出力形式】
完全な`page.tsx`のコードを出力してください。
```

### 8. 製品主導型仕入れ管理システム

```
以下のファイルをNext.js 14の`app/tools/product-sourcing/page.tsx`に変換してください。

【元ファイル】
[src/utils/製品主導型仕入れ管理システム の全文をここに貼り付け]

【変換要件】
✅ 変換ルールは上記と同様
✅ shadcn/uiコンポーネントを使用
✅ Supabaseでデータ管理

【出力形式】
完全な`page.tsx`のコードを出力してください。
```

### 9. 楽天せどり_SP-API模擬ツール

```
以下のファイルをNext.js 14の`app/tools/rakuten-arbitrage/page.tsx`に変換してください。

【元ファイル】
[src/utils/楽天せどり_SP-API模擬ツール の全文をここに貼り付け]

【変換要件】
✅ 変換ルールは上記と同様
✅ shadcn/uiコンポーネントを使用
✅ Supabaseでデータ管理
✅ 楽天API連携ロジックを維持

【出力形式】
完全な`page.tsx`のコードを出力してください。
```

---

## 🔄 変換後の作業フロー

### ステップ1: Geminiに依頼
1. 上記テンプレートをコピー
2. 元ファイルの内容を貼り付け
3. Geminiに送信

### ステップ2: コードの保存
```bash
# Macターミナルで実行
mkdir -p /Users/aritahiroaki/n3-frontend_new/app/tools/[tool-name]
```

返ってきたコードを `app/tools/[tool-name]/page.tsx` に保存

### ステップ3: 動作確認
```
http://localhost:3000/tools/[tool-name]
```
ブラウザで開いて動作確認

### ステップ4: サイドバー更新
`components/layout/SidebarConfig.ts` で該当ツールのstatusを `"ready"` に変更:

```typescript
{ text: "ツール名", link: "/tools/tool-name", icon: "icon-name", status: "ready", priority: 1 },
```

### ステップ5: Supabaseテーブル作成
返ってきたSQLをSupabase SQL Editorで実行

---

## 💡 Tips

### Geminiからの返答が途中で切れた場合
```
続きを出力してください。
```

### エラーが出た場合
```
以下のエラーが発生しました。修正してください。

【エラー内容】
[エラーメッセージをコピー]

【現在のコード】
[問題のあるコードをコピー]
```

### 機能を追加したい場合
```
以下の機能を追加してください:
1. XXX機能
2. YYY機能

【現在のコード】
[既存のコードをコピー]
```

---

## 📊 進捗管理

変換したツールにチェックを入れてください:

### 優先度1
- [ ] AIラジオ風コンテンツジェネレーター
- [ ] BUYMA無在庫仕入れ戦略シミュレーター
- [ ] 業務委託支払い管理システム
- [ ] 古物買取・在庫進捗管理システム
- [ ] 刈り取り自動選定＆自動購入プロトタイプ

### 優先度2
- [ ] コンテンツ自動化コントロールパネル
- [ ] 統合パーソナルマネジメントダッシュボード
- [ ] 製品主導型仕入れ管理システム
- [ ] 楽天せどり_SP-API模擬ツール

### 優先度3（健康管理系）
- [ ] パーソナル予防医療プラットフォーム
- [ ] 健康生活サポートシステム
- [ ] 健康管理システム
- [ ] 精神と睡眠管理
- [ ] 栄養・献立管理

---

## 🎉 完了！

全ツールの変換が完了したら、`src/utils`ディレクトリをアーカイブできます:

```bash
mkdir -p /Users/aritahiroaki/n3-frontend_new/archive/gemini-original
mv /Users/aritahiroaki/n3-frontend_new/src/utils/* /Users/aritahiroaki/n3-frontend_new/archive/gemini-original/
```
