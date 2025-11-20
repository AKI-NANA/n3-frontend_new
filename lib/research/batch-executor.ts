/**
 * lib/research/batch-executor.ts
 *
 * ヘッドレスバッチ実行モジュール
 * VPS上で動作し、research_condition_stockから検索条件を読み込み、
 * eBay Finding APIを呼び出してSoldデータを取得・保存する
 *
 * 主要機能:
 * - Pendingタスクの自動取得
 * - ページネーション対応（100件超のデータ取得）
 * - レート制限対応（タスク間5秒、ページ間2秒の遅延）
 * - エラーハンドリングとリトライ
 * - 進捗管理とステータス更新
 */

import { createClient } from "@supabase/supabase-js";
import type {
  ResearchConditionStock,
  ResearchBatchResult,
  BatchTaskExecutionResult,
  DEFAULT_BATCH_CONFIG,
} from "@/src/db/batch_research_schema";

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// eBay Finding API設定
const EBAY_FINDING_API =
  "https://svcs.ebay.com/services/search/FindingService/v1";
const EBAY_APP_ID =
  process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID_MJT;

/**
 * バッチ実行設定
 */
export interface BatchExecutorConfig {
  delayBetweenTasksMs: number; // タスク間の遅延（ミリ秒）
  delayBetweenPagesMs: number; // ページ間の遅延（ミリ秒）
  maxRetries: number; // 最大リトライ回数
  retryDelayMs: number; // リトライ遅延（ミリ秒）
  timeoutPerTaskMs: number; // タスクあたりのタイムアウト（ミリ秒）
}

const DEFAULT_CONFIG: BatchExecutorConfig = {
  delayBetweenTasksMs: 5000, // 5秒（要件に従う）
  delayBetweenPagesMs: 2000, // 2秒
  maxRetries: 3,
  retryDelayMs: 3000,
  timeoutPerTaskMs: 120000, // 2分
};

/**
 * 遅延を追加（Sleep）
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 次のPendingタスクを取得
 */
