// services/accounting/MoneyCloudConnector.ts
/**
 * マネーフォワードクラウド統合サービス
 *
 * 指示書 II.A: API連携とデータ取得の定義
 * - マネークラウドの仕訳データ取得APIを実装
 * - 銀行・クレジットカードの取引履歴（未仕訳データ）をシステムへ定期的に同期
 */

import { supabase } from '@/lib/supabase';

// ========================================
// 型定義
// ========================================

/**
 * マネークラウドのトランザクションデータ
 */
export interface MoneyCloudTransaction {
  id: string; // マネークラウドの取引ID
  date: string; // 取引日付 (YYYY-MM-DD)
  amount: number; // 金額
  description: string; // 摘要（取引内容）
  account_title?: string; // 勘定科目（仕訳済みの場合）
  sub_account?: string; // 補助科目（仕訳済みの場合）
  is_processed: boolean; // 仕訳済みフラグ
  source_type: 'BANK' | 'CREDIT_CARD'; // データソース
  source_account: string; // 銀行/カード口座名
}

/**
 * API認証情報
 */
interface MoneyCloudAuthConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unixタイムスタンプ
  officeId: string; // 事業所ID
}

/**
 * 同期結果
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  errorMessage?: string;
  syncedTransactions: MoneyCloudTransaction[];
}

// ========================================
// マネークラウド連携サービス
// ========================================

export class MoneyCloudConnectorService {
  private apiBaseUrl = 'https://api.moneyforward.com/api/v1'; // マネーフォワードクラウドAPI（仮）
  private authConfig: MoneyCloudAuthConfig | null = null;

  constructor() {
    // 環境変数から認証情報を読み込む（プロトタイプ版）
    this.loadAuthConfig();
  }

  /**
   * 認証情報を環境変数またはデータベースから読み込む
   *
   * 本番実装時には、暗号化されたトークンをSupabaseから取得する
   */
  private loadAuthConfig() {
    // プロトタイプ: 環境変数から読み込み
    const accessToken = process.env.MONEY_CLOUD_ACCESS_TOKEN;
    const refreshToken = process.env.MONEY_CLOUD_REFRESH_TOKEN;
    const officeId = process.env.MONEY_CLOUD_OFFICE_ID;

    if (accessToken && refreshToken && officeId) {
      this.authConfig = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + 3600000, // デフォルト1時間後
        officeId,
      };
    } else {
      console.warn('[MoneyCloudConnector] 認証情報が設定されていません。環境変数を確認してください。');
    }
  }

  /**
   * アクセストークンをリフレッシュ
   *
   * OAuth2のリフレッシュトークンフローを実装
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.authConfig) {
      throw new Error('認証情報が設定されていません');
    }

    try {
      // プロトタイプ: 実際のリフレッシュAPIを呼び出す
      const response = await fetch(`${this.apiBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.authConfig.refreshToken,
          client_id: process.env.MONEY_CLOUD_CLIENT_ID,
          client_secret: process.env.MONEY_CLOUD_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error(`トークンリフレッシュに失敗: ${response.statusText}`);
      }

      const data = await response.json();
      this.authConfig.accessToken = data.access_token;
      this.authConfig.expiresAt = Date.now() + data.expires_in * 1000;

      console.log('[MoneyCloudConnector] アクセストークンをリフレッシュしました');
      return true;
    } catch (error) {
      console.error('[MoneyCloudConnector] トークンリフレッシュエラー:', error);
      return false;
    }
  }

  /**
   * 銀行・クレジットカードの取引履歴を取得
   *
   * @param fromDate - 開始日 (YYYY-MM-DD)
   * @param toDate - 終了日 (YYYY-MM-DD)
   * @returns 取引データの配列
   */
  async fetchTransactions(
    fromDate: string,
    toDate: string
  ): Promise<MoneyCloudTransaction[]> {
    if (!this.authConfig) {
      throw new Error('認証情報が設定されていません。MoneyCloudの設定を確認してください。');
    }

    // トークンの有効期限チェック
    if (Date.now() >= this.authConfig.expiresAt) {
      await this.refreshAccessToken();
    }

    try {
      // プロトタイプ: 実際のAPI呼び出し
      const url = new URL(`${this.apiBaseUrl}/offices/${this.authConfig.officeId}/transactions`);
      url.searchParams.set('from', fromDate);
      url.searchParams.set('to', toDate);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API呼び出しエラー: ${response.statusText}`);
      }

      const data = await response.json();

      // マネークラウドのレスポンスを内部形式に変換
      const transactions: MoneyCloudTransaction[] = data.transactions.map((tx: any) => ({
        id: tx.id,
        date: tx.transaction_date,
        amount: tx.amount,
        description: tx.description || tx.memo || '',
        account_title: tx.account_title,
        sub_account: tx.sub_account,
        is_processed: Boolean(tx.account_title),
        source_type: tx.source_type === 'bank_account' ? 'BANK' : 'CREDIT_CARD',
        source_account: tx.account_name,
      }));

      console.log(`[MoneyCloudConnector] ${transactions.length}件の取引を取得しました`);
      return transactions;

    } catch (error) {
      console.error('[MoneyCloudConnector] 取引取得エラー:', error);
      throw error;
    }
  }

  /**
   * 取引データをシステムに同期
   *
   * 指示書 II.A-2: 連携データの同期
   * - 銀行/カードの日付、金額、摘要を同期
   * - マネークラウド側の勘定科目、補助科目を同期
   *
   * @param fromDate - 開始日
   * @param toDate - 終了日
   * @returns 同期結果
   */
  async syncTransactions(fromDate: string, toDate: string): Promise<SyncResult> {
    const syncStartTime = new Date().toISOString();
    let syncLogId: string | null = null;

    try {
      // 同期ログの開始記録
      const { data: logData, error: logError } = await supabase
        .from('money_cloud_sync_logs')
        .insert({
          sync_type: 'TRANSACTIONS',
          sync_status: 'IN_PROGRESS',
          sync_started_at: syncStartTime,
        })
        .select('id')
        .single();

      if (logError) {
        console.error('[MoneyCloudConnector] 同期ログ作成エラー:', logError);
      } else {
        syncLogId = logData.id;
      }

      // マネークラウドから取引データを取得
      const transactions = await this.fetchTransactions(fromDate, toDate);

      // 未処理（未仕訳）の取引のみをフィルタリング
      const unprocessedTransactions = transactions.filter(tx => !tx.is_processed);

      console.log(`[MoneyCloudConnector] ${unprocessedTransactions.length}件の未仕訳取引を処理します`);

      // 同期完了ログを更新
      if (syncLogId) {
        await supabase
          .from('money_cloud_sync_logs')
          .update({
            sync_status: 'SUCCESS',
            synced_records_count: unprocessedTransactions.length,
            sync_completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId);
      }

      return {
        success: true,
        syncedCount: unprocessedTransactions.length,
        syncedTransactions: unprocessedTransactions,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('[MoneyCloudConnector] 同期エラー:', errorMessage);

      // エラーログを更新
      if (syncLogId) {
        await supabase
          .from('money_cloud_sync_logs')
          .update({
            sync_status: 'FAILED',
            error_message: errorMessage,
            sync_completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId);
      }

      return {
        success: false,
        syncedCount: 0,
        errorMessage,
        syncedTransactions: [],
      };
    }
  }

  /**
   * 定期同期を実行（週次/日次など）
   *
   * 本番実装時には、CronジョブやNext.jsのAPI Routeから呼び出す
   */
  async runPeriodicSync(): Promise<SyncResult> {
    // デフォルト: 過去7日間の取引を同期
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const toDate = today.toISOString().split('T')[0];
    const fromDate = weekAgo.toISOString().split('T')[0];

    console.log(`[MoneyCloudConnector] 定期同期を開始: ${fromDate} ~ ${toDate}`);
    return this.syncTransactions(fromDate, toDate);
  }
}

// ========================================
// エクスポート
// ========================================

/**
 * シングルトンインスタンス
 */
export const moneyCloudConnector = new MoneyCloudConnectorService();
