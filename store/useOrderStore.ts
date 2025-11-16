// 📁 格納パス: store/useOrderStore.ts
// 依頼内容: 受注データと仕入・利益管理の状態を保持するZustandストアを定義

import { create } from "zustand";

// 注文データの型定義
export interface Order {
  id: string; // 受注ID
  customerID: string; // 顧客ID (問い合わせ連携用)
  marketplace: "eBay" | "Amazon" | "Shopee" | "Qoo10"; // 販売モール
  orderDate: string; // 受注日
  shippingDeadline: string; // 最終出荷期限
  items: { sku: string; name: string; quantity: number; salePrice: number }[]; // 商品詳細

  // II-1. 受注リストの追加・強化項目
  inquiryHistoryCount: number; // 問合履歴件数
  estimatedProfit: number; // 見込純利益 (初期値)

  // II-2. 受注詳細パネルの強化項目
  purchaseStatus: "未仕入れ" | "仕入れ済み" | "キャンセル"; // 仕入ステータス
  estimatedPurchaseUrl: string; // 見込み仕入れ先URL
  actualPurchaseUrl: string | null; // 実際の仕入れ先URL (編集可)
  actualPurchaseCostJPY: number | null; // 実際の仕入れ値 (JPY) (編集可)
  estimatedShippingCostJPY: number; // 見込み送料
  finalShippingCostJPY: number | null; // 確定送料 (編集可)
  finalProfit: number | null; // 確定純利益
  isProfitConfirmed: boolean; // 利益確定済みフラグ
}

// ストアの型定義
interface OrderStore {
  orders: Order[];
  selectedOrderId: string | null;
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;

  fetchOrders: () => Promise<void>;
  selectOrder: (orderId: string | null) => void;
  updateOrderDetails: (orderId: string, updates: Partial<Order>) => void;
  markAsPurchased: (
    orderId: string,
    actualPurchaseUrl: string,
    actualPurchaseCostJPY: number
  ) => void;
  calculateProfit: (order: Order) => number;
}

// モックデータ (初期表示用)
const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-20251101-001",
    customerID: "CUST-001",
    marketplace: "eBay",
    orderDate: "2025-11-01",
    shippingDeadline: "2025-11-06T12:00:00Z", // 期限設定
    items: [
      {
        sku: "SKU-A101",
        name: "ヴィンテージカメラ",
        quantity: 1,
        salePrice: 45000,
      },
    ],
    inquiryHistoryCount: 2,
    estimatedProfit: 12500,
    purchaseStatus: "未仕入れ",
    estimatedPurchaseUrl: "https://example.com/vintage/A101",
    actualPurchaseUrl: null,
    actualPurchaseCostJPY: null,
    estimatedShippingCostJPY: 1500,
    finalShippingCostJPY: null,
    finalProfit: null,
    isProfitConfirmed: false,
  },
  {
    id: "ORD-20251102-002",
    customerID: "CUST-005",
    marketplace: "Amazon",
    orderDate: "2025-11-02",
    shippingDeadline: "2025-11-07T18:00:00Z",
    items: [
      {
        sku: "SKU-B202",
        name: "限定スニーカー",
        quantity: 1,
        salePrice: 30000,
      },
    ],
    inquiryHistoryCount: 0,
    estimatedProfit: 8000,
    purchaseStatus: "仕入れ済み",
    estimatedPurchaseUrl: "https://rakuten.co.jp/limited/B202",
    actualPurchaseUrl: "https://rakuten.co.jp/limited/B202",
    actualPurchaseCostJPY: 20000,
    estimatedShippingCostJPY: 1200,
    finalShippingCostJPY: 1250,
    finalProfit: 8750,
    isProfitConfirmed: true,
  },
  {
    id: "ORD-20251103-003",
    customerID: "CUST-003",
    marketplace: "Shopee",
    orderDate: "2025-11-03",
    shippingDeadline: "2025-11-08T09:30:00Z",
    items: [
      { sku: "SKU-C303", name: "アートポスター", quantity: 2, salePrice: 8000 },
    ],
    inquiryHistoryCount: 1,
    estimatedProfit: 1800,
    purchaseStatus: "未仕入れ",
    estimatedPurchaseUrl: "https://aliexpress.com/poster/C303",
    actualPurchaseUrl: null,
    actualPurchaseCostJPY: null,
    estimatedShippingCostJPY: 800,
    finalShippingCostJPY: null,
    finalProfit: null,
    isProfitConfirmed: false,
  },
];

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: MOCK_ORDERS,
  selectedOrderId: null,
  selectedOrder: null,
  loading: false,
  error: null,

  // III-1. 利益計算ロジック
  calculateProfit: (order: Order) => {
    // 実際には為替レートやモール手数料の計算も入りますが、ここでは簡略化
    // 粗利益 = (販売価格 * 数量) - (実際の仕入れ値) - (確定送料)
    const saleTotal = order.items.reduce(
      (sum, item) => sum + item.salePrice * item.quantity,
      0
    );
    const purchaseCost = order.actualPurchaseCostJPY ?? 0;
    const shippingCost =
      order.finalShippingCostJPY ?? order.estimatedShippingCostJPY;

    // 仮のモール手数料を20%として概算
    const commission = saleTotal * 0.2;

    return Math.round(saleTotal - purchaseCost - shippingCost - commission);
  },

  // 受注データ取得 (モック)
  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      // 実際には /api/order-management から Supabase データをフェッチ
      await new Promise((resolve) => setTimeout(resolve, 500));

      const ordersWithCalculatedProfit = MOCK_ORDERS.map((order) => ({
        ...order,
        // 初期ロード時に見込み利益を計算
        estimatedProfit: get().calculateProfit({
          ...order,
          actualPurchaseCostJPY: 0,
          finalShippingCostJPY: 0,
        }), // 簡略化のため0
      }));

      set({ orders: ordersWithCalculatedProfit, loading: false });
    } catch (e) {
      set({ error: "受注データの取得に失敗しました。", loading: false });
    }
  },

  // 受注を選択
  selectOrder: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId) || null;
    set({ selectedOrderId: orderId, selectedOrder: order });
  },

  // 詳細情報の更新と利益再計算
  updateOrderDetails: (orderId, updates) => {
    set((state) => {
      const updatedOrders = state.orders.map((order) => {
        if (order.id === orderId) {
          const newOrder = { ...order, ...updates };

          // 利益計算ロジックを再実行 (III-2)
          let finalProfit = null;
          let isProfitConfirmed = newOrder.isProfitConfirmed;

          if (
            newOrder.actualPurchaseCostJPY !== null &&
            newOrder.finalShippingCostJPY !== null
          ) {
            finalProfit = get().calculateProfit(newOrder);
            isProfitConfirmed = true;
          }

          return { ...newOrder, finalProfit, isProfitConfirmed };
        }
        return order;
      });

      return {
        orders: updatedOrders,
        selectedOrder:
          updatedOrders.find((o) => o.id === state.selectedOrderId) || null,
      };
    });
  },

  // III-1. [仕入れ済み] ボタンのロジック
  markAsPurchased: (orderId, actualPurchaseUrl, actualPurchaseCostJPY) => {
    get().updateOrderDetails(orderId, {
      purchaseStatus: "仕入れ済み",
      actualPurchaseUrl,
      actualPurchaseCostJPY,
      // ログ記録のロジック（担当者、日時）は省略
    });
  },
}));
