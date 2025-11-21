# 多販路API連携システム - セットアップガイド

Phase 3 Stage 2: 多販路出品API連携の実装完了

## 📦 依存関係のインストール

以下のパッケージをインストールしてください：

```bash
npm install fast-xml-parser
```

- **fast-xml-parser**: eBay Trading API用のXMLパーサー・ビルダー

## 🗄️ データベースマイグレーション

`/lib/database-migrations-api-integration.md` に記載のSQLを実行してください。

必要なテーブル：
1. `platform_credentials` - 認証情報管理
2. `listing_result_logs` - 出品結果ログ
3. `exclusive_locks` - 排他的ロック
4. `listing_data` - 出品データ

## 🔑 認証情報の設定

各プラットフォームの認証情報を `platform_credentials` テーブルに登録してください。

### eBay (Auth'n'Auth Token)

```sql
INSERT INTO platform_credentials (
  platform, account_id, account_name, auth_type,
  ebay_auth_token, ebay_token_expires_at, is_sandbox, is_active
) VALUES (
  'ebay', 1, 'eBay Account #1', 'auth_n_auth',
  'YOUR_EBAY_AUTH_TOKEN', NOW() + INTERVAL '18 months', FALSE, TRUE
);
```

### Amazon (OAuth 2.0)

```sql
INSERT INTO platform_credentials (
  platform, account_id, account_name, auth_type,
  refresh_token, api_key, api_secret, is_sandbox, is_active
) VALUES (
  'amazon', 1, 'Amazon SP-API Account', 'oauth2',
  'YOUR_REFRESH_TOKEN', 'YOUR_LWA_CLIENT_ID', 'YOUR_LWA_CLIENT_SECRET', FALSE, TRUE
);
```

### Coupang (OAuth 2.0)

```sql
INSERT INTO platform_credentials (
  platform, account_id, account_name, auth_type,
  access_token, api_key, api_secret, is_sandbox, is_active
) VALUES (
  'coupang', 1, 'Coupang Wing Account', 'oauth2',
  'YOUR_ACCESS_TOKEN', 'YOUR_VENDOR_ID', 'YOUR_SECRET_KEY', FALSE, TRUE
);
```

### Shopify (Private Token)

```sql
INSERT INTO platform_credentials (
  platform, account_id, account_name, auth_type,
  api_key, api_base_url, is_sandbox, is_active
) VALUES (
  'shopify', 1, 'Shopify Store', 'private_token',
  'YOUR_PRIVATE_APP_TOKEN', 'your-store.myshopify.com', FALSE, TRUE
);
```

## 🚀 使用方法

### 1. 統合出品管理ダッシュボード

`/tools/listing-management` にアクセスして、バッチ出品を実行できます。

### 2. APIエンドポイント

**バッチ出品**
```bash
POST /api/batch-listing
{
  "limit": 50,
  "platform": "ebay", // オプション
  "dryRun": false
}
```

**リトライ処理**
```bash
GET /api/batch-listing/retry
```

## 📋 実装済みファイル

### 型定義
- `/types/api-credentials.ts` - 認証・出品関連の型定義

### サービス
- `/services/CredentialsManager.ts` - 認証情報管理・トークン自動更新
- `/services/ExclusiveLockManager.ts` - 排他的ロック管理
- `/services/ListingResultLogger.ts` - 出品結果ログ記録

### APIクライアント
- `/lib/api-clients/EbayClient.ts` - eBay Trading API
- `/lib/api-clients/AmazonClient.ts` - Amazon SP-API
- `/lib/api-clients/CoupangClient.ts` - Coupang Wing API
- `/lib/api-clients/ShopifyClient.ts` - Shopify Admin API

### エンドポイント
- `/app/api/batch-listing/route.ts` - バッチ出品処理

### UIコンポーネント
- `/components/listing/BatchListingExecutor.tsx` - バッチ出品実行UI

## ⚙️ 機能概要

### 認証管理
- プラットフォーム別の認証情報を一元管理
- OAuth 2.0トークンの自動更新（Amazon、Coupang、Shopee）
- eBay Auth'n'Auth Token（長期トークン）のサポート
- 有効期限チェックと自動リフレッシュ

### バッチ出品処理
- 戦略決定済み商品を自動出品
- プラットフォーム別の出品データマッピング
- レート制限対策（500ms間隔）
- Dry Runモード（テスト実行）

### エラーハンドリング
- 致命的エラーと一時的エラーの判別
- 自動リトライキュー
- エラーログの詳細記録
- ステータス別管理（出品中、リトライ待ち、失敗）

### 排他的ロック
- 同一SKUの重複出品防止
- アカウント単位でのロック管理
- 出品停止時の自動ロック解除
- 戦略エンジンとの連携

## 🔐 セキュリティ注意事項

### 認証情報の暗号化
本番環境では、`platform_credentials` テーブルの以下のカラムを暗号化することを強く推奨します：

- `access_token`
- `refresh_token`
- `api_key`
- `api_secret`
- `ebay_auth_token`

### 推奨実装

```sql
-- Supabase Vault を使用した暗号化例
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 暗号化キーの作成
INSERT INTO vault.secrets (name, secret)
VALUES ('api_credentials_key', 'YOUR_RANDOM_256_BIT_KEY');

-- 暗号化関数の使用
-- access_token を暗号化して保存
UPDATE platform_credentials
SET access_token = pgsodium.crypto_secretbox(
  access_token::bytea,
  (SELECT secret FROM vault.secrets WHERE name = 'api_credentials_key')
);
```

## 📊 モニタリング

### エラー統計の取得

```typescript
import { ListingResultLogger } from '@/services/ListingResultLogger';

// 過去7日間のエラー統計
const stats = await ListingResultLogger.getErrorStatistics('ebay', 7);
console.log(stats);
// { "93200": 3, "11001": 1 }
```

### リトライキューの確認

```typescript
const retryQueue = await ListingResultLogger.getRetryQueue();
console.log(`リトライ待ち: ${retryQueue.length}件`);
```

## 🎯 今後の拡張

1. **Mercari、Yahoo、Rakuten対応** - APIクライアントの追加実装
2. **バルク出品** - 複数商品の並列処理
3. **スケジュール実行** - Cron設定による自動バッチ実行
4. **Webhook統合** - モール側のイベント通知受信
5. **在庫同期** - 出品後の在庫自動更新

## 📝 ライセンスとコンプライアンス

各プラットフォームのAPI利用規約を遵守してください：

- **eBay**: [Developer Program](https://developer.ebay.com/)
- **Amazon**: [SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- **Coupang**: [Wing API Guide](https://wing-developers.coupang.com/)
- **Shopify**: [Admin API Reference](https://shopify.dev/api/admin)

---

**実装者**: Claude Code
**実装日**: 2025-11-21
**Phase**: 3 Stage 2 - 多販路API連携
