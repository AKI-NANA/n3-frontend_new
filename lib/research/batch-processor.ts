// lib/research/batch-processor.ts
// 大規模データ一括取得バッチ - 日付分割とタスク管理ロジック

export interface DateRange {
  startDate: string // ISO 8601 形式: "2025-08-01"
  endDate: string   // ISO 8601 形式: "2025-08-07"
}

export interface BatchTask {
  targetSellerId: string
  dateRange: DateRange
  targetDateRange: string // 表示用: "2025-08-01 to 2025-08-07"
}

/**
 * 日付分割ロジック
 *
 * 指定された期間を指定した日数単位（デフォルト7日間）に分割します。
 * これにより、eBay Finding APIのレート制限を回避しつつ、
 * 大量のデータを段階的に取得できます。
 *
 * @param startDateStr 開始日 (YYYY-MM-DD 形式)
 * @param endDateStr 終了日 (YYYY-MM-DD 形式)
 * @param splitUnitDays 分割単位（日数）。デフォルト: 7日間
 * @returns 分割された日付範囲の配列
 *
 * @example
 * // 90日間を7日単位に分割 → 13個の DateRange に分割される
 * const ranges = splitDateRange('2025-08-01', '2025-10-30', 7)
 * // [
 * //   { startDate: '2025-08-01', endDate: '2025-08-07' },
 * //   { startDate: '2025-08-08', endDate: '2025-08-14' },
 * //   ...
 * // ]
 */
export function splitDateRange(
  startDateStr: string,
  endDateStr: string,
  splitUnitDays: number = 7
): DateRange[] {
  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  // 入力検証
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD format.')
  }

  if (startDate > endDate) {
    throw new Error('Start date must be before or equal to end date.')
  }

  if (splitUnitDays < 1) {
    throw new Error('Split unit days must be at least 1.')
  }

  const dateRanges: DateRange[] = []
  let currentStart = new Date(startDate)

  while (currentStart <= endDate) {
    // 次の終了日を計算 (開始日 + splitUnitDays - 1日)
    const currentEnd = new Date(currentStart)
    currentEnd.setDate(currentEnd.getDate() + splitUnitDays - 1)

    // 終了日が指定期間の終了日を超えないように調整
    if (currentEnd > endDate) {
      currentEnd.setTime(endDate.getTime())
    }

    // 日付範囲をリストに追加
    dateRanges.push({
      startDate: formatDate(currentStart),
      endDate: formatDate(currentEnd)
    })

    // 次の開始日は現在の終了日の翌日
    currentStart = new Date(currentEnd)
    currentStart.setDate(currentStart.getDate() + 1)
  }

  return dateRanges
}

/**
 * バッチタスクを生成
 *
 * セラーIDリストと日付範囲から、実行可能なバッチタスクの配列を生成します。
 * 各セラーIDと各日付範囲の組み合わせごとに1つのタスクが生成されます。
 *
 * @param sellerIds セラーIDの配列
 * @param startDate 開始日
 * @param endDate 終了日
 * @param splitUnitDays 分割単位（日数）
 * @returns バッチタスクの配列
 *
 * @example
 * const tasks = generateBatchTasks(
 *   ['seller_001', 'seller_002'],
 *   '2025-08-01',
 *   '2025-08-14',
 *   7
 * )
 * // 2セラー × 2期間 = 4タスク生成
 */
export function generateBatchTasks(
  sellerIds: string[],
  startDate: string,
  endDate: string,
  splitUnitDays: number = 7
): BatchTask[] {
  if (!sellerIds || sellerIds.length === 0) {
    throw new Error('At least one seller ID is required.')
  }

  // 日付範囲を分割
  const dateRanges = splitDateRange(startDate, endDate, splitUnitDays)

  const tasks: BatchTask[] = []

  // セラーID × 日付範囲の組み合わせでタスクを生成
  for (const sellerId of sellerIds) {
    for (const dateRange of dateRanges) {
      tasks.push({
        targetSellerId: sellerId,
        dateRange: dateRange,
        targetDateRange: `${dateRange.startDate} to ${dateRange.endDate}`
      })
    }
  }

  return tasks
}

/**
 * Date オブジェクトを YYYY-MM-DD 形式の文字列に変換
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * バッチタスクの統計情報を計算
 */
export function calculateBatchStatistics(
  sellerIds: string[],
  startDate: string,
  endDate: string,
  splitUnitDays: number = 7
): {
  totalSellers: number
  totalDays: number
  totalDateRanges: number
  totalTasks: number
  estimatedApiCalls: number
} {
  const dateRanges = splitDateRange(startDate, endDate, splitUnitDays)
  const totalTasks = sellerIds.length * dateRanges.length

  // 各タスクで平均2ページ（200アイテム）を取得すると仮定
  const estimatedApiCalls = totalTasks * 2

  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return {
    totalSellers: sellerIds.length,
    totalDays,
    totalDateRanges: dateRanges.length,
    totalTasks,
    estimatedApiCalls
  }
}
