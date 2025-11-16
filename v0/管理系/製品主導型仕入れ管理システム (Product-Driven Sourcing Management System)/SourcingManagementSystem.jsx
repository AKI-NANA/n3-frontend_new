import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { GoogleGenerativeAI } from '@google/genai';

// 4. 厳守すべき技術的制約: APIキー、AppID、Firebase設定を維持
const API_KEY = ""; // Google Gemini API Key
const __app_id = "sourcing_mgmt_app";
const __firebase_config = {
    apiKey: "",
    authDomain: "",
    projectId: "demo-project",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
const __initial_auth_token = "demo_token_12345";

// Firebase App Initialization
const app = initializeApp(__firebase_config);
const db = getFirestore(app);
const auth = getAuth(app);
const gemini = new GoogleGenerativeAI(API_KEY);
const geminiModel = "gemini-2.5-flash-preview-09-2025";

// ====================================================================================================
// ユーティリティ関数
// ====================================================================================================

/**
 * 4. 厳守すべき技術的制約: document.execCommand('copy') の使用
 */
const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
        const successful = document.execCommand('copy');
        return successful ? 'Copied!' : 'Failed to copy.';
    } catch (err) {
        return 'Failed to copy.';
    } finally {
        document.body.removeChild(el);
    }
};

const getPrivateCollectionRef = (userId, collectionName) => {
    // 4. Firestoreパスの維持: artifacts/{appId}/users/{userId}/{collectionName}
    return collection(db, `artifacts/${__app_id}/users/${userId}/${collectionName}`);
};

// ====================================================================================================
// LLMとの連携ロジック (タスク B)
// ====================================================================================================

const generateNegotiationEmail = async (product, supplier, userId) => {
    if (!product || !supplier || !userId) return "Select a product and supplier first.";

    // タスク B.1: 動的な担当者名挿入
    const contactName = supplier.contactName;
    const recipient = contactName ? `${supplier.companyName} ${contactName}様` : `${supplier.companyName} ご担当者様`;

    // タスク B.2: リピート仕入れシナリオの追加
    const isRepeat = supplier.isRepeatCandidate;
    const repeatContext = isRepeat
        ? "今回は既存取引に基づくリピート仕入れに関する相談であり、迅速な対応を希望する。既存取引への感謝を冒頭に述べ、協力的なトーンを維持すること。"
        : "新規取引の可能性を探る初回コンタクトである。丁寧な言葉遣いを心がけること。";
    
    // 1. LLMへの指示プロンプトの構成
    const systemPrompt = `
        あなたはプロのバイヤーであり、仕入れ先との交渉メールを作成します。
        メールは日本語で作成し、件名と本文に分けて出力してください。
        以下の情報に基づき、効果的で誠意のある交渉メールを作成してください。
        
        ---制約と目的---
        1. 宛先は "${recipient}" とすること。
        2. 製品情報、希望仕入れ数、希望原価を必ず含めること。
        3. 仕入れ先の信頼性を考慮し、メールのトーンを決定すること。
        4. ${repeatContext}
        ---
    `;

    const userPrompt = `
        製品名: ${product.name}
        製品SKU: ${product.sku}
        ターゲットとする希望仕入れ数: ${product.targetQuantity}個
        ターゲットとする希望原価: ¥${product.targetCost}
        仕入れ先企業名: ${supplier.companyName}
        交渉ステータス: ${supplier.negotiationStatus}
    `;

    try {
        const result = await gemini.models.generateContent({
            model: geminiModel,
            contents: [{ role: "user", parts: [{ text: systemPrompt + userPrompt }] }],
        });
        
        return result.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "AIメール生成エラー: APIキーを確認するか、サーバーログを確認してください。";
    }
};


// ====================================================================================================
// メインアプリケーションコンポーネント
// ====================================================================================================

