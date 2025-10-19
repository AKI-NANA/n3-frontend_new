/**
 * 承認システムユーティリティ関数
 */

import type { Product, AIScoreLevel } from '@/types/approval'

/**
 * AIスコアからレベルを判定
 */
export function getAIScoreLevel(score: number): AIScoreLevel {
  if (score >= 80) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/**
 * AIスコアに応じた色を取得
 */
export function getAIScoreColor(score: number): string {
  const level = getAIScoreLevel(score)
  switch (level) {
    case 'high':
      return 'bg-green-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'low':
      return 'bg-red-500'
  }
}

/**
 * AIスコアに応じたバッジバリアントを取得
 */
export function getAIScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  const level = getAIScoreLevel(score)
  switch (level) {
    case 'high':
      return 'default' // 緑
    case 'medium':
      return 'secondary' // 黄
    case 'low':
      return 'destructive' // 赤
  }
}

/**
 * 承認ステータスに応じたバッジバリアントを取得
 */
export function getStatusBadgeVariant(
  status: 'pending' | 'approved' | 'rejected'
): 'outline' | 'default' | 'destructive' {
  switch (status) {
    case 'pending':
      return 'outline'
    case 'approved':
      return 'default'
    case 'rejected':
      return 'destructive'
  }
}

/**
 * 承認ステータスの日本語表示
 */
export function getStatusLabel(status: 'pending' | 'approved' | 'rejected'): string {
  switch (status) {
    case 'pending':
      return '承認待ち'
    case 'approved':
      return '承認済み'
    case 'rejected':
      return '否認済み'
  }
}

/**
 * 日付フォーマット
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 24時間以内なら相対時間表示
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
    
    if (hours > 0) {
      return `${hours}時間前`
    } else if (minutes > 0) {
      return `${minutes}分前`
    } else {
      return 'たった今'
    }
  }
  
  // それ以外は日付表示
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * 価格フォーマット
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(price)
}

/**
 * 数値フォーマット (カンマ区切り)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ja-JP').format(num)
}

/**
 * CSV出力
 */
export function exportToCSV(products: Product[], selectedIds: Set<number>) {
  const selectedProducts = products.filter(p => selectedIds.has(p.id))
  
  if (selectedProducts.length === 0) {
    throw new Error('出力する商品がありません')
  }
  
  // CSVヘッダー
  const headers = [
    'ID',
    'タイトル',
    '価格',
    '入札数',
    '終了日時',
    'カテゴリー',
    '承認ステータス',
    'AIスコア',
    'AI推奨理由',
    '承認日時',
    '承認者',
    '否認理由'
  ]
  
  // CSVデータ
  const rows = selectedProducts.map(p => [
    p.id,
    `"${p.title.replace(/"/g, '""')}"`, // ダブルクォートエスケープ
    p.current_price,
    p.bid_count,
    p.end_date,
    p.category || '',
    getStatusLabel(p.approval_status),
    p.ai_confidence_score,
    `"${(p.ai_recommendation || '').replace(/"/g, '""')}"`,
    p.approved_at ? formatDate(p.approved_at) : '',
    p.approved_by || '',
    `"${(p.rejection_reason || '').replace(/"/g, '""')}"`
  ])
  
  // CSV生成
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
  
  // BOM付きでダウンロード (Excel対応)
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `approval_products_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * 画像URLのフォールバック
 */
export function getImageUrl(imageUrl: string | null): string {
  if (!imageUrl || imageUrl === '') {
    return '/no-image.png'
  }
  return imageUrl
}

/**
 * タイトルの切り詰め
 */
export function truncateTitle(title: string, maxLength: number = 60): string {
  if (title.length <= maxLength) return title
  return title.substring(0, maxLength) + '...'
}

/**
 * 商品URLの生成 (Yahoo オークション)
 */
export function getProductUrl(productId: string | number): string {
  return `https://page.auctions.yahoo.co.jp/jp/auction/${productId}`
}

/**
 * フィルター条件の有効性チェック
 */
export function hasActiveFilters(filters: {
  status?: string
  aiFilter?: string
  minPrice?: number
  maxPrice?: number
  search?: string
}): boolean {
  return (
    (filters.status !== 'all' && filters.status !== 'pending') ||
    (filters.aiFilter !== 'all') ||
    (filters.minPrice && filters.minPrice > 0) ||
    (filters.maxPrice && filters.maxPrice > 0) ||
    (filters.search && filters.search.trim() !== '')
  )
}

/**
 * パーセンテージ計算
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

/**
 * 配列をチャンクに分割
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
