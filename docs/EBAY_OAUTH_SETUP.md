# eBay OAuth認証設定完了ドキュメント

## 📋 概要

eBay本番環境（Production）のOAuth 2.0認証を実装し、リフレッシュトークンの取得に成功しました。

- **実装日**: 2025年10月23日
- **環境**: 本番環境（Production）
- **有効期限**: 18ヶ月（2026年4月頃まで）

---

## ✅ 実装内容

### 1. 認証エンドポイント

#### `/app/api/ebay/auth/authorize/route.ts`

eBayの認証画面にリダイレクトするエンドポイント

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.EBAY_APP_ID;
  const redirectUri = encodeURIComponent(process.env.EBAY_REDIRECT_URI || '');
  const scope = encodeURIComponent('https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory');

  const authUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;

  return NextResponse.redirect(authUrl);
}
```

#### `/app/api/ebay/auth/callback/route.ts`

認証コードを受け取り、リフレッシュトークンを取得するエンドポイント

機能:
- eBayから受け取った認証コードを処理
- リフレッシュトークン（18ヶ月有効）を取得
- ブラウザに見やすいHTMLで表示

#### `/app/api/ebay/auth/test-token/route.ts`

リフレッシュトークンの動作確認用エンドポイント

- **URL**: `https://n3.emverze.com/api/ebay/auth/test-token`

レスポンス例:
```json
{
  "success": true,
  "environment": "Production",
  "access_token": "v^1.1#i^1#r^0#f^0#p^...",
  "expires_in": 7200,
  "expires_in_hours": 2,
  "message": "✅ リフレッシュトークンが正常に動作しています！（本番環境）",
  "timestamp": "2025-10-23T04:30:50.002Z"
}
```

---

## 🔑 環境変数設定

### VPS設定（PM2 ecosystem.config.js）

```javascript
module.exports = {
  apps: [{
    name: 'n3-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/ubuntu/n3-frontend_new',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      EBAY_APP_ID: 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce',
      EBAY_CERT_ID: 'PRD-7fae13b2cf17-be72-4584-bdd6-4ea4',
      EBAY_DEV_ID: 'a1617738-f3cc-4aca-9164-2ca4fdc64f6d',
      EBAY_REFRESH_TOKEN: 'v^1.1#i^1#I^3#p^3#r^1#f^0#t^Ul4xMF82OjYwNUQ2ODg3QjkwMTY5QTQzODhEODMzNjhBNzFDNzc4XzFfMSNFXjI2MA==',
      EBAY_REDIRECT_URI: 'https://n3.emverze.com/api/ebay/auth/callback'
    }
  }]
}
```

### 環境変数一覧

| 変数名 | 説明 | 値 |
|--------|------|-----|
| `EBAY_APP_ID` | eBayアプリケーションID（Client ID） | `HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce` |
| `EBAY_CERT_ID` | eBay証明書ID（Client Secret） | `PRD-7fae13b2cf17-be72-4584-bdd6-4ea4` |
| `EBAY_DEV_ID` | eBay開発者ID | `a1617738-f3cc-4aca-9164-2ca4fdc64f6d` |
| `EBAY_REFRESH_TOKEN` | リフレッシュトークン（18ヶ月有効） | `v^1.1#i^1#I^3#p^3#r^1#f^0#t^Ul4x...` |
| `EBAY_REDIRECT_URI` | コールバックURL | `https://n3.emverze.com/api/ebay/auth/callback` |

---

## 🔧 eBay Developer Portal設定

### RuName設定

**RuName**: `HIROAKI_ARITA-HIROAKIA-HIROAK-wqsbgvq`

### Redirect URIs

以下のURLをeBay Developer Portalに登録済み:

- **Your auth accepted URL**: `https://n3.emverze.com/api/ebay/auth/callback`
- **Your privacy policy URL**: `https://n3.emverze.com/privacy`
- **Your auth declined URL**: `https://n3.emverze.com/api/ebay/auth/declined`

