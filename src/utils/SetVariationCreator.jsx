import React, { useState, useEffect, useCallback, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  writeBatch,
  runTransaction,
  arrayRemove,
  arrayUnion,
} from "firebase/firestore";
import {
  Package,
  X,
  CheckCircle,
  Component,
  Zap,
  Settings,
  Truck,
  TrendingUp,
  DollarSign,
} from "lucide-react";

// Firestoreのグローバル変数セットアップ
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// Firebase初期化 (コンポーネント外で一度だけ実行)
let app, db, auth;
if (Object.keys(firebaseConfig).length) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  console.error("Firebase config is missing. Data persistence will not work.");
}

// データパス定義
const SKU_MASTER_COLLECTION = `artifacts/${appId}/users/`;
const INVENTORY_STAGING_COLLECTION = `artifacts/${appId}/users/`;

const initialInventory = [
  {
    id: "I001",
    sku: "ITEM-A-RED",
    name: "Tシャツ 赤 S",
    cost: 1000,
    stock: 50,
    status: "棚卸し中",
    image: "https://placehold.co/50x50/fca5a5/ffffff?text=A",
  },
  {
    id: "I002",
    sku: "ITEM-B-BLUE",
    name: "キャップ 青",
    cost: 800,
    stock: 30,
    status: "棚卸し中",
    image: "https://placehold.co/50x50/93c5fd/ffffff?text=B",
  },
  {
    id: "I003",
    sku: "ITEM-C-BLK",
    name: "ソックス 黒 L",
    cost: 300,
    stock: 100,
    status: "棚卸し中",
    image: "https://placehold.co/50x50/374151/ffffff?text=C",
  },
];

const initialSKUs = [
  {
    id: "S004",
    sku: "ITEM-D-GRN",
    name: "マグカップ 緑",
    cost: 1500,
    stock: 20,
    status: "未出品",
    type: "Single",
    image: "https://placehold.co/50x50/a7f3d0/065f46?text=D",
  },
  {
    id: "S005",
    sku: "ITEM-E-YEL",
    name: "タオル 黄色",
    cost: 700,
    stock: 40,
    status: "出品中",
    type: "Single",
    image: "https://placehold.co/50x50/fde047/854d0e?text=E",
  },
  {
    id: "S006",
    sku: "SET-OLD-01",
    name: "旧トラベルセット",
    cost: 2500,
    stock: 5,
    status: "出品中",
    type: "Set",
    image: "https://placehold.co/50x50/4ade80/065f46?text=Old",
    components: [
      { sku: "ITEM-A-RED", qty: 1 },
      { sku: "ITEM-B-BLUE", qty: 1 },
    ],
  },
];

const ITEM_TYPES = {
  Single: "単体品",
  Set: "セット品",
  VariationParent: "バリエーション親",
  VariationChild: "バリエーション子",
};

// ヘルパー関数
const formatCurrency = (amount) => `¥${amount.toLocaleString()}`;

