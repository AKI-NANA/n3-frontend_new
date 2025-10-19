# eBay DDP/DDU 価格計算システム

Supabase統合版 - 完全なeBay価格計算・利益分析ツール

## 🎯 機能概要

### 実装済み機能
- ✅ **価格計算エンジン**
  - 容積重量計算（実重量 vs 容積重量の自動選択）
  - DDP/DDU自動判定（USA=DDP、その他=DDU）
  - 消費税還付計算（2パターン利益表示）
  - 関税計算（HSコード連携）
  - FVF上限・ストア割引対応

- ✅ **Supabaseデータベース連携**
  - HSコードマスタ（拡張可能）
  - eBayカテゴリ手数料
  - 配送ポリシー（4段階）
  - 利益率設定（カテゴリ・国・条件別）
  - 為替レート履歴
  - 原産国マスタ（20カ国）
  - 計算履歴の自動保存

- ✅ **UI/UX**
  - 7タブ構造（価格計算、利益率設定、配送ポリシー、HSコード、手数料、関税、梱包費用）
  - サイドバーナビゲーション
  - レスポンシブデザイン
  - リアルタイム計算

### 今後の実装予定
- ⏳ eBayカテゴリCSV（17,103件）からのHSコードマッピング
- ⏳ HSコード自動推定（AI API連携）
- ⏳ FTA/EPA対応
- ⏳ 梱包費用編集機能
- ⏳ 一括計算・CSVエクスポート

## 🚀 セットアップ

### 1. 環境変数の設定

`.env.local`ファイルを作成：

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Supabaseの認証情報を設定：

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

### 2. Supabaseのセットアップ

