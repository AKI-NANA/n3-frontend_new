import React, { useState, useMemo } from 'react';
import { Truck, Clock, AlertTriangle, Package, CheckCircle } from 'lucide-react';

// --- データの構造定義とモックデータ ---
// 受注管理V2.0から取得されるデータをシミュレート
const mockShippingOrders = [
    {
        id: 'ORD-1001', title: '限定版フィギュア A', marketplace: 'eBay', shippingStatus: 'pending',
        sourcingArrivalDate: '2025-11-20', shipmentDeadline: '2025-11-22', customerName: '佐藤 太郎', trackingNumber: null,
    },
    {
        id: 'ORD-1002', title: 'ワイヤレスイヤホン X', marketplace: 'Shopee', shippingStatus: 'processing',
        sourcingArrivalDate: '2025-11-15', shipmentDeadline: '2025-11-20', customerName: '田中 花子', trackingNumber: 'SHP-00123',
    },
    {
        id: 'ORD-1003', title: '高機能ドローン Z', marketplace: 'Amazon', shippingStatus: 'pending',
        sourcingArrivalDate: null, shipmentDeadline: '2025-11-25', customerName: '山田 健太', trackingNumber: null,
    },
    {
        id: 'ORD-1005', title: 'ポータブル充電器 P', marketplace: 'eBay', shippingStatus: 'processing',
        sourcingArrivalDate: '2025-11-21', shipmentDeadline: '2025-11-23', customerName: '中村 哲也', trackingNumber: null,
    },
];

const SHIPPING_QUEUES = {
    pending: { title: '1. 処理待ち (Pending)', icon: <Clock className="w-5 h-5 text-yellow-600" />, color: 'bg-yellow-100' },
    processing: { title: '2. 梱包中 (Processing)', icon: <Package className="w-5 h-5 text-blue-600" />, color: 'bg-blue-100' },
    ready: { title: '3. 出荷準備完了 (Ready to Ship)', icon: <CheckCircle className="w-5 h-5 text-green-600" />, color: 'bg-green-100' },
};

// ユーティリティ関数
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '未定';
const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// 出荷遅延リスク計算ロジック
const getShippingRisk = (order) => {
    if (!order.sourcingArrivalDate) {
        return { risk: '仕入れ待ち', color: 'text-red-600' };
    }

    const arrivalDate = new Date(order.sourcingArrivalDate);
    const deadline = new Date(order.shipmentDeadline);
    const today = new Date();

    // 1. 仕入れ遅延リスク
    if (arrivalDate > deadline) {
        return { risk: '遅延確定 (仕入れ遅れ)', color: 'text-red-700 font-bold' };
    }
    
    // 2. 週末・休日リスク (ここでは週末のみ考慮)
    // 到着予定日が金曜日または土曜日の場合、月曜日の出荷になるためリスク高
    if (arrivalDate.getDay() === 5 || arrivalDate.getDay() === 6) { // 5=金, 6=土
        // 出荷期限が月曜日または火曜日と近い場合
        const daysToDeadline = (deadline.getTime() - arrivalDate.getTime()) / (1000 * 3600 * 24);
        if (daysToDeadline <= 3) {
            return { risk: '週末リスク (要確認)', color: 'text-orange-600' };
        }
    }
    
    // 3. 一般的な期限迫り
    const daysUntilDeadline = (deadline.getTime() - today.getTime()) / (1000 * 3600 * 24);
    if (daysUntilDeadline < 2 && daysUntilDeadline >= 0 && order.shippingStatus !== 'ready') {
        return { risk: '期限迫る (2日以内)', color: 'text-yellow-600' };
    }

    return { risk: '低リスク', color: 'text-green-600' };
};


