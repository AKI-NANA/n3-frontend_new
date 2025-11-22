// app/finance/cashflow-dashboard/page.tsx
// Phase 4: 資金繰り予測ダッシュボード (T-59)

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Settings,
  Calendar,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Cloud,
} from 'lucide-react';
import type { CashflowForecast, ForecastResult, ForecastWarning } from '@/types/finance';

export default function CashflowDashboardPage() {
  const [forecasts, setForecasts] = useState<CashflowForecast[]>([]);
  const [warnings, setWarnings] = useState<ForecastWarning[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 設定パラメータ
  const [forecastMonths, setForecastMonths] = useState<number>(6);
  const [beginningBalance, setBeginningBalance] = useState<number>(5000000);
  const [safetyMargin, setSafetyMargin] = useState<number>(3000000);
  const [moneyCloudApiKey, setMoneyCloudApiKey] = useState<string>('');
  const [includeSourcing, setIncludeSourcing] = useState<boolean>(true);

  // 初回ロード時に最新の予測を取得
  useEffect(() => {
    fetchLatestForecasts();
  }, []);

  // 最新の予測データを取得
  const fetchLatestForecasts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/finance/forecast?months=${forecastMonths}`);
      const data = await response.json();

      if (data.success && data.forecasts.length > 0) {
        setForecasts(data.forecasts);
      } else {
        // 予測データがない場合は自動実行
        console.log('No forecasts found, running initial forecast...');
        await runForecast();
      }
    } catch (error) {
      console.error('予測データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 予測を実行
  const runForecast = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          months: forecastMonths,
          period_type: 'Monthly',
          beginning_balance: beginningBalance,
          include_sourcing: includeSourcing,
        }),
      });

      const data: ForecastResult & { success: boolean } = await response.json();

      if (data.success) {
        setForecasts(data.forecasts);
        setWarnings(data.warnings);
        setSummary(data.summary);
      } else {
        alert('予測の実行に失敗しました');
      }
    } catch (error) {
      console.error('予測実行エラー:', error);
      alert('予測実行中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // マネークラウドから実績データを同期
  const syncMoneyCloud = async () => {
    if (!moneyCloudApiKey.trim()) {
      alert('Money Cloud API Keyを入力してください');
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch('/api/finance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: moneyCloudApiKey }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`同期完了: ${data.count}件の新規取引を追加しました`);
        // 同期後に予測を再実行
        await runForecast();
      } else {
        alert(`同期エラー: ${data.message}`);
      }
    } catch (error) {
      console.error('同期エラー:', error);
      alert('同期中にエラーが発生しました');
    } finally {
      setSyncing(false);
    }
  };

  // チャート用データの整形
  const chartData = forecasts.map((forecast) => ({
    date: new Date(forecast.forecast_date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
    }),
    期末残高: forecast.ending_balance,
    期首残高: forecast.beginning_balance,
    純キャッシュフロー: forecast.net_cashflow,
    売上入金: forecast.sales_inflow_forecast,
    仕入支出: -forecast.sourcing_outflow_forecast,
    固定費: -forecast.overhead_outflow,
  }));

  // 警告レベルに応じたバッジカラー
  const getSeverityBadge = (severity: string) => {
    if (severity === 'high') return 'bg-red-600 text-white';
    if (severity === 'medium') return 'bg-yellow-500 text-black';
    return 'bg-blue-500 text-white';
  };

  // 金額フォーマット（万円表示）
  const formatAmount = (amount: number) => {
    return `${(amount / 10000).toFixed(0)}万円`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            資金繰り予測ダッシュボード
          </h1>
          <p className="text-gray-600 mt-2">Phase 4: キャッシュフロー予測と実績管理</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={syncMoneyCloud}
            disabled={syncing || !moneyCloudApiKey.trim()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Cloud className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同期中...' : 'マネークラウド同期'}
          </Button>
          <Button
            onClick={runForecast}
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '予測実行中...' : '予測を実行'}
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">平均期末残高</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(summary.avg_ending_balance)}</div>
              <p className="text-xs text-gray-500 mt-1">{summary.total_months}ヶ月平均</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">最小期末残高</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5" />
                {formatAmount(summary.min_ending_balance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">最も厳しい月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">最大期末残高</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5" />
                {formatAmount(summary.max_ending_balance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">最も余裕のある月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">警告月数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {summary.months_below_safety_margin}ヶ月
              </div>
              <p className="text-xs text-gray-500 mt-1">安全マージン未満</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインチャート */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                期末残高推移予測
              </CardTitle>
              <CardDescription>
                今後{forecastMonths}ヶ月の資金繰り予測（赤線：安全マージン {formatAmount(safetyMargin)}）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                    />
                    <Tooltip
                      formatter={(value: any) => formatAmount(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <ReferenceLine
                      y={safetyMargin}
                      stroke="red"
                      strokeDasharray="5 5"
                      label="安全マージン"
                    />
                    <Line
                      type="monotone"
                      dataKey="期末残高"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="売上入金"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="仕入支出"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>予測データがありません</p>
                    <p className="text-sm mt-2">「予測を実行」ボタンをクリックしてください</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 警告リスト */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                警告・アラート ({warnings.length}件)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {warnings.length > 0 ? (
                <div className="space-y-2">
                  {warnings.map((warning, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        warning.severity === 'high'
                          ? 'border-red-600 bg-red-50'
                          : warning.severity === 'medium'
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getSeverityBadge(warning.severity)}>
                              {warning.severity === 'high'
                                ? '高'
                                : warning.severity === 'medium'
                                ? '中'
                                : '低'}
                            </Badge>
                            <span className="text-sm font-semibold">
                              {new Date(warning.date).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{warning.message}</p>
                          {warning.amount !== undefined && (
                            <p className="text-xs text-gray-600 mt-1">
                              金額: {formatAmount(warning.amount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">警告はありません</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 設定パネル */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                予測設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="forecast-months">予測期間</Label>
                <Select
                  value={forecastMonths.toString()}
                  onValueChange={(value) => setForecastMonths(parseInt(value))}
                >
                  <SelectTrigger id="forecast-months">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3ヶ月</SelectItem>
                    <SelectItem value="6">6ヶ月</SelectItem>
                    <SelectItem value="12">12ヶ月</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="beginning-balance">期首残高 (円)</Label>
                <Input
                  id="beginning-balance"
                  type="number"
                  value={beginningBalance}
                  onChange={(e) => setBeginningBalance(Number(e.target.value))}
                  placeholder="5000000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  現在: {formatAmount(beginningBalance)}
                </p>
              </div>

              <div>
                <Label htmlFor="safety-margin">安全マージン (円)</Label>
                <Input
                  id="safety-margin"
                  type="number"
                  value={safetyMargin}
                  onChange={(e) => setSafetyMargin(Number(e.target.value))}
                  placeholder="3000000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  現在: {formatAmount(safetyMargin)}
                </p>
              </div>

              <div>
                <Label htmlFor="include-sourcing" className="flex items-center gap-2">
                  <input
                    id="include-sourcing"
                    type="checkbox"
                    checked={includeSourcing}
                    onChange={(e) => setIncludeSourcing(e.target.checked)}
                    className="w-4 h-4"
                  />
                  仕入れ予測を含める
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                マネークラウド連携
              </CardTitle>
              <CardDescription className="text-xs">
                Money Forward Cloud API連携（現在はモック実装）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={moneyCloudApiKey}
                  onChange={(e) => setMoneyCloudApiKey(e.target.value)}
                  placeholder="your-api-key-here"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 現在はモックデータを使用
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">💡 使い方</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-700 space-y-2">
              <p>1. 期首残高と安全マージンを設定</p>
              <p>2. マネークラウドから実績データを同期（オプション）</p>
              <p>3. 「予測を実行」で資金繰り予測を生成</p>
              <p>4. チャートと警告を確認し、資金計画を調整</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 予測詳細テーブル */}
      {forecasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              予測詳細
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">予測月</th>
                    <th className="p-2 text-right">期首残高</th>
                    <th className="p-2 text-right">売上入金</th>
                    <th className="p-2 text-right">仕入支出</th>
                    <th className="p-2 text-right">固定費</th>
                    <th className="p-2 text-right">純CF</th>
                    <th className="p-2 text-right">期末残高</th>
                    <th className="p-2 text-center">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((forecast, index) => {
                    const isBelowMargin = forecast.ending_balance < safetyMargin;
                    return (
                      <tr
                        key={index}
                        className={`border-b ${
                          isBelowMargin ? 'bg-red-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="p-2">
                          {new Date(forecast.forecast_date).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="p-2 text-right">
                          {formatAmount(forecast.beginning_balance)}
                        </td>
                        <td className="p-2 text-right text-green-600">
                          +{formatAmount(forecast.sales_inflow_forecast)}
                        </td>
                        <td className="p-2 text-right text-red-600">
                          -{formatAmount(forecast.sourcing_outflow_forecast)}
                        </td>
                        <td className="p-2 text-right text-red-600">
                          -{formatAmount(forecast.overhead_outflow)}
                        </td>
                        <td
                          className={`p-2 text-right font-semibold ${
                            forecast.net_cashflow >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {forecast.net_cashflow >= 0 ? '+' : ''}
                          {formatAmount(forecast.net_cashflow)}
                        </td>
                        <td className="p-2 text-right font-bold">
                          {formatAmount(forecast.ending_balance)}
                        </td>
                        <td className="p-2 text-center">
                          {isBelowMargin ? (
                            <Badge className="bg-red-600 text-white">警告</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">
                              正常
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
