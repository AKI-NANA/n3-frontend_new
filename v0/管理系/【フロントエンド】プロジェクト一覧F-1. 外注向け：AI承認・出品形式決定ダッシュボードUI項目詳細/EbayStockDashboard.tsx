// /components/inventory/EbayStockDashboard.tsx

import React from 'react';

// 💡 B-3で定義された型の一部を流用
interface StockItem {
    sku: string;
    current_stock_count: number;
    median_price: number;
    next_check_time: string;
    is_dangerous: boolean; // 在庫切れアラート用フラグ
}

// 💡 APIから取得するEbay制限データ
interface EbayLimit {
    category: string;
    currentCount: number;
    limit: number;
    isException: boolean; // 50,000件枠など
}

const DUMMY_LIMITS: EbayLimit[] = [
    { category: 'Toys & Hobbies', currentCount: 8500, limit: 10000, isException: false },
    { category: 'Collectibles', currentCount: 200, limit: 1000, isException: false },
    { category: 'Electronics', currentCount: 35000, limit: 50000, isException: true }, // 例外枠
];

const DUMMY_STOCK: StockItem[] = [
    { sku: 'SKU-001', current_stock_count: 50, median_price: 15.99, next_check_time: '10:30', is_dangerous: false },
    { sku: 'SKU-002', current_stock_count: 3, median_price: 9.99, next_check_time: '10:40', is_dangerous: true }, // 在庫危険水準
    { sku: 'SKU-003', current_stock_count: 0, median_price: 22.50, next_check_time: '11:00', is_dangerous: true }, // 在庫切れ
];


export default function EbayStockDashboard() {
    
    // (１) Ebayカテゴリ制限管理
    const totalLimit = DUMMY_LIMITS.filter(l => !l.isException).reduce((sum, l) => sum + l.limit, 0);
    const currentTotal = DUMMY_LIMITS.filter(l => !l.isException).reduce((sum, l) => sum + l.currentCount, 0);
    const totalProgress = (currentTotal / totalLimit) * 100;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6">📊 モール別出品制限＆在庫管理</h1>

            {/* (１)a 枠表示 */}
            <section className="mb-8 p-4 border rounded-lg bg-blue-50">
                <h2 className="text-xl font-semibold mb-3 text-blue-800">Ebay 全体出品枠 (通常枠)</h2>
                <p className="text-sm mb-2">現在の出品数: **{currentTotal.toLocaleString()}** / {totalLimit.toLocaleString()} 件</p>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                        className={`h-4 rounded-full ${totalProgress > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
                        style={{ width: `${totalProgress}%` }}
                    ></div>
                </div>
            </section>

            {/* (１)b カテゴリー内訳 & (１)c 例外表示 */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">カテゴリー別 許容枠内訳</h2>
                <div className="space-y-4">
                    {DUMMY_LIMITS.map((limit) => (
                        <div key={limit.category} className={`p-3 rounded-md ${limit.isException ? 'bg-yellow-100 border border-yellow-500' : 'bg-white border'}`}>
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{limit.category}</span>
                                <span className={`text-sm ${limit.isException ? 'text-yellow-700 font-bold' : 'text-gray-600'}`}>
                                    {limit.isException ? '✨ 例外枠' : `残枠: ${(limit.limit - limit.currentCount).toLocaleString()} 件`}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">出品中: {limit.currentCount.toLocaleString()} / {limit.limit.toLocaleString()} 件</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* (２)a 一括登録エリア */}
            <section className="mb-8 p-4 border rounded-lg">
                <h2 className="text-xl font-semibold mb-3">📦 参照URL 一括登録</h2>
                <textarea
                    placeholder="URLを改行区切りでペースト..."
                    rows={4}
                    className="w-full p-2 border rounded-md"
                ></textarea>
                <button className="mt-2 py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">一括登録</button>
            </section>
            
            {/* (２)b & (２)c 在庫状況リスト */}
            <section>
                <h2 className="text-xl font-semibold mb-3">在庫状況サマリー</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">在庫数</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最安値</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">次回チェック時刻</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {DUMMY_STOCK.map((item) => (
                                <tr key={item.sku} className={item.is_dangerous ? 'bg-red-100 border-l-4 border-red-600' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.current_stock_count === 0 ? <span className="text-red-600 font-bold">在庫切れ</span> : item.current_stock_count}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.median_price.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.next_check_time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}