'use client'
// FIREBASE_DISABLED_MODE: このツールはFirebase機能なしで動作します（表示のみ）

import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Package, TrendingUp, Loader2, XCircle, DollarSign, Aperture } from 'lucide-react';

// Firebase設定とAPIキー
const API_KEY = ""; 
// グローバル変数から設定を取得 (Canvas環境必須)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Gemini API設定
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// MARK: - Firestoreユーティリティ関数
let db;
let auth;

/**
 * ユーザーIDとコレクション名からFirestoreのコレクションパスを生成します。
 */
const getCollectionPath = (userId, collectionName) => {
  return `artifacts/${appId}/users/${userId}/${collectionName}`;
};

// MARK: - メインコンポーネント
const App = () => {
  // Firebase Auth State
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Data States
  const [researchLogs, setResearchLogs] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('research'); // 'research' | 'logs'
  
  // Research Input States
  const [productName, setProductName] = useState('');
  const [msrp, setMsrp] = useState('');
  const [targetRetailer, setTargetRetailer] = useState('');
  
  // Analysis Result State
  const [analysisResult, setAnalysisResult] = useState(null);

  // MARK: - 初期化と認証
  useEffect(() => {
    if (!firebaseConfig) {
        setError("Firebase設定がありません。環境を確認してください。");
        return;
    }
    
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        const signIn = async () => {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            } else {
                await signIn();
            }
        });

        return () => unsubscribe();
    } catch (e) {
        // Firebase initialization disabled
        setError("Firebaseの初期化に失敗しました。");
    }
  }, []);

  // MARK: - Firestore データ同期 (onSnapshot)
  useEffect(() => {
    if (!isAuthReady || !userId) return;

    const logsRef = collection(db, getCollectionPath(userId, 'premium_research_logs'));
    const unsubscribeLogs = onSnapshot(query(logsRef), (snapshot) => {
      const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResearchLogs(logList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (e) => {
        console.error("Logs Snapshot Error:", e);
        setError("リサーチ履歴の取得に失敗しました。");
    });

    return () => unsubscribeLogs();
  }, [isAuthReady, userId]);


  // MARK: - LLMによる価格分析ロジック (Google Search groundingを使用)
  const runPremiumAnalysis = async () => {
    if (!productName || !msrp || isNaN(parseInt(msrp))) {
      setError("商品名とメーカー希望小売価格（MSRP）は必須です。");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    const msrpInt = parseInt(msrp, 10);
    const retailerInfo = targetRetailer ? `（${targetRetailer}などで販売）` : '';

    // LLMへのシステムプロンプト
    const systemPrompt = `
      あなたは、日本の転売市場とプレミアム価格の分析に特化した専門家です。
      Google Searchの結果を基に、以下のタスクを実行してください。

      **【タスクと出力ルール】**
      1.  Google Searchの結果から、この商品の「現在の二次流通市場での相場価格（買取価格または転売価格）」を推定してください。
      2.  指定されたMSRP（定価）と二次流通相場を比較し、「予想されるプレミアム率（利益率ではない）」を算出してください。（例: 相場15,000円 / MSRP 10,000円 = プレミアム率50%）
      3.  以下の基準に基づき、総合的な「プレミアムポテンシャル」を判定してください。
          - 高 (High): 予想プレミアム率が25%以上、かつ需要が高いキーワード（抽選, 定価割れなし）が見られる場合
          - 中 (Medium): 予想プレミアム率が10%～25%で、相場が安定している場合
          - 低 (Low): 予想プレミアム率が10%未満、または定価割れが見られる場合
      4.  分析結果をJSON形式で出力してください。

      **【JSONスキーマ】**
      \`\`\`json
      {
        "potential": "High" | "Medium" | "Low",
        "secondaryPriceRange": "現在の二次流通価格の相場帯（例: 12,000円〜15,000円）",
        "premiumRatio": "予想されるプレミアム率（例: +25%）",
        "keywords": ["転売", "抽選", "定価割れ", "相場"] (分析で見られた重要なキーワード),
        "summary": "分析結果の要約と仕入れ判断に関するアドバイス（日本語で簡潔に）"
      }
      \`\`\`
    `;

    // LLMへのユーザープロンプトとGoogle Searchの実行
    const userQuery = `
      商品名: ${productName}
      MSRP (定価): ${msrpInt}円
      ターゲット販売店情報: ${retailerInfo}

      この商品の現在の二次流通相場を調査し、MSRPと比較してプレミアムポテンシャルを判定してください。
    `;

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userQuery }] }],
                tools: [{ "google_search": {} }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            potential: { type: "STRING", enum: ["High", "Medium", "Low"] },
                            secondaryPriceRange: { type: "STRING" },
                            premiumRatio: { type: "STRING" },
                            keywords: { type: "ARRAY", items: { type: "STRING" } },
                            summary: { type: "STRING" }
                        }
                    }
                }
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (jsonText) {
            const parsedJson = JSON.parse(jsonText);
            setAnalysisResult(parsedJson);
            
            // 履歴に保存
            await addDoc(collection(db, getCollectionPath(userId, 'premium_research_logs')), {
                productName,
                msrp: msrpInt,
                retailer: targetRetailer,
                analysis: parsedJson,
                createdAt: serverTimestamp(),
            });

        } else {
            throw new Error("分析結果の取得に失敗しました。AIからの応答がありません。");
        }
    } catch (e) {
        console.error("Analysis Error:", e);
        setError("分析中にエラーが発生しました。時間を置いて再度お試しください。");
    } finally {
        setLoading(false);
    }
  };

  const deleteLog = async (id) => {
    if (!db || !userId) return;
    if (window.confirm('このリサーチ履歴を削除しますか？')) {
        try {
            await deleteDoc(doc(db, getCollectionPath(userId, 'premium_research_logs'), id));
        } catch (e) {
            console.error("Error deleting document:", e);
            setError("履歴の削除に失敗しました。");
        }
    }
  };

  // 認証完了までローディング
  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
        <p className="ml-3 text-gray-700">システム初期化中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10 font-sans antialiased">
      <script src="https://cdn.tailwindcss.com"></script>
      <div className="max-w-6xl mx-auto">
        
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-red-600 mr-3" />
            プレミアム価格分析ダッシュボード
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            仕入れ前の戦略立案をサポート。商品名と定価から二次流通相場を調査し、プレミアムポテンシャルをAIが判定します。
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
        <nav className="flex space-x-2 border-b border-gray-200 mb-6">
          <TabButton icon={Search} label="新規リサーチ" id="research" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton icon={Package} label="リサーチ履歴" id="logs" activeTab={activeTab} onClick={setActiveTab} count={researchLogs.length} />
        </nav>
        
        {/* コンテンツエリア */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl">
          {activeTab === 'research' && (
            <ResearchPanel
                productName={productName}
                setProductName={setProductName}
                msrp={msrp}
                setMsrp={setMsrp}
                targetRetailer={targetRetailer}
                setTargetRetailer={setTargetRetailer}
                onAnalyze={runPremiumAnalysis}
                analysisResult={analysisResult}
                isLoading={loading}
            />
          )}
          {activeTab === 'logs' && (
            <ResearchHistory logs={researchLogs} onDelete={deleteLog} />
          )}
        </div>
      </div>
      <style jsx>{`
        .input-label { @apply block text-sm font-medium text-gray-700 mb-1; }
        .input-style { @apply w-full p-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 transition shadow-sm; }
        .table-header { @apply px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider; }
        .table-cell { @apply px-4 py-3 whitespace-normal text-sm text-gray-800; }
        .potential-high { @apply bg-red-600 text-white font-bold; }
        .potential-medium { @apply bg-yellow-400 text-gray-900 font-bold; }
        .potential-low { @apply bg-green-500 text-white font-bold; }
      `}</style>
    </div>
  );
};

