// app/research/page.tsx
'use client';

import { useState } from 'react';
import type { ResearchProduct, SearchType } from '@/types/research';
import { ProductSearchForm } from './components/ProductSearchForm';
import { SellerSearchForm } from './components/SellerSearchForm';
import { ReverseSearchForm } from './components/ReverseSearchForm';
import { AIAnalysisForm } from './components/AIAnalysisForm';
import { ResultsContainer } from './components/ResultsContainer';
import { LoadingOverlay } from './components/LoadingOverlay';

// LoadingOverlayコンポーネントが存在しない場合の簡易版
function LoadingOverlay({ message, subMessage }: { message: string; subMessage: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{message}</h3>
          <p className="text-gray-600 text-center">{subMessage}</p>
        </div>
      </div>
    </div>
  );
}

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<SearchType>('product');
  const [searchResults, setSearchResults] = useState<ResearchProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSubMessage, setLoadingSubMessage] = useState('');

  const handleSearch = (results: ResearchProduct[]) => {
    setSearchResults(results);
    setIsLoading(false);
  };

  const handleCloseResults = () => {
    setSearchResults([]);
  };

  return (
    <div className="min-h-screen research-gradient-bg">
      {/* ヘッダー */}
      <header className="research-header-gradient text-white py-8 shadow-lg relative research-grain-pattern">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <i className="fas fa-chart-line"></i>
                eBay AI Research Tool
              </h1>
              <p className="text-blue-100 text-lg">
                🔥 完全統合版 - Finding + Shopping + AI分析
              </p>
            </div>
            
            {/* AI分析バッジ */}
            <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg border-2 border-white/30">
              <div className="flex items-center gap-2 text-sm">
                <i className="fas fa-robot text-2xl"></i>
                <div>
                  <div className="font-bold">AI分析搭載</div>
                  <div className="text-xs text-blue-100">HSコード・原産国・リスク判定</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        {/* タブナビゲーション */}
        <div className="bg-white rounded-t-lg shadow-lg overflow-hidden mb-0">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('product')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'product'
                  ? 'bg-[var(--research-primary)] text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-search"></i>
              商品リサーチ
            </button>
            <button
              onClick={() => setActiveTab('seller')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'seller'
                  ? 'bg-[var(--research-primary)] text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-user"></i>
              セラーリサーチ
            </button>
            <button
              onClick={() => setActiveTab('reverse')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'reverse'
                  ? 'bg-[var(--research-primary)] text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-exchange-alt"></i>
              逆リサーチ
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'ai'
                  ? 'bg-[var(--research-primary)] text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-brain"></i>
              AI分析
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">NEW</span>
            </button>
          </div>
        </div>

        {/* フォームエリア */}
        <div className="bg-white rounded-b-lg shadow-lg p-8 mb-8">
          {activeTab === 'product' && (
            <ProductSearchForm
              onSearch={handleSearch}
              setLoading={setIsLoading}
              setLoadingMessage={setLoadingMessage}
              setLoadingSubMessage={setLoadingSubMessage}
            />
          )}
          {activeTab === 'seller' && (
            <SellerSearchForm
              onSearch={handleSearch}
              setLoading={setIsLoading}
              setLoadingMessage={setLoadingMessage}
              setLoadingSubMessage={setLoadingSubMessage}
            />
          )}
          {activeTab === 'reverse' && (
            <ReverseSearchForm
              onSearch={handleSearch}
              setLoading={setIsLoading}
              setLoadingMessage={setLoadingMessage}
              setLoadingSubMessage={setLoadingSubMessage}
            />
          )}
          {activeTab === 'ai' && (
            <AIAnalysisForm
              onSearch={handleSearch}
              setLoading={setIsLoading}
              setLoadingMessage={setLoadingMessage}
              setLoadingSubMessage={setLoadingSubMessage}
            />
          )}
        </div>

        {/* 検索結果 */}
        {searchResults.length > 0 && (
          <ResultsContainer results={searchResults} onClose={handleCloseResults} />
        )}

        {/* 機能説明 */}
        {searchResults.length === 0 && !isLoading && (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-blue-500">
              <div className="text-blue-500 text-4xl mb-4">
                <i className="fas fa-search"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">商品リサーチ</h3>
              <p className="text-gray-600">
                eBayの商品を検索して、利益率・人気度・リスクを自動分析します。
                Shopping APIで詳細データを取得。
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-purple-500">
              <div className="text-purple-500 text-4xl mb-4">
                <i className="fas fa-robot"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">AI分析</h3>
              <p className="text-gray-600">
                HSコード判定・原産国推測・危険物判定・VEROリスク・特許リスクを
                AIが自動で分析します。
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-green-500">
              <div className="text-green-500 text-4xl mb-4">
                <i className="fas fa-copy"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">セラーミラー連携</h3>
              <p className="text-gray-600">
                リサーチ結果を出品ツールへワンクリックで連携。
                商品説明・画像・仕様が自動入力されます。
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ローディングオーバーレイ */}
      {isLoading && (
        <LoadingOverlay message={loadingMessage} subMessage={loadingSubMessage} />
      )}
    </div>
  );
}
