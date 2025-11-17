/**
 * リサーチ分析ダッシュボード用の型定義
 */

// フィルタリング条件
export interface ResearchAnalyticsFilters {
  dataSource?: string | null;
  riskLevel?: 'high' | 'medium' | 'low' | null;
  status?: 'promoted' | 'rejected' | 'pending' | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

// リサーチ統計情報
export interface ResearchStatistics {
  total: number;
  promoted: number;
  rejected: number;
  pending: number;
  success_rate: number;
  rejection_rate: number;
}

// VEROリスク分布
export interface VeroRiskDistribution {
  risk_level: string;
  count: number;
  percentage: number;
}

// 市場流通数と成功率の相関データ
export interface MarketVolumeCorrelation {
  market_volume: number;
  price: number;
  is_promoted: boolean;
  status: string;
  title: string;
  ebay_item_id: string;
}

// HTSコード頻度
export interface HtsCodeFrequency {
  hts_code: string;
  count: number;
  success_rate: number;
}

// カテゴリ別成功率
export interface CategorySuccessRate {
  category: string;
  total: number;
  promoted: number;
  success_rate: number;
}

// リサーチデータ一覧の個別レコード
export interface ResearchDataItem {
  id: string;
  ebay_item_id: string;
  title: string;
  title_jp?: string;
  price: number;
  sold_count: number;
  competitor_count: number;
  total_score: number;
  rank?: number;
  risk_level: string;
  status: string;
  best_supplier_source?: string;
  best_supplier_price?: number;
  hs_code?: string;
  category?: string;
  created_at: string;
}

// リサーチデータ一覧のレスポンス
export interface ResearchDataList {
  data: ResearchDataItem[];
  total: number;
}

// スコアブレークダウン
export interface ScoreBreakdown {
  profitRate?: number;
  salesVolume?: number;
  competition?: number;
  riskLevel?: number;
  trendScore?: number;
}

// 利益計算結果
export interface ProfitCalculation {
  targetPrice?: number;
  productPrice?: number;
  shippingCost?: number;
  profitMargin?: number;
  profitAmount?: number;
  profitAmountJPY?: number;
  breakEvenCostJPY?: number;
  recommendedMaxCostJPY?: number;
}

// リスク要因
export interface RiskFactors {
  section301Risk?: boolean;
  trumpTariffRisk?: boolean;
  counterfeitRisk?: boolean;
  marketVolatility?: boolean;
  regulatoryRisk?: boolean;
  supplierRisk?: boolean;
}

// 仕入先マッチング
export interface SupplierMatch {
  source: string;
  price: number;
  confidence: number;
  url?: string;
}

// リサーチデータ詳細
export interface ResearchDataDetail {
  id: string;
  research_id?: string;
  ebay_item_id: string;
  title: string;
  title_jp?: string;
  price: number;
  sold_count: number;
  competitor_count: number;
  total_score: number;
  rank?: number;
  score_breakdown?: ScoreBreakdown;
  profit_calculation?: ProfitCalculation;
  risk_factors?: RiskFactors;
  risk_level: string;
  origin_country?: string;
  hs_code?: string;
  weight_kg?: number;
  category?: string;
  condition?: string;
  supplier_matches?: SupplierMatch[];
  best_supplier_source?: string;
  best_supplier_price?: number;
  status: string;
  calculated_at?: string;
  created_at: string;
  updated_at: string;
}

// ページネーション
export interface Pagination {
  limit: number;
  offset: number;
  total: number;
  currentPage: number;
  totalPages: number;
}

// データソースオプション
export const DATA_SOURCE_OPTIONS = [
  { value: 'ebay', label: 'eBay API' },
  { value: 'amazon', label: 'Amazon API' },
  { value: 'singlestar', label: 'singlestar.jp' },
  { value: 'manual', label: '手動入力' },
] as const;

// リスクレベルオプション
export const RISK_LEVEL_OPTIONS = [
  { value: 'high', label: 'リスク高', color: 'text-red-600 bg-red-50' },
  { value: 'medium', label: 'リスク中', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'low', label: 'リスク低', color: 'text-green-600 bg-green-50' },
] as const;

// ステータスオプション
export const STATUS_OPTIONS = [
  { value: 'promoted', label: 'Promoted（昇格済み）', color: 'text-blue-600 bg-blue-50' },
  { value: 'rejected', label: 'Rejected（却下済み）', color: 'text-red-600 bg-red-50' },
  { value: 'pending', label: 'Pending（未処理）', color: 'text-gray-600 bg-gray-50' },
] as const;

// 期間プリセット
export const DATE_RANGE_PRESETS = [
  { value: 'today', label: '本日' },
  { value: 'week', label: '直近1週間' },
  { value: 'month', label: '直近1ヶ月' },
  { value: 'quarter', label: '直近3ヶ月' },
  { value: 'year', label: '今年' },
  { value: 'custom', label: 'カスタム' },
] as const;
