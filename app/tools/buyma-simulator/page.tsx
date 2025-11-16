'use client'
// FIREBASE_DISABLED_MODE: このツールはFirebase機能なしで動作します（表示のみ）

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ShoppingBag, DollarSign, Package, MapPin, TrendingUp, Plus, Trash2, XCircle, Settings, Loader2, ListOrdered, Edit, Eye } from 'lucide-react';

// Firebase設定とAPIキー
// グローバル変数から設定を取得 (Canvas環境必須)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// BUYMAの手数料率 (標準的な目安を使用)
const BUYMA_COMMISSION_RATE = 0.075; // 7.5%として計算

// MARK: - Firestoreユーティリティ関数と初期化
let db = null;
let auth = null;

if (firebaseConfig) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (e) {
        // Firebase initialization disabled
    }
}

/**
 * ユーザーIDとコレクション名からFirestoreのコレクションパスを生成します。
 */
const getCollectionPath = (userId, collectionName) => {
  if (!userId) return null;
  return `artifacts/${appId}/users/${userId}/${collectionName}`;
};

// MARK: - メインコンポーネント
const App = () => {
  // Firebase Auth State
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Data States
  const [suppliers, setSuppliers] = useState([]);
  const [draftListings, setDraftListings] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('simulate'); // 'simulate' | 'suppliers' | 'drafts'
  const [modalData, setModalData] = useState(null); // 詳細モーダルのデータ

  // MARK: - 初期化と認証
  useEffect(() => {
    if (!auth || !db) {
        console.log("FIREBASE_DISABLED_MODE: Running without Firebase");
        setLoading(false);
        return;
    }
    
    const signIn = async () => {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        } catch (e) {
            // Firebase sign-in disabled
            console.log("FIREBASE_DISABLED_MODE: Auth disabled");
            setLoading(false);
        }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setUserId(user.uid);
            setIsAuthReady(true);
        } else {
            // ユーザーがいない場合はサインインを試みる
            await signIn();
        }
    });

    return () => unsubscribe();
  }, []);

  // MARK: - Firestore データ同期 (onSnapshot)
  useEffect(() => {
    if (!isAuthReady || !userId || !db) return;
    
    let unsubscribes = [];
    
    try {
        // Suppliers Listener
        const suppliersRef = collection(db, getCollectionPath(userId, 'buyma_suppliers'));
        unsubscribes.push(onSnapshot(query(suppliersRef), (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSuppliers(list);
          setLoading(false); // データ取得が始まったらローディングを解除
        }, (e) => {
            console.error("Suppliers Snapshot Error:", e);
            setError("仕入れ先リストの取得に失敗しました。");
            setLoading(false);
        }));
        
        // Draft Listings Listener
        const draftsRef = collection(db, getCollectionPath(userId, 'buyma_drafts'));
        // NOTE: FirestoreのorderByはインデックスの問題を引き起こす可能性があるため、
        // 取得後にJavaScriptでソートします。
        unsubscribes.push(onSnapshot(query(draftsRef), (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // JavaScriptで降順ソート
          setDraftListings(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        }, (e) => {
            console.error("Drafts Snapshot Error:", e);
            setError("出品ドラフトの取得に失敗しました。");
        }));

    } catch (e) {
        console.error("Firestore Setup Error:", e);
        setError("Firestoreのコレクション設定に問題があります。");
        setLoading(false);
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [isAuthReady, userId]);


  // 認証完了までローディング
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
        <p className="ml-3 text-gray-700">システム初期化中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10 font-sans antialiased">
      {/* Tailwind CSSのロード */}
      <script src="https://cdn.tailwindcss.com"></script>

      {/* 詳細モーダル */}
      {modalData && <DetailModal data={modalData} onClose={() => setModalData(null)} />}
      
      <div className="max-w-7xl mx-auto">
        
        <header className="text-center mb-10 p-6 bg-white rounded-xl shadow-lg">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-indigo-600 mr-3" />
            BUYMA無在庫仕入れ戦略シミュレーター
          </h1>
          <p className="text-gray-600 max-w-4xl mx-auto">
            複数の仕入れ先を管理し、諸経費を考慮したリアルタイムな利益計算で、出品すべき商品を見つけ出します。
          </p>
          <p className="mt-2 text-xs text-gray-500">ユーザーID: {userId}</p>
        </header>

        {error && (
            <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-xl font-medium flex items-center shadow-md">
                <XCircle className="w-5 h-5 mr-2" />
                エラー: {error}
            </div>
        )}

        {/* タブナビゲーション */}
        <nav className="flex space-x-2 border-b-2 border-indigo-200 mb-6">
          <TabButton icon={TrendingUp} label="利益シミュレーション" id="simulate" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton icon={Settings} label={`仕入れ先マスタ管理 (${suppliers.length})`} id="suppliers" activeTab={activeTab} onClick={setActiveTab} count={suppliers.length} />
          <TabButton icon={ListOrdered} label={`出品ドラフト (${draftListings.length})`} id="drafts" activeTab={activeTab} onClick={setActiveTab} count={draftListings.length} />
        </nav>
        
        {/* コンテンツエリア */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl min-h-[60vh]">
          {activeTab === 'simulate' && <ProfitSimulator suppliers={suppliers} userId={userId} db={db} setError={setError} />}
          {activeTab === 'suppliers' && <SupplierManager suppliers={suppliers} userId={userId} db={db} setError={setError} />}
          {activeTab === 'drafts' && <DraftListings draftListings={draftListings} userId={userId} db={db} setError={setError} setModalData={setModalData} />}
        </div>
      </div>
      <style jsx>{`
        .input-label { @apply block text-sm font-medium text-gray-700 mb-1; }
        .input-style { @apply w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm; }
        .table-header { @apply px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider; }
        .table-cell { @apply px-4 py-3 whitespace-normal text-sm text-gray-800; }
        .profit-positive { @apply bg-green-100 text-green-800 border-green-400; }
        .profit-negative { @apply bg-red-100 text-red-800 border-red-400; }
        .profit-zero { @apply bg-yellow-100 text-yellow-800 border-yellow-400; }
      `}</style>
    </div>
  );
};

// MARK: - 詳細モーダルコンポーネント
const DetailModal = ({ data, onClose }) => {
    const p = data.details;

    const Bar = ({ label, value, max, color, isCost = true }) => {
        const width = (value / max) * 100;
        return (
            <div className="mb-2">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                    <span>{label}</span>
                    <span className={isCost ? 'text-red-600' : 'text-green-600'}>¥{Math.round(value).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full`} style={{ width: `${Math.min(width, 100)}%`, backgroundColor: color }}></div>
                </div>
            </div>
        );
    };

    const maxCost = p.totalCost;
    const netProfit = Math.round(p.netProfit);
    const profitColor = netProfit > 0 ? '#10B981' : '#EF4444';

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all scale-100 opacity-100">
                
                <header className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">
                        出品ドラフト詳細: {data.productName}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <XCircle className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 space-y-6">
                    {/* 概要 */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoBox label="BUYMA出品価格" value={`¥${data.buymaPrice.toLocaleString()}`} icon={DollarSign} color="bg-indigo-50" textColor="text-indigo-700" />
                        <InfoBox label="推定純利益" value={`¥${netProfit.toLocaleString()}`} icon={TrendingUp} color={netProfit > 0 ? "bg-green-50" : "bg-red-50"} textColor={netProfit > 0 ? "text-green-700" : "text-red-700"} />
                    </div>

                    {/* 仕入れ情報 */}
                    <div className="border p-4 rounded-lg bg-gray-50">
                        <h4 className="font-semibold text-gray-700 mb-2">仕入れ情報</h4>
                        <p className="text-sm"><strong>仕入れ先:</strong> {data.supplier}</p>
                        <p className="text-sm"><strong>商品原価:</strong> ¥{p.productCost.toLocaleString()}</p>
                        <p className="text-sm"><strong>合計コスト:</strong> ¥{Math.round(p.totalCost).toLocaleString()}</p>
                    </div>

                    {/* コスト内訳グラフ */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-gray-700">コスト構造の視覚化 (総コスト ¥{Math.round(p.totalCost).toLocaleString()})</h4>
                        <Bar label="商品原価" value={p.productCost} max={maxCost} color="#3B82F6" />
                        <Bar label="BUYMA手数料" value={p.commission} max={maxCost} color="#F59E0B" />
                        <Bar label="推定関税額" value={p.estimatedTax} max={maxCost} color="#EF4444" />
                        <Bar label="送料 + その他費用" value={p.shipping + p.extraCost} max={maxCost} color="#10B981" />
                    </div>

                    {/* 戦略判定 */}
                    <div className="pt-4 border-t">
                        <p className="font-semibold text-gray-700 mb-2">戦略的コメント:</p>
                        <p className={`p-3 rounded-lg text-sm ${netProfit > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {netProfit > 5000 ? '高い利益率が期待できます。優先的に出品準備を進めてください。' :
                             netProfit > 0 ? '利益は確保されていますが、為替や関税の変動に注意が必要です。' :
                             'この条件では赤字です。仕入れ先や出品価格の見直しが必要です。'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoBox = ({ label, value, icon: Icon, color, textColor }) => (
    <div className={`p-4 rounded-xl shadow-md flex items-center ${color}`}>
        <Icon className={`w-6 h-6 mr-3 ${textColor}`} />
        <div>
            <p className="text-xs font-medium text-gray-600">{label}</p>
            <p className={`text-xl font-extrabold ${textColor}`}>{value}</p>
        </div>
    </div>
);

// MARK: - タブボタンコンポーネント
const TabButton = ({ icon: Icon, label, id, activeTab, onClick, count }) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${
            activeTab === id
                ? 'text-indigo-700 border-b-4 border-indigo-500 bg-indigo-50'
                : 'text-gray-600 hover:text-indigo-500 hover:bg-gray-100 border-b-4 border-transparent'
        }`}
    >
        <Icon className="w-5 h-5 mr-2" />
        {label}
        {/* countはラベルに含まれているため削除 */}
    </button>
);

// MARK: - 利益シミュレーションパネル
const ProfitSimulator = ({ suppliers, userId, db, setError }) => {
    // フォームの状態
    const [productName, setProductName] = useState('');
    const [buymaPrice, setBuymaPrice] = useState('');
    const [supplierPrice, setSupplierPrice] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [extraCost, setExtraCost] = useState(''); // その他の追加費用 (例: 検品費用)

    // 選択された仕入れ先オブジェクト
    const selectedSupplier = useMemo(() => suppliers.find(s => s.id === selectedSupplierId), [suppliers, selectedSupplierId]);

    // 利益計算ロジック
    const profit = useMemo(() => {
        const bp = parseInt(buymaPrice) || 0;
        const sp = parseInt(supplierPrice) || 0;
        const ec = parseInt(extraCost) || 0;

        if (bp === 0 || sp === 0 || !selectedSupplier) return null;

        const commission = bp * BUYMA_COMMISSION_RATE; // BUYMA手数料
        const shipping = parseInt(selectedSupplier.shippingCost) || 0; // 仕入れ先の固定送料
        const taxRate = parseFloat(selectedSupplier.avgTaxRate) || 0; // 仕入れ先の平均関税率

        // 仕入れ価格に対する関税計算
        const estimatedTax = sp * taxRate;

        const totalRevenue = bp;
        const totalCost = sp + commission + shipping + estimatedTax + ec;
        const netProfit = totalRevenue - totalCost;

        return {
            netProfit,
            totalRevenue,
            totalCost,
            commission,
            shipping,
            estimatedTax,
            productCost: sp,
            extraCost: ec,
        };
    }, [buymaPrice, supplierPrice, selectedSupplier, extraCost]);
    
    // ドラフト登録
    const saveAsDraft = async () => {
        if (!profit || profit.netProfit <= 0) {
            setError("利益がプラスの商品のみドラフト登録が可能です。");
            return;
        }

        if (!productName.trim()) {
            setError("商品名は必須です。");
            return;
        }
        
        try {
            await addDoc(collection(db, getCollectionPath(userId, 'buyma_drafts')), {
                productName,
                buymaPrice: parseInt(buymaPrice),
                supplier: selectedSupplier.name,
                netProfit: profit.netProfit,
                details: profit,
                createdAt: serverTimestamp(),
            });
            
            // 登録後に入力値をクリア
            setProductName('');
            setBuymaPrice('');
            setSupplierPrice('');
            setExtraCost('');
            setSelectedSupplierId('');
            
        } catch (e) {
            console.error("Draft save error:", e);
            setError("出品ドラフトの保存に失敗しました。");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左側: 入力フォーム */}
            <div className="space-y-6 p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-inner">
                <h2 className="text-xl font-bold text-gray-800 flex items-center pb-2 border-b border-gray-200">
                    <DollarSign className="w-5 h-5 mr-2 text-indigo-500" />
                    利益計算の入力
                </h2>
                <div className="space-y-4">
                    {/* 商品名 */}
                    <div>
                        <label className="input-label">商品名 / 型番</label>
                        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="例: D-Bag S Size / Navy" className="input-style" />
                    </div>
                    {/* BUYMA価格 */}
                    <div>
                        <label className="input-label">BUYMA出品価格（見込み）</label>
                        <input type="number" value={buymaPrice} onChange={(e) => setBuymaPrice(e.target.value)} placeholder="例: 98000" className="input-style" />
                    </div>
                    {/* 仕入れ先選択 */}
                    <div>
                        <label className="input-label">仕入れ先候補の選択</label>
                        <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="input-style">
                            <option value="">--- 仕入れ先を選択 ---</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                            ))}
                        </select>
                        {suppliers.length === 0 && (
                            <p className="text-red-500 text-xs mt-1">※ 仕入れ先マスタに仕入れ先を登録してください。</p>
                        )}
                    </div>
                    {/* 仕入れ価格 */}
                    <div>
                        <label className="input-label">仕入れ先での商品価格 (現地通貨を円換算)</label>
                        <input type="number" value={supplierPrice} onChange={(e) => setSupplierPrice(e.target.value)} placeholder="例: 65000" className="input-style" />
                    </div>
                    {/* 追加費用 */}
                    <div>
                        <label className="input-label">その他の追加費用 (検品, 梱包費など)</label>
                        <input type="number" value={extraCost} onChange={(e) => setExtraCost(e.target.value)} placeholder="例: 2000" className="input-style" />
                    </div>
                </div>
            </div>

            {/* 右側: 計算結果 */}
            <div className="space-y-6 p-6 bg-white border border-indigo-200 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 flex items-center pb-2 border-b border-gray-200">
                    <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                    計算結果と戦略判定
                </h2>
                
                {profit ? (
                    <div className="space-y-4">
                        {/* 最終利益額 */}
                        <div className={`p-5 rounded-xl border-2 shadow-lg ${profit.netProfit > 0 ? 'profit-positive' : profit.netProfit < 0 ? 'profit-negative' : 'profit-zero'}`}>
                            <p className="text-sm font-semibold uppercase">最終手残り利益 (見込み)</p>
                            <p className="text-4xl font-extrabold mt-1">
                                ¥{Math.round(profit.netProfit).toLocaleString()}
                            </p>
                        </div>

                        {/* コスト内訳 */}
                        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
                            <h4 className="font-semibold text-gray-700 mb-2">費用・コスト内訳 (総費用: ¥{Math.round(profit.totalCost).toLocaleString()})</h4>
                            <CostDetail label="商品仕入れ原価" value={profit.productCost} color="text-gray-800" />
                            <CostDetail label="BUYMA手数料 (7.5%)" value={profit.commission} color="text-blue-600" />
                            <CostDetail label="仕入れ先送料" value={profit.shipping} color="text-red-600" />
                            <CostDetail label="推定関税額" value={profit.estimatedTax} color="text-red-600" />
                            <CostDetail label="その他追加費用" value={profit.extraCost} color="text-gray-600" />
                        </div>

                        {/* ドラフト登録ボタン */}
                        <button 
                            onClick={saveAsDraft}
                            disabled={profit.netProfit <= 0 || !productName.trim()}
                            className="w-full px-6 py-3 bg-indigo-600 text-white font-extrabold text-lg rounded-xl hover:bg-indigo-700 transition shadow-xl disabled:opacity-50 flex items-center justify-center mt-6"
                        >
                            <Plus className="w-5 h-5 mr-3" />
                            {profit.netProfit > 0 ? 'この商品をBUYMA出品ドラフトに登録' : '利益がマイナスです (登録不可)'}
                        </button>

                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500">
                        <DollarSign className="w-8 h-8 mb-3" />
                        <p>左側のフォームにすべての情報を入力すると、利益が自動で計算されます。</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const CostDetail = ({ label, value, color }) => (
    <div className="flex justify-between text-sm py-0.5 border-b border-gray-200 last:border-b-0">
        <span className="text-gray-600">{label}</span>
        <span className={`font-medium ${color}`}>¥{Math.round(value).toLocaleString()}</span>
    </div>
);

// MARK: - 仕入れ先マスタ管理パネル
const SupplierManager = ({ suppliers, userId, db, setError }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [location, setLocation] = useState('');
    const [shippingCost, setShippingCost] = useState('');
    const [avgTaxRate, setAvgTaxRate] = useState('');
    const [isEditing, setIsEditing] = useState(null); // ID of supplier being edited

    const resetForm = () => {
        setName(''); setUrl(''); setLocation(''); setShippingCost(''); setAvgTaxRate(''); setIsEditing(null);
    };

    const handleSaveSupplier = async (e) => {
        e.preventDefault();
        
        if (!name || !location || !shippingCost || !avgTaxRate) {
            setError("必須項目（名前、所在地、送料、平均関税率）を入力してください。");
            return;
        }

        const supplierData = {
            name,
            url,
            location,
            shippingCost: parseInt(shippingCost) || 0,
            avgTaxRate: parseFloat(avgTaxRate) || 0, // 例: 0.15 (15%を意味する)
            updatedAt: serverTimestamp(),
        };

        try {
            if (isEditing) {
                await updateDoc(doc(db, getCollectionPath(userId, 'buyma_suppliers'), isEditing), supplierData);
            } else {
                await addDoc(collection(db, getCollectionPath(userId, 'buyma_suppliers')), { ...supplierData, createdAt: serverTimestamp() });
            }
            resetForm();
        } catch (e) {
            console.error("Supplier save error:", e);
            setError("仕入れ先の保存に失敗しました。");
        }
    };
    
    const handleDeleteSupplier = async (id) => {
        // NOTE: alert()禁止のため、カスタムモーダルを使用するか、簡易的に確認をスキップ
        // 今回は便宜上、確認ロジックを省略
        try {
            await deleteDoc(doc(db, getCollectionPath(userId, 'buyma_suppliers'), id));
        } catch (e) {
            console.error("Supplier delete error:", e);
            setError("仕入れ先の削除に失敗しました。");
        }
    };
    
    const handleEdit = (supplier) => {
        setName(supplier.name);
        setUrl(supplier.url || '');
        setLocation(supplier.location);
        setShippingCost(supplier.shippingCost.toString());
        setAvgTaxRate(supplier.avgTaxRate.toString());
        setIsEditing(supplier.id);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左側: 登録・編集フォーム */}
            <div className="lg:col-span-1 space-y-4 p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-inner h-fit">
                <h3 className="text-lg font-bold text-gray-800 pb-2 border-b border-gray-200 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    {isEditing ? '仕入れ先を編集' : '新しい仕入れ先の登録'}
                </h3>
                <form onSubmit={handleSaveSupplier} className="space-y-3">
                    <div>
                        <label className="input-label">仕入れ先名 <span className="text-red-500">*</span></label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: Farfetch / Saks Fifth Avenue" className="input-style" />
                    </div>
                    <div>
                        <label className="input-label">公式サイトURL</label>
                        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="input-style" />
                    </div>
                    <div>
                        <label className="input-label">所在地 (国/地域) <span className="text-red-500">*</span></label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例: EU (イタリア) / アメリカ" className="input-style" />
                    </div>
                    <div>
                        <label className="input-label">固定送料 (平均) [円] <span className="text-red-500">*</span></label>
                        <input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="例: 3500" className="input-style" />
                    </div>
                    <div>
                        <label className="input-label">平均関税率 (小数) <span className="text-red-500">*</span></label>
                        <p className="text-xs text-gray-500 mb-1">例: 15% の場合は 0.15 と入力</p>
                        <input type="number" step="0.01" value={avgTaxRate} onChange={(e) => setAvgTaxRate(e.target.value)} placeholder="例: 0.15" className="input-style" />
                    </div>
                    <div className="flex space-x-2 pt-2">
                        <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md">
                            {isEditing ? <><Edit className="w-4 h-4 inline mr-1" /> 更新</> : <><Plus className="w-4 h-4 inline mr-1" /> 登録</>}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition shadow-md">
                                キャンセル
                            </button>
                        )}
                    </div>
                </form>
            </div>
            
            {/* 右側: 登録済みリスト */}
            <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-gray-800 pb-2 border-b border-gray-200">
                    登録済み仕入れ先リスト ({suppliers.length}件)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="table-header w-1/4">仕入れ先名</th>
                                <th className="table-header w-1/5"><MapPin className="w-4 h-4 inline mr-1" /> 所在地</th>
                                <th className="table-header w-1/5 text-right">固定送料</th>
                                <th className="table-header w-1/5 text-right">平均関税率</th>
                                <th className="table-header w-[100px]">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {suppliers.length === 0 ? (
                                <tr><td colSpan="5" className="py-6 text-center text-gray-500">仕入れ先が登録されていません。左のフォームから登録してください。</td></tr>
                            ) : (
                                suppliers.map(s => (
                                    <tr key={s.id} className="hover:bg-indigo-50 transition">
                                        <td className="table-cell font-medium">
                                            {s.name}
                                            {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-700 block truncate" style={{ maxWidth: '200px' }}>{s.url}</a>}
                                        </td>
                                        <td className="table-cell">{s.location}</td>
                                        <td className="table-cell text-right">¥{s.shippingCost.toLocaleString()}</td>
                                        <td className="table-cell text-right">{(s.avgTaxRate * 100).toFixed(1)}%</td>
                                        <td className="table-cell text-center space-x-2">
                                            <button onClick={() => handleEdit(s)} className="p-1 text-indigo-500 hover:bg-indigo-100 rounded-full transition"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteSupplier(s.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full transition"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// MARK: - 出品ドラフトリストパネル
const DraftListings = ({ draftListings, userId, db, setError, setModalData }) => {

    const handleDeleteDraft = async (id) => {
        // NOTE: alert()禁止のため、カスタムモーダルを使用するか、簡易的に確認をスキップ
        try {
            await deleteDoc(doc(db, getCollectionPath(userId, 'buyma_drafts'), id));
        } catch (e) {
            console.error("Draft delete error:", e);
            setError("ドラフトの削除に失敗しました。");
        }
    };
    
    const handleViewDetails = (draft) => {
        setModalData(draft);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center pb-2 border-b border-gray-200">
                <ListOrdered className="w-6 h-6 mr-2 text-indigo-500" />
                BUYMA出品ドラフト ({draftListings.length}件)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="table-header w-1/3">商品名 / 型番</th>
                            <th className="table-header w-1/6">仕入れ先</th>
                            <th className="table-header w-1/6 text-right">BUYMA価格</th>
                            <th className="table-header w-1/6 text-right">推定利益</th>
                            <th className="table-header w-1/6 text-right">登録日</th>
                            <th className="table-header w-[100px]">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {draftListings.length === 0 ? (
                            <tr><td colSpan="6" className="py-6 text-center text-gray-500">まだ出品ドラフトに登録された商品はありません。</td></tr>
                        ) : (
                            draftListings.map(d => (
                                <tr key={d.id} className="hover:bg-green-50 transition">
                                    <td className="table-cell font-medium">{d.productName}</td>
                                    <td className="table-cell">{d.supplier}</td>
                                    <td className="table-cell text-right">¥{d.buymaPrice.toLocaleString()}</td>
                                    <td className="table-cell text-right font-extrabold text-green-700">¥{Math.round(d.netProfit).toLocaleString()}</td>
                                    <td className="table-cell text-right text-gray-500 text-xs">
                                        {d.createdAt?.toDate().toLocaleDateString('ja-JP') || '---'}
                                    </td>
                                    <td className="table-cell text-center space-x-2">
                                        <button onClick={() => handleViewDetails(d)} className="p-1 text-indigo-500 hover:bg-indigo-100 rounded-full transition"><Eye className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteDraft(d.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full transition"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default App;