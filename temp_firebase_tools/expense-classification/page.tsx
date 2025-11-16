'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, CheckCircle, Lightbulb, Zap, Clock, XCircle, Hand, Loader2, Database, Upload, FileText } from 'lucide-react';

// ====================================================================
// --- 1. FIREBASE/FIRESTORE UTILITIES (統合) ---
// ====================================================================
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    Auth 
} from "firebase/auth";
import { 
    getFirestore, 
    Firestore, 
    collection, 
    doc, 
    setDoc, 
    addDoc
} from "firebase/firestore";

// グローバル変数から設定を取得 (環境依存の変数)
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;
declare const __app_id: string;

// Firebase Appの初期化
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {};

const app = initializeApp(firebaseConfig);

// 認証とFirestoreのインスタンス
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

// アプリケーションIDとユーザーIDの決定
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let currentUserId: string | null = null;
let isAuthReady = false;

/** Firebaseの初期化と認証を行う */
async function initializeFirebase() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
        return new Promise<void>((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    currentUserId = user.uid;
                } else {
                    currentUserId = null;
                }
                isAuthReady = true;
                unsubscribe();
                resolve();
            });
        });
    } catch (error) {
        console.error("Firebase Initialization/Authentication Failed:", error);
    }
}

/** 現在のユーザーIDを取得する（認証完了後） */
function getUserId(): string {
    return currentUserId || crypto.randomUUID();
}

/** 最終会計データ台帳のコレクションパスを取得 */
function getAccountingLedgerCollectionPath(): string {
    const userId = getUserId();
    // プライベートデータとして保存: /artifacts/{appId}/users/{userId}/Accounting_Final_Ledger
    return `artifacts/${appId}/users/${userId}/Accounting_Final_Ledger`;
}

/** 最終会計データをFirestoreに保存する */
async function saveFinalLedger(ledgerData: any): Promise<void> {
    const ledgerRef = collection(db, getAccountingLedgerCollectionPath());
    const docRef = doc(ledgerRef, ledgerData.id); 
    try {
        await setDoc(docRef, ledgerData);
        console.log("Firestore: Final Ledger saved successfully for ID:", ledgerData.id);
    } catch (e) {
        console.error("Firestore: Error adding document (saveFinalLedger): ", e);
        throw e;
    }
}

// ====================================================================
// --- 2. データ型定義 (統合) ---
// ====================================================================

/** @typedef {{ keyword: string, category_id: string, account_title: string, description: string }} ExpenseMaster */
/** @typedef {{ id: string, date: string, account_title: string, amount: number, category: string, transaction_summary: string, order_id?: string, is_verified: boolean, receipt_url?: string }} AccountingFinalLedger */
/** @typedef {{ transactionId: string, date: string, amount: number, summary: string, source: 'Bank' | 'CreditCard', isClassified: boolean, receipt_url?: string }} UnclassifiedTransaction */
/** @typedef {'Pending' | 'Auto' | 'AI_Suggested' | 'Approved' | 'Processing'} Status */
/** @typedef {{ transactionId: string, currentSummary: string, isAutoMatched: boolean, proposedAccount: string, proposedCategory: string, reason: string, status: Status, receipt_url?: string }} ClassificationProposal */

// ====================================================================
// --- 3. 経費分類サービスロジック (統合) ---
// ====================================================================

// 指示書 II.B に基づくExpense_Masterのモック
const MOCK_EXPENSE_MASTER /*: ExpenseMaster[] */ = [
  { keyword: 'AMAZON WEB SERVICES', category_id: 'INFRA', account_title: '通信費', description: 'サーバー/クラウド利用料' },
  { keyword: 'FEDEX INVOICE', category_id: 'SHIPPING_FEE', account_title: '運賃', description: '海外配送サービス費用' },
  { keyword: 'Mercado Libre Fee', category_id: 'MALL_FEE', account_title: '支払手数料', description: 'メルカドリブレの販売手数料' },
];

