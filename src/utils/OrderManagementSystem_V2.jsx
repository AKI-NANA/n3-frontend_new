import { useState, useEffect, useMemo, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// アイコン (Font Awesomeの代わりにLucide Reactを使用)
import {
  RefreshCw,
  Search,
  Package,
  CheckCircle,
  Truck,
  Printer,
  HelpCircle,
  Download,
  AlertTriangle,
  CreditCard,
  Calendar,
  List,
  X,
  User,
} from "lucide-react";

// モックデータ (元のHTMLにはデータがなかったため、前回と同じモックを使用)
const mockOrders = [
  {
    id: "R0001",
    orderDate: "2025-11-05",
    customer: "佐藤 太郎",
    total: 15800,
    status: "未処理",
    items: [{ name: "商品A", quantity: 1, price: 9800, itemCode: "A001" }],
    shippingDate: "2025-11-07",
    paymentStatus: "入金済",
    channel: "楽天市場",
  },
  {
    id: "R0002",
    orderDate: "2025-11-05",
    customer: "山田 花子",
    total: 4500,
    status: "処理中",
    items: [{ name: "商品B", quantity: 3, price: 1500, itemCode: "B002" }],
    shippingDate: "2025-11-06",
    paymentStatus: "未入金",
    channel: "自社サイト",
  },
  {
    id: "R0003",
    orderDate: "2025-11-04",
    customer: "田中 次郎",
    total: 28000,
    status: "出荷済",
    items: [{ name: "商品C", quantity: 1, price: 28000, itemCode: "C003" }],
    shippingDate: "2025-11-04",
    paymentStatus: "入金済",
    channel: "Yahoo!ショッピング",
  },
  {
    id: "R0004",
    orderDate: "2025-11-03",
    customer: "鈴木 美咲",
    total: 9999,
    status: "未処理",
    items: [{ name: "商品D", quantity: 2, price: 4999.5, itemCode: "D004" }],
    shippingDate: "2025-11-08",
    paymentStatus: "入金済",
    channel: "Amazon",
  },
  {
    id: "R0005",
    orderDate: "2025-10-31",
    customer: "高橋 健太",
    total: 500,
    status: "キャンセル",
    items: [{ name: "商品E", quantity: 1, price: 500, itemCode: "E005" }],
    shippingDate: "",
    paymentStatus: "入金済",
    channel: "楽天市場",
  },
];

// ステータスと色を定義 (Tailwindクラスを元のCSS変数に近づける)
const statusMap = {
  // 未処理 -> Danger
  未処理: "bg-red-100 text-red-700 border border-red-500 hover:bg-red-200",
  // 処理中 -> Warning
  処理中:
    "bg-yellow-100 text-yellow-700 border border-yellow-500 hover:bg-yellow-200",
  // 出荷済 -> Success
  出荷済:
    "bg-green-100 text-green-700 border border-green-500 hover:bg-green-200",
  // キャンセル -> Gray
  キャンセル:
    "bg-gray-200 text-gray-600 border border-gray-400 hover:bg-gray-300",
};
const primaryColor = "indigo"; // 元のCSSのjuchu-primaryに最も近いindigoを使用

// ユーティリティ関数
const formatCurrency = (amount) => amount.toLocaleString("ja-JP");

// メインコンポーネント
const App = () => {
  // --- Firebase/Auth State (ボイラープレート) ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

  // Firebase初期化と認証
  useEffect(() => {
    if (typeof __firebase_config === "undefined") {
      setIsAuthReady(true);
      return;
    }

    try {
      const firebaseConfig = JSON.parse(__firebase_config);
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      const authenticate = async () => {
        try {
          if (
            typeof __initial_auth_token !== "undefined" &&
            __initial_auth_token
          ) {
            await signInWithCustomToken(authInstance, __initial_auth_token);
          } else {
            await signInAnonymously(authInstance);
          }
        } catch (e) {
          console.error("Firebase Auth failed:", e);
          await signInAnonymously(authInstance); // フォールバック
        }
        setIsAuthReady(true);
      };

      onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          authenticate();
        }
      });
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      setIsAuthReady(true);
    }
  }, []);
  // ---------------------------------------------

  // --- アプリケーション状態 ---
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [orders, setOrders] = useState(mockOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedStatus, setSelectedStatus] = useState("すべて");
  const [selectedOrder, setSelectedOrder] = useState(mockOrders[0]); // 初期表示のために一つ選択
  const [isLoading, setIsLoading] = useState(false);
  const [showMessageBox, setShowMessageBox] = useState({
    visible: false,
    message: "",
  });

  // フィルターされた注文リスト
  const filteredOrders = useMemo(() => {
    let list = orders.filter((order) => {
      // ステータスフィルター
      if (selectedStatus === "未処理" && order.status !== "未処理")
        return false;
      if (selectedStatus === "処理中" && order.status !== "処理中")
        return false;
      if (selectedStatus === "出荷済" && order.status !== "出荷済")
        return false;
      if (selectedStatus === "キャンセル" && order.status !== "キャンセル")
        return false;

      // 特殊フィルター
      if (selectedStatus === "緊急対応" && order.status !== "未処理")
        return false; // 未処理を緊急対応と見なす
      if (selectedStatus === "未入金" && order.paymentStatus !== "未入金")
        return false;
      if (selectedStatus === "本日出荷" && order.shippingDate !== dateTo)
        return false;

      // 日付フィルター (orderDate)
      if (dateFrom && order.orderDate < dateFrom) return false;
      if (dateTo && order.orderDate > dateTo) return false;

      // 検索タームフィルター
      if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return (
          order.id.toLowerCase().includes(lowerCaseSearch) ||
          order.customer.toLowerCase().includes(lowerCaseSearch) ||
          order.channel.toLowerCase().includes(lowerCaseSearch)
        );
      }

      return true;
    });

    // 検索結果のソート (注文日で降順にソート)
    return list.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  }, [orders, searchTerm, dateFrom, dateTo, selectedStatus]);

  // UI操作関数
  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    setSelectedOrder(null);
  };

  // アクション処理（元のHTMLのJavaScript関数に対応）
  const handleAction = (actionName, orderId = null) => {
    const targetOrder = orderId
      ? orders.find((o) => o.id === orderId)
      : selectedOrder;

    if (!targetOrder && actionName !== "refresh" && actionName !== "export") {
      setShowMessageBox({
        visible: true,
        message: "注文を選択してください。",
        isError: true,
      });
      return;
    }

    let message = "";
    let newOrders = [...orders];

    switch (actionName) {
      case "refresh": // refreshOrders()
        setIsLoading(true);
        setTimeout(() => {
          setOrders(mockOrders.map((o) => ({ ...o }))); // データのリフレッシュ
          setSelectedOrder(null);
          setIsLoading(false);
          setShowMessageBox({
            visible: true,
            message: "受注データを更新しました。",
            isError: false,
          });
        }, 500);
        return;
      case "process": // processOrder()
        newOrders = newOrders.map((o) =>
          o.id === targetOrder.id ? { ...o, status: "処理中" } : o
        );
        setOrders(newOrders);
        setSelectedOrder(newOrders.find((o) => o.id === targetOrder.id));
        message = `注文 ${targetOrder.id} の処理を開始しました。ステータスを「処理中」に更新しました。`;
        break;
      case "shipped": // markAsShipped()
        newOrders = newOrders.map((o) =>
          o.id === targetOrder.id
            ? { ...o, status: "出荷済", shippingDate: today }
            : o
        );
        setOrders(newOrders);
        setSelectedOrder(newOrders.find((o) => o.id === targetOrder.id));
        message = `注文 ${targetOrder.id} を出荷済みにマークしました。`;
        break;
      case "print": // printShippingLabel()
        message = `注文 ${targetOrder.id} の配送ラベルを印刷しました。 (PDF生成のモック)`;
        break;
      case "inquiry": // openInquiry()
        message = `注文 ${targetOrder.id} の問合せ管理画面を開くアクションをシミュレートします。`;
        break;
      case "export": // exportOrders()
        message = "現在のフィルター条件でデータをエクスポートしました。";
        break;
      default:
        message = "不明なアクションです。";
    }
    setShowMessageBox({ visible: true, message, isError: false });
  };

  // メッセージボックスコンポーネント (元のHTMLのalertの代替)
  const MessageBox = ({ message, isError }) => {
    if (!showMessageBox.visible) return null;

    const bgColor = isError ? "bg-red-600" : `bg-${primaryColor}-600`;
    const Icon = isError ? AlertTriangle : CheckCircle;

    return (
      <div
        className={`fixed top-4 right-4 z-50 p-4 ${bgColor} text-white rounded-lg shadow-xl flex items-center space-x-3 transition-opacity duration-300`}
      >
        <Icon className="w-6 h-6" />
        <span>{message}</span>
        <button
          onClick={() =>
            setShowMessageBox({ visible: false, message: "", isError: false })
          }
          className={`ml-4 text-white hover:text-${primaryColor}-200`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  };

  // 注文リストアイテムコンポーネント
  const OrderListItem = ({ order }) => {
    const isSelected = selectedOrder?.id === order.id;
    const statusText = order.status;
    const statusClass = statusMap[statusText] || "bg-gray-100 text-gray-800";

    return (
      <li
        className={`order-list-item flex justify-between items-center px-4 py-2 border-b cursor-pointer transition-all duration-150 ${
          isSelected
            ? `bg-${primaryColor}-100 border-l-4 border-${primaryColor}-600`
            : "hover:bg-gray-50"
        }`}
        onClick={() => setSelectedOrder(order)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-gray-800">
            {order.id} / {order.customer}
          </div>
          <div className="text-xs text-gray-500">
            注文日: {order.orderDate} | {order.channel}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}
          >
            {statusText}
          </span>
          <div className="font-bold text-gray-800 mt-1">
            ¥{formatCurrency(order.total)}
          </div>
        </div>
      </li>
    );
  };

  // 詳細パネルコンポーネント
  const DetailsPanel = () => {
    if (!selectedOrder) {
      return (
        <div className="detail-panel bg-white p-8 h-full flex items-center justify-center rounded-lg shadow-md border">
          <p className="text-gray-500 text-lg">
            左のリストから注文を選択してください
          </p>
        </div>
      );
    }

    const order = selectedOrder;
    const statusText = order.status;
    const statusClass = statusMap[statusText] || "bg-gray-100 text-gray-800";

    return (
      <div className="detail-panel bg-white p-6 rounded-lg shadow-md h-full overflow-y-auto border border-gray-200">
        {/* ヘッダー: 注文IDとステータス */}
        <div className="border-b pb-4 mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <List className={`w-6 h-6 mr-2 text-${primaryColor}-600`} />
              注文詳細: {order.id}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              受注日: {order.orderDate} / チャンネル: {order.channel}
            </p>
          </div>
          <span
            className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${statusClass}`}
          >
            {statusText}
          </span>
        </div>

        {/* 詳細情報セクション */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 顧客情報 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 mb-2 pb-1">
              顧客情報
            </h3>
            <p className="text-gray-900 mb-1">
              <User className="w-4 h-4 inline mr-2 text-gray-500" />
              氏名: {order.customer}
            </p>
            <p className="text-gray-900 mb-1">住所: 東京都...</p>
            <p className="text-gray-900 mb-1">電話: 090-XXXX-XXXX</p>
          </div>

          {/* 決済・配送情報 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 mb-2 pb-1">
              決済・配送情報
            </h3>
            <p className="mb-1">
              <CreditCard className="w-4 h-4 inline mr-2 text-gray-500" />
              決済:{" "}
              <span
                className={`font-bold ${
                  order.paymentStatus === "未入金"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {order.paymentStatus}
              </span>
            </p>
            <p className="mb-1">
              <Truck className="w-4 h-4 inline mr-2 text-gray-500" />
              出荷予定日:{" "}
              <span className="font-semibold">
                {order.shippingDate || "未定"}
              </span>
            </p>
            <p className="mb-1">配送方法: 宅急便</p>
          </div>
        </div>

        {/* 商品リストテーブル */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 mb-2 pb-1">
            注文商品
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={`bg-${primaryColor}-50`}>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                    商品コード
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                    商品名
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase w-20">
                    数量
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase w-32">
                    単価
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-gray-700">
                      {item.itemCode || "N/A"}
                    </td>
                    <td className="px-4 py-2 text-gray-900">{item.name}</td>
                    <td className="px-4 py-2 text-center text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      ¥{formatCurrency(item.price)}
                    </td>
                  </tr>
                ))}
                {/* 合計行 */}
                <tr className="bg-gray-50 font-bold border-t border-gray-300">
                  <td
                    colSpan="3"
                    className="px-4 py-2 text-right text-gray-800"
                  >
                    合計金額 (税込)
                  </td>
                  <td className="px-4 py-2 text-right text-xl text-red-600">
                    ¥{formatCurrency(order.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* アクションボタン（元のHTMLのスタイルに合わせたボタン） */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={() => handleAction("process")}
            disabled={order.status !== "未処理"}
            className={`flex items-center px-4 py-2 bg-${primaryColor}-600 text-white font-medium text-sm rounded-lg hover:bg-${primaryColor}-700 transition duration-150 disabled:bg-${primaryColor}-300 shadow-md`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            注文処理開始
          </button>
          <button
            onClick={() => handleAction("shipped")}
            disabled={
              order.status === "出荷済" || order.status === "キャンセル"
            }
            className="flex items-center px-4 py-2 bg-green-600 text-white font-medium text-sm rounded-lg hover:bg-green-700 transition duration-150 disabled:bg-green-300 shadow-md"
          >
            <Truck className="w-4 h-4 mr-2" />
            出荷完了マーク
          </button>
        </div>
      </div>
    );
  };

  // メインUIレンダリング
  return (
    <div className="min-h-screen bg-gray-100 font-sans p-2 sm:p-4">
      <MessageBox
        message={showMessageBox.message}
        isError={showMessageBox.isError}
      />

      {/* ヘッダー (元のHTMLの濃い青を再現) */}
      <header
        className={`bg-${primaryColor}-800 text-white shadow-lg p-4 rounded-lg mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center`}
      >
        <h1 className="text-2xl font-bold flex items-center">
          <Package className={`w-6 h-6 mr-3 text-${primaryColor}-300`} />
          受注管理システム
          <span
            className={`ml-3 text-sm font-normal text-${primaryColor}-300 hidden sm:inline`}
          >
            NAGANO-3 多販路一括管理
          </span>
        </h1>
        {/* 認証情報表示 */}
        <div className="text-xs text-right text-white mt-2 sm:mt-0">
          <p>App ID: {appId}</p>
          <p>ユーザーID: {userId || "認証中..."}</p>
        </div>
      </header>

      {/* コントロールパネル (フィルター & アクション) */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-4">
        {/* ステータスボタン (元のHTMLのボタン群に対応) */}
        <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-100">
          {/* 通常ステータス */}
          {["すべて", "未処理", "処理中", "出荷済", "キャンセル"].map(
            (status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                  selectedStatus === status
                    ? (statusMap[status] ||
                        `bg-${primaryColor}-600 text-white border-${primaryColor}-600`) +
                      " ring-2 ring-offset-1 ring-indigo-500"
                    : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                }`}
              >
                {status} (
                {
                  orders.filter(
                    (o) => status === "すべて" || o.status === status
                  ).length
                }
                )
              </button>
            )
          )}
          {/* 特殊ステータス (元のHTMLにあった機能) */}
          <button
            onClick={() => handleStatusFilter("緊急対応")}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              selectedStatus === "緊急対応"
                ? "bg-red-600 text-white border-red-600 ring-2 ring-offset-1 ring-red-500"
                : "bg-red-100 text-red-700 border-red-500 hover:bg-red-200"
            }`}
          >
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            緊急対応 ({orders.filter((o) => o.status === "未処理").length})
          </button>
          <button
            onClick={() => handleStatusFilter("未入金")}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              selectedStatus === "未入金"
                ? "bg-amber-600 text-white border-amber-600 ring-2 ring-offset-1 ring-amber-500"
                : "bg-amber-100 text-amber-700 border-amber-500 hover:bg-amber-200"
            }`}
          >
            <CreditCard className="w-3 h-3 inline mr-1" />
            未入金 ({orders.filter((o) => o.paymentStatus === "未入金").length})
          </button>
          <button
            onClick={() => handleStatusFilter("本日出荷")}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              selectedStatus === "本日出荷"
                ? "bg-blue-600 text-white border-blue-600 ring-2 ring-offset-1 ring-blue-500"
                : "bg-blue-100 text-blue-700 border-blue-500 hover:bg-blue-200"
            }`}
          >
            <Calendar className="w-3 h-3 inline mr-1" />
            本日出荷 ({orders.filter((o) => o.shippingDate === today).length})
          </button>
        </div>

        {/* 検索・日付フィルター と 一括アクション */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 border-t pt-4">
          {/* 検索・日付フィルター */}
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="注文ID、顧客名、モールを検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>
            <div className="flex space-x-2">
              <input
                type="date"
                id="dateFrom"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
              <input
                type="date"
                id="dateTo"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>

          {/* 一括アクションボタン (元のHTMLの関数を呼び出す) */}
          <div className="flex flex-wrap justify-end gap-2 lg:gap-3">
            <button
              onClick={() => handleAction("refresh")}
              className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium shadow-sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
              />
              更新
            </button>
            <button
              onClick={() => handleAction("export")}
              className="flex items-center px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium shadow-md"
            >
              <Download className="w-4 h-4 mr-1" />
              データエクスポート
            </button>
            <button
              onClick={() => handleAction("print")}
              className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium shadow-md"
            >
              <Printer className="w-4 h-4 mr-1" />
              配送ラベル印刷
            </button>
            <button
              onClick={() => handleAction("inquiry")}
              className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-md"
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              問合せ管理
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア (リストと詳細) */}
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-250px)]">
        {/* 注文リスト (左側) */}
        <div className="lg:w-1/3 min-h-64 lg:h-full bg-white rounded-lg shadow-lg overflow-hidden flex flex-col border border-gray-200">
          <div className="p-4 bg-gray-100 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700">
              受注一覧 ({filteredOrders.length}件)
            </h2>
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              データ読み込み中...
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <OrderListItem key={order.id} order={order} />
                ))
              ) : (
                <p className="p-4 text-center text-gray-500">
                  該当する注文がありません。
                </p>
              )}
            </ul>
          )}
        </div>

        {/* 注文詳細パネル (右側) */}
        <div className="lg:w-2/3 lg:h-full">
          <DetailsPanel />
        </div>
      </div>

      {/* 認証状態の表示 (デバッグ用) */}
      <div className="text-xs text-center text-gray-500 mt-4">
        {isAuthReady ? "認証完了" : "認証中..."}
      </div>
    </div>
  );
};

export default App;
