'use client'

import { useState, useEffect } from 'react';
import { useArbitrageTool } from './useArbitrageTool';
import { supabase } from '@/lib/supabase/client';

export default function RakutenArbitragePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState('');
  const [routeUrl, setRouteUrl] = useState('');
  const [asinToCheck, setAsinToCheck] = useState('');
  const [eligibilityResult, setEligibilityResult] = useState<string | null>(null);

  const {
    settings,
    filteredProducts,
    trackedRoutes,
    salesRecords,
    isLoading,
    addTrackedRoute,
    removeTrackedRoute,
    checkAsinEligibility,
    updateStatus,
    updateSettings,
  } = useArbitrageTool(userId || undefined);

  useEffect(() => {
    // ユーザーIDの取得
    async function getUserId() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUserId(data.user.id);
        } else {
          // 匿名ユーザー用の一時ID
          setUserId('anonymous-' + Math.random().toString(36).substr(2, 9));
        }
      } catch (error) {
        console.error('ユーザーID取得エラー:', error);
        setUserId('anonymous-' + Math.random().toString(36).substr(2, 9));
      }
    }
    getUserId();
  }, []);

  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeName && routeUrl) {
      addTrackedRoute(routeName, routeUrl);
      setRouteName('');
      setRouteUrl('');
    }
  };

  const handleCheckEligibility = () => {
    if (asinToCheck) {
      const isEligible = checkAsinEligibility(asinToCheck);
      setEligibilityResult(
        isEligible
          ? `✅ ASIN ${asinToCheck} は出品可能です（模擬結果）`
          : `❌ ASIN ${asinToCheck} は出品制限があります（模擬結果）`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10 font-sans">
      {/* ヘッダー */}
      <header className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
          <i className="fas fa-search-dollar text-green-600 mr-3"></i>
          楽天せどり 高度選定ツール
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          ポイント倍率・Amazon出品可否・利益率・回転率を統合判断し、最適な仕入れ候補をリスト化
        </p>
        {userId && (
          <p className="text-xs mt-2 text-gray-400">User ID: {userId.substring(0, 8)}...</p>
        )}
      </header>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* 設定セクション */}
        <section className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center">
            <i className="fas fa-cog text-blue-600 mr-2"></i>
            基本設定
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SPU倍率 (%)
              </label>
              <input
                type="number"
                value={settings.spuMultiplier}
                onChange={(e) =>
                  updateSettings({ spuMultiplier: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最低利益率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.minProfitRate * 100}
                onChange={(e) =>
                  updateSettings({ minProfitRate: parseFloat(e.target.value) / 100 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大BSR
              </label>
              <input
                type="number"
                value={settings.maxBSR}
                onChange={(e) => updateSettings({ maxBSR: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </section>

        {/* 仕入れルートトラッキング */}
        <section className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center">
            <i className="fas fa-route text-purple-600 mr-2"></i>
            仕入れルート管理
          </h2>
          <form onSubmit={handleAddRoute} className="mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="店舗名/カテゴリ名"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="url"
                placeholder="URL"
                value={routeUrl}
                onChange={(e) => setRouteUrl(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>
              追加
            </button>
          </form>

          <div className="space-y-2">
            {trackedRoutes.length === 0 ? (
              <p className="text-gray-500 text-sm">仕入れルートが登録されていません</p>
            ) : (
              trackedRoutes.map((route) => (
                <div
                  key={route.id}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200"
                >
                  <div className="flex-1 mb-2 md:mb-0">
                    <p className="font-semibold text-gray-800">{route.name}</p>
                    <a
                      href={route.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm break-all"
                    >
                      {route.url}
                    </a>
                  </div>
                  <button
                    onClick={() => removeTrackedRoute(route.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                  >
                    <i className="fas fa-trash-alt mr-1"></i>
                    削除
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 出品可否クイックチェック */}
        <section className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center">
            <i className="fas fa-shield-alt text-orange-600 mr-2"></i>
            出品可否クイックチェック
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            <i className="fas fa-info-circle mr-1"></i>
            ※この機能はAmazon SP-APIの応答を模擬しています。正確な出品可否は、Amazonセラーセントラルで最終確認してください。
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="ASINを入力"
              value={asinToCheck}
              onChange={(e) => setAsinToCheck(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleCheckEligibility}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md transition-colors"
            >
              <i className="fas fa-check-circle mr-2"></i>
              チェック
            </button>
          </div>
          {eligibilityResult && (
            <div
              className={`mt-4 p-3 rounded-md ${
                eligibilityResult.includes('✅')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {eligibilityResult}
            </div>
          )}
        </section>

        {/* 仕入れ候補リスト (3.3 利益順ソートの強調表示) */}
        <section className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold flex items-center mb-2 md:mb-0">
              <i className="fas fa-list text-green-600 mr-2"></i>
              仕入れ候補リスト
            </h2>
            <p className="text-sm text-green-700 font-semibold bg-green-50 px-3 py-1 rounded-md border border-green-200">
              <i className="fas fa-sort-amount-down mr-1"></i>
              純利益の高い順に表示されています
            </p>
          </div>

          <div className="overflow-x-auto">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-inbox text-gray-300 text-5xl mb-3"></i>
                <p className="text-gray-500">
                  現在、条件に合う仕入れ候補がありません
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ASIN
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      商品名
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      実質仕入れ値
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amazon純利益
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      利益率
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BSR
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.asin} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-mono">
                        {product.asin}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {product.productName}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                        ¥{product.effectiveRakutenPrice.toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                        ¥{product.netProfit.toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                        {(product.profitRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                        {product.currentBSR.toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center space-x-2">
                        <button
                          onClick={() => updateStatus(product.asin, 'bought')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors"
                        >
                          <i className="fas fa-shopping-cart mr-1"></i>
                          仕入れ実行
                        </button>
                        <button
                          onClick={() => updateStatus(product.asin, 'skipped')}
                          className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                        >
                          見送り
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* 過去の販売実績 (5.4 実績リストの改善: ASINを表示) */}
        <section className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center">
            <i className="fas fa-chart-line text-indigo-600 mr-2"></i>
            過去の販売実績
          </h2>
          <div className="space-y-3">
            {salesRecords.length === 0 ? (
              <p className="text-gray-500 text-sm">販売実績がまだありません</p>
            ) : (
              salesRecords.slice(0, 10).map((record, index) => (
                <div
                  key={`${record.asin}-${index}`}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-md border border-indigo-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {record.productName}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-mono font-semibold">ASIN: {record.asin}</span>
                      {' / '}
                      <span>
                        {new Date(record.purchaseDate).toLocaleDateString('ja-JP')}
                      </span>
                    </p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <p className="text-lg font-bold text-green-600">
                      利益: ¥{record.netProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* フッター注意事項 */}
        <footer className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <p className="text-yellow-800 text-sm">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            <strong>注意:</strong> このツールの利益計算やASIN制限判定は模擬データに基づいています。
            実際の仕入れ前には、必ず最新の情報を各プラットフォームで確認してください。
          </p>
        </footer>
      </div>
    </div>
  );
}
