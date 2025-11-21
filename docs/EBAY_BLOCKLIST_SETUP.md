# eBay ブロックバイヤーリストツール - クイックセットアップガイド

## 🚀 クイックスタート（5分で開始）

### ステップ1: データベースのセットアップ

1. Supabaseダッシュボードにログイン
2. SQLエディタを開く
3. `database/schema-blocked-buyers.sql` の内容をコピー＆ペースト
4. 実行ボタンをクリック

### ステップ2: 環境変数の設定

`.env.local` ファイルを作成し、以下を追加：

```env
# eBay API（必須）
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_REFRESH_TOKEN=your_ebay_refresh_token

# Supabase（必須）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cron認証（本番環境のみ）
CRON_SECRET=your_random_secret_key
```

### ステップ3: アプリケーションを起動

```bash
npm install
npm run dev
```

### ステップ4: ツールにアクセス

ブラウザで以下にアクセス：
```
http://localhost:3000/tools/ebay-blocklist
```

## 📋 eBay OAuth トークンの取得方法

### 方法1: eBay Developer Programを使用（推奨）

1. **アプリケーションを作成**
   - [eBay Developers](https://developer.ebay.com/) にアクセス
   - "My Account" → "Application Keys" を選択
   - 新しいアプリケーションを作成

2. **スコープを設定**
   - `https://api.ebay.com/oauth/api_scope/sell.account` を有効化

3. **OAuth認証を実行**

   以下のURLをブラウザで開く（CLIENT_IDを置き換え）：
   ```
   https://auth.ebay.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI&scope=https://api.ebay.com/oauth/api_scope/sell.account
   ```

4. **認証コードを取得**
   - eBayにログインして承認
   - リダイレクトURLからコードを取得

5. **リフレッシュトークンを取得**

   ```bash
   # Base64エンコード: CLIENT_ID:CLIENT_SECRET
   echo -n "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" | base64

   # トークンリクエスト
   curl -X POST 'https://api.ebay.com/identity/v1/oauth2/token' \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     -H 'Authorization: Basic YOUR_BASE64_CREDENTIALS' \
     -d 'grant_type=authorization_code&code=YOUR_AUTH_CODE&redirect_uri=YOUR_REDIRECT_URI'
   ```

6. **レスポンスから `refresh_token` を取得して `.env.local` に保存**

### 方法2: OAuth Helper Tool を使用

eBayの公式OAuth Helper Toolを使用して簡単に取得できます：
https://developer.ebay.com/my/auth/?env=production&index=0

## 🔐 セキュリティベストプラクティス

### トークンの暗号化

本番環境では、トークンを暗号化して保存することを強く推奨します。

```typescript
// lib/crypto-helper.ts
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // 32バイト
const IV_LENGTH = 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encrypted = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}
```

使用例：
```typescript
// トークンを保存する前に暗号化
const encryptedToken = encrypt(accessToken)
await supabase.from('ebay_user_tokens').insert({
  access_token: encryptedToken,
  // ...
})

// トークンを使用する前に復号化
const decryptedToken = decrypt(token.access_token)
```

### CRON_SECRETの生成

```bash
# Linuxの場合
openssl rand -base64 32

# Node.jsの場合
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🧪 動作確認

### 1. データベース接続のテスト

Supabaseダッシュボードで以下のクエリを実行：

```sql
SELECT * FROM ebay_user_tokens LIMIT 1;
SELECT * FROM ebay_blocked_buyers LIMIT 1;
```

### 2. API接続のテスト

ターミナルで以下を実行：

```bash
# 統計情報を取得
curl http://localhost:3000/api/ebay/blocklist/stats

# バイヤー報告（テスト）
curl -X POST http://localhost:3000/api/ebay/blocklist/report \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "buyer_username": "test_buyer",
    "reason": "Test report",
    "severity": "medium"
  }'
```

### 3. UI動作確認

1. `http://localhost:3000/tools/ebay-blocklist` にアクセス
2. 統計ダッシュボードが表示されるか確認
3. バイヤー報告フォームが動作するか確認

## 🚢 デプロイ

### Vercelへのデプロイ

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Add eBay blocklist tool"
   git push origin main
   ```

2. **Vercelプロジェクトを作成**
   - [Vercel](https://vercel.com) にアクセス
   - GitHubリポジトリをインポート

3. **環境変数を設定**
   - Vercel Dashboard → Settings → Environment Variables
   - `.env.local` の内容をすべて追加

4. **デプロイ**
   - Vercelが自動的にデプロイを開始
   - Cron Jobも自動的に有効化されます（`vercel.json` で設定済み）

5. **CRON_SECRETを設定（重要）**
   - Environment Variablesに `CRON_SECRET` を追加
   - 強力なランダム文字列を使用

### GitHub Actionsのセットアップ（オプション）

Vercel Cronの代わりにGitHub Actionsを使用する場合：

1. **GitHub Secretsを設定**
   - リポジトリ → Settings → Secrets and variables → Actions
   - 以下を追加：
     - `CRON_SECRET`: ランダムな秘密キー
     - `APP_URL`: デプロイされたアプリのURL（例：https://your-app.vercel.app）

2. **ワークフローをプッシュ**
   ```bash
   git add .github/workflows/sync-blocklist.yml
   git commit -m "Add auto-sync workflow"
   git push
   ```

3. **動作確認**
   - リポジトリ → Actions → "eBay Blocklist Auto Sync"
   - "Run workflow" で手動実行してテスト

## 📊 モニタリング

### 同期履歴の確認

Supabaseダッシュボードで以下のクエリを実行：

```sql
-- 最近の同期履歴
SELECT * FROM ebay_blocklist_sync_history
ORDER BY created_at DESC
LIMIT 10;

-- 失敗した同期
SELECT * FROM ebay_blocklist_sync_history
WHERE status = 'failed'
ORDER BY created_at DESC;

-- ユーザー別の同期統計
SELECT
  user_id,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
  AVG(sync_duration_ms) as avg_duration
FROM ebay_blocklist_sync_history
GROUP BY user_id;
```

### ログの確認

Vercelダッシュボードでリアルタイムログを確認：
- Deployment → Functions → Logs

## ❓ よくある質問

### Q: トークンの有効期限は？
A: eBayのアクセストークンは2時間、リフレッシュトークンは18ヶ月有効です。システムは自動的にリフレッシュトークンを使用してアクセストークンを更新します。

### Q: 複数のeBayアカウントをサポートできますか？
A: はい。各ユーザーは独自のeBayトークンを持つことができます。

### Q: ブロックリストの最大サイズは？
A: eBay APIの制限により、5,000〜6,000件が上限です。

### Q: 同期頻度を変更できますか？
A: はい。`vercel.json` または `.github/workflows/sync-blocklist.yml` のcronスケジュールを変更してください。

### Q: ロールバックは可能ですか？
A: 同期前のリストは `ebay_blocklist_sync_history` に記録されていますが、自動ロールバック機能はありません。手動でリストを復元する必要があります。

## 🆘 サポート

問題が発生した場合は、以下を確認してください：

1. `ebay_blocklist_sync_history` テーブルのエラーメッセージ
2. Vercel/GitHub Actionsのログ
3. Supabaseのログ
4. ブラウザのコンソールエラー

それでも解決しない場合は、GitHubのIssuesで報告してください。
