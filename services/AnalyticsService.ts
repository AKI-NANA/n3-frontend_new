// services/AnalyticsService.ts

/**
 * 販売解析・KPIサービス
 * ダッシュボード表示に必要な分析ロジックをシミュレート
 */

interface SalesOrder {
  orderId: string;
  category: string;
  finalProfitJPY: number;
  salesCount: number; // 数量
  listingViews: number;
  listingWatchers: number;
}

// -- モックデータ --
const MOCK_SALES_DATA: SalesOrder[] = [
  {
    orderId: "ORD-1001",
    category: "BrandGoods/Watch",
    finalProfitJPY: 15000,
    salesCount: 1,
    listingViews: 1200,
    listingWatchers: 50,
  },
  {
    orderId: "ORD-1002",
    category: "BrandGoods/Watch",
    finalProfitJPY: 16500,
    salesCount: 1,
    listingViews: 1500,
    listingWatchers: 60,
  },
  {
    orderId: "ORD-1003",
    category: "Electronics/Camera",
    finalProfitJPY: 8000,
    salesCount: 1,
    listingViews: 800,
    listingWatchers: 30,
  },
  {
    orderId: "ORD-1004",
    category: "Electronics/Camera",
    finalProfitJPY: 9500,
    salesCount: 1,
    listingViews: 900,
    listingWatchers: 35,
  },
  {
    orderId: "ORD-1005",
    category: "Electronics/Camera",
    finalProfitJPY: 10000,
    salesCount: 1,
    listingViews: 1100,
    listingWatchers: 40,
  },
  {
    orderId: "ORD-1006",
    category: "Misc/Accessory",
    finalProfitJPY: 2000,
    salesCount: 5,
    listingViews: 300,
    listingWatchers: 10,
  },
];

/**
 * 配列の中央値を計算するヘルパー関数
 * @param arr 数値配列
 * @returns 中央値
 */
const calculateMedian = (arr: number[]): number => {
  const sorted = [...arr].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length === 0) return 0;
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

/**
 * 確定利益の中央値を算出 (指示書 I.1)
 * @returns 確定純利益の中央値 (JPY)
 */
export function getMedianFinalProfit(): number {
  const profits = MOCK_SALES_DATA.map((d) => d.finalProfitJPY);
  return calculateMedian(profits);
}

/**
 * カテゴリー別利益成績を算出 (指示書 I.2)
 * @returns カテゴリ名とその利益中央値、販売個数
 */
export function getCategoryProfitPerformance(): {
  category: string;
  medianProfit: number;
  totalSales: number;
}[] {
  const categoryMap = new Map<string, number[]>();
  const salesCountMap = new Map<string, number>();

  MOCK_SALES_DATA.forEach((d) => {
    const profits = categoryMap.get(d.category) || [];
    profits.push(d.finalProfitJPY);
    categoryMap.set(d.category, profits);

    salesCountMap.set(
      d.category,
      (salesCountMap.get(d.category) || 0) + d.salesCount
    );
  });

  const results: {
    category: string;
    medianProfit: number;
    totalSales: number;
  }[] = [];
  categoryMap.forEach((profits, category) => {
    results.push({
      category,
      medianProfit: calculateMedian(profits),
      totalSales: salesCountMap.get(category) || 0,
    });
  });

  return results.sort((a, b) => b.medianProfit - a.medianProfit);
}

/**
 * SEO状態スコアを算出 (指示書 I.4)
 * ビュー数/ウォッチリストのカテゴリー平均に対する偏差値を模擬
 * @param data 個別受注データ
 * @returns SEOスコア (0-100)
 */
export function calculateSeoScore(data: SalesOrder): number {
  // カテゴリー全体の平均ビュー数とウォッチリストを計算 (モック)
  const categoryAvgViews =
    MOCK_SALES_DATA.filter((d) => d.category === data.category)
      .map((d) => d.listingViews)
      .reduce((a, b) => a + b, 0) /
      MOCK_SALES_DATA.filter((d) => d.category === data.category).length || 1;

  const categoryAvgWatchers =
    MOCK_SALES_DATA.filter((d) => d.category === data.category)
      .map((d) => d.listingWatchers)
      .reduce((a, b) => a + b, 0) /
      MOCK_SALES_DATA.filter((d) => d.category === data.category).length || 1;

  // 簡易偏差値ロジックをシミュレート
  // (ビュー数とウォッチリスト数の平均に対する比率)
  const viewRatio = data.listingViews / categoryAvgViews;
  const watcherRatio = data.listingWatchers / categoryAvgWatchers;

  // スコア (0-100) = (比率の平均 * 50) + 50
  // 例: 平均の場合 -> (1 * 50) + 50 = 100
  // 例: 平均の半分の場合 -> (0.5 * 50) + 50 = 75 (低スコア)
  const score = Math.min(
    100,
    Math.round(((viewRatio + watcherRatio) / 2) * 50 + 50)
  );

  return score;
}

/**
 * 低スコア商品を抽出し、改善タスクをアラート (指示書 I.4)
 * @returns 改善が必要な商品リスト
 */
export function getLowScoreItemsForImprovement(): {
  orderId: string;
  category: string;
  seoScore: number;
}[] {
  const lowScoreItems = MOCK_SALES_DATA.map((item) => ({
    orderId: item.orderId,
    category: item.category,
    seoScore: calculateSeoScore(item),
  })).filter((item) => item.seoScore < 75); // スコア75未満を改善対象とする

  return lowScoreItems;
}