// --- メインコンポーネント ---
const ShippingManagerV1 = () => {
    const [orders, setOrders] = useState(mockShippingOrders);
    const [selectedOrder, setSelectedOrder] = useState(mockShippingOrders[0]);

    // 注文をキュー別に振り分ける
    const queues = useMemo(() => {
        const initial = { pending: [], processing: [], ready: [] };
        orders.forEach(order => {
            if (initial[order.shippingStatus]) {
                initial[order.shippingStatus].push(order);
            }
        });
        return initial;
    }, [orders]);

    // D&D処理 (モック)
    const handleDragStart = (e, orderId) => {
        e.dataTransfer.setData('orderId', orderId);
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('opacity-50');
    };

    const handleDrop = (e, newStatus) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData('orderId');
        
        // DB更新をシミュレート
        setOrders(prevOrders => prevOrders.map(order => 
            order.id === orderId ? { ...order, shippingStatus: newStatus } : order
        ));

        // ドロップされた注文を詳細表示
        const droppedOrder = orders.find(o => o.id === orderId);
        if (droppedOrder) {
             setSelectedOrder({ ...droppedOrder, shippingStatus: newStatus });
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // ドロップを許可するために必須
    };
    
    // 出荷完了処理
    const completeShipping = () => {
        if (!selectedOrder || selectedOrder.shippingStatus !== 'ready') return;
        
        // 追跡番号の有無確認など
        if (!selectedOrder.trackingNumber) {
            alert('追跡番号を入力してください。');
            return;
        }

        // DB更新をシミュレート: shippedステータスに更新し、キューから削除
        setOrders(prevOrders => prevOrders.filter(order => order.id !== selectedOrder.id));
        alert(`注文 ${selectedOrder.id} を出荷完了としてマークしました。DBを更新し、顧客に通知します。`);
        setSelectedOrder(null);
    };

    // --- UIコンポーネント ---

    // 出荷キューのカード
    const ShippingCard = ({ order }) => {
        const { risk, color } = getShippingRisk(order);
        
        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, order.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedOrder(order)}
                className={`p-3 mb-3 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition duration-150 ${selectedOrder?.id === order.id ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
            >
                <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-gray-800 truncate">{order.title}</p>
                    <span className="text-xs font-medium text-gray-500">{order.marketplace}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">期限: {formatDate(order.shipmentDeadline)}</div>
                <div className="flex items-center mt-2">
                    <AlertTriangle className={`w-3 h-3 mr-1 ${color.replace('text-', 'text-')}`} />
                    <span className={`text-xs font-semibold ${color}`}>{risk}</span>
                </div>
            </div>
        );
    };

    // 出荷キューのレーン
    const ShippingLane = ({ status, data }) => {
        const queueInfo = SHIPPING_QUEUES[status];

        return (
            <div
                className="flex flex-col bg-gray-50 rounded-lg shadow-inner p-4 h-full min-h-[500px]"
                onDrop={(e) => handleDrop(e, status)}
                onDragOver={handleDragOver}
            >
                <div className={`p-3 rounded-md mb-4 ${queueInfo.color} flex items-center justify-between`}>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        {queueInfo.icon}
                        <span className="ml-2">{queueInfo.title}</span>
                    </h3>
                    <span className="bg-white px-3 py-1 text-sm font-bold rounded-full text-gray-700 shadow-sm">{data.length}</span>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    {data.map(order => <ShippingCard key={order.id} order={order} />)}
                </div>
            </div>
        );
    };
    
    // 出荷詳細パネル
    const DetailPanel = () => {
        const [tracking, setTracking] = useState(selectedOrder?.trackingNumber || '');

        React.useEffect(() => {
            setTracking(selectedOrder?.trackingNumber || '');
        }, [selectedOrder]);

        if (!selectedOrder) {
            return (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <p className="text-gray-500">リストから注文を選択してください。</p>
                </div>
            );
        }

        const { risk, color } = getShippingRisk(selectedOrder);

        return (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-purple-500">
                <div className="p-4 bg-purple-600 text-white font-bold flex justify-between items-center">
                    出荷アクション: {selectedOrder.id}
                </div>

                <div className="p-6">
                    <h4 className="text-xl font-bold text-gray-800 mb-4">{selectedOrder.title}</h4>
                    
                    <div className="mb-4 space-y-2">
                        <DetailRow label="顧客名" value={selectedOrder.customerName} />
                        <DetailRow label="仕入れ予定日" value={formatDate(selectedOrder.sourcingArrivalDate)} />
                        <DetailRow label="出荷期限" value={formatDate(selectedOrder.shipmentDeadline)} />
                        <DetailRow label="現在のステータス" value={selectedOrder.shippingStatus} color="text-indigo-600 font-bold" />
                        <div className="flex justify-between items-center py-1">
                            <span className="text-sm font-medium text-gray-500">遅延リスク</span>
                            <span className={`text-sm font-semibold ${color}`}>{risk}</span>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label htmlFor="tracking" className="block text-sm font-medium text-gray-700 mb-2">追跡番号</label>
                        <input
                            id="tracking"
                            type="text"
                            value={tracking}
                            onChange={(e) => setTracking(e.target.value)}
                            placeholder="トラッキング番号を入力..."
                            className="w-full border-gray-300 rounded-md shadow-sm p-2 mb-4"
                        />

                        {selectedOrder.shippingStatus !== 'shipped' && (
                            <div className="space-y-3">
                                <button 
                                    onClick={() => alert(`伝票を生成 (追跡番号: ${tracking})`)}
                                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded transition duration-150 shadow-md flex items-center justify-center"
                                >
                                    <Package className="w-4 h-4 mr-2" /> 伝票生成 & プレビュー
                                </button>
                                <button 
                                    onClick={completeShipping}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded transition duration-150 shadow-md"
                                    disabled={selectedOrder.shippingStatus !== 'ready' || !tracking}
                                >
                                    出荷完了 & DB更新
                                </button>
                                <p className="text-xs text-gray-500 pt-2">※出荷完了は「出荷準備完了」キューでのみ実行可能です。</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const DetailRow = ({ label, value, color }) => (
        <div className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
            <span className="text-sm font-medium text-gray-500">{label}</span>
            <span className={`text-sm font-semibold ${color || 'text-gray-900'}`}>{value}</span>
        </div>
    );

    // --- レイアウト ---
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <Truck className="w-8 h-8 mr-3 text-purple-700" />
                出荷管理システム V1.0 <span className="text-xl ml-3 text-gray-500">（ワークフロー自動化）</span>
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                    {Object.entries(SHIPPING_QUEUES).map(([status, info]) => (
                        <ShippingLane key={status} status={status} data={queues[status]} />
                    ))}
                </div>
                <div className="lg:col-span-1">
                    <DetailPanel />
                </div>
            </div>
        </div>
    );
};

export default ShippingManagerV1;