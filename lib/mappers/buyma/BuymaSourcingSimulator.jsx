import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { GoogleGenerativeAI } from '@google/genai';

// 3. 厳守すべき技術的制約: APIキー、AppID、Firebase設定を維持
const API_KEY = ""; // Google Gemini API Key
const __app_id = "buyma_simulator_v2";
const __firebase_config = {
    apiKey: "",
    authDomain: "",
    projectId: "demo-buyma-project",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
const __initial_auth_token = "demo_token_buyma";

// Firebase App Initialization
const app = initializeApp(__firebase_config);
const db = getFirestore(app);
const auth = getAuth(app);
const gemini = new GoogleGenerativeAI(API_KEY);
const geminiModel = "gemini-2.5-flash-preview-09-2025";

// ====================================================================================================
// データモデルとユーティリティ
// ====================================================================================================

const BUYMA_FEE_RATE = 0.07324; // 7.324%

/**
 * タスク B.1: Firestoreデータモデルの拡張
 */
const STOCK_STATUS_MAP = {
    'In Stock': { label: '在庫あり', style: 'bg-green-500', icon: '✅' },
    'Low Stock': { label: '在庫僅少', style: 'bg-yellow-500', icon: '⚠️' },
    'Out of Stock': { label: '在庫切れ', style: 'bg-red-500', icon: '❌' },
};
const getStockInfo = (status) => STOCK_STATUS_MAP[status] || STOCK_STATUS_MAP['Out of Stock'];


const getPrivateCollectionRef = (userId, collectionName) => {
    return collection(db, `artifacts/${__app_id}/users/${userId}/${collectionName}`);
};

// ====================================================================================================
// LLMとの連携ロジック (タスク A & B & C)
// ====================================================================================================

/**
 * タスク A & B.2 & C: 仕入れ先価格・在庫・日本価格を取得する共通ロジック
 */
const fetchSourcingData = async (productQuery, supplierName, isRecheck = false) => {
    
    // JSON形式での出力をシステムに要求
    const systemPrompt = `
        あなたはBUYMA無在庫販売のデータアナリストです。
        Google Search Grounding Toolを使い、以下の製品について指定された仕入れ先サイトと日本市場の情報を調査し、必ずJSON形式で正確に出力してください。

        ---主要タスク---
        1. 仕入れ先サイト (${supplierName}) での現在の価格と在庫状況を検索・抽出すること。
        2. 日本の主要Eコマースサイト (Amazon Japan, 楽天, ブランド公式サイトなど) での現在の販売価格（定価・中古問わず）を検索・抽出すること。
        
        ---JSON出力形式の制約---
        {
          "sourcingPriceUSD": <数値>, // USDまたは仕入れ先の主通貨での価格 (税抜・送料考慮前)
          "stockStatus": "In Stock" | "Low Stock" | "Out of Stock", // 在庫状況
          "japaneseMarketPriceMedian": <数値>, // 日本市場価格の中央値または代表価格 (税・送料込み)
          "summary": "<簡潔な調査サマリー>" 
        }
        ---
    `;

    const userPrompt = isRecheck
        ? `登録されている商品「${productQuery}」の現在の在庫を ${supplierName} で再確認してください。`
        : `商品「${productQuery}」について、仕入れ先 ${supplierName} と日本市場の価格・在庫を調査してください。`;

    try {
        const response = await gemini.models.generateContent({
            model: geminiModel,
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: systemPrompt,
                tools: [{ googleSearch: {} }], // Google Search Groundingを有効化
            },
        });
        
        const jsonText = response.text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonText && jsonText[1]) {
            return JSON.parse(jsonText[1]);
        }
        
        // JSONブロックがない場合のフォールバック（エラーとして扱う）
        console.error("LLM did not return valid JSON:", response.text);
        return { error: true, summary: "AI調査エラー: 有効なJSONが返されませんでした。" };

    } catch (error) {
        console.error("Gemini API Error:", error);
        return { error: true, summary: "AIメール生成エラー: APIキーまたはネットワークを確認してください。" };
    }
};


// ====================================================================================================
// メインアプリケーションコンポーネント
// ====================================================================================================

