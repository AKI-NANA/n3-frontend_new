/**
 * lib/services/crossborder/forwarders/dhlApiClient.ts
 *
 * DHL API クライアント
 * DHL Express API を使用してDDP配送を管理
 */

import type { ForwarderApiCredential } from '@/src/db/marketplace_db_schema';
import type {
  DdpRateRequest,
  DdpRateResponse,
  ShippingInstructionRequest,
  ShippingInstructionResponse,
  TrackingInfo,
} from '../forwarderApiService';

// DHL Express APIのベースURL
const DHL_API_BASE_URL = 'https://express.api.dhl.com/mydhlapi';

/**
 * DHL Rate API を使用してDDP配送料金を取得
 */
export async function getDhlDdpRate(
  credential: ForwarderApiCredential,
  request: DdpRateRequest
): Promise<DdpRateResponse> {
  const rateEndpoint = `${DHL_API_BASE_URL}/rates`;

  const weightKg = request.weight_g / 1000;

  const rateRequest = {
    customerDetails: {
      shipperDetails: {
        countryCode: request.source_country,
      },
      receiverDetails: {
        countryCode: request.destination_country,
      },
    },
    accounts: [
      {
        typeCode: 'shipper',
        number: credential.api_key,
      },
    ],
    productCode: 'P', // DHL Express Worldwide
    plannedShippingDateAndTime: new Date().toISOString(),
    unitOfMeasurement: 'metric',
    isCustomsDeclarable: true,
    monetaryAmount: [
      {
        typeCode: 'declaredValue',
        value: request.declared_value_usd,
        currency: 'USD',
      },
    ],
    packages: [
      {
        weight: weightKg,
        dimensions: {
          length: 30,
          width: 30,
          height: 30,
        },
      },
    ],
  };

  const response = await fetch(rateEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${credential.api_key}:${credential.api_secret}`).toString('base64')}`,
    },
    body: JSON.stringify(rateRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DHL Rate API エラー:', errorText);
    throw new Error(`DHL Rate API エラー: ${response.status}`);
  }

  const data = await response.json();

  const products = data.products || [];
  if (products.length === 0) {
    throw new Error('DHL料金情報が見つかりません');
  }

  // 最も安い料金を選択
  const cheapestProduct = products.reduce((min: any, current: any) =>
    current.totalPrice[0].price < min.totalPrice[0].price ? current : min
  );

  const totalCharge = cheapestProduct.totalPrice[0].price || 0;
  const currency = cheapestProduct.totalPrice[0].currency || 'USD';

  // コスト分解
  const baseShippingCost = totalCharge * 0.65;
  const ddpProcessingFee = totalCharge * 0.25;
  const repackFee = 5;
  const insuranceFee = request.declared_value_usd * 0.02;

  return {
    base_shipping_cost: baseShippingCost,
    ddp_processing_fee: ddpProcessingFee,
    repack_fee: repackFee,
    insurance_fee: insuranceFee,
    total_cost: totalCharge + repackFee + insuranceFee,
    estimated_delivery_days: cheapestProduct.deliveryCapabilities?.estimatedDeliveryDateAndTime
      ? Math.ceil(
          (new Date(cheapestProduct.deliveryCapabilities.estimatedDeliveryDateAndTime).getTime() -
            Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : 4,
    currency,
  };
}

/**
 * DHL Shipment API を使用して配送ラベルを作成し、配送指示を送信
 */
export async function createDhlShipment(
  credential: ForwarderApiCredential,
  request: ShippingInstructionRequest
): Promise<ShippingInstructionResponse> {
  const shipEndpoint = `${DHL_API_BASE_URL}/shipments`;

  const weightKg = request.package_weight_g / 1000;

  const warehouseAddress = credential.warehouse_address_json.find(
    (addr) => addr.country === request.source_country
  );

  if (!warehouseAddress) {
    throw new Error(`DHL倉庫住所が見つかりません: ${request.source_country}`);
  }

  const shipRequest = {
    plannedShippingDateAndTime: new Date().toISOString(),
    pickup: {
      isRequested: false,
    },
    productCode: 'P', // DHL Express Worldwide
    accounts: [
      {
        typeCode: 'shipper',
        number: credential.api_key,
      },
    ],
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          postalCode: warehouseAddress.postal_code,
          cityName: warehouseAddress.city,
          countryCode: warehouseAddress.country,
          addressLine1: warehouseAddress.address_line1,
        },
        contactInformation: {
          companyName: 'Your Company',
          fullName: 'Warehouse Manager',
          phone: '1234567890',
          email: 'warehouse@example.com',
        },
      },
      receiverDetails: {
        postalAddress: {
          postalCode: request.destination_address.postal_code,
          cityName: request.destination_address.city,
          countryCode: request.destination_address.country,
          addressLine1: request.destination_address.address_line1,
          addressLine2: request.destination_address.address_line2,
        },
        contactInformation: {
          fullName: request.destination_address.name,
          phone: request.destination_address.phone || '0000000000',
          email: request.destination_address.email || 'customer@example.com',
        },
      },
    },
    content: {
      packages: [
        {
          weight: weightKg,
          dimensions: {
            length: 30,
            width: 30,
            height: 30,
          },
        },
      ],
      isCustomsDeclarable: true,
      declaredValue: request.declared_value_usd,
      declaredValueCurrency: 'USD',
      exportDeclaration: {
        lineItems: [
          {
            number: 1,
            description: 'General Merchandise',
            price: request.declared_value_usd,
            quantity: {
              value: 1,
              unitOfMeasurement: 'PCS',
            },
            commodityCodes: [
              {
                typeCode: 'outbound',
                value: request.hs_code,
              },
            ],
            exportReasonType: 'permanent',
            manufacturerCountry: request.source_country,
            weight: {
              netValue: weightKg,
              grossValue: weightKg,
            },
          },
        ],
        invoice: {
          number: request.order_id,
          date: new Date().toISOString().split('T')[0],
        },
      },
      incoterm: 'DDP', // Delivered Duty Paid
      unitOfMeasurement: 'metric',
    },
    outputImageProperties: {
      imageOptions: [
        {
          typeCode: 'label',
        },
      ],
    },
  };

  const response = await fetch(shipEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${credential.api_key}:${credential.api_secret}`).toString('base64')}`,
    },
    body: JSON.stringify(shipRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DHL Shipment API エラー:', errorText);
    throw new Error(`DHL Shipment API エラー: ${response.status}`);
  }

  const data = await response.json();

  const shipmentTrackingNumber = data.shipmentTrackingNumber;

  if (!shipmentTrackingNumber) {
    throw new Error('DHL追跡番号が取得できませんでした');
  }

  return {
    success: true,
    shipment_id: shipmentTrackingNumber,
    tracking_number: shipmentTrackingNumber,
    warehouse_address: {
      name: `${warehouseAddress.city} Warehouse`,
      address_line1: warehouseAddress.address_line1,
      address_line2: warehouseAddress.address_line2,
      city: warehouseAddress.city,
      state: warehouseAddress.state,
      postal_code: warehouseAddress.postal_code,
      country: warehouseAddress.country,
    },
    message: 'DHL配送ラベルが正常に作成されました',
  };
}

