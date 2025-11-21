// karitori_dashboard.ts - Next.js/React version with Firestore integration

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/src/utils/firebaseUtils';

// --- 2. Firestoreデータ構造の追加指示 ---

// P3 戦略のための新規データ構造
export interface WhiteListCategory {
  id?: string; // FirestoreドキュメントID
  categoryName: string; // 登録されたカテゴリ名
  searchKeyword: string; // APIでASINを検索するためのキーワード
  manufacturer: string; // 追跡したいメーカー名（任意）
  highProfitsCount: number; // 高騰実績回数 (シミュレーション用)
  createdAt?: Timestamp; // 作成日時
}

// 既存のアラートデータ構造
export interface KaritoriAlert {
  id: string;
  asin: string;
  productName: string;
  alertedPrice: number;
  profitRate: number; // 利益率 (例: 0.25 -> 25%)
  currentBSR: number; // 現在のBSR (回転率)
  purchaseStatus: 'pending' | 'auto-bought' | 'manual-skipped';
  skipReason?: string; // 自動購入NGの理由
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Firestore コレクションパス
const COLLECTIONS = {
  ALERTS: 'karitori_alerts',
  WHITE_LIST_CATEGORIES: 'white_list_categories',
  WHITE_LIST_ASINS: 'white_list_asins', // P3 廃盤品ASIN用
};

/**
 * KaritoriDashboardService - Amazon刈り取り自動選定・購入サービス
 * Next.js/React環境での使用を想定
 */
export class KaritoriDashboardService {
  // 自動購入の基準値
  private readonly MIN_PROFIT_RATE = 0.20; // 20%
  private readonly MAX_BSR_FOR_AUTO = 5000; // 5000位以下 (回転率OK)

  // --- 3.1. WhiteListCategory CRUD操作 ---

