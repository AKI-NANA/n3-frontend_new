/**
 * lib/research/date-splitter.ts
 *
 * 日付分割ロジック
 * 大規模リサーチジョブの期間を、API制限を考慮して小さな単位に分割
 *
 * 機能:
 * - 指定された期間を日単位または週単位に分割
 * - 各分割区間ごとにResearchConditionStockレコードを生成
 * - セラーID × キーワード × 日付範囲の組み合わせでタスクを作成
 */

import { v4 as uuidv4 } from "uuid";

/**
 * 日付範囲の型定義
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * 分割タスクの型定義
 */
export interface SplitTask {
  search_id: string;
  job_id: string;
  target_seller_id: string;
  keyword: string | null;
  date_start: Date;
  date_end: Date;
  listing_status: "Sold" | "Completed";
  listing_type: "FixedPrice" | "Auction" | "All";
}

/**
 * ジョブ作成パラメータ
 */
export interface BatchJobParams {
  job_id: string;
  job_name: string;
  description?: string;
  target_seller_ids: string[];
  keywords?: string[];
  date_start: Date;
  date_end: Date;
  split_unit: "day" | "week";
  listing_status?: "Sold" | "Completed";
  listing_type?: "FixedPrice" | "Auction" | "All";
}

/**
 * 日付範囲を指定された単位で分割
 *
 * @param startDate 開始日
 * @param endDate 終了日
 * @param unit 分割単位（'day' または 'week'）
 * @returns 分割された日付範囲の配列
 */
export function splitDateRange(
  startDate: Date,
  endDate: Date,
  unit: "day" | "week"
): DateRange[] {
  const ranges: DateRange[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  // 開始日を日付の始まり（00:00:00）にセット
  current.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const rangeStart = new Date(current);
    let rangeEnd: Date;

    if (unit === "day") {
      // 1日単位の分割
      rangeEnd = new Date(current);
      rangeEnd.setHours(23, 59, 59, 999);
      current.setDate(current.getDate() + 1);
    } else {
      // 1週間（7日）単位の分割
      rangeEnd = new Date(current);
      rangeEnd.setDate(rangeEnd.getDate() + 6);
      rangeEnd.setHours(23, 59, 59, 999);
      current.setDate(current.getDate() + 7);
    }

    // 最終範囲が終了日を超える場合は終了日で切る
    if (rangeEnd > end) {
      rangeEnd = new Date(end);
    }

    ranges.push({
      start: rangeStart,
      end: rangeEnd,
    });
  }

  return ranges;
}

/**
 * 日付範囲の総日数を計算
 *
 * @param startDate 開始日
 * @param endDate 終了日
 * @returns 総日数
 */
export function calculateTotalDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 開始日を含むため+1
}

/**
 * 分割タスクの生成
 *
 * セラーID、キーワード、日付範囲の組み合わせで全タスクを生成。
 * 例: セラー2人 × キーワード3個 × 日付範囲13週間 = 78タスク
 *
 * @param params バッチジョブパラメータ
 * @returns 生成されたタスクの配列
 */
export function generateBatchTasks(params: BatchJobParams): SplitTask[] {
  const tasks: SplitTask[] = [];
  const dateRanges = splitDateRange(
    params.date_start,
    params.date_end,
    params.split_unit
  );

  // セラーIDのリストを反復
  for (const sellerId of params.target_seller_ids) {
    // キーワードのリスト（または空の場合は1回だけ実行）
    const keywordList =
      params.keywords && params.keywords.length > 0
        ? params.keywords
        : [null];

    for (const keyword of keywordList) {
      // 各日付範囲に対してタスクを作成
      for (const range of dateRanges) {
        const searchId = `${params.job_id}_${uuidv4().substring(0, 8)}`;

        tasks.push({
          search_id: searchId,
          job_id: params.job_id,
          target_seller_id: sellerId,
          keyword,
          date_start: range.start,
          date_end: range.end,
          listing_status: params.listing_status || "Sold",
          listing_type: params.listing_type || "FixedPrice",
        });
      }
    }
  }

  return tasks;
}

/**
 * タスク総数の推定
 *
 * @param params バッチジョブパラメータ
 * @returns 推定タスク数
 */
export function estimateTotalTasks(params: BatchJobParams): number {
  const dateRanges = splitDateRange(
    params.date_start,
    params.date_end,
    params.split_unit
  );

  const sellerCount = params.target_seller_ids.length;
  const keywordCount =
    params.keywords && params.keywords.length > 0 ? params.keywords.length : 1;
  const dateRangeCount = dateRanges.length;

  return sellerCount * keywordCount * dateRangeCount;
}

