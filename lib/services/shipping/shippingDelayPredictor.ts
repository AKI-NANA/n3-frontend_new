// lib/services/shipping/shippingDelayPredictor.ts
// T50: 出荷遅延予測コアロジック

import holidaysData from '@/config/holidays.json'

export interface Order {
  id: string
  dueDate: string // 納品期限 (ISO 8601 format)
  isSourced: boolean // 仕入れ済みフラグ
  sourcingArrivalDate?: string // 仕入れ到着予定日 (ISO 8601 format)
}

export interface DelayPrediction {
  isDelayedRisk: boolean
  expectedShipDate: string // ISO 8601 format
  delayReason?: 'Holiday' | 'Sourcing_Pending' | 'Capacity_Issue' | 'Other'
}

/**
 * 指定された日付が週末（土日）かどうかを判定
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 0=日曜, 6=土曜
}

/**
 * 指定された日付が祝日かどうかを判定
 */
function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0]
  return holidaysData.holidays.includes(dateStr)
}

/**
 * 指定された日付が休日（週末または祝日）かどうかを判定
 */
function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date) || isHoliday(date)
}

/**
 * 次の営業日を取得
 */
function getNextWorkingDay(date: Date): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)

  while (isNonWorkingDay(next)) {
    next.setDate(next.getDate() + 1)
  }

  return next
}

/**
 * 2つの日付間の営業日数をカウント
 */
function countWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    if (!isNonWorkingDay(current)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * 指定された営業日数後の日付を取得
 */
function addWorkingDays(date: Date, workingDays: number): Date {
  const result = new Date(date)
  let daysAdded = 0

  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1)
    if (!isNonWorkingDay(result)) {
      daysAdded++
    }
  }

  return result
}

/**
 * 出荷遅延リスクを予測
 *
 * @param order 受注データ
 * @param processingDays 処理に必要な営業日数（デフォルト: 2営業日）
 * @returns 遅延予測結果
 */
export function predictShippingDelay(
  order: Order,
  processingDays: number = 2
): DelayPrediction {
  const now = new Date()
  const dueDate = new Date(order.dueDate)

  // 1. 仕入れ状況の確認
  let baseDate: Date
  let delayReason: DelayPrediction['delayReason'] | undefined

  if (!order.isSourced) {
    // 仕入れ未完了の場合、仕入れ到着予定日を基準日とする
    if (order.sourcingArrivalDate) {
      baseDate = new Date(order.sourcingArrivalDate)
      delayReason = 'Sourcing_Pending'
    } else {
      // 仕入れ到着予定日が未設定の場合、現在日から推定
      baseDate = addWorkingDays(now, 3) // 仕入れに3営業日かかると仮定
      delayReason = 'Sourcing_Pending'
    }
  } else {
    // 仕入れ済みの場合、現在日を基準日とする
    baseDate = now
  }

  // 2. 予測出荷日の計算（処理日数を加算）
  let expectedShipDate = addWorkingDays(baseDate, processingDays)

  // 3. 休日・週末による後ろ倒しの確認
  const workingDaysBetween = countWorkingDays(baseDate, dueDate)
  if (workingDaysBetween < processingDays) {
    delayReason = delayReason || 'Holiday'
  }

  // 4. 遅延リスクの判定
  const isDelayedRisk = expectedShipDate > dueDate

  // 5. 遅延リスクがある場合、具体的な理由を確定
  if (isDelayedRisk && !delayReason) {
    // 週末・祝日をまたぐかチェック
    let hasHolidayBetween = false
    const current = new Date(baseDate)
    while (current <= dueDate) {
      if (isNonWorkingDay(current)) {
        hasHolidayBetween = true
        break
      }
      current.setDate(current.getDate() + 1)
    }

    if (hasHolidayBetween) {
      delayReason = 'Holiday'
    } else {
      delayReason = 'Capacity_Issue'
    }
  }

  return {
    isDelayedRisk,
    expectedShipDate: expectedShipDate.toISOString().split('T')[0],
    delayReason: isDelayedRisk ? delayReason : undefined
  }
}

/**
 * 複数の受注の遅延リスクをバッチ予測
 */
export function batchPredictShippingDelay(
  orders: Order[],
  processingDays: number = 2
): Map<string, DelayPrediction> {
  const predictions = new Map<string, DelayPrediction>()

  for (const order of orders) {
    const prediction = predictShippingDelay(order, processingDays)
    predictions.set(order.id, prediction)
  }

  return predictions
}
