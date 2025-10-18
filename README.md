# NAGANO-3 (N3) - eBay輸出統合管理システム

NAGANO-3は、Yahoo!オークションから商品を取得し、eBayへの輸出を効率化する統合管理システムです。

## 🎯 プロジェクト概要

Yahoo!オークションの商品データを自動取得し、輸出禁止品フィルタリング、商品編集、価格計算、eBay出品までを一元管理するフルスタックWebアプリケーションです。

## 📦 主要機能

### 1. データ取得・スクレイピング
- Yahoo!オークション商品データの自動取得
- 商品情報（タイトル、説明、画像、価格）の抽出

### 2. 輸出禁止品フィルターツール ⭐️
- **第1段階フィルター（自動）**: スクレイピング後に自動実行
  - 輸出禁止品チェック（EXPORT）
  - 特許・著作権フィルター（PATENT）
- **第2段階フィルター（手動）**: ユーザーがモール選択後に実行
  - モール専用フィルター（eBay, Amazon, Etsy, Mercari）
- Excel風のデータテーブルUI
- リアルタイム商品タイトルチェック

### 3. 商品データ編集
- 商品情報の編集・修正
- 画像管理
- 商品説明の最適化

### 4. 価格・送料計算
- 自動価格計算
- 送料シミュレーション
- 利益率計算

### 5. eBay出品管理
- eBay APIとの統合
- 自動出品
- 在庫管理
- 注文追跡

### 6. ダッシュボード・分析
- 商品承認ワークフロー
- 統計・分析レポート
- パフォーマンストラッキング

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (UIコンポーネント)

### バックエンド
- **PHP 8.x** (既存システムとの互換性)
- **PostgreSQL** (データベース)
- **Supabase** (認証・リアルタイム機能)

### API統合
- **eBay API** (Sell API, Browse API, OAuth 2.0)
- **Yahoo!オークション** (スクレイピング)

### 開発ツール
- **pnpm** (パッケージマネージャー)
- **Git** (バージョン管理)
- **GitHub** (リポジトリホスティング)

## 📁 プロジェクト構造

```
n3-frontend_new/
├── app/                      # Next.js App Router
│   ├── api/                  # APIルート
│   │   └── ebay/            # eBay API統合
│   ├── dashboard/           # ダッシュボード
│   └── filters/             # フィルター管理
├── components/              # Reactコンポーネント
│   └── ui/                  # UIコンポーネント (shadcn/ui)
├── lib/                     # 共通ライブラリ
│   └── utils/              # ユーティリティ関数
├── sql/                     # データベーススキーマ
├── data/                    # データファイル
├── public/                  # 静的ファイル
├── v0/                      # v0プロトタイプ
└── backend/                 # PHPバックエンド
```

## 🚀 セットアップ

### 前提条件

- Node.js 18.x 以上
- pnpm 8.x 以上
- PHP 8.x 以上
- PostgreSQL 14.x 以上

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/AKI-NANA/n3-frontend_new.git
cd n3-frontend_new

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を編集して必要な環境変数を設定
```

### 環境変数の設定

`.env.local` ファイルに以下を設定してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# eBay API
EBAY_CLIENT_ID_GREEN=your-client-id
EBAY_CLIENT_SECRET_GREEN=your-client-secret
EBAY_REFRESH_TOKEN_GREEN=your-refresh-token

# Database
DB_NAME=nagano3_db
DB_HOST=localhost
DB_PORT=5432
DB_USER=your-db-user
DB_PASS=your-db-password
```

### 開発サーバーの起動

```bash
# Next.js開発サーバーを起動
pnpm dev

# ブラウザで開く
# http://localhost:3000
```

## 📊 データベース設計

### 主要テーブル

#### `yahoo_scraped_products`
Yahoo!オークションから取得した商品データ

```sql
- id (PRIMARY KEY)
- title (商品タイトル)
- description (商品説明)
- price (価格)
- export_filter_status (輸出フィルター結果)
- patent_filter_status (特許フィルター結果)
- mall_filter_status (モールフィルター結果)
- final_judgment (最終判定: OK/NG/PENDING)
- selected_mall (選択されたモール)
- created_at, updated_at
```

#### `filter_keywords`
フィルタリング用キーワード

```sql
- id (PRIMARY KEY)
- keyword (キーワード)
- type (タイプ: EXPORT/PATENT/MALL)
- priority (優先度: HIGH/MEDIUM/LOW)
- mall_name (モール名: ebay/amazon/etsy/mercari)
- is_active (有効フラグ)
- detection_count (検出回数)
```

## 🔒 セキュリティ

### 機密情報の管理

- **環境変数**: すべての機密情報（APIキー、トークン等）は `.env.local` で管理
- **.gitignore**: 機密ファイルはGitに含まれない
  - `.env*`
  - `scripts/` (APIキーを含むスクリプト)
  - `**/client_secret*.json`

### eBay API認証

- OAuth 2.0フローを使用
- リフレッシュトークンで自動更新
- 本番環境とサンドボックス環境を分離

## 📝 開発ワークフロー

### ブランチ戦略

```
main        # 本番環境
├── dev     # 開発環境
└── feature/xxx  # 機能開発ブランチ
```

### コミットメッセージ規約

```
feat: 新機能
fix: バグ修正
docs: ドキュメント
chore: その他の変更
refactor: リファクタリング
```

## 🔄 デプロイ

### Vercelへのデプロイ

```bash
# Vercel CLIをインストール
pnpm add -g vercel

# デプロイ
vercel --prod
```

### 環境変数の設定

Vercelダッシュボードで以下を設定：
- `EBAY_CLIENT_ID_GREEN`
- `EBAY_CLIENT_SECRET_GREEN`
- `EBAY_REFRESH_TOKEN_GREEN`
- その他必要な環境変数

## 📚 ドキュメント

- [開発指示書](./docs/development-guide.md) - 詳細な開発ガイド
- [API仕様書](./docs/api-specification.md) - API仕様
- [データベース設計書](./docs/database-schema.md) - DB設計

## 🐛 トラブルシューティング

### Git Pushエラー

機密情報が検出されてpushがブロックされる場合：
- [Git Push解決ガイド](./GIT_PUSH_FIX_GUIDE.md) を参照

### eBay API エラー

- トークンの有効期限を確認
- 環境変数が正しく設定されているか確認
- サンドボックス/本番環境の切り替えを確認

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。

## 👥 開発チーム

- **プロジェクトオーナー**: NAGANO-3 Team
- **開発者**: [Your Name]

## 📞 サポート

質問や問題がある場合は、GitHubのIssuesで報告してください。

---

**NAGANO-3** - Making eBay export simple and efficient 🚀
