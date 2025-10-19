import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアント初期化（環境変数から読み込み）
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
);

const ScoringDashboard = () => {
  const [statistics, setStatistics] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 統計情報読み込み
  useEffect(() => {
    loadStatistics();
    loadRanking();
  }, []);

  const loadStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_scoring_statistics');
      
      if (error) throw error;
      setStatistics(data);
    } catch (error) {
      console.error('統計読み込みエラー:', error);
    }
  };

  const loadRanking = async (limit = 50) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_score_ranking', { 
          limit_count: limit, 
          offset_count: 0 
        });
      
      if (error) throw error;
      setRanking(data || []);
    } catch (error) {
      console.error('ランキング読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const showScoreDetail = async (productId) => {
    try {
      const { data, error } = await supabase
        .from('product_scores')
        .select('*')
        .eq('product_id', productId)
        .single();
      
      if (error) throw error;
      setSelectedProduct(data);
      setModalOpen(true);
    } catch (error) {
      console.error('スコア詳細読み込みエラー:', error);
    }
  };

  const getRank = (score) => {
    if (score >= 9000) return 'S';
    if (score >= 8000) return 'A';
    if (score >= 7000) return 'B';
    if (score >= 6000) return 'C';
    if (score >= 5000) return 'D';
    return 'E';
  };

  const getRankColor = (rank) => {
    const colors = {
      'S': 'bg-yellow-100 text-yellow-800',
      'A': 'bg-blue-100 text-blue-800',
      'B': 'bg-green-100 text-green-800',
      'C': 'bg-purple-100 text-purple-800',
      'D': 'bg-gray-100 text-gray-800',
      'E': 'bg-red-100 text-red-800'
    };
    return colors[rank] || 'bg-gray-100 text-gray-800';
  };

  const exportCSV = async () => {
    try {
      const { data, error } = await supabase
        .from('product_scores')
        .select(`
          product_id,
          total_score,
          profit_amount,
          profit_rate,
          competitor_count,
          ebay_sold_30d,
          expected_sale_price,
          priority_rank
        `)
        .gte('total_score', 5000)
        .order('total_score', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      
      // CSV変換
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => row[h]).join(','))
      ].join('\n');
      
      // ダウンロード
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product_scores_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    } catch (error) {
      console.error('CSV出力エラー:', error);
      alert('CSV出力に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <span className="text-4xl">📊</span>
          商品スコアリング管理
        </h1>
        <p className="text-gray-600">10,000点満点の精密スコアリングで出品優先度を自動判定</p>
        
        {/* 統計カード */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg p-5 text-center">
              <div className="text-3xl font-bold">{statistics.total_products?.toLocaleString()}</div>
              <div className="text-sm opacity-90 mt-1">登録商品数</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg p-5 text-center">
              <div className="text-3xl font-bold">{statistics.avg_score?.toLocaleString()}</div>
              <div className="text-sm opacity-90 mt-1">平均スコア</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-lg p-5 text-center">
              <div className="text-3xl font-bold">{statistics.max_score?.toLocaleString()}</div>
              <div className="text-sm opacity-90 mt-1">最高スコア</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white rounded-lg p-5 text-center">
              <div className="text-3xl font-bold">
                {statistics.rank_distribution?.find(r => r.rank === 'S')?.count || 0}
              </div>
              <div className="text-sm opacity-90 mt-1">Sランク商品</div>
            </div>
          </div>
        )}
      </div>

      {/* コントロールセクション */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>⚙️</span>
          スコア計算
        </h2>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => alert('一括計算機能は実装中です')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <span>🔢</span>
            一括スコア計算
          </button>
          <button 
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <span>📥</span>
            CSV出力 (AI分析用)
          </button>
          <button 
            onClick={() => {
              loadStatistics();
              loadRanking();
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <span>🔄</span>
            更新
          </button>
        </div>
      </div>

      {/* ランキングテーブル */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span>🏆</span>
            スコアランキング
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="商品名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">順位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ランク</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">総合スコア</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">利益額</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">利益率</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">競合数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ranking.map((row) => {
                  const rank = getRank(row.total_score);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">#{row.priority_rank}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRankColor(rank)}`}>
                          {rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.product_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-lg text-gray-900">
                          {parseFloat(row.total_score).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{parseInt(row.profit_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(row.profit_rate || 0).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseInt(row.competitor_count || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => showScoreDetail(row.product_id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-medium transition-all"
                        >
                          👁️ 詳細
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* スコア詳細モーダル */}
      {modalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">📊 スコア詳細</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* 総合スコア表示 */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg p-6 mb-6">
                <div className="text-5xl font-bold mb-2">
                  {parseFloat(selectedProduct.total_score).toLocaleString(undefined, {
                    minimumFractionDigits: 2
                  })}
                </div>
                <div className="text-lg opacity-90">総合スコア / 10,000点</div>
                <div className="mt-4 text-xl font-semibold">
                  ランク: {getRank(selectedProduct.total_score)} | 
                  順位: #{selectedProduct.priority_rank}
                </div>
              </div>

              {/* スコア内訳 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScoreBreakdownCard
                  title="収益性"
                  icon="💰"
                  items={[
                    { label: '利益額', value: selectedProduct.profit_amount_score },
                    { label: '利益率', value: selectedProduct.profit_rate_score },
                    { label: 'ROI', value: selectedProduct.roi_score }
                  ]}
                />
                <ScoreBreakdownCard
                  title="市場分析"
                  icon="📈"
                  items={[
                    { label: '市場規模', value: selectedProduct.market_size_score },
                    { label: '競合数', value: selectedProduct.competition_count_score },
                    { label: '競合優位性', value: selectedProduct.competition_advantage_score },
                    { label: 'カテゴリー人気', value: selectedProduct.category_popularity_score }
                  ]}
                />
                <ScoreBreakdownCard
                  title="商品特性"
                  icon="⭐"
                  items={[
                    { label: '希少性', value: selectedProduct.rarity_score },
                    { label: '廃盤度', value: selectedProduct.discontinued_score },
                    { label: 'オリジナル性', value: selectedProduct.originality_score },
                    { label: 'セット品', value: selectedProduct.set_bonus_score }
                  ]}
                />
                <ScoreBreakdownCard
                  title="販売実績"
                  icon="📊"
                  items={[
                    { label: '過去販売数', value: selectedProduct.sold_count_score },
                    { label: '閲覧数', value: selectedProduct.view_count_score },
                    { label: 'ウォッチャー数', value: selectedProduct.watcher_count_score },
                    { label: '売れ行き率', value: selectedProduct.sell_through_rate_score }
                  ]}
                />
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <p className="text-sm text-gray-700">
                  <strong>最終更新:</strong> {new Date(selectedProduct.last_calculated_at).toLocaleString('ja-JP')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// スコア内訳カードコンポーネント
const ScoreBreakdownCard = ({ title, icon, items }) => {
  const total = items.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        <span className="font-bold text-lg text-purple-600">
          {total.toFixed(2)}点
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-semibold text-gray-900">
              {parseFloat(item.value || 0).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoringDashboard;