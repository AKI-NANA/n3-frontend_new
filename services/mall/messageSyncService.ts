/**
 * services/mall/messageSyncService.ts
 *
 * Amazon SP-API受注検知サービス
 * Notifications APIを使用して新規受注をリアルタイムで検知し、DDP自動化を起動する
 */

import { createClient } from '@/utils/supabase/server';
import { executeDdpAutomation } from '@/lib/services/crossborder/ddpAutomationService';
import type { OrderInfo, SupplierInfo } from '@/lib/services/crossborder/ddpAutomationService';
import type { ShippingAddress } from '@/lib/services/crossborder/forwarderApiService';

// ----------------------------------------------------
// 型定義
// ----------------------------------------------------

/**
 * Amazon SP-API 注文情報
 */
interface AmazonOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderTotal?: {
    CurrencyCode: string;
    Amount: string;
  };
  ShippingAddress?: {
    Name: string;
    AddressLine1: string;
    AddressLine2?: string;
    City: string;
    StateOrRegion?: string;
    PostalCode: string;
    CountryCode: string;
    Phone?: string;
  };
  OrderItems?: Array<{
    ASIN: string;
    SellerSKU: string;
    QuantityOrdered: number;
    ItemPrice?: {
      CurrencyCode: string;
      Amount: string;
    };
  }>;
}

/**
 * Amazon SP-API Notification イベント
 */
interface AmazonNotificationEvent {
  NotificationType: 'ORDER_CHANGE' | 'ANY_OFFER_CHANGED' | 'FEED_PROCESSING_FINISHED';
  EventTime: string;
  Payload: {
    OrderChangeNotification?: {
      AmazonOrderId: string;
      OrderStatus: string;
    };
    AnyOfferChangedNotification?: any;
  };
}

/**
 * SP-API クライアント設定
 */
interface SpApiConfig {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  marketplace_id: string;
  region: 'na' | 'eu' | 'fe'; // North America, Europe, Far East
}

// ----------------------------------------------------
// Amazon SP-API ヘルパー関数
// ----------------------------------------------------

/**
 * Amazon SP-API アクセストークンを取得
 */
