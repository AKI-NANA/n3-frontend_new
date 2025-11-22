// 📁 格納パス: lib/google/GoogleCalendarClient.ts
// 依頼内容: Googleカレンダー連携の基盤実装（インターフェース定義）

/**
 * Googleカレンダーのイベント型
 */
export interface CalendarEvent {
  id: string;
  summary: string; // イベントタイトル
  description?: string;
  start: string; // 開始日時 (ISO 8601)
  end: string; // 終了日時 (ISO 8601)
  dueDate?: string; // 期限日（タスクの場合）
}

/**
 * Googleカレンダークライアント
 *
 * 🚧 実装予定の機能:
 * - Google OAuth 2.0認証フロー
 * - カレンダーイベントの取得
 * - 支払期限タスクの自動取得
 *
 * 📝 使用方法:
 * 1. Google Cloud Consoleでプロジェクトを作成
 * 2. Google Calendar APIを有効化
 * 3. OAuth 2.0クライアントIDを作成
 * 4. 環境変数に設定:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - GOOGLE_REDIRECT_URI
 */
export class GoogleCalendarClient {
  private accessToken: string | null = null;

  /**
   * OAuth 2.0認証URLを生成
   */
  getAuthUrl(): string {
    // 実装予定: Google OAuth 2.0認証URLを生成
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
    const scope = "https://www.googleapis.com/auth/calendar.readonly";

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  async authenticate(code: string): Promise<void> {
    // 実装予定: 認証コードを使ってアクセストークンを取得
    console.log("Google Calendar authentication not yet implemented");
    this.accessToken = "mock_access_token";
  }

  /**
   * 本日期限のイベントを取得
   */
  async getTodayDueEvents(): Promise<CalendarEvent[]> {
    // 実装予定: 今日が期限のイベントをGoogle Calendar APIから取得
    console.log("Google Calendar getTodayDueEvents not yet implemented");

    // モックデータを返す
    return [
      {
        id: "event_001",
        summary: "仕入先への支払い",
        description: "請求書 #12345の支払い期限",
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        dueDate: new Date().toISOString().split("T")[0],
      },
      {
        id: "event_002",
        summary: "クレジットカード決済",
        description: "月次決済",
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        dueDate: new Date().toISOString().split("T")[0],
      },
    ];
  }

  /**
   * 特定の期間のイベントを取得
   */
  async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    // 実装予定: 指定期間のイベントを取得
    console.log(`Google Calendar getEvents not yet implemented (${startDate} - ${endDate})`);
    return [];
  }
}

/**
 * Googleカレンダークライアントのシングルトンインスタンス
 */
let calendarClientInstance: GoogleCalendarClient | null = null;

export function getGoogleCalendarClient(): GoogleCalendarClient {
  if (!calendarClientInstance) {
    calendarClientInstance = new GoogleCalendarClient();
  }
  return calendarClientInstance;
}
