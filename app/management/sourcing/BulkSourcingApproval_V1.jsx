import React, { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, CreditCard, ShoppingCart, Lock, Target, Send } from 'lucide-react';

// --- データの構造定義とモックデータ ---
// Phase 1 (受注V2.0) および Phase 4 (財務設定) から連携
const mockOrdersForApproval = [
    {
        id: 'APP-001', marketplace: 'eBay', title: '限定版フィギュア A', price: 15000, costPrice: 80000, profitRate: 0.35, quantity: 1,
        sourcingURL: 'https://sourcing-mall-a.com/item/001', creditCardId: 'AMEX-1234', isApproved: false,
    },
    {
        id: 'APP-002', marketplace: 'Shopee', title: 'ワイヤレスイヤホン X', price: 8000, costPrice: 9000, profitRate: -0.06, quantity: 2,
        sourcingURL: 'https://sourcing-mall-b.com/item/002', creditCardId: 'VISA-5678', isApproved: false,
    },
    {
        id: 'APP-003', marketplace: 'Amazon', title: '高機能ドローン Z', price: 98000, costPrice: 65000, profitRate: 0.25, quantity: 1,
        sourcingURL: 'https://sourcing-mall-c.com/item/003', creditCardId: 'AMEX-1234', isApproved: false,
    },
    {
        id: 'APP-004', marketplace: 'Yahoo!', title: 'ヴィンテージ時計 B', price: 35000, costPrice: 20000, profitRate: 0.30, quantity: 1,
        sourcingURL: 'https://sourcing-mall-a.com/item/004', creditCardId: 'JCB-9012', isApproved: false,
    },
];

const creditCardSettings = {
    'AMEX-1234': { name: 'AMEX Business', limit: 1000000, currentUtilized: 750000 },
    'VISA-5678': { name: 'VISA Platinum', limit: 500000, currentUtilized: 480000 },
    'JCB-9012': { name: 'JCB Gold', limit: 800000, currentUtilized: 100000 },
};

