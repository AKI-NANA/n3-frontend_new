// services/IntegratedPublisher.ts

/**
 * 統合出品実行モジュール
 * Phase 8: 最終出品統合ロジック
 *
 * このモジュールは、以下の3つのコア機能を統合します：
 * - T28: 戦略的グルーピング (ListingGroupManager)
 * - T29: 汎用APIコネクタハブ (UniversalApiConnector)
 * - T30: 特化型データマッパー (SpecializedDataMapper)
 *
 * ユーザーはマスターデータを入力後、グループIDを選択するだけで、
 * 複数のマーケットプレイスに一括で出品できます。
 */

import {
  type GroupId,
  type MarketplaceId,
  getMarketplacesByGroup,
  getGroupDefinition,
} from "./ListingGroupManager";

import {
  UniversalApiConnector,
  type ApiResponse,
  type ApiCallOptions,
} from "./UniversalApiConnector";

import {
  type MasterListingData,
  mapDataToSpecializedPayload,
  validateHsCodeFinalized,
  validateRequiredAttributes,
} from "./SpecializedDataMapper";

// ============================================================================
// 型定義
// ============================================================================

/**
 * 出品結果
 */
export interface PublicationResult {
  marketplaceId: MarketplaceId;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  listingId?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * グループ出品結果
 */
export interface GroupPublicationResult {
  groupId: GroupId;
  groupName: string;
  totalMarketplaces: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: PublicationResult[];
  executionTime: number; // ミリ秒
  summary: string;
}

/**
 * 出品オプション
 */
export interface PublicationOptions {
  /**
   * 並列実行の最大数（デフォルト: 3）
   */
  maxConcurrency?: number;

  /**
   * エラー時に出品を中止するか（デフォルト: false）
   */
  stopOnError?: boolean;

  /**
   * ドライラン（実際には出品しない）（デフォルト: false）
   */
  dryRun?: boolean;

  /**
   * API呼び出しオプション
   */
  apiOptions?: ApiCallOptions;

  /**
   * 特定のマーケットプレイスをスキップ
   */
  skipMarketplaces?: MarketplaceId[];
}

// ============================================================================
// メイン関数
// ============================================================================

/**
 * 複数のモールグループに対して、一括で出品を実行する
 *
 * @param masterListingData - HSコード、DDPコスト確定済みマスターデータ
 * @param targetGroupId - 出品対象のグループID (例: 'HIGH_END_LUXURY')
 * @param options - 出品オプション
 * @returns グループ出品結果
 *
 * @example
 * ```typescript
 * const masterData: MasterListingData = {
 *   master_id: "WATCH_001",
 *   title: "Rolex Submariner 116610LN",
 *   description: "Authentic Rolex watch in excellent condition",
 *   price_jpy: 1200000,
 *   currency: "JPY",
 *   quantity: 1,
 *   images: ["https://example.com/image1.jpg"],
 *   category: "Watches",
 *   condition: "Excellent",
 *   sku: "ROL-SUB-001",
 *   hs_code_final: "9101.21.00",
 *   hs_code_confirmed: true,
 *   ddp_cost_calculated: true,
 *   watch_condition: "1",
 *   certificate_type: "manufacturer",
 *   brand: "Rolex",
 * };
 *
 * const result = await publishToGroup(masterData, "HIGH_END_LUXURY");
 * console.log(result.summary);
 * ```
 */
export async function publishToGroup(
  masterListingData: MasterListingData,
  targetGroupId: GroupId,
  options: PublicationOptions = {}
): Promise<GroupPublicationResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("🚀 INTEGRATED PUBLISHER - Starting Group Publication");
  console.log("=".repeat(80));

  const {
    maxConcurrency = 3,
    stopOnError = false,
    dryRun = false,
    apiOptions = {},
    skipMarketplaces = [],
  } = options;

  // グループ情報を取得
  const groupDefinition = getGroupDefinition(targetGroupId);

  console.log(`\n📦 Target Group: ${groupDefinition.icon} ${groupDefinition.name}`);
  console.log(`   Description: ${groupDefinition.description}`);
  console.log(`   Master ID: ${masterListingData.master_id}`);
  console.log(`   Product: ${masterListingData.title}`);

  if (dryRun) {
    console.log(`\n⚠️  DRY RUN MODE - No actual API calls will be made`);
  }

  // ============================================================================
  // STEP 1: HSコード確定チェック (Phase 8要件)
  // ============================================================================

