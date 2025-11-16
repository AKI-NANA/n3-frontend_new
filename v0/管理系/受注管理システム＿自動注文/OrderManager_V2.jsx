import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Filter, ChevronDown, DollarSign, Target, Truck, AlertTriangle, CreditCard } from 'lucide-react';

// --- データの構造定義とモックデータ ---
// Phase 1, 2, 4, 5で定義された全てのクリティカルフィールドを含む
const mockOrders = [
    {
        id: 'ORD-1001', marketplace: 'eBay', title: '限定版フィギュア A', price: 15000, shippingCost: 1000,
        costPrice: 8000, shippingStatus: 'pending', profitRate: 0.35,
        isSourced: true, sourcingArrivalDate: '2025-11-20', creditCardId: 'AMEX-1234', isRedZone: false,
        orderDate: '2025-11-05', customerName: '佐藤 太郎',
    },
    {
        id: 'ORD-1002', marketplace: 'Shopee', title: 'ワイヤレスイヤホン X', price: 8000, shippingCost: 500,
        costPrice: 9000, shippingStatus: 'processing', profitRate: -0.06,
        isSourced: true, sourcingArrivalDate: '2025-11-15', creditCardId: 'VISA-5678', isRedZone: true,
        orderDate: '2025-11-06', customerName: '田中 花子',
    },
    {
        id: 'ORD-1003', marketplace: 'Amazon', title: '高機能ドローン Z', price: 98000, shippingCost: 2000,
        costPrice: 65000, shippingStatus: 'pending', profitRate: 0.25,
        isSourced: false, sourcingArrivalDate: null, creditCardId: null, isRedZone: false,
        orderDate: '2025-11-08', customerName: '山田 健太',
    },
    {
        id: 'ORD-1004', marketplace: 'eBay', title: 'ヴィンテージ時計 B', price: 35000, shippingCost: 1500,
        costPrice: 20000, shippingStatus: 'shipped', profitRate: 0.30,
        isSourced: true, sourcingArrivalDate: '2025-11-10', creditCardId: 'AMEX-1234', isRedZone: false,
        orderDate: '2025-11-01', customerName: '吉田 亜美',
    },
];

const MARKETPLACES = ['eBay', 'Shopee', 'Amazon', 'Yahoo!', 'Mercari'];
const SHIPPING_STATUSES = ['pending', 'processing', 'shipped', 'cancelled'];

// 利益計算ロジック (コア機能)
const calculateProfit = (order) => {
    // 例として、モール手数料15%、決済手数料3%を仮定
    const marketplaceFeeRate = order.marketplace === 'Amazon' ? 0.15 : 0.12;
    const paymentFeeRate = 0.03;

    const netSales = order.price - (order.price * marketplaceFeeRate) - (order.price * paymentFeeRate);
    const profit = netSales - order.costPrice - order.shippingCost;
    const profitRate = profit / order.price;

    return { profit: Math.round(profit), profitRate: profitRate };
};

// ユーティリティ関数
const formatCurrency = (amount) => `¥${amount.toLocaleString()}`;
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('ja-JP') : 'N/A';


