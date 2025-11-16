// rakuten_arbitrage_tool.ts (Angular Service/Component統合ファイル想定)

import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// --- データ構造定義 ---

export interface Product {
    asin: string;
    productName: string;
    rakutenPrice: number;
    amazonNetRevenue: number;
    currentBSR: number;
    // ロジックから算出される値 (UIで表示)
    effectiveRakutenPrice: number;
    netProfit: number;
    profitRate: number;
    isEligible: boolean; // 出品可否
    
    // ステータス管理
    purchaseStatus: 'pending' | 'bought' | 'skipped';
}

export interface Settings {
    spuMultiplier: number; // SPU倍率 (例: 10 -> 10%)
    minProfitRate: number; // 最低利益率 (例: 0.10 -> 10%)
    maxBSR: number; // 最大BSR (例: 20000)
}

// 3.1. 仕入れルート（店舗/カテゴリ）トラッキング機能
export interface TrackedRoute {
    id: string; // Firestore ID
    name: string; // 店舗名/カテゴリ名
    url: string; // 追跡URL
}

export interface SalesRecord {
    asin: string; // 5. 実績リストの改善: ASINを追加
    productName: string;
    netProfit: number;
    purchaseDate: Date;
}

// 既知の制限ASINリスト
const knownRestrictedAsins = ['B001ABC', 'B002XYZ', 'B003EFG'];


@Injectable({
    providedIn: 'root'
})
export class ArbitrageToolService {

    // Signals for State Management
    public settings: WritableSignal<Settings> = signal(this.loadSettings());
    public allProducts: WritableSignal<Product[]> = signal(this.loadProducts());
    public trackedRoutes: WritableSignal<TrackedRoute[]> = signal([]); // 3.1. 仕入れルートトラッキング
    public salesRecords: WritableSignal<SalesRecord[]> = signal(this.loadSalesRecords()); // 3.4. 実績リスト

    // フィルターされた商品リスト (ロジックのコア)
    public filteredProducts = computed(() => {
        const s = this.settings();
        
        // 4. ロジックの確認: フィルタリング
        const filtered = this.allProducts()
            .map(p => this.calculateProductMetrics(p, s)) // メトリクス再計算
            .filter(p => 
                // pendingステータスのみ
                p.purchaseStatus === 'pending' && 
                // 出品制限なし
                p.isEligible === true && 
                // BSR基準を満たす
                p.currentBSR <= s.maxBSR && 
                // 利益率基準を満たす
                p.profitRate >= s.minProfitRate
            );

        // 3.3. 利益順ソート
        // 純利益の高い順にソート (降順)
        return filtered.sort((a, b) => b.netProfit - a.netProfit);
    });

    constructor(private http: HttpClient) {
        // 3.1. 初期ロード
        this.loadTrackedRoutes();
    }

    // --- データロード/保存（Firestore連携を想定） ---

    private loadSettings(): Settings {
        return { spuMultiplier: 12, minProfitRate: 0.15, maxBSR: 20000 };
    }
    private loadProducts(): Product[] {
        // モックデータには出品可否情報も含む
        return [
            { asin: 'X001A', productName: 'Camera Lens', rakutenPrice: 10000, amazonNetRevenue: 13000, currentBSR: 5000, purchaseStatus: 'pending', effectiveRakutenPrice: 0, netProfit: 0, profitRate: 0, isEligible: true },
            { asin: 'B001ABC', productName: 'Restricted Item', rakutenPrice: 5000, amazonNetRevenue: 9000, currentBSR: 1000, purchaseStatus: 'pending', effectiveRakutenPrice: 0, netProfit: 0, profitRate: 0, isEligible: false },
            { asin: 'X003C', productName: 'High Profit', rakutenPrice: 20000, amazonNetRevenue: 25500, currentBSR: 8000, purchaseStatus: 'pending', effectiveRakutenPrice: 0, netProfit: 0, profitRate: 0, isEligible: true },
        ];
    }
    private loadSalesRecords(): SalesRecord[] {
        return [
            { asin: 'P900', productName: 'Past Sold Item', netProfit: 1500, purchaseDate: new Date() }
        ];
    }
    private loadTrackedRoutes(): void {
        // 💡 実際のFirestoreから取得するロジックをここに実装
        this.trackedRoutes.set([
            { id: 'T001', name: 'Joshin WEB', url: 'https://www.joshin.co.jp/' },
            { id: 'T002', name: '楽天ブックス (ゲーム)', url: 'https://books.rakuten.co.jp/game/' },
        ]);
    }

    // --- 4. ロジックの確認: 純利益計算 ---

    /**
     * 商品のメトリクス（利益、回転率）を計算する
     */
    private calculateProductMetrics(product: Product, s: Settings): Product {
        // 実質仕入れ値
        product.effectiveRakutenPrice = product.rakutenPrice * (1 - s.spuMultiplier / 100);
        // 純利益計算
        product.netProfit = Math.round(product.amazonNetRevenue - product.effectiveRakutenPrice);
        // 利益率
        product.profitRate = product.netProfit / product.amazonNetRevenue;
        
        // 出品可否はここでは変更しないが、次回データ取得時に更新される
        
        return product;
    }

