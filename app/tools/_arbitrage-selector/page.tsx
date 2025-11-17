'use client'
// FIREBASE_DISABLED_MODE: このツールはFirebase機能なしで動作します（表示のみ）

import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';

// FirebaseとアプリのIDはグローバル変数として提供されます (Canvas環境の制約)
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string;

// MARK: - データの型定義

// Firestoreに保存する刈り取りパターン設定の型
interface PatternSetting {
  id: string;
  patternName: string; 
  minDropRate: number; // 最小下落率 (P1向け)
  minProfitRate: number; // 最小利益率
  maxRank: number; // 最大ランキング (回転率の指標)
  isActive: boolean;
}

// 検出されたアラート機会の型
interface AlertOpportunity {
  id: string;
  asin: string;
  productName: string;
  patternType: string; 
  currentPrice: number;
  averagePrice30Days: number;
  profitRate: number;
  dropRate: number;
  alertDate: Date;
  recommendedBuyPrice: number;
  currentBSR: number; // 回転率判定用に追加
  purchaseStatus: 'pending' | 'auto-bought' | 'manual-skipped'; // 自動購入シミュレーション用
}

// 廃盤品ホワイトリストの型
interface WhiteListAsin {
  id: string;
  asin: string;
  manufacturer: string;
  note: string;
}

