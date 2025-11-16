import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, setDoc, serverTimestamp, query } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// ⚠️ 【重要】以下の定数をOrderManager_V2.jsxと同じ設定にしてください。
const __app_id = "order_manager_v2"; // OrderManagerと同一ID
const __firebase_config = {
    apiKey: "",
    authDomain: "",
    projectId: "demo-order-manager",
    // ... 他のフィールドもOrderManagerと同期
};
const __initial_auth_token = "demo_token_order";

// Firebase App Initialization
const app = initializeApp(__firebase_config);
const db = getFirestore(app);
const auth = getAuth(app);

// ユーティリティ関数
const getPrivateCollectionRef = (userId, collectionName) => {
    return collection(db, `artifacts/${__app_id}/users/${userId}/${collectionName}`);
};

// ------------------------------------
// UI/データ定数
// ------------------------------------
const QUEUE_STATUSES = {
    pending: { title: '処理待ち', color: 'border-yellow-500 bg-yellow-50', icon: 'fas fa-clock' },
    processing: { title: '梱包中', color: 'border-indigo-500 bg-indigo-50', icon: 'fas fa-box' },
    ready: { title: '出荷準備完了', color: 'border-green-500 bg-green-50', icon: 'fas fa-check-circle' },
    shipped: { title: '出荷済み', color: 'border-gray-300 bg-gray-100', icon: 'fas fa-truck' },
};

const getStatusColor = (status) => QUEUE_STATUSES[status]?.color || QUEUE_STATUSES.pending.color;

const getMallIcon = (mall) => {
    switch(mall) {
        case 'eBay': return 'fab fa-ebay text-blue-800';
        case 'Amazon': return 'fab fa-amazon text-orange-600';
        case 'Shopee': return 'fas fa-store text-red-600';
        default: return 'fas fa-globe text-gray-500';
    }
};

const DUMMY_ORDERS = [
    { id: 'EB001-20241213', mall: 'eBay', product: 'Switch Pro Controller', totalAmount: 8500, deadline: '2025-11-15', shippingStatus: 'pending', recipient: '田中 太郎', address: '東京都渋谷区...', trackingNumber: '' },
    { id: 'CP005-20241214', mall: 'Coupang', product: 'Bluetooth Earbuds', totalAmount: 4800, deadline: '2025-11-14', shippingStatus: 'pending', recipient: '鈴木 花子', address: '大阪府大阪市...', trackingNumber: '' },
    { id: 'SH010-20241215', mall: 'Shopee', product: 'Anime Figure', totalAmount: 12000, deadline: '2025-11-16', shippingStatus: 'processing', recipient: '佐藤 健', address: '台湾 台北市...', trackingNumber: '' },
    { id: 'AM020-20241216', mall: 'Amazon', product: 'Camera Lens', totalAmount: 80000, deadline: '2025-11-17', shippingStatus: 'processing', recipient: '山田 優', address: 'ドイツ ベルリン...', trackingNumber: 'AM123456789' },
    { id: 'QO030-20241217', mall: 'Qoo10', product: 'Cosmetic Set', totalAmount: 6000, deadline: '2025-11-13', shippingStatus: 'ready', recipient: '中村 哲也', address: '愛知県名古屋市...', trackingNumber: 'QO987654321' },
];

