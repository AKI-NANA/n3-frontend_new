# Vercel デプロイ手順書

## 📋 概要

GitHubにプッシュするだけで、自動的にVercelでプレビュー環境が作られます。
VPSでのビルドやローカルでのpullは不要です。

---

## 🚀 初回セットアップ（1回のみ）

### 1. Vercelアカウント作成

1. **Vercelにアクセス**: https://vercel.com
2. **GitHubでサインイン**: 「Continue with GitHub」をクリック
3. **GitHubアカウントで認証**

### 2. プロジェクトのインポート

1. Vercelダッシュボードで「**Add New Project**」をクリック
2. 「**Import Git Repository**」を選択
3. GitHubリポジトリ `**AKI-NANA/n3-frontend_new**` を検索して選択
4. 「**Import**」をクリック

### 3. プロジェクト設定

#### Framework Preset
- **Framework**: Next.js（自動検出されます）
- **Root Directory**: `.` （デフォルト）
- **Build Command**: `npm run build`（デフォルト）
- **Output Directory**: `.next`（デフォルト）

#### 環境変数の設定

「**Environment Variables**」セクションで以下を追加：

##### 必須の環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Build
SKIP_ENV_VALIDATION=true

# eBay - 共通設定
EBAY_ENVIRONMENT=production
EBAY_MARKETPLACE_ID=EBAY_US
EBAY_REDIRECT_URI=https://あなたのvercelドメイン.vercel.app/api/ebay/auth/callback
EBAY_DEV_ID=a1617738-f3cc-4aca-9164-2ca4fdc64f6d

# eBay - MJTアカウント
EBAY_CLIENT_ID_MJT=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET_MJT=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
EBAY_REFRESH_TOKEN_MJT=v^1.1#i^1#p^3#I^3#r^1#f^0#t^Ul4xMF84OjA2NTFFNTcwRUM1N0ZCNjY2OTczNjFEMTFCODM0RDg2XzFfMSNFXjI2MA==

# eBay - Greenアカウント
EBAY_CLIENT_ID_GREEN=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET_GREEN=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
EBAY_REFRESH_TOKEN_GREEN=v^1.1#i^1#f^0#p^3#I^3#r^1#t^Ul4xMF82OjkyQUYxOTlENTQ4NjQ4QkQyMEJBRUJFRjA0M0YwRDZFXzFfMSNFXjI2MA==
```

**注意**: 各環境変数の「Environment」は**全てチェック**（Production, Preview, Development）

### 4. デプロイ開始

「**Deploy**」ボタンをクリック

初回デプロイには2-3分かかります。

---

## 🌐 デプロイ完了後

### アクセスURL

デプロイが完了すると、以下のURLが生成されます：

#### 本番環境（mainブランチ）
```
https://n3-frontend-new.vercel.app
```

#### プレビュー環境（各ブランチ）
```
https://n3-frontend-new-git-claude-xxx.vercel.app
```

### 棚卸しページへアクセス
```
https://あなたのドメイン.vercel.app/zaiko/tanaoroshi
```

---

## 🔄 通常の使い方（2回目以降）

### 1. Claude Codeで開発

```bash
# コードを編集
# 変更を保存
```

### 2. Git Push

```bash
git add .
git commit -m "メッセージ"
git push origin ブランチ名
```

### 3. 自動デプロイ

**何もしなくても自動的に：**
- ✅ Vercelがプッシュを検知
- ✅ 自動的にビルド開始
- ✅ 2-3分でデプロイ完了
- ✅ プレビューURL生成

### 4. 確認

- **GitHub Pull Request**にVercelのコメントが表示される
- 「**Visit Preview**」リンクをクリック
- **即座に最新の画面が表示される**

---

## 📊 ブランチ別のデプロイ

### mainブランチ
```
本番環境: https://n3-frontend-new.vercel.app
```

### 開発ブランチ（claude/xxx）
```
プレビュー環境: https://n3-frontend-new-git-claude-xxx.vercel.app
```

**各ブランチごとに独立したプレビュー環境が作られます！**

---

## 🎯 メリット

### ✅ 高速確認
- VPSでビルド不要
- Macでpull不要
- **Git Pushだけで確認できる**

### ✅ 自動化
- プッシュ → 自動デプロイ
- Pull Request → 自動プレビュー
- 何もしなくてOK

### ✅ 複数環境
- ブランチごとにURL
- 本番と開発を同時に確認
- 他の人にも簡単に共有

### ✅ 無料
- 個人利用は完全無料
- 商用利用でも基本無料

---

## 🔧 環境変数の更新

Vercelダッシュボードで：

1. プロジェクトを選択
2. 「**Settings**」→「**Environment Variables**」
3. 変数を追加/編集
4. 「**Save**」
5. 「**Redeploy**」で反映

---

## 📝 トラブルシューティング

### ビルドエラーが出る

**原因**: 環境変数が不足している

**解決**:
1. Vercelダッシュボード→Settings→Environment Variables
2. `.env.example`を参考に不足している変数を追加
3. Redeploy

### eBay APIが動かない

**原因**: REFRESH_TOKENの有効期限切れ

**解決**:
1. eBay Developer Consoleで新しいトークンを取得
2. Vercelの環境変数を更新
3. Redeploy

### プレビューURLが404

**原因**: デプロイ失敗

**解決**:
1. Vercelダッシュボード→Deployments
2. 失敗したデプロイのログを確認
3. エラー内容に応じて修正
4. 再度Git Push

---

## 🎉 完了

これで、**Git Pushするだけ**で最新の画面を確認できます！

### ワークフロー例

```
1. Claude Codeで開発
   ↓
2. git push
   ↓
3. Vercelが自動デプロイ（2-3分）
   ↓
4. プレビューURLで確認
   ↓
5. 問題なければmainにマージ
   ↓
6. 本番環境に自動反映
```

---

## 📚 参考リンク

- Vercelドキュメント: https://vercel.com/docs
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- 環境変数設定: https://vercel.com/docs/projects/environment-variables

---

**更新日**: 2025-10-26
**作成者**: Claude Code
