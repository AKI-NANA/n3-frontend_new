// app/research/components/ResultsContainer.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ResearchProduct, DisplayMode } from '@/types/research';
import { ProductCard } from './ProductCard';

interface ResultsContainerProps {
  results: ResearchProduct[];
  onClose: () => void;
}

export function ResultsContainer({ results, onClose }: ResultsContainerProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [sortBy, setSortBy] = useState('profit_rate');

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'profit_rate') return (b.profit_rate || 0) - (a.profit_rate || 0);
    if (sortBy === 'sold_quantity') return (b.sold_quantity || 0) - (a.sold_quantity || 0);
    if (sortBy === 'current_price') return (a.current_price || 0) - (b.current_price || 0);
    return 0;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-[var(--research-background-light)] p-6 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-chart-bar"></i>
            検索結果
            <span className="text-lg text-gray-600">({results.length}件)</span>
          </h2>
          
          <div className="flex items-center gap-4">
            {/* 表示モード切替 */}
            <div className="flex bg-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setDisplayMode('grid')}
                className={`px-4 py-2 transition-colors ${
                  displayMode === 'grid' 
                    ? 'bg-[var(--research-primary)] text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-th"></i>
              </button>
              <button
                onClick={() => setDisplayMode('table')}
                className={`px-4 py-2 transition-colors ${
                  displayMode === 'table' 
                    ? 'bg-[var(--research-primary)] text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-list"></i>
              </button>
            </div>

            {/* エクスポート */}
            <Button variant="outline">
              <i className="fas fa-download mr-2"></i>
              エクスポート
            </Button>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-8">
        {displayMode === 'grid' ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedResults.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-table text-4xl mb-4"></i>
            <p>テーブル表示は開発中です</p>
          </div>
        )}

        {results.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-search text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-bold text-gray-700 mb-2">結果がありません</h3>
            <p className="text-gray-500">検索条件を変更してお試しください</p>
          </div>
        )}
      </div>
    </div>
  );
}