  console.log(`\n[STEP 1] Validating HS Code...`);
  try {
    validateHsCodeFinalized(masterListingData);
    console.log(
      `✅ HS Code validated: ${masterListingData.hs_code_final}`
    );
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`);
    return createFailedResult(
      targetGroupId,
      groupDefinition.name,
      0,
      "HS_CODE_NOT_FINALIZED",
      (error as Error).message,
      startTime
    );
  }

  // ============================================================================
  // STEP 2: グループIDから対象モールリストを取得 (T28)
  // ============================================================================

  console.log(`\n[STEP 2] Loading target marketplaces...`);
  const allMarketplaces = getMarketplacesByGroup(targetGroupId);

  // スキップするマーケットプレイスを除外
  const targetMarketplaces = allMarketplaces.filter(
    (marketId) => !skipMarketplaces.includes(marketId)
  );

  console.log(
    `   Total marketplaces: ${allMarketplaces.length} ` +
    `(Publishing to: ${targetMarketplaces.length}, Skipped: ${skipMarketplaces.length})`
  );

  if (skipMarketplaces.length > 0) {
    console.log(`   Skipped: ${skipMarketplaces.join(", ")}`);
  }

  // ============================================================================
  // STEP 3: 各マーケットプレイスに出品実行
  // ============================================================================

  console.log(`\n[STEP 3] Publishing to marketplaces...`);
  console.log(`   Max concurrency: ${maxConcurrency}`);

  const results: PublicationResult[] = [];

  // 並列実行のためにバッチに分割
  for (let i = 0; i < targetMarketplaces.length; i += maxConcurrency) {
    const batch = targetMarketplaces.slice(i, i + maxConcurrency);
    const batchNumber = Math.floor(i / maxConcurrency) + 1;
    const totalBatches = Math.ceil(targetMarketplaces.length / maxConcurrency);

    console.log(
      `\n   📤 Batch ${batchNumber}/${totalBatches}: Publishing to ${batch.join(", ")}...`
    );

    // バッチ内のマーケットプレイスに並列で出品
    const batchResults = await Promise.all(
      batch.map((marketId) =>
        publishToSingleMarketplace(
          masterListingData,
          marketId,
          dryRun,
          apiOptions
        )
      )
    );

    results.push(...batchResults);

    // エラー時に中止
    if (
      stopOnError &&
      batchResults.some((result) => result.status === "FAILED")
    ) {
      console.error(
        `\n❌ Stopping publication due to error (stopOnError = true)`
      );
      break;
    }

    // レート制限対策: バッチ間で少し待機
    if (i + maxConcurrency < targetMarketplaces.length) {
      console.log(`   ⏳ Waiting 2 seconds before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // スキップしたマーケットプレイスの結果を追加
  for (const marketId of skipMarketplaces) {
    results.push({
      marketplaceId: marketId,
      status: "SKIPPED",
      message: "Marketplace was skipped by configuration",
    });
  }

  // ============================================================================
  // STEP 4: 結果の集計とレポート
  // ============================================================================

  const executionTime = Date.now() - startTime;

  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;
  const skippedCount = results.filter((r) => r.status === "SKIPPED").length;

  console.log("\n" + "=".repeat(80));
  console.log("📊 PUBLICATION RESULTS");
  console.log("=".repeat(80));
  console.log(`Group: ${groupDefinition.icon} ${groupDefinition.name}`);
  console.log(`Total Marketplaces: ${results.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`⏱️  Execution Time: ${(executionTime / 1000).toFixed(2)}s`);
  console.log("=".repeat(80));

  // 詳細結果の出力
  console.log("\n📋 Detailed Results:");
  for (const result of results) {
    const icon =
      result.status === "SUCCESS"
        ? "✅"
        : result.status === "FAILED"
        ? "❌"
        : "⏭️";

    console.log(`   ${icon} ${result.marketplaceId}: ${result.status}`);

    if (result.listingId) {
      console.log(`      Listing ID: ${result.listingId}`);
    }
    if (result.message) {
      console.log(`      Message: ${result.message}`);
    }
    if (result.error) {
      console.log(`      Error: ${result.error.message}`);
    }
  }

  // サマリー
  const summary =
    `Published to ${groupDefinition.name}: ` +
    `${successCount}/${results.length} successful, ` +
    `${failedCount} failed, ${skippedCount} skipped. ` +
    `Execution time: ${(executionTime / 1000).toFixed(2)}s`;

  const groupResult: GroupPublicationResult = {
    groupId: targetGroupId,
    groupName: groupDefinition.name,
    totalMarketplaces: results.length,
    successCount,
    failedCount,
    skippedCount,
    results,
    executionTime,
    summary,
  };

  console.log("\n✨ Publication completed!");
  console.log("=".repeat(80) + "\n");

  return groupResult;
}

// ============================================================================
// 内部ヘルパー関数
// ============================================================================

/**
 * 単一のマーケットプレイスに出品
 */
async function publishToSingleMarketplace(
  masterListingData: MasterListingData,
  marketId: MarketplaceId,
  dryRun: boolean,
  apiOptions: ApiCallOptions
): Promise<PublicationResult> {
  try {
    console.log(`\n   🔧 [${marketId}] Preparing listing...`);

    // 必須属性の検証
    const validation = validateRequiredAttributes(masterListingData, marketId);
    if (!validation.valid) {
      console.error(`   ❌ [${marketId}] Validation failed:`);
      validation.errors.forEach((err) => console.error(`      - ${err}`));

      return {
        marketplaceId: marketId,
        status: "FAILED",
        error: {
          code: "VALIDATION_FAILED",
          message: validation.errors.join("; "),
          details: validation.errors,
        },
      };
    }

    // T30: 特化型データマッピング
    const payload = mapDataToSpecializedPayload(masterListingData, marketId);

    if (dryRun) {
      console.log(`   ✅ [${marketId}] DRY RUN - Payload prepared successfully`);
      return {
        marketplaceId: marketId,
        status: "SUCCESS",
        listingId: `DRY_RUN_${marketId}_${Date.now()}`,
        message: "Dry run - no actual API call made",
      };
    }

    // T29: 抽象化APIクライアントを使用して出品実行
    const response: ApiResponse = await UniversalApiConnector.publishListing(
      payload,
      marketId,
      apiOptions
    );

    if (!response.success) {
      console.error(`   ❌ [${marketId}] Publication failed`);
      return {
        marketplaceId: marketId,
        status: "FAILED",
        error: response.error,
      };
    }

    console.log(`   ✅ [${marketId}] Successfully published`);

    // T18: 在庫・価格同期への登録（将来実装）
    // await inventorySyncEngine.register(
    //   marketId,
    //   response.listingId!,
    //   masterListingData.master_id
    // );

    return {
      marketplaceId: marketId,
      status: "SUCCESS",
      listingId: response.listingId,
      message: response.message,
    };
  } catch (error) {
    console.error(`   ❌ [${marketId}] Exception:`, error);

    return {
      marketplaceId: marketId,
      status: "FAILED",
      error: {
        code: "EXCEPTION",
        message: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
    };
  }
}

/**
 * 失敗結果を作成
 */
function createFailedResult(
  groupId: GroupId,
  groupName: string,
  totalMarketplaces: number,
  errorCode: string,
  errorMessage: string,
  startTime: number
): GroupPublicationResult {
  return {
    groupId,
    groupName,
    totalMarketplaces,
    successCount: 0,
    failedCount: totalMarketplaces,
    skippedCount: 0,
    results: [],
    executionTime: Date.now() - startTime,
    summary: `Publication failed: ${errorMessage}`,
  };
}

// ============================================================================
// 追加のユーティリティ関数
// ============================================================================

/**
 * 複数のグループに同時に出品
 *
 * @param masterListingData - マスターデータ
 * @param groupIds - 出品対象のグループID配列
 * @param options - 出品オプション
 * @returns グループごとの出品結果
 */
export async function publishToMultipleGroups(
  masterListingData: MasterListingData,
  groupIds: GroupId[],
  options: PublicationOptions = {}
): Promise<GroupPublicationResult[]> {
  console.log(
    `\n🌐 Publishing to ${groupIds.length} groups: ${groupIds.join(", ")}`
  );

  const results: GroupPublicationResult[] = [];

  for (const groupId of groupIds) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Starting publication to group: ${groupId}`);

    const result = await publishToGroup(masterListingData, groupId, options);
    results.push(result);

    console.log(`Completed publication to group: ${groupId}`);
  }

  // 全体サマリー
  const totalMarketplaces = results.reduce(
    (sum, r) => sum + r.totalMarketplaces,
    0
  );
  const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failedCount, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skippedCount, 0);

  console.log("\n" + "=".repeat(80));
  console.log("🌟 MULTI-GROUP PUBLICATION SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total Groups: ${groupIds.length}`);
  console.log(`Total Marketplaces: ${totalMarketplaces}`);
  console.log(`✅ Total Success: ${totalSuccess}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`⏭️  Total Skipped: ${totalSkipped}`);
  console.log("=".repeat(80) + "\n");

  return results;
}

/**
 * ドライランでグループ出品をテスト
 *
 * @param masterListingData - マスターデータ
 * @param groupId - グループID
 * @returns ドライラン結果
 */
export async function testPublishToGroup(
  masterListingData: MasterListingData,
  groupId: GroupId
): Promise<GroupPublicationResult> {
  return publishToGroup(masterListingData, groupId, {
    dryRun: true,
    maxConcurrency: 10, // ドライランでは並列数を増やしても問題ない
  });
}
