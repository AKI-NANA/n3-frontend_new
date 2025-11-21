# N3 Frontend デプロイメントガイド

## 概要

このガイドでは、N3 Frontend（eBay在庫管理・バリエーション作成システム）をVPS環境にデプロイする手順を説明します。

## 前提条件

- Node.js 18.x 以上
- npm または yarn
- PostgreSQL 14.x 以上（Supabase使用）
- eBay Developer アカウント（API認証情報取得済み）

## 1. 環境変数の設定

### 1.1 .envファイルの作成

プロジェクトルートに`.env`ファイルを作成し、`.env.example`をテンプレートとして必要な値を設定します。

```bash
cp .env.example .env
```

### 1.2 必須環境変数の設定

#### eBay API認証情報

eBay Developer Portalから取得したAPI認証情報を設定します。

```bash
# MJTアカウント
EBAY_MJT_CLIENT_ID=your_actual_mjt_client_id
EBAY_MJT_CLIENT_SECRET=your_actual_mjt_client_secret
EBAY_MJT_REFRESH_TOKEN=your_actual_mjt_refresh_token

# GREENアカウント
EBAY_GREEN_CLIENT_ID=your_actual_green_client_id
EBAY_GREEN_CLIENT_SECRET=your_actual_green_client_secret
EBAY_GREEN_REFRESH_TOKEN=your_actual_green_refresh_token
```

**eBay Refresh Tokenの取得方法:**
1. eBay Developer Portalにログイン
2. アプリケーションを作成/選択
3. User Tokensセクションで「Get a Token from eBay via Your Application」をクリック
4. OAuth認証フローを完了してRefresh Tokenを取得

#### Supabase設定

Supabaseダッシュボードから取得した接続情報を設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Supabase接続情報の取得方法:**
1. Supabaseプロジェクトダッシュボードにログイン
2. Settings > API
3. Project URL、anon/public key、service_role keyをコピー

#### アプリケーション設定

本番環境のURLを設定します。

```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NODE_ENV=production
```

## 2. データベースセットアップ

### 2.1 必須テーブルの確認

以下のテーブルがSupabaseに存在することを確認してください：

- `ebay_shipping_policies_final` - 配送ポリシー（1,200件）
- `inventory_master` - 在庫マスター
- `products_master` - 商品マスター（親SKU/子SKU関係）
- `hts_codes` - HSコード・関税率マスター
- `country_additional_tariffs` - 国別追加関税マスター
- `usa_ddp_rates` - 米国DDP送料レートマスター
- `ebay_tokens` - eBay APIトークン管理

### 2.2 マイグレーションの実行

マイグレーションファイルが提供されている場合、Supabase SQL Editorで実行します。

```sql
-- 例: migrations/001_create_tables.sql を実行
```

### 2.3 初期データの投入

**配送ポリシーデータ:**
```sql
-- ebay_shipping_policies_final に1,200件のポリシーをインポート
-- CSVインポートまたはINSERT文で投入
```

**HSコードマスター:**
```sql
-- hts_codes テーブルに関税率データをインポート
-- 例: '8517.62.00' -> base_rate: 0.058 (5.8%)
```

**国別追加関税:**
```sql
-- country_additional_tariffs に追加関税データをインポート
-- 例: 'CN' (中国) -> additional_rate: 0.25 (25%)
INSERT INTO country_additional_tariffs (country_code, additional_rate, is_active)
VALUES ('CN', 0.25, true);
```

**米国DDP送料レート:**
```sql
-- usa_ddp_rates に重量帯別送料データをインポート
-- 例: weight: 0.5kg -> price_60: 8.50 USD
```

## 3. 依存パッケージのインストール

```bash
npm install
# または
yarn install
```

## 4. ビルド

```bash
npm run build
# または
yarn build
```

ビルドエラーが発生した場合は、以下を確認してください：
- TypeScriptの型エラーがないか
- 環境変数が正しく設定されているか
- 必要な依存パッケージがすべてインストールされているか

## 5. デプロイ

### 5.1 VPS（Ubuntu/Debian）へのデプロイ

#### PM2を使用した本番運用

```bash
# PM2のインストール
npm install -g pm2

# アプリケーションの起動
pm2 start npm --name "n3-frontend" -- start

# 自動起動設定
pm2 startup
pm2 save

# ログ確認
pm2 logs n3-frontend

# ステータス確認
pm2 status

# 再起動
pm2 restart n3-frontend
```

#### Nginxリバースプロキシの設定

```nginx
# /etc/nginx/sites-available/n3-frontend

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 設定を有効化
sudo ln -s /etc/nginx/sites-available/n3-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL証明書の設定（Let's Encrypt）

```bash
# Certbotのインストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書の取得と自動設定
sudo certbot --nginx -d yourdomain.com

# 自動更新のテスト
sudo certbot renew --dry-run
```

### 5.2 Vercel/Netlifyへのデプロイ

#### Vercel

```bash
# Vercel CLIのインストール
npm install -g vercel

# デプロイ
vercel

# 本番環境へのデプロイ
vercel --prod
```

環境変数の設定:
1. Vercelダッシュボード > Settings > Environment Variables
2. `.env`ファイルの内容をすべて追加
3. Production、Preview、Developmentの適用範囲を選択

#### Netlify

```bash
# Netlify CLIのインストール
npm install -g netlify-cli

# デプロイ
netlify deploy

# 本番環境へのデプロイ
netlify deploy --prod
```

環境変数の設定:
1. Netlifyダッシュボード > Site settings > Environment variables
2. `.env`ファイルの内容をすべて追加

## 6. デプロイ後の確認

### 6.1 ヘルスチェック

以下のエンドポイントにアクセスして、正常に動作していることを確認します。

```bash
# トップページ
curl https://yourdomain.com

