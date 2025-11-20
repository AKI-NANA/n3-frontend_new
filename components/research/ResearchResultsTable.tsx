'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ResearchResult, ResearchStatus } from '@/lib/research/types';

interface ResearchResultsTableProps {
  onSelectionChange?: (selectedIds: string[]) => void;
}

export default function ResearchResultsTable({ onSelectionChange }: ResearchResultsTableProps) {
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ResearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // フィルター状態
  const [filters, setFilters] = useState({
    status: '' as ResearchStatus | '',
    aiCostStatus: '' as 'true' | 'false' | '',
    minScore: '',
    maxScore: '',
    minSoldCount: '',
    maxSoldCount: '',
    keyword: '',
  });

  // ソート状態
  const [sortBy, setSortBy] = useState<'provisional_score' | 'final_score' | 'sold_count' | 'last_research_date'>('provisional_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // データ取得
  useEffect(() => {
    fetchResearchResults();
  }, []);

  // フィルタリング
  useEffect(() => {
    applyFilters();
  }, [results, filters, sortBy, sortOrder]);

  const fetchResearchResults = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('research_results')
        .select('*')
        .order('last_research_date', { ascending: false })
        .limit(1000);

      if (error) throw error;

      setResults(data || []);
    } catch (error) {
      console.error('❌ リサーチ結果取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    // ステータスフィルター
    if (filters.status) {
      filtered = filtered.filter((r) => r.research_status === filters.status);
    }

    // AI解析ステータスフィルター
    if (filters.aiCostStatus) {
      filtered = filtered.filter((r) =>
        r.ai_cost_status === (filters.aiCostStatus === 'true')
      );
    }

    // スコアフィルター
    if (filters.minScore) {
      const minScore = parseFloat(filters.minScore);
      filtered = filtered.filter((r) => (r.provisional_score || 0) >= minScore);
    }
    if (filters.maxScore) {
      const maxScore = parseFloat(filters.maxScore);
      filtered = filtered.filter((r) => (r.provisional_score || 0) <= maxScore);
    }

    // 売上数フィルター
    if (filters.minSoldCount) {
      const minSold = parseInt(filters.minSoldCount);
      filtered = filtered.filter((r) => (r.sold_count || 0) >= minSold);
    }
    if (filters.maxSoldCount) {
      const maxSold = parseInt(filters.maxSoldCount);
      filtered = filtered.filter((r) => (r.sold_count || 0) <= maxSold);
    }

    // キーワードフィルター
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(keyword) ||
          r.search_keyword?.toLowerCase().includes(keyword) ||
          r.ebay_item_id?.toLowerCase().includes(keyword)
      );
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      // undefined/nullを最後にソート
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (sortOrder === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    setFilteredResults(filtered);
  };

  const handleCheckboxChange = (ebayItemId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(ebayItemId);
    } else {
      newSelectedIds.delete(ebayItemId);
    }
    setSelectedIds(newSelectedIds);
    onSelectionChange?.(Array.from(newSelectedIds));
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(filteredResults.map((r) => r.ebay_item_id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    }
  };

  const handleSelectTopPercentage = (percentage: number) => {
    const topCount = Math.ceil(filteredResults.length * (percentage / 100));
    const topIds = new Set(
      filteredResults
        .slice(0, topCount)
        .map((r) => r.ebay_item_id)
    );
    setSelectedIds(topIds);
    onSelectionChange?.(Array.from(topIds));
  };

  const getStatusBadge = (status?: ResearchStatus) => {
    const badges = {
      NEW: 'bg-blue-100 text-blue-800',
      SCORED: 'bg-green-100 text-green-800',
      AI_QUEUED: 'bg-yellow-100 text-yellow-800',
      AI_COMPLETED: 'bg-purple-100 text-purple-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${badges[status || 'NEW']}`}>
        {status || 'NEW'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* フィルターパネル */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">フィルター</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as ResearchStatus | '' })}
            >
              <option value="">全て</option>
              <option value="NEW">NEW</option>
              <option value="SCORED">SCORED</option>
              <option value="AI_QUEUED">AI_QUEUED</option>
              <option value="AI_COMPLETED">AI_COMPLETED</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI解析</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.aiCostStatus}
              onChange={(e) => setFilters({ ...filters, aiCostStatus: e.target.value as 'true' | 'false' | '' })}
            >
              <option value="">全て</option>
              <option value="true">完了</option>
              <option value="false">未完了</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最小スコア</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最大スコア</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={filters.maxScore}
              onChange={(e) => setFilters({ ...filters, maxScore: e.target.value })}
              placeholder="100000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最小売上数</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={filters.minSoldCount}
              onChange={(e) => setFilters({ ...filters, minSoldCount: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="商品名、eBay ID等"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setFilters({
              status: '',
              aiCostStatus: '',
              minScore: '',
              maxScore: '',
              minSoldCount: '',
              maxSoldCount: '',
              keyword: '',
            })}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            フィルターをクリア
          </button>
        </div>
      </div>

      {/* 選択操作パネル */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">選択操作</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {selectedIds.size === filteredResults.length ? '全て解除' : '全て選択'}
          </button>
          <button
            onClick={() => handleSelectTopPercentage(10)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            上位10%を選択
          </button>
          <button
            onClick={() => handleSelectTopPercentage(25)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            上位25%を選択
          </button>
          <span className="px-4 py-2 bg-gray-100 rounded">
            選択中: {selectedIds.size}件 / {filteredResults.length}件
          </span>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredResults.length && filteredResults.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品情報</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'provisional_score') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      } else {
                        setSortBy('provisional_score');
                        setSortOrder('desc');
                      }
                    }}>
                  暫定スコア {sortBy === 'provisional_score' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'final_score') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      } else {
                        setSortBy('final_score');
                        setSortOrder('desc');
                      }
                    }}>
                  最終スコア {sortBy === 'final_score' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'sold_count') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      } else {
                        setSortBy('sold_count');
                        setSortOrder('desc');
                      }
                    }}>
                  売上数 {sortBy === 'sold_count' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">競合数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResults.map((result) => (
                <tr key={result.ebay_item_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(result.ebay_item_id)}
                      onChange={(e) => handleCheckboxChange(result.ebay_item_id, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {result.image_url && (
                        <img
                          src={result.image_url}
                          alt={result.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <a
                          href={result.view_item_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm font-medium line-clamp-2"
                        >
                          {result.title}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          ID: {result.ebay_item_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          価格: ${result.price_usd}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {getStatusBadge(result.research_status)}
                      {result.ai_cost_status && (
                        <div className="text-xs text-green-600">AI解析済み</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {result.provisional_score?.toLocaleString() || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">
                    {result.final_score?.toLocaleString() || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {result.sold_count || 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {result.competitor_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredResults.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            該当するリサーチ結果がありません
          </div>
        )}
      </div>
    </div>
  );
}
