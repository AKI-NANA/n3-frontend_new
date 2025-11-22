/**
 * lib/services/crossborder/forwarders/fedexApiClient.ts
 *
 * FedEx API クライアント
 * FedEx Web Services API を使用してDDP配送を管理
 */

import type { ForwarderApiCredential } from '@/src/db/marketplace_db_schema';
import type {
  DdpRateRequest,
  DdpRateResponse,
  ShippingInstructionRequest,
  ShippingInstructionResponse,
  TrackingInfo,
} from '../forwarderApiService';

// FedEx APIのベースURL
const FEDEX_API_BASE_URL = 'https://apis.fedex.com';

/**
 * FedEx OAuth 2.0 認証トークンを取得
 */
async function getFedexAuthToken(credential: ForwarderApiCredential): Promise<string> {
  const tokenUrl = `${FEDEX_API_BASE_URL}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credential.api_key,
      client_secret: credential.api_secret || '',
    }),
  });

  if (!response.ok) {
    throw new Error(`FedEx認証エラー: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * FedEx Rate Quote API を使用してDDP配送料金を取得
 */
export async function getFedexDdpRate(
  credential: ForwarderApiCredential,
  request: DdpRateRequest
): Promise<DdpRateResponse> {
  const authToken = await getFedexAuthToken(credential);

  const rateEndpoint = `${FEDEX_API_BASE_URL}/rate/v1/rates/quotes`;

  const weightKg = request.weight_g / 1000;

  const rateRequest = {
    accountNumber: {
      value: credential.api_key,
    },
    requestedShipment: {
      shipper: {
        address: {
          countryCode: request.source_country,
        },
      },
      recipient: {
        address: {
          countryCode: request.destination_country,
        },
      },
      pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
      serviceType: 'INTERNATIONAL_PRIORITY', // または INTERNATIONAL_ECONOMY
      packagingType: 'YOUR_PACKAGING',
      rateRequestType: ['ACCOUNT', 'LIST'],
      requestedPackageLineItems: [
        {
          weight: {
            value: weightKg,
            units: 'KG',
          },
          declaredValue: {
            amount: request.declared_value_usd,
            currency: 'USD',
          },
        },
      ],
      customsClearanceDetail: {
        dutiesPayment: {
          paymentType: 'SENDER', // DDP: 送り主が関税支払い
        },
        commodities: [
          {
            customsValue: {
              amount: request.declared_value_usd,
              currency: 'USD',
            },
          },
        ],
      },
    },
  };

  const response = await fetch(rateEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(rateRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('FedEx Rate API エラー:', errorText);
    throw new Error(`FedEx Rate API エラー: ${response.status}`);
  }

  const data = await response.json();

  // レスポンスから料金情報を抽出
  const rateReplyDetails = data.output?.rateReplyDetails?.[0];
  if (!rateReplyDetails) {
    throw new Error('FedEx料金情報が見つかりません');
  }

  const totalCharge = rateReplyDetails.ratedShipmentDetails?.[0]?.totalNetCharge?.amount || 0;
  const currency = rateReplyDetails.ratedShipmentDetails?.[0]?.totalNetCharge?.currency || 'USD';

  // DDP処理費とその他の費用を分解
  const baseShippingCost = totalCharge * 0.7; // 仮定: 基本送料は70%
  const ddpProcessingFee = totalCharge * 0.2; // 仮定: DDP処理費は20%
  const repackFee = 5; // 固定再梱包費
  const insuranceFee = request.declared_value_usd * 0.02; // 2%の保険料

  return {
    base_shipping_cost: baseShippingCost,
    ddp_processing_fee: ddpProcessingFee,
    repack_fee: repackFee,
    insurance_fee: insuranceFee,
    total_cost: totalCharge + repackFee + insuranceFee,
    estimated_delivery_days: 5, // FedEx International Priority: 通常3-5日
    currency,
  };
}

/**
 * FedEx Ship API を使用して配送ラベルを作成し、配送指示を送信
 */
export async function createFedexShipment(
  credential: ForwarderApiCredential,
  request: ShippingInstructionRequest
): Promise<ShippingInstructionResponse> {
  const authToken = await getFedexAuthToken(credential);

  const shipEndpoint = `${FEDEX_API_BASE_URL}/ship/v1/shipments`;

  const weightKg = request.package_weight_g / 1000;

  // 倉庫住所を取得
  const warehouseAddress = credential.warehouse_address_json.find(
    (addr) => addr.country === request.source_country
  );

  if (!warehouseAddress) {
    throw new Error(`FedEx倉庫住所が見つかりません: ${request.source_country}`);
  }

  const shipRequest = {
    labelResponseOptions: 'URL_ONLY',
    requestedShipment: {
      shipper: {
        contact: {
          companyName: 'Your Company',
          phoneNumber: '1234567890',
        },
        address: {
          streetLines: [warehouseAddress.address_line1],
          city: warehouseAddress.city,
          stateOrProvinceCode: warehouseAddress.state,
          postalCode: warehouseAddress.postal_code,
          countryCode: warehouseAddress.country,
        },
      },
      recipients: [
        {
          contact: {
            personName: request.destination_address.name,
            phoneNumber: request.destination_address.phone || '0000000000',
          },
          address: {
            streetLines: [
              request.destination_address.address_line1,
              request.destination_address.address_line2 || '',
            ].filter(Boolean),
            city: request.destination_address.city,
            stateOrProvinceCode: request.destination_address.state,
            postalCode: request.destination_address.postal_code,
            countryCode: request.destination_address.country,
          },
        },
      ],
      shipDatestamp: new Date().toISOString().split('T')[0],
      serviceType: 'INTERNATIONAL_PRIORITY',
      packagingType: 'YOUR_PACKAGING',
      pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
      blockInsightVisibility: false,
      shippingChargesPayment: {
        paymentType: 'SENDER',
      },
      customsClearanceDetail: {
        dutiesPayment: {
          paymentType: 'SENDER', // DDP
        },
        commodities: [
          {
            description: 'General Merchandise',
            countryOfManufacture: request.source_country,
            quantity: 1,
            quantityUnits: 'PCS',
            unitPrice: {
              amount: request.declared_value_usd,
              currency: 'USD',
            },
            customsValue: {
              amount: request.declared_value_usd,
              currency: 'USD',
            },
            weight: {
              units: 'KG',
              value: weightKg,
            },
            harmonizedCode: request.hs_code,
          },
        ],
      },
      labelSpecification: {
        labelFormatType: 'COMMON2D',
        imageType: 'PDF',
        labelStockType: 'PAPER_4X6',
      },
      requestedPackageLineItems: [
        {
          weight: {
            units: 'KG',
            value: weightKg,
          },
        },
      ],
    },
    accountNumber: {
      value: credential.api_key,
    },
  };

  const response = await fetch(shipEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(shipRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('FedEx Ship API エラー:', errorText);
    throw new Error(`FedEx Ship API エラー: ${response.status}`);
  }

  const data = await response.json();

  const completedShipmentDetail = data.output?.transactionShipments?.[0]?.completedShipmentDetail;
  const trackingNumber =
    completedShipmentDetail?.completedPackageDetails?.[0]?.trackingIds?.[0]?.trackingNumber;

  if (!trackingNumber) {
    throw new Error('FedEx追跡番号が取得できませんでした');
  }

  return {
    success: true,
    shipment_id: trackingNumber,
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
    message: 'FedEx配送ラベルが正常に作成されました',
  };
}

/**
 * FedEx Track API を使用して追跡情報を取得
 */
export async function getFedexTracking(
  credential: ForwarderApiCredential,
  trackingNumber: string
): Promise<TrackingInfo> {
  const authToken = await getFedexAuthToken(credential);

  const trackEndpoint = `${FEDEX_API_BASE_URL}/track/v1/trackingnumbers`;

  const trackRequest = {
    includeDetailedScans: true,
    trackingInfo: [
      {
        trackingNumberInfo: {
          trackingNumber,
        },
      },
    ],
  };

  const response = await fetch(trackEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(trackRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('FedEx Track API エラー:', errorText);
    throw new Error(`FedEx Track API エラー: ${response.status}`);
  }

  const data = await response.json();

  const trackingInfo = data.output?.completeTrackResults?.[0]?.trackResults?.[0];

  if (!trackingInfo) {
    throw new Error('FedEx追跡情報が見つかりません');
  }

  const latestStatusDetail = trackingInfo.latestStatusDetail;
  const scanEvents = trackingInfo.scanEvents || [];

  // FedExステータスを標準ステータスに変換
  const statusMapping: Record<string, TrackingInfo['status']> = {
    'PU': 'IN_TRANSIT',
    'IT': 'IN_TRANSIT',
    'OD': 'OUT_FOR_DELIVERY',
    'DL': 'DELIVERED',
    'DE': 'EXCEPTION',
  };

  const status = statusMapping[latestStatusDetail?.code] || 'IN_TRANSIT';

  return {
    tracking_number: trackingNumber,
    status,
    current_location: latestStatusDetail?.scanLocation?.city,
    estimated_delivery_date: trackingInfo.estimatedDeliveryTimeWindow?.window?.ends,
    events: scanEvents.map((event: any) => ({
      timestamp: event.date,
      location: event.scanLocation?.city || 'Unknown',
      description: event.eventDescription || event.eventType,
    })),
  };
}
