# N3 Frontend - 輸出禁止品フィルターツール

NAGANO-3 プロジェクトのフロントエンドアプリケーション

## 概要

このアプリケーションは、eBay・Amazon・Etsy等への商品出品を支援する統合管理システムです。
輸出禁止品のフィルタリング、商品承認、在庫管理、出品管理などの機能を提供します。

## 主な機能

- 📊 ダッシュボード - 統合管理画面
- 🔍 データ収集 - Yahoo!オークション等からの商品データ取得
- ✅ 商品承認システム - 2段階フィルタリングプロセス
- 🚫 輸出禁止品フィルター - 自動キーワード検出
- 📦 在庫管理 - リアルタイム在庫追跡
- 🏷️ 出品管理 - マルチプラットフォーム対応
- 📮 送料計算 - 国際配送料金自動計算

## 技術スタック

- **フレームワーク**: Next.js 15.5.4 (App Router)
- **言語**: TypeScript
- **UI**: React 19, Tailwind CSS, Radix UI
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **デプロイ**: Vercel

## セットアップ

### 必要要件

- Node.js 20.x 以上
- npm または yarn
- Supabase アカウント

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd n3-frontend_new

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.local.README .env.local
# .env.local を編集してSupabase接続情報を入力

# 開発サーバーを起動
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## 環境変数

`.env.local` に以下の環境変数を設定してください：

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

詳細は `.env.local.README` を参照してください。

## プロジェクト構造

```
n3-frontend_new/
├── app/                    # Next.js App Router
│   ├── dashboard/          # ダッシュボード
│   ├── filter-management/  # フィルター管理
│   ├── approval/           # 商品承認
│   ├── inventory/          # 在庫管理
│   └── ...
├── components/             # 再利用可能なUIコンポーネント
├── lib/                    # ユーティリティ関数
├── types/                  # TypeScript型定義
├── database/               # データベーススキーマ
└── public/                 # 静的ファイル
```

## 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# Lint実行
npm run lint
```

## ライセンス

Private - All Rights Reserved

## 作成者

NAGANO-3 Development Team
