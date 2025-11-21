/**
 * eBay ブロックリスト管理サービス
 * データベース操作とビジネスロジックを提供
 */

import { supabase } from '@/lib/supabase/client'
import {
  EbayUserToken,
  EbayBlockedBuyer,
  BlockedBuyerReport,
  EbayBlocklistSyncHistory,
  BlocklistStats,
  ReportBuyerForm,
  BlocklistSyncResult
} from '@/types/ebay-blocklist'

/**
 * トークン管理
 */
export class EbayTokenService {
  /**
   * ユーザーのeBayトークンを保存
   */
  static async saveToken(
    userId: string,
    ebayUserId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    scope?: string
  ): Promise<EbayUserToken | null> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const { data, error } = await supabase
      .from('ebay_user_tokens')
      .upsert({
        user_id: userId,
        ebay_user_id: ebayUserId,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        scope,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,ebay_user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save eBay token:', error)
      return null
    }

    return data
  }

  /**
   * ユーザーのアクティブなトークンを取得
   */
  static async getActiveToken(userId: string): Promise<EbayUserToken | null> {
    const { data, error } = await supabase
      .from('ebay_user_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Failed to get active token:', error)
      return null
    }

    return data
  }

  /**
   * トークンの有効期限をチェック
   */
  static isTokenExpired(token: EbayUserToken): boolean {
    return new Date(token.token_expires_at) <= new Date()
  }

  /**
   * 最終同期日時を更新
   */
  static async updateLastSync(tokenId: string): Promise<void> {
    await supabase
      .from('ebay_user_tokens')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', tokenId)
  }
}

/**
 * ブロックバイヤー管理
 */
export class BlockedBuyerService {
  /**
   * 承認済みのブロックバイヤーリストを取得
   */
  static async getApprovedBuyers(): Promise<EbayBlockedBuyer[]> {
    const { data, error } = await supabase
      .from('ebay_blocked_buyers')
      .select('*')
      .eq('status', 'approved')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to get approved buyers:', error)
      return []
    }

    return data || []
  }

  /**
   * 承認済みバイヤーのユーザー名のみを取得
   */
  static async getApprovedBuyerUsernames(): Promise<string[]> {
    const buyers = await this.getApprovedBuyers()
    return buyers.map(b => b.buyer_username)
  }

  /**
   * 新しいブロックバイヤーを追加
   */
  static async addBlockedBuyer(
    buyerUsername: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    reportedBy: string,
    notes?: string
  ): Promise<EbayBlockedBuyer | null> {
    const { data, error } = await supabase
      .from('ebay_blocked_buyers')
      .insert({
        buyer_username: buyerUsername.trim(),
        reason,
        severity,
        reported_by: reportedBy,
        status: 'pending',
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to add blocked buyer:', error)
      return null
    }

    return data
  }

  /**
   * ブロックバイヤーを承認
   */
  static async approveBuyer(
    buyerId: string,
    approvedBy: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('ebay_blocked_buyers')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', buyerId)

    if (error) {
      console.error('Failed to approve buyer:', error)
      return false
    }

    return true
  }

  /**
   * ブロックバイヤーを拒否
   */
  static async rejectBuyer(
    buyerId: string,
    approvedBy: string,
    notes?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('ebay_blocked_buyers')
      .update({
        status: 'rejected',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        notes,
      })
      .eq('id', buyerId)

    if (error) {
      console.error('Failed to reject buyer:', error)
      return false
    }

    return true
  }

  /**
   * ペンディング中のブロックバイヤーを取得
   */
  static async getPendingBuyers(): Promise<EbayBlockedBuyer[]> {
    const { data, error } = await supabase
      .from('ebay_blocked_buyers')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to get pending buyers:', error)
      return []
    }

    return data || []
  }
}

/**
 * バイヤー報告管理
 */
export class BuyerReportService {
  /**
   * 新しいバイヤー報告を作成
   */
  static async createReport(
    form: ReportBuyerForm,
    reportedBy: string
  ): Promise<BlockedBuyerReport | null> {
    const { data, error } = await supabase
      .from('blocked_buyer_reports')
      .insert({
        buyer_username: form.buyer_username.trim(),
        reason: form.reason,
        severity: form.severity,
        evidence: form.evidence,
        reported_by: reportedBy,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create report:', error)
      return null
    }

    return data
  }

  /**
   * ペンディング中の報告を取得
   */
  static async getPendingReports(): Promise<BlockedBuyerReport[]> {
    const { data, error } = await supabase
      .from('blocked_buyer_reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to get pending reports:', error)
      return []
    }

    return data || []
  }

