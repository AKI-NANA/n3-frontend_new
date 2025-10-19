import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, DollarSign, CheckCircle, XCircle } from 'lucide-react';

// 型定義（簡易版）
interface PriceAdjustment {
  id: number;
  item_id: string;
  product_name?: string;
  current_price: number;
  proposed_price: number;
  price_difference: number;
  expected_margin?: number;
  adjustment_reason?: string;
  is_red_risk: boolean;
  risk_level: string;
  created_at: string;
}

interface Stats {
  totalItems: number;
  autoPricingEnabled: number;
  pendingAdjustments: number;
  redRiskItems: number;
  successRate: number;
}

export default function PriceOptimizationDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    autoPricingEnabled: 0,
    pendingAdjustments: 0,
    redRiskItems: 0,
    successRate: 0,
  });
  const [queue, setQueue] = useState<PriceAdjustment[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'red_risk' | 'normal'>('all');

  // データ取得
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 統計取得
      const statsRes = await fetch('/api/price-optimization/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // キュー取得
      const queueRes = await fetch('/api/price-optimization/queue?status=pending_approval');
      const queueData = await queueRes.json();
      if (queueData.success) {
        setQueue(queueData.data.items);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 選択処理
  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const filteredItems = getFilteredQueue();
    setSelectedIds(filteredItems.map(item => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // 承認処理
  const handleApprove = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `${selectedIds.length}件の価格調整を承認しますか？`
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/price-optimization/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment_ids: selectedIds,
          approved_by: 'admin', // TODO: ユーザー情報から取得
          apply_immediately: false,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`${result.data.approved_count}件承認しました`);
        setSelectedIds([]);
        loadData();
      }
    } catch (error) {
      alert('承認エラーが発生しました');
    }
  };

  // フィルター適用
  const getFilteredQueue = () => {
    if (filter === 'red_risk') {
      return queue.filter(item => item.is_red_risk);
    } else if (filter === 'normal') {
      return queue.filter(item => !item.is_red_risk);
    }
    return queue;
  };

  const filteredQueue = getFilteredQueue();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-2">価格最適化ダッシュボード</h1>
        <p className="text-blue-100">自動価格調整・競合価格追従システム</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="承認待ち"
          value={stats.pendingAdjustments}
          icon={<AlertCircle className="w-8 h-8" />}
          color="bg-yellow-500"
        />
        <StatCard
          title="赤字リスク"
          value={stats.redRiskItems}
          icon={<XCircle className="w-8 h-8" />}
          color="bg-red-500"
        />
        <StatCard
          title="自動調整有効"
          value={stats.autoPricingEnabled}
          icon={<TrendingUp className="w-8 h-8" />}
          color="bg-green-500"
        />
        <StatCard
          title="成功率"
          value={`${stats.successRate.toFixed(1)}%`}
          icon={<CheckCircle className="w-8 h-8" />}
          color="bg-blue-500"
        />
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全て ({queue.length})
          </button>
          <button
            onClick={() => setFilter('red_risk')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'red_risk'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            赤字リスク ({queue.filter(q => q.is_red_risk).length})
          </button>
          <button
            onClick={() => setFilter('normal')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'normal'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            通常 ({queue.filter(q => !q.is_red_risk).length})
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <span className="text-gray-600 font-medium self-center">
              {selectedIds.length}件選択中
            </span>
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              承認
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              クリア
            </button>
          </div>
        )}
      </div>

      {/* 一括操作 */}
      {filteredQueue.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <button
            onClick={selectAll}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            このページの全て ({filteredQueue.length}件) を選択
          </button>
        </div>
      )}

      {/* 価格調整キュー */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredQueue.length && filteredQueue.length > 0}
                    onChange={() => {
                      if (selectedIds.length === filteredQueue.length) {
                        clearSelection();
                      } else {
                        selectAll();
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">商品</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">現在価格</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">提案価格</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">差額</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">利益率</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">理由</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">リスク</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredQueue.map(item => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition ${
                    item.is_red_risk ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {item.product_name || item.item_id}
                    </div>
                    <div className="text-sm text-gray-500">{item.item_id}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${item.current_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-blue-600">
                    ${item.proposed_price.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${
                    item.price_difference > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.price_difference > 0 ? '+' : ''}
                    ${item.price_difference.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.expected_margin ? (
                      <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                        item.expected_margin >= 20 ? 'bg-green-100 text-green-800' :
                        item.expected_margin >= 15 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.expected_margin.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.adjustment_reason || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.is_red_risk ? (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                        高リスク
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                        低リスク
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQueue.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            承認待ちの価格調整はありません
          </div>
        )}
      </div>
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${color} text-white p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}