# 棚卸し画面
curl https://yourdomain.com/zaiko/tanaoroshi

# API動作確認（配送ポリシー統計）
curl https://yourdomain.com/api/shipping-policies/analyze
```

### 6.2 eBay API接続テスト

```bash
# eBay同期APIのテスト
curl -X POST https://yourdomain.com/api/sync/ebay-to-inventory \
  -H "Content-Type: application/json" \
  -d '{"account": "mjt", "limit": 10}'
```

成功レスポンス例:
```json
{
  "success": true,
  "message": "eBay → inventory_master 同期完了",
  "total_synced": 10,
  "total_updated": 0,
  "total_skipped": 0
}
```

### 6.3 精密DDP計算APIのテスト

```bash
curl -X POST https://yourdomain.com/api/products/calculate-precise-ddp \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "sku": "TEST-001",
        "cost_jpy": 5000,
        "weight_g": 500,
        "hs_code": "8517.62.00",
        "origin_country": "CN"
      }
    ]
  }'
```

## 7. トラブルシューティング

### 7.1 eBay API認証エラー

**エラー:** `eBay API Error: 401 Unauthorized`

**原因:**
- Refresh Tokenの期限切れ
- Client IDまたはClient Secretが間違っている
- 本番環境とSandbox環境の設定ミス

**解決方法:**
1. eBay Developer Portalで新しいRefresh Tokenを取得
2. `.env`ファイルの`EBAY_ENVIRONMENT`を確認（production/sandbox）
3. アプリケーションを再起動

### 7.2 Supabase接続エラー

**エラー:** `fetch failed` または `connection timeout`

**原因:**
- Supabase URLまたはAPIキーが間違っている
- ネットワークファイアウォールでSupabaseへの接続がブロックされている

**解決方法:**
1. `.env`ファイルのSupabase設定を確認
2. VPSのファイアウォール設定を確認（ポート443がオープンか）
3. Supabaseダッシュボードでプロジェクトのステータスを確認

### 7.3 配送ポリシーが見つからない

**エラー:** `適合するポリシーが見つかりませんでした`

**原因:**
- `ebay_shipping_policies_final`テーブルにデータがない
- 重量または価格範囲がポリシーの範囲外

**解決方法:**
1. Supabaseで配送ポリシーデータを確認
   ```sql
   SELECT COUNT(*) FROM ebay_shipping_policies_final;
   -- 期待値: 1200
   ```
2. ポリシーの重量範囲と価格範囲を確認
   ```sql
   SELECT MIN(weight_from_kg), MAX(weight_to_kg),
          MIN(product_price_usd), MAX(product_price_usd)
   FROM ebay_shipping_policies_final;
   ```

### 7.4 精密DDP計算が失敗する

**エラー:** `計算不可能: DDP率が高すぎます`

**原因:**
- HSコードの関税率が異常に高い（>50%）
- 原産国の追加関税と基本関税の合計が100%を超える

**解決方法:**
1. HSコードと関税率を確認
   ```sql
   SELECT code, base_rate FROM hts_codes WHERE code = '問題のHSコード';
   ```
2. 追加関税を確認
   ```sql
   SELECT country_code, additional_rate FROM country_additional_tariffs
   WHERE country_code = '問題の国コード' AND is_active = true;
   ```
3. 関税率が正しいか、データソースと照合

### 7.5 ビルドエラー

**エラー:** `Module not found` または `Type error`

**解決方法:**
1. node_modulesを削除して再インストール
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. TypeScriptの型エラーを確認
   ```bash
   npm run type-check
   ```
3. Next.jsのキャッシュをクリア
   ```bash
   rm -rf .next
   npm run build
   ```

## 8. 監視とログ

### 8.1 アプリケーションログ

```bash
# PM2ログ
pm2 logs n3-frontend --lines 100

# リアルタイムログ
pm2 logs n3-frontend --raw
```

### 8.2 エラー監視

本番環境では以下のようなエラー監視サービスの導入を推奨します：
- Sentry
- LogRocket
- Datadog

### 8.3 パフォーマンス監視

```bash
# PM2 monit
pm2 monit

# メモリ使用量
pm2 show n3-frontend
```

## 9. バックアップ

### 9.1 データベースバックアップ

Supabaseは自動バックアップ機能を提供していますが、手動バックアップも推奨します：

```bash
# PostgreSQLダンプ（Supabase CLIまたはpg_dump）
# 詳細はSupabaseドキュメントを参照
```

### 9.2 環境変数のバックアップ

`.env`ファイルを安全な場所にバックアップしてください（Gitにはコミットしない）。

## 10. セキュリティ

### 10.1 環境変数の保護

- `.env`ファイルを絶対にGitにコミットしない
- `.gitignore`に`.env`が含まれていることを確認
- 本番環境の環境変数はVPSの環境変数として設定するか、秘密管理サービスを使用

### 10.2 APIキーのローテーション

定期的に以下のAPIキーをローテーションしてください：
- eBay Refresh Token（90日ごと推奨）
- Supabase Service Role Key（必要に応じて）

### 10.3 CORS設定

`ALLOWED_ORIGINS`環境変数に許可するオリジンのみを設定してください。

## 11. サポート

問題が発生した場合は、以下を確認してください：
- アプリケーションログ
- Supabaseダッシュボードのログ
- eBay Developer Portalのエラーログ

技術サポートが必要な場合は、プロジェクトリポジトリのIssueを作成してください。
