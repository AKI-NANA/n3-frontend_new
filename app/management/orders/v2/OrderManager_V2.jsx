import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, setDoc, serverTimestamp, query } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// ⚠️ 【重要】以下の定数を実際のAPIキーとFirebase設定に置き換えてください。
// 環境変数から読み込むか、直接設定してください。
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""; // Gemini API Key
const GEMINI_MODEL = "gemini-2.0-flash-exp"; // 最新の高速モデル
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const __app_id = "order_manager_v2";
const __firebase_config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-order-manager",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
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

// Gemini API呼び出し関数
const callGeminiAPI = async (prompt) => {
    if (!API_KEY) {
        throw new Error('Gemini APIキーが設定されていません。環境変数 NEXT_PUBLIC_GEMINI_API_KEY を設定してください。');
    }

    try {
        const response = await fetch(
            `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('Gemini APIから有効なレスポンスが返されませんでした。');
        }

        return text;
    } catch (error) {
        console.error('Gemini API呼び出しエラー:', error);
        throw error;
    }
};

// ------------------------------------
// モックデータと設定
// ------------------------------------

// タスク B: モールフィルターの拡張を反映
const ALL_MALLS = ['eBay', 'Shopee', 'Coupang', 'BUYMA', 'Qoo10', 'Amazon', 'Shopify', 'メルカリ', 'その他'];
const ALL_STATUSES = ['new', 'pending', 'processing', 'shipped', 'delivered', 'canceled'];

// V2.0拡張データモデルを反映したサンプルデータ
const initialSampleOrders = [
    {
        id: 'EB001-20241213', date: '2024-12-13 14:30', mall: 'eBay', product: 'Switch Pro Controller', sku: 'NSW-PRO-001',
        customerName: '山田 太郎',
        totalAmount: 8500, costPrice: 6500, expectedProfit: 2000, profitRate: 23.5,
        paymentStatus: 'paid', shippingStatus: 'pending', aiScore: 85, country: 'US', deadline: '2024-12-20',
        imageUrl: "https://via.placeholder.com/40/1e40af/ffffff?text=E"
    },
    {
        id: 'CP005-20241214', date: '2024-12-14 09:10', mall: 'Coupang', product: 'Bluetooth Earbuds', sku: 'BT-EB-005',
        customerName: '佐藤 花子',
        totalAmount: 4800, costPrice: 4000, expectedProfit: 800, profitRate: 16.7,
        paymentStatus: 'paid', shippingStatus: 'shipped', aiScore: 68, country: 'KR', deadline: '2024-12-17',
        imageUrl: "https://via.placeholder.com/40/60a5fa/ffffff?text=C"
    },
    {
        id: 'SH010-20241215', date: '2024-12-15 20:50', mall: 'Shopee', product: 'Anime Figure', sku: 'AF-FIG-001',
        customerName: '鈴木 一郎',
        totalAmount: 12000, costPrice: 9000, expectedProfit: 3000, profitRate: 25.0,
        paymentStatus: 'pending', shippingStatus: 'new', aiScore: 92, country: 'TW', deadline: '2024-12-22',
        imageUrl: "https://via.placeholder.com/40/dc2626/ffffff?text=S"
    },
    {
        id: 'AM020-20241216', date: '2024-12-16 11:00', mall: 'Amazon', product: 'DSLR Camera Lens', sku: 'LENS-DSLR-002',
        customerName: '田中 美咲',
        totalAmount: 80000, costPrice: 75000, expectedProfit: 5000, profitRate: 6.25,
        paymentStatus: 'paid', shippingStatus: 'processing', aiScore: 45, country: 'DE', deadline: '2024-12-25',
        imageUrl: "https://via.placeholder.com/40/f97316/ffffff?text=A"
    },
];

const getStatusStyles = (status) => {
    switch (status) {
        case 'new': return 'bg-yellow-100 text-yellow-800';
        case 'paid': return 'bg-blue-100 text-blue-800';
        case 'pending': return 'bg-orange-100 text-orange-800';
        case 'processing': return 'bg-indigo-100 text-indigo-800';
        case 'shipped': return 'bg-green-100 text-green-800';
        case 'delivered': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getAiScoreStyles = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 score-high';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 score-medium';
    return 'bg-red-100 text-red-800 score-low';
};

const getMallIcon = (mall) => {
    switch(mall) {
        case 'eBay': return 'fab fa-ebay text-blue-800';
        case 'Amazon': return 'fab fa-amazon text-orange-600';
        case 'Shopee': return 'fas fa-store text-red-600';
        case 'Coupang': return 'fas fa-box-open text-sky-600';
        case 'BUYMA': return 'fas fa-shopping-bag text-indigo-600';
        case 'Qoo10': return 'fas fa-tag text-lime-600';
        case 'メルカリ': return 'fas fa-heart text-pink-600';
        default: return 'fas fa-globe text-gray-500';
    }
};

// ------------------------------------
// メインアプリケーションコンポーネント
// ------------------------------------

const OrderManager_V2 = () => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('staff'); // 'manager' | 'staff'
    const [activeTab, setActiveTab] = useState('orders');
    const [message, setMessage] = useState('');
    const [orders, setOrders] = useState(initialSampleOrders); // モックデータから開始
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', body: null });
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // タスク B: フィルタリングステート
    const [filters, setFilters] = useState({
        search: '',
        channel: '',
        status: '',
        dateFrom: new Date().toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0]
    });
    const [sort, setSort] = useState({ key: 'date', direction: 'desc' });
    
    const isAuthenticated = !!user;
    const isManager = userRole === 'manager';

    // ------------------------------------
    // 認証とデータ購読 (モック)
    // ------------------------------------
    useEffect(() => {
        // 認証ロジックはV1と同様（簡略化）
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setUserRole(currentUser.uid.endsWith('5') ? 'manager' : 'staff'); // デモ用
                
                // 📝 Firestoreリスナーは今回はモックデータのstateで代替
                // const ref = getPrivateCollectionRef(currentUser.uid, 'orders');
                // onSnapshot(query(ref), (snapshot) => { ... setOrders(...) });
                
            } else {
                signInWithCustomToken(auth, __initial_auth_token)
                    .catch(() => signInAnonymously(auth));
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const toggleRole = () => {
        setUserRole(prev => prev === 'manager' ? 'staff' : 'manager');
        setMessage(isManager ? '権限をスタッフに切り替えました。' : '権限を管理者に切り替えました。');
    };

    // ------------------------------------
    // フィルタリングとソートロジック
    // ------------------------------------
    const filteredAndSortedOrders = useMemo(() => {
        let filtered = orders.filter(order => {
            // 検索フィルター
            if (filters.search && 
                !(order.id.toLowerCase().includes(filters.search.toLowerCase()) || 
                  order.product.toLowerCase().includes(filters.search.toLowerCase()))) {
                return false;
            }
            // チャネルフィルター
            if (filters.channel && order.mall !== filters.channel) {
                return false;
            }
            // ステータスフィルター
            if (filters.status && order.shippingStatus !== filters.status) {
                return false;
            }
            // 日付フィルター（今回はモックなので簡易的にスキップ）
            return true;
        });

        // ソート
        filtered.sort((a, b) => {
            let comparison = 0;
            if (sort.key === 'date') {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                comparison = dateA.getTime() - dateB.getTime();
            } else if (sort.key === 'aiScore') {
                comparison = a.aiScore - b.aiScore;
            } else if (sort.key === 'profitRate') {
                comparison = a.profitRate - b.profitRate;
            }
            return sort.direction === 'asc' ? comparison : comparison * -1;
        });

        return filtered;
    }, [orders, filters, sort]);


    // ------------------------------------
    // モーダル制御
    // ------------------------------------
    const openModal = (title, body) => {
        setModalContent({ title, body });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent({ title: '', body: null });
    };

    // ------------------------------------
    // タスク C: LLM機能モック
    // ------------------------------------

    const generateEmailDraft = async (order) => {
        setIsAiLoading(true);

        try {
            // カスタムモーダルで問い合わせ内容を入力させる
            openModal('AI顧客対応メール作成', (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">顧客からの問い合わせ内容を入力してください:</p>
                    <textarea
                        id="inquiry-input"
                        className="w-full h-24 p-2 border rounded text-sm"
                        placeholder="例: 出荷はいつになりますか？"
                    ></textarea>
                    <button
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                        onClick={() => handleGenerateEmail(order)}
                    >
                        AIメールを生成
                    </button>
                </div>
            ));
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleGenerateEmail = async (order) => {
        const inquiryInput = document.getElementById('inquiry-input');
        const inquiry = inquiryInput?.value || '';

        if (!inquiry.trim()) {
            setMessage('⚠️ 問い合わせ内容を入力してください。');
            return;
        }

        setIsAiLoading(true);

        try {
            const prompt = `あなたは、ECサイトのカスタマーサポート担当者です。以下の受注情報と顧客からの問い合わせに基づき、丁寧で適切な日本語の返信メールを作成してください。

【受注情報】
- 注文番号: ${order.id}
- 注文日時: ${order.date}
- 販売チャネル: ${order.mall}
- 商品名: ${order.product}
- SKU: ${order.sku}
- 販売価格: ¥${order.totalAmount.toLocaleString()}
- 出荷ステータス: ${order.shippingStatus}
- 配送先国: ${order.country}
- 出荷期限: ${order.deadline}

【顧客からの問い合わせ】
${inquiry}

【返信メールの要件】
1. 件名を含めた完全なメール形式で作成
2. 丁寧で誠実な口調
3. 注文の現在の状況を明確に説明
4. 顧客の不安を解消する具体的な情報を提供
5. 必要に応じて謝罪や感謝の言葉を含める

返信メールを作成してください:`;

            const aiResponse = await callGeminiAPI(prompt);

            openModal('AI顧客対応メールドラフト', (
                <div className="space-y-3">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                        <p className="text-sm text-blue-800">
                            <i className="fas fa-info-circle mr-2"></i>
                            このドラフトを元に、内容を調整してご返信ください。
                        </p>
                    </div>
                    <textarea
                        readOnly
                        className="w-full h-64 p-3 border rounded bg-gray-50 text-sm font-mono"
                        defaultValue={aiResponse}
                    ></textarea>
                    <button
                        className="w-full py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700"
                        onClick={() => {
                            navigator.clipboard.writeText(aiResponse);
                            setMessage('✅ メール内容をクリップボードにコピーしました。');
                        }}
                    >
                        <i className="fas fa-copy mr-2"></i>クリップボードにコピー
                    </button>
                </div>
            ));

            setMessage('✅ AIメールドラフトを生成しました。');

        } catch (error) {
            console.error('AI Email Generation Error:', error);
            openModal('エラー', (
                <div className="space-y-3">
                    <div className="bg-red-50 border-l-4 border-red-500 p-3">
                        <p className="text-sm text-red-800">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            {error.message || 'AIメールの生成に失敗しました。'}
                        </p>
                    </div>
                    {!API_KEY && (
                        <p className="text-xs text-gray-600">
                            Gemini APIキーが設定されていません。環境変数 <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_GEMINI_API_KEY</code> を設定してください。
                        </p>
                    )}
                </div>
            ));
            setMessage('❌ AIメールの生成に失敗しました。');
        } finally {
            setIsAiLoading(false);
        }
    };

    const analyzeTrouble = async (order) => {
        setIsAiLoading(true);

        // ローディング中のモーダルを表示
        openModal('AIトラブル/リスク分析', (
            <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm text-gray-600">AIが分析を実行中です...</p>
            </div>
        ));

        try {
            const prompt = `あなたは、EC事業のリスク管理の専門家です。以下の受注情報を分析し、この取引で想定される潜在的なトラブル要因を3点特定し、それぞれの対応策を提案してください。

【受注情報】
- 注文番号: ${order.id}
- 販売チャネル: ${order.mall}
- 商品名: ${order.product}
- SKU: ${order.sku}
- 販売価格: ¥${order.totalAmount.toLocaleString()}
- 仕入れ値: ¥${order.costPrice.toLocaleString()}
- 予想利益: ¥${order.expectedProfit.toLocaleString()}
- 利益率: ${order.profitRate}%
- 配送先国: ${order.country}
- AIリスクスコア: ${order.aiScore}点 (100点満点、低いほど高リスク)
- 出荷ステータス: ${order.shippingStatus}
- 出荷期限: ${order.deadline}

【分析要件】
1. 潜在的なトラブル要因を3点挙げる（関税、配送遅延、商品トラブル、低利益率による赤字リスクなど）
2. 各要因について、具体的な対応策を提案
3. リスクレベル（高・中・低）を明記

以下のフォーマットで回答してください:

## 潜在的トラブル分析 (AIスコア: ${order.aiScore}点)

### 🔴 要因1: [要因名] (リスクレベル: 高/中/低)
[詳細な説明]
**対応策**: [具体的な対応方法]

### 🟠 要因2: [要因名] (リスクレベル: 高/中/低)
[詳細な説明]
**対応策**: [具体的な対応方法]

### 🟡 要因3: [要因名] (リスクレベル: 高/中/低)
[詳細な説明]
**対応策**: [具体的な対応方法]

## 総合リスク評価
[この注文の総合的なリスク評価と推奨アクション]`;

            const aiResponse = await callGeminiAPI(prompt);

            // AIの回答をMarkdown形式で表示
            openModal('AIトラブル/リスク分析', (
                <div className="space-y-3">
                    <div className={`border-l-4 p-3 mb-3 ${
                        order.aiScore >= 80 ? 'bg-green-50 border-green-500' :
                        order.aiScore >= 60 ? 'bg-yellow-50 border-yellow-500' :
                        'bg-red-50 border-red-500'
                    }`}>
                        <p className="text-sm font-semibold">
                            <i className="fas fa-chart-line mr-2"></i>
                            AIスコア: {order.aiScore}点 / 100点
                            {order.aiScore >= 80 && ' (低リスク)'}
                            {order.aiScore >= 60 && order.aiScore < 80 && ' (中リスク)'}
                            {order.aiScore < 60 && ' (高リスク)'}
                        </p>
                    </div>
                    <div className="max-h-96 overflow-y-auto prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm">{aiResponse}</div>
                    </div>
                    <button
                        className="w-full py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700"
                        onClick={() => {
                            navigator.clipboard.writeText(aiResponse);
                            setMessage('✅ 分析結果をクリップボードにコピーしました。');
                        }}
                    >
                        <i className="fas fa-copy mr-2"></i>分析結果をコピー
                    </button>
                </div>
            ));

            setMessage('✅ AIトラブル分析が完了しました。');

        } catch (error) {
            console.error('AI Trouble Analysis Error:', error);
            openModal('エラー', (
                <div className="space-y-3">
                    <div className="bg-red-50 border-l-4 border-red-500 p-3">
                        <p className="text-sm text-red-800">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            {error.message || 'AIトラブル分析に失敗しました。'}
                        </p>
                    </div>
                    {!API_KEY && (
                        <p className="text-xs text-gray-600">
                            Gemini APIキーが設定されていません。環境変数 <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_GEMINI_API_KEY</code> を設定してください。
                        </p>
                    )}
                </div>
            ));
            setMessage('❌ AIトラブル分析に失敗しました。');
        } finally {
            setIsAiLoading(false);
        }
    };


    // ------------------------------------
    // レンダリング用ヘルパー
    // ------------------------------------

    const renderOrderRow = (order) => {
        const isSelected = selectedOrder && selectedOrder.id === order.id;
        
        // タスク A: 利益率と仕入れ値を統合
        const profitRateColor = order.profitRate > 20 ? 'text-green-600' : (order.profitRate > 10 ? 'text-yellow-600' : 'text-red-600');

        return (
            <tr key={order.id} className={`order-row ${isSelected ? 'bg-indigo-50 border-indigo-400' : 'hover:bg-gray-100'}`} onClick={() => setSelectedOrder(order)}>
                <td className="p-3"><input type="checkbox" className="order-checkbox"/></td>
                <td className="p-3">
                    <div className="order-id text-sm font-semibold text-blue-800">{order.id}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><i className={getMallIcon(order.mall)}></i>{order.mall}</div>
                </td>
                <td className="p-3">
                    <div className="text-sm">{order.date.split(' ')[0]}</div>
                    <div className="text-xs text-gray-500">{order.date.split(' ')[1]}</div>
                </td>
                <td className="p-3 w-56">
                    <div className="flex items-start gap-2">
                        <img src={order.imageUrl} alt="商品画像" className="w-10 h-10 rounded object-cover"/>
                        <div className="product-info">
                            <div className="font-medium text-sm line-clamp-2">{order.product}</div>
                            <div className="text-xs text-gray-500">SKU: {order.sku}</div>
                        </div>
                    </div>
                </td>
                <td className="p-3 text-right">
                    <div className="font-bold text-base text-gray-800">¥{order.totalAmount.toLocaleString()}</div>
                    <div className={`text-xs font-semibold ${profitRateColor}`}>利益率: {order.profitRate}%</div>
                </td>
                <td className="p-3">
                    <span className={`status-badge ${getStatusStyles(order.paymentStatus)}`}>
                        {order.paymentStatus === 'paid' ? '完了' : '待ち'}
                    </span>
                </td>
                <td className="p-3">
                    <span className={`status-badge ${getStatusStyles(order.shippingStatus)}`}>
                        {order.shippingStatus === 'pending' ? '出荷待ち' : order.shippingStatus}
                    </span>
                </td>
                <td className="p-3 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mx-auto ${getAiScoreStyles(order.aiScore)}`}>
                        {order.aiScore}
                    </div>
                </td>
                <td className="p-3">
                    <div className="text-sm">{order.country}</div>
                    <div className="text-xs text-gray-500">期限: {order.deadline.substring(5)}</div>
                </td>
            </tr>
        );
    };

    const renderDetailPanel = () => {
        if (!selectedOrder) {
            return (
                <div className="detail-content text-center pt-20 text-gray-500">
                    <i className="fas fa-hand-pointer text-4xl mb-3"></i>
                    <p>受注一覧から注文を選択してください。</p>
                </div>
            );
        }

        return (
            <>
                <div className="detail-content p-4 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="detail-section">
                            <div className="text-sm font-semibold text-gray-700 pb-1 mb-2 border-b">基本情報</div>
                            <DetailRow label="注文番号" value={selectedOrder.id} />
                            <DetailRow label="注文日時" value={selectedOrder.date} />
                            <DetailRow label="販売チャネル" value={selectedOrder.mall} />
                            <DetailRow label="出荷期限" value={selectedOrder.deadline} />
                        </div>
                        
                        <div className="detail-section">
                            <div className="text-sm font-semibold text-gray-700 pb-1 mb-2 border-b">商品情報</div>
                            <DetailRow label="商品名" value={selectedOrder.product} />
                            <DetailRow label="SKU" value={selectedOrder.sku} />
                            <DetailRow label="数量" value="1" />
                        </div>
                        
                        {/* タスク A: 仕入れ・利益情報セクションの追加 */}
                        <div className="detail-section">
                            <div className="text-sm font-semibold text-gray-700 pb-1 mb-2 border-b">💰 仕入れ・利益情報</div>
                            <DetailRow label="販売価格" value={`¥${selectedOrder.totalAmount.toLocaleString()}`} isBold={true} />
                            <DetailRow label="仕入れ値 (原価)" value={`¥${selectedOrder.costPrice.toLocaleString()}`} color="text-red-600" />
                            <DetailRow label="予想利益" value={`¥${selectedOrder.expectedProfit.toLocaleString()}`} color="text-green-600" isBold={true} />
                            <DetailRow label="利益率" value={`${selectedOrder.profitRate}%`} color={selectedOrder.profitRate > 15 ? 'text-green-600' : 'text-orange-600'} />
                        </div>

                        <div className="detail-section">
                            <div className="text-sm font-semibold text-gray-700 pb-1 mb-2 border-b">配送情報</div>
                            <DetailRow label="配送先国" value={selectedOrder.country} />
                            <DetailRow label="AIスコア" value={`${selectedOrder.aiScore}`} color={selectedOrder.aiScore > 70 ? 'text-green-600' : 'text-red-600'} />
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t space-y-2">
                    <button className="w-full py-2 px-3 rounded text-white font-medium flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition" onClick={() => console.log('注文処理開始', selectedOrder.id)}>
                        <i className="fas fa-play"></i> 注文処理開始
                    </button>
                    <button className="w-full py-2 px-3 rounded text-white font-medium flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 transition" onClick={() => console.log('出荷完了マーク', selectedOrder.id)}>
                        <i className="fas fa-truck"></i> 出荷完了マーク
                    </button>
                    <button className="w-full py-2 px-3 rounded border text-gray-700 font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition" onClick={() => console.log('配送ラベル印刷', selectedOrder.id)}>
                        <i className="fas fa-print"></i> 配送ラベル印刷
                    </button>
                    
                    {/* タスク C: LLMによる顧客対応メールドラフト機能 */}
                    <button
                        className="w-full py-2 px-3 rounded border text-gray-700 font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => generateEmailDraft(selectedOrder)}
                        disabled={isAiLoading}
                    >
                        {isAiLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                                処理中...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-envelope"></i> AI顧客メール作成
                            </>
                        )}
                    </button>

                    {/* タスク C: AIリスク/トラブル分析ボタン */}
                    <button
                        className={`w-full py-2 px-3 rounded font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${selectedOrder.aiScore <= 70 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'}`}
                        onClick={() => analyzeTrouble(selectedOrder)}
                        disabled={isAiLoading}
                    >
                        {isAiLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                分析中...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-exclamation-triangle"></i> AIトラブル分析 ({selectedOrder.aiScore <= 70 ? '高リスク' : '低リスク'})
                            </>
                        )}
                    </button>
                </div>
            </>
        );
    };
    
    // ------------------------------------
    // UIコンポーネント (HTML構造をReact/Tailwindに変換)
    // ------------------------------------

    const DetailRow = ({ label, value, color = 'text-gray-800', isBold = false }) => (
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={`text-sm font-medium ${color} ${isBold ? 'font-bold' : ''}`}>{value}</span>
        </div>
    );

    const FilterPanel = () => {
        const handleFilterChange = (e) => {
            setFilters(prev => ({ ...prev, [e.target.id]: e.target.value }));
        };

        const handleApplyFilters = () => {
            // 実際にはFirestoreクエリを実行するが、ここではstate更新のみ
            setMessage('フィルターを適用しました。');
            setSelectedOrder(null); // フィルター適用で選択を解除
        };

        const handleClearFilters = () => {
            setFilters({
                search: '',
                channel: '',
                status: '',
                dateFrom: new Date().toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0]
            });
            setMessage('フィルターをクリアしました。');
            setSelectedOrder(null);
        };
        
        // タスク B: アクティブフィルタータグの表示
        const activeFilters = Object.entries(filters)
            .filter(([key, value]) => value && key !== 'dateFrom' && key !== 'dateTo')
            .map(([key, value]) => (
                <span key={key} className="px-2 py-1 bg-blue-500 text-white rounded text-xs flex items-center gap-1">
                    {key.toUpperCase()}: {value}
                </span>
            ));

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-10px)]">
                <div className="p-4 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-t-lg">
                    <div className="text-base font-semibold mb-2 flex items-center gap-2">
                        <i className="fas fa-search"></i> 受注検索・フィルター
                    </div>
                    <input 
                        type="text" 
                        id="search"
                        className="w-full p-2 border border-white/30 rounded bg-white/10 text-white placeholder-white/70 text-sm" 
                        placeholder="注文ID・商品名・顧客名で検索..." 
                        value={filters.search}
                        onChange={handleFilterChange}
                    />
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">期間設定</div>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" id="dateFrom" className="w-full p-2 border rounded text-sm" value={filters.dateFrom} onChange={handleFilterChange} />
                            <input type="date" id="dateTo" className="w-full p-2 border rounded text-sm" value={filters.dateTo} onChange={handleFilterChange} />
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">販売チャネル</div>
                        <select id="channel" className="w-full p-2 border rounded text-sm" value={filters.channel} onChange={handleFilterChange}>
                            <option value="">全てのチャネル</option>
                            {ALL_MALLS.map(mall => <option key={mall} value={mall}>{mall}</option>)}
                        </select>
                    </div>
                    
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">出荷ステータス</div>
                        <select id="status" className="w-full p-2 border rounded text-sm" value={filters.status} onChange={handleFilterChange}>
                            <option value="">全てのステータス</option>
                            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="mb-4">
                        <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">アクティブフィルター</div>
                        <div id="activeFilters" className="flex flex-wrap gap-1 mt-1 min-h-[20px]">
                            {activeFilters.length > 0 ? activeFilters : <span className="text-xs text-gray-400">なし</span>}
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t flex gap-2">
                    <button className="flex-1 py-2 rounded text-sm font-medium cursor-pointer transition bg-blue-700 text-white hover:bg-blue-800" onClick={handleApplyFilters}>
                        <i className="fas fa-search mr-1"></i> 検索
                    </button>
                    <button className="flex-1 py-2 rounded text-sm font-medium cursor-pointer transition bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={handleClearFilters}>
                        <i className="fas fa-times mr-1"></i> クリア
                    </button>
                </div>
            </div>
        );
    };

    const StatusPanel = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-10px)] overflow-hidden">
            <div className="p-3 bg-gray-50 border-b">
                <div className="text-sm font-semibold text-gray-800">今日の受注状況</div>
            </div>
            
            <div className="p-3 flex flex-col gap-3">
                <StatCard title="新規注文" value={12} color="border-l-4 border-yellow-600 bg-yellow-50"/>
                <StatCard title="処理中" value={8} color="border-l-4 border-blue-600 bg-blue-50"/>
                <StatCard title="出荷済み" value={25} color="border-l-4 border-green-600 bg-green-50"/>
                <StatCard title="今日の売上" value="¥485,670" color="border-l-4 border-indigo-600 bg-indigo-50"/>
            </div>
            
            <div className="p-3 border-t">
                <button className="w-full py-2 px-3 mb-2 bg-gray-50 border rounded text-xs text-left hover:bg-blue-100 hover:text-blue-800 transition">
                    <i className="fas fa-exclamation-triangle mr-2"></i> 緊急対応必要
                </button>
                <button className="w-full py-2 px-3 mb-2 bg-gray-50 border rounded text-xs text-left hover:bg-blue-100 hover:text-blue-800 transition">
                    <i className="fas fa-credit-card mr-2"></i> 未入金注文
                </button>
                <button className="w-full py-2 px-3 mb-2 bg-gray-50 border rounded text-xs text-left hover:bg-blue-100 hover:text-blue-800 transition">
                    <i className="fas fa-truck mr-2"></i> 今日出荷予定
                </button>
                {isManager && (
                    <button className="w-full py-2 px-3 mb-2 bg-gray-50 border rounded text-xs text-left hover:bg-blue-100 hover:text-blue-800 transition">
                        <i className="fas fa-download mr-2"></i> データエクスポート
                    </button>
                )}
            </div>
        </div>
    );

    const StatCard = ({ title, value, color }) => (
        <div className={`p-3 rounded-md ${color}`}>
            <div className="text-xl font-bold text-gray-800 mb-1">{value}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wider">{title}</div>
        </div>
    );
    
    // ------------------------------------
    // メインレンダリング
    // ------------------------------------

    if (!user) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">認証中...</div>;
    }

    return (
        <div className="p-1 min-h-screen bg-gray-100">
            <header className="mb-2 p-3 bg-white shadow flex justify-between items-center rounded-lg">
                <h1 className="text-xl font-extrabold text-blue-700">受注管理システム V2.0</h1>
                <div className="flex items-center space-x-3">
                    {message && <span className="text-sm text-indigo-600">{message}</span>}
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${isManager ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                        {isManager ? '管理者' : 'スタッフ'}
                    </span>
                    <button onClick={toggleRole} className="bg-gray-200 text-gray-700 p-1 rounded hover:bg-gray-300 text-xs">
                        権限切替
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-[320px_240px_1fr_300px] gap-2 items-start h-[calc(100vh-50px)]" id="juchuLayout">
                {/* 1列目: フィルター・検索パネル */}
                <FilterPanel />

                {/* 2列目: ステータス・統計パネル */}
                <StatusPanel />

                {/* 3列目: メイン受注テーブル */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full">
                    <div className="p-4 bg-gradient-to-br from-blue-800 to-blue-500 text-white flex justify-between items-center rounded-t-lg">
                        <div className="text-lg font-semibold flex items-center gap-2">
                            <i className="fas fa-list"></i> 受注一覧 ({filteredAndSortedOrders.length}件)
                        </div>
                        <div className="flex gap-2">
                            <button className="py-1 px-2 bg-white/20 border border-white/30 text-white rounded text-xs hover:bg-white/30"><i className="fas fa-sync-alt"></i> 更新</button>
                        </div>
                    </div>
                    
                    <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" className="w-4 h-4"/>
                            <button className="py-1 px-2 bg-white border rounded text-xs hover:bg-gray-100">一括出荷完了</button>
                            <button className="py-1 px-2 bg-white border rounded text-xs hover:bg-gray-100">一括ラベル印刷</button>
                        </div>
                        <select className="p-1 border rounded text-xs" onChange={(e) => setSort(e.target.value)}>
                            <option value="date_desc">注文日 (最新)</option>
                            <option value="date_asc">注文日 (最古)</option>
                            <option value="aiScore_desc">AIスコア (高)</option>
                            <option value="profitRate_desc">利益率 (高)</option>
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="sticky top-0 bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-600 w-10"><input type="checkbox"/></th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-600 cursor-pointer" onClick={() => setSort({ key: 'date', direction: sort.key === 'date' && sort.direction === 'desc' ? 'asc' : 'desc' })}>注文番号</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-600 cursor-pointer" onClick={() => setSort({ key: 'date', direction: sort.key === 'date' && sort.direction === 'desc' ? 'asc' : 'desc' })}>注文日時</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-600">商品情報</th>
                                    <th className="p-3 text-right text-xs font-semibold text-gray-600 cursor-pointer" onClick={() => setSort({ key: 'profitRate', direction: sort.key === 'profitRate' && sort.direction === 'desc' ? 'asc' : 'desc' })}>金額・利益</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-600">支払い</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-600">出荷</th>
                                    <th className="p-3 text-center text-xs font-semibold text-gray-600 cursor-pointer" onClick={() => setSort({ key: 'aiScore', direction: sort.key === 'aiScore' && sort.direction === 'desc' ? 'asc' : 'desc' })}>AIスコア</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-600 w-24">配送先</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200" id="ordersTableBody">
                                {filteredAndSortedOrders.map(renderOrderRow)}
                                {filteredAndSortedOrders.length === 0 && (
                                    <tr><td colSpan="9" className="text-center p-6 text-gray-500">条件に一致する受注データはありません。</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4列目: 詳細・アクションパネル */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full">
                    <div className="p-4 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-t-lg">
                        <div className="text-base font-semibold flex items-center gap-2">
                            <i className="fas fa-info-circle"></i> 注文詳細
                        </div>
                    </div>
                    {renderDetailPanel()}
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

export default OrderManager_V2;

// 開発指示書の制約に基づき、単一ファイル構造を維持