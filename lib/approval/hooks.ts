/**
 * 承認システム - カスタムHooks
 * NAGANO-3 v2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type {
  ApprovalProduct,
  FilterState,
  ApprovalStats,
  UseApprovalDataReturn,
  UseSelectionReturn,
  UseApprovalActionsReturn,
  CompletenessCheck,
  RequiredField,
} from '@/types/approval'
import {
  fetchApprovalProducts,
  approveProducts,
  rejectProducts,
  fetchFilterOptions,
} from './api'

// ====================================================================
// データフェッチ用Hook
// ====================================================================

const DEFAULT_FILTERS: FilterState = {
  page: 1,
  limit: 24,
  status: 'all',
  dataCompleteness: 'all',
  aiFilter: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
}

export function useApprovalData(): UseApprovalDataReturn {
  const [products, setProducts] = useState<ApprovalProduct[]>([])
  const [stats, setStats] = useState<ApprovalStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    avgScore: 0,
    avgPrice: 0,
    totalProfit: 0,
  })
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchApprovalProducts(filters)

      setProducts(response.products)
      setStats(response.stats)
      setTotal(response.total)
      setTotalPages(response.totalPages)
    } catch (err) {
      const message = err instanceof Error ? err.message : '商品データの読み込みに失敗しました'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
      page: updates.page !== undefined ? updates.page : 1, // フィルター変更時はページをリセット
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const changePage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  return {
    products,
    stats,
    filters,
    updateFilters,
    resetFilters,
    changePage,
    loading,
    error,
    refetch: loadData,
    total,
    totalPages,
  }
}

// ====================================================================
// 選択管理用Hook
// ====================================================================

export function useSelection(products: ApprovalProduct[]): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(products.map((p) => p.id)))
  }, [products])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback(
    (id: number) => {
      return selectedIds.has(id)
    },
    [selectedIds]
  )

  return {
    selectedIds,
    selectedIdArray: Array.from(selectedIds),
    toggleSelect,
    selectAll,
    deselectAll,
    selectedCount: selectedIds.size,
    isSelected,
  }
}

// ====================================================================
// 承認・否認アクション用Hook
// ====================================================================

export function useApprovalActions(
  onSuccess: () => void,
  onClear: () => void
): UseApprovalActionsReturn {
  const [processing, setProcessing] = useState(false)

  const handleApprove = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) {
        toast.warning('商品が選択されていません')
        return
      }

      try {
        setProcessing(true)

        const response = await approveProducts(ids)

        if (response.success) {
          toast.success(response.message)
          onSuccess()
          onClear()
        } else {
          toast.error('承認処理に失敗しました')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '承認処理に失敗しました'
        toast.error(message)
      } finally {
        setProcessing(false)
      }
    },
    [onSuccess, onClear]
  )

  const handleReject = useCallback(
    async (ids: number[], reason: string) => {
      if (ids.length === 0) {
        toast.warning('商品が選択されていません')
        return
      }

      if (!reason || !reason.trim()) {
        toast.warning('否認理由を入力してください')
        return
      }

      try {
        setProcessing(true)

        const response = await rejectProducts(ids, reason)

        if (response.success) {
          toast.success(response.message)
          onSuccess()
          onClear()
        } else {
          toast.error('否認処理に失敗しました')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '否認処理に失敗しました'
        toast.error(message)
      } finally {
        setProcessing(false)
      }
    },
    [onSuccess, onClear]
  )

  return {
    handleApprove,
    handleReject,
    processing,
  }
}

// ====================================================================
// データ完全性チェック用Hook
// ====================================================================

const REQUIRED_FIELDS: RequiredField[] = [
  { field: 'title', label: '商品タイトル', category: 'basic' },
  { field: 'sku', label: 'SKU', category: 'basic' },
  { field: 'yahoo_price', label: '仕入れ価格', category: 'pricing' },
  { field: 'recommended_price', label: '推奨価格', category: 'pricing' },
  { field: 'profit_jpy', label: '純利益額', category: 'pricing' },
  { field: 'profit_rate', label: '純利益率', category: 'pricing' },
  { field: 'final_score', label: '最終スコア', category: 'pricing' },
  { field: 'hts_code', label: 'HTSコード', category: 'metadata' },
  { field: 'origin_country', label: '原産国', category: 'metadata' },
  { field: 'images', label: '画像', category: 'basic' },
]

export function useDataCompleteness(products: ApprovalProduct[]) {
  const checkCompleteness = useCallback((product: ApprovalProduct): CompletenessCheck => {
    const missingFields: string[] = []

    for (const field of REQUIRED_FIELDS) {
      const value = product[field.field as keyof ApprovalProduct]

      if (value === undefined || value === null || value === '') {
        missingFields.push(field.label)
      } else if (Array.isArray(value) && value.length === 0) {
        missingFields.push(field.label)
      }
    }

    const completionRate = ((REQUIRED_FIELDS.length - missingFields.length) / REQUIRED_FIELDS.length) * 100

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      completionRate: Math.round(completionRate),
    }
  }, [])

  const getCompleteness = useCallback(
    (productId: number): CompletenessCheck | null => {
      const product = products.find((p) => p.id === productId)
      if (!product) return null
      return checkCompleteness(product)
    },
    [products, checkCompleteness]
  )

  const completeProducts = useMemo(() => {
    return products.filter((p) => checkCompleteness(p).isComplete)
  }, [products, checkCompleteness])

  const incompleteProducts = useMemo(() => {
    return products.filter((p) => !checkCompleteness(p).isComplete)
  }, [products, checkCompleteness])

  return {
    checkCompleteness,
    getCompleteness,
    completeProducts,
    incompleteProducts,
    requiredFields: REQUIRED_FIELDS,
  }
}

// ====================================================================
// フィルターオプション用Hook
// ====================================================================

export function useFilterOptions() {
  const [categories, setCategories] = useState<string[]>([])
  const [originCountries, setOriginCountries] = useState<string[]>([])

  useEffect(() => {
    const loadOptions = async () => {
      const options = await fetchFilterOptions()
      setCategories(options.categories)
      setOriginCountries(options.originCountries)
    }

    loadOptions()
  }, [])

  return {
    categories,
    originCountries,
  }
}
