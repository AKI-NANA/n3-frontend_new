import React, { useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  SkipForward,
  ArrowRight,
} from "lucide-react";

// --------------------------------------------------------------------------------
// モジュール依存関係のモック
// 💡 クロード様への注釈:
// 実際のシステムでは、これらは src/services/ListingExecutorService.ts
// からインポートする必要があります。ここでは単一ファイル実行のため、モックとして定義します。
// --------------------------------------------------------------------------------

// 既存のListingExecutorService.tsから型定義を流用
const MOCK_MALL_IDS = [
  "AMAZON_JP",
  "SHOPEE_SG",
  "MERCADO_LIBRE",
  "ALLEGRO",
  "ETSY",
  "GRAILED",
  "QOO10_JP",
  "REVERB",
];

const mallNames = {
  AMAZON_JP: "Amazon JP",
  SHOPEE_SG: "Shopee SG",
  MERCADO_LIBRE: "Mercado Libre",
  ALLEGRO: "Allegro",
  ETSY: "Etsy",
  GRAILED: "Grailed",
  QOO10_JP: "Qoo10 JP",
  REVERB: "Reverb",
  OTTO: "Otto",
  COUPANG: "Coupang",
  TCGPLAYER: "TCGplayer",
  CHRONO24: "Chrono24",
  NOON: "Noon",
  FALABELLA: "Falabella",
  DISCOGS: "Discogs",
};

// 簡易的なProduct型 (SKUデータ)
const mockProducts = [
  {
    id: 9001,
    title_jp: "ハイエンドオーディオケーブル 1.5m",
    cost_price: 35000,
    weight_g: 750,
    current_stock: 50,
    category_id: "C-AUDIO-CABLE",
  },
  {
    id: 9002,
    title_jp: "低価格汎用アクセサリー",
    cost_price: 500,
    weight_g: 50,
    current_stock: 200,
    category_id: "C-ACC-GEN",
  },
  {
    id: 9003,
    title_jp: "ヴィンテージギターエフェクター",
    cost_price: 120000,
    weight_g: 1500,
    current_stock: 5,
    category_id: "C-MUSIC-GEAR",
  },
];

// ListingExecutorService.tsの executeListingJobs のモック関数
// 実際にはAPI通信を含めた複雑なロジックが実行されます
async function mockExecuteListingJobs(jobs) {
  console.log("MOCK: Listing Jobs 実行開始", jobs);
  const allResults = [];

  for (const job of jobs) {
    for (const mallId of job.targetMalls) {
      await new Promise((resolve) => setTimeout(resolve, 300)); // 通信遅延シミュレート

      let status,
        message,
        grossProfitJPY,
        apiResponseData = null;

      // SKU 9002 (原価500円) は利益が出ず、ETSY/GRAILEDでスキップされるシナリオをシミュレート
      if (
        job.product.id === 9002 &&
        (mallId === "ETSY" || mallId === "GRAILED")
      ) {
        status = "SKIPPED";
        message =
          "出品スキップ: 利益計算の結果、目標粗利を確保できませんでした。";
        grossProfitJPY = -1500;
      } else if (Math.random() < 0.1) {
        // 10%で失敗をシミュレート
        status = "FAILED";
        message = "[API連携失敗] 認証エラーまたはカテゴリーマッピングエラー";
        grossProfitJPY = Math.floor(Math.random() * 5000);
      } else {
        status = "SUCCESS";
        message = "出品成功: 販売価格が決定され、モールAPIに送信されました。";
        grossProfitJPY = Math.floor(
          job.product.cost_price * (Math.random() * 0.3 + 0.25)
        ); // 25-55%の粗利をシミュレート
        apiResponseData = { id: `LST-${job.product.id}-${mallId}` };
      }

      allResults.push({
        mallId,
        status,
        message,
        grossProfitJPY,
        apiResponseData,
        productId: job.product.id,
      });
    }
  }
  return allResults;
}

// --- メインコンポーネント ---

