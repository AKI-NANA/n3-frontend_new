/**
 * 承認システムカスタムHooks
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getApprovalQueue,
  getApprovalStats,
  approveProducts,
  rejectProducts,
  resetApprovalStatus
} from './api'
import type { Product, ApprovalStats, FilterState } from '@/types/approval'

// デフォルトフィルター
const DEFAULT_FILTERS: FilterState = {
  status: 'pending',
  aiFilter: 'all',
  minPrice: 0,
  maxPrice: 0,
  search: '',
  page: 1,
  limit: 50
}

/**
 * 承認データ管理Hook
 */
export function useApprovalData() {
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ApprovalStats | null>(null)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)

  // データ読み込み
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [queueResult, statsResult] = await Promise.all([
        getApprovalQueue(filters),
        getApprovalStats()
      ])

      setProducts(queueResult.products)
      setStats(statsResult)
      setTotalPages(queueResult.totalPages)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // フィルター変更
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }, [])

  // ページ変更
  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }, [])

  return {
    products,
    stats,
    filters,
    updateFilters,
    setPage,
    totalPages,
    loading,
    error,
    refetch: loadData
  }
}

/**
 * 選択状態管理Hook
 */
export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // 選択切り替え
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  // 全選択
  const selectAll = useCallback((ids: number[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  // 全解除
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // 選択確認
  const isSelected = useCallback((id: number) => {
    return selectedIds.has(id)
  }, [selectedIds])

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelect,
    selectAll,
    deselectAll,
    isSelected
  }
}

/**
 * 承認/否認操作Hook
 */
export function useApprovalActions(refetch: () => void, deselectAll: () => void) {
  const [processing, setProcessing] = useState(false)

  // 承認処理
  const handleApprove = useCallback(async (productIds: number[]) => {
    if (productIds.length === 0) {
      throw new Error('商品を選択してください')
    }

    setProcessing(true)
    try {
      const result = await approveProducts(productIds)
      
      if (!result.success) {
        throw new Error('承認処理に失敗しました')
      }
      
      if (result.errors.length > 0) {
        console.error('承認エラー:', result.errors)
      }
      
      return result
    } finally {
      setProcessing(false)
    }
  }, [])

  // 否認処理
  const handleReject = useCallback(async (productIds: number[], reason: string) => {
    if (productIds.length === 0) {
      throw new Error('商品を選択してください')
    }

    if (!reason || reason.trim() === '') {
      throw new Error('否認理由を入力してください')
    }

    setProcessing(true)
    try {
      const result = await rejectProducts(productIds, reason)
      
      if (!result.success) {
        throw new Error('否認処理に失敗しました')
      }
      
      if (result.errors.length > 0) {
        console.error('否認エラー:', result.errors)
      }
      
      return result
    } finally {
      setProcessing(false)
    }
  }, [])

  // ステータスリセット
  const handleReset = useCallback(async (productIds: number[]) => {
    if (productIds.length === 0) {
      throw new Error('商品を選択してください')
    }

    setProcessing(true)
    try {
      const result = await resetApprovalStatus(productIds)
      
      if (!result.success) {
        throw new Error('リセット処理に失敗しました')
      }
      
      if (result.errors.length > 0) {
        console.error('リセットエラー:', result.errors)
      }
      
      return result
    } finally {
      setProcessing(false)
    }
  }, [])

  return {
    processing,
    handleApprove,
    handleReject,
    handleReset
  }
}

/**
 * キーボードショートカットHook
 */
export function useKeyboardShortcuts(
  onSelectAll: () => void,
  onDeselectAll: () => void,
  onApprove: () => void,
  onReject: () => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+A: 全選択
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault()
        onSelectAll()
      }
      
      // Ctrl+D: 全解除
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault()
        onDeselectAll()
      }
      
      // Enter: 承認
      if (event.key === 'Enter' && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault()
        onApprove()
      }
      
      // R: 否認
      if (event.key === 'r' && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault()
        onReject()
      }
      
      // Escape: 選択解除
      if (event.key === 'Escape') {
        onDeselectAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSelectAll, onDeselectAll, onApprove, onReject])
}
