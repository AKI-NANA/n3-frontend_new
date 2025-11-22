# Google連携サービス

このディレクトリには、Google APIとの連携サービスが含まれています。

## GoogleCalendarClient.ts

Googleカレンダーとの連携を提供するクライアントクラスです。

### 機能

- **OAuth 2.0認証**: Googleアカウントでの認証
- **カレンダーイベント取得**: 支払期限タスクなどのイベントを取得
- **本日期限のタスク取得**: ダッシュボードのアラート機能に統合

### 実装状況

🚧 **現在**: インターフェース定義とモック実装のみ
🔜 **今後**: Google OAuth 2.0認証フローと実際のAPI連携を実装予定

### セットアップ手順（将来の実装用）

1. **Google Cloud Consoleでプロジェクトを作成**
   - https://console.cloud.google.com/
   - 新しいプロジェクトを作成

2. **Google Calendar APIを有効化**
   - APIとサービス > ライブラリ
   - "Google Calendar API"を検索して有効化

3. **OAuth 2.0クライアントIDを作成**
   - APIとサービス > 認証情報
   - 認証情報を作成 > OAuth クライアント ID
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのリダイレクトURIを設定

4. **環境変数を設定**
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

### 使用例

```typescript
import { getGoogleCalendarClient } from '@/lib/google/GoogleCalendarClient';

// 本日期限のイベントを取得
const client = getGoogleCalendarClient();
const todayEvents = await client.getTodayDueEvents();

// ダッシュボードのアラートに表示
const paymentDueCount = todayEvents.length;
```

### 参考リンク

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
