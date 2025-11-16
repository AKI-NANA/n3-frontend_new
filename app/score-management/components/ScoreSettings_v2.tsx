/**
 * ScoreSettings v2 - 改善版スコア設定UIコンポーネント
 * 戦略ベースの直感的なUI設計
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
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Info,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Gem,
  Clock,
  CheckCircle,
} from 'lucide-react';

interface ScoreSettingsProps {
  settings: ScoreSettingsType | null;
  onUpdate: (updates: Partial<ScoreSettingsType>) => Promise<void>;
  totalWeight: number;
}

export function ScoreSettingsV2({
  settings,
  onUpdate,
  totalWeight,
}: ScoreSettingsProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<ScoreSettingsType | null>(
    settings
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (settings) {
      // weight_futureがない場合はデフォルト値を設定
      setLocalSettings({
        ...settings,
        weight_future: settings.weight_future ?? 15,
        score_jp_seller_penalty: settings.score_jp_seller_penalty ?? -70,
        score_future_release_boost: settings.score_future_release_boost ?? 200,
        score_future_premium_boost: settings.score_future_premium_boost ?? 150,
      });
    }
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
    (localSettings.weight_future || 0) +
    (localSettings.weight_trend || 0) +
    (localSettings.weight_scarcity || 0) +
    (localSettings.weight_reliability || 0);

  return (
    <div className="space-y-6">
      {/* 🥇 戦略設定エリア */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥇</span>
              <div>
                <div className="text-lg font-bold">戦略設定エリア</div>
                <div className="text-sm font-normal text-gray-600">
                  出品で何を最も重視しますか?
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">合計重み</div>
              <div
                className={`text-2xl font-bold ${
                  currentTotalWeight === 100
                    ? 'text-green-600'
                    : 'text-orange-600'
                }`}
              >
                {currentTotalWeight}点
              </div>
              {currentTotalWeight !== 100 && (
                <div className="text-xs text-orange-600">
                  ※ 合計を100点にしてください
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-700">
              <Info className="w-4 h-4 inline mr-1" />
              利益、競合、将来性などの配分を決めます。
              <span className="font-semibold text-blue-800"> 🌟 おすすめ: バランス型（40/25/15/5/5/10）</span>
            </p>
          </div>

          <StrategyWeightSlider
            label="利益額の重み"
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            value={localSettings.weight_profit}
            onChange={(value) => handleSliderChange('weight_profit', value)}
            description="キャッシュフローを重視するなら50点以上に上げてください"
            color="bg-green-500"
          />

          <StrategyWeightSlider
            label="競合の少なさの重み"
            icon={<Users className="w-5 h-5 text-orange-600" />}
            value={localSettings.weight_competition}
            onChange={(value) => handleSliderChange('weight_competition', value)}
            description="確実に売れる商品を選びたい場合、40点以上に上げて競合が少ない商品を優先します"
            color="bg-orange-500"
          />

          <StrategyWeightSlider
            label="将来性の重み"
            icon={<span className="text-xl">🌟</span>}
            value={localSettings.weight_future}
            onChange={(value) => handleSliderChange('weight_future', value)}
            description="新商品・予約商品・高騰期待商品を優先します。発売後3ヶ月以内や廃盤品で加点されます"
            color="bg-yellow-500"
          />

          <StrategyWeightSlider
            label="希少性・廃盤品の重み"
            icon={<Gem className="w-5 h-5 text-purple-600" />}
            value={localSettings.weight_scarcity}
            onChange={(value) => handleSliderChange('weight_scarcity', value)}
            description="レア商品や高単価・高利益を狙う場合に上げます"
            color="bg-purple-500"
          />

          <StrategyWeightSlider
            label="分析データの鮮度の重み"
            icon={<Clock className="w-5 h-5 text-blue-600" />}
            value={localSettings.weight_trend}
            onChange={(value) => handleSliderChange('weight_trend', value)}
            description="市場変動が激しい商品が多い場合、数日内の最新データを持つ商品を優先します"
            color="bg-blue-500"
          />

          <StrategyWeightSlider
            label="実績スコアの重み"
            icon={<CheckCircle className="w-5 h-5 text-indigo-600" />}
            value={localSettings.weight_reliability}
            onChange={(value) => handleSliderChange('weight_reliability', value)}
            description="他のセラーの成功実績を参考に、堅実に売りたい場合に上げます"
            color="bg-indigo-500"
          />
        </CardContent>
      </Card>

      {/* 🥈 リスク/リターン調整エリア */}
      <Card className="border-2 border-amber-200">
        <CardHeader className="bg-amber-50">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🥈</span>
            <div>
              <div className="text-lg font-bold">リスク/リターン調整エリア</div>
              <div className="text-sm font-normal text-gray-600">
                高利益商品の優遇と低利益商品の排除
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 優遇設定 */}
          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                優遇設定：高利益商品のブースト
              </h3>
            </div>
            <div className="bg-green-50 p-3 rounded mb-4">
              <p className="text-sm text-gray-700">
                高利益商品を圧倒的に優先し、売上効率を最大化します
              </p>
            </div>

            <div className="space-y-4">
              <NumberInputWithHelp
                label="優遇開始ライン"
                value={localSettings.profit_multiplier_threshold}
                onChange={(value) =>
                  handleInputChange('profit_multiplier_threshold', value)
                }
                min={100}
                max={10000}
                step={100}
                unit="円"
                help="純利益がこの金額を超えるごとにスコアが増加（ブースト）します。高単価商品がメインなら2,000円以上に設定します"
              />

              <NumberInputWithHelp
                label="優遇の強さ（増加率）"
                value={localSettings.profit_multiplier_increment}
                onChange={(value) =>
                  handleInputChange('profit_multiplier_increment', value)
                }
                min={0.01}
                max={1.0}
                step={0.01}
                unit="倍"
                help="開始ラインを超えるごとにスコアが何倍増えるか。0.2倍にすると高利益商品が劇的に優遇されます（最大3.0倍）"
              />
            </div>
          </div>

          {/* 排除設定 */}
          <div className="border-l-4 border-red-500 pl-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                排除設定：低利益商品のリスク排除
              </h3>
            </div>
            <div className="bg-red-50 p-3 rounded mb-4">
              <p className="text-sm text-gray-700">
                作業コストに見合わない商品や高競合商品を自動的にランキングから除外します
              </p>
            </div>

            <div className="space-y-4">
              <NumberInputWithHelp
                label="ペナルティ開始ライン"
                value={localSettings.penalty_low_profit_threshold}
                onChange={(value) =>
                  handleInputChange('penalty_low_profit_threshold', value)
                }
                min={0}
                max={5000}
                step={100}
                unit="円"
                help="純利益がこの金額未満の場合、スコアが大幅に減点されます。手作業が多い場合は800円以上に設定を推奨します"
              />

              <NumberInputWithHelp
                label="排除の厳しさ（ペナルティ倍率）"
                value={localSettings.penalty_multiplier}
                onChange={(value) => handleInputChange('penalty_multiplier', value)}
                min={0.1}
                max={1.0}
                step={0.1}
                unit="倍"
                help="低利益商品のスコアを何倍に下げるか（0.5倍＝半減）。0.4倍にすると、より厳しく排除します"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🔧 上級者設定（折りたたみ） */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <Card className="border-gray-300">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔧 上級者設定（基本点 Sk）</span>
                </div>
                {showAdvanced ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ 警告: これらの設定を変更すると、スコアバランス全体が崩れる可能性があります。
                  通常は変更せず、重みと乗数の調整で戦略を変更してください。
                </p>
              </div>

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

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-3 text-sm text-gray-700">
                  🌟 将来性スコア設定 (v3)
                </h4>
                <div className="space-y-4">
                  <NumberInput
                    label="日本人セラーペナルティ"
                    value={localSettings.score_jp_seller_penalty}
                    onChange={(value) =>
                      handleInputChange('score_jp_seller_penalty', value)
                    }
                    min={-200}
                    max={0}
                    step={10}
                  />

                  <NumberInput
                    label="発売後ブースト"
                    value={localSettings.score_future_release_boost}
                    onChange={(value) =>
                      handleInputChange('score_future_release_boost', value)
                    }
                    min={0}
                    max={500}
                    step={10}
                  />

                  <NumberInput
                    label="予約・高騰ブースト"
                    value={localSettings.score_future_premium_boost}
                    onChange={(value) =>
                      handleInputChange('score_future_premium_boost', value)
                    }
                    min={0}
                    max={500}
                    step={10}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 保存ボタン */}
      <div className="flex gap-4">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || currentTotalWeight !== 100} 
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isSaving ? '保存中...' : '設定を保存'}
        </Button>
        <Button onClick={handleReset} variant="outline" disabled={isSaving} size="lg">
          リセット
        </Button>
      </div>
    </div>
  );
}

// 戦略重みスライダーコンポーネント
function StrategyWeightSlider({
  label,
  icon,
  value,
  onChange,
  description,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  description: string;
  color: string;
}) {
  // valueがundefinedやNaNの場合の安全な処理
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          {icon}
          <span>{label}</span>
        </Label>
        <span className="text-2xl font-bold text-blue-600">{safeValue}点</span>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          value={[safeValue]}
          onValueChange={([newValue]) => onChange(newValue)}
          max={100}
          step={1}
          className="flex-1"
        />
        <div
          className={`w-20 h-3 rounded ${color}`}
          style={{ opacity: safeValue / 100 }}
        />
      </div>
      <p className="text-sm text-gray-600 pl-7">{description}</p>
    </div>
  );
}

// ヘルプ付き数値入力コンポーネント
function NumberInputWithHelp({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  help,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  help: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
        <span className="text-sm text-gray-600 w-12">{unit}</span>
      </div>
      <p className="text-sm text-gray-600">{help}</p>
    </div>
  );
}

// 通常の数値入力コンポーネント
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
    <div className="space-y-2">
      <Label>{label}</Label>
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