export async function getNextPendingTask(): Promise<ResearchConditionStock | null> {
  const { data, error } = await supabase.rpc("get_next_pending_task");

  if (error) {
    console.error("❌ 次のタスク取得エラー:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log("ℹ️ Pendingタスクがありません");
    return null;
  }

  return data[0] as ResearchConditionStock;
}

/**
 * タスクのステータスを更新
 */
export async function updateTaskStatus(
  searchId: string,
  status: ResearchConditionStock["status"],
  updates: Partial<ResearchConditionStock> = {}
): Promise<void> {
  const updateData: any = {
    status,
    ...updates,
  };

  if (status === "processing") {
    updateData.started_at = new Date().toISOString();
    updateData.last_processed_at = new Date().toISOString();
  } else if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
    updateData.last_processed_at = new Date().toISOString();
  } else if (status === "failed") {
    updateData.last_processed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("research_condition_stock")
    .update(updateData)
    .eq("search_id", searchId);

  if (error) {
    console.error("❌ タスクステータス更新エラー:", error);
    throw error;
  }
}

/**
 * eBay Finding APIを呼び出し（findCompletedItems）
 *
 * @param task 検索条件タスク
 * @param pageNumber ページ番号（デフォルト: 1）
 * @returns APIレスポンス
 */
async function callFindingAPI(
  task: ResearchConditionStock,
  pageNumber: number = 1
): Promise<any> {
  if (!EBAY_APP_ID) {
    throw new Error("EBAY_APP_ID が設定されていません");
  }

  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.0.0",
    "SECURITY-APPNAME": EBAY_APP_ID,
    "RESPONSE-DATA-FORMAT": "JSON",
    "REST-PAYLOAD": "",
    "paginationInput.entriesPerPage": task.items_per_page.toString(),
    "paginationInput.pageNumber": pageNumber.toString(),
    "sortOrder": "EndTimeSoonest", // 終了日（Sold日）順
  });

  // セラーIDフィルター（最重要）
  params.append("itemFilter(0).name", "Seller");
  params.append("itemFilter(0).value", task.target_seller_id);

  // 出品ステータスフィルター
  if (task.listing_status === "Sold") {
    params.append("itemFilter(1).name", "SoldItemsOnly");
    params.append("itemFilter(1).value", "true");
  } else if (task.listing_status === "Completed") {
    // Completedは売れた+売れなかった両方を含む
    // SoldItemsOnlyフィルターを追加しない
  }

  // 出品タイプフィルター
  if (task.listing_type !== "All") {
    params.append("itemFilter(2).name", "ListingType");
    params.append("itemFilter(2).value", task.listing_type);
  }

  // 日付範囲フィルター
  const dateStart = new Date(task.date_start);
  const dateEnd = new Date(task.date_end);

  // EndTimeFromフィルター（終了日の開始）
  params.append("itemFilter(3).name", "EndTimeFrom");
  params.append("itemFilter(3).value", dateStart.toISOString());

  // EndTimeToフィルター（終了日の終了）
  params.append("itemFilter(4).name", "EndTimeTo");
  params.append("itemFilter(4).value", dateEnd.toISOString());

  // キーワード（任意）
  if (task.keyword) {
    params.set("keywords", task.keyword);
  }

  const apiUrl = `${EBAY_FINDING_API}?${params.toString()}`;

  console.log(`📡 Finding API呼び出し: ページ${pageNumber}`, {
    seller: task.target_seller_id,
    keyword: task.keyword || "(なし)",
    dateRange: `${task.date_start} ~ ${task.date_end}`,
  });

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ eBay API Error:", errorText);
    throw new Error(`eBay API Error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Finding APIレスポンスをパース
 */
function parseFindingResponse(data: any): {
  success: boolean;
  items: any[];
  totalEntries: number;
  totalPages: number;
  errorMessage?: string;
} {
  const findCompletedItemsResponse = data.findCompletedItemsResponse?.[0];

  if (!findCompletedItemsResponse) {
    return {
      success: false,
      items: [],
      totalEntries: 0,
      totalPages: 0,
      errorMessage: "eBay APIレスポンスの形式が不正です",
    };
  }

  const ack = findCompletedItemsResponse.ack?.[0];

  if (ack !== "Success") {
    const errorMessage =
      findCompletedItemsResponse.errorMessage?.[0]?.error?.[0]?.message?.[0] ||
      "Unknown error";
    const errorId =
      findCompletedItemsResponse.errorMessage?.[0]?.error?.[0]?.errorId?.[0] ||
      "";

    return {
      success: false,
      items: [],
      totalEntries: 0,
      totalPages: 0,
      errorMessage: `eBay API Error (${errorId}): ${errorMessage}`,
    };
  }

  const paginationOutput =
    findCompletedItemsResponse.paginationOutput?.[0] || {};
  const totalEntries = parseInt(paginationOutput.totalEntries?.[0] || "0");
  const totalPages = parseInt(paginationOutput.totalPages?.[0] || "0");

  const searchResult = findCompletedItemsResponse.searchResult?.[0];
  const items = searchResult?.item || [];

  return {
    success: true,
    items,
    totalEntries,
    totalPages,
  };
}

/**
 * eBayアイテムをデータベース形式に変換
 */
function transformEbayItem(
  item: any,
  task: ResearchConditionStock
): Omit<ResearchBatchResult, "id" | "created_at" | "updated_at"> {
  const itemId = item.itemId?.[0] || "";
  const title = item.title?.[0] || "";

  const sellerInfo = item.sellerInfo?.[0] || {};
  const sellerId = sellerInfo.sellerUserName?.[0] || "";
  const sellerFeedbackScore = parseInt(
    sellerInfo.feedbackScore?.[0] || "0"
  );
  const sellerPositiveFeedbackPercent = parseFloat(
    sellerInfo.positiveFeedbackPercent?.[0] || "0"
  );

  const sellingStatus = item.sellingStatus?.[0] || {};
  const currentPrice = parseFloat(
    sellingStatus.convertedCurrentPrice?.[0]?.__value__ || "0"
  );
  const currentPriceCurrency =
    sellingStatus.convertedCurrentPrice?.[0]?.["@currencyId"] || "USD";
  const sellingState = sellingStatus.sellingState?.[0] || "";

  const shippingInfo = item.shippingInfo?.[0] || {};
  const shippingCost = parseFloat(
    shippingInfo.shippingServiceCost?.[0]?.__value__ || "0"
  );

  const totalPrice = currentPrice + shippingCost;

  const listingInfo = item.listingInfo?.[0] || {};
  const listingType = listingInfo.listingType?.[0] || "";
  const startTime = listingInfo.startTime?.[0] || null;
  const endTime = listingInfo.endTime?.[0] || null;

  const primaryCategory = item.primaryCategory?.[0] || {};
  const categoryId = primaryCategory.categoryId?.[0] || "";
  const categoryName = primaryCategory.categoryName?.[0] || "";

  const condition = item.condition?.[0] || {};
  const conditionId = parseInt(condition.conditionId?.[0] || "0");
  const conditionDisplayName = condition.conditionDisplayName?.[0] || "";

  const location = item.location?.[0] || "";
  const country = item.country?.[0] || "";
  const postalCode = item.postalCode?.[0] || "";

  const viewItemURL = item.viewItemURL?.[0] || "";
  const galleryURL = item.galleryURL?.[0] || "";

  const returnsAccepted =
    item.returnsAccepted?.[0] === "true" ||
    item.returnsAccepted?.[0] === true;
  const topRatedListing =
    item.topRatedListing?.[0] === "true" ||
    item.topRatedListing?.[0] === true;

  const isSold = sellingState === "EndedWithSales";

  return {
    search_id: task.search_id,
    job_id: task.job_id,
    ebay_item_id: itemId,
    title,
    seller_id: sellerId,
    seller_feedback_score: sellerFeedbackScore,
    seller_positive_feedback_percent: sellerPositiveFeedbackPercent,
    current_price_usd: currentPrice,
    current_price_currency: currentPriceCurrency,
    shipping_cost_usd: shippingCost,
    total_price_usd: totalPrice,
    listing_type: listingType,
    condition_display_name: conditionDisplayName,
    condition_id: conditionId,
    primary_category_id: categoryId,
    primary_category_name: categoryName,
    location,
    country,
    postal_code: postalCode,
    listing_start_time: startTime ? new Date(startTime) : null,
    listing_end_time: endTime ? new Date(endTime) : null,
    is_sold: isSold,
    sold_date: isSold && endTime ? new Date(endTime) : null,
    view_item_url: viewItemURL,
    gallery_url: galleryURL,
    returns_accepted: returnsAccepted,
    top_rated_listing: topRatedListing,
    raw_api_data: item,
    search_keyword: task.keyword,
    date_range_start: new Date(task.date_start),
    date_range_end: new Date(task.date_end),
  };
}

/**
 * 結果をデータベースに保存（upsert）
 */
async function saveResults(
  results: Omit<ResearchBatchResult, "id" | "created_at" | "updated_at">[]
): Promise<void> {
  if (results.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("research_batch_results")
    .upsert(results, {
      onConflict: "ebay_item_id,search_id",
      ignoreDuplicates: false,
    });

  if (error) {
    console.error("❌ 結果保存エラー:", error);
    throw error;
  }

  console.log(`✅ ${results.length}件の結果を保存しました`);
}

/**
 * 単一タスクの実行（全ページネーションを含む）
 */
export async function executeTask(
  task: ResearchConditionStock,
  config: BatchExecutorConfig = DEFAULT_CONFIG
): Promise<BatchTaskExecutionResult> {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🚀 タスク実行開始: ${task.search_id}`);
  console.log(`📋 セラー: ${task.target_seller_id}`);
  console.log(`📅 期間: ${task.date_start} ~ ${task.date_end}`);
  console.log(`🔍 キーワード: ${task.keyword || "(なし)"}`);
  console.log(`${"=".repeat(80)}\n`);

  try {
    // タスクステータスを processing に更新
    await updateTaskStatus(task.search_id, "processing");

    let currentPage = task.current_page || 1;
    let totalPages = task.total_pages || 1;
    let totalItemsFound = 0;
    let totalItemsRetrieved = 0;
    const allResults: Omit<
      ResearchBatchResult,
      "id" | "created_at" | "updated_at"
    >[] = [];

    // ページネーションループ
    while (currentPage <= totalPages) {
      console.log(
        `\n📄 ページ ${currentPage}/${totalPages} を取得中...`
      );

      // API呼び出し
      const apiResponse = await callFindingAPI(task, currentPage);
      const parsed = parseFindingResponse(apiResponse);

      if (!parsed.success) {
        throw new Error(parsed.errorMessage || "API呼び出しに失敗しました");
      }

      // 初回呼び出しで総ページ数を取得
      if (currentPage === 1) {
        totalPages = parsed.totalPages;
        totalItemsFound = parsed.totalEntries;

        console.log(`📊 総アイテム数: ${totalItemsFound}件`);
        console.log(`📚 総ページ数: ${totalPages}ページ`);

        // タスクに総ページ数と総アイテム数を保存
        await updateTaskStatus(task.search_id, "processing", {
          total_pages: totalPages,
          total_items_found: totalItemsFound,
        });
      }

      // アイテムを変換
      const transformedItems = parsed.items.map((item) =>
        transformEbayItem(item, task)
      );

      // 結果を保存
      await saveResults(transformedItems);

      totalItemsRetrieved += transformedItems.length;

      // タスクの進捗を更新
      await updateTaskStatus(task.search_id, "processing", {
        current_page: currentPage,
        items_retrieved: totalItemsRetrieved,
      });

      console.log(`✅ ページ ${currentPage} 完了: ${transformedItems.length}件取得`);

      // 次のページへ
      currentPage++;

      // 最終ページでない場合は遅延を追加
      if (currentPage <= totalPages) {
        console.log(
          `⏳ ページ間遅延: ${config.delayBetweenPagesMs / 1000}秒...`
        );
        await sleep(config.delayBetweenPagesMs);
      }
    }

    // タスク完了
    await updateTaskStatus(task.search_id, "completed", {
      items_retrieved: totalItemsRetrieved,
    });

    // ジョブ進捗を更新
    await updateJobProgress(task.job_id);

    console.log(`\n✅ タスク完了: ${task.search_id}`);
    console.log(`📦 取得アイテム数: ${totalItemsRetrieved}件\n`);

    return {
      search_id: task.search_id,
      status: "success",
      items_retrieved: totalItemsRetrieved,
      total_items_found: totalItemsFound,
      total_pages: totalPages,
      current_page: currentPage - 1,
    };
  } catch (error: any) {
    console.error(`❌ タスク実行エラー: ${task.search_id}`, error);

    // リトライ判定
    const retryCount = task.retry_count || 0;
    if (retryCount < config.maxRetries) {
      console.log(
        `🔄 リトライ ${retryCount + 1}/${config.maxRetries} 準備中...`
      );
      await updateTaskStatus(task.search_id, "pending", {
        retry_count: retryCount + 1,
        error_message: error.message,
        error_details: { error: error.toString() },
      });

      return {
        search_id: task.search_id,
        status: "failed",
        items_retrieved: task.items_retrieved || 0,
        total_items_found: task.total_items_found || 0,
        total_pages: task.total_pages || 0,
        current_page: task.current_page || 1,
        error_message: error.message,
      };
    } else {
      console.log(`❌ 最大リトライ回数を超えました`);
      await updateTaskStatus(task.search_id, "failed", {
        error_message: error.message,
        error_details: { error: error.toString() },
      });

      await updateJobProgress(task.job_id);

      return {
        search_id: task.search_id,
        status: "failed",
        items_retrieved: task.items_retrieved || 0,
        total_items_found: task.total_items_found || 0,
        total_pages: task.total_pages || 0,
        current_page: task.current_page || 1,
        error_message: error.message,
      };
    }
  }
}