/**
 * DHL Tracking API を使用して追跡情報を取得
 */
export async function getDhlTracking(
  credential: ForwarderApiCredential,
  trackingNumber: string
): Promise<TrackingInfo> {
  const trackEndpoint = `${DHL_API_BASE_URL}/tracking?trackingNumber=${trackingNumber}`;

  const response = await fetch(trackEndpoint, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${credential.api_key}:${credential.api_secret}`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DHL Tracking API エラー:', errorText);
    throw new Error(`DHL Tracking API エラー: ${response.status}`);
  }

  const data = await response.json();

  const shipment = data.shipments?.[0];

  if (!shipment) {
    throw new Error('DHL追跡情報が見つかりません');
  }

  const latestStatus = shipment.status;
  const events = shipment.events || [];

  // DHLステータスを標準ステータスに変換
  const statusMapping: Record<string, TrackingInfo['status']> = {
    'transit': 'IN_TRANSIT',
    'delivered': 'DELIVERED',
    'customs': 'CUSTOMS_CLEARANCE',
    'failure': 'EXCEPTION',
  };

  const status = statusMapping[latestStatus?.statusCode] || 'IN_TRANSIT';

  return {
    tracking_number: trackingNumber,
    status,
    current_location: latestStatus?.location?.address?.addressLocality,
    estimated_delivery_date: shipment.estimatedDeliveryDate,
    events: events.map((event: any) => ({
      timestamp: event.timestamp,
      location: event.location?.address?.addressLocality || 'Unknown',
      description: event.description,
    })),
  };
}
