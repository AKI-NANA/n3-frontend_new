/**
 * ロック解除サービス
 *
 * execution_status='listing_failed' の商品を自動的に再評価対象に戻す
 * - 一定期間経過後（例: 24時間）
 * - 在庫・価格などの条件変更時
 * - エラー状態が解消された場合
 */

import { createClient } from '@/utils/supabase/server';

interface FailedListing {
  sku: string;
  execution_status: string;
  stock_quantity: number;
  price_jpy: number;
  updated_at: string;
}

interface LockReleaseConfig {
  cooldownHours: number; // 失敗後の待機時間（時間）
  requireStockIncrease: boolean; // 在庫増加を必須とするか
  requirePriceChange: boolean; // 価格変更を必須とするか
}

/**
 * ロック解除サービス
 */
export class LockReleaseService {
  private supabase: ReturnType<typeof createClient>;
  private config: LockReleaseConfig;

  constructor(
    supabase: ReturnType<typeof createClient>,
    config: Partial<LockReleaseConfig> = {}
  ) {
    this.supabase = supabase;
    this.config = {
      cooldownHours: config.cooldownHours || 24,
      requireStockIncrease: config.requireStockIncrease ?? false,
      requirePriceChange: config.requirePriceChange ?? false,
    };
  }

  /**
   * ロック解除候補を取得
   */
  private async getFailedListings(): Promise<FailedListing[]> {
    const { data: listings, error } = await this.supabase
      .from('products_master')
      .select('sku, execution_status, stock_quantity, price_jpy, updated_at')
      .eq('execution_status', 'listing_failed')
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('[LockRelease] Failed to get failed listings:', error);
      return [];
    }