async function getSpApiAccessToken(config: SpApiConfig): Promise<string> {
  const tokenUrl = 'https://api.amazon.com/auth/o2/token';

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
  });

  if (!response.ok) {
    throw new Error(`SP-API認証エラー: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Amazon SP-API エンドポイントURLを取得
 */
function getSpApiEndpoint(region: string): string {
  const endpoints: Record<string, string> = {
    na: 'https://sellingpartnerapi-na.amazon.com',
    eu: 'https://sellingpartnerapi-eu.amazon.com',
    fe: 'https://sellingpartnerapi-fe.amazon.com',
  };
  return endpoints[region] || endpoints.na;
}

/**
 * Amazon SP-API から注文詳細を取得
 */
async function getOrderDetails(
  config: SpApiConfig,
  orderId: string
): Promise<AmazonOrder | null> {
  const accessToken = await getSpApiAccessToken(config);
  const endpoint = getSpApiEndpoint(config.region);

  const orderUrl = `${endpoint}/orders/v0/orders/${orderId}`;

  const response = await fetch(orderUrl, {
    method: 'GET',
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`注文詳細取得エラー: ${response.status} ${await response.text()}`);
    return null;
  }

  const data = await response.json();
  return data.payload;
}

/**
 * Amazon SP-API から注文アイテム詳細を取得
 */
async function getOrderItems(
  config: SpApiConfig,
  orderId: string
): Promise<AmazonOrder['OrderItems']> {
  const accessToken = await getSpApiAccessToken(config);
  const endpoint = getSpApiEndpoint(config.region);

  const itemsUrl = `${endpoint}/orders/v0/orders/${orderId}/orderItems`;

  const response = await fetch(itemsUrl, {
    method: 'GET',
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`注文アイテム取得エラー: ${response.status} ${await response.text()}`);
    return [];
  }

  const data = await response.json();
  return data.payload?.OrderItems || [];
}

/**
 * SP-API設定をデータベースから取得
 */
async function getSpApiConfig(marketplace: string): Promise<SpApiConfig | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('amazon_sp_api_credentials')
    .select('*')
    .eq('marketplace', marketplace)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error(`SP-API設定が見つかりません: ${marketplace}`, error);
    return null;
  }

  return {
    refresh_token: data.refresh_token,
    client_id: data.client_id,
    client_secret: data.client_secret,
    marketplace_id: data.marketplace_id,
    region: data.region,
  };
}

/**
 * 商品情報をデータベースから取得
 */
async function getProductInfoBySku(sku: string): Promise<any> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('sku', sku)
    .single();

  if (error || !data) {
    console.error(`商品情報が見つかりません: ${sku}`, error);
    return null;
  }

  return data;
}

/**
 * 仕入先情報を取得（クロスボーダー設定から）
 */
async function getSupplierInfo(productId: number): Promise<SupplierInfo | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('crossborder_supplier_mappings')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error(`仕入先情報が見つかりません: Product ID ${productId}`, error);
    return null;
  }

  return {
    supplier_marketplace: data.supplier_marketplace,
    supplier_product_id: data.supplier_product_id,
    supplier_price: data.supplier_price,
    source_country: data.source_country,
  };
}

// ----------------------------------------------------
// メイン関数
// ----------------------------------------------------

/**
 * Amazon SP-API Notifications を処理する
 * SQS (Amazon Simple Queue Service) からのメッセージを受信して処理する
 *
 * @param event Notification イベント
 */
export async function handleAmazonNotification(
  event: AmazonNotificationEvent
): Promise<void> {
  console.log('[Amazon Notification] 受信:', event);

  // ORDER_CHANGE 通知のみを処理
  if (event.NotificationType !== 'ORDER_CHANGE') {
    console.log('[Amazon Notification] スキップ: 注文変更通知ではありません');
    return;
  }

  const orderChangePayload = event.Payload.OrderChangeNotification;

  if (!orderChangePayload) {
    console.log('[Amazon Notification] スキップ: ペイロードが空です');
    return;
  }

  const orderId = orderChangePayload.AmazonOrderId;
  const orderStatus = orderChangePayload.OrderStatus;

  // 新規注文（Pending または Unshipped）のみを処理
  if (!['Pending', 'Unshipped'].includes(orderStatus)) {
    console.log(`[Amazon Notification] スキップ: 注文ステータスが対象外 (${orderStatus})`);
    return;
  }

  console.log(`[Amazon Notification] 新規注文を検知: ${orderId}`);

  // DDP自動化を起動
  await processNewOrder(orderId);
}

/**
 * 新規注文を処理し、DDP自動化フローを起動する
 *
 * @param orderId Amazon注文ID
 */
export async function processNewOrder(orderId: string): Promise<void> {
  try {
    console.log(`[Order Processing] 注文処理開始: ${orderId}`);

    // 1. マーケットプレイスを特定（注文IDのプレフィックスから判定、または設定から取得）
    // ここでは簡易的に設定から取得
    const marketplace = 'AMAZON_JP'; // または動的に判定

    // 2. SP-API設定を取得
    const spApiConfig = await getSpApiConfig(marketplace);

    if (!spApiConfig) {
      throw new Error(`SP-API設定が見つかりません: ${marketplace}`);
    }

    // 3. 注文詳細を取得
    const orderDetails = await getOrderDetails(spApiConfig, orderId);

    if (!orderDetails) {
      throw new Error(`注文詳細が取得できませんでした: ${orderId}`);
    }

    // 4. 注文アイテムを取得
    const orderItems = await getOrderItems(spApiConfig, orderId);

    if (!orderItems || orderItems.length === 0) {
      throw new Error(`注文アイテムが見つかりません: ${orderId}`);
    }

    // 5. 最初のアイテムを処理（複数アイテムの場合はループ処理が必要）
    const firstItem = orderItems[0];

    // 6. 商品情報を取得
    const productInfo = await getProductInfoBySku(firstItem.SellerSKU);

    if (!productInfo) {
      throw new Error(`商品情報が見つかりません: ${firstItem.SellerSKU}`);
    }

    // 7. 仕入先情報を取得
    const supplierInfo = await getSupplierInfo(productInfo.id);

    if (!supplierInfo) {
      throw new Error(`仕入先情報が見つかりません: Product ID ${productInfo.id}`);
    }

    // 8. OrderInfo を構築
    const orderInfo: OrderInfo = {
      order_id: orderId,
      marketplace,
      product_id: productInfo.id,
      hs_code: productInfo.hs_code || '0000.00.0000',
      quantity: firstItem.QuantityOrdered,
      selling_price: parseFloat(firstItem.ItemPrice?.Amount || '0'),
      customer_address: {
        name: orderDetails.ShippingAddress?.Name || 'Unknown',
        address_line1: orderDetails.ShippingAddress?.AddressLine1 || '',
        address_line2: orderDetails.ShippingAddress?.AddressLine2,
        city: orderDetails.ShippingAddress?.City || '',
        state: orderDetails.ShippingAddress?.StateOrRegion,
        postal_code: orderDetails.ShippingAddress?.PostalCode || '',
        country: orderDetails.ShippingAddress?.CountryCode || '',
        phone: orderDetails.ShippingAddress?.Phone,
      },
      order_date: orderDetails.PurchaseDate,
    };

    // 9. DDP自動化を実行
    console.log(`[Order Processing] DDP自動化を起動: ${orderId}`);

    const ddpResult = await executeDdpAutomation({
      order: orderInfo,
      supplier: supplierInfo,
      forwarder_name: 'FedEx', // または設定から取得
      product_weight_g: productInfo.weight_g || 500,
    });

    if (ddpResult.success) {
      console.log(`[Order Processing] DDP自動化成功: ${orderId}`);
      console.log(`追跡番号: ${ddpResult.tracking_number}`);
    } else {
      console.error(`[Order Processing] DDP自動化失敗: ${orderId}`, ddpResult.error_message);
    }
  } catch (error) {
    console.error(`[Order Processing] 注文処理エラー: ${orderId}`, error);
    throw error;
  }
}

/**
 * Amazon SQS からの通知を受信して処理する
 * Next.js API Route から呼び出される
 *
 * @param sqsMessage SQSメッセージ
 */
export async function processSqsMessage(sqsMessage: any): Promise<void> {
  try {
    // SQSメッセージをパース
    const messageBody = JSON.parse(sqsMessage.Body);
    const notificationEvent: AmazonNotificationEvent = JSON.parse(messageBody.Message);

    // 通知を処理
    await handleAmazonNotification(notificationEvent);
  } catch (error) {
    console.error('[SQS Processing] メッセージ処理エラー:', error);
    throw error;
  }
}