const SourcingManagementSystem = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('products');
    const [message, setMessage] = useState('');
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);

    // データの状態管理
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [supplierLoading, setSupplierLoading] = useState(false);
    const [productLoading, setProductLoading] = useState(false);

    // タスク C.1: タブ切り替え時のリセット防止
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [generatedEmail, setGeneratedEmail] = useState('');
    const [isEmailGenerating, setIsEmailGenerating] = useState(false);


    // ------------------------------------
    // 認証と初期化
    // ------------------------------------
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                // 4. Firebase Auth: 匿名認証またはカスタムトークン
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

        // Products Listener
        const productsRef = getPrivateCollectionRef(user.uid, 'sourcing_products');
        setProductLoading(true);
        const unsubscribeProducts = onSnapshot(query(productsRef), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(list);
            setProductLoading(false);
        }, (error) => {
            setMessage(`Products data error: ${error.message}`);
            setProductLoading(false);
        });

        // Suppliers Listener (タスク A)
        const suppliersRef = getPrivateCollectionRef(user.uid, 'supplier_contacts');
        setSupplierLoading(true);
        const unsubscribeSuppliers = onSnapshot(query(suppliersRef), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), lastNegotiationDate: doc.data().lastNegotiationDate?.toDate() }));
            setSuppliers(list);
            setSupplierLoading(false);
        }, (error) => {
            setMessage(`Suppliers data error: ${error.message}`);
            setSupplierLoading(false);
        });

        return () => {
            unsubscribeProducts();
            unsubscribeSuppliers();
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
        setIsGlobalLoading(true); // タスク C.3: ローディングフィードバック

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
        setIsGlobalLoading(true); // タスク C.3: ローディングフィードバック

        try {
            await deleteDoc(doc(getPrivateCollectionRef(user.uid, collectionName), id));
            setMessage(`${collectionName} deleted successfully.`);
        } catch (error) {
            setMessage(`Failed to delete ${collectionName}: ${error.message}`);
        } finally {
            setIsGlobalLoading(false);
        }
    };

    // ------------------------------------
    // AIメール生成アクション
    // ------------------------------------
    const handleGenerateEmail = async () => {
        const product = products.find(p => p.id === selectedProductId);
        const supplier = suppliers.find(s => s.id === selectedSupplierId);

        if (!product || !supplier) {
            setMessage('Error: Please select both a product and a supplier.');
            return;
        }

        setIsEmailGenerating(true);
        const email = await generateNegotiationEmail(product, supplier, user.uid);
        setGeneratedEmail(email);
        setIsEmailGenerating(false);
    };


    // ------------------------------------
    // 子コンポーネントのレンダリング関数
    // ------------------------------------

    const SourcingProductManager = () => {
        const [name, setName] = useState('');
        const [sku, setSku] = useState('');
        const [targetQuantity, setTargetQuantity] = useState('');
        const [targetCost, setTargetCost] = useState('');

        const handleAdd = (e) => {
            e.preventDefault();
            if (!name || !sku || !targetQuantity || !targetCost) {
                setMessage('All fields are required for the product.');
                return;
            }
            const data = { name, sku, targetQuantity: Number(targetQuantity), targetCost: Number(targetCost) };
            handleAddOrUpdate('sourcing_products', data);
            setName(''); setSku(''); setTargetQuantity(''); setTargetCost('');
        };

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">仕入対象商品リスト ({products.length})</h3>
                <form onSubmit={handleAdd} className="grid grid-cols-5 gap-3 mb-6 p-4 border border-gray-200 rounded-lg">
                    <input className="p-2 border rounded" type="text" placeholder="製品名" value={name} onChange={e => setName(e.target.value)} />
                    <input className="p-2 border rounded" type="text" placeholder="SKU" value={sku} onChange={e => setSku(e.target.value)} />
                    <input className="p-2 border rounded" type="number" placeholder="目標仕入れ数" value={targetQuantity} onChange={e => setTargetQuantity(e.target.value)} />
                    <input className="p-2 border rounded" type="number" placeholder="目標原価 (¥)" value={targetCost} onChange={e => setTargetCost(e.target.value)} />
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition duration-150">追加</button>
                </form>

                {productLoading ? (
                    <p className="text-center text-blue-500">Loading products...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                    <th className="py-2 px-4 border-b">製品名</th>
                                    <th className="py-2 px-4 border-b">SKU</th>
                                    <th className="py-2 px-4 border-b">数量</th>
                                    <th className="py-2 px-4 border-b">目標原価</th>
                                    <th className="py-2 px-4 border-b">アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 border-b text-sm text-gray-700">
                                        <td className="py-2 px-4">{p.name}</td>
                                        <td className="py-2 px-4">{p.sku}</td>
                                        <td className="py-2 px-4">{p.targetQuantity}</td>
                                        <td className="py-2 px-4">¥{p.targetCost}</td>
                                        <td className="py-2 px-4">
                                            <button onClick={() => handleDelete('sourcing_products', p.id)} className="text-red-500 hover:text-red-700 transition duration-150">削除</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const SupplierContactManager = () => {
        const [companyName, setCompanyName] = useState('');
        const [isRepeatCandidate, setIsRepeatCandidate] = useState(false);
        // タスク A.1: データスキーマの拡張
        const [contactName, setContactName] = useState('');
        const [phoneNumber, setPhoneNumber] = useState('');
        const [emailAddress, setEmailAddress] = useState('');
        const [negotiationStatus, setNegotiationStatus] = useState('未接触');

        const statusOptions = ['未接触', '交渉中', '契約済', '辞退'];

        const handleAdd = (e) => {
            e.preventDefault();
            if (!companyName || !emailAddress) {
                setMessage('Company Name and Email are required.');
                return;
            }
            const data = { 
                companyName, 
                isRepeatCandidate, 
                contactName, 
                phoneNumber, 
                emailAddress, 
                negotiationStatus, 
                lastNegotiationDate: serverTimestamp() 
            };
            handleAddOrUpdate('supplier_contacts', data);
            setCompanyName(''); setIsRepeatCandidate(false); 
            setContactName(''); setPhoneNumber(''); setEmailAddress(''); setNegotiationStatus('未接触');
        };

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">仕入れ先コンタクト管理 ({suppliers.length})</h3>
                
                {/* タスク A.2: UIの拡張 - 新規登録フォーム */}
                <form onSubmit={handleAdd} className="grid grid-cols-6 gap-3 mb-6 p-4 border border-gray-200 rounded-lg">
                    <input className="p-2 border rounded col-span-2" type="text" placeholder="企業名*" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    <input className="p-2 border rounded" type="text" placeholder="担当者名" value={contactName} onChange={e => setContactName(e.target.value)} />
                    <input className="p-2 border rounded" type="email" placeholder="メール*" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} />
                    <input className="p-2 border rounded" type="tel" placeholder="電話番号" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                    
                    <select className="p-2 border rounded" value={negotiationStatus} onChange={e => setNegotiationStatus(e.target.value)}>
                        {statusOptions.map(status => (<option key={status} value={status}>{status}</option>))}
                    </select>

                    <div className="flex items-center space-x-2 col-span-2">
                        <input type="checkbox" id="repeat-candidate" checked={isRepeatCandidate} onChange={e => setIsRepeatCandidate(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <label htmlFor="repeat-candidate" className="text-sm text-gray-700">リピート候補</label>
                    </div>
                    
                    <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition duration-150 col-span-1">登録</button>
                </form>

                {supplierLoading ? (
                    <p className="text-center text-blue-500">Loading suppliers...</p>
                ) : (
                    <div className={`overflow-x-auto ${isGlobalLoading ? 'relative' : ''}`}>
                        {isGlobalLoading && <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center"><div className="text-lg text-blue-600">Processing...</div></div>}
                        <table className="min-w-full bg-white border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                    <th className="py-2 px-4 border-b">企業名</th>
                                    <th className="py-2 px-4 border-b">担当者名</th>
                                    <th className="py-2 px-4 border-b">連絡先</th>
                                    <th className="py-2 px-4 border-b">電話</th>
                                    <th className="py-2 px-4 border-b">最終交渉日</th>
                                    <th className="py-2 px-4 border-b">交渉ステータス</th>
                                    <th className="py-2 px-4 border-b">リピート</th>
                                    <th className="py-2 px-4 border-b">アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(s => (
                                    // タスク C.2: 視覚化 - リピート候補の背景色
                                    <tr key={s.id} className={`${s.isRepeatCandidate ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'} border-b text-sm text-gray-700`}>
                                        <td className="py-2 px-4">{s.companyName}</td>
                                        <td className="py-2 px-4">{s.contactName || 'N/A'}</td>
                                        <td className="py-2 px-4">{s.emailAddress}</td>
                                        <td className="py-2 px-4">{s.phoneNumber || 'N/A'}</td>
                                        <td className="py-2 px-4">{s.lastNegotiationDate ? new Date(s.lastNegotiationDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="py-2 px-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                s.negotiationStatus === '契約済' ? 'bg-green-100 text-green-800' :
                                                s.negotiationStatus === '交渉中' ? 'bg-blue-100 text-blue-800' :
                                                s.negotiationStatus === '辞退' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                            }`}>{s.negotiationStatus}</span>
                                        </td>
                                        <td className="py-2 px-4">{s.isRepeatCandidate ? 'Yes' : 'No'}</td>
                                        <td className="py-2 px-4">
                                            <button onClick={() => handleDelete('supplier_contacts', s.id)} className="text-red-500 hover:text-red-700 transition duration-150">削除</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const EmailGeneratorPanel = () => {
        const product = products.find(p => p.id === selectedProductId);
        const supplier = suppliers.find(s => s.id === selectedSupplierId);

        return (
            <div className="p-6 bg-white rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800">AI交渉メール生成</h3>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">製品選択</label>
                        <select
                            className="p-2 border rounded w-full"
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                        >
                            <option value="">-- 製品を選択 --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                </option>
                            ))}
                        </select>
                        {product && (
                            <p className="mt-2 text-sm text-gray-500">
                                目標: {product.targetQuantity}個 @ ¥{product.targetCost}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">仕入れ先選択</label>
                        <select
                            className="p-2 border rounded w-full"
                            value={selectedSupplierId}
                            onChange={e => setSelectedSupplierId(e.target.value)}
                        >
                            <option value="">-- 仕入れ先を選択 --</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.companyName} ({s.negotiationStatus}) {s.isRepeatCandidate ? '[リピート]' : ''}
                                </option>
                            ))}
                        </select>
                        {supplier && (
                            <p className="mt-2 text-sm text-gray-500">
                                担当: {supplier.contactName || 'N/A'} | 状況: {supplier.negotiationStatus}
                            </p>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleGenerateEmail}
                    disabled={isEmailGenerating || !selectedProductId || !selectedSupplierId}
                    className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isEmailGenerating ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            AI生成中...
                        </>
                    ) : (
                        '交渉メールを生成'
                    )}
                </button>
                
                <div className="mt-6 p-4 bg-gray-50 border rounded-lg min-h-[200px] relative">
                    <h4 className="font-semibold text-gray-800 mb-2">生成結果</h4>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">{generatedEmail}</pre>
                    {generatedEmail && (
                        <button 
                            onClick={() => {
                                const result = copyToClipboard(generatedEmail);
                                setMessage(result);
                            }}
                            className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs py-1 px-3 rounded"
                        >
                            コピー
                        </button>
                    )}
                </div>

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
            <header className="mb-8 p-4 bg-white shadow rounded-lg flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-indigo-700">製品主導型仕入れ管理システム</h1>
                <span className="text-sm text-gray-500">User ID: {user.uid}</span>
            </header>

            {/* Global Message/Alerts (4. alert()の禁止) */}
            {message && (
                <div className="mb-4 p-3 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 flex justify-between items-center">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="text-indigo-600 font-bold ml-4">×</button>
                </div>
            )}
            
            {/* タブナビゲーション */}
            <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setActiveTab('products')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'products' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    仕入対象商品
                </button>
                <button 
                    onClick={() => setActiveTab('suppliers')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'suppliers' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    仕入れ先コンタクト
                </button>
                <button 
                    onClick={() => setActiveTab('email')} 
                    className={`py-2 px-4 text-lg font-medium ${activeTab === 'email' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    AI交渉メール
                </button>
            </div>

            {/* タブコンテンツ */}
            <div>
                {activeTab === 'products' && <SourcingProductManager />}
                {activeTab === 'suppliers' && <SupplierContactManager />}
                {activeTab === 'email' && <EmailGeneratorPanel />}
            </div>
        </div>
    );
};

export default SourcingManagementSystem;
// 4. シングルファイル・コンポーネント構造の維持