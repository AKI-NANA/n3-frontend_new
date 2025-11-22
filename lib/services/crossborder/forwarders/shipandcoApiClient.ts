/**
 * lib/services/crossborder/forwarders/shipandcoApiClient.ts
 *
 * Ship&Co API クライアント
 * Ship&Co API を使用して複数キャリアのDDP配送を管理
 */

import type { ForwarderApiCredential } from '@/src/db/marketplace_db_schema';
import type {
  DdpRateRequest,
  DdpRateResponse,
  ShippingInstructionRequest,
  ShippingInstructionResponse,
  TrackingInfo,
} from '../forwarderApiService';

// Ship&Co APIのベースURL
const SHIPANDCO_API_BASE_URL = 'https://app.shipandco.com/api/v1';

/**
 * Ship&Co Rate API を使用してDDP配送料金を取得
 */
export async function getShipAndCoRate(
  credential: ForwarderApiCredential,
  request: DdpRateRequest
): Promise<DdpRateResponse> {
  const rateEndpoint = `${SHIPANDCO_API_BASE_URL}/rates`;

  const weightKg = request.weight_g / 1000;

  const rateRequest = {
    from_country: request.source_country,
    to_country: request.destination_country,
    weight: weightKg,
    declared_value: request.declared_value_usd,
    currency: 'USD',
    service_type: 'express', // Express配送
  };

  const response = await fetch(rateEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credential.api_key}`,
    },
    body: JSON.stringify(rateRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ship&Co Rate API エラー:', errorText);
    throw new Error(`Ship&Co Rate API エラー: ${response.status}`);
  }

  const data = await response.json();

  const rates = data.rates || [];
  if (rates.length === 0) {
    throw new Error('Ship&Co料金情報が見つかりません');
  }

  // 最も安い料金を選択
  const cheapestRate = rates.reduce((min: any, current: any) =>
    current.total_price < min.total_price ? current : min
  );

  const totalCharge = cheapestRate.total_price || 0;
  const currency = cheapestRate.currency || 'USD';

  // コスト分解
  const baseShippingCost = cheapestRate.shipping_price || totalCharge * 0.7;
  const ddpProcessingFee = cheapestRate.duty_handling_fee || totalCharge * 0.2;
  const repackFee = 5;
  const insuranceFee = request.declared_value_usd * 0.02;

  return {
    base_shipping_cost: baseShippingCost,
    ddp_processing_fee: ddpProcessingFee,
    repack_fee: repackFee,
    insurance_fee: insuranceFee,
    total_cost: totalCharge + repackFee + insuranceFee,
    estimated_delivery_days: cheapestRate.estimated_delivery_days || 5,
    currency,
  };
}

/**
 * Ship&Co Shipment API を使用して配送ラベルを作成し、配送指示を送信
 */
export async function createShipAndCoShipment(
  credential: ForwarderApiCredential,
  request: ShippingInstructionRequest
): Promise<ShippingInstructionResponse> {
  const shipEndpoint = `${SHIPANDCO_API_BASE_URL}/shipments`;

  const weightKg = request.package_weight_g / 1000;

  const warehouseAddress = credential.warehouse_address_json.find(
    (addr) => addr.country === request.source_country
  );

  if (!warehouseAddress) {
    throw new Error(`Ship&Co倉庫住所が見つかりません: ${request.source_country}`);
  }

  const shipRequest = {
    shipment: {
      from: {
        company: 'Your Company',
        name: 'Warehouse Manager',
        address1: warehouseAddress.address_line1,
        address2: warehouseAddress.address_line2 || '',
        city: warehouseAddress.city,
        state: warehouseAddress.state || '',
        zip: warehouseAddress.postal_code,
        country: warehouseAddress.country,
        phone: '1234567890',
        email: 'warehouse@example.com',
      },
      to: {
        name: request.destination_address.name,
        address1: request.destination_address.address_line1,
        address2: request.destination_address.address_line2 || '',
        city: request.destination_address.city,
        state: request.destination_address.state || '',
        zip: request.destination_address.postal_code,
        country: request.destination_address.country,
        phone: request.destination_address.phone || '0000000000',
        email: request.destination_address.email || 'customer@example.com',
      },
      packages: [
        {
          weight: weightKg,
          length: 30,
          width: 30,
          height: 30,
          weight_unit: 'kg',
          dimension_unit: 'cm',
        },
      ],
      customs: {
        contents_type: 'merchandise',
        non_delivery_option: 'return',
        incoterm: 'DDP', // Delivered Duty Paid
        invoice_number: request.order_id,
        invoice_date: new Date().toISOString().split('T')[0],
        items: [
          {
            description: 'General Merchandise',
            quantity: 1,
            value: request.declared_value_usd,
            weight: weightKg,
            hs_tariff_number: request.hs_code,
            origin_country: request.source_country,
          },
        ],
      },
      carrier: 'auto', // 自動で最適なキャリアを選択
      service_type: 'express',
      insurance_amount: request.declared_value_usd,
      reference: request.order_id,
      special_instructions: request.repack_instructions,
    },
  };

  const response = await fetch(shipEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credential.api_key}`,
    },
    body: JSON.stringify(shipRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ship&Co Shipment API エラー:', errorText);
    throw new Error(`Ship&Co Shipment API エラー: ${response.status}`);
  }

  const data = await response.json();

  const shipmentId = data.shipment?.id;
  const trackingNumber = data.shipment?.tracking_number;

  if (!trackingNumber) {
    throw new Error('Ship&Co追跡番号が取得できませんでした');
  }

  return {
    success: true,
    shipment_id: shipmentId,
    tracking_number: trackingNumber,
    warehouse_address: {
      name: `${warehouseAddress.city} Warehouse`,
      address_line1: warehouseAddress.address_line1,
      address_line2: warehouseAddress.address_line2,
      city: warehouseAddress.city,
      state: warehouseAddress.state,
      postal_code: warehouseAddress.postal_code,
      country: warehouseAddress.country,
    },
    message: 'Ship&Co配送ラベルが正常に作成されました',
  };
}

/**
 * Ship&Co Tracking API を使用して追跡情報を取得
 */
export async function getShipAndCoTracking(
  credential: ForwarderApiCredential,
  trackingNumber: string
): Promise<TrackingInfo> {
  const trackEndpoint = `${SHIPANDCO_API_BASE_URL}/trackings/${trackingNumber}`;

  const response = await fetch(trackEndpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${credential.api_key}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ship&Co Tracking API エラー:', errorText);
    throw new Error(`Ship&Co Tracking API エラー: ${response.status}`);
  }

  const data = await response.json();

  const tracking = data.tracking;

  if (!tracking) {
    throw new Error('Ship&Co追跡情報が見つかりません');
  }

  // Ship&Coステータスを標準ステータスに変換
  const statusMapping: Record<string, TrackingInfo['status']> = {
    'in_transit': 'IN_TRANSIT',
    'out_for_delivery': 'OUT_FOR_DELIVERY',
    'delivered': 'DELIVERED',
    'exception': 'EXCEPTION',
    'customs': 'CUSTOMS_CLEARANCE',
  };

  const status = statusMapping[tracking.status] || 'IN_TRANSIT';

  return {
    tracking_number: trackingNumber,
    status,
    current_location: tracking.current_location,
    estimated_delivery_date: tracking.estimated_delivery,
    events: (tracking.tracking_events || []).map((event: any) => ({
      timestamp: event.datetime,
      location: event.location || 'Unknown',
      description: event.message,
    })),
  };
}
