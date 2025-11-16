/**
 * ScoreCalculationTest v2 - SKU入力対応版
 * 実際の商品データでスコア計算をテスト
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductMaster, ScoreSettings } from '@/lib/scoring/types';
import { calculateFinalScore } from '@/lib/scoring/calculator_v9';
import { Calculator, Search, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

interface ScoreCalculationTestProps {
  settings: ScoreSettings;
}

export function ScoreCalculationTest({ settings }: ScoreCalculationTestProps) {
  const [sku, setSku] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductMaster | null>(null);
  const [result, setResult] = useState<{
    score: number;
    details: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchAndCalculate = async () => {
    if (!sku.trim()) {
      setError('SKUを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setProduct(null);
    setResult(null);

    try {
      // 商品データを取得
      const response = await fetch(`/api/products?sku=${encodeURIComponent(sku.trim())}`);
      
      if (!response.ok) {
        throw new Error('商品データの取得に失敗しました');
      }

      const data = await response.json();
      
      if (!data.products || data.products.length === 0) {
        throw new Error('該当するSKUの商品が見つかりません');
      }

      const fetchedProduct = data.products[0];
      setProduct(fetchedProduct);

      // ✅ スコア計算APIを呼び出し（DBに保存）
      console.log('📡 スコア計算API呼び出し:', fetchedProduct.id);
      const scoreResponse = await fetch('/api/score/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: [fetchedProduct.id]
        })
      });
      
      if (!scoreResponse.ok) {
        const errorData = await scoreResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'スコア計算に失敗しました');
      }
      
      const scoreData = await scoreResponse.json();
      console.log('✅ スコア計算完了:', scoreData);
      
      if (scoreData.results && scoreData.results.length > 0) {
        const result = scoreData.results[0];
        setResult({ score: result.score, details: result.details });
      } else {
        throw new Error('スコア計算結果が空です');
      }
    } catch (err: any) {
      console.error('❌ エラー:', err);
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFetchAndCalculate();
    }
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="bg-purple-50">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-purple-600" />
          <div>
            <div className="text-lg font-bold">計算テスト</div>
            <div className="text-sm font-normal text-gray-600">
              実際の商品データでスコア計算を確認
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* SKU入力 */}
        <div className="space-y-2">
          <Label htmlFor="sku" className="text-base font-semibold">
            商品SKU
          </Label>
          <div className="flex gap-2">
            <Input
              id="sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="例: POKE-001"
              className="flex-1"
              disabled={loading}
            />
            <Button
              onClick={handleFetchAndCalculate}
              disabled={loading || !sku.trim()}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  計算中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  計算
                </>
              )}
            </Button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* 商品情報 */}
        {product && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">商品情報</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">タイトル</div>
                <div className="font-medium">{product.title || '(なし)'}</div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <DataField 
                  label="利益額" 
                  value={product.profit_amount_usd 
                    ? `${product.profit_amount_usd.toFixed(2)}` 
                    : '(なし)'
                  }
                />
                <DataField 
                  label="利益率" 
                  value={(product.profit_margin_percent || product.profit_margin)
                    ? `${(product.profit_margin_percent || product.profit_margin).toFixed(1)}%` 
                    : '(なし)'
                  }
                />
                <DataField 
                  label="競合数" 
                  value={product.sm_competitor_count?.toString() || '(なし)'}
                />
                <DataField 
                  label="売上件数" 
                  value={(product.sm_sales_count || product.research_sold_count)?.toString() || '(なし)'}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <DataField 
                  label="最安値" 
                  value={product.sm_lowest_price 
                    ? `$${product.sm_lowest_price.toFixed(2)}` 
                    : '(なし)'
                  }
                />
                <DataField 
                  label="自社価格" 
                  value={product.ddp_price_usd 
                    ? `$${product.ddp_price_usd.toFixed(2)}` 
                    : '(なし)'
                  }
                />
                <DataField 
                  label="分析日" 
                  value={product.sm_analyzed_at 
                    ? new Date(product.sm_analyzed_at).toLocaleDateString('ja-JP') 
                    : '(なし)'
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* 計算結果 */}
        {result && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">計算結果</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ResultCard
                label="重み付け合計"
                value={result.details.weighted_sum.toLocaleString()}
                description="スライダー反映後"
                color="text-blue-600"
              />

              <ResultCard
                label="乱数"
                value={result.details.random_value.toLocaleString()}
                description="唯一無二を保証"
                color="text-gray-600"
              />

              <ResultCard
                label="最終スコア"
                value={result.score.toLocaleString()}
                description="0-100,999点"
                color="text-purple-600"
                large
              />
            </div>

            {/* 各スコア要素の詳細 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-sm text-gray-700">
                各スコア要素（0-100点）
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ScoreElement 
                  label="利益" 
                  value={result.details.profit_score} 
                  weight={settings.weight_profit}
                />
                <ScoreElement 
                  label="競合" 
                  value={result.details.competition_score} 
                  weight={settings.weight_competition}
                />
                <ScoreElement 
                  label="将来性" 
                  value={result.details.future_score} 
                  weight={settings.weight_future}
                />
                <ScoreElement 
                  label="トレンド" 
                  value={result.details.trend_score} 
                  weight={settings.weight_trend}
                />
                <ScoreElement 
                  label="希少性" 
                  value={result.details.scarcity_score} 
                  weight={settings.weight_scarcity}
                />
                <ScoreElement 
                  label="実績" 
                  value={result.details.reliability_score} 
                  weight={settings.weight_reliability}
                />
              </div>
            </div>

            {/* ランク表示 */}
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              result.score >= 80000 ? 'bg-green-50 border border-green-200' :
              result.score >= 60000 ? 'bg-blue-50 border border-blue-200' :
              result.score >= 40000 ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                result.score >= 80000 ? 'text-green-600' :
                result.score >= 60000 ? 'text-blue-600' :
                result.score >= 40000 ? 'text-yellow-600' :
                'text-red-600'
              }`} />
              <div>
                <div className="font-bold text-lg">
                  ランク {
                    result.score >= 80000 ? 'S' :
                    result.score >= 60000 ? 'A' :
                    result.score >= 40000 ? 'B' :
                    result.score >= 20000 ? 'C' : 'D'
                  }
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  {result.score >= 80000 ? '最優先で出品すべき商品です' :
                   result.score >= 60000 ? '優先度が高い商品です' :
                   result.score >= 40000 ? '出品を検討できる商品です' :
                   result.score >= 20000 ? '慎重に検討すべき商品です' :
                   '出品は推奨されません'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-0.5">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  description,
  color,
  large = false,
}: {
  label: string;
  value: string;
  description: string;
  color: string;
  large?: boolean;
}) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`${large ? 'text-3xl' : 'text-2xl'} font-bold ${color}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </div>
  );
}

function ScoreElement({ 
  label, 
  value, 
  weight 
}: { 
  label: string; 
  value: number; 
  weight: number;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-white rounded">
      <span className="text-sm text-gray-700">{label}:</span>
      <div className="text-right">
        <div className="font-semibold text-sm">{value.toFixed(1)}</div>
        <div className="text-xs text-gray-500">×{weight}%</div>
      </div>
    </div>
  );
}