// MARK: - Sub Components (UI Elements)

const TabButton = ({ icon: Icon, label, id, activeTab, onClick, count }) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${
            activeTab === id
                ? 'text-red-700 border-b-4 border-red-500 bg-red-50'
                : 'text-gray-600 hover:text-red-500 hover:bg-gray-100 border-b-4 border-transparent'
        }`}
    >
        <Icon className="w-5 h-5 mr-2" />
        {label}
        {count !== undefined && <span className="ml-2 px-2 py-0.5 text-xs bg-red-200 text-red-800 rounded-full">{count}</span>}
    </button>
);

const ResearchPanel = ({ productName, setProductName, msrp, setMsrp, targetRetailer, setTargetRetailer, onAnalyze, analysisResult, isLoading }) => {
    
    const isReady = productName.trim() && msrp.trim() && !isNaN(parseInt(msrp));

    const getPotentialStyles = (potential) => {
        switch (potential) {
            case 'High': return 'potential-high';
            case 'Medium': return 'potential-medium';
            case 'Low': return 'potential-low';
            default: return 'bg-gray-300 text-gray-800';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左側: 入力フォーム */}
            <div className="lg:col-span-1 space-y-6 p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Aperture className="w-5 h-5 mr-2 text-red-500" />
                    リサーチ対象の入力
                </h2>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onAnalyze(); }}>
                    <div>
                        <label className="input-label">商品名（型番含む）<span className="text-red-500">*</span></label>
                        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="例: NINTENDO SWITCH 有機ELモデル" className="input-style" disabled={isLoading} />
                    </div>
                    <div>
                        <label className="input-label">メーカー希望小売価格 (MSRP)<span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input type="number" value={msrp} onChange={(e) => setMsrp(e.target.value)} placeholder="例: 37980" className="input-style pr-10" disabled={isLoading} />
                            <DollarSign className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
                        </div>
                    </div>
                    <div>
                        <label className="input-label">ターゲットの一次販売店情報</label>
                        <input type="text" value={targetRetailer} onChange={(e) => setTargetRetailer(e.target.value)} placeholder="例: ポケモンセンターオンライン、ヨドバシカメラ" className="input-style" disabled={isLoading} />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!isReady || isLoading}
                        className="w-full px-6 py-3 bg-red-600 text-white font-extrabold text-lg rounded-xl hover:bg-red-700 transition shadow-xl disabled:opacity-50 flex items-center justify-center mt-6"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-3" />
                                AIが市場を分析中...
                            </>
                        ) : (
                            <>
                                <Search className="w-5 h-5 mr-3" />
                                プレミアムポテンシャルを分析
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            {/* 右側: 分析結果 */}
            <div className="lg:col-span-2 space-y-6 p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-inner">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-red-500" />
                    分析結果
                </h2>

                {analysisResult ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg shadow-md">
                            <p className="text-gray-600 font-semibold">総合ポテンシャル判定:</p>
                            <span className={`px-4 py-2 rounded-full text-lg ${getPotentialStyles(analysisResult.potential)}`}>
                                {analysisResult.potential === 'High' ? '高' : analysisResult.potential === 'Medium' ? '中' : '低'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <StatCard title="二次流通相場帯" value={analysisResult.secondaryPriceRange} icon={DollarSign} />
                            <StatCard title="予想プレミアム率" value={analysisResult.premiumRatio} icon={TrendingUp} />
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
                            <h4 className="font-semibold text-gray-700 mb-2">AI分析サマリー:</h4>
                            <p className="text-gray-800 whitespace-pre-wrap">{analysisResult.summary}</p>
                        </div>

                        <div className="p-4 bg-red-50 rounded-lg border border-red-300 shadow-sm">
                            <h4 className="font-semibold text-red-800 mb-2">市場キーワード:</h4>
                            <div className="flex flex-wrap gap-2">
                                {analysisResult.keywords.map((kw, index) => (
                                    <span key={index} className="px-3 py-1 text-xs font-medium bg-red-200 text-red-800 rounded-full">{kw}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 bg-white p-6 rounded-lg border-2 border-dashed border-gray-100">
                        <Search className="w-8 h-8 mb-3" />
                        <p>商品名とMSRPを入力し、「プレミアムポテンシャルを分析」ボタンを押して分析を開始してください。</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon }) => (
    <div className="p-4 bg-white rounded-lg border border-gray-300 shadow-sm flex items-center space-x-3">
        <div className="p-2 bg-red-100 rounded-full text-red-600">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-gray-500 text-xs uppercase">{title}</p>
            <p className="font-semibold text-gray-900 text-base">{value}</p>
        </div>
    </div>
);

// リサーチ履歴コンポーネント
const ResearchHistory = ({ logs, onDelete }) => {
    
    const getPotentialStyles = (potential) => {
        switch (potential) {
            case 'High': return 'potential-high';
            case 'Medium': return 'potential-medium';
            case 'Low': return 'potential-low';
            default: return 'bg-gray-300 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Package className="w-6 h-6 mr-2 text-red-500" />
                リサーチ履歴ログ
            </h2>
            
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="table-header w-1/4">商品名</th>
                            <th className="table-header w-1/6 text-right">MSRP</th>
                            <th className="table-header w-1/6 text-center">ポテンシャル</th>
                            <th className="table-header w-1/4">相場 & プレミアム率</th>
                            <th className="table-header w-1/6 text-right">調査日</th>
                            <th className="table-header w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.length === 0 ? (
                            <tr><td colSpan="6" className="py-8 text-center text-gray-500">リサーチ履歴はまだありません。新規リサーチを行ってください。</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-red-50 transition">
                                    <td className="table-cell font-medium">{log.productName}</td>
                                    <td className="table-cell text-right font-mono text-gray-700">{log.msrp ? log.msrp.toLocaleString() : '---'}円</td>
                                    <td className="table-cell text-center">
                                        <span className={`px-3 py-1 text-xs rounded-full ${getPotentialStyles(log.analysis?.potential)}`}>
                                            {log.analysis?.potential === 'High' ? '高' : log.analysis?.potential === 'Medium' ? '中' : '低'}
                                        </span>
                                    </td>
                                    <td className="table-cell text-xs">
                                        <p className="text-gray-800 font-semibold">{log.analysis?.secondaryPriceRange || '---'}</p>
                                        <p className="text-red-600 font-medium">{log.analysis?.premiumRatio || '---'}</p>
                                    </td>
                                    <td className="table-cell text-right text-gray-500 text-xs">
                                        {log.createdAt?.toDate().toLocaleDateString('ja-JP') || '---'}
                                    </td>
                                    <td className="table-cell text-right">
                                        <button 
                                            onClick={() => onDelete(log.id)}
                                            className="p-1 text-red-500 hover:bg-red-100 rounded-full transition"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
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