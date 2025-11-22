/**
 * lib/services/crossborder/forwarderApiService.ts
 *
 * フォワーダーAPI統合サービス
 * DDP配送、追跡番号管理、再梱包指示などを処理する
 */

import { createClient } from '@/utils/supabase/server';
import type { ForwarderApiCredential } from '@/src/db/marketplace_db_schema';

// フォワーダー固有のAPIクライアントをインポート
import {
  getFedexDdpRate,
  createFedexShipment,
  getFedexTracking,
} from './forwarders/fedexApiClient';
import {
  getDhlDdpRate,
  createDhlShipment,
  getDhlTracking,
} from './forwarders/dhlApiClient';
import {
  getShipAndCoRate,
  createShipAndCoShipment,
  getShipAndCoTracking,
} from './forwarders/shipandcoApiClient';

// ----------------------------------------------------
// 型定義
// ----------------------------------------------------

/**
 * 配送先住所
 */
export interface ShippingAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone?: string;
  email?: string;
}

/**
 * 配送指示リクエスト
 */
export interface ShippingInstructionRequest {
  order_id: string; // 注文ID
  forwarder_name: string; // 使用するフォワーダー名
  service_type: 'DDP' | 'DDU'; // 配送タイプ
  source_country: string; // 出荷元国
  destination_address: ShippingAddress; // 配送先住所
  package_weight_g: number; // 荷物重量 (グラム)
  declared_value_usd: number; // 申告価格 (USD)
  hs_code: string; // HSコード
  repack_instructions?: string; // 再梱包指示
  remove_branding?: boolean; // ブランディング除去 (デフォルト: true)
}

/**
 * DDP料金取得リクエスト
 */
export interface DdpRateRequest {
  forwarder_name: string;
  source_country: string;
  destination_country: string;
  weight_g: number;
  declared_value_usd: number;
}

/**
 * DDP料金レスポンス
 */
export interface DdpRateResponse {
  base_shipping_cost: number; // 基本送料 (USD)
  ddp_processing_fee: number; // DDP処理費 (USD)
  repack_fee: number; // 再梱包費 (USD)
  insurance_fee: number; // 保険料 (USD)
  total_cost: number; // 合計コスト (USD)
  estimated_delivery_days: number; // 推定配送日数
  currency: string; // 通貨 (デフォルト: USD)
}

/**
 * 配送指示レスポンス
 */
export interface ShippingInstructionResponse {
  success: boolean;
  shipment_id: string; // フォワーダー側の配送ID
  tracking_number?: string; // 追跡番号 (即座に発行される場合)
  warehouse_address: ShippingAddress; // 配送元倉庫住所
  estimated_pickup_date?: string; // 集荷予定日
  message?: string;
}

/**
 * 追跡情報
 */
export interface TrackingInfo {
  tracking_number: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'CUSTOMS_CLEARANCE' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION';
  current_location?: string;
  estimated_delivery_date?: string;
  events: Array<{
    timestamp: string;
    location: string;
    description: string;
  }>;
}

// ----------------------------------------------------
// ヘルパー関数
// ----------------------------------------------------

/**
 * フォワーダーの認証情報を取得する
 */
async function getForwarderCredentials(
  forwarderName: string
): Promise<ForwarderApiCredential | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('forwarder_api_credentials')
    .select('*')
    .eq('forwarder_name', forwarderName)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error(`フォワーダー認証情報が見つかりません: ${forwarderName}`, error);
    return null;
  }

  return data as ForwarderApiCredential;
}

/**
 * フォワーダーAPIにリクエストを送信する (汎用)
 */
async function callForwarderApi<T>(
  credential: ForwarderApiCredential,
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: any
): Promise<T> {
  const url = `${credential.api_endpoint}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${credential.api_key}`,
  };

  if (credential.api_secret) {
    headers['X-API-Secret'] = credential.api_secret;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`フォワーダーAPIエラー: ${response.status} - ${errorText}`);
    }

    return await response.json() as T;
  } catch (error) {
    console.error('フォワーダーAPI呼び出しエラー:', error);
    throw error;
  }
}

// ----------------------------------------------------
// メイン関数
// ----------------------------------------------------

