'use client'
// FIREBASE_DISABLED_MODE: このツールはFirebase機能なしで動作します（表示のみ）

import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, query, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Package, Building, Mail, Loader2, RefreshCw, XCircle, ArrowRightCircle, Repeat, CheckCircle, Search, Trash2 } from 'lucide-react';

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
 * @param {string} userId - 現在のユーザーID
 * @param {string} collectionName - コレクション名
 * @returns {string} - Firestoreのパス
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
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'suppliers' | 'email'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedEmail, setGeneratedEmail] = useState(null);

  // Email Generation States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [requestType, setRequestType] = useState('wholesale');
  const [userEmail, setUserEmail] = useState('your.email@example.com');
  const [additionalNotes, setAdditionalNotes] = useState('Amazonでの安定した販売チャネルを持ち、貴社製品の拡販に貢献できると確信しております。');

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

    // 1. 商品リストの同期
    const productsRef = collection(db, getCollectionPath(userId, 'sourcing_products'));
    const unsubscribeProducts = onSnapshot(query(productsRef), (snapshot) => {
      const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (e) => {
        console.error("Products Snapshot Error:", e);
        setError("商品リストの取得に失敗しました。");
    });

    // 2. 仕入れ先リストの同期
    const suppliersRef = collection(db, getCollectionPath(userId, 'supplier_contacts'));
    const unsubscribeSuppliers = onSnapshot(query(suppliersRef), (snapshot) => {
      const supplierList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuppliers(supplierList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (e) => {
        console.error("Suppliers Snapshot Error:", e);
        setError("仕入れ先リストの取得に失敗しました。");
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSuppliers();
    };
  }, [isAuthReady, userId]);

  // MARK: - データ管理アクション
  const handleAddProduct = async (name) => {
    if (!db || !userId || !name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, getCollectionPath(userId, 'sourcing_products')), {
        name,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error adding product:", e);
      setError("商品登録に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (name, url, isRepeat) => {
    if (!db || !userId || !name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, getCollectionPath(userId, 'supplier_contacts')), {
        companyName: name,
        websiteUrl: url,
        isRepeatCandidate: isRepeat,
        lastContacted: null,
        notes: '',
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error adding supplier:", e);
      setError("仕入れ先登録に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (collectionName, id) => {
    if (!db || !userId || !id) return;
    if (window.confirm(`この項目を削除しますか？`)) {
        try {
            await deleteDoc(doc(db, getCollectionPath(userId, collectionName), id));
        } catch (e) {
            console.error("Error deleting document:", e);
            setError("削除に失敗しました。");
        }
    }
  };

  const toggleRepeatCandidate = async (supplier) => {
    if (!db || !userId) return;
    try {
      await updateDoc(doc(db, getCollectionPath(userId, 'supplier_contacts'), supplier.id), {
        isRepeatCandidate: !supplier.isRepeatCandidate,
      });
    } catch (e) {
      console.error("Error toggling repeat candidate:", e);
      setError("リピートフラグの更新に失敗しました。");
    }
  };

  // MARK: - LLMによるメール生成ロジック
  const generateEmail = async () => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

    if (!selectedProduct || !selectedSupplier || !userEmail) {
      setError("商品、仕入れ先、ご自身のメールアドレスは必須です。");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedEmail(null);

    // 依頼内容に基づいて動的にプロンプトを作成
    const requestDetails = requestType === 'wholesale'
      ? '新規取引による商品の卸販売（仕入れ）の相談'
      : '独占契約または共同開発を視野に入れたOEM（受託製造）の相談';
      
    const systemPrompt = `
      あなたは、日本のビジネス慣習、特にメーカーや問屋への初回の仕入れ・OEM依頼メールの作成に特化したプロフェッショナルなビジネスライターです。
      以下の情報を基に、誠実かつ簡潔で、相手に安心感を与える丁寧なメール本文を作成してください。

      **【出力ルール】**
      1. 件名から本文、署名まで、全てを一つのプレーンテキストとして出力してください。
      2. 署名部分の自分の会社名や氏名は、プレースホルダーとして「[貴社の会社名/屋号]」「[貴社の氏名]」を使用してください。
      3. 目的（卸売またはOEM）を明確にし、なぜ相手企業を選んだのかという具体的な根拠（商品名）を盛り込んでください。
      4. 宛名は「ご担当者様」としてください。
    `;

    const userQuery = `
      以下の情報に基づき、初回の問い合わせメールを作成してください。

      **仕入れ先情報:**
      - 企業名: ${selectedSupplier.companyName}
      - ウェブサイト: ${selectedSupplier.websiteUrl || '情報なし'}

      **依頼商品:**
      - 検討中の商品: ${selectedProduct.name}

      **依頼目的:**
      - ${requestDetails}
      
      **自社の強み・補足事項:**
      - ${additionalNotes}

      **返信先メールアドレス:**
      - ${userEmail}
    `;

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText) {
            setGeneratedEmail(generatedText);
            setActiveTab('email'); // 結果タブへ移動
        } else {
            throw new Error("メールの生成に失敗しました。AIからの応答がありません。");
        }
    } catch (e) {
        console.error("Gemini API Error:", e);
        setError("メール生成中にエラーが発生しました。時間を置いて再度お試しください。");
    } finally {
        setLoading(false);
    }
  };

  // UI Utilities
  const handleCopy = useCallback(() => {
    if (generatedEmail) {
      document.execCommand('copy', false, generatedEmail);
      alert('メール本文をクリップボードにコピーしました。');
    }
  }, [generatedEmail]);
  
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
            <Search className="w-7 h-7 text-blue-600 mr-3" />
            製品主導型 仕入れ先管理システム
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            仕入れたい商品を起点に問屋・メーカー情報を整理し、AIが初回交渉メールを自動生成します。
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
          <TabButton icon={Package} label="仕入対象商品リスト" id="products" activeTab={activeTab} onClick={setActiveTab} count={products.length} />
          <TabButton icon={Building} label="仕入れ先コンタクト管理" id="suppliers" activeTab={activeTab} onClick={setActiveTab} count={suppliers.length} />
          <TabButton icon={Mail} label="AI交渉メール作成" id="email" activeTab={activeTab} onClick={setActiveTab} />
        </nav>
        
        {/* コンテンツエリア */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl">
          {activeTab === 'products' && (
            <ProductSourcingList 
                products={products} 
                onAddProduct={handleAddProduct} 
                onDelete={id => handleDelete('sourcing_products', id)} 
                isLoading={loading}
            />
          )}
          {activeTab === 'suppliers' && (
            <SupplierContactManager 
                suppliers={suppliers} 
                onAddSupplier={handleAddSupplier} 
                onDelete={id => handleDelete('supplier_contacts', id)} 
                onToggleRepeat={toggleRepeatCandidate} 
                isLoading={loading}
            />
          )}
          {activeTab === 'email' && (
            <EmailGeneratorPanel
                products={products}
                suppliers={suppliers}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                additionalNotes={additionalNotes}
                setAdditionalNotes={setAdditionalNotes}
                selectedProductId={selectedProductId}
                setSelectedProductId={setSelectedProductId}
                selectedSupplierId={selectedSupplierId}
                setSelectedSupplierId={setSelectedSupplierId}
                requestType={requestType}
                setRequestType={setRequestType}
                onGenerate={generateEmail}
                generatedEmail={generatedEmail}
                onCopy={handleCopy}
                isLoading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// MARK: - Sub Components (UI Elements)

const TabButton = ({ icon: Icon, label, id, activeTab, onClick, count }) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${
            activeTab === id
                ? 'text-blue-700 border-b-4 border-blue-500 bg-blue-50'
                : 'text-gray-600 hover:text-blue-500 hover:bg-gray-100 border-b-4 border-transparent'
        }`}
    >
        <Icon className="w-5 h-5 mr-2" />
        {label}
        {count !== undefined && <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full">{count}</span>}
    </button>
);

// 欲しい商品リスト管理コンポーネント
const ProductSourcingList = ({ products, onAddProduct, onDelete, isLoading }) => {
    const [newProductName, setNewProductName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newProductName.trim()) {
            onAddProduct(newProductName.trim());
            setNewProductName('');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Package className="w-6 h-6 mr-2 text-blue-500" />
                仕入れたい商品リスト
            </h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 p-4 bg-blue-50 rounded-lg shadow-inner">
                <input 
                    type="text" 
                    value={newProductName} 
                    onChange={(e) => setNewProductName(e.target.value)} 
                    placeholder="例: Amazonで人気のアウトドアチェア (SKU名)" 
                    className="flex-grow p-3 border border-blue-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={!newProductName.trim() || isLoading}
                    className="flex-shrink-0 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex items-center justify-center"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '商品を追加'}
                </button>
            </form>

            <ul className="space-y-3">
                {products.length === 0 ? (
                    <p className="text-gray-500 p-4 text-center border rounded-lg">まだ商品が登録されていません。上のフォームから登録を始めましょう。</p>
                ) : (
                    products.map(product => (
                        <li key={product.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <span className="font-medium text-gray-800">{product.name}</span>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">追加日: {product.createdAt?.toDate().toLocaleDateString('ja-JP') || '---'}</span>
                                <button 
                                    onClick={() => onDelete(product.id)}
                                    className="p-1 text-red-500 hover:bg-red-100 rounded-full transition"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

// 仕入れ先コンタクト管理コンポーネント
const SupplierContactManager = ({ suppliers, onAddSupplier, onDelete, onToggleRepeat, isLoading }) => {
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
    const [newIsRepeatCandidate, setNewIsRepeatCandidate] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newCompanyName.trim()) {
            onAddSupplier(newCompanyName.trim(), newWebsiteUrl.trim(), newIsRepeatCandidate);
            setNewCompanyName('');
            setNewWebsiteUrl('');
            setNewIsRepeatCandidate(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Building className="w-6 h-6 mr-2 text-blue-500" />
                仕入れ先コンタクト管理
            </h2>
            
            <form onSubmit={handleSubmit} className="p-4 bg-green-50 rounded-lg shadow-inner grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                    <input type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="企業名/問屋名 *" className="w-full p-3 border border-green-300 rounded-lg focus:ring-green-500 focus:border-green-500" disabled={isLoading} />
                </div>
                <div className="md:col-span-1">
                    <input type="url" value={newWebsiteUrl} onChange={(e) => setNewWebsiteUrl(e.target.value)} placeholder="ウェブサイトURL" className="w-full p-3 border border-green-300 rounded-lg focus:ring-green-500 focus:border-green-500" disabled={isLoading} />
                </div>
                <div className="flex items-center justify-center space-x-2 md:col-span-1 p-2 bg-white rounded-lg border border-green-300">
                    <input type="checkbox" id="repeat-check" checked={newIsRepeatCandidate} onChange={(e) => setNewIsRepeatCandidate(e.target.checked)} className="form-checkbox h-5 w-5 text-green-600 rounded" disabled={isLoading} />
                    <label htmlFor="repeat-check" className="text-sm font-medium text-gray-700">リピート候補</label>
                </div>
                <button type="submit" disabled={!newCompanyName.trim() || isLoading} className="md:col-span-1 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition shadow-md disabled:opacity-50 flex items-center justify-center">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '仕入れ先を追加'}
                </button>
            </form>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="table-header w-1/4">企業名</th>
                            <th className="table-header w-1/4">ウェブサイト</th>
                            <th className="table-header w-1/4 text-center">リピート候補</th>
                            <th className="table-header w-1/4 text-right">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {suppliers.length === 0 ? (
                            <tr><td colSpan="4" className="py-4 text-center text-gray-500">まだ仕入れ先が登録されていません。</td></tr>
                        ) : (
                            suppliers.map(supplier => (
                                <tr key={supplier.id} className="hover:bg-gray-50">
                                    <td className="table-cell font-medium">{supplier.companyName}</td>
                                    <td className="table-cell">
                                        {supplier.websiteUrl ? (
                                            <a href={supplier.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block max-w-[150px]">{supplier.websiteUrl}</a>
                                        ) : '---'}
                                    </td>
                                    <td className="table-cell text-center">
                                        <button 
                                            onClick={() => onToggleRepeat(supplier)}
                                            className={`p-2 rounded-full transition-all duration-300 ${
                                                supplier.isRepeatCandidate ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                            }`}
                                            title="リピート候補としてマーク"
                                        >
                                            <Repeat className="w-5 h-5" />
                                        </button>
                                    </td>
                                    <td className="table-cell text-right">
                                        <button 
                                            onClick={() => onDelete(supplier.id)}
                                            className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"
                                        >
                                            <Trash2 className="w-5 h-5" />
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

// AI交渉メール作成パネルコンポーネント
const EmailGeneratorPanel = ({
    products, suppliers, userEmail, setUserEmail, additionalNotes, setAdditionalNotes,
    selectedProductId, setSelectedProductId, selectedSupplierId, setSelectedSupplierId,
    requestType, setRequestType, onGenerate, generatedEmail, onCopy, isLoading
}) => {
    
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

    const isReadyToGenerate = selectedProductId && selectedSupplierId && userEmail && !isLoading;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Mail className="w-6 h-6 mr-2 text-blue-500" />
                AI交渉メール作成アシスタント
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                {/* 左側: 入力と選択 */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                        <ArrowRightCircle className="w-5 h-5 mr-2" />
                        メールの条件設定
                    </h3>
                    
                    <div>
                        <label className="input-label">対象商品を選択 <span className="text-red-500">*</span></label>
                        <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="input-style">
                            <option value="">--- 商品を選択 ---</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        {!products.length && <p className="text-xs text-red-500 mt-1">※仕入対象商品リストに商品を登録してください。</p>}
                    </div>

                    <div>
                        <label className="input-label">仕入れ先を選択 <span className="text-red-500">*</span></label>
                        <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="input-style">
                            <option value="">--- 仕入れ先を選択 ---</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.companyName} {s.isRepeatCandidate && ' (リピート候補)'}</option>
                            ))}
                        </select>
                        {!suppliers.length && <p className="text-xs text-red-500 mt-1">※仕入れ先コンタクト管理に企業を登録してください。</p>}
                    </div>
                    
                    <div>
                        <label className="input-label">依頼目的</label>
                        <div className="flex space-x-4">
                            <button 
                                type="button"
                                onClick={() => setRequestType('wholesale')} 
                                className={`request-button ${requestType === 'wholesale' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
                            >
                                卸販売 (仕入れ) 依頼
                            </button>
                            <button 
                                type="button"
                                onClick={() => setRequestType('oem')} 
                                className={`request-button ${requestType === 'oem' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
                            >
                                OEM / 共同開発 相談
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="input-label">ご自身の連絡先メールアドレス <span className="text-red-500">*</span></label>
                        <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="your.email@example.com" className="input-style" />
                    </div>
                    
                    <div>
                        <label className="input-label">メールに盛り込む自社の強み・補足事項</label>
                        <textarea rows="3" value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="例: 楽天市場/Yahoo!にも販路あり、SNSフォロワー数5万、など具体的な強みを記載" className="input-style"></textarea>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={onGenerate} 
                            disabled={!isReadyToGenerate}
                            className="w-full px-6 py-3 bg-red-600 text-white font-extrabold text-lg rounded-xl hover:bg-red-700 transition shadow-xl disabled:opacity-50 flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-3" />
                                    AIがメールを作成中...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5 mr-3" />
                                    交渉メールを自動生成する
                                </>
                            )}
                        </button>
                    </div>

                </div>

                {/* 右側: 結果表示 */}
                <div className="space-y-4 border-l md:border-l-2 border-gray-200 md:pl-6 pt-4 md:pt-0">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        生成結果
                    </h3>
                    
                    {generatedEmail ? (
                        <>
                            <div className="p-4 bg-white rounded-lg whitespace-pre-wrap text-sm border border-gray-300 relative h-[450px] overflow-y-scroll shadow-inner">
                                <p className="font-bold text-blue-700 mb-2">【AI生成メール本文】</p>
                                {generatedEmail}
                            </div>
                            
                            <button 
                                onClick={onCopy} 
                                className="w-full px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition shadow-md flex items-center justify-center"
                            >
                                <Mail className="w-5 h-5 mr-2" />
                                メール本文をコピー
                            </button>

                            <p className="text-xs text-gray-600 mt-2">
                                **注意**: プレースホルダー（`[貴社の会社名/屋号]`など）は、必ずご自身の情報に置き換えてから送信してください。
                            </p>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 bg-white p-6 rounded-lg border-2 border-dashed border-gray-100">
                            <Mail className="w-8 h-8 mb-3" />
                            <p>左側の設定を行い、「交渉メールを自動生成する」ボタンを押してください。</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .input-label { @apply block text-sm font-medium text-gray-700 mb-1; }
                .input-style { @apply w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition shadow-sm; }
                .request-button { @apply px-4 py-2 rounded-lg font-semibold transition flex-grow text-sm; }
                .table-header { @apply px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider; }
                .table-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-800; }
            `}</style>
        </div>
    );
};

export default App;