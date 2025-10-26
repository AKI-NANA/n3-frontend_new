# Amazon SP-API 認証取得ガイド

**作成日**: 2025-10-22
**対象**: Amazon Professional Seller Account保有者
**所要時間**: 約1〜2時間

---

## 📋 目次

1. [前提条件](#前提条件)
2. [Step 1: Developer登録](#step-1-developer登録)
3. [Step 2: アプリケーション作成](#step-2-アプリケーション作成)
4. [Step 3: 認証情報取得](#step-3-認証情報取得)
5. [Step 4: IAMロール設定](#step-4-iamロール設定)
6. [Step 5: 環境変数設定](#step-5-環境変数設定)
7. [Step 6: 接続テスト](#step-6-接続テスト)
8. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必須アカウント

- ✅ **Amazon Professional Seller Account**（月額$39.99プラン）
  - Individual Sellerは不可
  - 日本のSeller Central: https://sellercentral.amazon.co.jp/

- ✅ **AWSアカウント**（無料枠で可）
  - IAMユーザー作成権限が必要

### 確認事項

```bash
# 以下の情報を事前に準備
□ Amazon Seller Central ログイン情報
□ AWS Management Console アクセス権限
□ 開発環境（Node.js 18+インストール済み）
```

---

## Step 1: Developer登録

### 1.1 Developer Profileの作成

1. Amazon Seller Centralにログイン
   - URL: https://sellercentral.amazon.co.jp/

2. **設定** → **ユーザー権限** → **開発者登録** に移動

3. **Developer Profile** を作成
   - 会社名
   - メールアドレス
   - ウェブサイト（任意）

![Developer Profile](https://m.media-amazon.com/images/G/01/rainier/help/developer_profile.png)

### 1.2 利用規約への同意

- SP-API利用規約を確認して同意

---

## Step 2: アプリケーション作成

### 2.1 新しいアプリケーションを登録

1. Seller Central → **アプリとサービス** → **アプリを管理**

2. **SP-APIアプリケーションを追加** をクリック

3. アプリケーション情報を入力:

```yaml
アプリケーション名: NAGANO-3 Inventory Management System
説明: Multi-channel inventory synchronization and listing management
プライバシーポリシーURL: https://n3.emverze.com/privacy (任意)
```

### 2.2 APIアクセス権限の選択

以下の権限を選択:

- ✅ **Catalog Items API** - 商品情報取得
- ✅ **FBA Inventory API** - FBA在庫管理
- ✅ **Listings Items API** - 出品管理
- ✅ **Product Pricing API** - 価格情報
- ✅ **Reports API** - レポート取得（オプション）
- ✅ **Notifications API** - 在庫変動通知（オプション）

### 2.3 OAuth設定

**Redirect URI**（重要）:
```
https://n3.emverze.com/api/amazon-sp/oauth/callback
```

または開発環境用:
```
http://localhost:3000/api/amazon-sp/oauth/callback
```

---

## Step 3: 認証情報取得

### 3.1 LWA認証情報の取得

アプリケーション作成後、以下の情報が表示されます:

```bash
LWA Client ID: amzn1.application-oa2-client.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LWA Client Secret: amzn1.oa2-cs.v1.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **Client Secretは再表示できないため、必ず保存してください！**

### 3.2 Refresh Tokenの取得

#### 方法1: Seller Central経由（推奨）

1. Seller Central → **アプリとサービス** → **アプリを管理**
2. 作成したアプリケーションの **認証** ボタンをクリック
3. 表示されたRefresh Tokenをコピー

```bash
Atzr|IwEBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 方法2: OAuth Flow（手動）

```bash
# 認証URL生成
https://sellercentral.amazon.co.jp/apps/authorize/consent?
  application_id=amzn1.application-oa2-client.XXXXXXXX&
  state=stateexample&
  version=beta
```

ブラウザでアクセス → 認証 → Redirect URIにcodeパラメータが付与される

```bash
curl -X POST https://api.amazon.com/auth/o2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE" \
  -d "client_id=YOUR_LWA_CLIENT_ID" \
  -d "client_secret=YOUR_LWA_CLIENT_SECRET"
```

レスポンス:
```json
{
  "access_token": "Atza|...",
  "refresh_token": "Atzr|...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

## Step 4: IAMロール設定

### 4.1 AWSアカウントでIAMユーザー作成

1. AWS Management Consoleにログイン
   - URL: https://console.aws.amazon.com/

2. **IAM** → **ユーザー** → **ユーザーを追加**

3. ユーザー名: `amazon-sp-api-user`

4. アクセス権限: **プログラムによるアクセス**を選択

5. 権限設定: **既存のポリシーを直接アタッチ**
   ```
   ポリシー名: AmazonSellingPartnerAPI
   ```

   または、カスタムポリシーを作成:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "execute-api:Invoke",
         "Resource": "arn:aws:execute-api:*:*:*"
       }
     ]
   }
   ```

6. **アクセスキーID**と**シークレットアクセスキー**を保存

```bash
AWS Access Key ID: AKIAXXXXXXXXXXXXXXXX
AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

⚠️ **シークレットアクセスキーは再表示できません！**

### 4.2 IAMロールARN（オプション）

より高度なセキュリティが必要な場合:

1. **IAM** → **ロール** → **ロールを作成**
2. 信頼エンティティタイプ: **AWSアカウント**
3. ロール名: `AmazonSellingPartnerAPIRole`
4. ポリシーをアタッチ
5. 作成されたロールのARNをコピー

```bash
Role ARN: arn:aws:iam::123456789012:role/AmazonSellingPartnerAPIRole
```

---

## Step 5: 環境変数設定

### 5.1 `.env.local`ファイルの作成

プロジェクトルートに`.env.local`を作成:

```bash
# ===========================================
# Amazon SP-API認証情報
# ===========================================

# マーケットプレイス設定
AMAZON_SP_REGION=fe                          # na(北米), eu(欧州), fe(極東)
AMAZON_SP_MARKETPLACE_ID=A1VC38T7YXB528      # 日本

# LWA (Login with Amazon) 認証
AMAZON_SP_LWA_CLIENT_ID=amzn1.application-oa2-client.xxxxxxxxxxxxxxxxxxxxx
AMAZON_SP_LWA_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AMAZON_SP_REFRESH_TOKEN=Atzr|IwEBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS認証
AMAZON_SP_AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxx
AMAZON_SP_AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# IAMロール（オプション）
AMAZON_SP_ROLE_ARN=arn:aws:iam::123456789012:role/AmazonSellingPartnerAPIRole

# Seller ID（Seller Central → 設定 → アカウント情報で確認）
AMAZON_SP_SELLER_ID=A3XXXXXXXXXX

# エンドポイント（自動設定されるが、明示的に指定可能）
# AMAZON_SP_ENDPOINT=https://sellingpartnerapi-fe.amazon.com
```

### 5.2 マーケットプレイスID一覧

| 国・地域 | Marketplace ID | Region |
|---------|----------------|--------|
| 日本 | A1VC38T7YXB528 | fe |
| 米国 | ATVPDKIKX0DER | na |
| カナダ | A2EUQ1WTGCTBG2 | na |
| メキシコ | A1AM78C64UM0Y8 | na |
| イギリス | A1F83G8C2ARO7P | eu |
| ドイツ | A1PA6795UKMFR9 | eu |
| フランス | A13V1IB3VIYZZH | eu |
| イタリア | APJ6JRA9NG5V4 | eu |
| スペイン | A1RKKUPIHCS9HS | eu |

### 5.3 Supabaseへの保存（本番環境推奨）

環境変数ではなく、Supabaseの`amazon_sp_config`テーブルに暗号化して保存:

```sql
-- 暗号化関数を使用（pgcryptoエクステンション必要）
INSERT INTO amazon_sp_config (
  marketplace_id,
  marketplace_name,
  region,
  refresh_token,
  lwa_client_id,
  lwa_client_secret,
  aws_access_key_id,
  aws_secret_access_key,
  is_active
) VALUES (
  'A1VC38T7YXB528',
  'Japan',
  'fe',
  pgp_sym_encrypt('YOUR_REFRESH_TOKEN', 'encryption_key'),
  pgp_sym_encrypt('YOUR_LWA_CLIENT_ID', 'encryption_key'),
  pgp_sym_encrypt('YOUR_LWA_CLIENT_SECRET', 'encryption_key'),
  pgp_sym_encrypt('YOUR_AWS_ACCESS_KEY', 'encryption_key'),
  pgp_sym_encrypt('YOUR_AWS_SECRET_KEY', 'encryption_key'),
  TRUE
);
```

---

## Step 6: 接続テスト

### 6.1 テストスクリプトの実行

```bash
# プロジェクトディレクトリで実行
npm run test:amazon-sp-auth
```

または、curlで直接テスト:

```bash
curl -X POST http://localhost:3000/api/amazon-sp/test-connection \
  -H "Content-Type: application/json"
```

期待されるレスポンス:

```json
{
  "success": true,
  "message": "Amazon SP-API接続成功",
  "data": {
    "marketplace": "Japan (A1VC38T7YXB528)",
    "sellerId": "A3XXXXXXXXXX",
    "tokenExpiry": "2025-10-22T15:30:00.000Z"
  }
}
```

### 6.2 在庫APIテスト

```bash
curl -X POST http://localhost:3000/api/amazon-sp/inventory/test \
  -H "Content-Type: application/json" \
  -d '{"sellerSku": "YOUR-TEST-SKU"}'
```

期待されるレスポンス:

```json
{
  "success": true,
  "inventory": {
    "sellerSku": "YOUR-TEST-SKU",
    "asin": "B0XXXXXXXX",
    "totalQuantity": 10,
    "availableQuantity": 8,
    "reservedQuantity": 2,
    "inboundQuantity": 0
  }
}
```

---

## トラブルシューティング

### エラー1: `Invalid refresh token`

**原因**: Refresh Tokenが無効または期限切れ

**解決策**:
1. Seller Centralで新しいRefresh Tokenを再取得
2. `.env.local`の`AMAZON_SP_REFRESH_TOKEN`を更新
3. サーバー再起動

### エラー2: `Unauthorized: Invalid AWS credentials`

**原因**: AWS Access KeyまたはSecret Keyが間違っている

**解決策**:
1. IAMユーザーのアクセスキーを確認
2. 必要に応じて新しいキーペアを発行
3. `.env.local`を更新

### エラー3: `Access to requested resource is denied`

**原因**: IAMユーザーに必要な権限がない

**解決策**:
1. AWS IAMで`AmazonSellingPartnerAPI`ポリシーをアタッチ
2. カスタムポリシーの場合、`execute-api:Invoke`権限を確認

### エラー4: `Request is throttled`

**原因**: APIレート制限に達した

**解決策**:
- レート制限を遵守（各エンドポイントごとに異なる）
- Bottleneck.jsによる自動リトライを確認
- `api_call_logs`テーブルでレート制限状況を監視

```sql
-- レート制限到達状況の確認
SELECT
  endpoint,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE error_type = 'QuotaExceeded') as throttled_calls
FROM api_call_logs
WHERE platform = 'amazon'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

### エラー5: `Marketplace not supported`

**原因**: 指定したMarketplace IDが間違っている

**解決策**:
- `AMAZON_SP_MARKETPLACE_ID`を確認（日本: `A1VC38T7YXB528`）
- Regionとの整合性を確認（日本は`fe`）

---

## 📚 参考リンク

### 公式ドキュメント

- [SP-API開発者ガイド](https://developer-docs.amazon.com/sp-api/)
- [SP-API認証ガイド](https://developer-docs.amazon.com/sp-api/docs/sp-api-authentication)
- [FBA Inventory API](https://developer-docs.amazon.com/sp-api/docs/fba-inventory-api-v1-reference)
- [Listings Items API](https://developer-docs.amazon.com/sp-api/docs/listings-items-api-v2021-08-01-reference)

### エンドポイント一覧

| Region | Endpoint |
|--------|----------|
| 北米 (na) | https://sellingpartnerapi-na.amazon.com |
| 欧州 (eu) | https://sellingpartnerapi-eu.amazon.com |
| 極東 (fe) | https://sellingpartnerapi-fe.amazon.com |

### レート制限

| API | レート |
|-----|--------|
| FBA Inventory | 10 requests / 30秒 |
| Listings Items | 5 requests / 秒 |
| Product Pricing | 0.5 requests / 秒 |
| Reports | 0.0167 requests / 秒 (1分に1回) |

---

## ✅ チェックリスト

### 認証情報取得完了
- [ ] LWA Client ID取得
- [ ] LWA Client Secret取得
- [ ] Refresh Token取得
- [ ] AWS Access Key ID取得
- [ ] AWS Secret Access Key取得
- [ ] Seller ID確認

### 環境設定完了
- [ ] `.env.local`作成
- [ ] 全環境変数設定
- [ ] Supabase `amazon_sp_config`テーブル準備（本番用）

### テスト完了
- [ ] 接続テスト成功
- [ ] アクセストークン取得成功
- [ ] 在庫API呼び出し成功

---

**次のステップ**: [開発計画書](./MULTI_CHANNEL_SYSTEM_PLAN.md)のWeek 1タスクを開始

**作成者**: Claude Code
**最終更新**: 2025-10-22
