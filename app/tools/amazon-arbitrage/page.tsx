'use client'

/**
 * Amazon刈り取り自動化ツール - メインUI
 *
 * 機能:
 * 1. 検品待ちリスト（awaiting_inspection）- 承認ボタンで即時出品
 * 2. 商品到着待ちリスト（purchased）
 * 3. 自動決済候補リスト（tracked）- スコア85点以上
 * 4. 出品済みリスト（listed）
 *
 * データソース: Supabase products_master テーブル
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product, ArbitrageStatus } from '@/types/product';

// スタイルは既存のTailwindクラスを使用
const ArbitrageToolPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // データ取得
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('products_master')
        .select('*')
        .in('arbitrage_status', [
          'awaiting_inspection',
          'purchased',
          'tracked',
          'listed',
        ])
        .order('arbitrage_score', { ascending: false, nullsFirst: false });

      if (fetchError) {
        console.error('❌ データ取得エラー:', fetchError);
        setError('データの取得に失敗しました');
        return;
      }

      setProducts(data || []);
    } catch (err) {
      console.error('❌ データ取得例外:', err);
      setError('予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  // 承認ボタンの処理
  async function handleApprove(productId: string) {
    if (!confirm('商品を承認し、多販路への即時出品を開始しますか？')) {
      return;
    }

    try {
      setProcessingId(productId);

      const response = await fetch(`/api/arbitrage/approve-listing/${productId}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('✅ 承認完了。多販路への即時出品パイプラインが起動しました。');
        // データを再取得
        await fetchProducts();
      } else {
        alert(`❌ 承認失敗: ${result.error || '不明なエラー'}`);
      }
    } catch (err) {
      console.error('❌ 承認処理エラー:', err);
      alert('承認処理中にエラーが発生しました');
    } finally {
      setProcessingId(null);
    }
  }

  // ステータス別にフィルタリング
  const awaitingInspection = products.filter(
    (p) => p.arbitrage_status === 'awaiting_inspection'
  );
  const inTransit = products.filter((p) => p.arbitrage_status === 'purchased');
  const tracked = products.filter(
    (p) =>
      p.arbitrage_status === 'tracked' &&
      p.arbitrage_score !== null &&
      p.arbitrage_score >= 85
  );
  const listed = products.filter((p) => p.arbitrage_status === 'listed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 text-gray-900">
          🚀 Amazon刈り取り自動化ツール
        </h1>
        <p className="text-gray-600 mb-4">
          Keepa波形分析とAI市場分析に基づき、高スコア商品を自動で刈り取り、素早く現金化します。
        </p>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="font-semibold text-yellow-800">
            ⚠️ 重要: 「検品待ちリスト」の商品確認後、承認ボタンを押すことで多販路へ即時出品されます。
          </p>
        </div>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          🔄 データを更新
        </button>
      </div>

      {/* 1. 検品待ちリスト (唯一の人為介入ポイント) */}
      <section className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-yellow-500 text-white px-6 py-4 font-bold text-lg">
          📦 検品待ちリスト ({awaitingInspection.length} 件) - 承認で即時出品
        </div>
        <div className="p-6">
          {awaitingInspection.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              現在、検品待ちの商品はありません。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-3 px-4">ASIN</th>
                    <th className="py-3 px-4">商品タイトル</th>
                    <th className="py-3 px-4">購入アカウント</th>
                    <th className="py-3 px-4 text-center">スコア</th>
                    <th className="py-3 px-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {awaitingInspection.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b hover:bg-yellow-50 transition"
                    >
                      <td className="py-3 px-4 font-mono text-sm">
                        {product.asin}
                      </td>
                      <td className="py-3 px-4 max-w-md truncate">
                        {product.title}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                          {product.purchase_account_id || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-green-600 text-lg">
                          {product.arbitrage_score?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleApprove(product.id)}
                          disabled={processingId === product.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingId === product.id
                            ? '処理中...'
                            : '✅ 検品完了 & 承認'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 2. 商品到着待ちリスト */}
      <section className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-500 text-white px-6 py-4 font-bold text-lg">
          🚚 商品到着待ちリスト ({inTransit.length} 件)
        </div>
        <div className="p-6">
          {inTransit.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              現在、到着待ちの商品はありません。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-3 px-4">ASIN</th>
                    <th className="py-3 px-4">商品タイトル</th>
                    <th className="py-3 px-4">注文ID</th>
                    <th className="py-3 px-4 text-center">スコア</th>
                  </tr>
                </thead>
                <tbody>
                  {inTransit.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b hover:bg-blue-50 transition"
                    >
                      <td className="py-3 px-4 font-mono text-sm">
                        {product.asin}
                      </td>
                      <td className="py-3 px-4 max-w-md truncate">
                        {product.title}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {product.amazon_order_id || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-green-600">
                          {product.arbitrage_score?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 3. 自動決済候補リスト (高スコア商品) */}
      <section className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-purple-500 text-white px-6 py-4 font-bold text-lg">
          💰 自動決済候補リスト (スコア85点以上 | {tracked.length} 件)
        </div>
        <div className="p-6">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-4">
            <p className="text-purple-800">
              💡 Keepa Webhookにより価格下落がトリガーされると、これらの商品が夜間でも自動決済されます。
            </p>
          </div>
          {tracked.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              現在、自動決済候補の商品はありません。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-3 px-4">ASIN</th>
                    <th className="py-3 px-4">商品タイトル</th>
                    <th className="py-3 px-4 text-center">スコア</th>
                    <th className="py-3 px-4 text-center">対象国</th>
                  </tr>
                </thead>
                <tbody>
                  {tracked.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b hover:bg-purple-50 transition"
                    >
                      <td className="py-3 px-4 font-mono text-sm">
                        {product.asin}
                      </td>
                      <td className="py-3 px-4 max-w-md truncate">
                        {product.title}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-purple-600 text-lg">
                          {product.arbitrage_score?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-purple-200 rounded text-xs font-semibold">
                          {product.target_country || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 4. 出品済みリスト */}
      <section className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-green-500 text-white px-6 py-4 font-bold text-lg">
          ✅ 出品済みリスト ({listed.length} 件)
        </div>
        <div className="p-6">
          {listed.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              現在、出品済みの商品はありません。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-3 px-4">ASIN</th>
                    <th className="py-3 px-4">商品タイトル</th>
                    <th className="py-3 px-4 text-center">販売ルート</th>
                    <th className="py-3 px-4 text-center">最終スコア</th>
                  </tr>
                </thead>
                <tbody>
                  {listed.slice(0, 20).map((product) => (
                    <tr
                      key={product.id}
                      className="border-b hover:bg-green-50 transition"
                    >
                      <td className="py-3 px-4 font-mono text-sm">
                        {product.asin}
                      </td>
                      <td className="py-3 px-4 max-w-md truncate">
                        {product.title}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-green-200 rounded text-xs">
                          {product.optimal_sales_channel || 'Multi-channel'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-green-600">
                          {product.arbitrage_score?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listed.length > 20 && (
                <p className="text-center py-4 text-gray-500 text-sm">
                  ... 他 {listed.length - 20} 件（最新20件のみ表示）
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* フッター統計 */}
      <div className="mt-8 p-6 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-bold mb-3">📊 統計情報</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {awaitingInspection.length}
            </p>
            <p className="text-sm text-gray-600">検品待ち</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{inTransit.length}</p>
            <p className="text-sm text-gray-600">到着待ち</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{tracked.length}</p>
            <p className="text-sm text-gray-600">自動決済候補</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{listed.length}</p>
            <p className="text-sm text-gray-600">出品済み</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArbitrageToolPage;
