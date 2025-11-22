'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Printer,
  Settings,
  RefreshCw
} from 'lucide-react';

// 📦 商品ステータスの型定義
type FulfillmentStatus = 'pending' | 'packing' | 'ready' | 'shipped';

// 📦 商品データの型定義
interface Product {
  id: string;
  sku: string;
  title: string;
  imageUrl?: string;
  status: FulfillmentStatus;
  weight?: number; // グラム
  length?: number; // cm
  width?: number; // cm
  height?: number; // cm
  shippingDeadline?: Date;
  trackingNumber?: string;
  carrier?: string;
  warnings: string[];
}

// 🎨 ステータスの表示設定
const statusConfig: Record<FulfillmentStatus, { label: string; color: string; icon: any }> = {
  pending: { label: '未処理', color: 'bg-gray-200 text-gray-800', icon: Package },
  packing: { label: '梱包中', color: 'bg-blue-200 text-blue-800', icon: Package },
  ready: { label: '発送準備完了', color: 'bg-green-200 text-green-800', icon: CheckCircle },
  shipped: { label: '発送済み', color: 'bg-purple-200 text-purple-800', icon: Truck },
};

// 🔥 モックデータ（後でSupabaseから取得）
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    sku: 'YAH-12345',
    title: 'ポケモンカード ゲンガー',
    status: 'pending',
    weight: 50,
    length: 10,
    width: 7,
    height: 1,
    shippingDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    warnings: [],
  },
  {
    id: '2',
    sku: 'YAH-12346',
    title: 'フィギュア ワンピース',
    status: 'packing',
    weight: 500,
    length: 20,
    width: 15,
    height: 25,
    shippingDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    warnings: ['重量超過の可能性'],
  },
  {
    id: '3',
    sku: 'YAH-12347',
    title: 'ブランド財布',
    status: 'ready',
    weight: 200,
    length: 12,
    width: 10,
    height: 3,
    shippingDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    warnings: ['発送期限迫る'],
  },
  {
    id: '4',
    sku: 'YAH-12348',
    title: 'ゲーム機本体',
    status: 'shipped',
    weight: 1500,
    length: 30,
    width: 25,
    height: 10,
    trackingNumber: 'TK-123456789',
    carrier: 'USPS',
    warnings: [],
  },
];

