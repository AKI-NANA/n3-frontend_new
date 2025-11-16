// /components/listing/IntegratedListingTable.tsx

import React, { useState, useMemo } from 'react';
import { ListingItem, SourceMall, ListingStatus } from '@/types/listing';

// 💡 モックデータ (API連携で置き換えが必要)
const MOCK_LISTINGS: ListingItem[] = [
    // ... (データ省略) ...
    { sku: 'SKU-001', title: 'Vintage Camera Lens', current_price: 150.99, total_stock_count: 8, performance_score: 'A+', sales_30d: 45, listing_mode: '中古優先', 
      mall_statuses: [
        { mall: 'eBay_US', status: 'Active', listing_id: 'EBAY-123' }, 
        { mall: 'Amazon_JP', status: 'Inactive', listing_id: 'AMZN-001' }
      ],
      stock_details: [ /* ...詳細データ... */ ]
    },
];

const IntegratedListingTable = () => {
    const [selectedMall, setSelectedMall] = useState<SourceMall | 'All'>('All');
    const [listings, setListings] = useState<ListingItem[]>(MOCK_LISTINGS);

    // III. モール別フィルター・ソート機能 (ロジック骨子)
    const filteredListings = useMemo(() => {
        if (selectedMall === 'All') return listings;
        return listings.filter(item => 
            item.mall_statuses.some(s => s.mall === selectedMall && s.status !== 'Inactive')
        );
    }, [listings, selectedMall]);

    const handleAction = (sku: string, action: 'Stop' | 'Price' | 'Edit') => {
        if (action === 'Edit') {
            // 💡 1. 出品データ編集モーダル起動ロジックへ
            console.log(`[Action] Editing listing data for SKU: ${sku}`);
        } else {
            // 💡 [出品停止] や [価格戦略変更] API (第4層) への連携ロジックを実装
            console.log(`[Action] Executing ${action} for SKU: ${sku}`);
        }
    };
    
    const renderMallStatus = (statuses: ListingItem['mall_statuses']) => {
        return (
            <div className="flex space-x-1">
                {statuses.map(s => (
                    <span 
                        key={s.mall} 
                        className={`p-1 rounded-full text-xs font-bold ${
                            s.status === 'Active' ? 'bg-green-500' : 
                            s.status === 'Inactive' || s.status === 'SoldOut' || s.status === 'PolicyViolation' ? 'bg-red-500' :
                            s.status === 'SyncError' ? 'bg-yellow-500' : 'bg-gray-300'
                        }`}
                        title={`${s.mall}: ${s.status}`}
                    >
                        {/* 💡 モールアイコン表示ロジックを実装 */}
                        {s.mall.split('_')[0]} 
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4">
            <h2>統合出品管理テーブル</h2>
            
            {/* III. 1. モール別フィルター・ソート機能 UI */}
            <select 
                value={selectedMall} 
                onChange={(e) => setSelectedMall(e.target.value as SourceMall | 'All')}
                className="mb-4 p-2 border"
            >
                <option value="All">全てのモール</option>
                {/* 💡 ここに動的にモールオプションを追加するロジックを実装 */}
                <option value="eBay_US">eBay_US</option>
                <option value="Amazon_JP">Amazon_JP</option>
            </select>
            
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>商品名/タイトル</th>
                        <th>出品モード</th>
                        <th>出品中のモール</th>
                        <th>価格</th>
                        <th>総在庫数</th>
                        <th>P.スコア</th>
                        <th>アクション</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredListings.map(item => (
                        <tr key={item.sku}>
                            <td 
                                onClick={() => {/* 💡 IV. 履歴データと連携（詳細パネル）起動ロジックへ */}}
                                className="cursor-pointer text-blue-600 hover:underline font-semibold"
                            >
                                {item.sku}
                            </td>
                            <td>{item.title}</td>
                            <td>{item.listing_mode}</td>
                            <td>{renderMallStatus(item.mall_statuses)}</td>
                            <td>¥{item.current_price}</td>
                            <td className={item.total_stock_count < 5 ? 'text-red-500' : ''}>
                                {item.total_stock_count}
                            </td>
                            <td className={item.performance_score === 'D' ? 'text-red-600' : ''}>
                                {item.performance_score}
                            </td>
                            <td>
                                <button onClick={() => handleAction(item.sku, 'Edit')}>編集</button>
                                <button onClick={() => handleAction(item.sku, 'Stop')}>停止</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {/* II. 2. データ編集と新規出品への連携 */}
            <div className="mt-4 space-x-4">
                <button>[複製して新規出品]</button>
                <button>[未出品の在庫から新規作成へ]</button>
            </div>
        </div>
    );
};

export default IntegratedListingTable;