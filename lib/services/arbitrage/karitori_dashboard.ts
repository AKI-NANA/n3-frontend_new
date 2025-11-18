// karitori_dashboard.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// --- 2. Firestoreデータ構造の追加指示 ---

// P3 戦略のための新規データ構造
export interface WhiteListCategory {
    id?: string; // FirestoreドキュメントID
    categoryName: string; // 登録されたカテゴリ名
    searchKeyword: string; // APIでASINを検索するためのキーワード
    manufacturer: string; // 追跡したいメーカー名（任意）
    highProfitsCount: number; // 高騰実績回数 (シミュレーション用)
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
}

@Injectable({
    providedIn: 'root'
})
export class KaritoriDashboardService {

    // 💡 Firestoreのコレクションを想定したプロパティ
    private db: any; // Firestoreオブジェクトを想定

    public alerts: KaritoriAlert[] = [];
    public whiteListCategories: WhiteListCategory[] = [];

    // 自動購入の基準値
    private readonly MIN_PROFIT_RATE = 0.20; // 20%
    private readonly MAX_BSR_FOR_AUTO = 5000; // 5000位以下 (回転率OK)

    constructor(private http: HttpClient) {
        this.db = {}; // 実際のFirestore初期化ロジックに置き換える
        this.loadSimulationData();
        this.loadWhiteListCategories(); // P3データをロード
    }

    // --- データロード関数 ---

    /**
     * 3.3. シミュレーションデータの強化: モックデータを更新
     */
    private loadSimulationData(): void {
        this.alerts = [
            // 既存ケース: 利益率NG (15%), BSR OK (2000)
            { id: 'A001', asin: 'X001A', productName: 'Old Game Console', alertedPrice: 100, profitRate: 0.15, currentBSR: 2000, purchaseStatus: 'pending' },
            
            // [新規] 1. 自動購入NGケース: 利益率が25%だが、BSRが6000位（回転率NG）
            { id: 'A002', asin: 'X002B', productName: 'Rare Limited Edition Book', alertedPrice: 50, profitRate: 0.25, currentBSR: 6000, purchaseStatus: 'pending' },
            
            // [新規] 2. 自動購入OKケース: 利益率が22%で、BSRが3000位（両方OK）
            { id: 'A003', asin: 'X003C', productName: 'Niche Collector Toy', alertedPrice: 200, profitRate: 0.22, currentBSR: 3000, purchaseStatus: 'pending' },
        ];
    }

    private loadWhiteListCategories(): void {
        // 💡 実際のFirestoreからデータを取得するロジックに置き換える
        this.whiteListCategories = [
            { id: 'C001', categoryName: 'Lego 限定版', searchKeyword: 'LEGO exclusive', manufacturer: 'LEGO', highProfitsCount: 15 },
        ];
    }

    // --- 3.1. UIとCRUDの追加: P3 カテゴリ管理機能 ---

    /**
     * WhiteListCategoryをFirestoreに登録する (CRUD - Create)
     * @param newCategoryData - ユーザーがUIから入力した新規カテゴリデータ
     */
    public addWhiteListCategory(newCategoryData: { categoryName: string, searchKeyword: string, manufacturer: string }): void {
        const newCategory: WhiteListCategory = {
            ...newCategoryData,
            highProfitsCount: 0, // highProfitsCountはデフォルトで0とする
            id: 'C' + (this.whiteListCategories.length + 1).toString().padStart(3, '0') // モックID生成
        };

        // 💡 実際のFirestoreへの追加処理をここに実装
        // this.db.collection('white_list_categories').add(newCategory);
        
        this.whiteListCategories.push(newCategory);
        console.log(`[P3 CRUD] カテゴリ登録成功: ${newCategory.categoryName}`);
    }

    /**
     * WhiteListCategoryをFirestoreから削除する (CRUD - Delete)
     * @param id - 削除するカテゴリのFirestore ID
     */
    public deleteWhiteListCategory(id: string): void {
        // 💡 実際のFirestoreからの削除処理をここに実装
        // this.db.collection('white_list_categories').doc(id).delete();
        
        this.whiteListCategories = this.whiteListCategories.filter(c => c.id !== id);
        console.log(`[P3 CRUD] カテゴリ削除成功: ID ${id}`);
    }


    // --- 3.2. 自動購入シミュレーションロジックの強化（最重要） ---

    /**
     * 自動購入の判断をシミュレートし、ステータスを更新する
     * @param id - 対象となるアラートID
     * @param status - 手動見送り時 ('manual-skipped') またはシミュレーション開始時 ('pending')
     */
    public simulatePurchase(id: string, status: 'auto-bought' | 'manual-skipped'): void {
        const alert = this.alerts.find(a => a.id === id);
        if (!alert) return;

        // 既存の自動購入をスキップするロジックの場合
        if (status === 'manual-skipped') {
            alert.purchaseStatus = 'manual-skipped';
            // 💡 Firestoreのドキュメントを更新する処理をここに実装
            // this.db.collection('alerts').doc(id).update({ purchaseStatus: 'manual-skipped' });
            console.log(`[Simulation] ${id} - 手動で見送り`);
            return;
        }

        // --- 自動購入判断ロジック（AND条件）---
        
        // 条件1: 利益率が20%を超えている (alert.profitRate > 0.20)
        const isProfitable = alert.profitRate > this.MIN_PROFIT_RATE;
        
        // 条件2: 回転率が5000位を下回っている (alert.currentBSR <= 5000)
        const isFastMoving = alert.currentBSR <= this.MAX_BSR_FOR_AUTO;

        let newStatus: 'auto-bought' | 'manual-skipped';

        // 条件 (ORではなくAND): 利益率 AND 回転率 の両方が基準を満たす場合のみ
        if (isProfitable && isFastMoving) {
            newStatus = 'auto-bought';
            console.log(`[Simulation] ${id} - 自動購入実行 (利益率: ${alert.profitRate * 100}%, BSR: ${alert.currentBSR})`);
            // 💡 実際の自動購入システムへのAPIコールをトリガーする
            // this.http.post('/api/auto-buy', { asin: alert.asin, price: alert.alertedPrice }).subscribe();
        } else {
            newStatus = 'manual-skipped';
            
            const reason = [];
            if (!isProfitable) reason.push(`利益率(${alert.profitRate * 100}%)が${this.MIN_PROFIT_RATE * 100}%未満`);
            if (!isFastMoving) reason.push(`BSR(${alert.currentBSR}位)が${this.MAX_BSR_FOR_AUTO}位を超過`);
            
            console.log(`[Simulation] ${id} - 自動購入NG (${reason.join(' AND ')})`);
        }

        alert.purchaseStatus = newStatus;
        // 💡 Firestoreのドキュメントを更新する処理をここに実装
        // this.db.collection('alerts').doc(id).update({ purchaseStatus: newStatus });
    }
}

// ----------------------------------------------------
// 💡 Angularコンポーネント側での呼び出しイメージ (UIとの連携)
// ----------------------------------------------------

/*
// UIのボタンクリック時:
// service.simulatePurchase('A003', 'pending');
// service.simulatePurchase('A001', 'manual-skipped');

// UIでの表示例 (A003):
// ステータス: auto-bought (自動購入実行)

// UIでの表示例 (A002):
// ステータス: manual-skipped (自動購入NG - 利益率OK, 回転率NG)
*/