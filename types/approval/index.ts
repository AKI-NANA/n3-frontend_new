/**
 * 承認システム - 型定義
 * NAGANO-3 v2.0
 */

// ====================================================================
// 商品データ型
// ====================================================================

export interface ApprovalProduct {
  id: number
  sku: string
  title: string
  title_en?: string
  yahoo_url?: string
  yahoo_price?: number
  
  // 画像
  images?: string[]
  thumbnail?: string
  
  // スコア・利益
  ai_confidence_score?: number
  final_score?: number
  profit_jpy?: number
  profit_rate?: number
  recommended_price?: number
  
  // ステータス
  approval_status: 'pending' | 'approved' | 'rejected'
  ai_recommendation?: string
  
  // フィルタリング
  filter_results?: {
    passed: boolean
    failed_filters?: string[]
  }
  
  // メタデータ
  hts_code?: string
  origin_country?: string
  category?: string
  condition?: string
  brand?: string
  
  // AI分析
  ai_analysis?: {
    discontinued?: boolean
    limited_edition?: boolean
    left_handed?: boolean
  }
  
  // 競合
  japanese_sellers_count?: number
  overseas_sellers_absent?: boolean
  
  // タイムスタンプ
  created_at: string
  updated_at: string
  approved_at?: string
  approved_by?: string
  rejection_reason?: string
}

// ====================================================================
// 統計データ型
// ====================================================================

export interface ApprovalStats {
  total: number
  pending: number
  approved: number
  rejected: number
  avgScore: number
  avgPrice: number
  totalProfit: number
}

// ====================================================================
// フィルター型
// ====================================================================

export interface FilterState {
  // ページネーション
  page: number
  limit: number
  
  // ステータス
  status: 'all' | 'pending' | 'approved' | 'rejected'
  
  // データ完全性
  dataCompleteness: 'all' | 'complete' | 'incomplete'
  
  // AI判定
  aiFilter: 'all' | 'high' | 'medium' | 'low'
  
  // 価格範囲
  minPrice?: number
  maxPrice?: number
  
  // 利益範囲
  minProfit?: number
  maxProfit?: number
  minProfitRate?: number
  maxProfitRate?: number
  
  // スコア範囲
  minScore?: number
  maxScore?: number
  
  // カテゴリ・属性
  category?: string
  originCountry?: string
  condition?: string
  brand?: string
  
  // フィルター結果
  filterPassed?: boolean
  
  // AI分析
  discontinued?: boolean
  limitedEdition?: boolean
  leftHanded?: boolean
  
  // 競合
  maxJapaneseSellers?: number
  overseasSellersAbsent?: boolean
  
  // 検索
  search?: string
  
  // ソート
  sortBy?: 'created_at' | 'price' | 'profit' | 'score'
  sortOrder?: 'asc' | 'desc'
}

// ====================================================================
// データ完全性チェック型
// ====================================================================

export interface CompletenessCheck {
  isComplete: boolean
  missingFields: string[]
  completionRate: number
}

export interface RequiredField {
  field: string
  label: string
  category: 'basic' | 'pricing' | 'filtering' | 'metadata'
}

// ====================================================================
// API レスポンス型
// ====================================================================

export interface ApprovalListResponse {
  products: ApprovalProduct[]
  stats: ApprovalStats
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApprovalActionResponse {
  success: boolean
  message: string
  updatedProducts?: number[]
}

// ====================================================================
// Hooks用の型
// ====================================================================

export interface UseApprovalDataReturn {
  products: ApprovalProduct[]
  stats: ApprovalStats
  filters: FilterState
  updateFilters: (updates: Partial<FilterState>) => void
  resetFilters: () => void
  changePage: (page: number) => void
  loading: boolean
  error: string | null
  refetch: () => void
  total: number
  totalPages: number
}

export interface UseSelectionReturn {
  selectedIds: Set<number>
  selectedIdArray: number[]
  toggleSelect: (id: number) => void
  selectAll: () => void
  deselectAll: () => void
  selectedCount: number
  isSelected: (id: number) => boolean
}

export interface UseApprovalActionsReturn {
  handleApprove: (ids: number[]) => Promise<void>
  handleReject: (ids: number[], reason: string) => Promise<void>
  processing: boolean
}

// ====================================================================
// フィルターオプション型
// ====================================================================

export interface FilterOptions {
  categories: string[]
  originCountries: string[]
  brands: string[]
  conditions: string[]
}
