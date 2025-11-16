'use client'
// FIREBASE_DISABLED_MODE: このツールはFirebase機能なしで動作します（表示のみ）

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot, updateDoc, deleteDoc, orderBy, serverTimestamp, getDocs, where } from 'firebase/firestore';

// Firebase初期設定に必要なグローバル変数を取得
// NOTE: __app_id, __firebase_config, __initial_auth_token はCanvas環境から提供されます。
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// =====================================================================
// ヘルパー関数
// =====================================================================

// Firestoreのパスを生成するヘルパー関数
const getFirestorePaths = (userId) => ({
  // 単価設定は管理者のみが編集し、外注先全員が参照するためPublicデータとして扱う
  rates: `artifacts/${appId}/public/data/taskRates`,
  // 業務報告はユーザーID（外注先ID）ごとに隔離して保存する
  entries: `artifacts/${appId}/users/${userId}/workEntries`,
  // 全ユーザーのworkEntriesコレクションが存在する場所
  allUsersWorkPath: `artifacts/${appId}/users/`,
});


// アプリのメインコンポーネント
const App = () => {
  // =====================================================================
  // 1. Firebaseと認証の管理
  // =====================================================================
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null); // 現在ログインしているユーザーID (管理者ID)
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // 'Manager' or 'Contractor'
  const [currentMode, setCurrentMode] = useState(null);
  // 管理者モードでのみ使用：現在閲覧中の外注先ID
  const [viewingContractorId, setViewingContractorId] = useState(null);
  // 管理者モードでのみ使用：システムに登録されている全外注先のIDリスト（シミュレーション用）
  const [allContractorIds, setAllContractorIds] = useState([]);


  // Firebase初期化と認証
  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      // Firebase config is missing (disabled)
      setLoading(false);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);
      
      setDb(firestore);
      setAuth(authInstance);

      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
          setViewingContractorId(user.uid); // 初期ビューは自分自身
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
          } catch (error) {
            console.error("Authentication failed:", error);
            setUserId(null);
          }
        }
        setIsAuthReady(true);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      setLoading(false);
    }
  }, []);

  // =====================================================================
  // 2. データの状態管理とリアルタイム取得
  // =====================================================================
  const [rates, setRates] = useState([]); // 単価設定（共有）
  const [entries, setEntries] = useState([]); // 業務報告エントリ (選択された外注先の分)

  // リアルタイムデータ取得フック
  const useFirestoreData = (db, userId, isAuthReady, currentPath, setter) => {
    useEffect(() => {
      if (!db || !userId || !isAuthReady || !currentPath) return;

      const q = query(collection(db, currentPath), orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Dateオブジェクトを文字列に変換（レポート表示用）
          date: doc.data().date ? doc.data().date.toDate().toISOString().substring(0, 10) : '',
        }));
        setter(newData);
      }, (error) => console.error(`Error fetching data from ${currentPath}:`, error));

      return () => unsubscribe();
    }, [db, userId, isAuthReady, currentPath, setter]);
  };
  
  const currentContractorId = currentMode === 'Contractor' ? userId : viewingContractorId;
  const paths = getFirestorePaths(currentContractorId);
  
  // 単価設定の取得（Public）
  useFirestoreData(db, userId, isAuthReady, paths.rates, setRates);

  // 業務報告エントリの取得 (選択された外注先のデータ)
  useFirestoreData(db, currentContractorId, isAuthReady, paths.entries, setEntries);


  // 管理者モードで全外注先IDをシミュレート取得
  useEffect(() => {
    if (!db || !userId || !isAuthReady || currentMode !== 'Manager') return;

    // 簡易的に全ユーザーIDを取得するロジックはFirestoreの仕様上困難なため、
    // ここではReportsコレクションに存在するContractorIdをリストとして手動で管理します。
    // 今回は、現在のuserIdを「管理者ID」とし、他2つのIDを「外注先」と仮定します。
    setAllContractorIds([
      userId, // 管理者自身も業務報告できる可能性があるため含める
      'contractor-001', 
      'contractor-002'
    ]);
    if (!viewingContractorId) {
      setViewingContractorId(userId); // デフォルトで自分のIDを選択
    }
  }, [userId, isAuthReady, currentMode, viewingContractorId]);


  // =====================================================================
  // 3. 支払い総額の自動計算ロジック
  // =====================================================================
  const TAX_RATE = 0.10; // 消費税率 10%

  const { totalAmountBeforeTax, totalTax, totalPayment } = useMemo(() => {
    let subtotal = 0;

    entries.forEach(entry => {
      const amount = (entry.count || 0) * (entry.rate || 0);
      subtotal += amount;
    });

    const totalBeforeTax = Math.round(subtotal);
    const tax = Math.round(totalBeforeTax * TAX_RATE);
    const total = totalBeforeTax + tax;

    return {
      totalAmountBeforeTax: totalBeforeTax,
      totalTax: tax,
      totalPayment: total,
    };
  }, [entries]);


  // =====================================================================
  // 4. UIコンポーネント: 単価設定（管理者のみ編集可能）
  // =====================================================================
  const RateSettings = ({ rates, db, paths }) => {
    const [newRate, setNewRate] = useState({ name: '', rate: '', unit: '' });

    const handleRateChange = (e) => {
      setNewRate({ ...newRate, [e.target.name]: e.target.value });
    };

    const addOrUpdateRate = async (e) => {
      e.preventDefault();
      if (!db || !newRate.name || !newRate.rate || !newRate.unit) return;
      
      try {
        const rateData = {
          name: newRate.name,
          rate: Number(newRate.rate),
          unit: newRate.unit,
          timestamp: serverTimestamp(),
        };
        const newRateRef = doc(collection(db, paths.rates));
        await setDoc(newRateRef, rateData);
        setNewRate({ name: '', rate: '', unit: '' });
      } catch (error) {
        console.error("単価設定の保存に失敗しました:", error);
      }
    };

    const deleteRate = async (id) => {
      if (!db || !window.confirm('この設定を削除してもよろしいですか？')) return;
      
      try {
        const docRef = doc(db, paths.rates, id);
        await deleteDoc(docRef);
      } catch (error) {
        console.error("単価設定の削除に失敗しました:", error);
      }
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg h-full">
        <h2 className="text-xl font-bold mb-4 text-gray-800">作業単価の設定（変動制）</h2>
        <div className="space-y-4 mb-6 max-h-56 overflow-y-auto">
          {rates.map((rate) => (
            <div key={rate.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <div className="flex-grow">
                <p className="font-semibold text-indigo-700">{rate.name}</p>
                <p className="text-sm text-gray-600">単価: ¥{rate.rate.toLocaleString()} / {rate.unit}</p>
              </div>
              {currentMode === 'Manager' && (
                <button
                  onClick={() => deleteRate(rate.id)}
                  className="ml-4 text-red-500 hover:text-red-700 transition duration-150"
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
        
        {currentMode === 'Manager' && (
          <form onSubmit={addOrUpdateRate} className="mt-6 p-4 border-t border-gray-200 pt-4 space-y-3 bg-indigo-50 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-700">新しい単価の追加</h3>
            <input type="text" name="name" placeholder="作業名（例：Plus1出荷、検品）" value={newRate.name} onChange={handleRateChange} className="p-2 border rounded-lg w-full" required />
            <div className="flex space-x-3">
              <input type="number" name="rate" placeholder="単価（円）" value={newRate.rate} onChange={handleRateChange} className="p-2 border rounded-lg w-1/2" min="1" required />
              <input type="text" name="unit" placeholder="単位（例：個、時間）" value={newRate.unit} onChange={handleRateChange} className="p-2 border rounded-lg w-1/2" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 shadow-md">
              単価設定を保存
            </button>
          </form>
        )}
      </div>
    );
  };

  // =====================================================================
  // 5. UIコンポーネント: 業務報告（外注先のみ入力可能）
  // =====================================================================
  const WorkReport = ({ rates, db, contractorId }) => {
    const today = new Date().toISOString().substring(0, 10);
    const [newEntry, setNewEntry] = useState({ date: today, rateId: '', count: '' });

    const handleEntryChange = (e) => {
      setNewEntry({ ...newEntry, [e.target.name]: e.target.value });
    };

    const addWorkEntry = async (e) => {
      e.preventDefault();
      
      const selectedRate = rates.find(r => r.id === newEntry.rateId);
      if (!db || !selectedRate || !newEntry.count) return;

      const entriesPath = getFirestorePaths(contractorId).entries;
      if (!entriesPath) return;

      try {
        const entryData = {
          date: new Date(newEntry.date),
          taskId: selectedRate.id,
          taskName: selectedRate.name,
          taskUnit: selectedRate.unit,
          count: Number(newEntry.count),
          rate: selectedRate.rate, // 登録時の単価を保持
          timestamp: serverTimestamp(),
        };

        const newEntryRef = doc(collection(db, entriesPath));
        await setDoc(newEntryRef, entryData);
        setNewEntry({ date: today, rateId: '', count: '' });

      } catch (error) {
        console.error("業務報告の登録に失敗しました:", error);
      }
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-800">業務報告の実行</h2>
        {currentMode === 'Contractor' ? (
          <form onSubmit={addWorkEntry} className="space-y-4 mb-8 p-4 border rounded-lg bg-green-50">
            <h3 className="text-lg font-semibold text-green-700">新規報告を登録</h3>
            {rates.length === 0 && <p className="text-red-500">⚠ 単価設定が登録されていません。管理者に連絡してください。</p>}
            
            {/* 日付 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">日付</label>
              <input type="date" name="date" value={newEntry.date} onChange={handleEntryChange} className="mt-1 p-2 border rounded-lg w-full" required />
            </div>
            {/* 作業内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">作業内容</label>
              <select name="rateId" value={newEntry.rateId} onChange={handleEntryChange} className="mt-1 p-2 border rounded-lg w-full" required disabled={rates.length === 0}>
                <option value="" disabled>作業を選択してください</option>
                {rates.map(rate => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name} (¥{rate.rate.toLocaleString()}/{rate.unit})
                  </option>
                ))}
              </select>
            </div>
            {/* 数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">数量・時間</label>
              <input type="number" name="count" placeholder="実行した数量または時間" value={newEntry.count} onChange={handleEntryChange} className="mt-1 p-2 border rounded-lg w-full" min="1" required />
            </div>
            <button type="submit" disabled={!newEntry.rateId || !newEntry.count || rates.length === 0} className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 shadow-md disabled:bg-gray-400">
              業務報告を登録
            </button>
          </form>
        ) : (
          <p className="text-gray-500 p-4 border rounded-lg">
            管理者モードでは、ここから報告は登録できません。外注先モードに切り替えてください。
          </p>
        )}
      </div>
    );
  };

  // =====================================================================
  // 6. UIコンポーネント: 履歴とサマリー表示
  // =====================================================================
  const ReportHistoryAndSummary = ({ entries, totalPayment, totalAmountBeforeTax, totalTax }) => {
    
    // 業務報告エントリの削除（管理者のみ許可）
    const deleteEntry = async (id) => {
      if (!db || !window.confirm('この業務報告を削除してもよろしいですか？')) return;
      
      try {
        const docRef = doc(db, getFirestorePaths(viewingContractorId).entries, id);
        await deleteDoc(docRef);
      } catch (error) {
        console.error("業務報告の削除に失敗しました:", error);
      }
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
        {/* 支払いサマリー */}
        <div className="bg-indigo-100 p-4 rounded-xl shadow-inner border border-indigo-300">
          <h3 className="text-xl font-bold mb-3 text-indigo-700">
            {currentMode === 'Manager' ? `${viewingContractorId} への支払い総額` : 'あなたの支払い計算サマリー'}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-md">
              <span className="text-gray-700">作業代金合計（税抜）:</span>
              <span className="font-semibold text-gray-900">¥{totalAmountBeforeTax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-md border-b pb-2 border-indigo-200">
              <span className="text-gray-700">消費税 (10%):</span>
              <span className="font-semibold text-gray-900">¥{totalTax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xl pt-2 font-extrabold text-red-600">
              <span>支払総額:</span>
              <span>¥{totalPayment.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 報告履歴 */}
        <h3 className="text-lg font-bold text-gray-800">報告履歴 ({entries.length}件)</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {entries.map((entry) => {
            const amount = (entry.count || 0) * (entry.rate || 0);
            return (
              <div key={entry.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                <div>
                  <p className="font-semibold text-gray-800">
                    {entry.taskName} ({entry.date})
                  </p>
                  <p className="text-sm text-gray-600">
                    {entry.count} {entry.taskUnit} × ¥{entry.rate.toLocaleString()} = **¥{amount.toLocaleString()}**
                  </p>
                </div>
                {currentMode === 'Manager' && (
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="ml-4 text-red-500 hover:text-red-700 transition duration-150 text-sm"
                  >
                    報告削除
                  </button>
                )}
              </div>
            );
          })}
          {entries.length === 0 && <p className="text-center text-gray-500 py-4">報告された作業がありません。</p>}
        </div>
      </div>
    );
  };


  // =====================================================================
  // 7. メインレンダリング
  // =====================================================================

  if (loading || !isAuthReady) {
    // 省略
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-700 flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          初期設定を読み込み中です...
        </div>
      </div>
    );
  }

  // ロール選択画面
  if (!currentMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl text-center">
          <h1 className="text-2xl font-bold mb-6 text-indigo-700">役割を選択してください</h1>
          <p className="text-gray-600 mb-8">このシステムをどちらの立場で利用しますか？</p>
          <div className="space-y-4">
            <button 
              onClick={() => setCurrentMode('Manager')}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition shadow-lg"
            >
              発注者 (管理者)
            </button>
            <button 
              onClick={() => setCurrentMode('Contractor')}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition shadow-lg"
            >
              外注先 (業務委託者)
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-6">現在の認証ID: {userId}</p>
        </div>
      </div>
    );
  }
  
  // モードごとのメインUI
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter">
      <header className="text-center mb-6">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <button 
            onClick={() => setCurrentMode(null)}
            className="text-sm text-gray-500 hover:text-indigo-600 transition"
          >
            ← 役割選択に戻る
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 tracking-tight">
            {currentMode === 'Manager' ? '管理者ダッシュボード' : '外注先 業務報告画面'}
          </h1>
          <span className={`px-3 py-1 text-sm font-bold rounded-full ${currentMode === 'Manager' ? 'bg-indigo-200 text-indigo-800' : 'bg-green-200 text-green-800'}`}>
            {currentMode === 'Manager' ? '管理者モード' : '外注先モード'}
          </span>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto space-y-8">

        {/* 管理者モード専用機能: 外注先切り替え */}
        {currentMode === 'Manager' && (
          <div className="bg-yellow-50 p-4 rounded-xl shadow border border-yellow-300">
            <label className="block text-md font-medium text-yellow-800 mb-2">
              支払い確認対象の外注先を切り替え:
            </label>
            <select
              value={viewingContractorId}
              onChange={(e) => setViewingContractorId(e.target.value)}
              className="p-2 border border-yellow-400 rounded-lg w-full focus:ring-yellow-500 focus:border-yellow-500 bg-white"
            >
              {allContractorIds.map(id => (
                <option key={id} value={id}>
                  {id} {id === userId && '(管理者自身の報告)'}
                </option>
              ))}
            </select>
            <p className="text-sm text-yellow-700 mt-2">
              ※ここで選択したIDの業務報告と支払い総額が表示されます。
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 左側: 報告入力 / 履歴・サマリー */}
          <div className="lg:order-1 order-2 space-y-8">
             {/* 外注先モードなら入力フォーム、そうでなければ表示しない */}
            {currentMode === 'Contractor' && <WorkReport rates={rates} db={db} contractorId={userId} />}

            {/* 報告履歴と支払いサマリー */}
            <ReportHistoryAndSummary 
              entries={entries}
              totalPayment={totalPayment}
              totalAmountBeforeTax={totalAmountBeforeTax}
              totalTax={totalTax}
            />
          </div>

          {/* 右側: 単価設定（管理者のみ編集可能） */}
          <div className="lg:order-2 order-1">
            <RateSettings rates={rates} db={db} paths={paths} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;