/**
 * DDP配送料金を取得する
 *
 * @param request DDP料金取得リクエスト
 * @returns DDP料金情報
 */
export async function getDdpShippingRate(
  request: DdpRateRequest
): Promise<DdpRateResponse> {
  const credential = await getForwarderCredentials(request.forwarder_name);

  if (!credential) {
    throw new Error(`フォワーダー認証情報が見つかりません: ${request.forwarder_name}`);
  }

  try {
    // フォワーダー名に応じて適切なAPIクライアントを使用
    const forwarderNameLower = request.forwarder_name.toLowerCase();

    if (forwarderNameLower.includes('fedex')) {
      return await getFedexDdpRate(credential, request);
    } else if (forwarderNameLower.includes('dhl')) {
      return await getDhlDdpRate(credential, request);
    } else if (forwarderNameLower.includes('ship') && forwarderNameLower.includes('co')) {
      return await getShipAndCoRate(credential, request);
    } else {
      // カスタムフォワーダーまたは未対応のフォワーダーの場合、汎用APIを使用
      const endpoint = '/api/v1/rates/ddp';

      const requestBody = {
        origin_country: request.source_country,
        destination_country: request.destination_country,
        weight_g: request.weight_g,
        declared_value: request.declared_value_usd,
        service_type: 'DDP',
      };

      const apiResponse = await callForwarderApi<any>(
        credential,
        endpoint,
        'POST',
        requestBody
      );

      return {
        base_shipping_cost: apiResponse.base_cost || 0,
        ddp_processing_fee: apiResponse.ddp_fee || 0,
        repack_fee: apiResponse.repack_fee || 0,
        insurance_fee: apiResponse.insurance_fee || 0,
        total_cost: apiResponse.total_cost || 0,
        estimated_delivery_days: apiResponse.delivery_days || 7,
        currency: apiResponse.currency || 'USD',
      };
    }
  } catch (error) {
    console.error('DDP料金取得エラー:', error);

    // フォールバック: 簡易計算
    const weightKg = request.weight_g / 1000;
    const baseCost = 15 + (weightKg * 8);
    const ddpFee = baseCost * 0.2;
    const repackFee = Math.min(5, weightKg * 2);
    const insuranceFee = request.declared_value_usd * 0.02;

    return {
      base_shipping_cost: baseCost,
      ddp_processing_fee: ddpFee,
      repack_fee: repackFee,
      insurance_fee: insuranceFee,
      total_cost: baseCost + ddpFee + repackFee + insuranceFee,
      estimated_delivery_days: 7,
      currency: 'USD',
    };
  }
}

/**
 * フォワーダーに配送指示を送信する
 *
 * @param request 配送指示リクエスト
 * @returns 配送指示レスポンス
 */
