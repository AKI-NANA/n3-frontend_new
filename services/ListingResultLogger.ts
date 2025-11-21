/**
 * 出品結果ログ管理サービス
 * API呼び出し結果の記録とステータス更新
 */

import { createClient } from '@/lib/supabase/server';
import { Platform } from '@/types/strategy';
import { ListingStatus, ListingResultLog, ApiCallResult } from '@/types/api-credentials';

export class ListingResultLogger {
  /**
   * 出品成功時のログ記録とステータス更新
   */
  static async logSuccess(
    sku: string,
    platform: Platform,
    accountId: number,
    listingId: string
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // 1. Listing Result Logに記録
      await supabase.from('listing_result_logs').insert({
        sku,
        platform,
        account_id: accountId,
        status: '出品中' as ListingStatus,
        listing_id: listingId,
        success: true,
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 2. Products Masterのステータスと実行ステータスを更新
      await supabase
        .from('products_master')
        .update({
          status: '出品中',
          execution_status: 'listed',
          updated_at: new Date().toISOString(),
        })
        .eq('sku', sku);

      // 3. Listing Dataテーブルに出品情報を記録
      await supabase.from('listing_data').insert({
        sku,
        platform,
        account_id: accountId,
        listing_id: listingId,
        status: 'active',
        listed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      console.log(`✅ 出品成功ログ記録: ${sku} → ${platform} #${accountId} (ID: ${listingId})`);
    } catch (error) {
      console.error(`❌ 出品成功ログ記録エラー: ${sku}`, error);
    }
  }

  /**
   * 出品失敗時のログ記録とステータス更新
   */
  static async logFailure(
    sku: string,
    platform: Platform,
    accountId: number,
    result: ApiCallResult,
    retryCount: number = 0
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // エラーの深刻度を判定
      const isFatalError = this.isFatalError(result.error?.code);
      const newStatus: ListingStatus = isFatalError
        ? '出品失敗（要確認）'
        : result.retryable
        ? 'APIリトライ待ち'
        : '出品失敗（要確認）';

      const executionStatus = result.retryable ? 'api_retry_pending' : 'listing_failed';

      // 1. Listing Result Logに記録
      await supabase.from('listing_result_logs').insert({
        sku,
        platform,
        account_id: accountId,
        status: newStatus,
        success: false,
        error_code: result.error?.code || 'UNKNOWN',
        error_message: result.error?.message || 'Unknown error',
        error_details: result.error?.details || null,
        retry_count: retryCount,
        last_retry_at: retryCount > 0 ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 2. Products Masterのステータスと実行ステータスを更新
      await supabase
        .from('products_master')
        .update({
          status: newStatus,
          execution_status: executionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('sku', sku);

      console.error(
        `❌ 出品失敗ログ記録: ${sku} → ${platform} #${accountId}\n` +
          `   エラーコード: ${result.error?.code}\n` +
          `   メッセージ: ${result.error?.message}\n` +
          `   新ステータス: ${newStatus}`
      );
    } catch (error) {
      console.error(`❌ 出品失敗ログ記録エラー: ${sku}`, error);
    }
  }

  /**
   * リトライ待ち商品の取得
   */
  static async getRetryQueue(maxRetryCount: number = 3): Promise<ListingResultLog[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('listing_result_logs')
      .select('*')
      .eq('status', 'APIリトライ待ち')
      .lt('retry_count', maxRetryCount)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error || !data) {
      console.error('❌ リトライキュー取得エラー', error);
      return [];
    }

    return data as ListingResultLog[];
  }

  /**
   * リトライカウントを増加
   */
  static async incrementRetryCount(logId: number): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('listing_result_logs')
      .update({
        retry_count: supabase.rpc('increment_retry_count', { log_id: logId }),
        last_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('log_id', logId);
  }

  /**
   * 致命的なエラーか判定
   * 致命的なエラー: リトライ不要、手動確認が必要
   */
  private static isFatalError(errorCode?: string): boolean {
    if (!errorCode) return false;

    const fatalErrors = [
      // eBay
      '93200', // VERO違反
      '21919301', // アカウント停止
      '21919303', // カテゴリー許可なし
      // Amazon
      'MISSING_ASIN',
      'INVALID_PRODUCT_TYPE',
      // Coupang
      'MISSING_KOREAN_TEXT',
      'INVALID_CATEGORY',
    ];

    return fatalErrors.includes(errorCode);
  }

  /**
   * エラー統計の取得
   */
  static async getErrorStatistics(
    platform?: Platform,
    days: number = 7
  ): Promise<Record<string, number>> {
    const supabase = await createClient();

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    let query = supabase
      .from('listing_result_logs')
      .select('error_code')
      .eq('success', false)
      .gte('created_at', sinceDate.toISOString());

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error || !data) {
      return {};
    }

    // エラーコード別に集計
    const statistics: Record<string, number> = {};
    data.forEach((log) => {
      const code = log.error_code || 'UNKNOWN';
      statistics[code] = (statistics[code] || 0) + 1;
    });

    return statistics;
  }
}
