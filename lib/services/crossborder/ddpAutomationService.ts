/**
 * lib/services/crossborder/ddpAutomationService.ts
 *
 * DDP自動化サービス
 * 受注から配送完了までのプロセスを自動化する
 */

import { createClient } from '@/utils/supabase/server';
import {
  createShippingInstruction,
  getTrackingInfo,
  getWarehouseAddress,
  type ShippingAddress,
  type ShippingInstructionRequest,
} from './forwarderApiService';

// ----------------------------------------------------
// 型定義
// ----------------------------------------------------

/**
 * 注文情報
 */
export interface OrderInfo {
  order_id: string; // 注文ID
  marketplace: 'AMAZON_US' | 'AMAZON_JP' | 'AMAZON_DE' | 'EBAY_US' | string; // マーケットプレイス
  product_id: number; // 商品ID
  hs_code: string; // HSコード
  quantity: number; // 数量
  selling_price: number; // 販売価格
  customer_address: ShippingAddress; // 顧客住所
  order_date: string; // 注文日時
}

/**
 * 仕入先情報
 */
export interface SupplierInfo {
  supplier_marketplace: string; // 仕入先マーケットプレイス (例: "AMAZON_US")
  supplier_product_id: string; // 仕入先商品ID (ASIN等)
  supplier_price: number; // 仕入れ価格
  source_country: string; // 仕入先国
}

/**
 * DDP自動化リクエスト
 */
export interface DdpAutomationRequest {
  order: OrderInfo;
  supplier: SupplierInfo;
  forwarder_name: string; // 使用するフォワーダー
  product_weight_g: number; // 商品重量
}

/**
 * DDP自動化結果
 */
export interface DdpAutomationResult {
  success: boolean;
  order_id: string;
  steps: {
    order_detection: { success: boolean; timestamp: string };
    supplier_purchase: { success: boolean; purchase_id?: string; timestamp: string };
    forwarder_instruction: { success: boolean; shipment_id?: string; timestamp: string };
    tracking_sync: { success: boolean; tracking_number?: string; timestamp: string };
  };
  warehouse_address?: ShippingAddress;
  tracking_number?: string;
  estimated_delivery_date?: string;
  error_message?: string;
}

// ----------------------------------------------------
// ヘルパー関数
// ----------------------------------------------------

/**
 * 注文情報をデータベースに記録する
 */
