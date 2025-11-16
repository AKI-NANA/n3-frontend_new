'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UnifiedChange {
  id: string;
  product_id: number;
  ebay_listing_id?: string;
  change_category: 'inventory' | 'price' | 'both' | 'page_error';
  inventory_change?: any;
  price_change?: any;
  status: string;
  detected_at: string;
  sku?: string;
  title?: string;
  source_url?: string;
}

export default function InventoryPricingPage() {
  const [changes, setChanges] = useState<UnifiedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const supabase = createClient();

  const fetchChanges = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('pending_changes')
        .select('*')
        .order('detected_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ データ取得エラー:', error);
        return;
      }

      setChanges(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, [filterStatus]);

  const executeMonitoring = async () => {
    setExecuting(true);
    try {
      const response = await fetch('/api/inventory-monitoring/execute');
      const result = await response.json();

      if (result.success) {
        alert(`✅ 完了！\n処理: ${result.processed}件\n変動: ${result.changes_detected}件`);
        fetchChanges();
      } else {
        alert('❌ エラーが発生しました');
      }
    } catch (error) {
      console.error('実行エラー:', error);
      alert('❌ 実行に失敗しました');
    } finally {
      setExecuting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedChanges);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedChanges(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedChanges.size === filteredChanges.length) {
      setSelectedChanges(new Set());
    } else {
      setSelectedChanges(new Set(filteredChanges.map((c) => c.id)));
    }
  };

  const approveSelected = async () => {
    if (selectedChanges.size === 0) {
      alert('変動を選択してください');
      return;
    }

    if (!confirm(`${selectedChanges.size}件の変動を承認しますか？`)) {
      return;
    }

    try {
      const response = await fetch('/api/price-changes/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_change_ids: Array.from(selectedChanges) }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.applied}件を承認しました`);
        setSelectedChanges(new Set());
        fetchChanges();
      }
    } catch (error) {
      console.error('承認エラー:', error);
      alert('❌ 承認に失敗しました');
    }
  };

  const filteredChanges = changes.filter((change) => {
    if (filterCategory !== 'all' && change.change_category !== filterCategory) {
      return false;
    }
    return true;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'inventory': return 'bg-blue-100 text-blue-800';
      case 'price': return 'bg-green-100 text-green-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      case 'page_error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">在庫・価格変動管理</h1>
        <p className="text-gray-600">商品の在庫と価格の変動を一元管理</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={executeMonitoring}
              disabled={executing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {executing ? '実行中...' : '🔄 在庫監視を実行'}
            </button>
            {selectedChanges.size > 0 && (
              <button onClick={approveSelected} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                ✓ {selectedChanges.size}件を承認
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="all">全てのカテゴリ</option>
              <option value="inventory">在庫のみ</option>
              <option value="price">価格のみ</option>
              <option value="both">両方</option>
              <option value="page_error">エラー</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="pending">未処理</option>
              <option value="approved">承認済み</option>
              <option value="applied">適用済み</option>
              <option value="all">全て</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">未処理</div>
          <div className="text-2xl font-bold">{changes.filter((c) => c.status === 'pending').length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">在庫変動</div>
          <div className="text-2xl font-bold text-blue-600">
            {changes.filter((c) => c.change_category === 'inventory' || c.change_category === 'both').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">価格変動</div>
          <div className="text-2xl font-bold text-green-600">
            {changes.filter((c) => c.change_category === 'price' || c.change_category === 'both').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">エラー</div>
          <div className="text-2xl font-bold text-red-600">
            {changes.filter((c) => c.change_category === 'page_error').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox" checked={selectedChanges.size === filteredChanges.length && filteredChanges.length > 0} onChange={toggleSelectAll} />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">商品名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">カテゴリ</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">変動内容</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">検知日時</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">読み込み中...</td></tr>
            ) : filteredChanges.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">変動データがありません</td></tr>
            ) : (
              filteredChanges.map((change) => (
                <tr key={change.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedChanges.has(change.id)} onChange={() => toggleSelection(change.id)} /></td>
                  <td className="px-4 py-3 text-sm font-mono">{change.sku}</td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{change.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryColor(change.change_category)}`}>
                      {change.change_category === 'inventory' && '在庫'}
                      {change.change_category === 'price' && '価格'}
                      {change.change_category === 'both' && '在庫+価格'}
                      {change.change_category === 'page_error' && 'エラー'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {change.inventory_change && <div className="text-blue-600">在庫: {change.inventory_change.old_stock || 0} → {change.inventory_change.new_stock || 0}</div>}
                    {change.price_change && <div className="text-green-600">価格: ¥{change.price_change.old_price_jpy?.toLocaleString()} → ¥{change.price_change.new_price_jpy?.toLocaleString()}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(change.detected_at).toLocaleString('ja-JP')}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${change.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : change.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {change.status === 'pending' && '未処理'}
                      {change.status === 'approved' && '承認済み'}
                      {change.status === 'applied' && '適用済み'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
