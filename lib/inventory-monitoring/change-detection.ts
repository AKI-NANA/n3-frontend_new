// 在庫・価格変動検知ロジック

import type {
  MonitoringTarget,
  ScrapedData,
  ChangeDetectionResult
} from './types'

/**
 * 商品データの変動を検知
 */
export function detectChanges(
  product: MonitoringTarget,
  scrapedData: ScrapedData
): ChangeDetectionResult {
  const changes: Array<{
    type: 'price' | 'stock' | 'page_deleted' | 'page_changed'
    old_value: any
    new_value: any
  }> = []

  // スクレイピングが失敗した場合
  if (!scrapedData.success) {
    // ページ削除・終了・エラー
    if (
      scrapedData.status === 'deleted' ||
      scrapedData.status === 'not_found' ||
      scrapedData.status === 'ended'
    ) {
      changes.push({
        type: 'page_deleted',
        old_value: 'active',
        new_value: scrapedData.status,
      })
    }
    return { hasChanges: changes.length > 0, changes }
  }

  // 価格変動検知
  if (
    scrapedData.price_jpy !== undefined &&
    product.previous_price_jpy !== undefined &&
    scrapedData.price_jpy !== product.previous_price_jpy
  ) {
    changes.push({
      type: 'price',
      old_value: product.previous_price_jpy,
      new_value: scrapedData.price_jpy,
    })
  }

  // 在庫変動検知
  if (
    scrapedData.stock !== undefined &&
    product.previous_stock !== undefined &&
    scrapedData.stock !== product.previous_stock
  ) {
    changes.push({
      type: 'stock',
      old_value: product.previous_stock,
      new_value: scrapedData.stock,
    })
  }

  // タイトル変更（商品が入れ替わった可能性）
  if (
    scrapedData.title &&
    product.title &&
    scrapedData.title !== product.title
  ) {
    // タイトルの類似度をチェック（簡易版）
    const similarity = calculateSimilarity(product.title, scrapedData.title)
    if (similarity < 0.5) {
      // 50%未満の類似度なら別商品と判定
      changes.push({
        type: 'page_changed',
        old_value: product.title,
        new_value: scrapedData.title,
      })
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes,
  }
}

/**
 * 2つの文字列の類似度を計算（0-1の範囲）
 * 簡易版：共通する文字の割合
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1

  const set1 = new Set(str1.toLowerCase().split(''))
  const set2 = new Set(str2.toLowerCase().split(''))

  const intersection = new Set([...set1].filter((x) => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

/**
 * 変動の重要度を判定
 */
export function getChangeSeverity(
  change: { type: string; old_value: any; new_value: any }
): 'critical' | 'warning' | 'info' {
  switch (change.type) {
    case 'page_deleted':
    case 'page_changed':
      return 'critical'

    case 'stock':
      // 在庫ゼロは重要
      if (change.new_value === 0) return 'critical'
      return 'warning'

    case 'price':
      // 価格変動率が大きい場合は重要
      const oldPrice = Number(change.old_value)
      const newPrice = Number(change.new_value)
      if (oldPrice > 0) {
        const changeRate = Math.abs((newPrice - oldPrice) / oldPrice)
        if (changeRate > 0.2) return 'critical' // 20%以上の変動
        if (changeRate > 0.1) return 'warning' // 10%以上の変動
      }
      return 'info'

    default:
      return 'info'
  }
}

/**
 * 変動データのサマリーテキストを生成
 */
export function generateChangeSummary(changes: Array<{
  type: string
  old_value: any
  new_value: any
}>): string {
  const summaries = changes.map((change) => {
    switch (change.type) {
      case 'price':
        return `価格: ¥${change.old_value.toLocaleString()} → ¥${change.new_value.toLocaleString()}`
      case 'stock':
        return `在庫: ${change.old_value}個 → ${change.new_value}個`
      case 'page_deleted':
        return `ページ削除/終了: ${change.new_value}`
      case 'page_changed':
        return '商品内容が変更されました'
      default:
        return `${change.type}: ${change.old_value} → ${change.new_value}`
    }
  })

  return summaries.join(', ')
}