async function logOrderToDatabase(
  order: OrderInfo,
  status: 'RECEIVED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'FAILED'
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('crossborder_orders').insert({
    order_id: order.order_id,
    marketplace: order.marketplace,
    product_id: order.product_id,
    quantity: order.quantity,
    selling_price: order.selling_price,
    customer_address: order.customer_address,
    status,
    order_date: order.order_date,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('注文ログ記録エラー:', error);
  }
}

/**
 * 注文ステータスを更新する
 */
async function updateOrderStatus(
  orderId: string,
  status: string,
  additionalData?: any
): Promise<void> {
  const supabase = createClient();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (additionalData) {
    updateData.additional_data = additionalData;
  }

  const { error } = await supabase
    .from('crossborder_orders')
    .update(updateData)
    .eq('order_id', orderId);

  if (error) {
    console.error('注文ステータス更新エラー:', error);
  }
}

/**
 * Amazon APIを使用して自動決済を行う (モック実装)
 * 実際のプロジェクトでは、Amazon SP-API を使用する
 */
async function purchaseFromSupplier(
  supplier: SupplierInfo,
  quantity: number,
  warehouseAddress: ShippingAddress
): Promise<{ success: boolean; purchase_id?: string; error?: string }> {
  try {
    // TODO: 実際のAmazon SP-API連携を実装
    // この関数は以下を実行する:
    // 1. Amazon A国のAPIにアクセス
    // 2. 商品をカートに追加
    // 3. 配送先をフォワーダーの倉庫住所に設定
    // 4. 決済を実行
    // 5. 注文IDを取得して返却

    console.log('仕入先から商品を購入:', {
      supplier,
      quantity,
      warehouseAddress,
    });

    // モック実装: 成功を返す
    const mockPurchaseId = `PURCHASE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      purchase_id: mockPurchaseId,
    };
  } catch (error) {
    console.error('仕入先購入エラー:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * マーケットプレイスに追跡番号を同期する
 */
async function syncTrackingToMarketplace(
  marketplace: string,
  orderId: string,
  trackingNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: 実際のマーケットプレイスAPI連携を実装
    // Amazon SP-API, eBay API などを使用して追跡番号を更新する

    console.log('追跡番号をマーケットプレイスに同期:', {
      marketplace,
      orderId,
      trackingNumber,
    });

    // モック実装: 成功を返す
    return { success: true };
  } catch (error) {
    console.error('追跡番号同期エラー:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

// ----------------------------------------------------
// メイン関数
// ----------------------------------------------------

/**
 * DDP自動化フローを実行する
 *
 * ステップ:
 * 1. 受注検知 - モールAPIから注文情報を取得
 * 2. 自動決済 - Amazon A国で配送先をフォワーダー倉庫に設定して自動決済
 * 3. フォワーダーへの指示 - DDP処理、再梱包、配送指示を送信
 * 4. 追跡情報同期 - 追跡番号をAmazon B国の注文情報に反映
 *
 * @param request DDP自動化リクエスト
 * @returns DDP自動化結果
 */
export async function executeDdpAutomation(
  request: DdpAutomationRequest
): Promise<DdpAutomationResult> {
  const result: DdpAutomationResult = {
    success: false,
    order_id: request.order.order_id,
    steps: {
      order_detection: { success: false, timestamp: '' },
      supplier_purchase: { success: false, timestamp: '' },
      forwarder_instruction: { success: false, timestamp: '' },
      tracking_sync: { success: false, timestamp: '' },
    },
  };

  try {
    // ステップ1: 受注検知
    console.log(`[DDP Automation] ステップ1: 受注検知 - Order ID: ${request.order.order_id}`);
    result.steps.order_detection = {
      success: true,
      timestamp: new Date().toISOString(),
    };

    // 注文情報をデータベースに記録
    await logOrderToDatabase(request.order, 'RECEIVED');

    // ステップ2: フォワーダー倉庫住所を取得
    console.log('[DDP Automation] ステップ2: フォワーダー倉庫住所を取得');
    const warehouseAddress = await getWarehouseAddress(
      request.forwarder_name,
      request.supplier.source_country
    );

    if (!warehouseAddress) {
      throw new Error(
        `フォワーダー倉庫住所が見つかりません: ${request.forwarder_name} (${request.supplier.source_country})`
      );
    }

    result.warehouse_address = warehouseAddress;

    // ステップ3: 自動決済 - Amazon A国で配送先をフォワーダー倉庫に設定して購入
    console.log('[DDP Automation] ステップ3: 仕入先から自動購入');
    const purchaseResult = await purchaseFromSupplier(
      request.supplier,
      request.order.quantity,
      warehouseAddress
    );

    if (!purchaseResult.success) {
      throw new Error(`仕入先購入に失敗しました: ${purchaseResult.error}`);
    }

    result.steps.supplier_purchase = {
      success: true,
      purchase_id: purchaseResult.purchase_id,
      timestamp: new Date().toISOString(),
    };

    await updateOrderStatus(request.order.order_id, 'PROCESSING', {
      purchase_id: purchaseResult.purchase_id,
    });

    // ステップ4: フォワーダーへの配送指示
    console.log('[DDP Automation] ステップ4: フォワーダーへの配送指示');
    const shippingInstruction: ShippingInstructionRequest = {
      order_id: request.order.order_id,
      forwarder_name: request.forwarder_name,
      service_type: 'DDP',
      source_country: request.supplier.source_country,
      destination_address: request.order.customer_address,
      package_weight_g: request.product_weight_g * request.order.quantity,
      declared_value_usd: request.supplier.supplier_price * request.order.quantity,
      hs_code: request.order.hs_code,
      remove_branding: true,
      repack_instructions: 'Remove all Amazon branding and original packaging. Repack in plain packaging.',
    };

    const shippingResult = await createShippingInstruction(shippingInstruction);

    if (!shippingResult.success) {
      throw new Error('フォワーダーへの配送指示に失敗しました');
    }

    result.steps.forwarder_instruction = {
      success: true,
      shipment_id: shippingResult.shipment_id,
      timestamp: new Date().toISOString(),
    };

    result.tracking_number = shippingResult.tracking_number;
    result.estimated_delivery_date = shippingResult.estimated_pickup_date;

    // ステップ5: 追跡番号の同期
    if (shippingResult.tracking_number) {
      console.log('[DDP Automation] ステップ5: 追跡番号をマーケットプレイスに同期');
      const syncResult = await syncTrackingToMarketplace(
        request.order.marketplace,
        request.order.order_id,
        shippingResult.tracking_number
      );

      result.steps.tracking_sync = {
        success: syncResult.success,
        tracking_number: shippingResult.tracking_number,
        timestamp: new Date().toISOString(),
      };

      if (syncResult.success) {
        await updateOrderStatus(request.order.order_id, 'SHIPPED', {
          tracking_number: shippingResult.tracking_number,
          shipment_id: shippingResult.shipment_id,
        });
      }
    }

    result.success = true;
    console.log(`[DDP Automation] 完了: Order ID ${request.order.order_id}`);

    return result;
  } catch (error) {
    console.error('[DDP Automation] エラー:', error);
    result.error_message = String(error);

    // エラー時は注文ステータスをFAILEDに更新
    await updateOrderStatus(request.order.order_id, 'FAILED', {
      error: String(error),
    });

    return result;
  }
}

/**
 * 追跡番号を更新する (フォワーダーから追跡番号が後で発行された場合)
 *
 * @param orderId 注文ID
 * @param forwarderName フォワーダー名
 * @param shipmentId 配送ID
 */
export async function updateTrackingNumber(
  orderId: string,
  forwarderName: string,
  shipmentId: string
): Promise<{ success: boolean; tracking_number?: string; error?: string }> {
  try {
    // フォワーダーから追跡情報を取得
    const trackingInfo = await getTrackingInfo(forwarderName, shipmentId);

    if (!trackingInfo.tracking_number) {
      return {
        success: false,
        error: '追跡番号がまだ発行されていません',
      };
    }

    // データベースを更新
    await updateOrderStatus(orderId, 'SHIPPED', {
      tracking_number: trackingInfo.tracking_number,
    });

    // マーケットプレイスに同期 (実装は省略、必要に応じて追加)

    return {
      success: true,
      tracking_number: trackingInfo.tracking_number,
    };
  } catch (error) {
    console.error('追跡番号更新エラー:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * 注文ステータスを監視し、配送完了を検知する
 *
 * @param orderId 注文ID
 * @param forwarderName フォワーダー名
 * @param trackingNumber 追跡番号
 */
export async function monitorOrderDelivery(
  orderId: string,
  forwarderName: string,
  trackingNumber: string
): Promise<{ delivered: boolean; status: string }> {
  try {
    const trackingInfo = await getTrackingInfo(forwarderName, trackingNumber);

    if (trackingInfo.status === 'DELIVERED') {
      await updateOrderStatus(orderId, 'DELIVERED', {
        delivered_at: new Date().toISOString(),
      });

      return { delivered: true, status: 'DELIVERED' };
    }

    return { delivered: false, status: trackingInfo.status };
  } catch (error) {
    console.error('配送監視エラー:', error);
    return { delivered: false, status: 'UNKNOWN' };
  }
}