#### 2.1 プロジェクト作成
1. [Supabase](https://supabase.com)にアクセス
2. 新しいプロジェクトを作成
3. Project URLとAnon Keyをコピー

#### 2.2 データベーススキーマの適用

Supabase SQLエディタで以下のファイルを実行：

\`\`\`bash
/05_rieki/ebay_ddp_schema.sql
\`\`\`

このスクリプトは以下を作成します：
- 9つのテーブル（hs_codes, ebay_category_fees, shipping_policies, など）
- インデックス
- Row Level Security (RLS)ポリシー
- トリガー関数
- ビュー

#### 2.3 初期データの確認

SQLスクリプト実行後、以下のデータが自動投入されます：
- HSコード: 8件
- eBayカテゴリ手数料: 16件
- 配送ポリシー: 4段階
- 配送ゾーン: 24件（6カ国 × 4ポリシー）
- 利益率設定: 12件
- 為替レート: 1件
- 原産国: 20カ国

### 3. 依存関係のインストール

\`\`\`bash
npm install
# または
yarn install
# または
pnpm install
\`\`\`

必要なパッケージ：
- @supabase/supabase-js
- lucide-react
- tailwindcss
- next 14+

### 4. 開発サーバーの起動

\`\`\`bash
npm run dev
# または
yarn dev
# または
pnpm dev
\`\`\`

http://localhost:3000 でアプリケーションが起動します。

## 📁 ファイル構造

\`\`\`
japanese-marketplace/
├── app/
│   ├── layout.tsx                    # Root Layout（サイドバー統合）
│   ├── page.tsx                      # ホームページ
│   └── ebay-pricing/
│       └── page.tsx                  # eBay価格計算ページ
│
├── components/
│   ├── app-sidebar.tsx              # アプリケーションサイドバー
│   ├── global-header.tsx            # グローバルヘッダー
│   ├── ui/
│   │   └── sidebar.tsx              # サイドバーUIコンポーネント
│   └── ebay-pricing/
│       ├── calculator-tab.tsx       # 価格計算タブ
│       ├── margin-settings-tab.tsx  # 利益率設定タブ
│       ├── shipping-policies-tab.tsx # 配送ポリシータブ
│       ├── hscode-tab.tsx           # HSコード管理タブ
│       ├── fee-settings-tab.tsx     # 手数料設定タブ
│       ├── tariff-settings-tab.tsx  # 原産国・関税タブ
│       ├── packaging-cost-tab.tsx   # 梱包費用タブ
│       └── tab-button.tsx           # タブボタン
│
├── hooks/
│   └── use-ebay-pricing.ts          # カスタムフック（データ取得）
│
├── lib/
│   └── supabase/
│       └── client.ts                 # Supabaseクライアント設定
│
└── .env.local.example               # 環境変数テンプレート
\`\`\`

## 🔧 使用方法

### 価格計算の流れ

1. **サイドバーから「eBay価格計算」を選択**
2. **入力項目を設定**
   - 仕入値（円）
   - 重量・サイズ（容積重量自動計算）
   - HSコード（ドロップダウンから選択）
   - 原産国
   - 対象国（DDP/DDU自動判定）
   - eBayカテゴリ
   - ストアタイプ
   - 還付対象手数料

3. **「計算実行」ボタンをクリック**

4. **結果を確認**
   - 商品価格、送料、Handling
   - 検索表示価格（eBay検索結果に表示される金額）
   - 利益（還付なし / 還付込みの2パターン）
   - 詳細な計算式（13ステップ）
   - コスト内訳

### HSコードの追加方法

#### Supabase UIから追加
1. Supabaseダッシュボードにログイン
2. Table Editorで`hs_codes`テーブルを開く
3. 「Insert row」で新しいHSコードを追加

#### SQLで一括追加
\`\`\`sql
INSERT INTO hs_codes (code, description, base_duty, section301, category) VALUES
('1234.56.7890', '商品説明', 0.0650, false, 'カテゴリ名'),
('9876.54.3210', '別の商品', 0.1000, true, '別カテゴリ');
\`\`\`

### eBayカテゴリCSVのインポート（今後実装）

現在、17,103件のeBayカテゴリCSVは準備済みですが、インポート機能は未実装です。
手動でインポートする場合：

\`\`\`bash
# CSVの場所
/05_rieki/eBayカテゴリ一覧2025年5月現在 eBayUS.csv
\`\`\`

## 🗄️ データベーススキーマ

### 主要テーブル

#### hs_codes
HSコードマスタ - 関税分類コード
- `code` (PK): HSコード（12桁）
- `description`: 商品説明
- `base_duty`: 基本関税率
- `section301`: Section 301対象フラグ
- `section301_rate`: Section 301追加税率
- `category`: カテゴリ

#### ebay_category_fees
eBayカテゴリ別手数料設定
- `category_key` (Unique): カテゴリキー
- `fvf`: Final Value Fee（%）
- `cap`: FVF上限額
- `insertion_fee`: 出品手数料

#### shipping_policies
配送ポリシー（重量・価格帯別）
- `policy_name`: ポリシー名（XS/S/M/L）
- `weight_min`, `weight_max`: 重量範囲
- `price_min`, `price_max`: 価格範囲

#### shipping_zones
配送ゾーン料金（国別）
- `policy_id` (FK): 配送ポリシーID
- `country_code`: 国コード
- `display_shipping`: 表示送料
- `actual_cost`: 実費
- `handling_ddp`, `handling_ddu`: Handling手数料

#### profit_margin_settings
利益率設定（カテゴリ・国・条件別）
- `setting_type`: 設定タイプ（default/category/country/condition）
- `setting_key`: 設定キー
- `default_margin`: デフォルト利益率
- `min_margin`: 最低利益率
- `min_amount`: 最低利益額

#### calculation_history
計算履歴
- すべての入力パラメータ
- 計算結果
- タイムスタンプ

## 🔐 セキュリティ

### Row Level Security (RLS)

- **読み取り**: すべてのマスタデータは全ユーザーが閲覧可能
- **書き込み**: 管理者のみ（今後実装）
- **計算履歴**: 自分のデータのみ閲覧・作成可能

### 環境変数

- `.env.local`は`.gitignore`に追加済み
- Supabase Anon Keyは公開しても安全（RLSで保護）
- Service Keyは絶対に公開しないこと

## 📊 計算ロジック

### 1. 容積重量計算
\`\`\`
容積重量 = (長さ × 幅 × 高さ) ÷ 5000
適用重量 = max(実重量, 容積重量)
\`\`\`

### 2. DDP/DDU判定
- USA → DDP（関税込み価格）
- その他 → DDU（関税別）

### 3. 関税計算
\`\`\`
CIF価格 = 原価(USD) + 実送料
関税 = CIF価格 × 関税率（HSコードベース）
Section 301追加関税 = CIF価格 × 25%（中国原産品のみ）
\`\`\`

### 4. DDP手数料（USAのみ）
\`\`\`
DDP手数料 = min($3.50 + CIF × 2.5%, $25.00)
\`\`\`

### 5. 利益計算（2パターン）

**還付なし利益（デフォルト）**
\`\`\`
利益 = 総売上 - (固定コスト + 変動コスト)
\`\`\`

**還付込み利益（参考値）**
\`\`\`
消費税還付額 = (仕入値 + 還付対象手数料) × 10/110
利益（還付込み） = 還付なし利益 + 還付額
\`\`\`

## 🐛 トラブルシューティング

### Supabase接続エラー

**エラー**: `Failed to fetch`

**解決方法**:
1. `.env.local`の設定を確認
2. Supabase URLが正しいか確認
3. Anon Keyが正しいか確認
4. Supabaseプロジェクトが起動しているか確認

### データが表示されない

**原因**: スキーマが適用されていない

**解決方法**:
1. Supabase SQLエディタで`ebay_ddp_schema.sql`を実行
2. Table Editorでテーブルが作成されているか確認
3. 初期データが投入されているか確認

### 計算エラー

**エラー**: `最低利益率・最低利益額を確保できません`

**原因**: 仕入値が高すぎる、または目標利益率が高すぎる

**解決方法**:
1. 仕入値を下げる
2. 利益率設定タブで目標利益率を調整
3. 別のカテゴリ・配送方法を検討

## 📝 開発ガイド

### 新しいHSコードの一括追加

\`\`\`typescript
// hooks/use-ebay-pricing.ts に追加
export function useBulkImportHSCodes() {
  const importFromCSV = async (csvData: string) => {
    // CSVパース処理
    // Supabaseへの一括挿入
  }
  
  return { importFromCSV }
}
\`\`\`

### カスタム計算ロジックの追加

\`\`\`typescript
// app/ebay-pricing/page.tsx の PriceCalculationEngine に追加
export const PriceCalculationEngine = {
  // 既存メソッド...
  
  customCalculation(params: any) {
    // カスタムロジック
  }
}
\`\`\`

## 🤝 コントリビューション

### 優先度の高いタスク

1. **HSコードデータベースの拡充**
   - eBayカテゴリCSVからの自動マッピング
   - AI API連携（商品説明からHSコード推定）

2. **FTA/EPA対応**
   - 原産国別の関税削減率
   - 協定データベースの構築

3. **梱包費用機能**
   - 編集UI実装
   - Supabase連携

4. **一括計算機能**
   - CSV入力
   - 複数商品の同時計算
   - 結果のエクスポート

## 📄 ライセンス

プロプライエタリ - N3 Development

## 📞 サポート

問題が発生した場合は、Issueを作成してください。

---

**バージョン**: 1.0.0  
**最終更新**: 2025-10-02  
**作成者**: Claude + N3 Development Team
