'use client';

import React, { useState } from 'react';
import ResearchResultsTable from '@/components/research/ResearchResultsTable';
import AIAnalysisPanel from '@/components/research/AIAnalysisPanel';

export default function ResearchResultsPage() {
  const [selectedEbayItemIds, setSelectedEbayItemIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAnalysisComplete = () => {
    // AI解析完了後、テーブルを再読み込み
    setRefreshKey((prev) => prev + 1);
    setSelectedEbayItemIds([]);
  };

  const handleDownloadCSV = async () => {
    if (selectedEbayItemIds.length === 0) {
      alert('CSV出力する商品を選択してください');
      return;
    }

    try {
      const response = await fetch('/api/research/export-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ebay_item_ids: selectedEbayItemIds,
          include_supplier_info: true,
        }),
      });

      if (!response.ok) {
        throw new Error('CSV出力に失敗しました');
      }

      // CSVファイルをダウンロード
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research_results_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert(`${selectedEbayItemIds.length}件のデータをCSV出力しました`);
    } catch (error) {
      console.error('❌ CSV出力エラー:', error);
      alert('CSV出力に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            リサーチ結果管理
          </h1>
          <p className="text-gray-600">
            eBayリサーチ結果の一覧表示、スコアリング、AI仕入れ先候補探索を統合管理
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインコンテンツ（左側2列） */}
          <div className="lg:col-span-2 space-y-6">
            {/* アクションバー */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadCSV}
                  disabled={selectedEbayItemIds.length === 0}
                  className={`px-4 py-2 rounded font-semibold ${
                    selectedEbayItemIds.length === 0
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  CSV出力 ({selectedEbayItemIds.length}件)
                </button>

                <button
                  onClick={async () => {
                    if (selectedEbayItemIds.length === 0) {
                      alert('商品を選択してください');
                      return;
                    }

                    if (confirm(`${selectedEbayItemIds.length}件のスコアを再計算しますか?`)) {
                      try {
                        const response = await fetch('/api/research/calculate-scores', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ebay_item_ids: selectedEbayItemIds,
                            use_ai_supplier_price: false,
                          }),
                        });

                        if (response.ok) {
                          alert('スコア再計算が完了しました');
                          setRefreshKey((prev) => prev + 1);
                        } else {
                          alert('スコア再計算に失敗しました');
                        }
                      } catch (error) {
                        alert('エラーが発生しました');
                        console.error(error);
                      }
                    }
                  }}
                  disabled={selectedEbayItemIds.length === 0}
                  className={`px-4 py-2 rounded font-semibold ${
                    selectedEbayItemIds.length === 0
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  スコア再計算
                </button>
              </div>
            </div>

            {/* リサーチ結果テーブル */}
            <ResearchResultsTable
              key={refreshKey}
              onSelectionChange={setSelectedEbayItemIds}
            />
          </div>

          {/* サイドパネル（右側1列） */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* AI解析パネル */}
              <AIAnalysisPanel
                selectedEbayItemIds={selectedEbayItemIds}
                onAnalysisComplete={handleAnalysisComplete}
              />

              {/* 統計情報 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">統計情報</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">選択中:</span>
                    <span className="font-bold">{selectedEbayItemIds.length}件</span>
                  </div>
                </div>
              </div>

              {/* ヘルプ */}
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                <p className="font-semibold mb-2">💡 使い方:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>フィルターで対象商品を絞り込み</li>
                  <li>チェックボックスで解析する商品を選択</li>
                  <li>「AI仕入れ先候補探索」を実行</li>
                  <li>最終スコアを確認して出品判断</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
