/**
 * ScoreStatistics - スコア統計分析コンポーネント
 */

'use client';

import React, { useMemo } from 'react';
import { ProductMaster } from '@/lib/scoring/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScoreStatisticsProps {
  products: ProductMaster[];
}

export function ScoreStatistics({ products }: ScoreStatisticsProps) {
  const statistics = useMemo(() => {
    if (products.length === 0) {
      return null;
    }

    const scores = products
      .map((p) => p.listing_score || 0)
      .filter((s) => s > 0);

    if (scores.length === 0) {
      return null;
    }

    // 基本統計
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // 中央値
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore =
      sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] +
            sortedScores[sortedScores.length / 2]) /
          2
        : sortedScores[Math.floor(sortedScores.length / 2)];

    // 標準偏差
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);

    // スコア分布
    const distribution = {
      high: scores.filter((s) => s >= avgScore + stdDev).length,
      medium: scores.filter((s) => s >= avgScore - stdDev && s < avgScore + stdDev)
        .length,
      low: scores.filter((s) => s < avgScore - stdDev).length,
    };

    // 条件別統計
    const newProducts = products.filter((p) => p.condition === 'new');
    const usedProducts = products.filter((p) => p.condition === 'used');

    const avgScoreNew =
      newProducts.length > 0
        ? newProducts.reduce((sum, p) => sum + (p.listing_score || 0), 0) /
          newProducts.length
        : 0;

    const avgScoreUsed =
      usedProducts.length > 0
        ? usedProducts.reduce((sum, p) => sum + (p.listing_score || 0), 0) /
          usedProducts.length
        : 0;

    // 利益統計
    const avgProfit =
      products
        .filter((p) => p.purchase_price_jpy)
        .reduce(
          (sum, p) =>
            sum + ((p.price_jpy || 0) - (p.purchase_price_jpy || 0)),
          0
        ) /
      products.filter((p) => p.purchase_price_jpy).length;

    return {
      maxScore,
      minScore,
      avgScore,
      medianScore,
      stdDev,
      distribution,
      avgScoreNew,
      avgScoreUsed,
      avgProfit,
      totalProducts: products.length,
      scoredProducts: scores.length,
    };
  }, [products]);

  if (!statistics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <p>統計データがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 基本統計 */}
      <Card>
        <CardHeader>
          <CardTitle>基本統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="最高スコア"
              value={statistics.maxScore.toLocaleString()}
              icon="🏆"
              color="text-yellow-600"
            />
            <StatCard
              label="平均スコア"
              value={statistics.avgScore.toFixed(0)}
              icon="📊"
              color="text-blue-600"
            />
            <StatCard
              label="中央値"
              value={statistics.medianScore.toFixed(0)}
              icon="📈"
              color="text-green-600"
            />
            <StatCard
              label="最低スコア"
              value={statistics.minScore.toLocaleString()}
              icon="📉"
              color="text-gray-600"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              label="標準偏差"
              value={statistics.stdDev.toFixed(2)}
              icon="📐"
              color="text-purple-600"
            />
            <StatCard
              label="計算済み商品"
              value={`${statistics.scoredProducts} / ${statistics.totalProducts}`}
              icon="✅"
              color="text-indigo-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* スコア分布 */}
      <Card>
        <CardHeader>
          <CardTitle>スコア分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <DistributionBar
              label="高スコア"
              count={statistics.distribution.high}
              total={statistics.scoredProducts}
              color="bg-green-500"
            />
            <DistributionBar
              label="中スコア"
              count={statistics.distribution.medium}
              total={statistics.scoredProducts}
              color="bg-yellow-500"
            />
            <DistributionBar
              label="低スコア"
              count={statistics.distribution.low}
              total={statistics.scoredProducts}
              color="bg-red-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 条件別統計 */}
      <Card>
        <CardHeader>
          <CardTitle>条件別平均スコア</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="新品"
              value={statistics.avgScoreNew.toFixed(0)}
              icon="🆕"
              color="text-blue-600"
            />
            <StatCard
              label="中古"
              value={statistics.avgScoreUsed.toFixed(0)}
              icon="♻️"
              color="text-orange-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* 利益統計 */}
      {!isNaN(statistics.avgProfit) && (
        <Card>
          <CardHeader>
            <CardTitle>利益統計</CardTitle>
          </CardHeader>
          <CardContent>
            <StatCard
              label="平均利益"
              value={`¥${statistics.avgProfit.toFixed(0)}`}
              icon="💰"
              color="text-green-600"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

// 分布バーコンポーネント
function DistributionBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">
          {count}件 ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`${color} h-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