// マネークラウドから取得した未分類取引のモック
const MOCK_UNCLASSIFIED_TRANSACTIONS /*: UnclassifiedTransaction[] */ = [
  { transactionId: 'TXN-001', date: '2025-10-25', amount: -35000, summary: 'AMAZON WEB SERVICES', source: 'CreditCard', isClassified: false, receipt_url: undefined }, 
  { transactionId: 'TXN-002', date: '2025-10-26', amount: -12000, summary: '出張 大阪 新幹線チケット', source: 'Bank', isClassified: false, receipt_url: undefined }, 
  { transactionId: 'TXN-003', date: '2025-10-27', amount: -2800, summary: '消耗品費（オフィス用品）', source: 'CreditCard', isClassified: false, receipt_url: undefined }, 
  { transactionId: 'TXN-004', date: '2025-10-28', amount: -58000, summary: 'FEDEX INVOICE 4529', source: 'Bank', isClassified: false, receipt_url: 'https://placehold.co/300x400/000000/FFFFFF?text=FedEx+Invoice' }, 
  { transactionId: 'TXN-005', date: '2025-10-29', amount: -1500, summary: 'コーヒーメーカー修理', source: 'CreditCard', isClassified: false, receipt_url: undefined }, 
];

const ExpenseService = {

    /** 経費マスターとの照合により自動分類を試行する */
    tryAutoClassification: (transaction /*: UnclassifiedTransaction */) /*: ClassificationProposal | null */ => {
        const matchedMaster = MOCK_EXPENSE_MASTER.find(master =>
            transaction.summary.toUpperCase().includes(master.keyword.toUpperCase())
        );

        if (matchedMaster) {
            return {
                transactionId: transaction.transactionId,
                currentSummary: transaction.summary,
                isAutoMatched: true,
                proposedAccount: matchedMaster.account_title,
                proposedCategory: matchedMaster.category_id,
                reason: `マスターデータ [${matchedMaster.keyword}] と一致`,
                status: 'Auto',
                receipt_url: transaction.receipt_url,
            };
        }
        return null;
    },

    /** AI（Gemini）を利用して勘定科目を提案するロジックをシミュレートする */
    classifyByAI: async (transaction /*: UnclassifiedTransaction */) /*: Promise<ClassificationProposal> */ => {
        await new Promise(resolve => setTimeout(resolve, 300));

        let mockResponse;
        if (transaction.summary.includes('新幹線')) {
            mockResponse = { proposedAccount: '旅費交通費', proposedCategory: 'TRAVEL', reason: '出張に関連する交通費です。' };
        } else if (transaction.summary.includes('オフィス用品')) {
            mockResponse = { proposedAccount: '消耗品費', proposedCategory: 'OFFICE_SUPPLY', reason: '事務作業に使用する物品の購入です。' };
        } else if (transaction.summary.includes('修理')) {
            mockResponse = { proposedAccount: '修繕費', proposedCategory: 'REPAIR', reason: '固定資産の機能を維持するための費用です。' };
        } else {
             mockResponse = { proposedAccount: '雑費', proposedCategory: 'GENERAL', reason: 'マスターにない、金額の小さい雑多な支出です。' };
        }

        return {
            transactionId: transaction.transactionId,
            currentSummary: transaction.summary,
            isAutoMatched: false,
            proposedAccount: mockResponse.proposedAccount,
            proposedCategory: mockResponse.proposedCategory,
            reason: `AI提案: ${mockResponse.reason}`,
            status: 'AI_Suggested',
            receipt_url: transaction.receipt_url,
        };
    },
    
    /** 未分類の取引すべてに対して分類を試行し、提案リストを生成する */
    processAllUnclassifiedTransactions: async () /*: Promise<ClassificationProposal[]> */ => {
        const proposals = [];
        for (const transaction of MOCK_UNCLASSIFIED_TRANSACTIONS) {
            if (transaction.isClassified) continue;

            let proposal = ExpenseService.tryAutoClassification(transaction);

            if (proposal) {
                proposals.push(proposal);
            } else {
                try {
                    proposal = await ExpenseService.classifyByAI(transaction);
                    proposals.push(proposal);
                } catch (e) {
                    console.error(`AI分類失敗 (TXN: ${transaction.transactionId}):`, e);
                    proposals.push({
                        transactionId: transaction.transactionId,
                        currentSummary: transaction.summary,
                        isAutoMatched: false,
                        proposedAccount: '未分類',
                        proposedCategory: 'ERROR',
                        reason: 'AI分類実行中にエラーが発生しました。',
                        status: 'Pending',
                    });
                }
            }
        }
        return proposals;
    },

    /** 提案を承認し、最終仕訳台帳に追加する（Firestoreに保存） */
    approveProposal: async (proposal /*: ClassificationProposal */) /*: Promise<AccountingFinalLedger> */ => {
        const originalTxn = MOCK_UNCLASSIFIED_TRANSACTIONS.find(t => t.transactionId === proposal.transactionId);
        
        if (!originalTxn) {
            throw new Error("Original transaction not found.");
        }
        
        const finalLedger /*: AccountingFinalLedger */ = {
            id: proposal.transactionId,
            date: originalTxn.date,
            account_title: proposal.proposedAccount,
            amount: originalTxn.amount,
            category: proposal.proposedCategory,
            transaction_summary: proposal.currentSummary,
            order_id: undefined,
            is_verified: true,
            receipt_url: proposal.receipt_url, // 領収書URLを保持
        };

        // Firestoreへの書き込み
        await saveFinalLedger(finalLedger);
        
        return finalLedger;
    },
    
    /** 領収書URLを提案に紐づける */
    attachReceipt: async (transactionId /*: string */, url /*: string */) /*: Promise<void> */ => {
        // モックデータ内の該当取引にURLを紐づける (本番ではFirestoreを更新)
        const txnIndex = MOCK_UNCLASSIFIED_TRANSACTIONS.findIndex(t => t.transactionId === transactionId);
        if (txnIndex !== -1) {
            MOCK_UNCLASSIFIED_TRANSACTIONS[txnIndex].receipt_url = url;
            console.log(`[Receipt Attach] ${transactionId} に領収書URLを紐づけました。`);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
};

// ====================================================================
// --- 4. メインコンポーネント (指示書 II.B: 領収書紐づけ機能を追加) ---
// ====================================================================

const ExpenseClassificationManager = () => {
    /** @type {[ClassificationProposal[], React.Dispatch<React.SetStateAction<ClassificationProposal[]>>]} */
    const [proposals, setProposals] = useState([]);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [approvedCount, setApprovedCount] = useState(0);

    // 1. Firebase初期化
    useEffect(() => {
        const initFirebase = async () => {
            await initializeFirebase();
            setIsFirebaseReady(true);
        };
        initFirebase();
    }, []);

    // 2. 提案データのロード
    const loadProposals = useCallback(async () => {
        if (!isFirebaseReady) return;
        setIsLoading(true);
        try {
            const newProposals = await ExpenseService.processAllUnclassifiedTransactions();
            setProposals(newProposals);
            const initialApprovedCount = newProposals.filter(p => p.status === 'Approved').length;
            setApprovedCount(initialApprovedCount);
        } catch (error) {
            console.error("Failed to load proposals:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isFirebaseReady]);

    useEffect(() => {
        if (isFirebaseReady) {
            loadProposals();
        }
    }, [isFirebaseReady, loadProposals]);

    // 3. 承認処理 (Firestore連携)
    const handleApprove = async (transactionId /*: string */) => {
        if (!isFirebaseReady) return;

        const proposalToApprove = proposals.find(p => p.transactionId === transactionId);
        if (!proposalToApprove || proposalToApprove.status === 'Approved' || proposalToApprove.status === 'Processing') return;
        
        setProposals(prev => 
            prev.map(p => 
                p.transactionId === transactionId ? { ...p, status: 'Processing' } : p
            )
        );

        try {
            await ExpenseService.approveProposal(proposalToApprove); 
            
            setProposals(prev => 
                prev.map(p => 
                    p.transactionId === transactionId ? { ...p, status: 'Approved' } : p
                )
            );
            setApprovedCount(prev => prev + 1);

        } catch (error) {
            console.error(`Firestore Save Failed for ${transactionId}:`, error);
            setProposals(prev => 
                prev.map(p => 
                    p.transactionId === transactionId ? { ...p, status: proposalToApprove.status } : p
                )
            );
        }
    };
    
    // 4. 領収書紐づけ処理 (指示書 II.B)
    const handleAttachReceipt = async (transactionId /*: string */) => {
        const fileUrl = window.prompt("領収書 (PDF/画像) のURLを入力してください (例: https://placehold.co/300x400/FF0000/FFFFFF?text=領収書)");
        if (!fileUrl) return;

        try {
            // モックデータにURLを紐づける
            await ExpenseService.attachReceipt(transactionId, fileUrl);
            
            // UIを更新するため再ロード
            loadProposals();

        } catch (error) {
            console.error("領収書紐づけ失敗:", error);
        }
    };

    const getStatusStyle = (status /*: Status */) => {
        switch (status) {
            case 'Auto': return { bgColor: 'bg-indigo-100', icon: Zap, iconColor: 'text-indigo-600', text: '自動照合', badgeColor: 'bg-indigo-500' };
            case 'AI_Suggested': return { bgColor: 'bg-green-100', icon: Lightbulb, iconColor: 'text-green-600', text: 'AI提案', badgeColor: 'bg-green-500' };
            case 'Pending': return { bgColor: 'bg-yellow-100', icon: Clock, iconColor: 'text-yellow-600', text: '確認待ち', badgeColor: 'bg-yellow-500' };
            case 'Processing': return { bgColor: 'bg-blue-100', icon: Loader2, iconColor: 'text-blue-600', text: '処理中', badgeColor: 'bg-blue-500' };
            case 'Approved': return { bgColor: 'bg-gray-200', icon: CheckCircle, iconColor: 'text-gray-500', text: '承認済', badgeColor: 'bg-gray-500' };
            default: return { bgColor: 'bg-red-100', icon: XCircle, iconColor: 'text-red-600', text: 'エラー', badgeColor: 'bg-red-500' };
        }
    };

    const pendingProposals = useMemo(() => proposals.filter(p => p.status !== 'Approved'), [proposals]);
    const totalTransactions = MOCK_UNCLASSIFIED_TRANSACTIONS.length;
    const finalLedgerPath = isFirebaseReady ? getAccountingLedgerCollectionPath() : "---";

    return (
        <div className="p-6 md:p-8 bg-gray-50 min-h-screen font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
            `}</style>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
                経費・仕訳 自動分類 / 承認センター
            </h1>
            <p className="text-gray-500 mb-6">マネークラウド連携データに基づき、経費マスターとAIが提案した勘定科目を確認・承認します。</p>

            {/* システムステータス */}
            <div className={`p-3 rounded-xl mb-4 text-sm font-medium flex items-center ${isFirebaseReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <Database className="w-4 h-4 mr-2" />
                Firestoreステータス: {isFirebaseReady ? '接続完了' : '接続待機中...'}
                <span className="ml-4 text-xs italic text-gray-500 truncate">
                    台帳パス: {finalLedgerPath}
                </span>
            </div>

            {/* サマリーカード */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-white rounded-xl shadow-lg border-l-4 border-indigo-500">
                    <p className="text-sm text-gray-500">未分類取引総数 (モック)</p>
                    <p className="text-2xl font-bold text-gray-800">{totalTransactions} 件</p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow-lg border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500">要承認 (AI/Pending)</p>
                    <p className="text-2xl font-bold text-yellow-700">{pendingProposals.filter(p => p.status !== 'Auto').length} 件</p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow-lg border-l-4 border-green-500">
                    <p className="text-sm text-gray-500">本セッションで承認済 (Firestore書込済)</p>
                    <p className="text-2xl font-bold text-green-700">{approvedCount} 件</p>
                </div>
            </div>

            {/* アクションとリスト */}
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={loadProposals}
                    disabled={isLoading || !isFirebaseReady}
                    className={`px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 shadow-md flex items-center ${
                        isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    未分類データを再取得・AI分類実行
                </button>
            </div>
            
            {/* 分類提案リスト */}
            <div className="space-y-4">
                {/* 初期ローディング/処理中 */}
                {(isLoading || !isFirebaseReady) && (
                    <div className="flex justify-center items-center p-8 bg-white rounded-xl shadow-inner">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
                        <span className="text-lg text-indigo-500">{!isFirebaseReady ? 'システム接続中...' : 'データ処理中...'}</span>
                    </div>
                )}
                
                {/* 完了メッセージ */}
                {!isLoading && isFirebaseReady && pendingProposals.length === 0 && proposals.length > 0 && (
                    <div className="p-8 text-center bg-green-50 rounded-xl shadow-inner border border-green-200">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                        <p className="text-xl font-semibold text-green-700">お疲れ様です！</p>
                        <p className="text-gray-600">現在、すべての経費取引が承認済みまたは自動分類済みです。</p>
                    </div>
                )}

                {/* 提案リストアイテム */}
                {pendingProposals.map((p) => {
                    const statusInfo = getStatusStyle(p.status);
                    const isApproved = p.status === 'Approved';
                    const isProcessing = p.status === 'Processing';
                    // モックデータから元の取引データを取得し、領収書URLの最新状態を反映
                    const originalTxn = MOCK_UNCLASSIFIED_TRANSACTIONS.find(t => t.transactionId === p.transactionId);
                    const receiptUrl = originalTxn?.receipt_url || p.receipt_url;

                    return (
                        <div 
                            key={p.transactionId}
                            className={`flex flex-col rounded-xl shadow-md transition-all duration-300 ${isApproved ? 'bg-gray-200 opacity-70' : 'bg-white hover:shadow-xl'}`}
                        >
                            <div className="flex flex-col md:flex-row">
                                {/* ステータス / 概要 */}
                                <div className={`p-3 md:w-1/4 ${statusInfo.bgColor} border-r-4 border-dashed border-gray-300 flex flex-col justify-center rounded-t-xl md:rounded-tr-none md:rounded-l-xl`}>
                                    <div className="flex items-center text-sm font-semibold mb-1">
                                        <statusInfo.icon className={`w-4 h-4 mr-1 ${statusInfo.iconColor} ${isProcessing ? 'animate-spin' : ''}`} />
                                        <span className={`${statusInfo.iconColor}`}>{statusInfo.text}</span>
                                    </div>
                                    <p className="text-xl font-bold text-gray-800">
                                        {originalTxn?.amount.toLocaleString() || 'N/A'} JPY
                                    </p>
                                    <p className="text-xs text-gray-500">日付: {originalTxn?.date}</p>
                                </div>
                                
                                {/* 詳細と提案 */}
                                <div className="p-3 md:w-3/4 flex flex-col sm:flex-row justify-between">
                                    <div className="sm:w-3/5">
                                        <p className="text-sm font-medium text-gray-700">取引摘要 (Money Cloud):</p>
                                        <p className="text-lg font-semibold text-gray-900 break-words">{p.currentSummary}</p>
                                        <p className="mt-2 text-xs italic text-gray-600">
                                            根拠: {p.reason}
                                        </p>
                                    </div>

                                    <div className="sm:w-2/5 sm:pl-4 mt-3 sm:mt-0 border-t sm:border-t-0 sm:border-l border-gray-200">
                                        <div className="text-sm font-medium text-gray-700 mb-1">
                                            提案科目:
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-base font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                {p.proposedAccount}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                カテゴリー: {p.proposedCategory}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 領収書と承認アクション */}
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 p-3 bg-gray-100 rounded-b-xl border-t border-gray-300">
                                {/* 領収書ビュー/紐づけ */}
                                <div className="flex items-center gap-2 mr-auto sm:mr-4">
                                    {receiptUrl ? (
                                        <a 
                                            href={receiptUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 flex items-center transition-colors"
                                        >
                                            <FileText className="w-4 h-4 mr-1" />
                                            領収書を表示
                                        </a>
                                    ) : (
                                        <button
                                            onClick={() => handleAttachReceipt(p.transactionId)}
                                            disabled={isApproved || isProcessing}
                                            className={`px-3 py-1 text-sm rounded-lg shadow-md flex items-center transition-colors ${
                                                isApproved || isProcessing ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                            }`}
                                        >
                                            <Upload className="w-4 h-4 mr-1" />
                                            領収書を紐づけ
                                        </button>
                                    )}
                                </div>
                                
                                {/* 承認ボタン */}
                                <button
                                    onClick={() => handleApprove(p.transactionId)}
                                    disabled={isApproved || isProcessing}
                                    className={`w-full sm:w-1/3 md:w-auto px-6 py-2 rounded-lg text-white font-bold transition-colors duration-200 shadow-lg flex items-center justify-center ${
                                        isProcessing ? 'bg-blue-500' : 
                                        isApproved ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-5 h-5 mr-1 animate-spin" />
                                    ) : (
                                        <Hand className="w-5 h-5 mr-1" />
                                    )}
                                    {isProcessing ? '保存中' : isApproved ? '承認済' : '承認'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExpenseClassificationManager;
