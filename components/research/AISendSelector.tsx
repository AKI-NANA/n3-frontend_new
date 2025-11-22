'use client';

/**
 * AI解析対象選別コンポーネント
 * リサーチ結果からAI解析に回す商品を選別する
 */

import { useState } from 'react';

interface AISendSelectorProps {
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onSelectTopPercentage: (percentage: number) => void;
  onSelectByScore: (scoreThreshold: number) => void;
  onSendToQueue: (priority: number) => void;
}

export function AISendSelector({
  totalCount,
  selectedCount,
  onSelectAll,
  onSelectTopPercentage,
  onSelectByScore,
  onSendToQueue,
}: AISendSelectorProps) {
  const [topPercentage, setTopPercentage] = useState(10);
  const [scoreThreshold, setScoreThreshold] = useState(60000);
  const [priority, setPriority] = useState(0);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">AI解析対象の選別</h2>

      {/* 選択状態 */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">選択中: </span>
            <span className="text-lg font-bold text-blue-600">
              {selectedCount}
            </span>
            <span className="text-sm text-gray-600"> / {totalCount}件</span>
          </div>
          <button
            onClick={onSelectAll}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {selectedCount === totalCount ? '全解除' : '全選択'}
          </button>
        </div>
      </div>

      {/* 選別ツール */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* 上位X%選択 */}
        <div className="border rounded p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            上位X%を選択
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={topPercentage}
              onChange={(e) => setTopPercentage(Number(e.target.value))}
              className="flex-1 border rounded px-3 py-2"
              placeholder="%"
            />
            <button
              onClick={() => onSelectTopPercentage(topPercentage)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              選択
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            暫定スコア上位{topPercentage}%を選択（
            {Math.ceil((totalCount * topPercentage) / 100)}件）
          </p>
        </div>

        {/* スコア閾値選択 */}
        <div className="border rounded p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            スコア閾値で選択
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={scoreThreshold}
              onChange={(e) => setScoreThreshold(Number(e.target.value))}
              className="flex-1 border rounded px-3 py-2"
              placeholder="例: 60000"
            />
            <button
              onClick={() => onSelectByScore(scoreThreshold)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              選択
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            暫定スコア{scoreThreshold.toLocaleString()}点以上を選択
          </p>
        </div>

        {/* クイック選択ボタン */}
        <div className="border rounded p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            クイック選択
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelectTopPercentage(5)}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm"
            >
              上位5%
            </button>
            <button
              onClick={() => onSelectTopPercentage(10)}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm"
            >
              上位10%
            </button>
            <button
              onClick={() => onSelectTopPercentage(25)}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm"
            >
              上位25%
            </button>
            <button
              onClick={() => onSelectByScore(70000)}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm"
            >
              70k以上
            </button>
          </div>
        </div>
      </div>

      {/* AI解析キューへ送信 */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              <option value="0">通常（0）</option>
              <option value="5">やや高（5）</option>
              <option value="10">高（10）</option>
              <option value="20">最高（20）</option>
            </select>
          </div>
          <div className="flex-1">
            <button
              onClick={() => onSendToQueue(priority)}
              disabled={selectedCount === 0}
              className={`w-full px-6 py-3 rounded font-semibold ${
                selectedCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              AI解析キューへ送信（{selectedCount}件）
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>注意:</strong>{' '}
            AI解析には時間がかかる場合があります。キューに送信後、バックグラウンドで処理が実行されます。
          </p>
        </div>
      </div>

      {/* 推奨設定のヒント */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          💡 選別のヒント
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            • <strong>上位10%</strong>:
            スコアが高い商品に絞り、効率的にAI解析を実行
          </li>
          <li>
            • <strong>スコア60k以上</strong>:
            最低ラインを設定し、見込みのある商品のみを選別
          </li>
          <li>
            • <strong>優先度</strong>:
            緊急度の高い商品には高優先度を設定し、先に処理
          </li>
          <li>
            •{' '}
            AI解析完了後、最終スコアが再計算され、承認画面に反映されます
          </li>
        </ul>
      </div>
    </div>
  );
}