const ListingManager = () => {
  const [selectedMalls, setSelectedMalls] = useState([]);
  // 修正: 重複していた `setIsLoading] = useState(false)` を削除しました
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);

  // モール選択のトグル
  const toggleMall = useCallback((mallId) => {
    setSelectedMalls((prev) =>
      prev.includes(mallId)
        ? prev.filter((id) => id !== mallId)
        : [...prev, mallId]
    );
  }, []);

  // 全モール選択/解除
  const toggleSelectAll = useCallback(() => {
    setSelectedMalls((prev) =>
      prev.length === MOCK_MALL_IDS.length ? [] : MOCK_MALL_IDS
    );
  }, []);

  // 出品実行ロジック
  const handleExecuteListing = async () => {
    // NOTE: alert() は custom modal UI に置き換える必要がありますが、ここでは迅速なテストのため一時的に使用します。
    if (selectedMalls.length === 0) {
      console.warn("出品対象のモールを一つ以上選択してください。");
      // alert("出品対象のモールを一つ以上選択してください。"); // alert禁止規則のため、コンソールに警告のみ
      return;
    }

    setIsLoading(true);
    setResults([]);

    // 実行ジョブの構築
    const jobs = mockProducts.map((p) => ({
      product: p,
      targetMalls: selectedMalls,
      targetProfitRate: p.id === 9002 ? 0.3 : 0.25, // SKUによって目標利益率を変えるテスト
    }));

    try {
      const finalResults = await mockExecuteListingJobs(jobs);
      setResults(finalResults);
    } catch (error) {
      console.error("出品実行中に致命的なエラー:", error);
      setResults([
        {
          mallId: "SYSTEM",
          status: "FAILED",
          message: `システムエラー: ${error.message}`,
          grossProfitJPY: null,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 結果の色分け
  const getStatusStyle = (status) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-100 text-green-700";
      case "SKIPPED":
        return "bg-yellow-100 text-yellow-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status) => {
    const size = 16;
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "SKIPPED":
        return <SkipForward className="w-4 h-4 text-yellow-500" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <RefreshCw className="w-4 h-4 text-gray-500" />;
    }
  };

  const totalResults = results.length;
  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const skippedCount = results.filter((r) => r.status === "SKIPPED").length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen font-sans">
      <script src="https://cdn.tailwindcss.com"></script>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap");
        body {
          font-family: "Inter", sans-serif;
        }
      `}</style>

      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
        マルチモール出品指示センター
      </h1>

      {/* SKUリスト */}
      <div className="bg-white shadow-xl rounded-xl p-6 mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          出品対象 SKU リスト (モック)
        </h2>
        <div className="space-y-3">
          {mockProducts.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center p-4 bg-blue-50/50 rounded-lg border border-blue-100"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-gray-800">
                  {p.title_jp}
                </span>
                <span className="text-sm text-gray-500">
                  SKU: {p.id} | 原価: {p.cost_price.toLocaleString()} JPY |
                  在庫: {p.current_stock}
                </span>
              </div>
              <span className="text-sm font-medium text-blue-600 px-3 py-1 rounded-full bg-blue-100">
                {p.weight_g} g
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* モール選択と実行ボタン */}
      <div className="bg-white shadow-xl rounded-xl p-6 mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          ターゲットモール選択
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {MOCK_MALL_IDS.map((id) => (
            <button
              key={id}
              onClick={() => toggleMall(id)}
              className={`p-3 text-sm font-medium rounded-lg transition-all duration-200 shadow-md ${
                selectedMalls.includes(id)
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 transform scale-105"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              disabled={isLoading}
            >
              {mallNames[id] || id}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={toggleSelectAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
            disabled={isLoading}
          >
            {selectedMalls.length === MOCK_MALL_IDS.length
              ? "全て解除"
              : "全て選択"}
          </button>

          <button
            onClick={handleExecuteListing}
            className={`px-8 py-3 rounded-xl text-white font-bold text-lg transition-colors duration-300 shadow-lg ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                実行中... ({results.length}/
                {mockProducts.length * selectedMalls.length})
              </div>
            ) : (
              <div className="flex items-center">
                出品処理を全て実行 <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* 実行結果セクション */}
      <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          出品実行結果{" "}
          <span className="text-sm text-gray-500">({totalResults} 件)</span>
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-green-50 rounded-lg text-center shadow-sm">
            <p className="text-sm text-gray-500">成功</p>
            <p className="text-2xl font-bold text-green-600">{successCount}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center shadow-sm">
            <p className="text-sm text-gray-500">スキップ (低利益)</p>
            <p className="text-2xl font-bold text-yellow-600">{skippedCount}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center shadow-sm">
            <p className="text-sm text-gray-500">失敗 (APIエラー)</p>
            <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU ID / 商品名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  モール
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  粗利 (JPY)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メッセージ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    出品処理を実行してください。
                  </td>
                </tr>
              ) : (
                results.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.productId}
                      <div className="text-xs text-gray-500">
                        {
                          mockProducts.find((p) => p.id === result.productId)
                            ?.title_jp
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                      {mallNames[result.mallId] || result.mallId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(
                          result.status
                        )}`}
                      >
                        {getStatusIcon(result.status)}
                        <span className="ml-1">{result.status}</span>
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                        result.grossProfitJPY < 0
                          ? "text-red-500"
                          : "text-green-600"
                      }`}
                    >
                      {result.grossProfitJPY !== null
                        ? result.grossProfitJPY.toLocaleString() + " JPY"
                        : "N/A"}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate"
                      title={result.message}
                    >
                      {result.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ListingManager;