    return (listings || []) as FailedListing[];
  }

  /**
   * 最後のエラー情報を取得
   */
  private async getLastError(sku: string): Promise<{
    errorCode?: string;
    errorMessage?: string;
    failedAt?: string;
    stockAtFailure?: number;
    priceAtFailure?: number;
  }> {
    // execution_logs から最後の失敗ログを取得
    const { data: log } = await this.supabase
      .from('execution_logs')
      .select('error_code, error_message, executed_at')
      .eq('sku', sku)
      .eq('success', false)
      .order('executed_at', { ascending: false })
      .limit(1)
      .single();

    if (!log) {
      return {};
    }

    // 失敗時の在庫・価格を取得（stock_logsとprice_logsから）
    const failedAt = log.executed_at;

    const { data: stockLog } = await this.supabase
      .from('stock_logs')
      .select('new_quantity')
      .eq('sku', sku)
      .lte('changed_at', failedAt)
      .order('changed_at', { ascending: false })
      .limit(1)
      .single();

    const { data: priceLog } = await this.supabase
      .from('price_logs')
      .select('price_jpy')
      .eq('sku', sku)
      .lte('changed_at', failedAt)
      .order('changed_at', { ascending: false })
      .limit(1)
      .single();

    return {
      errorCode: log.error_code,
      errorMessage: log.error_message,
      failedAt,
      stockAtFailure: stockLog?.new_quantity,
      priceAtFailure: priceLog?.price_jpy,
    };
  }

  /**
   * ロック解除可否を判定
   */
  private async shouldReleaseLock(
    listing: FailedListing
  ): Promise<{ shouldRelease: boolean; reason: string }> {
    // 最後のエラー情報を取得
    const errorInfo = await this.getLastError(listing.sku);

    if (!errorInfo.failedAt) {
      // エラーログがない場合は解除（データ不整合の可能性）
      return {
        shouldRelease: true,
        reason: 'エラーログが見つからないため解除',
      };
    }

    // 1. クールダウン期間のチェック
    const failedDate = new Date(errorInfo.failedAt);
    const cooldownEndDate = new Date(
      failedDate.getTime() + this.config.cooldownHours * 60 * 60 * 1000
    );
    const now = new Date();

    if (now < cooldownEndDate) {
      return {
        shouldRelease: false,
        reason: `クールダウン期間中（${cooldownEndDate.toISOString()}まで待機）`,
      };
    }

    // 2. 在庫増加チェック（オプション）
    if (this.config.requireStockIncrease && errorInfo.stockAtFailure !== undefined) {
      if (listing.stock_quantity <= errorInfo.stockAtFailure) {
        return {
          shouldRelease: false,
          reason: '在庫が増加していません',
        };
      }
    }

    // 3. 価格変更チェック（オプション）
    if (this.config.requirePriceChange && errorInfo.priceAtFailure !== undefined) {
      if (listing.price_jpy === errorInfo.priceAtFailure) {
        return {
          shouldRelease: false,
          reason: '価格が変更されていません',
        };
      }
    }

    // 4. 基本条件チェック（在庫と価格が有効か）
    if (listing.stock_quantity < 1) {
      return {
        shouldRelease: false,
        reason: '在庫数が0です',
      };
    }

    if (listing.price_jpy <= 0 || isNaN(listing.price_jpy)) {
      return {
        shouldRelease: false,
        reason: '価格が無効です',
      };
    }

    // 5. エラーコード別の判定
    const errorCode = errorInfo.errorCode;

    // 致命的エラーコードのリスト（自動解除しない）
    const permanentErrorCodes = [
      'UNSUPPORTED_PLATFORM',
      'INVALID_CREDENTIALS',
      'ACCOUNT_SUSPENDED',
      'VERO_VIOLATION',
      'PROHIBITED_ITEM',
    ];

    if (errorCode && permanentErrorCodes.includes(errorCode)) {
      return {
        shouldRelease: false,
        reason: `致命的エラー (${errorCode}) のため自動解除不可`,
      };
    }

    // すべての条件を満たした場合は解除
    return {
      shouldRelease: true,
      reason: `クールダウン期間終了、条件を満たしているため解除`,
    };
  }

  /**
   * ロックを解除
   */
  private async releaseLock(
    sku: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[LockRelease] Releasing lock for SKU=${sku}: ${reason}`);

    try {
      // execution_status を strategy_determined に戻す
      const { error } = await this.supabase
        .from('products_master')
        .update({
          execution_status: 'strategy_determined',
          updated_at: new Date().toISOString(),
        })
        .eq('sku', sku);

      if (error) {
        console.error(`[LockRelease] Failed to release lock for SKU=${sku}:`, error);
        return { success: false, error: error.message };
      }

      // listing_data のエラー状態をクリア
      await this.supabase
        .from('listing_data')
        .update({
          status: 'Draft',
          error_message: null,
        })
        .eq('sku', sku)
        .eq('status', 'Error');

      // ログを記録
      await this.supabase.from('execution_logs').insert({
        sku,
        platform: null,
        account_id: null,
        success: true,
        error_type: null,
        error_code: 'LOCK_RELEASED',
        error_message: reason,
        executed_at: new Date().toISOString(),
      });

      console.log(`[LockRelease] Lock released successfully for SKU=${sku}`);
      return { success: true };
    } catch (error) {
      console.error(`[LockRelease] Exception releasing lock for SKU=${sku}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * メイン実行メソッド
   */
  async execute(): Promise<{
    totalProcessed: number;
    releasedCount: number;
    skippedCount: number;
    details: Array<{ sku: string; released: boolean; reason: string }>;
  }> {
    console.log('[LockRelease] Starting lock release batch');

    // 失敗状態の商品を取得
    const failedListings = await this.getFailedListings();

    if (failedListings.length === 0) {
      console.log('[LockRelease] No failed listings found');
      return {
        totalProcessed: 0,
        releasedCount: 0,
        skippedCount: 0,
        details: [],
      };
    }

    console.log(`[LockRelease] Found ${failedListings.length} failed listings to evaluate`);

    let releasedCount = 0;
    let skippedCount = 0;
    const details: Array<{ sku: string; released: boolean; reason: string }> = [];

    // 各商品を評価
    for (const listing of failedListings) {
      const decision = await this.shouldReleaseLock(listing);

      if (decision.shouldRelease) {
        const result = await this.releaseLock(listing.sku, decision.reason);

        if (result.success) {
          releasedCount++;
          details.push({
            sku: listing.sku,
            released: true,
            reason: decision.reason,
          });
        } else {
          skippedCount++;
          details.push({
            sku: listing.sku,
            released: false,
            reason: `解除処理失敗: ${result.error}`,
          });
        }
      } else {
        skippedCount++;
        details.push({
          sku: listing.sku,
          released: false,
          reason: decision.reason,
        });
      }
    }

    console.log(
      `[LockRelease] Batch complete: ${releasedCount} released, ${skippedCount} skipped`
    );

    return {
      totalProcessed: failedListings.length,
      releasedCount,
      skippedCount,
      details,
    };
  }
}
