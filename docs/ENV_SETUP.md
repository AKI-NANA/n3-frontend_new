# 自動出品システム - 環境変数設定ガイド

## 必須環境変数

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### eBay API
```bash
# Account 1 (メインアカウント)
EBAY_AUTH_TOKEN=your-ebay-user-token-account1
# または
EBAY_USER_ACCESS_TOKEN=your-ebay-user-token-account1

# Account 2 (サブアカウント)
EBAY_USER_TOKEN_GREEN=your-ebay-user-token-account2
```

### Cron認証（オプション）
```bash
# Cronエンドポイントを保護する場合
CRON_SECRET=your-random-secret-key
```

## Vercel環境変数の設定方法

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. Settings > Environment Variables
4. 上記の環境変数を追加

## Cron Secretの生成方法

```bash
# ランダムな秘密鍵を生成
openssl rand -base64 32
```

生成された文字列を`CRON_SECRET`として設定してください。

## 設定確認

環境変数が正しく設定されているか確認：

```bash
curl -H "Authorization: Bearer your-cron-secret" https://your-app.vercel.app/api/cron/execute-schedules
```

正常な場合、JSONレスポンスが返ります。