export default function FulfillmentBoardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // 🔥 商品リストを読み込む
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fulfillment/list');
      const result = await response.json();

      if (result.success) {
        // 🔥 警告チェックを追加
        const productsWithWarnings = result.data.map((p: Product) => ({
          ...p,
          warnings: generateWarnings(p),
        }));
        setProducts(productsWithWarnings);
      } else {
        console.error('商品リスト取得失敗:', result.error);
        // モックデータをフォールバック
        setProducts(MOCK_PRODUCTS);
      }
    } catch (error) {
      console.error('商品リスト取得エラー:', error);
      // モックデータをフォールバック
      setProducts(MOCK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 警告を生成
  const generateWarnings = (product: Product): string[] => {
    const warnings: string[] = [];

    // 重量チェック（5kg超過）
    if (product.weight && product.weight > 5000) {
      warnings.push('重量超過の可能性');
    }

    // 発送期限チェック（24時間以内）
    if (product.shippingDeadline) {
      const now = new Date();
      const deadline = new Date(product.shippingDeadline);
      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilDeadline < 24 && hoursUntilDeadline > 0) {
        warnings.push('発送期限迫る');
      }
    }

    return warnings;
  };

  // 📊 ステータスごとの商品をグループ化
  const groupedProducts: Record<FulfillmentStatus, Product[]> = {
    pending: products.filter(p => p.status === 'pending'),
    packing: products.filter(p => p.status === 'packing'),
    ready: products.filter(p => p.status === 'ready'),
    shipped: products.filter(p => p.status === 'shipped'),
  };

  // 🎯 ドラッグ開始
  const handleDragStart = (product: Product) => {
    setDraggedProduct(product);
  };

  // 🎯 ドラッグオーバー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 🎯 ドロップ
  const handleDrop = async (newStatus: FulfillmentStatus) => {
    if (!draggedProduct) return;

    // 🔥 楽観的UI更新
    const updatedProducts = products.map(p =>
      p.id === draggedProduct.id ? { ...p, status: newStatus } : p
    );
    setProducts(updatedProducts);

    // 🔥 APIでDBを更新
    try {
      const response = await fetch('/api/fulfillment/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: draggedProduct.id,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ 商品 ${draggedProduct.sku} のステータスを ${newStatus} に更新しました`);
      } else {
        console.error('❌ ステータス更新失敗:', result.error);
        // ロールバック
        setProducts(products);
        alert('ステータス更新に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('❌ ステータス更新エラー:', error);
      // ロールバック
      setProducts(products);
      alert('ステータス更新に失敗しました');
    }

    setDraggedProduct(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">商品リストを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <Package className="inline-block mr-2 h-8 w-8" />
          出荷管理ボード
        </h1>
        <p className="text-gray-600">
          商品をドラッグ&ドロップして出荷ステータスを管理
        </p>
        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadProducts}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            リロード
          </Button>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(Object.keys(statusConfig) as FulfillmentStatus[]).map(status => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{statusConfig[status].label}</p>
                  <p className="text-2xl font-bold">{groupedProducts[status].length}</p>
                </div>
                <div className={`p-3 rounded-full ${statusConfig[status].color}`}>
                  {statusConfig[status].icon && <statusConfig[status].icon className="h-6 w-6" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanbanボード */}
      <div className="grid grid-cols-4 gap-4">
        {(Object.keys(statusConfig) as FulfillmentStatus[]).map(status => (
          <div
            key={status}
            className="bg-white rounded-lg shadow-sm"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
          >
            {/* カラムヘッダー */}
            <div className={`p-4 rounded-t-lg ${statusConfig[status].color}`}>
              <h3 className="font-semibold flex items-center gap-2">
                {statusConfig[status].icon && <statusConfig[status].icon className="h-5 w-5" />}
                {statusConfig[status].label}
                <Badge variant="outline" className="ml-auto bg-white">
                  {groupedProducts[status].length}
                </Badge>
              </h3>
            </div>

            {/* 商品カードリスト */}
            <div className="p-2 space-y-2 min-h-[400px]">
              {groupedProducts[status].map(product => (
                <Card
                  key={product.id}
                  draggable
                  onDragStart={() => handleDragStart(product)}
                  onClick={() => setSelectedProduct(product)}
                  className="cursor-move hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    {/* 商品画像 */}
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    )}

                    {/* 商品タイトル */}
                    <h4 className="font-semibold text-sm mb-1 truncate">{product.title}</h4>
                    <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>

                    {/* 重量・サイズ情報 */}
                    {product.weight && (
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">重量:</span> {product.weight}g
                        {product.length && product.width && product.height && (
                          <>
                            <br />
                            <span className="font-medium">サイズ:</span> {product.length}×{product.width}×{product.height}cm
                          </>
                        )}
                      </div>
                    )}

                    {/* 警告表示 */}
                    {product.warnings.length > 0 && (
                      <div className="space-y-1">
                        {product.warnings.map((warning, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {warning}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* 発送期限 */}
                    {product.shippingDeadline && (
                      <div className="text-xs text-gray-600 mt-2">
                        <span className="font-medium">期限:</span>{' '}
                        {product.shippingDeadline.toLocaleDateString('ja-JP')}
                      </div>
                    )}

                    {/* 追跡番号 */}
                    {product.trackingNumber && (
                      <div className="text-xs text-gray-600 mt-2">
                        <span className="font-medium">追跡:</span> {product.trackingNumber}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* アクションボタン */}
      <div className="fixed bottom-6 right-6 flex gap-3">
        <Button
          size="lg"
          className="shadow-lg"
          onClick={() => setShowPrintModal(true)}
        >
          <Printer className="h-5 w-5 mr-2" />
          ラベル印刷
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="shadow-lg"
          onClick={() => setShowCarrierModal(true)}
        >
          <Truck className="h-5 w-5 mr-2" />
          配送業者選択
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="shadow-lg"
          onClick={() => setShowTrackingModal(true)}
        >
          <Settings className="h-5 w-5 mr-2" />
          追跡番号入力
        </Button>
      </div>

      {/* モーダル（後で実装） */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>ラベル印刷</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                印刷する商品を選択してください
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPrintModal(false)}>
                  キャンセル
                </Button>
                <Button onClick={() => setShowPrintModal(false)}>
                  印刷実行
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
