# eBay SEO/リスティング健全性マネージャー V1.0

## 📋 概要

**Phase 7: SEO/リスティング健全性マネージャー**は、多販路EC統合管理システムの最終フェーズとして開発されました。このシステムは、「売れない親リスティング（死に筋）」を自動的に特定し、アカウント全体のSEO（STR: Sell Through Rate）を最大化するための管理ツールです。

## 🎯 主な機能

### 1. **健全性スコア計算エンジン**
リスティングの以下の要素を評価し、10〜100のスコアを算出：
- **長期非売却ペナルティ**: 90日以上売れていない商品
- **高ビュー/低コンバージョンペナルティ**: 多くの閲覧があるにも関わらず購入されない商品（最も危険なSEOシグナル）
- **ゼロビュー/ゼロセールスペナルティ**: リソースの無駄遣い
- **販売実績ボーナス**: 実際に売れた商品への加点

### 2. **カテゴリー別サマリー**
- カテゴリーごとの平均健全性スコア
- 死に筋リスティング数（スコア50未満）
- カテゴリー全体への推奨アクション

### 3. **対応必須リスティング詳細**
- スコアの低い順にソートされたリスティング一覧
- 各リスティングに対する推奨アクション（即時終了、価格改訂、プロモーション）
- ワンクリックでアクションを実行可能

### 4. **統合ダッシュボード連携**
- Phase 3の総合ダッシュボードにタブとして統合
- 他のフェーズ（受注管理、出荷管理、資金繰り予測等）とのシームレスな連携

## 🏗️ システム構成

### ファイル構成

```
n3-frontend_new/
├── components/
│   └── managers/
│       └── EbaySeoManagerV1.jsx          # SEOマネージャーコンポーネント
├── app/
│   ├── management/
│   │   └── dashboard/
│   │       └── IntegratedDashboard_V1.jsx  # 統合ダッシュボード（タブベース）
│   └── api/
│       └── seo-manager/
│           ├── get-listings/
│           │   └── route.ts              # リスティングデータ取得API
│           └── execute-action/
│               └── route.ts              # アクション実行API
└── database/
    ├── migrations/
    │   └── 001_create_seo_manager_tables.sql  # テーブル作成マイグレーション
    └── README_SEO_MANAGER.md             # このファイル
```

## 🗄️ データベーススキーマ

### 1. `marketplace_listings` テーブル
マーケットプレイス（eBay, Amazon, Shopee等）へのリスティング情報を格納

```sql
- id: UUID (主キー)
- sku: 商品SKU
- title: リスティングタイトル
- category: カテゴリー
- marketplace: マーケットプレイス名 (ebay, amazon, shopee等)
- status: ステータス (active, ended, paused)
- price_usd: 価格（USD）
- views_count: 閲覧数
- sales_count: 販売数
- listed_at: 出品日時
- needs_price_revision: 価格改訂フラグ
```

### 2. `seo_manager_actions` テーブル
SEOマネージャーで実行されたアクションの履歴を記録

```sql
- id: UUID (主キー)
- listing_id: リスティングID (外部キー)
- action_type: アクション種類 (end_listing, price_revision, promotion)
- reason: 理由
- executed_at: 実行日時
- success: 成功フラグ
```

## 🚀 セットアップ手順

### ステップ1: データベースマイグレーション実行

```bash
# Supabase CLIを使用する場合
psql -h <YOUR_SUPABASE_HOST> -U postgres -d postgres -f database/migrations/001_create_seo_manager_tables.sql

# または、Supabase DashboardのSQL Editorで以下を実行
# database/migrations/001_create_seo_manager_tables.sql の内容をコピー&ペースト
```

### ステップ2: 環境変数の確認

`.env.local` ファイルで、Supabase接続情報が設定されていることを確認：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### ステップ3: 依存関係のインストール

```bash
npm install
# or
yarn install
```

### ステップ4: 開発サーバーの起動

```bash
npm run dev
# or
yarn dev
```

### ステップ5: アクセス

ブラウザで以下にアクセス：
- 統合ダッシュボード: `http://localhost:3000/management/dashboard`
- SEO管理タブをクリックして、SEOマネージャーにアクセス

## 📊 使用方法

### 1. リスティングデータの表示

SEO管理タブを開くと、以下が自動的に表示されます：
- カテゴリー別サマリー
- 健全性スコアの低い順にソートされたリスティング一覧

### 2. アクションの実行

各リスティングに対して、以下のアクションを実行できます：

#### **即時終了** (スコア < 50)
- 完全に「死に筋」と判定されたリスティングを終了
- ボタンをクリックすると、ステータスが `ended` に更新され、リストから削除されます

#### **価格改訂** (50 ≤ スコア < 70)
- 改善の余地があるリスティングに価格改訂フラグを設定
- `needs_price_revision` フラグが `true` に設定され、別の価格最適化プロセスで処理されます

### 3. データの更新

右上の「更新」ボタンをクリックすると、最新のリスティングデータを取得できます。

## 🔧 カスタマイズ

### スコア計算ロジックの調整

`components/managers/EbaySeoManagerV1.jsx` の `calculateHealthScore` 関数を編集：

```javascript
const MIN_VIEWS_FOR_CONVERSION_CHECK = 50;  // コンバージョンチェックの最小閲覧数
const MAX_DAYS_FOR_DEAD_LISTING = 90;       // 死に筋と判定する日数
```

### カテゴリー戦略の調整

`categorySummary` の計算ロジックで、死に筋の割合やアクション推奨の閾値を変更できます。

## 🔐 セキュリティとアクセス制御

- APIエンドポイントは、Supabaseの Row Level Security (RLS) ポリシーで保護されています
- アクション実行時には、実行者情報をログに記録することを推奨します

## 📈 今後の拡張予定

- **自動アクション実行**: スコアに基づいた自動終了/価格改訂
- **AIレコメンデーション**: より高度なSEO改善提案
- **A/Bテスト機能**: 価格変更の効果測定
- **多言語対応**: 国際マーケットプレイスへの展開

## 🤝 他フェーズとの連携

- **Phase 1 (受注管理 V2.0)**: 受注データと連携し、確定利益を計算
- **Phase 2 (出荷管理 V1.0)**: 出荷遅延リスクを考慮した優先順位付け
- **Phase 3 (総合ダッシュボード V1.0)**: 統合ダッシュボードに組み込まれ、経営判断をサポート
- **Phase 4 (資金繰り予測ツール V1.0)**: 仕入れコストとキャッシュフローを連携
- **Phase 5 (多モール仕入れ一括承認UI)**: 仕入れ判断とSEO戦略を統合

## 🐛 トラブルシューティング

### APIエラーが発生する場合

1. Supabaseの接続情報を確認
2. データベースマイグレーションが正しく実行されているか確認
3. テーブル `marketplace_listings` と `seo_manager_actions` が存在するか確認

```sql
-- テーブルの存在確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('marketplace_listings', 'seo_manager_actions');
```

### モックデータが表示される場合

- API接続が失敗すると、自動的にモックデータを使用します
- 開発環境では、これは正常な動作です
- 本番環境では、実際のデータベースに接続してください

## 📝 ライセンス

このプロジェクトは、多販路EC統合管理システムの一部として開発されました。

---

**開発者向け注意事項**:
- このシステムは、eBay等のマーケットプレイスのSEOアルゴリズムに基づいて設計されています
- 実際のマーケットプレイスAPIと連携する場合は、各プラットフォームの利用規約を遵守してください
- 大量のリスティング終了を行う際は、段階的に実行することを推奨します