    // --- 3.1. 仕入れルート（店舗/カテゴリ）トラッキング機能のコア実装 ---

    /**
     * フォームからのnameとurlの追加
     */
    public addTrackedRoute(name: string, url: string): void {
        if (!name || !url) return;
        const newRoute: TrackedRoute = { id: Date.now().toString(), name, url };
        
        // 💡 Firestoreに追加するロジックを実装
        // this.db.collection('tracked_routes').add(newRoute);

        this.trackedRoutes.update(routes => [...routes, newRoute]);
    }

    /**
     * 登録済みリストの表示と削除
     */
    public removeTrackedRoute(routeId: string): void {
        // 💡 Firestoreから削除するロジックを実装
        // this.db.collection('tracked_routes').doc(routeId).delete();

        this.trackedRoutes.update(routes => routes.filter(r => r.id !== routeId));
    }


    // --- 3.2. 出品可否クイックチェック機能の明確化 ---
    
    /**
     * ASINの出品可否をシミュレーションし、制限ASINを登録する
     */
    public checkAsinEligibility(asin: string): boolean {
        // 3.2. 現在のロジック: ハードコードされた配列に含まれるASINは「制限あり」
        const isRestricted = knownRestrictedAsins.includes(asin);

        if (isRestricted) {
            // 自動で「既知の制限ASINリスト」に追加 (ここでは配列に存在することを確認するのみ)
            console.log(`ASIN ${asin} は既知の制限ASINです。`);
        }
        
        // 💡 UI上で「この機能はAmazon SP-APIの応答を模擬しています」という旨の説明文を追記すること。
        
        return !isRestricted;
    }

    // --- 3.4. 実績登録時のステータス管理の改善 ---

    /**
     * 仕入れ実行（実績登録）後のステータス更新
     */
    public updateStatus(asin: string, newStatus: 'bought' | 'skipped'): void {
        const productIndex = this.allProducts().findIndex(p => p.asin === asin);
        if (productIndex === -1) return;

        const product = this.allProducts()[productIndex];

        if (newStatus === 'bought') {
            // 1. メインリストから消える動作でOK（filteredProductsから除外される）
            product.purchaseStatus = 'bought';
            
            // 2. 販売実績（sales_records）へのデータ登録を確実に行う
            const record: SalesRecord = {
                asin: product.asin, // 5. 実績リストの改善: ASINも記録
                productName: product.productName,
                netProfit: product.netProfit, // 純利益情報
                purchaseDate: new Date(),
            };
            this.salesRecords.update(records => [record, ...records]);
            
            // 💡 Firestoreのsales_recordsコレクションに登録するロジックを実装
            // this.db.collection('sales_records').add(record);
            
            console.log(`[Status Update] 仕入れ実行: ${product.productName} を実績に登録しました。`);
        } else if (newStatus === 'skipped') {
            product.purchaseStatus = 'skipped';
            console.log(`[Status Update] ${product.productName} を見送りました。`);
        }

        // 💡 allProducts Signalを更新して、filteredProductsを再計算させる
        this.allProducts.update(products => {
            products[productIndex] = product;
            return [...products];
        });
    }
}

// ----------------------------------------------------
// 💡 Angularコンポーネント側でのUI/UX実装指示 (Claude/MCP 担当)
// ----------------------------------------------------

/*
// 3.3. 利益順ソートの強調表示
// メインリストのタイトル: <h3>仕入れ候補リスト <small> (純利益の高い順に表示されています)</small></h3>

// 3.1. 仕入れルートトラッキング UI
// <section>
//   <form (ngSubmit)="service.addTrackedRoute(name.value, url.value)">...</form>
//   <ul>
//     <li *ngFor="let route of service.trackedRoutes()">
//       {{ route.name }} - <a [href]="route.url" target="_blank">{{ route.url }}</a>
//       <button (click)="service.removeTrackedRoute(route.id)">
//         <i class="fas fa-trash-alt"></i> //       </button>
//     </li>
//   </ul>
// </section>

// 5. 3. アクションボタンの明確化
// 仕入れ実行ボタン: <button (click)="service.updateStatus(product.asin, 'bought')" class="bg-red-600 hover:bg-red-700 text-white font-bold">仕入れ実行</button>

// 5. 4. 実績リストの改善:
// <div *ngFor="let record of service.salesRecords()">
//   <p>ASIN: {{ record.asin }} / 商品名: {{ record.productName }} / 利益: ¥{{ record.netProfit }}</p>
// </div>

// 3.2. 出品可否クイックチェックの説明文
// <p class="text-sm text-gray-500">
//   ※この機能はAmazon SP-APIの応答を模擬しています。正確な出品可否は、Amazonセラーセントラルで最終確認してください。
// </p>

// 5. モバイル対応 / フォントアイコンの最適化 (Tailwind CSS)
// 💡 モバイルファーストのレイアウトと、設定(fas fa-cog)やリスト(fas fa-list)などの適切なアイコンを使用
*/