// --- メインコンポーネント ---
const BulkSourcingApprovalV1 = () => {
    const [orders, setOrders] = useState(mockOrdersForApproval);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [cardUtilization, setCardUtilization] = useState(creditCardSettings);

    // 1. 注文選択のハンドラ
    const toggleOrderSelection = (id) => {
        setSelectedOrders(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // 2. 選択された注文の集計とリスク計算 (コアロジック)
    const approvalSummary = useMemo(() => {
        const summary = {
            totalCost: 0,
            totalOrders: selectedOrders.length,
            cardImpact: JSON.parse(JSON.stringify(creditCardSettings)), // クレカ情報をディープコピー
            riskWarnings: [],
        };

        const currentApprovalOrders = orders.filter(o => selectedOrders.includes(o.id));

        currentApprovalOrders.forEach(order => {
            summary.totalCost += order.costPrice;
            const card = summary.cardImpact[order.creditCardId];
            if (card) {
                card.currentUtilized += order.costPrice;
            }

            // A. 赤字リスクチェック
            if (order.profitRate < 0) {
                summary.riskWarnings.push({ id: order.id, type: 'Profit', message: `赤字 (利益率: ${(order.profitRate * 100).toFixed(1)}%)` });
            }
            
            // B. 数量制限チェック (モック)
            if (order.quantity > 1) {
                 summary.riskWarnings.push({ id: order.id, type: 'Quantity', message: `数量が${order.quantity}個。制限オーバーの可能性あり` });
            }
        });

        // C. クレカ上限チェック
        Object.values(summary.cardImpact).forEach(card => {
            if (card.currentUtilized > card.limit) {
                summary.riskWarnings.push({ 
                    type: 'CreditLimit', 
                    message: `${card.name} (${card.limit.toLocaleString()}円) が上限超過！ ${ (card.currentUtilized - card.limit).toLocaleString()}円オーバー`,
                    cardId: card.id,
                });
            }
        });

        return summary;
    }, [selectedOrders, orders]);

    // 3. RPAへ一括送信用アクション
    const sendToRPA = () => {
        if (selectedOrders.length === 0) {
            alert('承認する注文を選択してください。');
            return;
        }

        // クレカ上限超過のリスクがある場合は停止
        if (approvalSummary.riskWarnings.some(w => w.type === 'CreditLimit')) {
            alert('🚨 警告: クレジットカードの上限を超過します。承認を停止しました。');
            return;
        }
        
        // 最終承認
        const approvedOrders = orders.filter(o => selectedOrders.includes(o.id));
        const rpaInput = approvedOrders.map(o => ({ 
            url: o.sourcingURL, 
            cost: o.costPrice, 
            card: o.creditCardId 
        }));

        console.log("RPAに送信されるデータ:", rpaInput);
        alert(`✅ ${approvedOrders.length}件の注文をRPA決済キューに送信しました。\n担当者は、RPAの実行画面で最終承認を行ってください。`);
        
        // 承認済みとしてDBを更新（モック）
        setOrders(prev => prev.filter(o => !selectedOrders.includes(o.id)));
        setSelectedOrders([]);
    };

    // --- UIコンポーネント ---

    // リスクサマリーパネル
    const RiskSummaryPanel = () => (
        <div className="bg-white p-5 rounded-lg shadow-xl border border-gray-200">
            <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-red-600" />
                一括承認リスクサマリー
            </h3>
            
            <div className={`p-3 rounded-md mb-4 ${approvalSummary.riskWarnings.length > 0 ? 'bg-red-100 border-red-500' : 'bg-green-100 border-green-500'} border-l-4`}>
                <div className="flex items-center font-bold">
                    <AlertTriangle className={`w-5 h-5 mr-2 ${approvalSummary.riskWarnings.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
                    <span>{approvalSummary.riskWarnings.length > 0 ? `${approvalSummary.riskWarnings.length}件の警告があります` : 'リスクなし。承認可能'}</span>
                </div>
                {approvalSummary.riskWarnings.map((w, i) => (
                    <p key={i} className="text-sm mt-1 text-red-700 ml-7">{w.id}: {w.message}</p>
                ))}
            </div>

            <div className="space-y-3">
                <DetailRow label="選択注文総数" value={`${approvalSummary.totalOrders} 件`} color="text-indigo-600" />
                <DetailRow label="決済総額（予測）" value={formatCurrency(approvalSummary.totalCost)} color="text-gray-900 font-bold" />
            </div>

            <h4 className="font-semibold text-gray-700 mt-5 mb-3">クレジットカード利用状況（承認後予測）</h4>
            <div className="space-y-3">
                {Object.values(approvalSummary.cardImpact).map(card => {
                    const utilizationRate = (card.currentUtilized / card.limit) * 100;
                    const isOverutilized = utilizationRate > 95; // 厳しめに設定

                    return (
                        <div key={card.name} className="border p-2 rounded-md">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-700">{card.name}</span>
                                <span className={isOverutilized ? 'text-red-600 font-bold' : 'text-gray-900'}>
                                    {formatCurrency(card.currentUtilized)} / {formatCurrency(card.limit)}
                                </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full mt-1">
                                <div 
                                    className={`h-2 rounded-full ${isOverutilized ? 'bg-red-500' : utilizationRate > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                                    style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={sendToRPA}
                disabled={approvalSummary.totalOrders === 0 || approvalSummary.riskWarnings.some(w => w.type === 'CreditLimit')}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center transition duration-150 disabled:bg-gray-400 shadow-lg"
            >
                <Send className="w-5 h-5 mr-2" />
                {approvalSummary.totalOrders}件をRPA決済キューへ送信
            </button>
        </div>
    );

    // 承認テーブル
    const ApprovalTable = () => (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    仕入れ承認待ちリスト
                </h3>
                <label className="flex items-center text-sm text-gray-600">
                    <input 
                        type="checkbox" 
                        checked={selectedOrders.length === orders.length && orders.length > 0} 
                        onChange={() => {
                            if (selectedOrders.length === orders.length) {
                                setSelectedOrders([]);
                            } else {
                                setSelectedOrders(orders.map(o => o.id));
                            }
                        }}
                        className="h-4 w-4 text-green-600 border-gray-300 rounded mr-2"
                    />
                    全選択 ({orders.length}件)
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left w-12">選択</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注文ID / 商品名</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">仕入れコスト</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">予測利益率</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用カード</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map(order => {
                            const isSelected = selectedOrders.includes(order.id);
                            const isRisky = order.profitRate < 0 || order.quantity > 1; // 赤字または数量リスク
                            return (
                                <tr key={order.id} className={`${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleOrderSelection(order.id)}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{order.id} ({order.marketplace})</div>
                                        <div className="text-xs text-gray-500 truncate max-w-xs">{order.title} (x{order.quantity})</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-bold">{formatCurrency(order.costPrice)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`font-bold ${order.profitRate < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {(order.profitRate * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className="flex items-center">
                                            <CreditCard className="w-4 h-4 mr-1 text-gray-500" /> {order.creditCardId}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isRisky && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> 要確認
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const DetailRow = ({ label, value, color }) => (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">{label}</span>
            <span className={`font-semibold ${color}`}>{value}</span>
        </div>
    );

    const formatCurrency = (amount) => `¥${amount.toLocaleString()}`;


    // --- レイアウト ---
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <ShoppingCart className="w-8 h-8 mr-3 text-indigo-700" />
                多モール仕入れ一括承認UI V1.0 <span className="text-xl ml-3 text-gray-500">（Phase 5: 決済ゲートウェイ）</span>
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ApprovalTable />
                </div>
                <div className="lg:col-span-1">
                    <RiskSummaryPanel />
                </div>
            </div>
        </div>
    );
};

export default BulkSourcingApprovalV1;