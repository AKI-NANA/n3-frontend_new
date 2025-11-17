/**
 * リサーチ分析ダッシュボード用 API クライアント
 */

import { supabase } from '@/lib/supabase';
import type {
  ResearchAnalyticsFilters,
  ResearchStatistics,
  VeroRiskDistribution,
  MarketVolumeCorrelation,
  HtsCodeFrequency,
  CategorySuccessRate,
  ResearchDataList,
  ResearchDataDetail,
} from './types';

/**
 * フィルタをRPC関数のパラメータに変換
 */
function formatFilters(filters: ResearchAnalyticsFilters) {
  return {
    p_data_source: filters.dataSource || null,
    p_risk_level: filters.riskLevel || null,
    p_status: filters.status || null,
    p_start_date: filters.startDate?.toISOString() || null,
    p_end_date: filters.endDate?.toISOString() || null,
  };
}

/**
 * リサーチ全体統計を取得
 */
export async function getResearchStatistics(
  filters: ResearchAnalyticsFilters = {}
): Promise<ResearchStatistics> {
  const { data, error } = await supabase.rpc('get_research_statistics', formatFilters(filters));

  if (error) {
    console.error('Failed to fetch research statistics:', error);
    throw new Error('リサーチ統計の取得に失敗しました');
  }

  return data as ResearchStatistics;
}

/**
 * VEROリスク分布を取得
 */
export async function getVeroRiskDistribution(
  filters: Omit<ResearchAnalyticsFilters, 'riskLevel'> = {}
): Promise<VeroRiskDistribution[]> {
  const { data, error } = await supabase.rpc('get_vero_risk_distribution', {
    p_data_source: filters.dataSource || null,
    p_status: filters.status || null,
    p_start_date: filters.startDate?.toISOString() || null,
    p_end_date: filters.endDate?.toISOString() || null,
  });

  if (error) {
    console.error('Failed to fetch VERO risk distribution:', error);
    throw new Error('VEROリスク分布の取得に失敗しました');
  }

  return (data as VeroRiskDistribution[]) || [];
}

/**
 * 市場流通数と成功率の相関を取得
 */
export async function getMarketVolumeCorrelation(
  filters: Omit<ResearchAnalyticsFilters, 'status'> = {}
): Promise<MarketVolumeCorrelation[]> {
  const { data, error } = await supabase.rpc('get_market_volume_correlation', {
    p_data_source: filters.dataSource || null,
    p_risk_level: filters.riskLevel || null,
    p_start_date: filters.startDate?.toISOString() || null,
    p_end_date: filters.endDate?.toISOString() || null,
  });

  if (error) {
    console.error('Failed to fetch market volume correlation:', error);
    throw new Error('市場流通数相関データの取得に失敗しました');
  }

  return (data as MarketVolumeCorrelation[]) || [];
}

/**
 * HTSコードの頻度を取得
 */
export async function getHtsCodeFrequency(
  filters: Omit<ResearchAnalyticsFilters, 'riskLevel'> = {}
): Promise<HtsCodeFrequency[]> {
  const { data, error } = await supabase.rpc('get_hts_code_frequency', {
    p_data_source: filters.dataSource || null,
    p_status: filters.status || null,
    p_start_date: filters.startDate?.toISOString() || null,
    p_end_date: filters.endDate?.toISOString() || null,
  });

  if (error) {
    console.error('Failed to fetch HTS code frequency:', error);
    throw new Error('HTSコード頻度の取得に失敗しました');
  }

  return (data as HtsCodeFrequency[]) || [];
}

/**
 * カテゴリ別成功率を取得
 */
export async function getCategorySuccessRate(
  filters: Omit<ResearchAnalyticsFilters, 'status'> = {}
): Promise<CategorySuccessRate[]> {
  const { data, error } = await supabase.rpc('get_category_success_rate', {
    p_data_source: filters.dataSource || null,
    p_risk_level: filters.riskLevel || null,
    p_start_date: filters.startDate?.toISOString() || null,
    p_end_date: filters.endDate?.toISOString() || null,
  });

  if (error) {
    console.error('Failed to fetch category success rate:', error);
    throw new Error('カテゴリ別成功率の取得に失敗しました');
  }

  return (data as CategorySuccessRate[]) || [];
}

/**
 * リサーチデータ一覧を取得
 */
export async function getResearchDataList(
  filters: ResearchAnalyticsFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<ResearchDataList> {
  const { data, error } = await supabase.rpc('get_research_data_list', {
    ...formatFilters(filters),
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Failed to fetch research data list:', error);
    throw new Error('リサーチデータ一覧の取得に失敗しました');
  }

  return (data as ResearchDataList) || { data: [], total: 0 };
}

/**
 * 個別リサーチデータの詳細を取得
 */
export async function getResearchDetail(id: string): Promise<ResearchDataDetail | null> {
  const { data, error } = await supabase.rpc('get_research_detail', {
    p_id: id,
  });

  if (error) {
    console.error('Failed to fetch research detail:', error);
    throw new Error('リサーチデータ詳細の取得に失敗しました');
  }

  return data as ResearchDataDetail | null;
}

/**
 * 日付範囲プリセットを実際の日付に変換
 */
export function getDateRangeFromPreset(preset: string): {
  startDate: Date | null;
  endDate: Date | null;
} {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (preset) {
    case 'today':
      return { startDate: startOfDay, endDate: endOfDay };

    case 'week': {
      const weekAgo = new Date(startOfDay);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { startDate: weekAgo, endDate: endOfDay };
    }

    case 'month': {
      const monthAgo = new Date(startOfDay);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { startDate: monthAgo, endDate: endOfDay };
    }

    case 'quarter': {
      const quarterAgo = new Date(startOfDay);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      return { startDate: quarterAgo, endDate: endOfDay };
    }

    case 'year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { startDate: startOfYear, endDate: endOfDay };
    }

    case 'custom':
    default:
      return { startDate: null, endDate: null };
  }
}