export async function createShippingInstruction(
  request: ShippingInstructionRequest
): Promise<ShippingInstructionResponse> {
  const credential = await getForwarderCredentials(request.forwarder_name);

  if (!credential) {
    throw new Error(`フォワーダー認証情報が見つかりません: ${request.forwarder_name}`);
  }

  try {
    // フォワーダー名に応じて適切なAPIクライアントを使用
    const forwarderNameLower = request.forwarder_name.toLowerCase();

    if (forwarderNameLower.includes('fedex')) {
      return await createFedexShipment(credential, request);
    } else if (forwarderNameLower.includes('dhl')) {
      return await createDhlShipment(credential, request);
    } else if (forwarderNameLower.includes('ship') && forwarderNameLower.includes('co')) {
      return await createShipAndCoShipment(credential, request);
    } else {
      // カスタムフォワーダーまたは未対応のフォワーダーの場合、汎用APIを使用
      const endpoint = '/api/v1/shipments/create';

      const warehouseAddress = credential.warehouse_address_json.find(
        (addr) => addr.country === request.source_country
      );

      if (!warehouseAddress) {
        throw new Error(
          `倉庫住所が見つかりません: ${request.source_country} (フォワーダー: ${request.forwarder_name})`
        );
      }

      const requestBody = {
        order_reference: request.order_id,
        service_type: request.service_type,
        origin_country: request.source_country,
        destination: {
          name: request.destination_address.name,
          address1: request.destination_address.address_line1,
          address2: request.destination_address.address_line2,
          city: request.destination_address.city,
          state: request.destination_address.state,
          postal_code: request.destination_address.postal_code,
          country: request.destination_address.country,
          phone: request.destination_address.phone,
          email: request.destination_address.email,
        },
        package: {
          weight_g: request.package_weight_g,
          declared_value: request.declared_value_usd,
          hs_code: request.hs_code,
        },
        special_instructions: {
          repack: request.remove_branding !== false,
          remove_branding: request.remove_branding !== false,
          notes:
            request.repack_instructions || 'Remove all Amazon branding and repack in plain packaging',
        },
      };

      const apiResponse = await callForwarderApi<any>(credential, endpoint, 'POST', requestBody);

      return {
        success: true,
        shipment_id: apiResponse.shipment_id,
        tracking_number: apiResponse.tracking_number,
        warehouse_address: {
          name: warehouseAddress.city + ' Warehouse',
          address_line1: warehouseAddress.address_line1,
          address_line2: warehouseAddress.address_line2,
          city: warehouseAddress.city,
          state: warehouseAddress.state,
          postal_code: warehouseAddress.postal_code,
          country: warehouseAddress.country,
        },
        estimated_pickup_date: apiResponse.estimated_pickup_date,
        message: apiResponse.message || '配送指示が正常に作成されました',
      };
    }
  } catch (error) {
    console.error('配送指示作成エラー:', error);
    throw new Error(`配送指示の作成に失敗しました: ${error}`);
  }
}

/**
 * 追跡情報を取得する
 *
 * @param forwarderName フォワーダー名
 * @param trackingNumber 追跡番号
 * @returns 追跡情報
 */
export async function getTrackingInfo(
  forwarderName: string,
  trackingNumber: string
): Promise<TrackingInfo> {
  const credential = await getForwarderCredentials(forwarderName);

  if (!credential) {
    throw new Error(`フォワーダー認証情報が見つかりません: ${forwarderName}`);
  }

  try {
    // フォワーダー名に応じて適切なAPIクライアントを使用
    const forwarderNameLower = forwarderName.toLowerCase();

    if (forwarderNameLower.includes('fedex')) {
      return await getFedexTracking(credential, trackingNumber);
    } else if (forwarderNameLower.includes('dhl')) {
      return await getDhlTracking(credential, trackingNumber);
    } else if (forwarderNameLower.includes('ship') && forwarderNameLower.includes('co')) {
      return await getShipAndCoTracking(credential, trackingNumber);
    } else {
      // カスタムフォワーダーまたは未対応のフォワーダーの場合、汎用APIを使用
      const endpoint = `/api/v1/tracking/${trackingNumber}`;

      const apiResponse = await callForwarderApi<any>(credential, endpoint, 'GET');

      return {
        tracking_number: trackingNumber,
        status: apiResponse.status || 'PENDING',
        current_location: apiResponse.current_location,
        estimated_delivery_date: apiResponse.estimated_delivery_date,
        events: apiResponse.events || [],
      };
    }
  } catch (error) {
    console.error('追跡情報取得エラー:', error);

    // フォールバック
    return {
      tracking_number: trackingNumber,
      status: 'PENDING',
      events: [],
    };
  }
}

/**
 * フォワーダーの倉庫住所を取得する
 *
 * @param forwarderName フォワーダー名
 * @param country 国コード
 * @returns 倉庫住所
 */
export async function getWarehouseAddress(
  forwarderName: string,
  country: string
): Promise<ShippingAddress | null> {
  const credential = await getForwarderCredentials(forwarderName);

  if (!credential) {
    return null;
  }

  const warehouseAddress = credential.warehouse_address_json.find(
    addr => addr.country === country
  );

  if (!warehouseAddress) {
    return null;
  }

  return {
    name: `${warehouseAddress.city} Warehouse`,
    address_line1: warehouseAddress.address_line1,
    address_line2: warehouseAddress.address_line2,
    city: warehouseAddress.city,
    state: warehouseAddress.state,
    postal_code: warehouseAddress.postal_code,
    country: warehouseAddress.country,
  };
}
