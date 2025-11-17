'use client';

import { useState, useEffect } from 'react';
import { Filter, Calendar, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { ResearchAnalyticsFilters } from '@/lib/research-analytics/types';
import {
  DATA_SOURCE_OPTIONS,
  RISK_LEVEL_OPTIONS,
  STATUS_OPTIONS,
  DATE_RANGE_PRESETS,
} from '@/lib/research-analytics/types';
import { getDateRangeFromPreset } from '@/lib/research-analytics/api';

interface AnalyticsFiltersProps {
  filters: ResearchAnalyticsFilters;
  onFiltersChange: (filters: ResearchAnalyticsFilters) => void;
  onApply: () => void;
}

export function AnalyticsFilters({
  filters,
  onFiltersChange,
  onApply,
}: AnalyticsFiltersProps) {
  const [datePreset, setDatePreset] = useState<string>('month');
  const [showCustomDates, setShowCustomDates] = useState(false);

  // 日付プリセットの変更
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
      const { startDate, endDate } = getDateRangeFromPreset(preset);
      onFiltersChange({ ...filters, startDate, endDate });
    }
  };

  // フィルタのリセット
  const handleReset = () => {
    onFiltersChange({
      dataSource: null,
      riskLevel: null,
      status: null,
      startDate: null,
      endDate: null,
    });
    setDatePreset('month');
    setShowCustomDates(false);
  };

  // 初回マウント時に直近1ヶ月をデフォルト設定
  useEffect(() => {
    const { startDate, endDate } = getDateRangeFromPreset('month');
    onFiltersChange({ ...filters, startDate, endDate });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">フィルタリング条件</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          リセット
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* データ取得元 */}
        <div className="space-y-2">
          <Label htmlFor="dataSource">データ取得元</Label>
          <Select
            value={filters.dataSource || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                dataSource: value === 'all' ? null : value,
              })
            }
          >
            <SelectTrigger id="dataSource">
              <SelectValue placeholder="全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {DATA_SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* VEROリスク判定 */}
        <div className="space-y-2">
          <Label htmlFor="riskLevel">VEROリスク判定</Label>
          <Select
            value={filters.riskLevel || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                riskLevel: value === 'all' ? null : (value as any),
              })
            }
          >
            <SelectTrigger id="riskLevel">
              <SelectValue placeholder="全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {RISK_LEVEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ステータス */}
        <div className="space-y-2">
          <Label htmlFor="status">ステータス</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                status: value === 'all' ? null : (value as any),
              })
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 取得期間 */}
        <div className="space-y-2">
          <Label htmlFor="dateRange">取得期間</Label>
          <Select value={datePreset} onValueChange={handleDatePresetChange}>
            <SelectTrigger id="dateRange">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* カスタム日付範囲 */}
      {showCustomDates && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="startDate">開始日</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Input
                id="startDate"
                type="date"
                value={
                  filters.startDate
                    ? filters.startDate.toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value)
                    : null;
                  onFiltersChange({ ...filters, startDate: date });
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">終了日</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Input
                id="endDate"
                type="date"
                value={
                  filters.endDate
                    ? filters.endDate.toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value)
                    : null;
                  onFiltersChange({ ...filters, endDate: date });
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 適用ボタン */}
      <div className="mt-4 pt-4 border-t flex justify-end">
        <Button onClick={onApply} className="bg-blue-600 hover:bg-blue-700">
          フィルタを適用
        </Button>
      </div>
    </Card>
  );
}
