# eBay価格計算システム セットアップ完了ガイド

## ✅ 完了したこと

1. **Supabaseプロジェクト接続** ✅
   - プロジェクト: nagano3-db (zdzfpucdyxdlavkgrvil)
   - 環境変数ファイル `.env.local` を作成済み

2. **データベーススキーマ適用** ✅
   - `profit_margin_settings` テーブル作成 (12件)
   - `origin_countries` テーブル作成 (20件)
   - `ebay_exchange_rates` テーブル作成 (1件)
   - `ebay_calculation_history` テーブル作成
   - 既存のテーブルを確認:
     - `hs_codes` (8件)
     - `ebay_category_hs_mapping` (4件)
     - `ebay_pricing_category_fees` (16件)
     - `ebay_shipping_policies` (4件)
     - `ebay_shipping_zones` (24件)

3. **Reactコンポーネント作成** ✅
   - メインページ: `/app/ebay-pricing/page.tsx`
   - 7つのタブコンポーネント
   - カスタムフック: `use-ebay-pricing.ts`
   - サイドバー統合

## 🚀 次のステップ

### ステップ1: ディレクトリに移動

\`\`\`bash
cd ~/NAGANO-3/N3-Development/n3-frontend/original-php/yahoo_auction_complete/29_mole/japanese-marketplace
\`\`\`

### ステップ2: 依存関係をインストール（まだの場合）

\`\`\`bash
# Supabaseクライアントがインストールされているか確認
npm list @supabase/supabase-js

# インストールされていなければ
npm install @supabase/supabase-js
\`\`\`

### ステップ3: 開発サーバーを起動

\`\`\`bash
npm run dev
\`\`\`

### ステップ4: ブラウザで確認

1. http://localhost:3000 を開く
2. 左サイドバーの「eBay価格計算」をクリック
3. デフォルト値で「計算実行」ボタンをクリック
4. 結果が表示されることを確認

## 🧪 テスト用のデフォルト値

計算フォームには以下のデフォルト値が設定されています：

- **仕入値**: 15,000円
- **実重量**: 1.0kg
- **サイズ**: 40cm × 30cm × 20cm
- **HSコード**: 9023.00.0000 (Educational Equipment)
- **原産国**: 日本 (JP)
- **対象国**: USA (DDP)
- **カテゴリ**: Collectibles
- **ストアタイプ**: なし

このままで計算が成功するはずです。

## 📊 確認すべきこと

### ✅ 正常に動作している場合

- サイドバーが表示される
- 「eBay価格計算」タブが動作する
- 各タブ（価格計算、利益率設定、配送ポリシーなど）が切り替わる
- Supabaseからデータが読み込まれる（HSコード、原産国のドロップダウンに選択肢が表示される）
- 「計算実行」ボタンで結果が表示される
- 計算結果に以下が含まれる：
  - 商品価格
  - 送料・Handling
  - 2パターンの利益（還付なし/還付込み）
  - 13ステップの計算式
  - コスト内訳

### ❌ エラーが出る場合

#### エラー: `Module not found: @supabase/supabase-js`
\`\`\`bash
npm install @supabase/supabase-js
\`\`\`

#### エラー: `Failed to fetch` または `Supabase connection error`
1. `.env.local` ファイルが正しい場所にあるか確認
2. URLとAnon Keyが正しいか確認
3. サーバーを再起動: `Ctrl+C` → `npm run dev`

#### エラー: データが表示されない
1. Supabaseダッシュボードでテーブルが作成されているか確認
2. ブラウザのコンソールでエラーを確認 (F12 → Console)

## 📝 データの追加方法

### HSコードを追加

Supabaseダッシュボードで:
1. Table Editor → `hs_codes`
2. 「Insert row」をクリック
3. データを入力して保存

または、SQLエディタで:
\`\`\`sql
INSERT INTO hs_codes (code, description, base_duty, section301, category) VALUES
('1234.56.7890', '新しい商品', 0.0650, false, 'Electronics');
\`\`\`

### カテゴリ手数料を追加

\`\`\`sql
INSERT INTO ebay_pricing_category_fees (category_key, category_name, fvf, insertion_fee) VALUES
('New Category', 'New Category Name', 0.1315, 0.35);
\`\`\`

## 🎉 成功！

すべてが正常に動作すれば、eBay DDP/DDU価格計算システムの実装が完了です！

次の開発タスク:
1. eBayカテゴリCSV（17,103件）のインポート機能
2. HSコード自動推定（AI API連携）
3. FTA/EPA対応
4. 一括計算機能

---

**作成日**: 2025-10-02
**バージョン**: 1.0.0
