// /services/shippingDelayPredictor.ts

/**
 * 週末や休日を考慮して出荷遅延リスクと予測日を計算する
 * @param dueDate 納品期限日 (orders.dueDate)
 * @param isSourced 仕入れが完了しているか (orders.isSourced)
 * @param sourcingArrivalDate 仕入れ品が到着する予測日
 * @returns { isDelayedRisk: boolean, expectedShipDate: Date, reason: string }
 */
export function predictShippingDelay(
  dueDate: Date,
  isSourced: boolean,
  sourcingArrivalDate?: Date
): {
  isDelayedRisk: boolean
  expectedShipDate: Date
  reason: string
} {
  const today = new Date()
  let expectedShipDate = isSourced ? new Date(today) : (sourcingArrivalDate ? new Date(sourcingArrivalDate) : new Date(today))

  // 💡 週末・休日ルール (モックとして土日をスキップするロジックを実装)
  const HOLIDAYS = ['2025-12-25', '2026-01-01'] // 実際はDBまたは設定ファイルから取得

  let daysToAdd = 1 // 準備期間1日
  while (daysToAdd > 0) {
    expectedShipDate.setDate(expectedShipDate.getDate() + 1)
    const dayOfWeek = expectedShipDate.getDay()
    const dateString = expectedShipDate.toISOString().substring(0, 10)

    // 土曜日 (6) または 日曜日 (0) または 祝日であればスキップ
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateString)) {
      daysToAdd--
    }
  }

  let isDelayedRisk = false
  let reason = ''

  // 1. 仕入れ遅延のチェック
  if (!isSourced) {
    isDelayedRisk = true
    reason = 'Sourcing_Pending'
  }

  // 2. 期限超過チェック
  if (expectedShipDate > dueDate) {
    isDelayedRisk = true
    reason = reason ? `${reason}, DueDate_Exceeded` : 'DueDate_Exceeded'
  }

  return {
    isDelayedRisk,
    expectedShipDate,
    reason: reason || 'None'
  }
}

/**
 * 休日リストをDBまたは設定ファイルから取得する（将来的な拡張用）
 */
export async function getHolidays(): Promise<string[]> {
  // 将来的にはDBから取得
  // const { data } = await supabase.from('holidays').select('date')
  // return data?.map(h => h.date) || []
  return ['2025-12-25', '2026-01-01', '2026-01-02', '2026-01-03']
}

/**
 * 営業日を計算する（土日祝日を除く）
 * @param startDate 開始日
 * @param businessDays 営業日数
 * @returns 営業日後の日付
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const HOLIDAYS = ['2025-12-25', '2026-01-01', '2026-01-02', '2026-01-03']
  const result = new Date(startDate)
  let daysToAdd = businessDays

  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    const dateString = result.toISOString().substring(0, 10)

    // 土曜日 (6) または 日曜日 (0) または 祝日であればスキップ
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateString)) {
      daysToAdd--
    }
  }

  return result
}

/**
 * 2つの日付の間の営業日数を計算する
 * @param startDate 開始日
 * @param endDate 終了日
 * @returns 営業日数
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  const HOLIDAYS = ['2025-12-25', '2026-01-01', '2026-01-02', '2026-01-03']
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    const dateString = current.toISOString().substring(0, 10)

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateString)) {
      count++
    }

    current.setDate(current.getDate() + 1)
  }

  return count
}