const BuymaSourcingSimulator = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('simulate');
    const [message, setMessage] = useState('');
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    
    // データの状態管理
    const [suppliers, setSuppliers] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [simData, setSimData] = useState({
        sellingPriceJPY: 50000,
        sourcingPriceUSD: 350,
        exchangeRate: 150,
        customsDutyRate: 0.15,
        fixedShippingCost: 4000,
    });
    
    // タスク A: リサーチ＆在庫確認ステート
    const [productQuery, setProductQuery] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [fetchResults, setFetchResults] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    
    // ------------------------------------
    // 認証と初期化
    // ------------------------------------
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                signInWithCustomToken(auth, __initial_auth_token)
                    .catch(() => signInAnonymously(auth));
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // ------------------------------------
    // データ購読 (Firestore Listeners)
    // ------------------------------------
    useEffect(() => {
        if (!user) return;

        // Suppliers Listener
        const suppliersRef = getPrivateCollectionRef(user.uid, 'sourcing_suppliers');
        const unsubscribeSuppliers = onSnapshot(query(suppliersRef), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSuppliers(list);
        });

        // Drafts Listener (タスク B.1: 拡張データモデルに対応)
        const draftsRef = getPrivateCollectionRef(user.uid, 'buyma_drafts');
        const unsubscribeDrafts = onSnapshot(query(draftsRef), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), lastChecked: doc.data().lastChecked?.toDate() }));
            setDrafts(list);
        });

        return () => {
            unsubscribeSuppliers();
            unsubscribeDrafts();
        };
    }, [user]);

    // ------------------------------------
    // データ管理アクション
    // ------------------------------------

    const handleAddOrUpdate = async (collectionName, data, id = null) => {
        if (!user) {
            setMessage('Error: Not authenticated.');
            return;
        }
        setIsGlobalLoading(true);

        try {
            const docRef = id ? doc(getPrivateCollectionRef(user.uid, collectionName), id) : doc(getPrivateCollectionRef(user.uid, collectionName));
            await setDoc(docRef, { ...data, timestamp: serverTimestamp() }, { merge: true });
            setMessage(`${collectionName} ${id ? 'updated' : 'added'} successfully.`);
        } catch (error) {
            setMessage(`Failed to save ${collectionName}: ${error.message}`);
        } finally {
            setIsGlobalLoading(false);
        }
    };
    
    const handleDelete = async (collectionName, id) => {
        if (!user) {
            setMessage('Error: Not authenticated.');
            return;
        }
        try {
            await deleteDoc(doc(getPrivateCollectionRef(user.uid, collectionName), id));
            setMessage('Item deleted successfully.');
        } catch (error) {
            setMessage(`Failed to delete item: ${error.message}`);
        }
    };
    
    // ------------------------------------
    // シミュレーションコアロジック
    // ------------------------------------

    const simulationResult = useMemo(() => {
        const { sellingPriceJPY, sourcingPriceUSD, exchangeRate, customsDutyRate, fixedShippingCost } = simData;

        // 1. 仕入れ原価 (JPY)
        const sourcingPriceJPY = sourcingPriceUSD * exchangeRate;
        
        // 2. 関税・消費税
        const effectiveSourcingPrice = sourcingPriceJPY; // ここでは関税の基準を仕入れ値全体と仮定
        const customsDuty = effectiveSourcingPrice * customsDutyRate;
        
        // 3. 総原価
        const totalCost = sourcingPriceJPY + customsDuty + fixedShippingCost;
        
        // 4. BUYMA手数料 (販売価格に基づく)
        const buymaFee = sellingPriceJPY * BUYMA_FEE_RATE;
        
        // 5. 純利益
        const netProfit = sellingPriceJPY - totalCost - buymaFee;
        
        // 6. 利益率
        const profitRate = netProfit / sellingPriceJPY;

        return {
            sourcingPriceJPY: Math.round(sourcingPriceJPY),
            customsDuty: Math.round(customsDuty),
            totalCost: Math.round(totalCost),
            buymaFee: Math.round(buymaFee),
            netProfit: Math.round(netProfit),
            profitRate: profitRate,
        };
    }, [simData]);

    // ------------------------------------
    // タスク A: LLM呼び出しロジック
    // ------------------------------------
    const handleDataFetch = async (e) => {
        e.preventDefault();
        if (!productQuery || !supplierId) {
            setMessage('商品キーワードと仕入れ先を選択してください。');
            return;
        }

        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) {
            setMessage('仕入れ先マスタに存在しないIDです。');
            return;
        }
        
        setIsFetching(true);
        setFetchResults(null);
        
        const results = await fetchSourcingData(productQuery, supplier.name);

        if (results.error) {
            setMessage(results.summary);
            setFetchResults(null);
        } else {
            setFetchResults(results);
            setMessage('リサーチが完了しました。');
        }

        setIsFetching(false);
    };

    /**
     * タスク B.2: 在庫再確認機能
     */
    const handleRecheckStock = async (draft) => {
        if (!draft.supplierId || !draft.productName) {
            setMessage('このドラフトには仕入れ先情報が不足しています。');
            return;
        }
        
        const supplier = suppliers.find(s => s.id === draft.supplierId);
        if (!supplier) {
            setMessage('仕入れ先マスタに存在しないIDです。');
            return;
        }
        
        setIsGlobalLoading(true);
        
        const results = await fetchSourcingData(draft.productName, supplier.name, true); // isRecheck = true
        
        if (results.error) {
            setMessage(results.summary);
        } else {
            // Firestoreを更新
            await handleAddOrUpdate('buyma_drafts', {
                currentStockStatus: results.stockStatus || 'Out of Stock',
                lastChecked: serverTimestamp(),
            }, draft.id);
            setMessage(`${draft.productName} の在庫を ${results.stockStatus} に更新しました。`);
        }
        setIsGlobalLoading(false);
    };


    // ------------------------------------
    // 子コンポーネントのレンダリング関数
    // ------------------------------------

    const SupplierManager = () => {
        const [name, setName] = useState('');
        const [url, setUrl] = useState('');
        const [location, setLocation] = useState('');
        const [fixedShippingCost, setFixedShippingCost] = useState('');
        const [averageDutyRate, setAverageDutyRate] = useState('');

        const handleAdd = (e) => {
            e.preventDefault();
            if (!name || !url) {
                setMessage('Name and URL are required.');
                return;
            }
            const data = { 
                name, url, location, 
                fixedShippingCost: Number(fixedShippingCost) || 0,
                averageDutyRate: Number(averageDutyRate) || 0,
            };
            handleAddOrUpdate('sourcing_suppliers', data);
            setName(''); setUrl(''); setLocation(''); setFixedShippingCost(''); setAverageDutyRate('');
        };

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">仕入れ先マスタ ({suppliers.length})</h3>
                <form onSubmit={handleAdd} className="grid grid-cols-6 gap-3 mb-6 p-4 border border-gray-200 rounded-lg">
                    <input className="p-2 border rounded col-span-2" type="text" placeholder="仕入れ先名 (例: Farfetch)" value={name} onChange={e => setName(e.target.value)} />
                    <input className="p-2 border rounded col-span-2" type="url" placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} />
                    <input className="p-2 border rounded" type="text" placeholder="所在地 (例: EU)" value={location} onChange={e => setLocation(e.target.value)} />
                    <input className="p-2 border rounded" type="number" placeholder="平均送料(¥)" value={fixedShippingCost} onChange={e => setFixedShippingCost(e.target.value)} />
                    <input className="p-2 border rounded" type="number" step="0.01" placeholder="平均関税率(0.15)" value={averageDutyRate} onChange={e => setAverageDutyRate(e.target.value)} />
                    <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition duration-150">登録</button>
                </form>

                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                <th className="py-2 px-4 border-b">名称/URL</th>
                                <th className="py-2 px-4 border-b">所在地</th>
                                <th className="py-2 px-4 border-b">平均送料(¥)</th>
                                <th className="py-2 px-4 border-b">関税率(%)</th>
                                <th className="py-2 px-4 border-b">アクション</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 border-b text-sm text-gray-700">
                                    <td className="py-2 px-4">
                                        <a href={s.url} target="_blank" className="text-blue-600 hover:underline">{s.name}</a>
                                    </td>
                                    <td className="py-2 px-4">{s.location}</td>
                                    <td className="py-2 px-4">¥{s.fixedShippingCost}</td>
                                    <td className="py-2 px-4">{(s.averageDutyRate * 100).toFixed(1)}%</td>
                                    <td className="py-2 px-4">
                                        <button onClick={() => handleDelete('sourcing_suppliers', s.id)} className="text-red-500 hover:text-red-700 transition duration-150">削除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const SimulatorPanel = () => {
        const handleSaveDraft = (e) => {
            e.preventDefault();
            const selectedSupplier = suppliers.find(s => s.id === supplierId);
            
            const draftData = {
                productName: productQuery, // リサーチタブのクエリを流用
                supplierId: supplierId,
                supplierName: selectedSupplier ? selectedSupplier.name : '不明',
                // シミュレーション結果と入力値を保存
                ...simData,
                ...simulationResult,
                // タスク B.1: 在庫ステータスを初期値で追加
                currentStockStatus: 'Out of Stock', 
            };
            handleAddOrUpdate('buyma_drafts', draftData);
        };

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-6 text-gray-800">利益シミュレーション</h3>
                
                <div className="grid grid-cols-2 gap-6">
                    {/* 左: 入力フォーム */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 border-b pb-2 mb-3">販売/仕入れ価格</h4>
                        <label className="block">BUYMA販売価格 (¥):</label>
                        <input 
                            type="number" className="p-2 border rounded w-full" 
                            value={simData.sellingPriceJPY} 
                            onChange={e => setSimData({...simData, sellingPriceJPY: Number(e.target.value)})}
                        />
                        <label className="block">仕入れ価格 (USD/外貨):</label>
                        <input 
                            type="number" className="p-2 border rounded w-full" 
                            value={simData.sourcingPriceUSD} 
                            onChange={e => setSimData({...simData, sourcingPriceUSD: Number(e.target.value)})}
                        />
                         <label className="block">為替レート (¥/$):</label>
                        <input 
                            type="number" className="p-2 border rounded w-full" 
                            value={simData.exchangeRate} 
                            onChange={e => setSimData({...simData, exchangeRate: Number(e.target.value)})}
                        />
                        <h4 className="font-semibold text-gray-700 border-b pb-2 mt-6 mb-3">費用設定</h4>
                        <label className="block">平均関税率 (0.xx):</label>
                        <input 
                            type="number" step="0.01" className="p-2 border rounded w-full" 
                            value={simData.customsDutyRate} 
                            onChange={e => setSimData({...simData, customsDutyRate: Number(e.target.value)})}
                        />
                        <label className="block">固定/平均送料 (¥):</label>
                        <input 
                            type="number" className="p-2 border rounded w-full" 
                            value={simData.fixedShippingCost} 
                            onChange={e => setSimData({...simData, fixedShippingCost: Number(e.target.value)})}
                        />
                        
                        <button onClick={handleSaveDraft} className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-150 mt-4">
                            ドラフトとして保存
                        </button>
                    </div>

                    {/* 右: 結果表示 */}
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-700 border-b pb-2 mb-3">計算結果 (利益率: {(simulationResult.profitRate * 100).toFixed(1)}%)</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <p className="font-medium text-gray-600">仕入れ原価 (¥):</p><p className="text-right">¥{simulationResult.sourcingPriceJPY.toLocaleString()}</p>
                            <p className="font-medium text-gray-600">BUYMA手数料 (7.324%):</p><p className="text-right">¥{simulationResult.buymaFee.toLocaleString()}</p>
                            <p className="font-medium text-gray-600">関税/消費税:</p><p className="text-right">¥{simulationResult.customsDuty.toLocaleString()}</p>
                            <p className="font-medium text-gray-600">固定送料:</p><p className="text-right">¥{simulationResult.fixedShippingCost.toLocaleString()}</p>
                            <p className="font-bold text-gray-800 pt-3 border-t">総費用 (原価+経費):</p><p className="font-bold text-right text-gray-800 pt-3 border-t">¥{simulationResult.totalCost.toLocaleString()}</p>
                            <p className="font-extrabold text-lg text-indigo-700 pt-3 border-t">純利益:</p><p className="font-extrabold text-lg text-right text-indigo-700 pt-3 border-t">¥{simulationResult.netProfit.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ResearchAndInventoryCheck = () => {
        // タスク A.4: 価格をシミュレーターに適用
        const applyPriceToSimulator = () => {
            if (fetchResults && fetchResults.sourcingPriceUSD) {
                setSimData(prev => ({
                    ...prev,
                    sourcingPriceUSD: fetchResults.sourcingPriceUSD,
                }));
                setMessage(`仕入れ価格 $${fetchResults.sourcingPriceUSD} をシミュレーターに適用しました。`);
                setActiveTab('simulate'); // シミュレータータブへ移動
            }
        };

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">リサーチ＆在庫確認</h3>

                {/* タスク A.2: リサーチフォームの作成 */}
                <form onSubmit={handleDataFetch} className="grid grid-cols-4 gap-3 mb-6 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                    <input 
                        className="p-2 border rounded col-span-2" 
                        type="text" 
                        placeholder="商品キーワード/型番 (例: Hermes Birkin 30)" 
                        value={productQuery} 
                        onChange={e => setProductQuery(e.target.value)} 
                        disabled={isFetching}
                    />
                    <select 
                        className="p-2 border rounded" 
                        value={supplierId} 
                        onChange={e => setSupplierId(e.target.value)}
                        disabled={isFetching || suppliers.length === 0}
                    >
                        <option value="">-- 検索対象仕入れ先 --</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <button 
                        type="submit" 
                        disabled={isFetching || !productQuery || !supplierId}
                        className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition duration-150 disabled:opacity-50 flex items-center justify-center"
                    >
                        {isFetching ? '調査中...' : 'AI調査を実行'}
                    </button>
                </form>

                {/* タスク A.4 & C.2: 結果表示と連携 */}
                {fetchResults && !fetchResults.error && (
                    <div className="mt-6 p-5 border border-gray-300 rounded-lg bg-white shadow-md">
                        <h4 className="text-lg font-bold text-green-700 mb-3">調査結果サマリー</h4>
                        <p className="text-sm italic mb-4">{fetchResults.summary}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* 左: 仕入れ先情報 */}
                            <div>
                                <h5 className="font-semibold text-gray-800 border-b pb-1 mb-2">仕入れ先情報 ({suppliers.find(s => s.id === supplierId)?.name || 'N/A'})</h5>
                                <p className="text-sm"><strong>価格:</strong> <span className="font-extrabold text-lg text-indigo-600">${fetchResults.sourcingPriceUSD?.toLocaleString() || 'N/A'}</span></p>
                                <p className="text-sm"><strong>在庫:</strong> 
                                    <span className={`px-2 py-0.5 rounded-full text-white text-xs font-bold ml-2 ${getStockInfo(fetchResults.stockStatus).style}`}>
                                        {getStockInfo(fetchResults.stockStatus).icon} {getStockInfo(fetchResults.stockStatus).label}
                                    </span>
                                </p>
                                
                                <button 
                                    onClick={applyPriceToSimulator} 
                                    className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition duration-150 mt-4"
                                    disabled={!fetchResults.sourcingPriceUSD}
                                >
                                    価格をシミュレーターに適用
                                </button>
                            </div>
                            
                            {/* 右: タスク C.2: 日本市場価格比較 */}
                            <div>
                                <h5 className="font-semibold text-gray-800 border-b pb-1 mb-2">日本市場価格比較 (国内競合価格)</h5>
                                <p className="text-sm"><strong>中央値:</strong> <span className="font-extrabold text-lg text-red-600">¥{fetchResults.japaneseMarketPriceMedian?.toLocaleString() || 'N/A'}</span></p>
                                <p className="text-sm text-gray-600 mt-2">※ BUYMA販売価格とこの価格を比較し、価格差を出すことがBUYMA成功の鍵です。</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const DraftListings = () => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [selectedDraft, setSelectedDraft] = useState(null);

        const openModal = (draft) => {
            setSelectedDraft(draft);
            setIsModalOpen(true);
        };
        
        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">出品ドラフト ({drafts.length})</h3>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                <th className="py-2 px-4 border-b">商品名/仕入先</th>
                                <th className="py-2 px-4 border-b">販売価格(¥)</th>
                                <th className="py-2 px-4 border-b">純利益(¥)</th>
                                <th className="py-2 px-4 border-b">利益率(%)</th>
                                <th className="py-2 px-4 border-b">最終確認日</th>
                                <th className="py-2 px-4 border-b">在庫状況</th>
                                <th className="py-2 px-4 border-b">アクション</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drafts.map(d => {
                                const stockInfo = getStockInfo(d.currentStockStatus);
                                return (
                                <tr key={d.id} className="hover:bg-gray-50 border-b text-sm text-gray-700">
                                    <td className="py-2 px-4">
                                        <p className="font-medium">{d.productName}</p>
                                        <p className="text-xs text-gray-500">@{d.supplierName}</p>
                                    </td>
                                    <td className="py-2 px-4">¥{d.sellingPriceJPY?.toLocaleString()}</td>
                                    <td className="py-2 px-4 font-bold text-indigo-700">¥{d.netProfit?.toLocaleString()}</td>
                                    <td className="py-2 px-4">{(d.profitRate * 100).toFixed(1)}%</td>
                                    <td className="py-2 px-4 text-xs">{d.lastChecked?.toLocaleString('ja-JP', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || '未確認'}</td>
                                    <td className="py-2 px-4">
                                        {/* タスク B.2: 視覚的なインジケータ */}
                                        <span className={`px-2 py-1 rounded-full text-white text-xs font-bold ${stockInfo.style}`}>
                                            {stockInfo.icon} {stockInfo.label}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4 space-x-2">
                                        <button onClick={() => openModal(d)} className="text-blue-500 hover:text-blue-700" title="詳細">👀</button>
                                        {/* タスク B.2: 在庫を再確認ボタン */}
                                        <button onClick={() => handleRecheckStock(d)} className="text-purple-500 hover:text-purple-700" title="在庫再確認" disabled={isGlobalLoading}>🔄</button>
                                        <button onClick={() => handleDelete('buyma_drafts', d.id)} className="text-red-500 hover:text-red-700" title="削除">🗑️</button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* 詳細モーダル (既存機能) */}
                {isModalOpen && selectedDraft && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                            <h4 className="text-xl font-bold mb-4">ドラフト詳細: {selectedDraft.productName}</h4>
                            <p>販売価格: ¥{selectedDraft.sellingPriceJPY?.toLocaleString()}</p>
                            <p>純利益: ¥{selectedDraft.netProfit?.toLocaleString()}</p>
                            <p>仕入れ先: {selectedDraft.supplierName}</p>
                            <button onClick={() => setIsModalOpen(false)} className="mt-4 bg-gray-300 p-2 rounded">閉じる</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    // ------------------------------------
    // メインUIレンダリング
    // ------------------------------------

    if (!user) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">Authenticating...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 p-4 bg-white shadow rounded-lg">
                <h1 className="text-3xl font-extrabold text-indigo-700">BUYMA無在庫仕入れ戦略シミュレーター</h1>
            </header>

            {/* Global Message/Alerts (3. alert()の禁止) */}
            {message && (
                <div className="mb-4 p-3 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 flex justify-between items-center">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="text-indigo-600 font-bold ml-4">×</button>
                </div>
            )}
            
            {/* タブナビゲーション */}
            <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setActiveTab('research')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'research' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <span className="mr-2">🔎</span> リサーチ＆在庫確認 {/* タスク A.1: 新しいタブ */}
                </button>
                <button 
                    onClick={() => setActiveTab('simulate')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'simulate' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    シミュレーション
                </button>
                <button 
                    onClick={() => setActiveTab('master')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'master' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    仕入れ先マスタ
                </button>
                <button 
                    onClick={() => setActiveTab('drafts')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'drafts' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    出品ドラフト
                </button>
            </div>

            {/* タブコンテンツ */}
            <div className="space-y-6">
                {activeTab === 'research' && <ResearchAndInventoryCheck />}
                {activeTab === 'simulate' && <SimulatorPanel />}
                {activeTab === 'master' && <SupplierManager />}
                {activeTab === 'drafts' && <DraftListings />}
            </div>
            
            {/* グローバルローディングインジケータ */}
            {isGlobalLoading && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-40">
                    <span className="text-xl text-white font-bold">処理中...</span>
                </div>
            )}
        </div>
    );
};

export default BuymaSourcingSimulator;
// 3. シングルファイル・コンポーネント構造の維持