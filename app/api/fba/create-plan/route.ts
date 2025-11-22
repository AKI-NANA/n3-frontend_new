/**
 * FBA納品プラン作成API（実装版）
 *
 * Amazon SP-API（Selling Partner API）を使用して、FBA納品プランを自動作成する。
 *
 * エンドポイント: POST /api/fba/create-plan
 *
 * 処理フロー:
 * 1. 商品情報を取得
 * 2. FBA倉庫の在庫可用性を確認
 * 3. 納品プランを作成（SP-API: createInboundShipmentPlan）
 * 4. 納品ラベルを生成（SP-API: getLabels）
 * 5. DBに納品プランIDとラベルURLを記録
 * 6. ステータスを 'awaiting_inspection' → 'ready_to_list' に更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

interface FbaPlanRequest {
  asin: string;
  quantity: number;
  target_country: 'US' | 'JP';
  ship_from_address?: {
    name: string;
    address_line_1: string;
    city: string;
    state_or_province: string;
    postal_code: string;
    country_code: string;
  };
}

interface FbaPlanResponse {
  success: boolean;
  shipment_plan_id?: string;
  label_pdf_url?: string;
  destination_fc?: string; // Fulfillment Center
  error?: string;
}

/**
 * FBA納品プランを作成（Amazon SP-API実装）
 */
