/**
 * データ完全性チェックユーティリティ
 * 商品データが全て揃っているか確認し、スコア計算の可否を判定
 */

export interface DataCompletenessResult {
  isComplete: boolean
  missingFields: string[]
  completedFields: string[]
}

/**
 * 商品データの完全性をチェック
 * スコア計算に必要な全データが揃っているか確認
 */
export function checkDataCompleteness(product: any): DataCompletenessResult {
  const requiredFields = {
    // カテゴリ分析
    category_id: 'カテゴリID',
    category_name: 'カテゴリ名',
    
    // 送料計算
    shipping_cost: '送料',
    
    // 利益計算（最後の必須条件）
    profit_amount: '利益額',
    profit_rate: '利益率',
    
    // SellerMirror分析
    sm_competitor_count: '競合数',
    sold_count: '販売数',
    
    // HTML生成
    html_description: 'HTML説明'
  }

  const missingFields: string[] = []
  const completedFields: string[] = []

  for (const [field, label] of Object.entries(requiredFields)) {
    const value = product[field]
    
    // 値が存在しない、または無効な値の場合は未完了
    if (
      value === null || 
      value === undefined || 
      value === '' || 
      (typeof value === 'number' && isNaN(value))
    ) {
      missingFields.push(label)
    } else {
      completedFields.push(label)
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completedFields
  }
}

/**
 * 利益計算が完了しているかチェック
 * スコア計算の最後のトリガー条件
 */
export function isProfitCalculated(product: any): boolean {
  return (
    product.profit_amount !== null &&
    product.profit_amount !== undefined &&
    !isNaN(product.profit_amount) &&
    product.profit_rate !== null &&
    product.profit_rate !== undefined &&
    !isNaN(product.profit_rate)
  )
}

/**
 * カテゴリ分析が完了しているかチェック
 */
export function isCategoryAnalyzed(product: any): boolean {
  return (
    product.category_id !== null &&
    product.category_id !== undefined &&
    product.category_id !== '' &&
    product.category_name !== null &&
    product.category_name !== undefined &&
    product.category_name !== ''
  )
}

/**
 * 送料計算が完了しているかチェック
 */
export function isShippingCalculated(product: any): boolean {
  return (
    product.shipping_cost !== null &&
    product.shipping_cost !== undefined &&
    !isNaN(product.shipping_cost)
  )
}

/**
 * SellerMirror分析が完了しているかチェック
 */
export function isSellerMirrorAnalyzed(product: any): boolean {
  return (
    product.sm_competitor_count !== null &&
    product.sm_competitor_count !== undefined &&
    !isNaN(product.sm_competitor_count) &&
    product.sold_count !== null &&
    product.sold_count !== undefined &&
    !isNaN(product.sold_count)
  )
}

/**
 * HTML生成が完了しているかチェック
 */
export function isHTMLGenerated(product: any): boolean {
  return (
    product.html_description !== null &&
    product.html_description !== undefined &&
    product.html_description !== ''
  )
}

/**
 * データ完全性の詳細レポートを生成
 */
export function generateCompletenessReport(product: any): string {
  const check = checkDataCompleteness(product)
  
  if (check.isComplete) {
    return `✅ 全データ完備 - スコア計算可能`
  }
  
  const report = [
    `❌ データ不完全 - スコア計算不可`,
    ``,
    `完了: ${check.completedFields.join(', ')}`,
    `未完了: ${check.missingFields.join(', ')}`
  ]
  
  return report.join('\n')
}
