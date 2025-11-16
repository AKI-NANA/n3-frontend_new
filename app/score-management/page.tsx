/**
 * スコア管理システム - メインページ v2
 * 計算テストタブを追加
 */

'use client';

import React, { useState } from 'react';
import { useScoreData } from '@/app/score-management/hooks/useScoreData';
import { useScoreSettings } from '@/app/score-management/hooks/useScoreSettings';
import { ScoreRanking } from '@/app/score-management/components/ScoreRanking';
import { ScoreStatistics } from '@/app/score-management/components/ScoreStatistics';
import { ScoreSettingsV2 } from '@/app/score-management/components/ScoreSettings_v2';
import { ScoreCalculationTest } from '@/app/score-management/components/ScoreCalculationTest';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Settings, BarChart3, Trophy, Calculator } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ScoreManagementPage() {
  const {
    products,
    loading: dataLoading,
    error: dataError,
    recalculateAll,
    refreshData,
  } = useScoreData();

  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    updateSettings,
    totalWeight,
  } = useScoreSettings();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('ranking');
  const [isCalculating, setIsCalculating] = useState(false);

  const handleRecalculateAll = async () => {
    setIsCalculating(true);

    try {
      await recalculateAll();
      toast({
        title: 'スコア計算完了',
        description: `${products.length}件の商品スコアを更新しました`,
      });
    } catch (error) {
      toast({
        title: 'スコア計算エラー',
        description: error instanceof Error ? error.message : '不明なエラー',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast({
        title: 'データを更新しました',
      });
    } catch (error) {
      toast({
        title: 'データ更新エラー',
        description: error instanceof Error ? error.message : '不明なエラー',
        variant: 'destructive',
      });
    }
  };

  // ローディング状態
  if (dataLoading || settingsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-lg">読み込み中...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // エラー状態
  if (dataError || settingsError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-500">
          <CardContent className="py-12 text-center text-red-600">
            <p className="text-lg font-semibold mb-2">エラーが発生しました</p>
            <p className="text-sm">{dataError || settingsError}</p>
            <Button onClick={handleRefresh} className="mt-4">
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              スコア管理システム v2
            </h1>
            <p className="text-gray-600 mt-1">
              商品の出品優先順位を自動決定する唯一無二のスコア (Ui)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={dataLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              更新
            </Button>
            <Button
              onClick={handleRecalculateAll}
              disabled={isCalculating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  計算中...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  全商品再計算
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-gray-600">総商品数</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {products.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">計算済み</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {products.filter((p) => p.listing_score).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">重み合計</span>
              </div>
              <div
                className={`text-3xl font-bold ${
                  totalWeight === 100 ? 'text-green-600' : 'text-orange-600'
                }`}
              >
                {totalWeight}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">最高スコア</span>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {products.length > 0
                  ? Math.max(
                      ...products.map((p) => p.listing_score || 0)
                    ).toLocaleString()
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* タブコンテンツ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            ランキング
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            統計分析
          </TabsTrigger>
          <TabsTrigger value="calculation-test" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            計算テスト
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            スコア設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-6">
          <ScoreRanking products={products} />
        </TabsContent>

        <TabsContent value="statistics" className="mt-6">
          <ScoreStatistics products={products} />
        </TabsContent>

        <TabsContent value="calculation-test" className="mt-6">
          {settings && <ScoreCalculationTest settings={settings} />}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          {settings && (
            <ScoreSettingsV2
              settings={settings}
              onUpdate={updateSettings}
              totalWeight={totalWeight}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