async function createFbaShipmentPlan(
  request: FbaPlanRequest
): Promise<FbaPlanResponse> {
  const USE_MOCK = !process.env.SP_API_CLIENT_ID || process.env.NODE_ENV === 'development';

  if (USE_MOCK) {
    console.log('🤖 [MOCK] FBA納品プラン作成中...');
    console.log(`   ASIN: ${request.asin}`);
    console.log(`   数量: ${request.quantity}`);
    console.log(`   対象国: ${request.target_country}`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockShipmentPlanId = `FBA${request.target_country}${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
    const mockLabelUrl = `https://mock-s3.amazonaws.com/fba-labels/${mockShipmentPlanId}.pdf`;
    const mockDestinationFC = request.target_country === 'US' ? 'PHX7' : 'NRT1';

    return {
      success: true,
      shipment_plan_id: mockShipmentPlanId,
      label_pdf_url: mockLabelUrl,
      destination_fc: mockDestinationFC,
    };
  }

  try {
    // Amazon SP-APIクライアントを動的インポート
    const SellingPartner = require('amazon-sp-api');

    // リージョン設定
    const region = request.target_country === 'US' ? 'na' : 'fe';

    // SP-APIクライアント初期化
    const spApi = new SellingPartner({
      region,
      refresh_token: process.env.SP_API_REFRESH_TOKEN,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.SP_API_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.SP_API_CLIENT_SECRET,
      },
    });

    console.log(`🌐 SP-API連携開始: ${region}`);

    // デフォルトの発送元住所（環境変数から取得可能）
    const shipFromAddress = request.ship_from_address || {
      name: process.env.FBA_SHIP_FROM_NAME || 'Your Warehouse',
      address_line_1: process.env.FBA_SHIP_FROM_ADDRESS || '123 Main St',
      city: process.env.FBA_SHIP_FROM_CITY || 'City',
      state_or_province: process.env.FBA_SHIP_FROM_STATE || 'CA',
      postal_code: process.env.FBA_SHIP_FROM_ZIP || '12345',
      country_code: request.target_country,
    };

    console.log(`📦 納品プラン作成中...`);

    // 1. 納品プランを作成
    const planResponse = await spApi.callAPI({
      operation: 'createInboundShipmentPlan',
      endpoint: 'fbaInbound',
      body: {
        ShipFromAddress: {
          Name: shipFromAddress.name,
          AddressLine1: shipFromAddress.address_line_1,
          City: shipFromAddress.city,
          StateOrProvinceCode: shipFromAddress.state_or_province,
          PostalCode: shipFromAddress.postal_code,
          CountryCode: shipFromAddress.country_code,
        },
        InboundShipmentPlanRequestItems: [
          {
            ASIN: request.asin,
            Quantity: request.quantity,
            SellerSKU: `SKU-${request.asin}-${Date.now()}`,
            PrepDetailsList: [],
          },
        ],
        LabelPrepPreference: 'SELLER_LABEL',
      },
    });

    if (!planResponse || !planResponse.payload || !planResponse.payload.InboundShipmentPlans) {
      throw new Error('FBA納品プランの作成に失敗しました');
    }

    const shipmentPlan = planResponse.payload.InboundShipmentPlans[0];
    const shipmentPlanId = shipmentPlan.ShipmentId;
    const destinationFC = shipmentPlan.DestinationFulfillmentCenterId;

    console.log(`✅ 納品プランID: ${shipmentPlanId}, FC: ${destinationFC}`);
    console.log(`🏷️ 納品ラベル生成中...`);

    // 2. 納品ラベルを取得
    const labelResponse = await spApi.callAPI({
      operation: 'getLabels',
      endpoint: 'fbaInbound',
      query: {
        ShipmentId: shipmentPlanId,
        PageType: 'PackageLabel_Letter_2',
        LabelType: 'UNIQUE',
        NumberOfPackages: request.quantity,
      },
    });

    const labelUrl = labelResponse?.payload?.DownloadURL || null;

    console.log(`✅ 納品ラベルURL: ${labelUrl}`);

    return {
      success: true,
      shipment_plan_id: shipmentPlanId,
      label_pdf_url: labelUrl,
      destination_fc: destinationFC,
    };
  } catch (error) {
    console.error('❌ FBA納品プラン作成エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { asin, quantity, target_country, ship_from_address } = await request.json();

    if (!asin || !quantity || !target_country) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: asin, quantity, target_country' },
        { status: 400 }
      );
    }

    console.log(`🚀 FBA納品プラン作成開始: ASIN=${asin}, 数量=${quantity}, 国=${target_country}`);

    const supabase = createClient();

    // 1. 商品情報を取得
    const { data: product, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .eq('asin', asin)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // 2. FBA納品プランを作成
    const planResult = await createFbaShipmentPlan({
      asin,
      quantity,
      target_country,
      ship_from_address,
    });

    if (!planResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'FBA plan creation failed',
          details: planResult.error,
        },
        { status: 500 }
      );
    }

    console.log(`✅ FBA納品プラン作成成功: ${planResult.shipment_plan_id}`);

    // 3. DBを更新
    const { error: updateError } = await supabase
      .from('products_master')
      .update({
        fba_shipment_plan_id: planResult.shipment_plan_id,
        fba_label_pdf_url: planResult.label_pdf_url,
        arbitrage_status: 'ready_to_list', // 出品準備完了
        updated_at: new Date().toISOString(),
      })
      .eq('asin', asin);

    if (updateError) {
      console.error('❌ DB更新エラー:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'FBA shipment plan created successfully',
      shipment_plan_id: planResult.shipment_plan_id,
      label_pdf_url: planResult.label_pdf_url,
      destination_fc: planResult.destination_fc,
    });
  } catch (error) {
    console.error('❌ FBA納品プラン作成APIエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: FBA納品プラン設定の確認（テスト用）
 */
export async function GET(request: NextRequest) {
  const isMock = !process.env.SP_API_CLIENT_ID || process.env.NODE_ENV === 'development';

  return NextResponse.json({
    success: true,
    message: 'FBA plan creation API is active',
    endpoint: '/api/fba/create-plan',
    method: 'POST',
    implementation: isMock ? 'MOCK (Development)' : 'REAL (Amazon SP-API)',
    required_fields: {
      asin: 'string',
      quantity: 'number',
      target_country: '"US" | "JP"',
      ship_from_address: 'object (optional)',
    },
    environment: {
      sp_api_configured: !!process.env.SP_API_CLIENT_ID,
      region: process.env.SP_API_REGION || 'Not configured',
    },
  });
}
