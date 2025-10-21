# Amazon統合リサーチツール セットアップガイド

## 📋 前提条件

- Amazon PA-API 5.0のアクセス権限
- Supabaseプロジェクト
- eBay APIキー（既存）

---

## 🚀 セットアップ手順

### Step 1: 依存関係のインストール

```bash
npm install
```

### Step 2: データベースマイグレーション実行

Supabase Dashboardを開き、SQL Editorで以下のマイグレーションを**順番に**実行してください：

#### 2-1. Amazon商品テーブル作成
```bash
supabase/migrations/20251022_amazon_research_system.sql
```

このファイルの内容をSupabase SQL Editorにコピー&ペーストして実行。

#### 2-2. yahoo_scraped_productsテーブル作成（存在しない場合）
```bash
supabase/migrations/20251022_create_yahoo_scraped_products.sql
```

このファイルの内容をSupabase SQL Editorにコピー&ペーストして実行。

**または、Supabase CLIを使用:**
```bash
supabase db push
```

### Step 3: 環境変数設定

`.env.local`ファイルを作成（`.env.local.example`を参考に）：

```bash
cp .env.local.example .env.local
```

`.env.local`を編集して、実際の値を設定：

```env
# Amazon PA-API 5.0
AMAZON_ACCESS_KEY=あなたのアクセスキー
AMAZON_SECRET_KEY=あなたのシークレットキー
AMAZON_PARTNER_TAG=あなたのパートナータグ
AMAZON_MARKETPLACE=www.amazon.com
AMAZON_REGION=us-east-1

# Supabase（既存の値を使用）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# eBay API（既存の値を使用）
EBAY_APP_ID=your_ebay_app_id
```

### Step 4: 開発サーバー起動

```bash
npm run dev
```

サーバーが起動したら、以下のURLにアクセス：
```
http://localhost:3000/tools/amazon-research
```

---

## 🎯 Amazon PA-API 5.0 認証情報の取得方法

### 1. Amazon Associate Programに登録

https://affiliate.amazon.com/

### 2. PA-API 5.0へのアクセス申請

1. Associate Centralにログイン
2. 「Tools」→「Product Advertising API」を選択
3. 利用規約に同意してアクセスをリクエスト

### 3. 認証情報を取得

https://affiliate.amazon.com/assoc_credentials/home

- **Access Key ID** → `AMAZON_ACCESS_KEY`
- **Secret Access Key** → `AMAZON_SECRET_KEY`
- **Tracking ID** → `AMAZON_PARTNER_TAG`

---

## ✅ 動作確認

### 1. UIの確認
```
http://localhost:3000/tools/amazon-research
```
- サイドバーに「Amazon リサーチ」が表示される
- 検索フォームが表示される
- 統計ダッシュボードが表示される

### 2. Amazon商品検索
- キーワードを入力（例: "nintendo switch"）
- 「検索」ボタンをクリック
- 商品カードが表示される

### 3. データ編集ページへの送信
- 商品カードの「データ編集に送る」ボタンをクリック
- 自動的に `/tools/editing` にリダイレクト
- 商品がテーブルに表示される

### 4. 既存ツールとの連携確認
データ編集ページで以下が利用可能：
- ✅ カテゴリ分析
- ✅ 送料計算
- ✅ HTML生成
- ✅ SellerMirror分析
- ✅ 一括処理
- ✅ eBay出品

---

## 📊 データフロー

```
Amazon商品検索
  ↓
商品カード表示
  ↓
「データ編集に送る」クリック
  ↓
バックグラウンド処理:
  - Amazon商品データ取得
  - eBay競合検索（キャッシュ優先）
  - SellerMirror分析（キャッシュ優先）
  - 利益計算
  ↓
yahoo_scraped_productsに保存
  ↓
/tools/editing で表示
  ↓
既存ツールで編集・出品
```

---

## 🔧 トラブルシューティング

### Amazon API エラー

**エラー**: `AMAZON_ACCESS_KEY が設定されていません`

**解決策**: `.env.local`ファイルが正しく作成されているか確認

```bash
# .env.localファイルの確認
cat .env.local

# サーバーを再起動
npm run dev
```

### データベースエラー

**エラー**: `relation "amazon_products" does not exist`

**解決策**: マイグレーションを実行

```bash
# Supabase Dashboard → SQL Editor
# supabase/migrations/20251022_amazon_research_system.sql を実行
```

### キャッシュエラー

**エラー**: `relation "api_call_cache" does not exist`

**解決策**: research_tablesマイグレーションを実行

```bash
# Supabase Dashboard → SQL Editor
# supabase/migrations/20251016_create_research_tables.sql を実行
```

---

## 📌 重要な注意事項

### API制限

- **Amazon PA-API**: 1日あたり8,640リクエスト（TPS: 1）
- **eBay Finding API**: 1日あたり5,000リクエスト
- **キャッシュ**: 24時間有効（重複リクエストを防ぐ）

### データ保存

- Amazon商品データ: `amazon_products`テーブル
- eBay競合データ: `research_results`テーブル（既存）
- データ編集用: `yahoo_scraped_products`テーブル

### セキュリティ

- `.env.local`は絶対にGitにコミットしない
- APIキーは定期的にローテーション
- 本番環境では環境変数を使用

---

## 🎉 完成！

これでAmazon統合リサーチツールが使えるようになりました！

質問や問題がある場合は、開発チームに連絡してください。
