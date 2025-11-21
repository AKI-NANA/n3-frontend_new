/**
 * eBay ブロックバイヤーリスト - TypeScript型定義
 */

// eBayユーザートークン
export interface EbayUserToken {
  id: string
  user_id: string
  ebay_user_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  scope?: string
  is_active: boolean
  last_sync_at?: string
  created_at: string
  updated_at: string
}

// 共有ブロックバイヤー
export interface EbayBlockedBuyer {
  id: string
  buyer_username: string
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  reported_by?: string
  approved_by?: string
  approved_at?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

// バイヤー報告
export interface BlockedBuyerReport {
  id: string
  buyer_username: string
  reported_by: string
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  evidence?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  created_at: string
  updated_at: string
}

// 同期履歴
export interface EbayBlocklistSyncHistory {
  id: string
  user_id: string
  ebay_user_id: string
  sync_type: 'manual' | 'automatic' | 'scheduled'
  buyers_added: number
  buyers_removed: number
  total_buyers: number
  status: 'success' | 'failed' | 'partial'
  error_message?: string
  sync_duration_ms?: number
  created_at: string
}

// システム設定
export interface EbayBlocklistSettings {
  id: string
  user_id?: string
  setting_key: string
  setting_value: Record<string, any>
  created_at: string
  updated_at: string
}

// eBay Account API - RestrictedUserList レスポンス
export interface EbayRestrictedUserList {
  users: EbayRestrictedUser[]
  total: number
}

export interface EbayRestrictedUser {
  userId: string
  userName: string
}

// eBay Account API - リクエストペイロード
export interface SetRestrictedUserListRequest {
  restrictedUsers: {
    userId?: string
    userName: string
  }[]
}

// 同期結果
export interface BlocklistSyncResult {
  success: boolean
  buyersAdded: number
  buyersRemoved: number
  totalBuyers: number
  errors?: string[]
  duration: number
}

// レポートフォーム
export interface ReportBuyerForm {
  buyer_username: string
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  evidence?: string
}

// 統計情報
export interface BlocklistStats {
  totalBlockedBuyers: number
  pendingReports: number
  approvedBuyers: number
  rejectedBuyers: number
  lastSyncAt?: string
  totalSyncs: number
}
