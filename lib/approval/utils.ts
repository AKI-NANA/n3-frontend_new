/**
 * 承認システム - ユーティリティ関数
 * NAGANO-3 v2.0 Yahoo Auction Approval System
 */

import type { ApprovalProduct } from '@/types/approval'

// ============================================
// 日付フォーマット
// ============================================

export function formatDate(dateString: string | null): string {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return '-'
  }
}

export function formatDateShort(dateString: string | null): string {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return '-'
  }
}

export function formatDateOnly(dateString: string | null): string {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return '-'
  }
}

// ============================================
// 数値フォーマット
// ============================================

export function formatCurrency(amount: number | null | undefined, currency = 'JPY'): string {
  if (amount === null || amount === undefined) return '-'

  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'

  return new Intl.NumberFormat('ja-JP').format(num)
}

export function formatPercent(num: number | null | undefined, decimals = 1): string {
  if (num === null || num === undefined) return '-'

  return `${num.toFixed(decimals)}%`
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '-'

  return `${Math.round(score)}点`
}

// ============================================
// ステータスラベル
// ============================================

export function getApprovalStatusLabel(
  status: ApprovalProduct['approval_status']
): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'pending':
      return {
        label: '承認待ち',
        color: '#0891b2',
        bgColor: '#cffafe',
      }
    case 'approved':
      return {
        label: '承認済み',
        color: '#059669',
        bgColor: '#d1fae5',
      }
    case 'rejected':
      return {
        label: '否認',
        color: '#dc2626',
        bgColor: '#fee2e2',
      }
    case 'data_incomplete':
      return {
        label: 'データ不足',
        color: '#d97706',
        bgColor: '#fef3c7',
      }
    default:
      return {
        label: '不明',
        color: '#64748b',
        bgColor: '#f1f5f9',
      }
  }
}

export function getConditionLabel(condition: string | null): string {
  if (!condition) return '-'

  switch (condition.toLowerCase()) {
    case 'new':
      return '新品'
    case 'used':
      return '中古'
    case 'refurbished':
      return '整備済み'
    default:
      return condition
  }
}

// ============================================
// 画像URL取得
// ============================================

export function getProductImage(product: ApprovalProduct): string {
  // 優先順位: image_url > scraped_data.images > ebay_api_data.images > listing_data.images
  if (product.image_url) {
    return product.image_url
  }

  if (product.scraped_data?.images && product.scraped_data.images.length > 0) {
    return product.scraped_data.images[0]
  }

  if (product.ebay_api_data?.images && product.ebay_api_data.images.length > 0) {
    return product.ebay_api_data.images[0]
  }

  if (product.images && product.images.length > 0) {
    return product.images[0]
  }

  // デフォルト画像
  return '/images/no-image.png'
}

export function getAllProductImages(product: ApprovalProduct): string[] {
  const images: string[] = []

  if (product.image_url) {
    images.push(product.image_url)
  }

  if (product.images) {
    images.push(...product.images)
  }

  if (product.scraped_data?.images) {
    images.push(...product.scraped_data.images)
  }

  if (product.ebay_api_data?.images) {
    images.push(...product.ebay_api_data.images)
  }

  // 重複を削除
  return Array.from(new Set(images))
}

// ============================================
// タイトル取得
// ============================================

export function getProductTitle(product: ApprovalProduct, lang: 'ja' | 'en' = 'ja'): string {
  if (lang === 'en' && product.title_en) {
    return product.title_en
  }

  if (product.title) {
    return product.title
  }

  if (product.scraped_data?.title) {
    return product.scraped_data.title
  }

  if (product.listing_data?.title) {
    return product.listing_data.title
  }

  return 'タイトルなし'
}

// ============================================
// 利益計算ヘルパー
// ============================================

export function calculateProfitMargin(netProfit: number, sellingPrice: number): number {
  if (sellingPrice === 0) return 0
  return (netProfit / sellingPrice) * 100
}

export function isProfitable(product: ApprovalProduct): boolean {
  if (!product.profit_data) return false
  return (product.profit_data.net_profit || 0) > 0
}

export function getProfitColor(profitMargin: number): string {
  if (profitMargin >= 30) return '#059669' // 緑
  if (profitMargin >= 20) return '#0891b2' // 青
  if (profitMargin >= 10) return '#d97706' // オレンジ
  return '#dc2626' // 赤
}

// ============================================
// AIスコアヘルパー
// ============================================

export function getScoreColor(score: number): string {
  if (score >= 80) return '#059669' // 緑
  if (score >= 60) return '#0891b2' // 青
  if (score >= 40) return '#d97706' // オレンジ
  return '#dc2626' // 赤
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return '優良'
  if (score >= 60) return '良好'
  if (score >= 40) return '注意'
  return '要確認'
}

// ============================================
// フィルターヘルパー
// ============================================

export function hasActiveFilters(filters: any): boolean {
  // デフォルトフィルターと比較して変更があるかチェック
  return (
    filters.searchQuery !== '' ||
    filters.category !== null ||
    filters.condition.length > 0 ||
    filters.profitability.minProfit !== null ||
    filters.profitability.maxProfit !== null ||
    filters.profitability.minProfitMargin !== null ||
    filters.profitability.maxProfitMargin !== null ||
    filters.aiScore.min !== null ||
    filters.aiScore.max !== null ||
    filters.filterResults.passed !== null ||
    filters.aiFlags.discontinued !== null ||
    filters.aiFlags.limitedEdition !== null ||
    filters.aiFlags.leftHanded !== null ||
    filters.competitors.maxJapaneseSellers !== null ||
    filters.competitors.noOverseasSellers !== null ||
    filters.htsCode !== null ||
    filters.originCountry !== null
  )
}

// ============================================
// URLヘルパー
// ============================================

export function getYahooAuctionUrl(productId: string | number): string {
  return `https://page.auctions.yahoo.co.jp/jp/auction/${productId}`
}

export function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

// ============================================
// バリデーション
// ============================================

export function validateRejectionReason(reason: string): {
  valid: boolean
  error?: string
} {
  if (!reason || reason.trim() === '') {
    return {
      valid: false,
      error: '否認理由を入力してください',
    }
  }

  if (reason.length < 5) {
    return {
      valid: false,
      error: '否認理由は5文字以上入力してください',
    }
  }

  if (reason.length > 500) {
    return {
      valid: false,
      error: '否認理由は500文字以内で入力してください',
    }
  }

  return { valid: true }
}

// ============================================
// テキストトランケート
// ============================================

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// ============================================
// クリップボードコピー
// ============================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// ============================================
// 相対時間表示
// ============================================

export function getRelativeTime(dateString: string | null): string {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'たった今'
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`

    return formatDateShort(dateString)
  } catch {
    return '-'
  }
}

// ============================================
// キーボードショートカット
// ============================================

export function handleKeyboardShortcut(
  event: KeyboardEvent,
  shortcuts: Record<string, () => void>
): void {
  const key = event.key.toLowerCase()
  const ctrl = event.ctrlKey || event.metaKey
  const shift = event.shiftKey

  let shortcutKey = ''
  if (ctrl) shortcutKey += 'ctrl+'
  if (shift) shortcutKey += 'shift+'
  shortcutKey += key

  if (shortcuts[shortcutKey]) {
    event.preventDefault()
    shortcuts[shortcutKey]()
  }
}

// ============================================
// ローカルストレージヘルパー
// ============================================

export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return defaultValue
  }
}

export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to remove from localStorage:', error)
  }
}
