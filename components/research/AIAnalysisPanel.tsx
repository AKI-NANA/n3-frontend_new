'use client';

import React, { useState } from 'react';

interface AIAnalysisPanelProps {
  selectedEbayItemIds: string[];
  onAnalysisComplete?: () => void;
}

export default function AIAnalysisPanel({
  selectedEbayItemIds,
  onAnalysisComplete,
}: AIAnalysisPanelProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: boolean;
    processed_count: number;
    data?: any[];
    error?: string;
  } | null>(null);

  const handleStartAnalysis = async () => {
    if (selectedEbayItemIds.length === 0) {
      alert('解析する商品を選択してください');
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      setResults(null);

      console.log('🔍 AI仕入れ先候補探索開始:', selectedEbayItemIds);

      const response = await fetch('/api/research/ai-supplier-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ebay_item_ids: selectedEbayItemIds,
        }),
      });

      if (!response.ok) {
        throw new Error('AI解析APIエラー');
      }

      const data = await response.json();
      console.log('✅ AI解析完了:', data);

      setResults(data);
      setProgress(100);

      // スコア再計算
      if (data.success && data.processed_count > 0) {
        console.log('📊 スコア再計算開始');
        await recalculateScores();
      }

      onAnalysisComplete?.();
    } catch (error) {
      console.error('❌ AI解析エラー:', error);
      setResults({
        success: false,
        processed_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const recalculateScores = async () => {
    try {
      const response = await fetch('/api/research/calculate-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ebay_item_ids: selectedEbayItemIds,
          use_ai_supplier_price: true,
        }),
      });

      if (!response.ok) {
        throw new Error('スコア計算APIエラー');
      }

      const data = await response.json();
      console.log('✅ スコア再計算完了:', data);
    } catch (error) {
      console.error('❌ スコア再計算エラー:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">AI仕入れ先候補探索</h3>

      <div className="space-y-4">
        {/* 選択数表示 */}
        <div className="bg-blue-50 p-4 rounded">
          <p className="text-sm text-blue-800">
            選択中の商品: <span className="font-bold">{selectedEbayItemIds.length}件</span>
          </p>
          {selectedEbayItemIds.length > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              推定処理時間: 約{Math.ceil(selectedEbayItemIds.length * 0.5)}分
            </p>
          )}
        </div>

        {/* 実行ボタン */}
        <button
          onClick={handleStartAnalysis}
          disabled={loading || selectedEbayItemIds.length === 0}
          className={`w-full py-3 rounded font-semibold ${
            loading || selectedEbayItemIds.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              AI解析中... {progress}%
            </span>
          ) : (
            'AI仕入れ先候補探索を開始'
          )}
        </button>

        {/* 処理中のプログレスバー */}
        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* 結果表示 */}
        {results && (
          <div
            className={`p-4 rounded ${
              results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            {results.success ? (
              <div>
                <p className="text-green-800 font-semibold">✅ AI解析完了</p>
                <p className="text-sm text-green-700 mt-2">
                  処理済み: {results.processed_count}件
                </p>
                {results.data && results.data.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-green-800 mb-2">
                      特定された仕入れ先候補:
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.data.slice(0, 10).map((candidate, index) => (
                        <div key={index} className="bg-white p-3 rounded shadow-sm text-sm">
                          <p className="font-medium">{candidate.product_name}</p>
                          <p className="text-gray-600">
                            {candidate.supplier_name} - ¥{candidate.candidate_price_jpy?.toLocaleString()}
                          </p>
                          {candidate.confidence_score && (
                            <p className="text-xs text-gray-500">
                              信頼度: {(candidate.confidence_score * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                      ))}
                      {results.data.length > 10 && (
                        <p className="text-xs text-gray-500 text-center">
                          ... 他 {results.data.length - 10}件
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-red-800 font-semibold">❌ エラーが発生しました</p>
                <p className="text-sm text-red-700 mt-2">{results.error}</p>
              </div>
            )}
          </div>
        )}

        {/* 説明文 */}
        <div className="bg-gray-50 p-4 rounded text-sm text-gray-700">
          <p className="font-semibold mb-2">AI仕入れ先候補探索について:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>選択した商品について、AIが主要ECサイトを探索します</li>
            <li>Amazon Japan、楽天、Yahoo!ショッピング等から最安値候補を特定します</li>
            <li>画像解析により、商品名だけでは見つからない候補も発見します</li>
            <li>特定された価格を元に、最終スコアが自動で再計算されます</li>
          </ul>
        </div>

        {/* 注意事項 */}
        <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800">
          <p className="font-semibold mb-2">⚠️ 注意事項:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>API利用料金が発生します（1件あたり約$0.05〜$0.15）</li>
            <li>処理には時間がかかります（1件あたり約30秒）</li>
            <li>一度に大量の商品を処理すると、処理が長時間に及ぶ可能性があります</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
