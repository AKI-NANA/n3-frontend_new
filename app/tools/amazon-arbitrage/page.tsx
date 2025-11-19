'use client'

// ファイル: /app/tools/amazon-arbitrage/page.tsx
// Next.js App Router ページコンポーネント

import React from 'react';
import styles from '@/components/ProductModal/FullFeaturedModal.module.css'; // 既存のCSSを流用
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button'; // shadcn/uiのButtonを仮定

// ダミーデータ（実際はAPIから取得）
const mockProducts: Product[] = [
  // awaiting_inspection: 検品待ちリストに表示される
  { id: 1, sku: 'ASIN123', title: '刈り取り商品A (要検品)', purchase_account_id: 'CORP-001', arbitrage_status: 'awaiting_inspection', arbitrage_score: 95, /* ...他のデータ */ },
  // purchased: 商品到着待ちリストに表示される
  { id: 2, sku: 'ASIN456', title: '刈り取り商品B (到着待ち)', purchase_account_id: 'CORP-002', arbitrage_status: 'purchased', arbitrage_score: 88, expected_delivery_date: '2025-11-20', /* ...他のデータ */ },
  // tracked: 自動決済候補リストに表示される
  { id: 3, sku: 'ASIN789', title: '刈り取り候補C (自動決済待機中)', purchase_account_id: null, arbitrage_status: 'tracked', arbitrage_score: 99, /* ...他のデータ */ },
] as Product[];


// APIを叩いて出品をトリガーする関数（/api/arbitrage/approve-listing）
async function handleApprove(productId: number) {
  if (confirm('商品を承認し、多販路への即時出品を開始しますか？')) {
    const response = await fetch(`/api/arbitrage/approve-listing/${productId}`, {
      method: 'POST',
    });
    if (response.ok) {
      alert('承認完了。多販路への即時出品パイプラインが起動しました。');
      // UIの更新ロジック
    } else {
      alert('承認失敗。再度お試しください。');
    }
  }
}

const ArbitrageToolPage = () => {
  const awaitingInspection = mockProducts.filter(p => p.arbitrage_status === 'awaiting_inspection');
  const inTransit = mockProducts.filter(p => p.arbitrage_status === 'purchased');

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Amazon刈り取り自動化ツール</h1>
      <p className="text-gray-600 mb-8">
        スコアリングに基づき自動で仕入れられた商品のステータス管理を行います。<br />
        <span className="font-semibold text-red-600">【重要】</span>「検品待ちリスト」の商品確認後、承認ボタンを押すことで多販路へ即時出品されます。
      </p>

      {/* 1. 検品待ちリスト (唯一の人為介入ポイント) */}
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>
          📦 検品待ちリスト ({awaitingInspection.length} 件) - 承認で即時出品
        </div>
        <div className="p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2">ASIN/SKU</th>
                <th className="py-2">商品タイトル</th>
                <th className="py-2">購入アカウント</th>
                <th className="py-2">スコア</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {awaitingInspection.map(product => (
                <tr key={product.id} className="border-b hover:bg-yellow-50">
                  <td className="py-3">{product.sku}</td>
                  <td className="py-3">{product.title}</td>
                  <td className="py-3">{product.purchase_account_id}</td>
                  <td className="py-3 font-bold text-green-600">{product.arbitrage_score}</td>
                  <td className="py-3">
                    <Button 
                      onClick={() => handleApprove(product.id)} 
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      ✅ 検品完了 & 承認 (即時出品)
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {awaitingInspection.length === 0 && <p className="text-center py-4 text-gray-500">現在、検品待ちの商品はありません。</p>}
        </div>
      </div>
      
      {/* 2. 商品到着待ちリスト */}
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>
          🚚 商品到着待ちリスト ({inTransit.length} 件)
        </div>
        <div className="p-4">
          {/* ... 商品リスト表示ロジック（到着予定日、注文IDなど） ... */}
        </div>
      </div>

      {/* 3. 自動決済候補リスト (高スコア商品) */}
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>
          💰 自動決済候補リスト (スコア85点以上)
        </div>
        <div className="p-4">
          {/* ... arbitrage_status === 'tracked' の商品を表示 ... */}
          <p className="text-gray-500">
            Keepa Webhookにより価格下落がトリガーされると、これらの商品が夜間でも自動決済されます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArbitrageToolPage;