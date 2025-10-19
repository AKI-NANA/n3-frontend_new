/**
 * データ完全性チェック関数
 */

import type { Product } from '@/types/approval'

export interface RequiredFields {
  basic: string[]           // 基本必須フィールド
  filter: string[]          // フィルター通過必須
  profitCalc: string[]      // 利益計算必須
  listing: string[]         // 出品必須
}

export interface DataCompleteness {
  isComplete: boolean
  missingFields: string[]
  completionRate: number
  readyForListing: boolean
  category: 'complete' | 'incomplete'
}

// 必須フィールド定義
export const REQUIRED_FIELDS: RequiredFields = {
  // 基本情報(必須)
  basic: [
    'title',
    'current_price',
    'category',
    'image_url'
  ],
  
  // フィルター通過判定
  filter: [
    // フィルター結果がDBにあると仮定
  ],
  
  // 利益計算完了
  profitCalc: [
    // 利益計算結果がDBにあると仮定
  ],
  
  // 出品準備完了
  listing: [
    // eBayカテゴリーなどの出品準備データ
  ]
}

// フィールド名の日本語ラベル
export const FIELD_LABELS: Record<string, string> = {
  title: '商品タイトル',
  current_price: '価格',
  category: 'カテゴリー',
  image_url: '商品画像',
  condition_name: '商品状態',
  seller_name: '出品者',
  bid_count: '入札数',
  end_date: '終了日時',
  ai_confidence_score: 'AIスコア',
  ai_recommendation: 'AI推奨理由'
}

/**
 * データ完全性チェック
 */
export function checkDataCompleteness(product: Product): DataCompleteness {
  const allRequired = [
    ...REQUIRED_FIELDS.basic,
    ...REQUIRED_FIELDS.filter,
    ...REQUIRED_FIELDS.profitCalc,
    ...REQUIRED_FIELDS.listing
  ]
  
  const missingFields = allRequired.filter(field => {
    const value = product[field as keyof Product]
    return !value || 
           (typeof value === 'string' && value.trim() === '') ||
           (Array.isArray(value) && value.length === 0)
  })
  
  const completionRate = allRequired.length === 0 
    ? 100 
    : Math.round(((allRequired.length - missingFields.length) / allRequired.length) * 100)
  
  const isComplete = missingFields.length === 0
  
  // 出品準備完了判定（基本フィールドが揃っていればOK）
  const readyForListing = REQUIRED_FIELDS.basic.every(field => {
    const value = product[field as keyof Product]
    return value && 
           !(typeof value === 'string' && value.trim() === '') &&
           !(Array.isArray(value) && value.length === 0)
  })
  
  return {
    isComplete,
    missingFields,
    completionRate,
    readyForListing,
    category: isComplete ? 'complete' : 'incomplete'
  }
}

/**
 * フィールドラベルを取得
 */
export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field
}

/**
 * 不足フィールドの説明を生成
 */
export function getMissingFieldsDescription(missingFields: string[]): string {
  if (missingFields.length === 0) return 'すべてのデータが揃っています'
  
  const labels = missingFields.map(getFieldLabel)
  
  if (labels.length === 1) {
    return `${labels[0]}が不足しています`
  } else if (labels.length === 2) {
    return `${labels[0]}と${labels[1]}が不足しています`
  } else {
    return `${labels.slice(0, 2).join('、')}など${labels.length}項目が不足しています`
  }
}

/**
 * 商品リストをデータ完全性で分類
 */
export function categorizeProductsByCompleteness(products: Product[]): {
  complete: Product[]
  incomplete: Product[]
  completeCount: number
  incompleteCount: number
} {
  const complete: Product[] = []
  const incomplete: Product[] = []
  
  products.forEach(product => {
    const check = checkDataCompleteness(product)
    if (check.isComplete) {
      complete.push(product)
    } else {
      incomplete.push(product)
    }
  })
  
  return {
    complete,
    incomplete,
    completeCount: complete.length,
    incompleteCount: incomplete.length
  }
}

/**
 * データ完全性の進捗バーの色を取得
 */
export function getCompletenessColor(rate: number): string {
  if (rate >= 90) return 'bg-green-500'
  if (rate >= 70) return 'bg-yellow-500'
  if (rate >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}
