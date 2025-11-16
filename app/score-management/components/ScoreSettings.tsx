/**
 * ScoreSettings - スコア設定UIコンポーネント
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ScoreSettings as ScoreSettingsType } from '@/lib/scoring/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface ScoreSettingsProps {
  settings: ScoreSettingsType | null;
  onUpdate: (updates: Partial<ScoreSettingsType>) => Promise<void>;
  totalWeight: number;
}

export function ScoreSettings({
  settings,
  onUpdate,
  totalWeight,
}: ScoreSettingsProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<ScoreSettingsType | null>(
    settings
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!localSettings) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          設定を読み込んでいます...
        </CardContent>
      </Card>
    );
  }

  const handleSliderChange = (key: keyof ScoreSettingsType, value: number) => {
    setLocalSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleInputChange = (key: keyof ScoreSettingsType, value: number) => {
    setLocalSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleSave = async () => {
    if (!localSettings) return;

    setIsSaving(true);

    try {
      await onUpdate(localSettings);
      toast({
        title: '設定を保存しました',
        description: 'スコアを再計算してください',
      });
    } catch (error) {
      toast({
        title: '設定の保存に失敗しました',
        description: error instanceof Error ? error.message : '不明なエラー',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    toast({
      title: '設定をリセットしました',
    });
  };

  const currentTotalWeight =
    (localSettings.weight_profit || 0) +
    (localSettings.weight_competition || 0) +
    (localSettings.weight_trend || 0) +
    (localSettings.weight_scarcity || 0) +
    (localSettings.weight_reliability || 0);

  return (
    <div className="space-y-6">
      {/* 重み設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>スコア重み設定</span>
            <span
              className={`text-lg ${
                currentTotalWeight === 100 ? 'text-green-600' : 'text-orange-600'
              }`}
            >
              合計: {currentTotalWeight}点
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <WeightSlider
            label="利益スコア (P)"
            value={localSettings.weight_profit}
            onChange={(value) => handleSliderChange('weight_profit', value)}
            icon="💰"
            color="bg-green-500"
          />

          <WeightSlider
            label="競合スコア (C)"
            value={localSettings.weight_competition}
            onChange={(value) => handleSliderChange('weight_competition', value)}
            icon="🏪"
            color="bg-orange-500"
          />

          <WeightSlider
            label="トレンドスコア (T)"
            value={localSettings.weight_trend}
            onChange={(value) => handleSliderChange('weight_trend', value)}
            icon="📈"
            color="bg-blue-500"
          />

          <WeightSlider
            label="希少性スコア (S)"
            value={localSettings.weight_scarcity}
            onChange={(value) => handleSliderChange('weight_scarcity', value)}
            icon="💎"
            color="bg-purple-500"
          />

          <WeightSlider
            label="実績スコア (R)"
            value={localSettings.weight_reliability}
            onChange={(value) => handleSliderChange('weight_reliability', value)}
            icon="✅"
            color="bg-indigo-500"
          />
        </CardContent>
      </Card>

      {/* 利益乗数設定 */}
      <Card>
        <CardHeader>
          <CardTitle>利益乗数設定 (M_Profit)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberInput
            label="基本倍率"
            value={localSettings.profit_multiplier_base}
            onChange={(value) =>
              handleInputChange('profit_multiplier_base', value)
            }
            min={0.1}
            max={3.0}
            step={0.1}
          />

          <NumberInput
            label="基準利益額 (円)"
            value={localSettings.profit_multiplier_threshold}
            onChange={(value) =>
              handleInputChange('profit_multiplier_threshold', value)
            }
            min={100}
            max={10000}
            step={100}
          />

          <NumberInput
            label="増加率"
            value={localSettings.profit_multiplier_increment}
            onChange={(value) =>
              handleInputChange('profit_multiplier_increment', value)
            }
            min={0.01}
            max={1.0}
            step={0.01}
          />
        </CardContent>
      </Card>

      {/* ペナルティ設定 */}
      <Card>
        <CardHeader>
          <CardTitle>ペナルティ設定 (M_Penalty)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberInput
            label="低利益基準 (円)"
            value={localSettings.penalty_low_profit_threshold}
            onChange={(value) =>
              handleInputChange('penalty_low_profit_threshold', value)
            }
            min={0}
            max={5000}
            step={100}
          />

          <NumberInput
            label="ペナルティ倍率"
            value={localSettings.penalty_multiplier}
            onChange={(value) => handleInputChange('penalty_multiplier', value)}
            min={0.1}
            max={1.0}
            step={0.1}
          />
        </CardContent>
      </Card>

      {/* 基本点設定 */}
      <Card>
        <CardHeader>
          <CardTitle>基本点設定 (Sk)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberInput
            label="利益1000円あたりの加点"
            value={localSettings.score_profit_per_1000_jpy}
            onChange={(value) =>
              handleInputChange('score_profit_per_1000_jpy', value)
            }
            min={10}
            max={500}
            step={10}
          />

          <NumberInput
            label="競合1件あたりの減点"
            value={localSettings.score_competitor_penalty}
            onChange={(value) =>
              handleInputChange('score_competitor_penalty', value)
            }
            min={-200}
            max={0}
            step={10}
          />

          <NumberInput
            label="廃盤品ボーナス"
            value={localSettings.score_discontinued_bonus}
            onChange={(value) =>
              handleInputChange('score_discontinued_bonus', value)
            }
            min={0}
            max={500}
            step={10}
          />

          <NumberInput
            label="トレンドブースト"
            value={localSettings.score_trend_boost}
            onChange={(value) => handleInputChange('score_trend_boost', value)}
            min={0}
            max={200}
            step={10}
          />

          <NumberInput
            label="成功率ボーナス"
            value={localSettings.score_success_rate_bonus}
            onChange={(value) =>
              handleInputChange('score_success_rate_bonus', value)
            }
            min={0}
            max={100}
            step={5}
          />
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? '保存中...' : '設定を保存'}
        </Button>
        <Button onClick={handleReset} variant="outline" disabled={isSaving}>
          リセット
        </Button>
      </div>
    </div>
  );
}

// 重みスライダーコンポーネント
function WeightSlider({
  label,
  value,
  onChange,
  icon,
  color,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span>{label}</span>
        </Label>
        <span className="text-lg font-bold text-blue-600">{value}点</span>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          value={[value]}
          onValueChange={([newValue]) => onChange(newValue)}
          max={100}
          step={1}
          className="flex-1"
        />
        <div className={`w-16 h-2 rounded ${color}`} style={{ opacity: value / 100 }} />
      </div>
    </div>
  );
}

// 数値入力コンポーネント
function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