/**
 * バッチジョブの推定完了時間を計算
 *
 * 各タスク間に5秒の遅延を入れる前提で計算。
 * さらに、ページネーションによる追加時間も考慮（概算）。
 *
 * @param totalTasks 総タスク数
 * @param averagePagesPerTask タスクあたりの平均ページ数（デフォルト: 1）
 * @param delayBetweenTasksSeconds タスク間の遅延秒数（デフォルト: 5）
 * @param delayBetweenPagesSeconds ページ間の遅延秒数（デフォルト: 2）
 * @returns 推定完了時間（秒数）
 */
export function estimateCompletionTime(
  totalTasks: number,
  averagePagesPerTask: number = 1,
  delayBetweenTasksSeconds: number = 5,
  delayBetweenPagesSeconds: number = 2
): number {
  // 各タスクのAPI呼び出し時間（概算: 1ページあたり2秒）
  const apiCallTimePerPage = 2;

  // タスクあたりの総時間
  const timePerTask =
    averagePagesPerTask * apiCallTimePerPage +
    (averagePagesPerTask - 1) * delayBetweenPagesSeconds +
    delayBetweenTasksSeconds;

  return totalTasks * timePerTask;
}

/**
 * 推定完了時間を人間が読める形式に変換
 *
 * @param seconds 秒数
 * @returns 人間が読める形式の文字列
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分${remainingSeconds > 0 ? remainingSeconds + "秒" : ""}`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間${minutes > 0 ? minutes + "分" : ""}`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}日${hours > 0 ? hours + "時間" : ""}`;
  }
}

/**
 * ジョブサマリー情報を生成
 *
 * @param params バッチジョブパラメータ
 * @returns ジョブサマリー
 */
export function generateJobSummary(params: BatchJobParams): {
  total_tasks: number;
  total_days: number;
  date_ranges_count: number;
  estimated_time_seconds: number;
  estimated_time_formatted: string;
} {
  const totalTasks = estimateTotalTasks(params);
  const totalDays = calculateTotalDays(params.date_start, params.date_end);
  const dateRanges = splitDateRange(
    params.date_start,
    params.date_end,
    params.split_unit
  );
  const estimatedTimeSeconds = estimateCompletionTime(totalTasks);

  return {
    total_tasks: totalTasks,
    total_days: totalDays,
    date_ranges_count: dateRanges.length,
    estimated_time_seconds: estimatedTimeSeconds,
    estimated_time_formatted: formatEstimatedTime(estimatedTimeSeconds),
  };
}

/**
 * 日付文字列を検証
 *
 * @param dateString 日付文字列（YYYY-MM-DD）
 * @returns 有効な場合はDate、無効な場合はnull
 */
export function validateDateString(dateString: string): Date | null {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return null;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * バッチジョブパラメータを検証
 *
 * @param params バッチジョブパラメータ
 * @returns 検証結果と エラーメッセージ
 */
export function validateBatchJobParams(params: Partial<BatchJobParams>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // ジョブID
  if (!params.job_id || params.job_id.trim() === "") {
    errors.push("ジョブIDが必要です。");
  }

  // ジョブ名
  if (!params.job_name || params.job_name.trim() === "") {
    errors.push("ジョブ名が必要です。");
  }

  // セラーID
  if (!params.target_seller_ids || params.target_seller_ids.length === 0) {
    errors.push("少なくとも1つのセラーIDが必要です。");
  }

  // 日付
  if (!params.date_start) {
    errors.push("開始日が必要です。");
  }
  if (!params.date_end) {
    errors.push("終了日が必要です。");
  }

  // 日付範囲の妥当性
  if (params.date_start && params.date_end) {
    if (params.date_start > params.date_end) {
      errors.push("開始日は終了日より前である必要があります。");
    }

    // 過度に長い期間の警告（例: 1年以上）
    const totalDays = calculateTotalDays(params.date_start, params.date_end);
    if (totalDays > 365) {
      errors.push(
        `期間が${totalDays}日と非常に長いです。処理に時間がかかる可能性があります。`
      );
    }
  }

  // 分割単位
  if (params.split_unit && !["day", "week"].includes(params.split_unit)) {
    errors.push("分割単位は 'day' または 'week' である必要があります。");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ジョブIDを生成（タイムスタンプベース）
 *
 * @param prefix プレフィックス（デフォルト: 'job'）
 * @returns 生成されたジョブID
 */
export function generateJobId(prefix: string = "job"): string {
  const timestamp = Date.now();
  const randomPart = uuidv4().substring(0, 8);
  return `${prefix}_${timestamp}_${randomPart}`;
}
