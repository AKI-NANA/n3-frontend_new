// src/utils/firebaseUtils.ts

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  addDoc,
} from "firebase/firestore";

// グローバル変数から設定を取得
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;
declare const __app_id: string;

// Firebase Appの初期化
const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};

const app = initializeApp(firebaseConfig);

// 認証とFirestoreのインスタンス
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// アプリケーションIDとユーザーIDの決定
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

let currentUserId: string | null = null;
let isAuthReady = false;

/**
 * Firebaseの初期化と認証を行う
 */
export async function initializeFirebase() {
  try {
    // 認証ロジック
    if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
      console.log("Firebase: Signed in with custom token.");
    } else {
      await signInAnonymously(auth);
      console.warn("Firebase: Signed in anonymously.");
    }

    // 認証状態の監視
    return new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          currentUserId = user.uid;
          console.log(
            `Firebase: Auth state changed. User ID: ${currentUserId}`
          );
        } else {
          currentUserId = null;
          console.log("Firebase: User logged out.");
        }
        isAuthReady = true;
        unsubscribe(); // 初回認証完了後、リスナーを解除
        resolve();
      });
    });
  } catch (error) {
    console.error("Firebase Initialization/Authentication Failed:", error);
  }
}

/**
 * 現在のユーザーIDを取得する（認証完了後）
 */
export function getUserId(): string {
  if (!isAuthReady) {
    // 認証が完了していない場合のフォールバック
    console.warn("Firebase: Auth not ready. Returning temporary UUID.");
    // 本来はinitializeFirebaseの完了を待つべきだが、今回はランタイムIDを使用
    return "temp-user-id-" + Math.random().toString(36).substr(2, 9);
  }
  // 認証済みUIDまたはエラー時のUUID
  return currentUserId || crypto.randomUUID();
}

// --- Firestore Collection Path Utility ---

/**
 * 最終会計データ台帳 (Accounting_Final_Ledger) のコレクションパスを取得
 * プライベートデータとして保存: /artifacts/{appId}/users/{userId}/Accounting_Final_Ledger
 */
export function getAccountingLedgerCollectionPath(): string {
  const userId = getUserId();
  return `artifacts/${appId}/users/${userId}/Accounting_Final_Ledger`;
}

/**
 * AI経営分析結果 (AIAnalysisResult) のコレクションパスを取得
 * プライベートデータとして保存: /artifacts/{appId}/users/{userId}/AI_Analysis_Results
 */
export function getAIAnalysisCollectionPath(): string {
  const userId = getUserId();
  return `artifacts/${appId}/users/${userId}/AI_Analysis_Results`;
}

// ---------------------------------------------
// コレクション参照関数
// ---------------------------------------------

const AccountingLedgerRef = () =>
  collection(db, getAccountingLedgerCollectionPath());
const AIAnalysisRef = () => collection(db, getAIAnalysisCollectionPath());

/**
 * 最終会計データをFirestoreに保存する
 * @param ledgerData AccountingFinalLedgerデータ
 */
export async function saveFinalLedger(ledgerData: Record<string, unknown> & { id: string }): Promise<void> {
  const ledgerRef = AccountingLedgerRef();
  // ドキュメントIDは取引IDを使用
  const docRef = doc(ledgerRef, ledgerData.id);
  try {
    await setDoc(docRef, ledgerData);
    console.log(
      "Firestore: Final Ledger saved successfully for ID:",
      ledgerData.id
    );
  } catch (e) {
    console.error("Firestore: Error adding document (saveFinalLedger): ", e);
    throw e;
  }
}

/**
 * AI分析結果をFirestoreに保存する
 * @param analysisData AIAnalysisResultデータ
 */
export async function saveAIAnalysisResult(analysisData: Record<string, unknown>): Promise<void> {
  const analysisRef = AIAnalysisRef();
  // 自動生成IDを使用
  try {
    await addDoc(analysisRef, analysisData);
    console.log("Firestore: AI Analysis Result saved successfully.");
  } catch (e) {
    console.error(
      "Firestore: Error adding document (saveAIAnalysisResult): ",
      e
    );
    throw e;
  }
}