// ------------------------------------
// メインアプリケーションコンポーネント
// ------------------------------------
const ShippingManager = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState(DUMMY_ORDERS); // 全ての受注データ
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [trackingInput, setTrackingInput] = useState('');
    const [message, setMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // ------------------------------------
    // 認証とデータ購読 (モック)
    // ------------------------------------
    useEffect(() => {
        // 認証ロジックはOrderManagerと共通
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // 📝 実際にはFirestoreからordersコレクションを購読する
                // const ref = getPrivateCollectionRef(currentUser.uid, 'orders');
                // onSnapshot(query(ref, where('shippingStatus', 'in', ['pending', 'processing', 'ready'])), (snapshot) => { ... });
            } else {
                signInWithCustomToken(auth, __initial_auth_token)
                    .catch(() => signInAnonymously(auth));
            }
        });
        return () => unsubscribeAuth();
    }, []);
    
    // ------------------------------------
    // タスク A: 受注データ連携とキュー管理
    // ------------------------------------
    const queuedOrders = useMemo(() => {
        const queues = { pending: [], processing: [], ready: [] };
        orders.forEach(order => {
            if (order.shippingStatus in queues) {
                queues[order.shippingStatus].push(order);
            }
        });
        return queues;
    }, [orders]);

    // ------------------------------------
    // タスク B: ドラッグ＆ドロップとステータス更新
    // ------------------------------------
    
    const updateOrderStatus = useCallback(async (orderId, newStatus) => {
        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) return;
        
        // 1. UIの更新
        setOrders(prev => prev.map(o => 
            o.id === orderId ? { ...o, shippingStatus: newStatus } : o
        ));
        
        // 2. Firestore更新のモック (実際のコードではここでsetDocを行う)
        // const docRef = doc(getPrivateCollectionRef(user.uid, 'orders'), orderId);
        // await setDoc(docRef, { shippingStatus: newStatus, updatedAt: serverTimestamp() }, { merge: true });
        
        setMessage(`注文 ${orderId} のステータスを "${QUEUE_STATUSES[newStatus].title}" に更新しました。`);
        
        // ステータス更新後の処理
        if (newStatus === 'shipped' && selectedOrder?.id === orderId) {
            setSelectedOrder(null);
        }
    }, [orders, selectedOrder, user]);
    
    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData("orderId");
        if (orderId) {
            updateOrderStatus(orderId, targetStatus);
        }
    };

    const handleDragStart = (e, orderId) => {
        e.dataTransfer.setData("orderId", orderId);
        e.currentTarget.classList.add('dragging-item');
    };
    
    const handleOrderSelect = (order) => {
        setSelectedOrder(order);
        setTrackingInput(order.trackingNumber || ''); // 追跡番号を詳細パネルにセット
    };

    // ------------------------------------
    // タスク C: 出荷詳細パネルのアクション
    // ------------------------------------
    
    // 追跡番号のFirestore保存モック
    const saveTrackingNumber = async () => {
        if (!selectedOrder || !trackingInput) {
            setMessage('注文を選択し、追跡番号を入力してください。');
            return;
        }
        
        // UI更新
        setOrders(prev => prev.map(o => 
            o.id === selectedOrder.id ? { ...o, trackingNumber: trackingInput } : o
        ));
        setSelectedOrder(prev => ({ ...prev, trackingNumber: trackingInput }));

        // Firestore更新モック
        // const docRef = doc(getPrivateCollectionRef(user.uid, 'orders'), selectedOrder.id);
        // await setDoc(docRef, { trackingNumber: trackingInput, updatedAt: serverTimestamp() }, { merge: true });

        setMessage(`注文 ${selectedOrder.id} の追跡番号を保存しました: ${trackingInput}`);
    };

    // 伝票生成モック
    const generateLabel = () => {
        if (!selectedOrder) {
            setMessage('伝票を生成する注文を選択してください。');
            return;
        }
        if (!selectedOrder.trackingNumber && !trackingInput) {
            setMessage('⚠️ 伝票生成には追跡番号が必要です。入力・保存してください。', 'warning');
            return;
        }

        openModal('伝票印刷プレビュー', (
            <div className="space-y-3">
                <p className="text-sm">伝票が正しく生成されました。</p>
                <div className="p-4 bg-gray-100 border rounded text-xs">
                    [伝票イメージモック]<br/>
                    配送先: {selectedOrder.recipient}<br/>
                    追跡番号: {selectedOrder.trackingNumber || trackingInput}
                </div>
                <button className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700 w-full">伝票を印刷</button>
            </div>
        ));
    };
    
    // 出荷完了ボタン
    const handleCompleteShipping = () => {
        if (!selectedOrder) {
            setMessage('出荷完了にする注文を選択してください。');
            return;
        }
        if (!selectedOrder.trackingNumber && !trackingInput) {
            setMessage('⚠️ 出荷完了の前に、追跡番号を入力・保存してください。');
            return;
        }
        updateOrderStatus(selectedOrder.id, 'shipped');
    };
    
    // ------------------------------------
    // UI/コンポーネント
    // ------------------------------------

    const openModal = (title, body) => {
        setModalContent({ title, body });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent({ title: '', body: null });
    };

    const QueueItem = ({ order }) => {
        const isSelected = selectedOrder?.id === order.id;
        const remainingDays = Math.ceil((new Date(order.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const deadlineColor = remainingDays <= 2 ? 'text-red-600 font-bold' : 'text-gray-500';

        return (
            <div 
                className={`queue-item p-3 mb-3 bg-white border-l-4 rounded shadow-sm cursor-pointer transition ${getStatusColor(order.shippingStatus)} ${isSelected ? 'border-r-4 border-l-purple-700 bg-purple-50 shadow-md' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, order.id)}
                onClick={() => handleOrderSelect(order)}
            >
                <div className="flex justify-between items-start">
                    <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <i className={getMallIcon(order.mall)}></i>{order.mall} | {order.id}
                    </div>
                    <div className={`text-xs ${deadlineColor}`}>
                        <i className="fas fa-calendar-alt mr-1"></i>期限: {remainingDays}日
                    </div>
                </div>
                <div className="text-sm font-medium mt-1">{order.product.substring(0, 30)}...</div>
                <div className="text-xs text-gray-500 mt-1">¥{order.totalAmount.toLocaleString()}</div>
            </div>
        );
    };
    
    const ShippingQueue = ({ statusKey }) => {
        const queueData = QUEUE_STATUSES[statusKey];
        const items = queuedOrders[statusKey];
        
        return (
            <div 
                className={`shipping-queue flex-1 min-h-[50vh] p-3 border rounded-lg ${queueData.color}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, statusKey)}
            >
                <h3 className="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2">
                    <i className={queueData.icon}></i> {queueData.title} ({items.length})
                </h3>
                <div className="queue-list">
                    {items.map(order => <QueueItem key={order.id} order={order} />)}
                    {items.length === 0 && <div className="text-center text-gray-400 text-sm mt-10">このキューには注文がありません。</div>}
                </div>
            </div>
        );
    };


    return (
        <div className="p-2 min-h-screen bg-gray-50">
            <header className="mb-2 p-3 bg-white shadow flex justify-between items-center rounded-lg">
                <h1 className="text-xl font-extrabold text-purple-700 flex items-center gap-2">
                    <i className="fas fa-shipping-fast"></i> 出荷管理システム
                </h1>
                <div className="flex items-center space-x-3">
                    {message && <span className="text-sm text-indigo-600">{message}</span>}
                    <span className="text-sm text-gray-600">外注スタッフUI</span>
                    <button onClick={() => console.log('設定画面へ')} className="bg-gray-200 text-gray-700 p-1 rounded hover:bg-gray-300 text-xs">
                        <i className="fas fa-cog"></i>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-[1fr_300px] gap-2 items-start h-[calc(100vh-60px)]">
                
                {/* 1列目: 出荷キューボード (ドラッグ＆ドロップエリア) */}
                <div className="p-3 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="mb-4 flex gap-4">
                        <button className="py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"><i className="fas fa-tags mr-1"></i> 一括伝票発行</button>
                        <button className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"><i className="fas fa-check-double mr-1"></i> 一括出荷完了</button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 flex-1 overflow-auto">
                        <ShippingQueue statusKey="pending" />
                        <ShippingQueue statusKey="processing" />
                        <ShippingQueue statusKey="ready" />
                    </div>
                </div>

                {/* 2列目: 出荷詳細・アクションパネル */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full">
                    <div className="p-4 bg-purple-600 text-white rounded-t-lg">
                        <h2 className="text-base font-semibold">
                            出荷詳細
                            {selectedOrder && <span className="ml-2 text-xs font-normal">({selectedOrder.id})</span>}
                        </h2>
                    </div>

                    {!selectedOrder ? (
                        <div className="detail-content text-center pt-20 text-gray-500">
                            <i className="fas fa-box-open text-4xl mb-3"></i>
                            <p>キューから注文を選択してください。</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b">
                                <h3 className="text-lg font-bold text-gray-800">{selectedOrder.product}</h3>
                                <p className="text-sm text-gray-600">{selectedOrder.recipient}様 / ¥{selectedOrder.totalAmount.toLocaleString()}</p>
                            </div>
                            
                            <div className="p-4 detail-content overflow-y-auto flex-1">
                                {/* タスク C: スキャン機能UI */}
                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-gray-600 block mb-1">🔍 バーコードスキャン (ID検索)</label>
                                    <input type="text" placeholder="注文IDまたは商品バーコード" className="w-full p-2 border rounded text-sm"/>
                                </div>

                                <div className="detail-section mb-4">
                                    <h4 className="text-sm font-semibold text-gray-700 pb-1 border-b mb-2">配送情報</h4>
                                    <p className="text-xs text-gray-500 mb-2">宛名: {selectedOrder.recipient}</p>
                                    <p className="text-xs text-gray-500 mb-2">住所: {selectedOrder.address}</p>
                                    <p className="text-xs text-red-500 font-bold">出荷期限: {selectedOrder.deadline}</p>
                                </div>
                                
                                {/* タスク C: 追跡情報入力 */}
                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-gray-600 block mb-1">追跡番号</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={trackingInput} 
                                            onChange={(e) => setTrackingInput(e.target.value)} 
                                            placeholder="追跡番号を入力" 
                                            className="flex-1 p-2 border rounded text-sm"
                                        />
                                        <button onClick={saveTrackingNumber} className="py-2 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存</button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t space-y-2">
                                {/* タスク C: アクションボタン */}
                                <button onClick={generateLabel} className="w-full py-2 px-3 rounded text-white font-medium flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 transition">
                                    <i className="fas fa-print"></i> 伝票生成
                                </button>
                                <button onClick={handleCompleteShipping} className="w-full py-2 px-3 rounded text-white font-medium flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 transition">
                                    <i className="fas fa-check-circle"></i> 出荷完了
                                </button>
                                <button onClick={() => console.log('顧客通知')} className="w-full py-2 px-3 rounded border text-gray-700 font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition">
                                    <i className="fas fa-bell"></i> 顧客に追跡番号を通知
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            {/* モーダル */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">{modalContent.title}</h3>
                            <button className="text-2xl text-gray-500 hover:text-gray-700" onClick={closeModal}>&times;</button>
                        </div>
                        {modalContent.body}
                        <button onClick={closeModal} className="mt-4 bg-gray-300 p-2 rounded hover:bg-gray-400 text-sm">閉じる</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingManager;