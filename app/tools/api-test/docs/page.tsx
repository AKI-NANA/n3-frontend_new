'use client'

import { useState } from 'react'

export default function ApiDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const fullDocumentation = `
# eBay API 開発ガイド - 完全版

## 📋 システム概要

このシステムは3つのeBay APIを使用しています：
1. **Finding API** - 販売済み商品の検索（公開API、認証不要）
2. **Browse API** - 現在出品中の商品検索（Application Token必要）
3. **Sell API** - 商品の出品・在庫管理（User Token必要）

---

## 🔐 認証方式の詳細

### 1. Finding API（認証不要）
- **使用目的**: 販売済み商品（Sold Listings）の価格調査
- **認証**: なし（APP_IDのみ）
- **制限**: 1日5000回まで
- **エンドポイント**: https://svcs.ebay.com/services/search/FindingService/v1

**必要な環境変数:**
\`\`\`
EBAY_APP_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
\`\`\`

**コード例:**
\`\`\`javascript
const params = new URLSearchParams({
  'OPERATION-NAME': 'findCompletedItems',
  'SERVICE-VERSION': '1.0.0',
  'SECURITY-APPNAME': process.env.EBAY_APP_ID,
  'RESPONSE-DATA-FORMAT': 'JSON',
  'keywords': 'iPhone 15',
  'itemFilter(0).name': 'SoldItemsOnly',
  'itemFilter(0).value': 'true'
})

const response = await fetch(\`https://svcs.ebay.com/services/search/FindingService/v1?\${params}\`)
\`\`\`

---

### 2. Browse API（Application Token）

- **使用目的**: 現在出品中の商品（Active Listings）の検索
- **認証方式**: Client Credentials（アプリケーショントークン）
- **grant_type**: \`client_credentials\`
- **スコープ**: \`https://api.ebay.com/oauth/api_scope\`
- **トークン有効期限**: 2時間
- **制限**: レート制限あり（正確な数値は不明）

**必要な環境変数:**
\`\`\`
EBAY_CLIENT_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
\`\`\`

**トークン取得コード:**
\`\`\`javascript
const credentials = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')

const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: \`Basic \${credentials}\`
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope'
  })
})

const data = await response.json()
const accessToken = data.access_token // 2時間有効
\`\`\`

**API呼び出しコード:**
\`\`\`javascript
const response = await fetch(
  'https://api.ebay.com/buy/browse/v1/item_summary/search?q=iPhone&limit=200',
  {
    headers: {
      Authorization: \`Bearer \${accessToken}\`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  }
)
\`\`\`

**重要**: 
- Refresh Tokenは不要
- User認証は不要
- PUBLIC APIとして使用可能

---

### 3. Sell API（User Token / Refresh Token）

- **使用目的**: 商品の出品、在庫管理、注文処理
- **認証方式**: Authorization Code Grant（ユーザートークン）
- **grant_type**: \`refresh_token\`
- **Refresh Token有効期限**: 18ヶ月
- **Access Token有効期限**: 2時間

**必要な環境変数:**
\`\`\`
EBAY_CLIENT_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
EBAY_REFRESH_TOKEN="v^1.1#i^1#p^3#I^3#r^1#f^0#t^Ul4xMF84OjA2NTFFNTcwRUM1N0ZCNjY2OTczNjFEMTFCODM0RDg2XzFfMSNFXjI2MA=="
EBAY_REDIRECT_URI_LOCAL=http://localhost:3000/api/ebay/auth/callback
EBAY_REDIRECT_URI_PRODUCTION=https://n3.emverze.com/api/ebay/auth/callback
\`\`\`

**必要なスコープ:**
\`\`\`
https://api.ebay.com/oauth/api_scope
https://api.ebay.com/oauth/api_scope/sell.account
https://api.ebay.com/oauth/api_scope/sell.fulfillment
https://api.ebay.com/oauth/api_scope/sell.inventory
\`\`\`

**Refresh Token取得フロー:**
\`\`\`javascript
// Step 1: ユーザーをeBay認証ページにリダイレクト
const authUrl = \`https://auth.ebay.com/oauth2/authorize?client_id=\${clientId}&response_type=code&redirect_uri=\${redirectUri}&scope=\${scope}\`
window.location.href = authUrl

// Step 2: コールバックで認証コードを受け取る
// ?code=v^1.1#i^1#r^1#p^3#I^3#f^0...

// Step 3: 認証コードをRefresh Tokenに交換
const credentials = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')

const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: \`Basic \${credentials}\`
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: redirectUri
  })
})

const data = await response.json()
const refreshToken = data.refresh_token // .env.localに保存
\`\`\`

**Access Token取得（Refresh Token使用）:**
\`\`\`javascript
const credentials = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')

const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: \`Basic \${credentials}\`
  },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  })
})

const data = await response.json()
const accessToken = data.access_token // 2時間有効
\`\`\`

---

## 🔍 API比較表

| 項目 | Finding API | Browse API | Sell API |
|------|------------|-----------|----------|
| **目的** | 販売済み商品検索 | 現在出品中の商品検索 | 商品管理・出品 |
| **データ** | Sold Listings | Active Listings | 自分の商品 |
| **認証** | なし | Application Token | User Token |
| **grant_type** | - | client_credentials | refresh_token |
| **User承認** | 不要 | 不要 | 必要 |
| **Refresh Token** | 不要 | 不要 | 必要 |
| **レート制限** | 5000/日 | あり（詳細不明） | あり |
| **トークン期限** | - | 2時間 | 2時間 |

---

## ⚠️ よくある問題と解決方法

### 1. Finding API エラー 10001
\`\`\`
{
  "errorId": "10001",
  "message": "Application limit has been reached"
}
\`\`\`

**原因**: APP_IDが1日の上限（5000回）に達している

**解決策**:
1. Browse APIを使用する（こちらに切り替え推奨）
2. 別のAPP_IDを使用
3. 翌日まで待つ
4. 同じAPP_IDを別のシステムで使用していないか確認

---

### 2. Browse API エラー 403 (1100)
\`\`\`
{
  "errors": [{
    "errorId": 1100,
    "message": "Access denied",
    "longMessage": "Insufficient permissions to fulfill the request."
  }]
}
\`\`\`

**原因**: 
- ❌ Refresh Tokenを使用している（間違い）
- ❌ User Tokenで認証している（間違い）

**解決策**:
✅ Application Token（Client Credentials）を使用する

\`\`\`javascript
// ❌ 間違い
grant_type: 'refresh_token'

// ✅ 正しい
grant_type: 'client_credentials'
scope: 'https://api.ebay.com/oauth/api_scope'
\`\`\`

---

### 3. トークンの期限切れ
\`\`\`
{
  "error": "invalid_token"
}
\`\`\`

**解決策**: トークンをキャッシュして再利用

\`\`\`javascript
let cachedToken: {
  accessToken: string
  expiresAt: number
} | null = null

async function getAccessToken(): Promise<string> {
  // 期限の5分前にキャッシュを無効化
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.accessToken
  }

  // 新しいトークンを取得
  const data = await fetchNewToken()
  
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  }
  
  return cachedToken.accessToken
}
\`\`\`

---

## 🎯 ベストプラクティス

### 1. トークンのキャッシュ
- Application Token: サーバー側でキャッシュ（2時間有効）
- User Token: サーバー側でキャッシュ（2時間有効）
- Refresh Token: .env.localで管理（18ヶ月有効）

### 2. エラーハンドリング
\`\`\`javascript
try {
  const response = await fetch(apiUrl, options)
  
  if (!response.ok) {
    const errorData = await response.json()
    
    // 10001: レート制限
    if (errorData.errorId === '10001') {
      // Browse APIにフォールバック
      return await useBrowseApiInstead()
    }
    
    // 1100: 権限不足
    if (errorData.errors?.[0]?.errorId === 1100) {
      // Application Tokenを使用
      return await useApplicationToken()
    }
    
    throw new Error(\`API Error: \${errorData.message}\`)
  }
  
  return await response.json()
} catch (error) {
  console.error('API呼び出しエラー:', error)
  throw error
}
\`\`\`

### 3. レート制限の管理
- Finding API: 1日5000回まで
- Browse APIを優先使用
- 必要に応じてキャッシュを実装

---

## 📁 .env.local 設定例

\`\`\`bash
# ============================================
# eBay API - 本番環境（Production）
# ============================================

# デフォルトアカウント（Browse API等で使用）
EBAY_CLIENT_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
EBAY_REFRESH_TOKEN="v^1.1#i^1#p^3#I^3#r^1#f^0#t^Ul4xMF84OjA2NTFFNTcwRUM1N0ZCNjY2OTczNjFEMTFCODM0RDg2XzFfMSNFXjI2MA=="
EBAY_APP_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce

# 共通設定
EBAY_ENVIRONMENT=production
EBAY_MARKETPLACE_ID=EBAY_US

# リダイレクトURI（本番とローカル）
EBAY_REDIRECT_URI_PRODUCTION=https://n3.emverze.com/api/ebay/auth/callback
EBAY_REDIRECT_URI_LOCAL=http://localhost:3000/api/ebay/auth/callback

EBAY_DEV_ID=a1617738-f3cc-4aca-9164-2ca4fdc64f6d

# MJTアカウント (mystical-japan-treasures)
EBAY_CLIENT_ID_MJT=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET_MJT=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
EBAY_REFRESH_TOKEN_MJT="v^1.1#i^1#p^3#I^3#r^1#f^0#t^Ul4xMF84OjA2NTFFNTcwRUM1N0ZCNjY2OTczNjFEMTFCODM0RDg2XzFfMSNFXjI2MA=="

# greenアカウント
EBAY_CLIENT_ID_GREEN=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET_GREEN=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
EBAY_REFRESH_TOKEN_GREEN="v^1.1#i^1#f^0#p^3#I^3#r^1#t^Ul4xMF82OjkyQUYxOTlENTQ4NjQ4QkQyMEJBRUJFRjA0M0YwRDZFXzFfMSNFXjI2MA=="
\`\`\`

---

## 🚀 実装ファイル構成

\`\`\`
app/
├── api/
│   ├── ebay/
│   │   ├── search/route.ts          # Finding API
│   │   ├── browse/search/route.ts   # Browse API
│   │   ├── auth/
│   │   │   ├── authorize/route.ts   # OAuth認証開始
│   │   │   └── callback/route.ts    # OAuth コールバック
│   │   └── debug-env/route.ts       # 環境診断
│   └── ...
└── tools/
    └── api-test/
        ├── page.tsx                  # テストページ
        └── docs/page.tsx             # このドキュメント
\`\`\`

---

## 🔗 参考リンク

- eBay Developer Portal: https://developer.ebay.com
- Finding API Doc: https://developer.ebay.com/devzone/finding/concepts/FindingAPIGuide.html
- Browse API Doc: https://developer.ebay.com/api-docs/buy/browse/overview.html
- OAuth 2.0: https://developer.ebay.com/api-docs/static/oauth-tokens.html

---

## 📝 開発時のチェックリスト

### 新しくeBay APIを実装する場合

- [ ] どのAPIを使用するか決定（Finding / Browse / Sell）
- [ ] 必要な認証方式を確認
- [ ] 必要な環境変数を.env.localに設定
- [ ] トークンキャッシュを実装
- [ ] エラーハンドリングを実装
- [ ] レート制限を考慮
- [ ] テストページで動作確認

---

## 🤖 クロードに説明する際のコピペ用テキスト

このシステムは3つのeBay APIを使用：
1. Finding API（認証不要、APP_IDのみ、販売済み商品、5000/日制限）
2. Browse API（Application Token、client_credentials、現在出品中、2時間有効）
3. Sell API（User Token、refresh_token、商品管理、2時間有効）

Browse APIは403エラーが出ていたが、原因はRefresh Tokenを使用していたこと。
正しくはClient Credentials（grant_type: client_credentials）を使用する。
Refresh TokenやUser認証は不要。

Finding APIの10001エラーはAPP_IDのレート制限（5000/日）。
Browse APIへの切り替えを推奨。

全ての設定は.env.localに記載済み。
EBAY_CLIENT_ID、EBAY_CLIENT_SECRET、EBAY_APP_IDが設定されている。
`

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">📚 eBay API 開発ガイド</h1>
            <a
              href="/tools/api-test"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ← テストページに戻る
            </a>
          </div>
          <p className="text-gray-600">
            eBay APIの完全なドキュメント。クロードに説明する際はこのページをコピーしてください。
          </p>
        </div>

        {/* クイックコピー */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-xl font-bold mb-3">🤖 クロード用クイックコピー</h2>
          <p className="mb-4 text-sm opacity-90">
            以下のボタンをクリックして、システム全体の説明をコピーできます
          </p>
          <button
            onClick={() => copyToClipboard(fullDocumentation, 'full')}
            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold shadow-md"
          >
            {copiedSection === 'full' ? '✅ コピーしました！' : '📋 完全版をコピー'}
          </button>
        </div>

        {/* セクション1: システム概要 */}
        <Section
          title="📋 システム概要"
          copyText={`
このシステムは3つのeBay APIを使用しています：
1. Finding API - 販売済み商品の検索（公開API、認証不要、5000/日制限）
2. Browse API - 現在出品中の商品検索（Application Token必要、2時間有効）
3. Sell API - 商品の出品・在庫管理（User Token必要、2時間有効）

Finding APIは10001エラー（レート制限）が出やすいため、Browse APIの使用を推奨。
Browse APIはClient Credentials（grant_type: client_credentials）で動作し、Refresh Tokenは不要。
          `}
          copiedSection={copiedSection}
          onCopy={copyToClipboard}
          sectionId="overview"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ApiCard
                title="Finding API"
                icon="🔍"
                purpose="販売済み商品検索"
                auth="認証不要"
                limit="5000回/日"
                status="制限注意"
                statusColor="yellow"
              />
              <ApiCard
                title="Browse API"
                icon="🛒"
                purpose="現在出品中の商品検索"
                auth="Application Token"
                limit="レート制限あり"
                status="推奨"
                statusColor="green"
              />
              <ApiCard
                title="Sell API"
                icon="📦"
                purpose="商品管理・出品"
                auth="User Token"
                limit="レート制限あり"
                status="要認証"
                statusColor="blue"
              />
            </div>
          </div>
        </Section>

        {/* セクション2: 認証方式 */}
        <Section
          title="🔐 認証方式の詳細"
          copyText={`
1. Finding API: 認証不要（APP_IDのみ）
2. Browse API: Client Credentials（grant_type: client_credentials、scope: https://api.ebay.com/oauth/api_scope）
3. Sell API: Refresh Token（grant_type: refresh_token）

Browse APIは403エラーが出ていたが、原因はRefresh Tokenを使用していたこと。
正しくはClient Credentialsを使用。Refresh TokenやUser認証は不要。
          `}
          copiedSection={copiedSection}
          onCopy={copyToClipboard}
          sectionId="auth"
        >
          <div className="space-y-6">
            <AuthMethod
              title="Finding API"
              type="認証不要"
              grantType="-"
              required={['EBAY_APP_ID']}
              notes="APP_IDのみで使用可能。User認証不要。"
            />
            <AuthMethod
              title="Browse API"
              type="Application Token (Client Credentials)"
              grantType="client_credentials"
              required={['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET']}
              scope="https://api.ebay.com/oauth/api_scope"
              notes="Refresh Token不要。User認証不要。トークン有効期限: 2時間"
            />
            <AuthMethod
              title="Sell API"
              type="User Token (Refresh Token)"
              grantType="refresh_token"
              required={['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET', 'EBAY_REFRESH_TOKEN']}
              scope="sell.account, sell.inventory, sell.fulfillment"
              notes="User認証必要。Refresh Token有効期限: 18ヶ月、Access Token: 2時間"
            />
          </div>
        </Section>

        {/* セクション3: よくある問題 */}
        <Section
          title="⚠️ よくある問題と解決方法"
          copyText={`
1. Finding API エラー10001: APP_IDのレート制限（5000/日）→ Browse APIに切り替え
2. Browse API エラー403(1100): Refresh Tokenを使用している → Client Credentialsに変更
3. トークン期限切れ: キャッシュして再利用（2時間有効）
          `}
          copiedSection={copiedSection}
          onCopy={copyToClipboard}
          sectionId="issues"
        >
          <div className="space-y-4">
            <ErrorCard
              errorCode="10001"
              api="Finding API"
              title="Application limit has been reached"
              cause="APP_IDが1日の上限（5000回）に達"
              solution="Browse APIを使用する（推奨）"
            />
            <ErrorCard
              errorCode="1100"
              api="Browse API"
              title="Access denied / Insufficient permissions"
              cause="Refresh Tokenを使用している（間違い）"
              solution="Client Credentials（grant_type: client_credentials）を使用"
            />
            <ErrorCard
              errorCode="invalid_token"
              api="全API"
              title="Token expired"
              cause="トークンの期限切れ（2時間）"
              solution="トークンをキャッシュして期限前に再取得"
            />
          </div>
        </Section>

        {/* セクション4: 環境変数 */}
        <Section
          title="📁 環境変数設定"
          copyText={`
必要な環境変数（.env.local）:
EBAY_CLIENT_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
EBAY_APP_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_REFRESH_TOKEN="v^1.1#i^1#p^3#I^3#r^1#f^0#t^Ul4xMF84OjA2NTFFNTcwRUM1N0ZCNjY2OTczNjFEMTFCODM0RDg2XzFfMSNFXjI2MA=="
EBAY_REDIRECT_URI_LOCAL=http://localhost:3000/api/ebay/auth/callback
EBAY_REDIRECT_URI_PRODUCTION=https://n3.emverze.com/api/ebay/auth/callback
          `}
          copiedSection={copiedSection}
          onCopy={copyToClipboard}
          sectionId="env"
        >
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>{`# eBay API設定
EBAY_CLIENT_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_CLIENT_SECRET=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
EBAY_APP_ID=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
EBAY_REFRESH_TOKEN="v^1.1#..."
EBAY_REDIRECT_URI_LOCAL=http://localhost:3000/api/ebay/auth/callback
EBAY_REDIRECT_URI_PRODUCTION=https://n3.emverze.com/api/ebay/auth/callback`}</pre>
          </div>
        </Section>

        {/* セクション5: コード例 */}
        <Section
          title="💻 実装コード例"
          copyText={`
Browse API実装例（Client Credentials）:

const credentials = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')

// Application Token取得
const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: \`Basic \${credentials}\`
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope'
  })
})

const tokenData = await tokenResponse.json()
const accessToken = tokenData.access_token

// Browse API呼び出し
const response = await fetch(
  'https://api.ebay.com/buy/browse/v1/item_summary/search?q=iPhone&limit=200',
  {
    headers: {
      Authorization: \`Bearer \${accessToken}\`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  }
)
          `}
          copiedSection={copiedSection}
          onCopy={copyToClipboard}
          sectionId="code"
        >
          <div className="space-y-4">
            <CodeExample
              title="Browse API - Application Token取得"
              language="typescript"
              code={`const credentials = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')

const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: \`Basic \${credentials}\`
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope'
  })
})

const data = await response.json()
const accessToken = data.access_token // 2時間有効`}
            />
            <CodeExample
              title="Browse API - 商品検索"
              language="typescript"
              code={`const response = await fetch(
  'https://api.ebay.com/buy/browse/v1/item_summary/search?q=iPhone&limit=200',
  {
    headers: {
      Authorization: \`Bearer \${accessToken}\`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  }
)

const data = await response.json()
console.log('商品数:', data.total)
console.log('商品:', data.itemSummaries)`}
            />
          </div>
        </Section>

        {/* セクション6: API比較表 */}
        <Section
          title="📊 API比較表"
          copyText={`
| API | 目的 | 認証 | grant_type | User承認 | Refresh Token | 制限 |
|-----|------|------|-----------|---------|--------------|------|
| Finding | 販売済み商品検索 | なし | - | 不要 | 不要 | 5000/日 |
| Browse | 現在出品中検索 | Application Token | client_credentials | 不要 | 不要 | あり |
| Sell | 商品管理・出品 | User Token | refresh_token | 必要 | 必要 | あり |
          `}
          copiedSection={copiedSection}
          onCopy={copyToClipboard}
          sectionId="comparison"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">API</th>
                  <th className="px-4 py-3 text-left">目的</th>
                  <th className="px-4 py-3 text-left">データ</th>
                  <th className="px-4 py-3 text-left">認証</th>
                  <th className="px-4 py-3 text-left">grant_type</th>
                  <th className="px-4 py-3 text-left">User承認</th>
                  <th className="px-4 py-3 text-left">Refresh Token</th>
                  <th className="px-4 py-3 text-left">制限</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3 font-semibold">Finding API</td>
                  <td className="px-4 py-3">販売済み商品検索</td>
                  <td className="px-4 py-3">Sold Listings</td>
                  <td className="px-4 py-3">なし</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">❌ 不要</td>
                  <td className="px-4 py-3">❌ 不要</td>
                  <td className="px-4 py-3">5000/日</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-3 font-semibold">Browse API</td>
                  <td className="px-4 py-3">現在出品中検索</td>
                  <td className="px-4 py-3">Active Listings</td>
                  <td className="px-4 py-3">Application Token</td>
                  <td className="px-4 py-3">client_credentials</td>
                  <td className="px-4 py-3">❌ 不要</td>
                  <td className="px-4 py-3">❌ 不要</td>
                  <td className="px-4 py-3">あり</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold">Sell API</td>
                  <td className="px-4 py-3">商品管理・出品</td>
                  <td className="px-4 py-3">自分の商品</td>
                  <td className="px-4 py-3">User Token</td>
                  <td className="px-4 py-3">refresh_token</td>
                  <td className="px-4 py-3">✅ 必要</td>
                  <td className="px-4 py-3">✅ 必要</td>
                  <td className="px-4 py-3">あり</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* セクション7: チェックリスト */}
        <Section
          title="📝 開発時のチェックリスト"
          copyText={`
新しくeBay APIを実装する場合のチェックリスト:
- [ ] どのAPIを使用するか決定（Finding / Browse / Sell）
- [ ] 必要な認証方式を確認
- [ ] 必要な環境変数を.env.localに設定
- [ ] トークンキャッシュを実装
- [ ] エラーハンドリングを実装
- [ ] レート制限を考慮
- [ ] テストページで動作確認
          `}
          copiedSection={copiedSection}
          onCopy={copyToClipboard}
          sectionId="checklist"
        >
          <div className="space-y-2">
            <ChecklistItem text="どのAPIを使用するか決定（Finding / Browse / Sell）" />
            <ChecklistItem text="必要な認証方式を確認" />
            <ChecklistItem text="必要な環境変数を.env.localに設定" />
            <ChecklistItem text="トークンキャッシュを実装" />
            <ChecklistItem text="エラーハンドリングを実装" />
            <ChecklistItem text="レート制限を考慮" />
            <ChecklistItem text="テストページで動作確認" />
          </div>
        </Section>
      </div>
    </div>
  )
}

// コンポーネント定義
function Section({ 
  title, 
  children, 
  copyText, 
  copiedSection, 
  onCopy,
  sectionId 
}: { 
  title: string
  children: React.ReactNode
  copyText: string
  copiedSection: string | null
  onCopy: (text: string, section: string) => void
  sectionId: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button
          onClick={() => onCopy(copyText, sectionId)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition"
        >
          {copiedSection === sectionId ? '✅ コピー済み' : '📋 このセクションをコピー'}
        </button>
      </div>
      {children}
    </div>
  )
}

function ApiCard({ title, icon, purpose, auth, limit, status, statusColor }: {
  title: string
  icon: string
  purpose: string
  auth: string
  limit: string
  status: string
  statusColor: 'green' | 'yellow' | 'blue'
}) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800'
  }

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <div className="text-sm space-y-1 text-gray-600">
        <p><strong>目的:</strong> {purpose}</p>
        <p><strong>認証:</strong> {auth}</p>
        <p><strong>制限:</strong> {limit}</p>
      </div>
      <div className={`mt-3 inline-block px-3 py-1 rounded-full text-xs font-semibold ${colors[statusColor]}`}>
        {status}
      </div>
    </div>
  )
}

function AuthMethod({ title, type, grantType, required, scope, notes }: {
  title: string
  type: string
  grantType: string
  required: string[]
  scope?: string
  notes: string
}) {
  return (
    <div className="border-l-4 border-blue-500 pl-4">
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <div className="space-y-1 text-sm">
        <p><strong>認証タイプ:</strong> {type}</p>
        <p><strong>grant_type:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{grantType}</code></p>
        {scope && <p><strong>scope:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{scope}</code></p>}
        <p><strong>必要な環境変数:</strong></p>
        <ul className="list-disc list-inside ml-4">
          {required.map(env => (
            <li key={env}><code className="bg-gray-100 px-2 py-1 rounded text-xs">{env}</code></li>
          ))}
        </ul>
        <p className="text-gray-600 italic">{notes}</p>
      </div>
    </div>
  )
}

function ErrorCard({ errorCode, api, title, cause, solution }: {
  errorCode: string
  api: string
  title: string
  cause: string
  solution: string
}) {
  return (
    <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">❌</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono font-bold text-red-700">{errorCode}</span>
            <span className="text-sm text-gray-600">({api})</span>
          </div>
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-gray-700 mb-2"><strong>原因:</strong> {cause}</p>
          <p className="text-sm text-green-700"><strong>解決策:</strong> {solution}</p>
        </div>
      </div>
    </div>
  )
}

function CodeExample({ title, language, code }: {
  title: string
  language: string
  code: string
}) {
  return (
    <div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
        <pre>{code}</pre>
      </div>
    </div>
  )
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <input type="checkbox" className="w-5 h-5" />
      <span className="text-sm">{text}</span>
    </div>
  )
}