const SetVariationCreator = () => {
  const [userId, setUserId] = useState(null);
  const [inventoryStaging, setInventoryStaging] = useState([]); // 棚卸し中
  const [skuMaster, setSkuMaster] = useState([]); // SKUマスター
  const [groupingBox, setGroupingBox] = useState([]); // Grouping Boxの内容 (選択されたアイテム + 数量)
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // --- Firebase 初期化と認証 ---
  useEffect(() => {
    if (!auth || !db) return;

    const setupAuth = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        console.log("Authenticated with UID:", user.uid);
      } else {
        setUserId(null);
        setLoading(false);
      }
    });

    if (!userId) {
      setupAuth();
    }

    return () => unsubscribe();
  }, []);

  // --- データ取得ロジック（onSnapshot） ---
  useEffect(() => {
    if (!db || !userId) return;

    // ダミーデータ投入（初回起動時のみ）
    const initializeData = async () => {
      const masterRef = collection(
        db,
        `${SKU_MASTER_COLLECTION}${userId}/sku_master`
      );
      const stagingRef = collection(
        db,
        `${INVENTORY_STAGING_COLLECTION}${userId}/inventory_staging`
      );

      const masterDocs = await getDoc(doc(masterRef, "init_check"));
      if (!masterDocs.exists()) {
        const batch = writeBatch(db);

        initialInventory.forEach((item) => {
          batch.set(doc(stagingRef, item.id), item);
        });

        initialSKUs.forEach((item) => {
          batch.set(doc(masterRef, item.id), item);
        });

        batch.set(doc(masterRef, "init_check"), { initialized: true });
        await batch.commit();
        console.log("Initial data loaded into Firestore.");
      }
    };

    // SKUマスターのリアルタイムリスナー
    const masterRef = collection(
      db,
      `${SKU_MASTER_COLLECTION}${userId}/sku_master`
    );
    const unsubscribeMaster = onSnapshot(
      masterRef,
      (snapshot) => {
        const items = snapshot.docs
          .filter((doc) => doc.id !== "init_check") // 初期化フラグを除外
          .map((doc) => ({ id: doc.id, ...doc.data(), source: "master" }));
        setSkuMaster(items);
        setLoading(false);
      },
      (error) => console.error("SKU Master Snapshot Error:", error)
    );

    // 在庫ステージングのリアルタイムリスナー
    const stagingRef = collection(
      db,
      `${INVENTORY_STAGING_COLLECTION}${userId}/inventory_staging`
    );
    const unsubscribeStaging = onSnapshot(
      stagingRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          source: "staging",
        }));
        setInventoryStaging(items);
      },
      (error) => console.error("Inventory Staging Snapshot Error:", error)
    );

    initializeData();

    return () => {
      unsubscribeMaster();
      unsubscribeStaging();
    };
  }, [userId]);

  // 全てのアイテムを統合して表示 (II-1: データ選択元の統合)
  const integratedItems = useMemo(() => {
    // SKUマスター（単体品と子SKU以外）と在庫ステージングを統合
    const masterSingles = skuMaster.filter(
      (item) =>
        item.type === ITEM_TYPES.Single ||
        item.type === ITEM_TYPES.Set ||
        item.type === ITEM_TYPES.VariationParent
    );
    return [...inventoryStaging, ...masterSingles];
  }, [inventoryStaging, skuMaster]);

  // --- Grouping Box ロジック (II-2) ---

  const handleToggleGrouping = useCallback((item) => {
    setGroupingBox((prev) => {
      const exists = prev.some((boxItem) => boxItem.sku === item.sku);
      if (exists) {
        // 既にBOXにある場合は削除
        return prev.filter((boxItem) => boxItem.sku !== item.sku);
      } else {
        // BOXに追加 (初期数量は1)
        return [
          ...prev,
          {
            ...item,
            qty: 1,
            maxStock: item.stock, // 個別アイテムの現在在庫
            sourceId: item.id,
            isStaging: item.source === "staging",
          },
        ];
      }
    });
  }, []);

  const handleQuantityChange = useCallback((sku, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty < 1) return;

    setGroupingBox((prev) =>
      prev.map((item) => (item.sku === sku ? { ...item, qty: qty } : item))
    );
  }, []);

  const isItemSelected = (sku) => groupingBox.some((item) => item.sku === sku);

  // Grouping Boxの主要計算値
  const groupingCalculations = useMemo(() => {
    if (groupingBox.length === 0) {
      return { totalCost: 0, maxSetStock: 0, primaryItem: null };
    }

    let totalCost = 0;
    let maxSetStock = Infinity;
    let primaryItem = groupingBox[0];

    groupingBox.forEach((item) => {
      // 原価の自動計算 (III-1)
      totalCost += item.cost * item.qty;

      // 最大在庫数の決定 (III-1)
      // セット品として構成可能な在庫数を計算し、最小値がセット品の最大在庫数となる
      const possibleSets = Math.floor(item.maxStock / item.qty);
      if (possibleSets < maxSetStock) {
        maxSetStock = possibleSets;
      }

      // データ継承のための優先アイテム決定（ここでは最も高価なアイテムとする）
      if (item.cost * item.qty > primaryItem.cost * primaryItem.qty) {
        primaryItem = item;
      }
    });

    return {
      totalCost,
      maxSetStock: maxSetStock === Infinity ? 0 : maxSetStock,
      primaryItem,
    };
  }, [groupingBox]);

  // --- モーダル起動とロジック実行 ---

  const handleSetCreation = () => {
    if (groupingBox.length < 2) {
      setMessage("セット品を作成するには2つ以上のアイテムを選択してください。");
      return;
    }
    setIsSetModalOpen(true);
  };

  const handleVariationCreation = () => {
    if (groupingBox.length < 2) {
      setMessage(
        "バリエーションを作成するには2つ以上のアイテムを選択してください。"
      );
      return;
    }
    setIsVariationModalOpen(true);
  };

  const displayMessage = (msg, isError = false) => {
    setMessage(msg);
    // 5秒後にメッセージをクリア
    setTimeout(() => setMessage(""), 5000);
  };

  // --- III-1: セット品作成ロジック（トランザクション処理） ---
  const createSetSku = async (newSkuName, isSet = true) => {
    if (!db || !userId || groupingBox.length === 0) return;

    setLoading(true);
    const { totalCost, maxSetStock, primaryItem } = groupingCalculations;
    const newSku = `SET-${Date.now()}`;

    try {
      await runTransaction(db, async (transaction) => {
        const masterRef = collection(
          db,
          `${SKU_MASTER_COLLECTION}${userId}/sku_master`
        );
        const stagingRef = collection(
          db,
          `${INVENTORY_STAGING_COLLECTION}${userId}/inventory_staging`
        );

        // 1. 新規セットSKUの生成
        const newSetDocRef = doc(masterRef, newSku);
        const componentList = groupingBox.map((item) => ({
          sku: item.sku,
          qty: item.qty,
          sourceId: item.sourceId,
          isStaging: item.isStaging,
        }));

        const setItem = {
          id: newSku,
          sku: newSku,
          name: newSkuName || `仮想セット品 (${newSku})`,
          cost: totalCost, // 原価の自動計算
          stock: maxSetStock, // 最大在庫数の決定
          status: "未出品",
          type: isSet ? ITEM_TYPES.Set : ITEM_TYPES.VariationParent,
          image: primaryItem.image, // データ継承
          category: primaryItem.category || "未設定", // データ継承
          components: componentList, // 構成品リスト
          createdAt: new Date().toISOString(),
        };

        transaction.set(newSetDocRef, setItem);

        // 2. 構成品の在庫引き落とし (IV: 在庫連携ロジック - 予約フラグ)
        // 構成品から「セット品として予約済み」の在庫を引き落とす
        componentList.forEach((component) => {
          const itemRef = component.isStaging
            ? doc(stagingRef, component.sourceId)
            : doc(masterRef, component.sourceId);

          // 構成品側の在庫を '予約済み' の分だけ減算する
          const reservationQty = component.qty * maxSetStock;

          // 複雑な配列操作を避けるため、在庫数自体を減らすロジックをシミュレート
          // 実際には、在庫フィールドを更新する
          transaction.update(itemRef, {
            stock: component.maxStock - reservationQty,
            reservedBySet: arrayUnion({ setSku: newSku, qty: reservationQty }), // 予約フラグ（シミュレーション）
          });
        });
      });

      displayMessage(
        `${
          isSet ? "セット品" : "バリエーション親"
        } SKU "${newSku}" が正常に作成されました。`
      );
      setGroupingBox([]); // 成功したらBOXをクリア
    } catch (error) {
      console.error("Set/Variation Creation Transaction Failed:", error);
      displayMessage(`作成に失敗しました: ${error.message}`, true);
    } finally {
      setLoading(false);
      setIsSetModalOpen(false);
      setIsVariationModalOpen(false);
    }
  };

  // --- モーダルコンポーネント ---

  const SetCreationModal = ({ isOpen, onClose }) => {
    const [newSkuName, setNewSkuName] = useState(
      groupingCalculations.primaryItem?.name + " セット"
    );
    const { totalCost, maxSetStock, primaryItem } = groupingCalculations;

    if (!isOpen) return null;

    return (
      <Modal
        title="セット品作成（全モール共通）"
        onClose={onClose}
        actions={
          <button
            className="btn-primary"
            onClick={() => createSetSku(newSkuName, true)}
          >
            <CheckCircle size={18} className="mr-2" />
            セットSKUを生成
          </button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 border-b pb-2">
            以下の構成に基づき、新しい親SKUがSKUマスターに追加されます。
          </p>

          {/* ロジック結果表示 */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50 rounded-lg">
            <InfoCard
              icon={DollarSign}
              title="自動計算された原価"
              value={formatCurrency(totalCost)}
            />
            <InfoCard
              icon={Package}
              title="構成可能な最大在庫数"
              value={`${maxSetStock} セット`}
            />
          </div>

          {/* 新規SKU名入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              新規セットSKU名
            </label>
            <input
              type="text"
              value={newSkuName}
              onChange={(e) => setNewSkuName(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* データ継承の確認 */}
          <div className="p-3 border rounded-md">
            <h4 className="font-semibold text-sm mb-2">
              データ継承（新規SKUへ自動適用）
            </h4>
            <div className="text-xs space-y-1">
              <p>商品名（ベース）: {primaryItem?.name}</p>
              <p>画像: {primaryItem?.image ? "継承されます" : "なし"}</p>
              <p>原価: {formatCurrency(totalCost)}</p>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  const VariationCreationModal = ({ isOpen, onClose }) => {
    const [variationName, setVariationName] = useState(
      groupingCalculations.primaryItem?.name + " バリエーション親"
    );
    const [attributeName, setAttributeName] = useState("Color"); // III-2: 属性設定

    if (!isOpen) return null;

    return (
      <Modal
        title="バリエーション作成（eBay特化）"
        onClose={onClose}
        actions={
          <button
            className="btn-primary"
            onClick={() => createSetSku(variationName, false)}
          >
            <CheckCircle size={18} className="mr-2" />
            親SKUを生成 & 子SKU紐付け
          </button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 border-b pb-2">
            Grouping
            Box内の各アイテムは、新規作成される親SKUの子SKUとして紐付けられます。
          </p>

          {/* 新規 親SKU名入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              新規 親SKU名
            </label>
            <input
              type="text"
              value={variationName}
              onChange={(e) => setVariationName(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* 属性設定 (III-2: eBay属性設定のシミュレーション) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              バリエーション属性名 (例: Color, Size)
            </label>
            <input
              type="text"
              value={attributeName}
              onChange={(e) => setAttributeName(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-md"
            />
          </div>

          <h4 className="font-semibold text-sm mt-4">
            子SKU属性値設定 (シミュレーション)
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50">
            {groupingBox.map((item, index) => (
              <div
                key={item.sku}
                className="flex items-center space-x-2 text-sm"
              >
                <span className="font-medium w-1/4 truncate">{item.sku}</span>
                <span className="text-gray-500">→ 属性値:</span>
                <input
                  type="text"
                  defaultValue={item.name.split(" ").pop()}
                  className="flex-grow p-1 border rounded-md text-xs"
                  placeholder={`${attributeName} の値`}
                />
              </div>
            ))}
            <p className="text-xs text-indigo-600 mt-2">
              ※ {ITEM_TYPES.VariationParent}{" "}
              SKUは、子SKUのデータ（タイトル、画像など）を継承して出品されます。
            </p>
          </div>
        </div>
      </Modal>
    );
  };

  // --- メインレンダリング ---

  if (loading)
    return (
      <div className="p-8 text-center text-gray-600">データをロード中...</div>
    );

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-indigo-800 mb-6 flex items-center">
        <Component className="mr-3" />{" "}
        セット品・バリエーション作成ダッシュボード
      </h1>
      {message && (
        <div
          className={`p-3 mb-4 rounded-lg text-sm font-medium ${
            message.includes("失敗")
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側: データ選択元の統合テーブル */}
        <div className="lg:col-span-2 bg-white shadow-xl rounded-xl p-4 overflow-x-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            統合アイテムリスト（SKUマスター/棚卸しステージング）
          </h2>
          <IntegratedItemsTable
            items={integratedItems}
            onToggleGrouping={handleToggleGrouping}
            isSelected={isItemSelected}
          />
        </div>

        {/* 右側: Grouping Box（グルーピング・ボックス） */}
        <div className="lg:col-span-1 bg-indigo-50 shadow-xl rounded-xl p-4 sticky top-4 h-fit">
          <h2 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center">
            <Package className="mr-2" size={20} /> セット/バリエーション作成BOX
          </h2>

          <GroupingBox
            groupingBox={groupingBox}
            onRemove={handleToggleGrouping}
            onQuantityChange={handleQuantityChange}
            calculations={groupingCalculations}
          />

          <div className="mt-6 space-y-3">
            <button
              className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition duration-150 disabled:bg-indigo-300"
              onClick={handleSetCreation}
              disabled={groupingBox.length < 2}
            >
              <Settings size={18} className="mr-2" />{" "}
              セット品作成（全モール共通）
            </button>
            <button
              className="w-full btn-secondary bg-blue-500 hover:bg-blue-600 text-white transition duration-150 disabled:bg-blue-300"
              onClick={handleVariationCreation}
              disabled={groupingBox.length < 2}
            >
              <TrendingUp size={18} className="mr-2" />{" "}
              バリエーション作成（eBay特化）
            </button>
          </div>
        </div>
      </div>

      <SetCreationModal
        isOpen={isSetModalOpen}
        onClose={() => setIsSetModalOpen(false)}
      />
      <VariationCreationModal
        isOpen={isVariationModalOpen}
        onClose={() => setIsVariationModalOpen(false)}
      />
    </div>
  );
};

// --- サブコンポーネント ---

const Modal = ({ title, children, onClose, actions }) => (
  <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>
      <div className="p-6">{children}</div>
      <div className="p-4 border-t flex justify-end">{actions}</div>
    </div>
  </div>
);

const InfoCard = ({ icon: Icon, title, value }) => (
  <div className="flex flex-col p-2 bg-white rounded-lg shadow-sm">
    <div className="flex items-center text-sm font-medium text-gray-500 mb-1">
      <Icon size={16} className="mr-1 text-indigo-500" /> {title}
    </div>
    <p className="text-lg font-bold text-gray-800">{value}</p>
  </div>
);

const GroupingBox = ({
  groupingBox,
  onRemove,
  onQuantityChange,
  calculations,
}) => {
  const { maxSetStock, totalCost } = calculations;

  if (groupingBox.length === 0) {
    return (
      <div className="p-6 text-center bg-indigo-100 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600">
        <Package size={24} className="mx-auto mb-2" />
        <p className="text-sm font-medium">
          リストからアイテムを選択してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 計算結果サマリー */}
      <div className="p-3 bg-indigo-100 rounded-lg shadow-inner space-y-2">
        <div className="flex justify-between items-center text-sm font-semibold text-indigo-800">
          <span>構成アイテム数:</span>
          <span>{groupingBox.length} 種類</span>
        </div>
        <div className="flex justify-between items-center text-sm font-semibold text-indigo-800 border-t pt-2">
          <span>予測最大在庫:</span>
          <span className="text-lg font-bold">{maxSetStock} セット</span>
        </div>
        <div className="flex justify-between items-center text-sm font-semibold text-indigo-800">
          <span>予測原価合計:</span>
          <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* アイテムリスト */}
      <div className="max-h-64 overflow-y-auto border border-indigo-200 rounded-lg bg-white p-2 space-y-2">
        {groupingBox.map((item) => (
          <div
            key={item.sku}
            className="flex items-center space-x-3 p-2 border rounded-md shadow-sm"
          >
            <img
              src={item.image}
              alt={item.sku}
              className="w-10 h-10 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-grow min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{item.sku}</p>
              <p className="text-xs text-indigo-500">
                在庫: {item.maxStock} (
                {item.source === "staging" ? "棚卸し中" : "SKU"})
              </p>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* 数量設定 (II-2) */}
              <input
                type="number"
                min="1"
                max={item.maxStock} // 在庫連携: 構成品の最大在庫数を超えないよう制限
                value={item.qty}
                onChange={(e) => onQuantityChange(item.sku, e.target.value)}
                className="w-16 p-1 text-center border rounded-md text-sm"
              />
              <span className="text-sm font-bold">個</span>

              <button
                onClick={() => onRemove(item)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full bg-red-100 transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const IntegratedItemsTable = ({ items, onToggleGrouping, isSelected }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
              選択
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
              画像
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SKU / 商品名
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              在庫数
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              原価
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ソース
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr
              key={item.sku}
              className={`hover:bg-indigo-50 cursor-pointer transition duration-150 ${
                isSelected(item.sku) ? "bg-indigo-100" : ""
              }`}
              onClick={() => onToggleGrouping(item)}
            >
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={isSelected(item.sku)}
                  onChange={() => onToggleGrouping(item)}
                  className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <img
                  src={item.image}
                  alt={item.sku}
                  className="w-10 h-10 object-cover rounded-md"
                />
              </td>
              <td className="px-3 py-2">
                <div className="text-sm font-medium text-gray-900">
                  {item.sku}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-xs">
                  {item.name}
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 font-semibold">
                {item.stock}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                {formatCurrency(item.cost)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-xs">
                <span
                  className={`p-1 rounded-full text-white ${
                    item.source === "staging" ? "bg-red-500" : "bg-green-600"
                  }`}
                >
                  {item.source === "staging" ? "棚卸し中" : "SKUマスター"}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {item.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SetVariationCreator;
