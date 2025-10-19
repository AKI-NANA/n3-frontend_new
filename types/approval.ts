/**
 * 承認システム型定義
 */

export interface Product {
  id: number
  title: string
  current_price: number
  bid_count: number
  end_date: string
  image_url: string | null
  category: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  ai_confidence_score: number
  ai_recommendation: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  condition_name?: string
  seller_name?: string
}

export interface ApprovalStats {
  totalPending: number
  totalApproved: number
  totalRejected: number
  aiApproved: number
  aiPending: number
  aiRejected: number
  avgPrice: number
  totalProducts: number
}

export interface FilterState {
  status: 'all' | 'pending' | 'approved' | 'rejected'
  aiFilter: 'all' | 'ai-approved' | 'ai-pending' | 'ai-rejected'
  minPrice: number
  maxPrice: number
  search: string
  page: number
  limit: number
}

export interface ApprovalHistoryEntry {
  id: number
  product_id: number
  action: 'approve' | 'reject' | 'pending' | 'reset'
  previous_status: string | null
  new_status: string
  reason: string | null
  processed_by: string
  processed_at: string
  ai_score_at_time: number | null
  metadata?: Record<string, unknown>
}

export interface ApprovalQueueResponse {
  products: Product[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

export interface ApprovalActionResponse {
  success: boolean
  successCount: number
  totalRequested: number
  errors: string[]
}

export type AIScoreLevel = 'high' | 'medium' | 'low'
