'use client'

import { useState, useEffect } from 'react';

// MARK: - データ型定義

interface ArbitrageSettings {
  spuMultiplier: number;
  amazonFeeRate: number;
  maxBSRThreshold: number;
  minProfitRate: number;
}

interface ArbitrageProduct {
  id: string;
  asin: string;
  productName: string;
  rakutenPrice: number;
  amazonPrice: number;
  currentBSR: number;
  purchaseStatus: 'pending' | 'bought' | 'skipped' | 'sold';
  isExcluded: boolean;
}

interface TrackedRoute {
  name: string;
  url: string;
}

export default function RakutenArbitragePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初期化処理
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          <i className="fas fa-search-dollar text-green-600 mr-3"></i> 
          楽天せどり SP-API模擬選定ツール
        </h1>
        <p className="text-gray-600">
          出品可否（API模擬）、回転率、ポイント利益率の全てをクリアした商品のみを表示します。
        </p>
        {userId && (
          <p className="text-xs mt-2 text-gray-400">User ID: {userId}</p>
        )}
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">楽天アービトラージツール</h2>
          <p className="text-gray-600 mb-4">
            このページは現在、React/Next.js構文に移植中です。
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700">
              <strong>注意:</strong> ビルドを成功させるため、旧Angularのロジックとテンプレートは一時的に削除されています。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