  /**
   * WhiteListCategoryを全件取得する
   */
  async loadWhiteListCategories(): Promise<WhiteListCategory[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.WHITE_LIST_CATEGORIES),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const categories: WhiteListCategory[] = [];
      querySnapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data(),
        } as WhiteListCategory);
      });

      console.log(`[P3 CRUD] カテゴリ読込成功: ${categories.length}件`);
      return categories;
    } catch (error) {
      console.error('[P3 CRUD] カテゴリ読込エラー:', error);
      throw error;
    }
  }

  /**
   * WhiteListCategoryをFirestoreに登録する (CRUD - Create)
   * @param newCategoryData - ユーザーがUIから入力した新規カテゴリデータ
   */
  async addWhiteListCategory(newCategoryData: {
    categoryName: string;
    searchKeyword: string;
    manufacturer: string;
  }): Promise<string> {
    try {
      const newCategory: Omit<WhiteListCategory, 'id'> = {
        ...newCategoryData,
        highProfitsCount: 0, // highProfitsCountはデフォルトで0とする
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTIONS.WHITE_LIST_CATEGORIES),
        newCategory
      );

      console.log(`[P3 CRUD] カテゴリ登録成功: ${newCategory.categoryName} (ID: ${docRef.id})`);
      return docRef.id;
    } catch (error) {
      console.error('[P3 CRUD] カテゴリ登録エラー:', error);
      throw error;
    }
  }

  /**
   * WhiteListCategoryをFirestoreから削除する (CRUD - Delete)
   * @param id - 削除するカテゴリのFirestore ID
   */
  async deleteWhiteListCategory(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.WHITE_LIST_CATEGORIES, id));
      console.log(`[P3 CRUD] カテゴリ削除成功: ID ${id}`);
    } catch (error) {
      console.error('[P3 CRUD] カテゴリ削除エラー:', error);
      throw error;
    }
  }

  /**
   * WhiteListCategoryの高騰実績回数を更新する
   * @param id - 更新するカテゴリのFirestore ID
   * @param count - 新しい高騰実績回数
   */
  async updateHighProfitsCount(id: string, count: number): Promise<void> {
    try {
      const categoryRef = doc(db, COLLECTIONS.WHITE_LIST_CATEGORIES, id);
      await updateDoc(categoryRef, {
        highProfitsCount: count,
      });
      console.log(`[P3 CRUD] 高騰実績回数更新成功: ID ${id}, Count ${count}`);
    } catch (error) {
      console.error('[P3 CRUD] 高騰実績回数更新エラー:', error);
      throw error;
    }
  }

  // --- KaritoriAlert CRUD操作 ---

  /**
   * アラートを全件取得する
   */
  async loadAlerts(): Promise<KaritoriAlert[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ALERTS),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const alerts: KaritoriAlert[] = [];
      querySnapshot.forEach((doc) => {
        alerts.push({
          id: doc.id,
          ...doc.data(),
        } as KaritoriAlert);
      });

      console.log(`[Alert] アラート読込成功: ${alerts.length}件`);
      return alerts;
    } catch (error) {
      console.error('[Alert] アラート読込エラー:', error);
      throw error;
    }
  }

  /**
   * 新しいアラートを追加する
   */
  async addAlert(alertData: Omit<KaritoriAlert, 'id'>): Promise<string> {
    try {
      const newAlert = {
        ...alertData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTIONS.ALERTS),
        newAlert
      );

      console.log(`[Alert] アラート追加成功: ${alertData.productName} (ID: ${docRef.id})`);
      return docRef.id;
    } catch (error) {
      console.error('[Alert] アラート追加エラー:', error);
      throw error;
    }
  }

  // --- 3.2. 自動購入シミュレーションロジックの強化（最重要） ---

  /**
   * 自動購入の判断をシミュレートし、ステータスを更新する
   * @param alert - 対象となるアラートオブジェクト
   * @param forceStatus - 手動見送り時 ('manual-skipped') の強制指定
   * @returns 更新後のステータスと理由
   */
  async simulatePurchase(
    alert: KaritoriAlert,
    forceStatus?: 'manual-skipped'
  ): Promise<{
    status: 'auto-bought' | 'manual-skipped';
    reason?: string;
  }> {
    try {
      // 既存の自動購入をスキップするロジックの場合
      if (forceStatus === 'manual-skipped') {
        await this.updateAlertStatus(alert.id, 'manual-skipped', '手動で見送り');
        console.log(`[Simulation] ${alert.id} - 手動で見送り`);
        return { status: 'manual-skipped', reason: '手動で見送り' };
      }

      // --- 自動購入判断ロジック（AND条件）---

      // 条件1: 利益率が20%を超えている (alert.profitRate > 0.20)
      const isProfitable = alert.profitRate > this.MIN_PROFIT_RATE;

      // 条件2: 回転率が5000位を下回っている (alert.currentBSR <= 5000)
      const isFastMoving = alert.currentBSR <= this.MAX_BSR_FOR_AUTO;

      let newStatus: 'auto-bought' | 'manual-skipped';
      let reason = '';

      // 条件 (ORではなくAND): 利益率 AND 回転率 の両方が基準を満たす場合のみ
      if (isProfitable && isFastMoving) {
        newStatus = 'auto-bought';
        reason = `自動購入実行 (利益率: ${(alert.profitRate * 100).toFixed(1)}%, BSR: ${alert.currentBSR}位)`;
        console.log(`[Simulation] ${alert.id} - ${reason}`);

        // 💡 実際の自動購入システムへのAPIコールをトリガーする
        // await this.triggerAutoBuy(alert.asin, alert.alertedPrice);
      } else {
        newStatus = 'manual-skipped';

        const reasons: string[] = [];
        if (!isProfitable) {
          reasons.push(`利益率(${(alert.profitRate * 100).toFixed(1)}%)が${this.MIN_PROFIT_RATE * 100}%未満`);
        }
        if (!isFastMoving) {
          reasons.push(`BSR(${alert.currentBSR}位)が${this.MAX_BSR_FOR_AUTO}位を超過`);
        }

        reason = reasons.join(' AND ');
        console.log(`[Simulation] ${alert.id} - 自動購入NG (${reason})`);
      }

      // Firestoreのドキュメントを更新
      await this.updateAlertStatus(alert.id, newStatus, reason);

      return { status: newStatus, reason };
    } catch (error) {
      console.error('[Simulation] エラー:', error);
      throw error;
    }
  }

  /**
   * アラートのステータスを更新する
   */
  private async updateAlertStatus(
    alertId: string,
    status: 'pending' | 'auto-bought' | 'manual-skipped',
    skipReason?: string
  ): Promise<void> {
    try {
      const alertRef = doc(db, COLLECTIONS.ALERTS, alertId);
      await updateDoc(alertRef, {
        purchaseStatus: status,
        skipReason: skipReason || '',
        updatedAt: Timestamp.now(),
      });
      console.log(`[Alert] ステータス更新成功: ID ${alertId}, Status ${status}`);
    } catch (error) {
      console.error('[Alert] ステータス更新エラー:', error);
      throw error;
    }
  }

  /**
   * 実際の自動購入APIを呼び出す（プレースホルダー）
   * @param asin - 購入するASIN
   * @param price - 購入価格
   */
  private async triggerAutoBuy(asin: string, price: number): Promise<void> {
    try {
      // 💡 実装例: 自動購入APIへのPOSTリクエスト
      // const response = await fetch('/api/auto-buy', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ asin, price }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Auto-buy API failed');
      // }

      console.log(`[API] 自動購入APIコール: ASIN ${asin}, Price ${price}`);
    } catch (error) {
      console.error('[API] 自動購入APIエラー:', error);
      throw error;
    }
  }

  // --- 3.3. シミュレーションデータの生成（開発・テスト用） ---

  /**
   * シミュレーション用のサンプルデータをFirestoreに追加する
   * 開発・テスト用途
   */
  async seedSimulationData(): Promise<void> {
    try {
      const sampleAlerts: Omit<KaritoriAlert, 'id'>[] = [
        {
          asin: 'X001A',
          productName: 'Old Game Console',
          alertedPrice: 100,
          profitRate: 0.15, // 15% (NG)
          currentBSR: 2000, // OK
          purchaseStatus: 'pending',
        },
        {
          asin: 'X002B',
          productName: 'Rare Limited Edition Book',
          alertedPrice: 50,
          profitRate: 0.25, // 25% (OK)
          currentBSR: 6000, // 6000位 (NG)
          purchaseStatus: 'pending',
        },
        {
          asin: 'X003C',
          productName: 'Niche Collector Toy',
          alertedPrice: 200,
          profitRate: 0.22, // 22% (OK)
          currentBSR: 3000, // 3000位 (OK)
          purchaseStatus: 'pending',
        },
      ];

      for (const alert of sampleAlerts) {
        await this.addAlert(alert);
      }

      console.log('[Seed] シミュレーションデータ追加完了');
    } catch (error) {
      console.error('[Seed] シミュレーションデータ追加エラー:', error);
      throw error;
    }
  }

  /**
   * サンプルカテゴリをFirestoreに追加する
   */
  async seedSampleCategories(): Promise<void> {
    try {
      const sampleCategories = [
        {
          categoryName: 'Lego 限定版',
          searchKeyword: 'LEGO exclusive',
          manufacturer: 'LEGO',
        },
        {
          categoryName: '絶版ゲームソフト',
          searchKeyword: 'discontinued game',
          manufacturer: 'Nintendo',
        },
      ];

      for (const category of sampleCategories) {
        await this.addWhiteListCategory(category);
      }

      console.log('[Seed] サンプルカテゴリ追加完了');
    } catch (error) {
      console.error('[Seed] サンプルカテゴリ追加エラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const karitoriService = new KaritoriDashboardService();

// ----------------------------------------------------
// 💡 Next.js/Reactコンポーネント側での呼び出しイメージ
// ----------------------------------------------------

/*
// UIのボタンクリック時:
const handleSimulatePurchase = async (alert: KaritoriAlert) => {
  try {
    const result = await karitoriService.simulatePurchase(alert);
    console.log(`Purchase simulation result: ${result.status}, ${result.reason}`);
    // UIを更新
  } catch (error) {
    console.error('Purchase simulation failed:', error);
  }
};

// カテゴリ追加:
const handleAddCategory = async (data: {
  categoryName: string;
  searchKeyword: string;
  manufacturer: string;
}) => {
  try {
    const id = await karitoriService.addWhiteListCategory(data);
    console.log(`Category added with ID: ${id}`);
    // UIを更新
  } catch (error) {
    console.error('Category addition failed:', error);
  }
};
*/
