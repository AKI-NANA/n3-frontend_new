import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { GoogleGenerativeAI } from '@google/genai';

// 4. 厳守すべき技術的制約: APIキー、AppID、Firebase設定を維持
const API_KEY = ""; // Google Gemini API Key
const __app_id = "premium_price_dashboard";
const __firebase_config = {
    apiKey: "",
    authDomain: "",
    projectId: "demo-price-analysis",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
const __initial_auth_token = "demo_token_45678";

// Firebase App Initialization
const app = initializeApp(__firebase_config);
const db = getFirestore(app);
const auth = getAuth(app);
const gemini = new GoogleGenerativeAI(API_KEY);
const geminiModel = "gemini-2.5-flash-preview-09-2025";

// ====================================================================================================
// ユーティリティ関数
// ====================================================================================================

const getPrivateCollectionRef = (userId, collectionName) => {
    // 4. Firestoreパスの維持: artifacts/{appId}/users/{userId}/{collectionName}
    return collection(db, `artifacts/${__app_id}/users/${userId}/${collectionName}`);
};

/**
 * タスク C.2: ポテンシャル判定の日本語化とスタイル統一
 */
const POTENTIAL_MAP = {
    High: { label: '高', style: 'bg-red-500 text-white', icon: '🔥' },
    Medium: { label: '中', style: 'bg-yellow-400 text-gray-900', icon: '🟡' },
    Low: { label: '低', style: 'bg-gray-400 text-white', icon: '💧' },
};

const getPotentialInfo = (potential) => POTENTIAL_MAP[potential] || POTENTIAL_MAP.Low;


/**
 * タスク A.2: MSRPと相場価格の比較グラフ（テキストベース）を生成
 */
const generateComparisonBar = (msrp, marketPrice) => {
    const MAX_WIDTH = 25;
    const maxVal = Math.max(msrp, marketPrice);
    
    // スケールを最大値で正規化
    const msrpWidth = Math.min(MAX_WIDTH, Math.floor((msrp / maxVal) * MAX_WIDTH));
    const marketWidth = Math.min(MAX_WIDTH, Math.floor((marketPrice / maxVal) * MAX_WIDTH));
    
    // アスキーアート生成
    const msrpBar = `[${'#'.repeat(msrpWidth)}${'-'.repeat(MAX_WIDTH - msrpWidth)}] ¥${msrp}`;
    const marketBar = `[${'#'.repeat(marketWidth)}${'-'.repeat(MAX_WIDTH - marketWidth)}] ¥${marketPrice}`;

    return (
        <div className="font-mono text-sm mt-4 p-3 bg-gray-100 rounded">
            <p className="text-gray-600 mb-1">MSRP: {msrpBar}</p>
            <p className="text-gray-900 font-bold">市場相場: {marketBar}</p>
        </div>
    );
};

// ====================================================================================================
// LLMとの連携ロジック
// ====================================================================================================

const runGeminiAnalysis = async (productName, msrp, retailer, userId) => {
    const systemPrompt = `
        あなたはプロのプレミアム価格アナリストです。
        以下の製品情報に基づき、Google Search Groundingを使って二次流通市場の相場を調査し、製品のプレミアムポテンシャルを分析してください。
        
        ---出力形式の制約---
        結果は必ずJSON形式で出力すること。他の文章は一切含めないこと。
        {
          "potential": "High" | "Medium" | "Low",
          "marketPriceMedian": <数値>, // 二次流通価格の中央値または代表的なレンジの平均値
          "keywords": ["タグ1", "タグ2", "タグ3"], // 市場調査に使用できるキーワード
          "summary": "<100字程度の簡潔な分析サマリー>" 
        }
        ---
    `;

    const userPrompt = `
        製品名: ${productName}
        MSRP（定価）: ¥${msrp}
        ターゲット販売店: ${retailer}
        分析を実行してください。
    `;

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
        // JSONブロックがない場合のフォールバック
        return JSON.parse(response.text); 

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return { error: true, summary: "AI分析中にエラーが発生しました。" };
    }
};


