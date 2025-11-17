'use client';

import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type {
  ResearchAnalyticsFilters,
  ResearchStatistics,
  VeroRiskDistribution,
  MarketVolumeCorrelation,
  HtsCodeFrequency,
  ResearchDataItem,
} from '@/lib/research-analytics/types';
import {
  getResearchStatistics,
  getVeroRiskDistribution,
  getMarketVolumeCorrelation,
  getHtsCodeFrequency,
  getResearchDataList,
} from '@/lib/research-analytics/api';
import { AnalyticsFilters } from './components/AnalyticsFilters';
import { StatisticsCards } from './components/StatisticsCards';
import { VeroRiskChart } from './components/VeroRiskChart';
import { MarketVolumeScatter } from './components/MarketVolumeScatter';
import { HtsCodeChart } from './components/HtsCodeChart';
import { ResearchDataTable } from './components/ResearchDataTable';

const PAGE_SIZE = 50;

export default function ResearchAnalysisPage() {
  const [filters, setFilters] = useState<ResearchAnalyticsFilters>({
    dataSource: null,
    riskLevel: null,
    status: null,
    startDate: null,
    endDate: null,
  });

  const [statistics, setStatistics] = useState<ResearchStatistics>({
    total: 0,
    promoted: 0,
    rejected: 0,
    pending: 0,
    success_rate: 0,
    rejection_rate: 0,
  });

  const [veroRiskData, setVeroRiskData] = useState<VeroRiskDistribution[]>([]);
  const [marketVolumeData, setMarketVolumeData] = useState<MarketVolumeCorrelation[]>([]);
  const [htsCodeData, setHtsCodeData] = useState<HtsCodeFrequency[]>([]);
  const [researchData, setResearchData] = useState<ResearchDataItem[]>([]);
  const [researchTotal, setResearchTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [isLoadingTable, setIsLoadingTable] = useState(false);

  // 初回ロード
  useEffect(() => {
    loadAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // フィルタ適用
  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadAllData();
  };

  // ページ変更
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadResearchDataList(page);
  };

  // 全データをロード
  const loadAllData = async () => {
    await Promise.all([
      loadStatistics(),
      loadCharts(),
      loadResearchDataList(1),
    ]);
  };

  // 統計情報をロード
  const loadStatistics = async () => {
    setIsLoadingStats(true);
    try {
      const data = await getResearchStatistics(filters);
      setStatistics(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      toast.error('統計情報の取得に失敗しました');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // グラフデータをロード
  const loadCharts = async () => {
    setIsLoadingCharts(true);
    try {
      const [veroRisk, marketVolume, htsCode] = await Promise.all([
        getVeroRiskDistribution(filters),
        getMarketVolumeCorrelation(filters),
        getHtsCodeFrequency(filters),
      ]);

      setVeroRiskData(veroRisk);
      setMarketVolumeData(marketVolume);
      setHtsCodeData(htsCode);
    } catch (error) {
      console.error('Failed to load charts:', error);
      toast.error('グラフデータの取得に失敗しました');
    } finally {
      setIsLoadingCharts(false);
    }
  };

  // リサーチデータ一覧をロード
  const loadResearchDataList = async (page: number) => {
    setIsLoadingTable(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const result = await getResearchDataList(filters, PAGE_SIZE, offset);
      setResearchData(result.data);
      setResearchTotal(result.total);
    } catch (error) {
      console.error('Failed to load research data list:', error);
      toast.error('リサーチデータ一覧の取得に失敗しました');
    } finally {
      setIsLoadingTable(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">リサーチ分析ダッシュボード</h1>
            </div>
            <p className="text-gray-600 mt-2">
              リサーチデータの全履歴を可視化し、成功/失敗要因と長期トレンドを分析
            </p>
          </div>
          <Button onClick={loadAllData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
        </div>

        {/* フィルタリング */}
        <AnalyticsFilters
          filters={filters}
          onFiltersChange={setFilters}
          onApply={handleApplyFilters}
        />

        {/* 統計カード */}
        <StatisticsCards statistics={statistics} isLoading={isLoadingStats} />

        {/* グラフエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VeroRiskChart data={veroRiskData} isLoading={isLoadingCharts} />
          <HtsCodeChart data={htsCodeData} isLoading={isLoadingCharts} />
        </div>

        {/* 散布図（全幅） */}
        <MarketVolumeScatter data={marketVolumeData} isLoading={isLoadingCharts} />

        {/* データ一覧テーブル */}
        <ResearchDataTable
          data={researchData}
          total={researchTotal}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          isLoading={isLoadingTable}
        />
      </div>
    </div>
  );
}
