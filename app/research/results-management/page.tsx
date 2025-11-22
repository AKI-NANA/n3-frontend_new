'use client';

/**
 * リサーチ結果管理ページ
 * eBayリサーチ結果を一覧表示し、AI解析対象を選別する
 */

import { useState, useEffect } from 'react';
import { supplierDbService } from '@/services/ai_pipeline/SupplierDatabaseService';
import {
  ResearchManagementView,
  ResearchFilterCriteria,
  ResearchSortCriteria,
  ResearchStatus,
} from '@/types/supplier';
import { AISendSelector } from '@/components/research/AISendSelector';

export default function ResearchManagementPage() {
  const [researchData, setResearchData] = useState<ResearchManagementView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // フィルター状態
  const [filter, setFilter] = useState<ResearchFilterCriteria>({
    research_status: ['NEW', 'SCORED'],
    ai_cost_status: false,
  });

  // ソート状態
  const [sort, setSort] = useState<ResearchSortCriteria>({
    field: 'provisional_ui_score',
    direction: 'desc',
  });

  // データ取得
  useEffect(() => {
    loadData();
  }, [filter, sort]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await supplierDbService.getResearchManagementData(
        filter,
        sort,
        1000,
        0
      );
      setResearchData(data);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedIds.size === researchData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(researchData.map((d) => d.id)));
    }
  };

  // 個別選択
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 上位X%を選択
  const selectTopPercentage = (percentage: number) => {
    const count = Math.ceil((researchData.length * percentage) / 100);
    const topIds = researchData.slice(0, count).map((d) => d.id);
    setSelectedIds(new Set(topIds));
  };

  // スコア閾値で選択
  const selectByScoreThreshold = (threshold: number) => {
    const qualifiedIds = researchData
      .filter((d) => (d.provisional_ui_score || 0) >= threshold)
      .map((d) => d.id);
    setSelectedIds(new Set(qualifiedIds));
  };

  // AI解析キューに送信
  const sendToAIQueue = async (priority: number = 0) => {
    if (selectedIds.size === 0) {
      alert('商品を選択してください');
      return;
    }

    const confirmed = confirm(
      `${selectedIds.size}件の商品をAI解析キューに送信しますか？`
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/research/ai-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: Array.from(selectedIds),
          priority,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`${result.queued_count}件をキューに追加しました`);
        setSelectedIds(new Set());
        loadData(); // データ再読み込み
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('キュー送信エラー:', error);
      alert('キューへの送信に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            リサーチ結果管理
          </h1>
          <p className="mt-2 text-gray-600">
            eBayリサーチ結果を確認し、AI仕入れ先探索の対象を選別します
          </p>
        </div>

        {/* フィルターセクション */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">フィルター</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ステータスフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                リサーチステータス
              </label>
              <select
                multiple
                className="w-full border rounded px-3 py-2"
                value={filter.research_status || []}
                onChange={(e) => {
                  const selected = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value as ResearchStatus
                  );
                  setFilter({ ...filter, research_status: selected });
                }}
              >
                <option value="NEW">NEW（新規）</option>
                <option value="SCORED">SCORED（スコア済み）</option>
                <option value="AI_QUEUED">AI_QUEUED（キュー待ち）</option>
                <option value="AI_COMPLETED">AI_COMPLETED（AI完了）</option>
                <option value="VERIFIED">VERIFIED（検証済み）</option>
              </select>
            </div>

            {/* スコア範囲 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最低暫定スコア
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                placeholder="例: 50000"
                value={filter.min_provisional_score || ''}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    min_provisional_score: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>

            {/* 仕入れ先状態 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                仕入れ先状態
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={
                  filter.has_supplier === undefined
                    ? 'all'
                    : filter.has_supplier
                    ? 'yes'
                    : 'no'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setFilter({
                    ...filter,
                    has_supplier:
                      value === 'all'
                        ? undefined
                        : value === 'yes'
                        ? true
                        : false,
                  });
                }}
              >
                <option value="all">すべて</option>
                <option value="no">未特定</option>
                <option value="yes">特定済み</option>
              </select>
            </div>
          </div>
        </div>

        {/* 選別ツールセクション */}
        <AISendSelector
          totalCount={researchData.length}
          selectedCount={selectedIds.size}
          onSelectAll={toggleSelectAll}
          onSelectTopPercentage={selectTopPercentage}
          onSelectByScore={selectByScoreThreshold}
          onSendToQueue={sendToAIQueue}
        />

        {/* データテーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === researchData.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    商品名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    暫定スコア
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    販売数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    競合数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    利益率
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    仕入れ先
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : researchData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  researchData.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        selectedIds.has(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {item.title || item.english_title || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {item.provisional_ui_score
                            ? item.provisional_ui_score.toLocaleString()
                            : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.sm_sales_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.sm_competitor_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.sm_profit_margin
                          ? `${item.sm_profit_margin.toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {item.best_supplier_url ? (
                          <div className="text-xs">
                            <div className="text-green-600 font-medium">
                              {item.best_supplier_platform}
                            </div>
                            <div className="text-gray-500">
                              ¥{item.best_supplier_price?.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">未特定</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            item.research_status === 'AI_COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : item.research_status === 'AI_QUEUED'
                              ? 'bg-yellow-100 text-yellow-800'
                              : item.research_status === 'SCORED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.research_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">統計情報</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">総データ数</div>
              <div className="text-2xl font-bold text-gray-900">
                {researchData.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">選択中</div>
              <div className="text-2xl font-bold text-blue-600">
                {selectedIds.size}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">仕入れ先特定済み</div>
              <div className="text-2xl font-bold text-green-600">
                {
                  researchData.filter((d) => d.best_supplier_url !== null)
                    .length
                }
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">平均スコア</div>
              <div className="text-2xl font-bold text-gray-900">
                {researchData.length > 0
                  ? Math.round(
                      researchData.reduce(
                        (sum, d) => sum + (d.provisional_ui_score || 0),
                        0
                      ) / researchData.length
                    ).toLocaleString()
                  : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
