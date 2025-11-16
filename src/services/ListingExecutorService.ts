/**
 * src/services/ListingExecutorService.ts
 * 目的: マルチモール出品のワークフローを制御し、データ変換とAPI連携を実行する。
 * このサービスは、出品制御の中枢として機能する。
 */

import {
  Product,
  TargetMallId,
  ConversionResult,
  convertProductData,
} from "./MultiMarketplaceListingService";

// SKUデータと出品先モールIDのリスト
export interface ListingJob {
  product: Product;
  targetMalls: TargetMallId[];
  targetProfitRate?: number; // SKUごとの目標利益率を設定可能にする
}

// 出品処理結果の型
export interface ListingExecutionResult {
  mallId: TargetMallId;
  status: "SUCCESS" | "SKIPPED" | "FAILED";
  message: string;
  grossProfitJPY: number | null;
  apiResponseData?: any;
}

/**
 * 💡 クロード様への注釈:
 * 既存のモール別API送信ロジックをここに統合してください。
 * 各モールIDに応じて、適切なAPIエンドポイントへのPOSTリクエストを実行します。
 *
 * @param {TargetMallId} mallId - 出品先モールID
 * @param {any} apiData - モールAPI向けの変換済みデータ
 * @returns {Promise<any>} APIレスポンスデータ
 */
async function sendToMallApi(mallId: TargetMallId, apiData: any): Promise<any> {
  console.log(`[API MOCK] ${mallId} への出品APIを呼び出し中...`);

  // 実際のAPI通信ロジックをここに実装する
  // 例: await fetch(`/api/${mallId}/listing`, { method: 'POST', body: JSON.stringify(apiData) });

  // モックとしてランダムに成功・失敗を返す
  const isSuccess = Math.random() > 0.15; // 15%で失敗をシミュレート

  await new Promise((resolve) => setTimeout(resolve, 500)); // 500msの遅延をシミュレート

  if (!isSuccess) {
    throw new Error(`[${mallId}] API通信エラー: タイムアウトまたは認証失敗`);
  }

  return {
    id: `LISTING-${Date.now()}-${mallId}`,
    message: "Listing created/updated successfully.",
    status: "OK",
  };
}

/**
 * 出品ジョブを実行するメイン関数
 * @param {ListingJob[]} jobs - 実行する出品ジョブの配列
 * @returns {Promise<ListingExecutionResult[]>} 全ての実行結果
 */
export async function executeListingJobs(
  jobs: ListingJob[]
): Promise<ListingExecutionResult[]> {
  const allResults: ListingExecutionResult[] = [];

  for (const job of jobs) {
    const { product, targetMalls, targetProfitRate } = job;

    for (const mallId of targetMalls) {
      console.log(`--- [SKU:${product.id}] ${mallId} の出品処理を開始 ---`);

      let conversionResult: ConversionResult;
      try {
        // 1. データ変換と利益計算の実行
        conversionResult = convertProductData(product, mallId, "API_JSON");
      } catch (e: any) {
        // 変換ロジック自体の実行時エラー
        const result: ListingExecutionResult = {
          mallId,
          status: "FAILED",
          message: `変換ロジックで予期せぬエラーが発生: ${e.message}`,
          grossProfitJPY: null,
        };
        allResults.push(result);
        console.error(result.message);
        continue;
      }

      // 2. 実行判断 (スキップ条件の確認)
      if (conversionResult.errors.length > 0) {
        const result: ListingExecutionResult = {
          mallId,
          status: "SKIPPED",
          message: `出品スキップ: 利益計算失敗 または 変換エラー [${conversionResult.errors.join(
            ", "
          )}]`,
          grossProfitJPY: conversionResult.gross_profit_jpy,
        };
        allResults.push(result);
        console.warn(result.message);
        continue;
      }

      // 3. API連携の実行
      try {
        const apiResponse = await sendToMallApi(mallId, conversionResult.data);

        // 成功
        const result: ListingExecutionResult = {
          mallId,
          status: "SUCCESS",
          message: `出品成功。販売価格: ${
            conversionResult.data.price_local || conversionResult.data.price
          } ${conversionResult.data.currency}. 粗利(JPY): ${
            conversionResult.gross_profit_jpy
          }`,
          grossProfitJPY: conversionResult.gross_profit_jpy,
          apiResponseData: apiResponse,
        };
        allResults.push(result);
        console.log(result.message);
      } catch (e: any) {
        // API連携時のエラー
        const result: ListingExecutionResult = {
          mallId,
          status: "FAILED",
          message: `API連携失敗: ${e.message}`,
          grossProfitJPY: conversionResult.gross_profit_jpy,
        };
        allResults.push(result);
        console.error(result.message);
      }
    }
  }

  return allResults;
}

// --- テスト実行のモック ---
/*
 * 💡 クロード様への注釈:
 * このテストセクションは、出品実行サービスの動作確認用です。
 * 既存のシステムと連携する際は削除してください。
 *
 * 以下のモックを実行することで、出品の全フローを確認できます。
 */
const mockProduct: Product = {
  id: 9001,
  title_jp: "【日本限定】ハイエンド・ヴィンテージオーディオケーブル 1.5m",
  cost_price: 35000, // JPY
  weight_g: 750, // 750g
  current_stock: 50,
  category_id: "C-AUDIO-CABLE",
};

const testJobs: ListingJob[] = [
  {
    product: mockProduct,
    targetMalls: ["SHOPEE_SG", "MERCADO_LIBRE", "ALLEGRO", "COUPANG", "REVERB"],
  },
  {
    product: { ...mockProduct, id: 9002, cost_price: 500 }, // 利益が出にくい低価格帯のSKUをシミュレート
    targetMalls: ["ETSY", "GRAILED", "AMAZON_JP"],
  },
];

async function runTest() {
  console.log("\n====================================");
  console.log("🔥 出品実行サービス テスト開始 🔥");
  console.log("====================================");

  const finalResults = await executeListingJobs(testJobs);

  console.log("\n====================================");
  console.log("✅ 全ジョブの実行結果サマリー ✅");
  console.log("====================================");
  finalResults.forEach((res) => {
    console.log(
      `[${res.status}] ${res.mallId} (SKU: ${
        res.apiResponseData?.id || "N/A"
      }): ${res.message} (粗利: ${res.grossProfitJPY || "N/A"} JPY)`
    );
  });
}

// runTest(); // 既存システムと干渉しないよう、自動実行はコメントアウト
