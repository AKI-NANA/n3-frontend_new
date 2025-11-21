/**
 * 排他的ロック管理サービス
 * アカウント重複禁止（同一SKUを複数アカウント/モールに同時出品しない）
 */

import { createClient } from '@/lib/supabase/server';
import { Platform } from '@/types/strategy';
import { ExclusiveLock } from '@/types/api-credentials';

export class ExclusiveLockManager {
  /**
   * SKUにロックを設定
   * 出品成功後、他のアカウント/モールへの出品を禁止
   */
  static async acquireLock(
    sku: string,
    platform: Platform,
    accountId: number,
    reason: 'listing_active' | 'duplicate_prevention' = 'listing_active'
  ): Promise<boolean> {
    const supabase = await createClient();

    try {
      // 既存のアクティブなロックをチェック
      const existingLock = await this.getActiveLock(sku);

      if (existingLock) {
        console.warn(
          `⚠️ SKU ${sku} は既に ${existingLock.locked_platform} #${existingLock.locked_account_id} にロックされています`
        );
        return false;
      }

      // 新規ロックを作成
      const { data, error } = await supabase
        .from('exclusive_locks')
        .insert({
          sku,
          locked_platform: platform,
          locked_account_id: accountId,
          reason,
          is_active: true,
          locked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ ロック取得失敗: ${sku}`, error);
        return false;
      }

      console.log(`🔒 ロック取得成功: ${sku} → ${platform} #${accountId}`);
      return true;
    } catch (error) {
      console.error(`❌ ロック取得エラー: ${sku}`, error);
      return false;
    }
  }

  /**
   * SKUのロックを解除
   * 出品停止時に呼び出し、他のアカウントでの出品を再度可能にする
   */
  static async releaseLock(sku: string): Promise<boolean> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from('exclusive_locks')
        .update({
          is_active: false,
          unlocked_at: new Date().toISOString(),
        })
        .eq('sku', sku)
        .eq('is_active', true);

      if (error) {
        console.error(`❌ ロック解除失敗: ${sku}`, error);
        return false;
      }

      console.log(`🔓 ロック解除成功: ${sku}`);
      return true;
    } catch (error) {
      console.error(`❌ ロック解除エラー: ${sku}`, error);
      return false;
    }
  }

  /**
   * SKUのアクティブなロックを取得
   */
  static async getActiveLock(sku: string): Promise<ExclusiveLock | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('exclusive_locks')
      .select('*')
      .eq('sku', sku)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as ExclusiveLock;
  }

  /**
   * SKUがロックされているか確認
   */
  static async isLocked(sku: string): Promise<boolean> {
    const lock = await this.getActiveLock(sku);
    return lock !== null;
  }

  /**
   * 特定のプラットフォーム・アカウントでロックされているか確認
   */
  static async isLockedBy(
    sku: string,
    platform: Platform,
    accountId: number
  ): Promise<boolean> {
    const lock = await this.getActiveLock(sku);

    if (!lock) return false;

    return lock.locked_platform === platform && lock.locked_account_id === accountId;
  }

  /**
   * 戦略エンジンの候補から、ロックされたプラットフォーム・アカウントを除外
   */
  static async filterCandidatesByLock(
    sku: string,
    candidates: Array<{ platform: Platform; account_id: number }>
  ): Promise<Array<{ platform: Platform; account_id: number; locked: boolean }>> {
    const activeLock = await this.getActiveLock(sku);

    if (!activeLock) {
      return candidates.map((c) => ({ ...c, locked: false }));
    }

    return candidates.map((c) => ({
      ...c,
      locked:
        c.platform === activeLock.locked_platform &&
        c.account_id === activeLock.locked_account_id,
    }));
  }
}
