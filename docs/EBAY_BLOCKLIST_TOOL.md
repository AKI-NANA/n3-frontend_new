# eBay ブロックバイヤーリスト自動登録ツール

## 📋 概要

N3参加者間で共有する問題のあるバイヤーリストを、各参加者のeBayアカウントのブロックバイヤーリスト（Blocked Buyer List）へ自動的に追加するツールです。

### 主な機能

- **バイヤー報告**: 問題のあるバイヤーを報告
- **報告管理**: 他の参加者からの報告を承認・拒否
- **自動同期**: 承認済みリストをeBayアカウントに自動同期
- **統計ダッシュボード**: リアルタイムの統計情報
- **定期自動更新**: 毎日深夜に自動的に同期

## 🎯 技術仕様

### 使用API

- **eBay Account API** ([ドキュメント](https://developer.ebay.com/api-docs/sell/account/overview.html))
  - `GET /sell/account/v1/restricted_user_list`: 既存のブロックリストを取得
  - `PUT /sell/account/v1/restricted_user_list`: ブロックリストを更新

### データベーススキーマ

#### 1. `ebay_user_tokens`
各参加者のeBay認証トークンを保存

```sql
- id: UUID (主キー)
- user_id: UUID (外部キー → auth.users)
- ebay_user_id: TEXT (eBayユーザーID)
- access_token: TEXT (アクセストークン)
- refresh_token: TEXT (リフレッシュトークン)
- token_expires_at: TIMESTAMPTZ (有効期限)
- is_active: BOOLEAN
- last_sync_at: TIMESTAMPTZ (最終同期日時)
```

#### 2. `ebay_blocked_buyers`
共有ブロックバイヤーリスト

```sql
- id: UUID (主キー)
- buyer_username: TEXT (バイヤー名、ユニーク)
- status: TEXT (pending/approved/rejected)
- reason: TEXT (ブロック理由)
- severity: TEXT (low/medium/high/critical)
- reported_by: UUID (報告者)
- approved_by: UUID (承認者)
- is_active: BOOLEAN
```

#### 3. `blocked_buyer_reports`
バイヤー報告履歴

```sql
- id: UUID (主キー)
- buyer_username: TEXT
- reported_by: UUID (報告者)
- reason: TEXT (報告理由)
- severity: TEXT
- evidence: TEXT (証拠)
- status: TEXT (pending/approved/rejected)
- reviewed_by: UUID (レビュー者)
```

#### 4. `ebay_blocklist_sync_history`
同期履歴

```sql
- id: UUID (主キー)
- user_id: UUID
- sync_type: TEXT (manual/automatic/scheduled)
- buyers_added: INTEGER
- buyers_removed: INTEGER
- total_buyers: INTEGER
- status: TEXT (success/failed/partial)
```

## 🚀 セットアップ

### 1. データベースのセットアップ

```bash
# Supabase SQLエディタで実行
psql -f database/schema-blocked-buyers.sql
```

または、Supabaseダッシュボードから `database/schema-blocked-buyers.sql` を実行してください。

### 2. 環境変数の設定

`.env.local` に以下を追加：

```env
# eBay API認証情報
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret
EBAY_REFRESH_TOKEN=your_refresh_token

# Cron認証（本番環境）
CRON_SECRET=your_random_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. eBay OAuth設定

#### 手順

1. [eBay Developers Program](https://developer.ebay.com/) にサインアップ
2. アプリケーションを作成し、以下のスコープを有効化：
   - `https://api.ebay.com/oauth/api_scope/sell.account`
3. OAuth 2.0認証フローでリフレッシュトークンを取得
4. 環境変数に設定

#### リフレッシュトークン取得例

```bash
# OAuth認証URLを生成
https://auth.ebay.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI&scope=https://api.ebay.com/oauth/api_scope/sell.account

# 認証後、コードを使ってトークンを取得
curl -X POST 'https://api.ebay.com/identity/v1/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Authorization: Basic BASE64_ENCODED_CREDENTIALS' \
  -d 'grant_type=authorization_code&code=YOUR_CODE&redirect_uri=YOUR_REDIRECT_URI'
```

### 4. 自動同期の設定

#### Vercelを使用する場合

`vercel.json` がすでに設定されているため、デプロイするだけで自動的に有効化されます。

#### GitHub Actionsを使用する場合

1. GitHub Secretsに以下を追加：
   - `CRON_SECRET`: ランダムな秘密キー
   - `APP_URL`: デプロイされたアプリのURL

2. `.github/workflows/sync-blocklist.yml` をプッシュ

## 📖 使用方法

### 参加者向け

#### 1. バイヤーを報告

1. `/tools/ebay-blocklist` にアクセス
2. 「バイヤーを報告」タブを選択
3. フォームに情報を入力：
   - バイヤーユーザー名（必須）
   - 深刻度（low/medium/high/critical）
   - ブロック理由（必須）
   - 証拠（オプション）
4. 「バイヤーを報告」ボタンをクリック

#### 2. eBayに同期

1. 「ブロックリスト同期」セクションで「eBayに同期」ボタンをクリック
2. 既存のブロックリストと共有リストが統合されます
3. 同期結果が表示されます

### 管理者向け

#### 報告を確認・承認

1. 「報告を管理」タブを選択
2. ペンディング中の報告を確認
3. 各報告に対して：
   - **承認**: 「承認」ボタンをクリック → 共有リストに追加
   - **拒否**: 「拒否」ボタンをクリック → 報告を却下

## 🔒 セキュリティ

### Row Level Security (RLS)

すべてのテーブルでRLSが有効化されており、以下のポリシーが適用されます：

- **ebay_user_tokens**: ユーザーは自分のトークンのみアクセス可能
- **ebay_blocked_buyers**: 全ユーザーが承認済みリストを閲覧可能
- **blocked_buyer_reports**: ユーザーは自分の報告と承認済み報告を閲覧可能

### トークンの保護

- トークンはデータベースに暗号化して保存することを推奨
- 本番環境では、トークンの暗号化ライブラリ（例：`crypto`）を使用

### Cron認証

- `CRON_SECRET` 環境変数を設定し、不正なリクエストを防止
- 本番環境では強力なランダム文字列を使用

## ⚠️ 重要な注意事項

### API制限

- eBayのブロックリストは最大**5,000〜6,000件**の制限があります
- 共有リストがこの制限を超えないように管理してください
- システムは自動的に制限を超えた場合に切り詰めます

### 既存リストの保護

- `setRestrictedUserList` APIは**リスト全体を上書き**します
- 同期時は必ず既存のリストを取得してマージします
- `lib/ebay-account-api.ts` の `syncBlocklistToEbay` 関数がこれを処理します

### レート制限

- eBay APIにはレート制限があります
- 大量のユーザーを同期する場合は、適切な遅延を入れてください
- 現在の実装では、各ユーザー間に1秒の遅延を設定しています

### 悪用防止

- 悪意のある報告は厳しく対処します
- 報告には承認プロセスが必要です
- すべての報告と同期はログに記録されます

## 🧪 テスト

### 手動テスト

1. **バイヤー報告のテスト**
   ```bash
   curl -X POST http://localhost:3000/api/ebay/blocklist/report \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "test-user-id",
       "buyer_username": "test_buyer",
       "reason": "Test reason",
       "severity": "medium"
     }'
   ```

2. **同期のテスト**
   ```bash
   curl -X POST http://localhost:3000/api/ebay/blocklist/sync \
     -H "Content-Type: application/json" \
     -d '{"userId": "test-user-id"}'
   ```

3. **Cron同期のテスト**
   ```bash
   curl -X GET http://localhost:3000/api/ebay/blocklist/cron-sync \
     -H "Authorization: Bearer your_cron_secret"
   ```

## 📊 APIエンドポイント

| エンドポイント | メソッド | 説明 |
|------------|--------|------|
| `/api/ebay/blocklist/report` | POST | バイヤーを報告 |
| `/api/ebay/blocklist/report` | GET | ペンディング中の報告を取得 |
| `/api/ebay/blocklist/approve` | POST | 報告を承認 |
| `/api/ebay/blocklist/buyers` | GET | 承認済みバイヤーを取得 |
| `/api/ebay/blocklist/sync` | POST | 手動でブロックリストを同期 |
| `/api/ebay/blocklist/stats` | GET | 統計情報を取得 |
| `/api/ebay/blocklist/cron-sync` | GET | 定期実行用の自動同期 |

## 🔧 トラブルシューティング

### トークンエラー

**エラー**: "eBay token not found"

**解決策**:
1. eBayアカウントを接続していることを確認
2. `ebay_user_tokens` テーブルに有効なトークンがあることを確認

### 同期失敗

**エラー**: "Failed to sync blocklist"

**解決策**:
1. トークンが有効期限切れでないか確認
2. eBay APIの認証情報が正しいか確認
3. ネットワーク接続を確認
4. `ebay_blocklist_sync_history` テーブルでエラーメッセージを確認

### ブロックリストサイズ超過

**エラー**: "Blocklist size exceeds maximum limit"

**解決策**:
1. 共有リストのサイズを確認
2. 不要なバイヤーを削除
3. 優先度の低いバイヤーを削除

## 🤝 貢献

バグ報告や機能リクエストは、GitHubのIssuesで受け付けています。

## 📝 ライセンス

このプロジェクトは[ライセンス名]の下でライセンスされています。

## 🔗 関連リンク

- [eBay Account API Documentation](https://developer.ebay.com/api-docs/sell/account/overview.html)
- [eBay OAuth Guide](https://developer.ebay.com/api-docs/static/oauth-tokens.html)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