/**
 * ジョブ進捗を更新
 */
async function updateJobProgress(jobId: string): Promise<void> {
  const { error } = await supabase.rpc("update_job_progress", {
    p_job_id: jobId,
  });

  if (error) {
    console.error("❌ ジョブ進捗更新エラー:", error);
    // エラーでもスローしない（続行可能）
  }
}

/**
 * バッチエグゼキュータのメイン実行関数
 * Pendingタスクを順次実行
 *
 * @param maxTasks 最大実行タスク数（デフォルト: 10）
 * @param config バッチ実行設定
 */
export async function executeBatchTasks(
  maxTasks: number = 10,
  config: BatchExecutorConfig = DEFAULT_CONFIG
): Promise<{
  executed: number;
  succeeded: number;
  failed: number;
  results: BatchTaskExecutionResult[];
}> {
  console.log(`\n${"█".repeat(80)}`);
  console.log(`🎯 バッチエグゼキュータ起動`);
  console.log(`📊 最大実行タスク数: ${maxTasks}`);
  console.log(`⏱️  タスク間遅延: ${config.delayBetweenTasksMs / 1000}秒`);
  console.log(`${"█".repeat(80)}\n`);

  const results: BatchTaskExecutionResult[] = [];
  let executed = 0;
  let succeeded = 0;
  let failed = 0;

  while (executed < maxTasks) {
    // 次のタスクを取得
    const task = await getNextPendingTask();

    if (!task) {
      console.log("ℹ️ これ以上実行可能なタスクがありません");
      break;
    }

    // タスク実行
    const result = await executeTask(task, config);
    results.push(result);

    executed++;
    if (result.status === "success") {
      succeeded++;
    } else {
      failed++;
    }

    // 次のタスクがある場合は遅延を追加（APIレート制限対策）
    if (executed < maxTasks) {
      console.log(
        `\n⏳ タスク間遅延: ${config.delayBetweenTasksMs / 1000}秒...\n`
      );
      await sleep(config.delayBetweenTasksMs);
    }
  }

  console.log(`\n${"█".repeat(80)}`);
  console.log(`✅ バッチエグゼキュータ完了`);
  console.log(`📊 実行タスク数: ${executed}`);
  console.log(`✔️  成功: ${succeeded}`);
  console.log(`❌ 失敗: ${failed}`);
  console.log(`${"█".repeat(80)}\n`);

  return {
    executed,
    succeeded,
    failed,
    results,
  };
}