### OAuth Scope
```
https://api.ebay.com/oauth/api_scope
https://api.ebay.com/oauth/api_scope/sell.inventory
```

---

## 🚀 使用方法

### 1. リフレッシュトークンの更新（18ヶ月後）

リフレッシュトークンの有効期限が切れた場合（2026年4月頃）:

1. ブラウザで以下のURLにアクセス:
   ```
   https://n3.emverze.com/api/ebay/auth/authorize
   ```

2. eBayにログイン＆アプリケーションを許可

3. 画面に表示されるリフレッシュトークンをコピー

4. VPSで`ecosystem.config.js`を更新:
   ```bash
   nano ecosystem.config.js
   # EBAY_REFRESH_TOKENの値を新しいトークンに置き換え
   ```

5. PM2を再起動:
   ```bash
   pm2 restart n3-frontend
   ```

### 2. eBay APIの呼び出し方法

他のAPIエンドポイントでeBay APIを使用する例:

```typescript
// リフレッシュトークンからアクセストークンを取得
async function getEbayAccessToken() {
  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString('base64');

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.EBAY_REFRESH_TOKEN!,
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
  });

  const data = await response.json();
  return data.access_token;
}

// eBay APIを呼び出す
async function searchEbayItems(keyword: string) {
  const accessToken = await getEbayAccessToken();

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keyword)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    }
  );

  return await response.json();
}
```

---

## 📊 トークンのライフサイクル

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Refresh Token (リフレッシュトークン)                  │
│  有効期限: 18ヶ月                                      │
│  用途: アクセストークンの取得                          │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 使用
                 ▼
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Access Token (アクセストークン)                       │
│  有効期限: 2時間                                       │
│  用途: eBay API呼び出し                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 自動更新フロー:

1. アプリケーションがeBay APIを呼び出す
2. リフレッシュトークンを使って新しいアクセストークンを取得
3. 取得したアクセストークンでAPI呼び出し
4. アクセストークンは2時間有効（期限切れ後は再取得）

---

## ⚠️ トラブルシューティング

### エラー: "invalid_grant"

**原因**: リフレッシュトークンが無効または期限切れ

**解決策**:
1. ブラウザで `/api/ebay/auth/authorize` にアクセス
2. 新しいリフレッシュトークンを取得
3. `ecosystem.config.js` を更新
4. PM2を再起動

### エラー: "unauthorized_client"

**原因**: App IDまたはRedirect URIの不一致

**解決策**:
1. eBay Developer Portalで設定を確認
2. Redirect URIが正しく登録されているか確認
3. App IDが環境変数と一致しているか確認

### 環境変数が読み込まれない

**原因**: PM2が`.env.local`を読み込まない

**解決策**: `ecosystem.config.js`を使用して環境変数を直接指定

---

## 📝 重要な注意事項

### リフレッシュトークンは機密情報

- Gitにコミットしない
- 公開しない
- 定期的に更新を検討

### 本番環境とSandbox環境

- 本ドキュメントは本番環境用
- Sandbox環境は別の認証情報が必要

### トークンの有効期限

- リフレッシュトークン: 18ヶ月
- アクセストークン: 2時間
- 次回更新: 2026年4月頃

### PM2の設定

- `ecosystem.config.js`で環境変数を管理
- Next.jsを直接実行（`node_modules/next/dist/bin/next`）
- `npm start`経由では環境変数が正しく渡らない

---

## 🔗 関連リンク

- [eBay Developer Portal](https://developer.ebay.com/)
- [eBay OAuth Documentation](https://developer.ebay.com/api-docs/static/oauth-tokens.html)
- [本番アプリケーションキー](https://developer.ebay.com/my/keys)

---

## ✅ 動作確認済み

- **日時**: 2025年10月23日
- **環境**: VPS (n3.emverze.com)
- **テスト結果**: ✅ 成功
- **テストURL**: https://n3.emverze.com/api/ebay/auth/test-token

---

**作成者**: Claude
**最終更新**: 2025年10月23日