@Component({
  selector: 'app-root',
  template: `
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <div class="min-h-screen bg-gray-50 p-4 md:p-10">
      <header class="text-center mb-10">
        <h1 class="text-4xl font-extrabold text-gray-900 mb-2">
          <i class="fas fa-search-dollar text-red-600 mr-3"></i> Amazon刈り取り自動選定ダッシュボード
        </h1>
        <p class="text-gray-600">設定された戦略パターンに基づき、利益が出るチャンス商品を自動でリスト化します。</p>
      </header>

      <!-- Firebase / Auth Status -->
      <div class="max-w-7xl mx-auto mb-6 p-3 bg-white rounded-xl shadow-md flex justify-between items-center">
        <p class="text-sm font-medium text-gray-700">
          認証状態: 
          <span [class]="{'text-green-600': userId(), 'text-red-600': !userId()}" class="font-bold ml-1">
            {{ isAuthReady() ? (userId() ? '認証済み' : '未認証（匿名）') : '認証中...' }}
          </span>
        </p>
        <p class="text-xs text-gray-500 truncate ml-4">
          ユーザーID: <span class="font-mono">{{ userId() || 'N/A' }}</span>
        </p>
      </div>

      <main class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <!-- 1. パターン設定管理 -->
        <section class="lg:col-span-1">
          <h2 class="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            <i class="fas fa-filter text-blue-500 mr-2"></i> 刈り取りパターン設定 (P1, P2...)
          </h2>
          <div class="bg-white rounded-xl shadow-lg p-4 mb-6">
            <form (submit)="addPattern($event)">
              <input type="text" placeholder="パターン名 (例: P1:急落)" #patternNameInput class="input-style mb-2" required>
              <div class="grid grid-cols-3 gap-2 mb-2 text-xs">
                <input type="number" placeholder="下落率 (%)" #minDropRateInput class="input-style" min="1" required>
                <input type="number" placeholder="利益率 (%)" #minProfitRateInput class="input-style" min="1" required>
                <input type="number" placeholder="最大BSR" #maxRankInput class="input-style" min="1" required>
              </div>
              <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm">
                <i class="fas fa-plus mr-1"></i> 新しいパターンを追加
              </button>
            </form>
          </div>

          <!-- 既存パターンリスト -->
          <div class="space-y-3">
            <div *for="let pattern of patternSettings()" class="card p-3 flex items-center justify-between border border-gray-100 transition duration-150" [ngClass]="{'bg-blue-50 border-blue-200 shadow-sm': pattern.isActive, 'bg-white': !pattern.isActive}">
              <div>
                <h3 class="font-bold text-gray-900">{{ pattern.patternName }}</h3>
                <p class="text-xs text-gray-600 mt-1">
                  落: {{ pattern.minDropRate }}% | 益: {{ pattern.minProfitRate }}% | BSR: {{ pattern.maxRank | number }}
                </p>
              </div>
              <div class="flex items-center space-x-1">
                <button (click)="toggleActive(pattern)" class="text-xs font-semibold px-2 py-0.5 rounded-full transition" 
                        [ngClass]="{'bg-green-500 text-white hover:bg-green-600': pattern.isActive, 'bg-gray-200 text-gray-700 hover:bg-gray-300': !pattern.isActive}">
                  {{ pattern.isActive ? 'ON' : 'OFF' }}
                </button>
                <button (click)="deletePattern(pattern.id)" class="text-red-500 hover:text-red-700 p-0.5 rounded-full transition text-sm">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- P3 廃盤品ホワイトリスト -->
          <h2 class="text-xl font-semibold text-gray-800 mt-8 mb-4 pb-2 border-b border-gray-200">
            <i class="fas fa-box-open text-purple-500 mr-2"></i> P3 廃盤品ASIN (White List)
          </h2>
          <div class="bg-white rounded-xl shadow-lg p-4 mb-4">
             <form (submit)="addWhiteListAsin($event)">
                <input type="text" placeholder="ASIN (例: B00XXXX)" #asinInput class="input-style mb-2" required>
                <input type="text" placeholder="メーカー/メモ" #noteInput class="input-style mb-2">
                <button type="submit" class="w-full px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition text-sm">
                  <i class="fas fa-plus mr-1"></i> 追跡対象ASINを追加
                </button>
              </form>
          </div>
          <div class="space-y-2 max-h-40 overflow-y-auto">
              <div *for="let item of whiteListAsins()" class="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                <div class="text-xs">
                  <span class="font-mono font-bold">{{ item.asin }}</span>
                  <p class="text-gray-600 truncate">{{ item.note }}</p>
                </div>
                <button (click)="deleteWhiteListAsin(item.id)" class="text-red-500 hover:text-red-700 p-1 text-sm">
                  <i class="fas fa-times"></i>
                </button>
              </div>
          </div>

        </section>

        <!-- 2. 自動検出されたアラートリスト -->
        <section class="lg:col-span-3">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            <i class="fas fa-exclamation-triangle text-red-600 mr-2"></i> 刈り取りチャンスアラート ({{ alertOpportunities().length }}件)
          </h2>
          
          <div *if="alertOpportunities().length === 0" class="card p-8 text-center bg-yellow-50 text-yellow-700">
            <i class="fas fa-sync-alt fa-spin text-2xl mb-3"></i>
            <p class="font-medium">現在、アクティブなパターンに適合する商品はありません。APIによる大量ASINチェックと照合を実行中です...</p>
          </div>

          <div *if="alertOpportunities().length > 0" class="space-y-4">
            <div *for="let alert of alertOpportunities()" class="card p-4 border-l-4" [ngClass]="getAlertStyle(alert.patternType, alert.purchaseStatus)">
              <div class="flex justify-between items-center">
                <div class="flex-grow">
                  <h3 class="text-xl font-bold text-gray-900 mb-1">{{ alert.productName }} (ASIN: {{ alert.asin }})</h3>
                  <div class="flex items-center space-x-2">
                      <span class="text-xs font-semibold px-3 py-0.5 rounded-full text-white" 
                            [ngClass]="getPatternBadgeStyle(alert.patternType)">
                        {{ getPatternLabel(alert.patternType) }}
                      </span>
                       <span class="text-sm font-bold text-gray-700">
                        回転率 (BSR): <span class="font-extrabold" [ngClass]="alert.currentBSR < 5000 ? 'text-green-600' : 'text-orange-600'">{{ alert.currentBSR | number }}位</span>
                      </span>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">アラート日時: {{ alert.alertDate | date:'yyyy/MM/dd HH:mm' }}</p>
                </div>
                
                <div class="text-right ml-4 w-40">
                  <p class="text-3xl font-extrabold text-red-700 leading-none">{{ alert.dropRate }}%</p>
                  <p class="text-xs text-red-600 mb-1">価格下落率</p>
                  <p class="text-2xl font-extrabold text-green-700 leading-none">{{ alert.profitRate }}%</p>
                  <p class="text-xs text-green-600">想定利益率</p>
                </div>
              </div>
              
              <!-- 自動購入シミュレーションとアクション -->
              <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
                <div class="flex flex-col">
                  <span>カート価格: <span class="font-bold text-gray-900">¥{{ alert.currentPrice | number }}</span></span>
                  <span>推奨仕入れ値: <span class="font-bold text-blue-600">¥{{ alert.recommendedBuyPrice | number }}</span></span>
                </div>
                
                <div class="flex space-x-2">
                  <button *if="alert.purchaseStatus === 'pending'" (click)="simulatePurchase(alert.id, 'auto-bought')" 
                          class="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md flex items-center text-sm">
                      <i class="fas fa-robot mr-2"></i> 自動購入シミュレーション
                  </button>
                  <button *if="alert.purchaseStatus === 'auto-bought'" disabled
                          class="px-4 py-2 bg-green-500 text-white font-bold rounded-lg opacity-80 cursor-not-allowed flex items-center text-sm">
                      <i class="fas fa-check-circle mr-2"></i> 購入済み
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
    
    <style>
      .input-style { @apply w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 transition; }
      .card { @apply bg-white rounded-xl shadow-lg p-5; }
    </style>
  `,
  styles: [
    `
      .input-style {
        width: 100%;
        padding: 8px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        transition: all 0.2s;
        font-size: 0.875rem; /* text-sm */
      }
      .input-style:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5);
      }
      .card {
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  // MARK: - State Management (Signals)
  db: any;
  auth: any;
  userId = signal<string | null>(null);
  isAuthReady = signal(false);

  // Firestoreから取得するメインデータ
  patternSettings = signal<PatternSetting[]>([]);
  alertOpportunities = signal<AlertOpportunity[]>([]);
  whiteListAsins = signal<WhiteListAsin[]>([]);

  // MARK: - Initialization (Firebase Setup)
  ngOnInit(): void {
    try {
      const firebaseConfig = JSON.parse(__firebase_config);
      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);
      this.auth = getAuth(app);

      // 認証処理
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        signInWithCustomToken(this.auth, __initial_auth_token)
          .catch(e => {
            console.error("Custom token sign in failed, signing in anonymously.", e);
            signInAnonymously(this.auth);
          });
      } else {
        signInAnonymously(this.auth);
      }

      this.auth.onAuthStateChanged((user: any) => {
        this.userId.set(user ? user.uid : null);
        this.isAuthReady.set(true);
        if (user) {
          console.log("Authenticated with user ID:", user.uid);
          this.setupFirestoreListeners();
        } else {
          console.log("Signed in anonymously or failed to authenticate.");
          this.setupFirestoreListeners();
        }
      });
      
      // シミュレーションデータ投入 (API連携の代わり)
      this.loadSimulationData();

    } catch (e) {
      // Firebase initialization disabled
    }
  }
  
  // MARK: - Firestore Listeners
  setupFirestoreListeners(): void {
    if (!this.db || !this.isAuthReady()) return;
    
    const currentUserId = this.userId() || 'anonymous';
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // 1. パターン設定 (karitori_patterns)
    const patternsPath = `/artifacts/${appId}/users/${currentUserId}/karitori_patterns`;
    const patternsRef = collection(this.db, patternsPath);
    onSnapshot(patternsRef, (snapshot) => {
      const patterns: PatternSetting[] = [];
      snapshot.forEach(doc => {
        patterns.push({ id: doc.id, ...doc.data() } as PatternSetting);
      });
      this.patternSettings.set(patterns.sort((a, b) => (a.patternName > b.patternName ? 1 : -1)));
    }, (error) => {
      console.error("Error fetching pattern settings:", error);
    });

    // 2. アラート機会 (alert_opportunities)
    const alertsPath = `/artifacts/${appId}/users/${currentUserId}/alert_opportunities`;
    const alertsRef = collection(this.db, alertsPath);
    const q = query(alertsRef, orderBy('alertDate', 'desc')); 
    onSnapshot(q, (snapshot) => {
      const alerts: AlertOpportunity[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        alerts.push({
          id: doc.id,
          ...data,
          alertDate: data['alertDate'] ? data['alertDate'].toDate() : new Date(),
        } as AlertOpportunity);
      });
      this.alertOpportunities.set(alerts);
    }, (error) => {
      console.error("Error fetching alert opportunities:", error);
    });

    // 3. 廃盤品ホワイトリスト (white_list_asin)
    const whiteListPath = `/artifacts/${appId}/users/${currentUserId}/white_list_asin`;
    const whiteListRef = collection(this.db, whiteListPath);
    onSnapshot(whiteListRef, (snapshot) => {
      const whiteList: WhiteListAsin[] = [];
      snapshot.forEach(doc => {
        whiteList.push({ id: doc.id, ...doc.data() } as WhiteListAsin);
      });
      this.whiteListAsins.set(whiteList);
    }, (error) => {
      console.error("Error fetching white list ASINs:", error);
    });
  }

  // MARK: - Firestore Utility
  getCollectionPath(collectionName: string): string {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const currentUserId = this.userId() || 'anonymous';
    return `/artifacts/${appId}/users/${currentUserId}/${collectionName}`;
  }

  // MARK: - Pattern CRUD
  async addPattern(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.db || !this.userId()) { console.error("Database or User not ready."); return; }

    const form = event.target as HTMLFormElement;
    const patternNameInput = form.querySelector('input[placeholder="パターン名 (例: P1:急落)"]') as HTMLInputElement;
    const minDropRateInput = form.querySelector('input[placeholder="下落率 (%)"]') as HTMLInputElement;
    const minProfitRateInput = form.querySelector('input[placeholder="利益率 (%)"]') as HTMLInputElement;
    const maxRankInput = form.querySelector('input[placeholder="最大BSR"]') as HTMLInputElement;
    
    const newPattern: PatternSetting = {
      id: '', 
      patternName: patternNameInput.value.trim(),
      minDropRate: Number(minDropRateInput.value),
      minProfitRate: Number(minProfitRateInput.value),
      maxRank: Number(maxRankInput.value),
      isActive: true,
    };

    try {
      const patternsRef = collection(this.db, this.getCollectionPath('karitori_patterns'));
      await setDoc(doc(patternsRef), newPattern);
      form.reset();
      console.log("Pattern added successfully.");
    } catch (e) {
      console.error("Error adding pattern: ", e);
    }
  }

  async toggleActive(pattern: PatternSetting): Promise<void> {
    if (!this.db || !this.userId()) return;
    try {
      const patternRef = doc(this.db, this.getCollectionPath('karitori_patterns'), pattern.id);
      await setDoc(patternRef, { isActive: !pattern.isActive }, { merge: true });
    } catch (e) {
      console.error("Error toggling active status: ", e);
    }
  }

  async deletePattern(id: string): Promise<void> {
    if (!this.db || !this.userId()) return;
    try {
      const patternRef = doc(this.db, this.getCollectionPath('karitori_patterns'), id);
      await deleteDoc(patternRef);
    } catch (e) {
      console.error("Error deleting pattern: ", e);
    }
  }

  // MARK: - White List CRUD
  async addWhiteListAsin(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.db || !this.userId()) { console.error("Database or User not ready."); return; }

    const form = event.target as HTMLFormElement;
    const asinInput = form.querySelector('input[placeholder="ASIN (例: B00XXXX)"]') as HTMLInputElement;
    const noteInput = form.querySelector('input[placeholder="メーカー/メモ"]') as HTMLInputElement;
    
    const newAsin: WhiteListAsin = {
      id: '', 
      asin: asinInput.value.trim().toUpperCase(),
      manufacturer: '', 
      note: noteInput.value.trim(),
    };
    
    if (!newAsin.asin) return;

    try {
      const whiteListRef = collection(this.db, this.getCollectionPath('white_list_asin'));
      await setDoc(doc(whiteListRef), newAsin);
      form.reset();
      console.log("White List ASIN added successfully.");
    } catch (e) {
      console.error("Error adding white list ASIN: ", e);
    }
  }

  async deleteWhiteListAsin(id: string): Promise<void> {
    if (!this.db || !this.userId()) return;
    try {
      const asinRef = doc(this.db, this.getCollectionPath('white_list_asin'), id);
      await deleteDoc(asinRef);
    } catch (e) {
      console.error("Error deleting white list ASIN: ", e);
    }
  }

  // MARK: - Automatic Purchase Simulation
  async simulatePurchase(id: string, status: 'auto-bought' | 'manual-skipped'): Promise<void> {
    if (!this.db || !this.userId()) return;
    try {
      const alertRef = doc(this.db, this.getCollectionPath('alert_opportunities'), id);
      await setDoc(alertRef, { purchaseStatus: status }, { merge: true });

      const alert = this.alertOpportunities().find(a => a.id === id);
      if (alert) {
          const message = status === 'auto-bought' 
              ? `${alert.productName} を即時購入しました（シミュレーション）！`
              : `${alert.productName} の購入を見送りました。`;
          console.log(message);
      }
    } catch (e) {
      console.error("Error simulating purchase: ", e);
    }
  }

  // MARK: - UI Style & Utility
  getPatternLabel(type: string): string {
    switch (type) {
      case 'P1': return 'P1: 価格急落/バグ';
      case 'P2': return 'P2: カート枯渇後の復活';
      case 'P3': return 'P3: 廃盤・希少性高騰';
      case 'P4': return 'P4: トレンド/メディア波';
      default: return 'その他';
    }
  }

  getPatternBadgeStyle(type: string): string {
    switch (type) {
      case 'P1': return 'bg-red-500';
      case 'P2': return 'bg-yellow-600';
      case 'P3': return 'bg-purple-600';
      case 'P4': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }

  getAlertStyle(type: string, status: string): string {
      let baseStyle = '';
      switch (type) {
        case 'P1': baseStyle = 'border-red-500'; break;
        case 'P2': baseStyle = 'border-yellow-500'; break;
        case 'P3': baseStyle = 'border-purple-500'; break;
        case 'P4': baseStyle = 'border-blue-500'; break;
        default: baseStyle = 'border-gray-500';
      }
      if (status === 'auto-bought') {
          return `${baseStyle} bg-green-50`;
      }
      return `${baseStyle} bg-white`;
  }

  // API連携のシミュレーションデータ投入 (初期表示用)
  loadSimulationData(): void {
    const mockAlerts: AlertOpportunity[] = [
      {
        id: 'mock1', asin: 'B08F9V2Q4C', productName: '廃盤レゴセット (限定品)', 
        patternType: 'P3', currentPrice: 15000, averagePrice30Days: 25000, 
        profitRate: 35.5, dropRate: 40.0, alertDate: new Date(Date.now() - 3600000), 
        recommendedBuyPrice: 14500, currentBSR: 8500, purchaseStatus: 'pending' // 回転率が少し悪い（8500位）
      },
      {
        id: 'mock2', asin: 'B09R8T7Y5A', productName: '最新ワイヤレスイヤホン', 
        patternType: 'P1', currentPrice: 8000, averagePrice30Days: 10000, 
        profitRate: 15.0, dropRate: 20.0, alertDate: new Date(Date.now() - 7200000),
        recommendedBuyPrice: 7500, currentBSR: 800, purchaseStatus: 'pending' // 回転率が良い（800位）
      },
      {
        id: 'mock3', asin: 'B00005C8O9', productName: '人気ドライヤー (Amazon復活)', 
        patternType: 'P2', currentPrice: 22000, averagePrice30Days: 30000, 
        profitRate: 25.0, dropRate: 26.7, alertDate: new Date(Date.now() - 10800000),
        recommendedBuyPrice: 20000, currentBSR: 1500, purchaseStatus: 'auto-bought' // すでに自動購入済み
      },
      {
        id: 'mock4', asin: 'B07M1XQ7C6', productName: '高騰実績あり書籍', 
        patternType: 'P3', currentPrice: 3000, averagePrice30Days: 5000, 
        profitRate: 50.0, dropRate: 40.0, alertDate: new Date(Date.now() - 14400000),
        recommendedBuyPrice: 2000, currentBSR: 12000, purchaseStatus: 'pending' // 利益率が高いがBSRが悪い
      },
    ];
    this.alertOpportunities.set(mockAlerts);
  }
}