// --- メインコンポーネント ---
const OrderManagerV2 = () => {
    const [orders, setOrders] = useState(mockOrders);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filters, setFilters] = useState({
        marketplace: [],
        status: ['pending', 'processing'],
        dateFrom: '2025-11-01',
        dateTo: '2025-11-30',
        minProfitRate: -0.1,
    });

    // フィルターされた注文リスト
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // 1. モールフィルタ
            if (filters.marketplace.length > 0 && !filters.marketplace.includes(order.marketplace)) {
                return false;
            }
            // 2. ステータスフィルタ
            if (filters.status.length > 0 && !filters.status.includes(order.shippingStatus)) {
                return false;
            }
            // 3. 利益率フィルタ (赤字リスク警告用)
            if (order.profitRate < filters.minProfitRate) {
                return false;
            }
            // 4. 日付フィルタ (簡易的な比較)
            if (order.orderDate < filters.dateFrom || order.orderDate > filters.dateTo) {
                return false;
            }

            return true;
        }).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    }, [orders, filters]);


    // フィルターハンドラ
    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            if (Array.isArray(prev[key])) {
                if (prev[key].includes(value)) {
                    return { ...prev, [key]: prev[key].filter(v => v !== value) };
                } else {
                    return { ...prev, [key]: [...prev[key], value] };
                }
            } else {
                return { ...prev, [key]: value };
            }
        });
    };

    // --- UIコンポーネント ---

    // フィルタリングパネル
    const FilterPanel = () => (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
            <h3 className="font-bold text-lg text-gray-800 flex items-center mb-4"><Filter className="w-5 h-5 mr-2 text-blue-600" />フィルタリング</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* モール選択 */}
                <div className="col-span-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">モール</label>
                    <div className="space-y-1">
                        {MARKETPLACES.map(m => (
                            <div key={m} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`m-${m}`}
                                    checked={filters.marketplace.includes(m)}
                                    onChange={() => handleFilterChange('marketplace', m)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                                <label htmlFor={`m-${m}`} className="ml-2 text-sm text-gray-700">{m}</label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ステータス選択 */}
                <div className="col-span-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">ステータス</label>
                    <div className="space-y-1">
                        {SHIPPING_STATUSES.map(s => (
                            <div key={s} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`s-${s}`}
                                    checked={filters.status.includes(s)}
                                    onChange={() => handleFilterChange('status', s)}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                />
                                <label htmlFor={`s-${s}`} className="ml-2 text-sm text-gray-700">{s}</label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 日付範囲 */}
                <div className="col-span-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">注文日（From）</label>
                    <input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
                    <label className="text-sm font-medium text-gray-700 block mt-2 mb-1">注文日（To）</label>
                    <input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                
                {/* 利益率設定 */}
                <div className="col-span-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">最低利益率警告 (${\text{赤字リスク}}$)</label>
                    <input type="number" step="0.01" value={filters.minProfitRate} onChange={(e) => handleFilterChange('minProfitRate', parseFloat(e.target.value))} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
                    <p className="text-xs text-gray-500 mt-2">この値以下の利益率の注文は除外（または警告）されます。</p>
                </div>

            </div>
        </div>
    );

    // 注文リストテーブル
    const OrderList = () => (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800">注文一覧 ({filteredOrders.length}件)</h3>
                <button 
                    onClick={() => setOrders(mockOrders)} // データ更新のモック
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition duration-150"
                >
                    <RefreshCw className="w-4 h-4 mr-1" /> データ更新
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">モール</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注文ID / 商品名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">価格</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">仕入れ値 (確定)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">予想利益率</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">仕入れ/遅延</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map(order => {
                            const { profit, profitRate } = calculateProfit(order);
                            const isRedZone = profitRate < 0.1; // 利益率が低い場合の警告
                            return (
                                <tr 
                                    key={order.id} 
                                    className={`cursor-pointer hover:bg-blue-50 transition duration-150 ${selectedOrder?.id === order.id ? 'bg-blue-100' : ''}`}
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.marketplace === 'eBay' ? 'bg-indigo-100 text-indigo-800' : order.marketplace === 'Amazon' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {order.marketplace}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{order.id}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">{order.title}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(order.price)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.costPrice ? formatCurrency(order.costPrice) : <span className="text-red-600 font-bold">未確定</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                        <span className={`${isRedZone ? 'text-red-600' : 'text-green-600'}`}>
                                            {(profitRate * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className={`flex items-center ${order.isSourced ? 'text-green-600' : 'text-yellow-600'}`}>
                                            <Truck className="w-4 h-4 mr-1" />
                                            {order.isSourced ? '仕入れ済' : '仕入れ待ち'}
                                        </div>
                                        {order.isSourced && order.sourcingArrivalDate && new Date(order.sourcingArrivalDate) > new Date('2025-11-18') && (
                                            <div className="text-xs text-red-500 flex items-center mt-1">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                遅延リスク高
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        <span className={`px-2 inline-flex text-xs leading-5 rounded-full ${order.shippingStatus === 'pending' ? 'bg-red-100 text-red-800' : order.shippingStatus === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                            {order.shippingStatus}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // 注文詳細・AI・アクションパネル
    const DetailPanel = () => {
        if (!selectedOrder) {
            return (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <p className="text-gray-500">左側のリストから注文を選択してください。</p>
                </div>
            );
        }

        const { profit, profitRate } = calculateProfit(selectedOrder);
        const pointEarningMock = Math.round(selectedOrder.costPrice * 0.015); // クレカ1.5%還元を仮定

        return (
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-blue-500">
                <div className={`p-4 font-bold text-white ${profitRate < 0 ? 'bg-red-600' : 'bg-blue-600'} flex justify-between items-center`}>
                    注文詳細: {selectedOrder.id}
                    <span className="text-sm font-normal">注文日: {formatDate(selectedOrder.orderDate)}</span>
                </div>

                <div className="p-6 grid grid-cols-2 gap-4">
                    {/* 利益・財務情報 */}
                    <div className="col-span-1 border-r pr-4">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center text-lg"><DollarSign className="w-5 h-5 mr-2 text-green-600" />利益・財務分析</h4>
                        <div className="space-y-3">
                            <DetailRow label="販売価格" value={formatCurrency(selectedOrder.price)} color="text-blue-600" />
                            <DetailRow label="仕入れ確定値" value={selectedOrder.costPrice ? formatCurrency(selectedOrder.costPrice) : '仕入れ待ち'} color={selectedOrder.costPrice ? 'text-gray-900' : 'text-red-600 font-bold'} />
                            <DetailRow label="予測利益" value={formatCurrency(profit)} color={profit < 0 ? 'text-red-600' : 'text-green-600 font-bold'} />
                            <DetailRow label="予測利益率" value={`${(profitRate * 100).toFixed(1)}%`} color={profitRate < 0 ? 'text-red-600' : 'text-green-600 font-bold'} />
                            <DetailRow label="獲得予定ポイント" value={`${pointEarningMock.toLocaleString()} P`} color="text-yellow-600" icon={<Target className="w-4 h-4" />} />
                            <DetailRow label="決済使用カード" value={selectedOrder.creditCardId || '未決済'} color="text-gray-700" icon={<CreditCard className="w-4 h-4" />} />
                        </div>
                    </div>

                    {/* 仕入れ・出荷情報 */}
                    <div className="col-span-1 pl-4">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center text-lg"><Truck className="w-5 h-5 mr-2 text-indigo-600" />仕入れ・出荷情報</h4>
                        <div className="space-y-3">
                            <DetailRow label="仕入れステータス" value={selectedOrder.isSourced ? '仕入れ済' : '仕入れ待ち'} color={selectedOrder.isSourced ? 'text-green-600' : 'text-red-600 font-bold'} />
                            <DetailRow label="到着予定日" value={formatDate(selectedOrder.sourcingArrivalDate)} color="text-gray-700" />
                            <DetailRow label="出荷期限日" value={formatDate('2025-11-25')} color="text-gray-700" />
                            <DetailRow label="出荷リスク予測" value={selectedOrder.sourcingArrivalDate && new Date(selectedOrder.sourcingArrivalDate) > new Date('2025-11-20') ? '遅延リスク高 (週末考慮)' : '低リスク'} color={selectedOrder.sourcingArrivalDate && new Date(selectedOrder.sourcingArrivalDate) > new Date('2025-11-20') ? 'text-red-600 font-bold' : 'text-green-600'} />
                        </div>
                    </div>
                </div>

                {/* アクション/AIボタン */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex space-x-3">
                    <button 
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-150 shadow-md"
                        onClick={() => alert(`仕入れ承認キューに登録: ${selectedOrder.id}`)}
                        disabled={selectedOrder.isSourced}
                    >
                        Phase 5へ送信 (仕入れ承認へ)
                    </button>
                    <button 
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition duration-150 shadow-md"
                        onClick={() => alert(`AIトラブル分析実行: ${selectedOrder.id}`)}
                    >
                        AIトラブル分析
                    </button>
                    <button 
                        className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded transition duration-150 shadow-md"
                        onClick={() => alert(`AI顧客メール作成: ${selectedOrder.id}`)}
                    >
                        AI顧客メール作成
                    </button>
                </div>
            </div>
        );
    };

    const DetailRow = ({ label, value, color, icon }) => (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center">
                {icon}
                {label}
            </span>
            <span className={`font-semibold ${color}`}>{value}</span>
        </div>
    );

    // --- レイアウト ---
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <Filter className="w-8 h-8 mr-3 text-blue-700" />
                受注管理システム V2.0 <span className="text-xl ml-3 text-gray-500">（データ基盤）</span>
            </h1>

            <FilterPanel />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <OrderList />
                </div>
                <div className="lg:col-span-1">
                    <DetailPanel />
                </div>
            </div>
        </div>
    );
};

export default OrderManagerV2;