// ====================================================================================================
// カスタムモーダルコンポーネント (タスク A.1)
// ====================================================================================================

const DetailModal = ({ isOpen, onClose, log }) => {
    if (!isOpen || !log) return null;

    const analysis = log.analysis || {};
    const keywords = analysis.keywords || [];
    const marketPriceMedian = analysis.marketPriceMedian || log.msrp; // fallback to msrp

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all scale-100 opacity-100">
                <div className="p-6 border-b flex justify-between items-center">
                    <h4 className="text-xl font-bold text-indigo-700">分析結果詳細: {log.productName}</h4>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <p><strong>MSRP (定価):</strong> ¥{log.msrp}</p>
                        <p><strong>販売店:</strong> {log.targetRetailer}</p>
                        <p><strong>ポテンシャル:</strong> <span className={`font-bold ${getPotentialInfo(analysis.potential).style} px-2 py-1 rounded-full text-xs`}>{getPotentialInfo(analysis.potential).label}</span></p>
                    </div>

                    {/* タスク A.2: MSRPと相場価格の比較グラフ */}
                    <h5 className="font-semibold mt-4 text-gray-800">価格比較</h5>
                    {generateComparisonBar(log.msrp, marketPriceMedian)}

                    <h5 className="font-semibold mt-4 text-gray-800">AI分析サマリー</h5>
                    <p className="bg-blue-50 p-3 rounded text-sm whitespace-pre-wrap">{analysis.summary || 'サマリーがありません。'}</p>

                    <h5 className="font-semibold mt-4 text-gray-800">市場キーワード</h5>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {keywords.length > 0 ? (
                            keywords.map((tag, index) => (
                                <span key={index} className="bg-indigo-100 text-indigo-800 text-xs font-medium px-3 py-1 rounded-full">{tag}</span>
                            ))
                        ) : (
                            <span className="text-gray-500 text-sm">キーワードがありません。</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// ====================================================================================================
// メインアプリケーションコンポーネント
// ====================================================================================================

const PremiumPriceDashboard = () => {
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState('');
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    
    // 入力ステート
    const [productName, setProductName] = useState('');
    const [msrp, setMsrp] = useState('');
    const [targetRetailer, setTargetRetailer] = useState('');
    const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
    
    // タスク B: フィルタリング・ソートステート
    const [potentialFilter, setPotentialFilter] = useState('すべて');
    const [sortBy, setSortBy] = useState('date'); // 'date', 'potential'
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'

    // タスク A.1: 詳細モーダルステート
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    
    // タスク C.3: 入力のバリデーション
    const isMSRPValid = msrp > 0;
    const isFormValid = productName && msrp && targetRetailer && isMSRPValid;


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

        const logsRef = getPrivateCollectionRef(user.uid, 'research_logs');
        setIsGlobalLoading(true);
        const unsubscribeLogs = onSnapshot(query(logsRef), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
            setLogs(list);
            setIsGlobalLoading(false);
        }, (error) => {
            setMessage(`Logs data error: ${error.message}`);
            setIsGlobalLoading(false);
        });

        return () => unsubscribeLogs();
    }, [user]);

    // ------------------------------------
    // データ管理アクション
    // ------------------------------------
    const handleAddLog = async (data) => {
        if (!user) {
            setMessage('Error: Not authenticated.');
            return;
        }
        try {
            const docRef = doc(getPrivateCollectionRef(user.uid, 'research_logs'));
            await setDoc(docRef, { ...data, timestamp: serverTimestamp() });
            setMessage(`分析結果が履歴に保存されました。`);
            // タスク C.1: 入力項目のクリア
            setProductName('');
            setMsrp('');
            setTargetRetailer('');
        } catch (error) {
            setMessage(`Failed to save log: ${error.message}`);
        }
    };

    const handleDeleteLog = async (id) => {
        if (!user) {
            setMessage('Error: Not authenticated.');
            return;
        }
        try {
            await deleteDoc(doc(getPrivateCollectionRef(user.uid, 'research_logs'), id));
            setMessage('履歴アイテムを削除しました。');
        } catch (error) {
            setMessage(`Failed to delete log: ${error.message}`);
        }
    };

    // ------------------------------------
    // AI分析アクション
    // ------------------------------------
    const runPremiumAnalysis = async (e) => {
        e.preventDefault();
        if (!isFormValid || isAnalysisRunning) return;

        setIsAnalysisRunning(true);
        const analysisResult = await runGeminiAnalysis(productName, msrp, targetRetailer, user.uid);
        setIsAnalysisRunning(false);

        if (analysisResult.error) {
            setMessage(analysisResult.summary || 'AI分析が完了しませんでした。');
            return;
        }

        const logData = {
            productName,
            msrp: Number(msrp),
            targetRetailer,
            analysis: analysisResult,
        };
        await handleAddLog(logData);
    };

    // ------------------------------------
    // タスク B: フィルタリングとソートのロジック
    // ------------------------------------
    const filteredAndSortedLogs = useMemo(() => {
        let filtered = logs;

        // 1. ポテンシャルフィルター適用
        if (potentialFilter !== 'すべて') {
            filtered = filtered.filter(log => log.analysis?.potential === potentialFilter);
        }

        // 2. ソート適用
        return filtered.sort((a, b) => {
            let comparison = 0;
            
            if (sortBy === 'potential') {
                const potentialOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                const aPot = potentialOrder[a.analysis?.potential] || 0;
                const bPot = potentialOrder[b.analysis?.potential] || 0;
                comparison = bPot - aPot; // デフォルトは高→低
            } else { // sortBy === 'date'
                const aTime = a.timestamp ? a.timestamp.getTime() : 0;
                const bTime = b.timestamp ? b.timestamp.getTime() : 0;
                comparison = bTime - aTime; // デフォルトは最新→最古
            }
            
            return sortDirection === 'asc' ? -comparison : comparison;
        });
    }, [logs, potentialFilter, sortBy, sortDirection]);

    // ------------------------------------
    // 子コンポーネントのレンダリング関数
    // ------------------------------------

    const ResearchInputPanel = () => {
        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">新規分析</h3>
                <form onSubmit={runPremiumAnalysis} className="grid grid-cols-5 gap-3">
                    <input 
                        className="p-2 border rounded col-span-2" 
                        type="text" 
                        placeholder="製品名 (例: ポケモンカード VSTARユニバース)" 
                        value={productName} 
                        onChange={e => setProductName(e.target.value)} 
                        disabled={isAnalysisRunning}
                    />
                    <input 
                        className={`p-2 border rounded ${!isMSRPValid && msrp !== '' ? 'border-red-500' : ''}`} 
                        type="number" 
                        placeholder="MSRP (定価) ¥" 
                        value={msrp} 
                        onChange={e => setMsrp(e.target.value)} 
                        disabled={isAnalysisRunning}
                    />
                    <input 
                        className="p-2 border rounded" 
                        type="text" 
                        placeholder="ターゲット販売店" 
                        value={targetRetailer} 
                        onChange={e => setTargetRetailer(e.target.value)} 
                        disabled={isAnalysisRunning}
                    />
                    <button 
                        type="submit" 
                        disabled={!isFormValid || isAnalysisRunning}
                        className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isAnalysisRunning ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                分析中
                            </>
                        ) : '分析を実行'}
                    </button>
                </form>
                {/* タスク C.3: バリデーションエラーメッセージ */}
                {!isMSRPValid && msrp !== '' && (
                    <p className="mt-2 text-sm text-red-500">MSRPは正の数で入力してください。</p>
                )}
            </div>
        );
    };

    const ResearchHistory = () => {
        const toggleSort = (key) => {
            if (sortBy === key) {
                setSortDirection(dir => dir === 'asc' ? 'desc' : 'asc');
            } else {
                setSortBy(key);
                setSortDirection('desc'); // デフォルトは最新/高を優先
            }
        };

        const renderSortIcon = (key) => {
            if (sortBy !== key) return '↕️';
            return sortDirection === 'asc' ? '⬆️' : '⬇️';
        };
        
        const openDetailModal = (log) => {
            setSelectedLog(log);
            setIsModalOpen(true);
        };

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg relative">
                <h3 className="text-xl font-bold mb-4 text-gray-800">リサーチ履歴 ({filteredAndSortedLogs.length}件)</h3>
                
                {/* タスク B: フィルターコントロール */}
                <div className="flex space-x-4 mb-4 items-center">
                    <label className="text-gray-600 font-medium">ポテンシャルフィルター:</label>
                    <select 
                        className="p-2 border rounded" 
                        value={potentialFilter} 
                        onChange={e => setPotentialFilter(e.target.value)}
                    >
                        <option value="すべて">すべて</option>
                        <option value="High">高</option>
                        <option value="Medium">中</option>
                        <option value="Low">低</option>
                    </select>
                </div>
                
                {isGlobalLoading ? (
                    <div className="absolute inset-0 bg-gray-100 bg-opacity-70 flex items-center justify-center rounded-xl z-10">
                        <span className="text-lg text-blue-600">データロード中...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                    <th className="py-2 px-4 border-b">商品名</th>
                                    <th className="py-2 px-4 border-b cursor-pointer" onClick={() => toggleSort('potential')}>
                                        ポテンシャル {renderSortIcon('potential')}
                                    </th>
                                    <th className="py-2 px-4 border-b">MSRP (¥)</th>
                                    <th className="py-2 px-4 border-b">相場中央値 (¥)</th>
                                    <th className="py-2 px-4 border-b cursor-pointer" onClick={() => toggleSort('date')}>
                                        調査日 {renderSortIcon('date')}
                                    </th>
                                    <th className="py-2 px-4 border-b">アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedLogs.map(log => {
                                    const info = getPotentialInfo(log.analysis?.potential);
                                    return (
                                    <tr key={log.id} className="hover:bg-gray-50 border-b text-sm text-gray-700">
                                        <td className="py-2 px-4 max-w-xs truncate">{log.productName}</td>
                                        <td className="py-2 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${info.style}`}>
                                                {info.icon} {info.label}
                                            </span>
                                        </td>
                                        <td className="py-2 px-4">¥{log.msrp}</td>
                                        <td className="py-2 px-4">¥{log.analysis?.marketPriceMedian || 'N/A'}</td>
                                        <td className="py-2 px-4">
                                            {log.timestamp ? log.timestamp.toLocaleString('ja-JP') : 'N/A'}
                                        </td>
                                        <td className="py-2 px-4 space-x-2">
                                            {/* タスク A.1: 詳細を見るボタン */}
                                            <button 
                                                onClick={() => openDetailModal(log)} 
                                                className="text-indigo-500 hover:text-indigo-700 transition duration-150"
                                                title="詳細を見る"
                                            >
                                                👁️
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteLog(log.id)} 
                                                className="text-red-500 hover:text-red-700 transition duration-150"
                                                title="削除"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 p-4 bg-white shadow rounded-lg">
                <h1 className="text-3xl font-extrabold text-indigo-700">プレミアム価格分析ダッシュボード</h1>
            </header>

            {/* Global Message/Alerts (6. alert()の禁止) */}
            {message && (
                <div className="mb-4 p-3 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 flex justify-between items-center">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="text-indigo-600 font-bold ml-4">×</button>
                </div>
            )}
            
            <div className="space-y-6">
                <ResearchInputPanel />
                <ResearchHistory />
            </div>

            {/* タスク A.1: 詳細モーダルの設置 */}
            <DetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} log={selectedLog} />
        </div>
    );
};

export default PremiumPriceDashboard;
// 4. シングルファイル・コンポーネント構造の維持