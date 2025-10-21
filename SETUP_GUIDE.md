# 開発環境セットアップガイド

このガイドでは、n3-frontend_newプロジェクトの開発環境をセットアップする手順を説明します。

---

## 前提条件

以下のツールがインストールされていることを確認してください：

- **Node.js** 18以上
- **npm** （Node.jsに含まれています）
- **Git**

---

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd n3-frontend_new
```

### 2. 依存関係のインストール

Puppeteerのダウンロードをスキップして依存関係をインストールします：

```bash
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

または、通常のインストール後に環境変数を設定：

```bash
npm install
```

**注意**: Puppeteerのブラウザダウンロード中にエラーが発生する場合は、環境変数 `PUPPETEER_SKIP_DOWNLOAD=true` を設定してください。

### 3. 環境変数の設定

`.env.local` ファイルがプロジェクトルートに作成されています。このファイルを編集して、必要な環境変数を設定してください：

```bash
# .env.local を編集
nano .env.local
# または
vi .env.local
```

**必要な環境変数：**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key

# eBay API
EBAY_APP_ID=your-actual-app-id
EBAY_CERT_ID=your-actual-cert-id
EBAY_DEV_ID=your-actual-dev-id
EBAY_CLIENT_ID=your-actual-client-id
EBAY_CLIENT_SECRET=your-actual-client-secret

# 認証
JWT_SECRET=your-strong-random-secret-at-least-32-characters
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Puppeteer
PUPPETEER_SKIP_DOWNLOAD=true
```

**環境変数の取得方法：**

- **Supabase**: [database/SUPABASE_SETUP_GUIDE.md](./database/SUPABASE_SETUP_GUIDE.md) を参照
- **eBay API**: eBay Developer Programで取得（詳細はEBAY_SETUP_COMPLETE.mdを参照）
- **JWT_SECRET**: ランダムな文字列を生成（例: `openssl rand -base64 32`）

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

---

## 利用可能なコマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm start

# Lintチェック
npm run lint

# 型チェック
npx tsc --noEmit

# eBay関連のツール
npm run ebay:auth-url           # eBay認証URLを取得
npm run ebay:get-refresh-token  # リフレッシュトークンを取得
npm run ebay:test               # eBay API接続テスト
npm run ebay:diagnose-tokens    # トークン診断
```

---

## トラブルシューティング

### 依存関係のインストールエラー

**エラー**: Puppeteerのダウンロードに失敗する

**解決策**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

### ビルドエラー

**エラー**: `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`

**解決策**: `.env.local` に正しいSupabase URLを設定してください。

### 開発サーバーが起動しない

**確認事項**:
1. `.env.local` ファイルが存在するか
2. 環境変数が正しく設定されているか
3. ポート3000が使用可能か（他のプロセスで使用されていないか）

別のポートで起動する場合：
```bash
PORT=3001 npm run dev
```

---

## 次のステップ

1. **データベースのセットアップ**: [database/SUPABASE_SETUP_GUIDE.md](./database/SUPABASE_SETUP_GUIDE.md) を参照
2. **プロジェクト構造の理解**: [PROJECT_MAP.md](./PROJECT_MAP.md) を読む
3. **重要な注意事項の確認**: [IMPORTANT_NOTES.md](./IMPORTANT_NOTES.md) を確認
4. **eBay APIの設定**: [EBAY_SETUP_COMPLETE.md](./EBAY_SETUP_COMPLETE.md) を参照

---

## プロジェクト概要

このプロジェクトは **NAGANO-3 v2.0** という名称のeBay出品自動化システムです。

**主要な技術スタック:**
- **フロントエンド**: Next.js 15.5.4, React 19.1.0, TypeScript 5
- **スタイリング**: Tailwind CSS 4.1, shadcn/ui
- **データベース**: Supabase (PostgreSQL)
- **認証**: カスタムJWT + Supabase
- **API連携**: eBay API, SellerMirror API

**主な機能:**
- eBay出品管理・自動化
- 在庫モニタリング
- 配送料計算ツール
- 価格分析・最適化
- データ収集（Yahoo Auction, Mercari等）
- 管理者ダッシュボード

---

## サポート

問題が発生した場合：

1. [IMPORTANT_NOTES.md](./IMPORTANT_NOTES.md) の「トラブルシューティング」セクションを確認
2. ブラウザのコンソールでエラーを確認
3. プロジェクトのドキュメントを参照
4. GitHubでIssueを作成

---

**最終更新**: 2025-10-21
