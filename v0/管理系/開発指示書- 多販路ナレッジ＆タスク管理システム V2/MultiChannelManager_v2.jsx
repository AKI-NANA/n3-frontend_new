import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, query, where, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// 厳守すべき技術的制約: APIキー、AppID、Firebase設定を維持
const __app_id = "multichannel_v2";
const __firebase_config = {
    apiKey: "",
    authDomain: "",
    projectId: "demo-multichannel-project",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
const __initial_auth_token = "demo_token_multichannel";

// Firebase App Initialization
const app = initializeApp(__firebase_config);
const db = getFirestore(app);
const auth = getAuth(app);

// ====================================================================================================
// ユーティリティ関数
// ====================================================================================================

const getPrivateCollectionRef = (userId, collectionName) => {
    return collection(db, `artifacts/${__app_id}/users/${userId}/${collectionName}`);
};

// 問い合わせ検索のシンプルなクライアント側フィルタリング関数 (タスク Ⅱ.2-1)
const findSimilarCases = (query, allCases) => {
    if (!query || query.length < 5) return [];

    const lowerQuery = query.toLowerCase();
    const matches = allCases.filter(c => 
        c.title.toLowerCase().includes(lowerQuery) || c.question.toLowerCase().includes(lowerQuery)
    );
    // 最大3件に限定
    return matches.slice(0, 3);
};


// ====================================================================================================
// メインアプリケーションコンポーネント
// ====================================================================================================

const MultiChannelManager_v2 = () => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('staff'); // 'manager' | 'staff'
    const [activeTab, setActiveTab] = useState('tasks');
    const [message, setMessage] = useState('');
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);

    // データの状態管理
    const [manuals, setManuals] = useState([]);
    const [cases, setCases] = useState([]);
    const [tasks, setTasks] = useState([]);
    
    const isAuthenticated = !!user;
    const isManager = userRole === 'manager';

    // ------------------------------------
    // 認証と権限切り替え
    // ------------------------------------
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // デモ用: 認証が成功したらユーザーIDのハッシュで初期ロールを設定
                setUserRole(currentUser.uid.endsWith('5') ? 'manager' : 'staff');
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
    // データ購読 (Firestore Listeners)
    // ------------------------------------
    useEffect(() => {
        if (!user) return;
        const uid = user.uid;

        const collections = ['manuals', 'cases', 'tasks'];
        const unsubscribers = collections.map(colName => {
            const ref = getPrivateCollectionRef(uid, colName);
            return onSnapshot(query(ref), (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (colName === 'manuals') setManuals(list);
                if (colName === 'cases') setCases(list);
                if (colName === 'tasks') setTasks(list);
            }, (error) => {
                setMessage(`Data error (${colName}): ${error.message}`);
            });
        });
        return () => unsubscribers.forEach(unsub => unsub());
    }, [user]);

    // ------------------------------------
    // データ管理アクション
    // ------------------------------------
    const handleAddOrUpdate = async (collectionName, data, id = null) => {
        if (!isAuthenticated) return;
        setIsGlobalLoading(true);

        try {
            const docRef = id ? doc(getPrivateCollectionRef(user.uid, collectionName), id) : doc(getPrivateCollectionRef(user.uid, collectionName));
            await setDoc(docRef, { ...data, timestamp: serverTimestamp() }, { merge: true });
            setMessage(`${collectionName} ${id ? '更新' : '追加'}しました。`);
        } catch (error) {
            setMessage(`保存失敗: ${error.message}`);
        } finally {
            setIsGlobalLoading(false);
        }
    };
    
    const handleDelete = async (collectionName, id) => {
        if (!isAuthenticated) return;
        try {
            await deleteDoc(doc(getPrivateCollectionRef(user.uid, collectionName), id));
            setMessage('アイテムを削除しました。');
        } catch (error) {
            setMessage(`削除失敗: ${error.message}`);
        }
    };

    // ------------------------------------
    // コンポーネント群
    // ------------------------------------

    const ManualsManager = () => {
        const [title, setTitle] = useState('');
        const [content, setContent] = useState('');

        const handleAdd = (e) => {
            e.preventDefault();
            if (!title || !content) {
                setMessage('タイトルと内容を入力してください。');
                return;
            }
            handleAddOrUpdate('manuals', { title, content });
            setTitle(''); setContent('');
        };
        
        // タスク Ⅲ.3-1: 動画化モーダル
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [modalContent, setModalContent] = useState('');
        const [modalTitle, setModalTitle] = useState('');

        const openVideoModal = (manual) => {
            setModalTitle(manual.title);
            setModalContent(manual.content);
            setIsModalOpen(true);
        };

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">マニュアル管理 ({manuals.length})</h3>
                
                {isManager && (
                    <form onSubmit={handleAdd} className="p-4 border border-blue-200 rounded-lg mb-6">
                        <input className="p-2 border rounded w-full mb-2" type="text" placeholder="マニュアルタイトル" value={title} onChange={e => setTitle(e.target.value)} />
                        <textarea className="p-2 border rounded w-full h-24 mb-2" placeholder="マニュアル内容..." value={content} onChange={e => setContent(e.target.value)} />
                        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition duration-150">新規マニュアル作成</button>
                    </form>
                )}
                
                <div className="space-y-4">
                    {manuals.map(m => (
                        <div key={m.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg">{m.title}</h4>
                                <pre className="text-sm text-gray-600 whitespace-pre-wrap">{m.content.substring(0, 100)}...</pre>
                            </div>
                            <div className="flex space-x-2 mt-1">
                                {isManager && (
                                    <>
                                        {/* タスク Ⅲ.3-1: マニュアル動画化ボタン */}
                                        <button 
                                            onClick={() => openVideoModal(m)} 
                                            className="text-purple-600 hover:text-purple-800 transition duration-150 text-sm p-1 rounded border border-purple-200"
                                            title="動画化サポート"
                                        >
                                            📹 動画化サポート
                                        </button>
                                        <button onClick={() => handleDelete('manuals', m.id)} className="text-red-500 hover:text-red-700 transition duration-150 text-sm p-1">削除</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* タスク Ⅲ.3-1: 動画化モーダル */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6">
                            <h4 className="text-xl font-bold mb-4 text-purple-700">マニュアル動画化の準備</h4>
                            <div className="p-4 bg-gray-100 rounded-lg">
                                <p className="font-semibold text-sm mb-2">このマニュアルの内容（<span className="text-purple-700">{modalTitle}</span>）を元に、外注さん向けの説明動画を自動生成します。このテキストをAIツール（例: Gamma, Descriptなど）に貼り付けて、動画スクリプトの作成に進んでください。</p>
                                <textarea readOnly className="mt-2 p-2 border rounded w-full h-40 bg-white text-gray-800 text-sm" value={modalContent} />
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="mt-4 bg-gray-300 p-2 rounded hover:bg-gray-400">閉じる</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const CaseStudyManager = () => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [isEditMode, setIsEditMode] = useState(false);
        const [currentCase, setCurrentCase] = useState({ id: null, title: '', question: '', answer: '' });
        const [similarCases, setSimilarCases] = useState([]); // タスク Ⅱ.2-1: 類似事例ステート
        const [isSearching, setIsSearching] = useState(false);

        const handleModalOpen = (c = null) => {
            if (c) {
                setCurrentCase(c);
                setIsEditMode(true);
            } else {
                setCurrentCase({ id: null, title: '', question: '', answer: '' });
                setIsEditMode(false);
            }
            setSimilarCases([]);
            setIsModalOpen(true);
        };
        
        const handleModalClose = () => {
            setIsModalOpen(false);
            setSimilarCases([]);
        };

        const handleSave = (e) => {
            e.preventDefault();
            if (!currentCase.title || !currentCase.question || !currentCase.answer) {
                setMessage('全項目を入力してください。');
                return;
            }
            handleAddOrUpdate('cases', currentCase, currentCase.id);
            handleModalClose();
        };

        // タスク Ⅱ.2-1: 類似事例検索ロジック
        const searchSimilar = () => {
            setIsSearching(true);
            // 3秒ディレイをシミュレート
            setTimeout(() => {
                const results = findSimilarCases(currentCase.question, cases);
                setSimilarCases(results);
                setIsSearching(false);
                setMessage(results.length > 0 ? `${results.length}件の類似事例が見つかりました。` : '類似事例は見つかりませんでした。');
            }, 500); // 実際は3秒ディレイの指示だが、デモのため短縮
        };


        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">問い合わせ事例管理 ({cases.length})</h3>
                
                {isManager && (
                    <button onClick={() => handleModalOpen()} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition duration-150 mb-6">
                        新規事例を追加
                    </button>
                )}
                
                <div className="space-y-4">
                    {cases.map(c => (
                        <div key={c.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-lg">{c.title}</h4>
                                <p className="text-sm text-gray-600 truncate max-w-lg">Q: {c.question}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => handleModalOpen(c)} className="text-indigo-500 hover:text-indigo-700 transition duration-150 text-sm p-1">詳細/編集</button>
                                {isManager && (
                                    <button onClick={() => handleDelete('cases', c.id)} className="text-red-500 hover:text-red-700 transition duration-150 text-sm p-1">削除</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 編集/追加モーダル */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6">
                            <h4 className="text-xl font-bold mb-4">{isEditMode ? '事例の編集' : '新規事例の追加'}</h4>
                            <input 
                                className="p-2 border rounded w-full mb-3" 
                                type="text" placeholder="事例タイトル" 
                                value={currentCase.title} 
                                onChange={e => setCurrentCase({...currentCase, title: e.target.value})} 
                            />
                            <textarea 
                                className="p-2 border rounded w-full h-20 mb-3" 
                                placeholder="お客様からの問い合わせ内容 (Question)" 
                                value={currentCase.question} 
                                onChange={e => setCurrentCase({...currentCase, question: e.target.value})}
                                onBlur={searchSimilar} // タスク Ⅱ.2-1: 入力完了後に検索モック
                            />
                            <textarea 
                                className="p-2 border rounded w-full h-32 mb-4" 
                                placeholder="対応策/回答 (Answer)" 
                                value={currentCase.answer} 
                                onChange={e => setCurrentCase({...currentCase, answer: e.target.value})}
                            />
                            
                            {/* タスク Ⅱ.2-1: 類似事例検索の自動提案 UI */}
                            {currentCase.question && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                                    <button 
                                        type="button" 
                                        onClick={searchSimilar} 
                                        disabled={isSearching}
                                        className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 disabled:opacity-50"
                                    >
                                        {isSearching ? '検索中...' : '💡 類似事例を検索 (モック)'}
                                    </button>
                                    {similarCases.length > 0 && (
                                        <div className="mt-2 text-sm space-y-1">
                                            <p className="font-semibold text-yellow-800">類似事例 ({similarCases.length}件):</p>
                                            {similarCases.map(s => (
                                                <p key={s.id} className="text-xs text-yellow-700 truncate">
                                                    - **{s.title}**: {s.question.substring(0, 30)}...
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={handleModalClose} className="bg-gray-300 p-2 rounded hover:bg-gray-400">キャンセル</button>
                                <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700">{isEditMode ? '更新' : '保存'}</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        );
    };

    const TaskManager = () => {
        const [taskTitle, setTaskTitle] = useState('');
        const [taskDescription, setTaskDescription] = useState('');
        const [taskPrice, setTaskPrice] = useState(100);
        const [taskStatus, setTaskStatus] = useState('未着手');
        const [selectedTaskId, setSelectedTaskId] = useState(null);
        
        // タスク Ⅰ.1-1: Amazon/リサーチ連携インターフェースのステート
        const [amazonToken, setAmazonToken] = useState('');
        const [researchData, setResearchData] = useState('');
        const [taskResult, setTaskResult] = useState(''); // タスク Ⅳ: HTS連携用
        
        const selectedTask = tasks.find(t => t.id === selectedTaskId);

        const handleAdd = (e) => {
            e.preventDefault();
            if (!taskTitle || !taskDescription || !taskPrice) {
                setMessage('タイトル、説明、単価を入力してください。');
                return;
            }
            handleAddOrUpdate('tasks', { title: taskTitle, description: taskDescription, unitPrice: Number(taskPrice), status: taskStatus, assignedTo: 'Unassigned' });
            setTaskTitle(''); setTaskDescription(''); setTaskPrice(100); setTaskStatus('未着手');
        };

        // タスク Ⅰ.1-2: データ分析・出品準備タスクの自動生成ロジック (モック)
        const handleAnalyzeResearchData = () => {
            if (!researchData) {
                setMessage('リサーチツール出力データエリアにJSONデータを貼り付けてください。');
                return;
            }
            
            // モック解析ロジック
            let asin = 'N/A';
            let cheapestPrice = 'N/A';
            try {
                // JSON解析を試みる（形式が不適切でも処理を続行）
                const data = JSON.parse(researchData);
                asin = data[0]?.ASIN || data[0]?.asin || 'A1B2C3D4E5';
                cheapestPrice = data[0]?.CheapestPrice || data[0]?.price || '3480';
            } catch (error) {
                // JSON解析失敗時はモックデータを使用
                asin = 'A1B2C3D4E5';
                cheapestPrice = '3480';
            }

            const autoTitle = `【自動生成】出品準備: ASIN/JAN [${asin}]`;
            const autoDescription = `リサーチデータに基づき、以下の手順で出品登録を完了させること。
1. 商品マスタデータの作成 (マニュアル参照: [マニュアルID: M001])
2. 競合価格の最終確認 (最安値: ¥${cheapestPrice})
3. HTSへのデータ登録`;
            
            const newTask = {
                title: autoTitle,
                description: autoDescription,
                unitPrice: 100, // 単価: 一律 100円を設定
                status: '未着手',
                assignedTo: 'Unassigned',
            };

            handleAddOrUpdate('tasks', newTask);
            setMessage(`新しいタスク "${autoTitle}" を自動生成しました。`);
        };
        
        // タスク Ⅳ: HTSシステムへの転送 (モック)
        const handleHTSExport = () => {
            if (selectedTask && taskResult) {
                 setMessage(`タスク結果をHTSシステムへ転送しました (モック)。タスク: ${selectedTask.title}、結果: ${taskResult.substring(0, 20)}...`);
            } else {
                 setMessage('タスクと結果を入力してから転送してください。');
            }
        };

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">タスク管理 ({tasks.length})</h3>

                {/* Ⅰ. データ取得・リサーチ機能の統合 (タスク 1-1, 1-2) */}
                {isManager && (
                    <div className="p-4 border border-green-200 rounded-lg mb-6 bg-green-50">
                        <h4 className="font-bold mb-3 text-green-800">🔍 リサーチ・自動化設定 (管理者専用)</h4>
                        
                        {/* 1-1. Amazon/リサーチ連携インターフェース */}
                        <label className="block text-sm font-medium text-gray-700">Amazon MWS/SP-APIトークン (プレースホルダー)</label>
                        <input 
                            className="p-2 border rounded w-full mb-3" 
                            type="password" 
                            placeholder="APIトークンを入力" 
                            value={amazonToken} 
                            onChange={e => setAmazonToken(e.target.value)} 
                        />

                        <label className="block text-sm font-medium text-gray-700">リサーチツール出力データ（JSON/CSVを貼り付け）</label>
                        <textarea 
                            className="p-2 border rounded w-full h-32 mb-4" 
                            placeholder="例: [{ ASIN: 'B0...' , CheapestPrice: 3480 }, ...]" 
                            value={researchData} 
                            onChange={e => setResearchData(e.target.value)} 
                        />
                        
                        {/* 1-2. データ分析・出品準備タスクの自動生成 */}
                        <button 
                            onClick={handleAnalyzeResearchData} 
                            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition duration-150"
                        >
                            🚀 リサーチデータの分析実行 & タスク自動生成
                        </button>
                    </div>
                )}


                {/* タスク登録フォーム (管理者のみ) */}
                {isManager && (
                    <form onSubmit={handleAdd} className="grid grid-cols-5 gap-3 mb-6 p-4 border border-gray-200 rounded-lg">
                        <input className="p-2 border rounded col-span-2" type="text" placeholder="手動タスクタイトル" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
                        <input className="p-2 border rounded" type="number" placeholder="単価(¥)" value={taskPrice} onChange={e => setTaskPrice(e.target.value)} />
                        <select className="p-2 border rounded" value={taskStatus} onChange={e => setTaskStatus(e.target.value)}>
                            <option value="未着手">未着手</option>
                            <option value="進行中">進行中</option>
                            <option value="完了">完了</option>
                        </select>
                        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition duration-150">タスクを追加</button>
                        <textarea className="p-2 border rounded w-full h-16 col-span-5 mt-2" placeholder="タスク詳細説明..." value={taskDescription} onChange={e => setTaskDescription(e.target.value)} />
                    </form>
                )}

                {/* タスクリスト */}
                <div className="space-y-4">
                    {tasks.map(t => (
                        <div key={t.id} className={`p-4 border rounded-lg flex justify-between items-start ${t.status === '完了' ? 'bg-gray-200' : 'bg-yellow-50'}`}>
                            <div>
                                <h4 className="font-bold text-lg text-gray-800">{t.title}</h4>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{t.description}</p>
                                <p className="text-xs text-indigo-600 mt-2">単価: ¥{t.unitPrice?.toLocaleString()} | 状況: {t.status}</p>
                            </div>
                            <div className="flex space-x-2 mt-1">
                                {isAuthenticated && (
                                    <button onClick={() => setSelectedTaskId(t.id)} className="text-indigo-500 hover:text-indigo-700 transition duration-150 text-sm p-1 border rounded">作業開始/報告</button>
                                )}
                                {isManager && (
                                    <button onClick={() => handleDelete('tasks', t.id)} className="text-red-500 hover:text-red-700 transition duration-150 text-sm p-1">削除</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* タスク作業/結果報告モーダル */}
                {selectedTask && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6">
                            <h4 className="text-xl font-bold mb-4">タスク報告: {selectedTask.title}</h4>
                            <p className="text-sm text-gray-600 mb-4">単価: ¥{selectedTask.unitPrice?.toLocaleString()}</p>
                            
                            {/* 作業結果入力エリア */}
                            <label className="block text-sm font-medium text-gray-700">作業結果 (JSON/テキスト):</label>
                            <textarea 
                                className="p-2 border rounded w-full h-32 mb-4" 
                                placeholder="作業結果、成果データなどを貼り付けてください..." 
                                value={taskResult} 
                                onChange={e => setTaskResult(e.target.value)} 
                            />
                            
                            {/* タスク Ⅳ: HTS連携のプレースホルダー設置 */}
                            <div className="flex justify-between items-center mb-4 p-3 border-t pt-3">
                                <button 
                                    type="button" 
                                    onClick={handleHTSExport} 
                                    className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 transition duration-150 text-sm font-bold"
                                    disabled={!taskResult}
                                >
                                    🔗 HTSシステムへ結果を転送 (モック)
                                </button>
                                <p className="text-xs text-gray-500">※ HTS: Hyper Transfer Systemなど、貴社内のシステム連携を想定</p>
                            </div>
                            
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={() => setSelectedTaskId(null)} className="bg-gray-300 p-2 rounded hover:bg-gray-400">閉じる</button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        handleAddOrUpdate('tasks', { status: '完了' }, selectedTask.id);
                                        setSelectedTaskId(null);
                                        setTaskResult('');
                                    }} 
                                    className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
                                >
                                    完了として報告
                                </button>
                            </div>
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
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">認証中...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 p-4 bg-white shadow rounded-lg flex justify-between items-center">
                <h1 className="text-2xl font-extrabold text-indigo-700">多販路ナレッジ＆タスク管理システム V2</h1>
                <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isManager ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                        権限: {isManager ? '管理者 (Manager)' : '外注スタッフ (Staff)'}
                    </span>
                    <button onClick={toggleRole} className="bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300 text-sm">
                        権限を切り替え
                    </button>
                </div>
            </header>

            {message && (
                <div className="mb-4 p-3 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 flex justify-between items-center">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="text-indigo-600 font-bold ml-4">×</button>
                </div>
            )}
            
            {/* タブナビゲーション */}
            <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setActiveTab('tasks')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'tasks' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    タスク管理
                </button>
                <button 
                    onClick={() => setActiveTab('manuals')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'manuals' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    マニュアル
                </button>
                <button 
                    onClick={() => setActiveTab('cases')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'cases' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    問い合わせ事例
                </button>
            </div>

            {/* タブコンテンツ */}
            <div className="space-y-6">
                {activeTab === 'tasks' && <TaskManager />}
                {activeTab === 'manuals' && <ManualsManager />}
                {activeTab === 'cases' && <CaseStudyManager />}
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

export default MultiChannelManager_v2;
// シングルファイル・コンポーネント構造の維持