  /**
   * 報告を承認してブロックバイヤーリストに追加
   */
  static async approveReport(
    reportId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<boolean> {
    // トランザクション的な処理
    // 1. 報告を承認状態に更新
    const { data: report, error: reportError } = await supabase
      .from('blocked_buyer_reports')
      .update({
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      })
      .eq('id', reportId)
      .select()
      .single()

    if (reportError || !report) {
      console.error('Failed to approve report:', reportError)
      return false
    }

    // 2. ブロックバイヤーリストに追加
    const buyer = await BlockedBuyerService.addBlockedBuyer(
      report.buyer_username,
      report.reason,
      report.severity,
      report.reported_by,
      reviewNotes
    )

    if (!buyer) {
      console.error('Failed to add buyer to blocklist')
      return false
    }

    // 3. 自動承認
    await BlockedBuyerService.approveBuyer(buyer.id, reviewedBy)

    return true
  }

  /**
   * 報告を拒否
   */
  static async rejectReport(
    reportId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('blocked_buyer_reports')
      .update({
        status: 'rejected',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      })
      .eq('id', reportId)

    if (error) {
      console.error('Failed to reject report:', error)
      return false
    }

    return true
  }
}

/**
 * 同期履歴管理
 */
export class SyncHistoryService {
  /**
   * 同期履歴を記録
   */
  static async recordSync(
    userId: string,
    ebayUserId: string,
    syncType: 'manual' | 'automatic' | 'scheduled',
    result: BlocklistSyncResult
  ): Promise<void> {
    await supabase
      .from('ebay_blocklist_sync_history')
      .insert({
        user_id: userId,
        ebay_user_id: ebayUserId,
        sync_type: syncType,
        buyers_added: result.buyersAdded,
        buyers_removed: result.buyersRemoved,
        total_buyers: result.totalBuyers,
        status: result.success ? 'success' : 'failed',
        error_message: result.errors?.join(', '),
        sync_duration_ms: result.duration,
      })
  }

  /**
   * ユーザーの同期履歴を取得
   */
  static async getUserSyncHistory(
    userId: string,
    limit: number = 50
  ): Promise<EbayBlocklistSyncHistory[]> {
    const { data, error } = await supabase
      .from('ebay_blocklist_sync_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to get sync history:', error)
      return []
    }

    return data || []
  }

  /**
   * 最後の成功した同期を取得
   */
  static async getLastSuccessfulSync(
    userId: string
  ): Promise<EbayBlocklistSyncHistory | null> {
    const { data, error } = await supabase
      .from('ebay_blocklist_sync_history')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return null
    }

    return data
  }
}

/**
 * 統計情報サービス
 */
export class BlocklistStatsService {
  /**
   * 統計情報を取得
   */
  static async getStats(userId?: string): Promise<BlocklistStats> {
    // 承認済みバイヤー数
    const { count: approvedCount } = await supabase
      .from('ebay_blocked_buyers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('is_active', true)

    // ペンディング報告数
    const { count: pendingReportsCount } = await supabase
      .from('blocked_buyer_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // 拒否されたバイヤー数
    const { count: rejectedCount } = await supabase
      .from('ebay_blocked_buyers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')

    // 総バイヤー数
    const { count: totalCount } = await supabase
      .from('ebay_blocked_buyers')
      .select('*', { count: 'exact', head: true })

    // 最後の同期（ユーザー指定の場合）
    let lastSyncAt: string | undefined
    let totalSyncs = 0
    if (userId) {
      const lastSync = await SyncHistoryService.getLastSuccessfulSync(userId)
      lastSyncAt = lastSync?.created_at

      const { count: syncCount } = await supabase
        .from('ebay_blocklist_sync_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      totalSyncs = syncCount || 0
    }

    return {
      totalBlockedBuyers: totalCount || 0,
      pendingReports: pendingReportsCount || 0,
      approvedBuyers: approvedCount || 0,
      rejectedBuyers: rejectedCount || 0,
      lastSyncAt,
      totalSyncs,
    }
  }
}
