/**
 * FBA納品プラン作成API
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
 * 6. ステータスを 'awaiting_inspection' → 'in_fba_shipment' に更新
 *
 * ⚠️ 注意: この実装はモックです。本番環境では以下を実装してください:
 * - Amazon SP-APIの認証（LWA: Login with Amazon）
 * - SP-APIエンドポイントへのリクエスト
 * - エラーハンドリングとリトライロジック
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

interface FbaPlanRequest {
  asin: string;
  quantity: number;
  target_country: 'US' | 'JP';
}

interface FbaPlanResponse {
  success: boolean;
  shipment_plan_id?: string;
  label_pdf_url?: string;
  destination_fc?: string; // Fulfillment Center
  error?: string;
}

/**
 * FBA納品プランを作成（モック実装）
 *
 * 本番実装では、Amazon SP-APIを使用します。
 * 参考: https://developer-docs.amazon.com/sp-api/docs/fulfillment-inbound-api-v0-reference
 */
async function createFbaShipmentPlan(
  request: FbaPlanRequest
): Promise<FbaPlanResponse> {
  try {
    // ⚠️ 本番実装例（コメントアウト）:
    /*
    const { SellingPartnerAPI } = require('amazon-sp-api');

    const spApi = new SellingPartnerAPI({
      region: request.target_country === 'US' ? 'na' : 'fe',
      refresh_token: process.env.SP_API_REFRESH_TOKEN,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.SP_API_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.SP_API_CLIENT_SECRET,
      },
    });

    // 1. 納品プランを作成
    const planResponse = await spApi.callAPI({
      operation: 'createInboundShipmentPlan',
      endpoint: 'fbaInbound',
      body: {
        ShipFromAddress: {
          Name: 'Your Warehouse',
          AddressLine1: '123 Main St',
          City: 'City',
          StateOrProvinceCode: 'CA',
          PostalCode: '12345',
          CountryCode: request.target_country,
        },
        InboundShipmentPlanRequestItems: [
          {
            ASIN: request.asin,
            Quantity: request.quantity,
            SellerSKU: `SKU-${request.asin}`,
          },
        ],
        LabelPrepPreference: 'SELLER_LABEL',
      },
    });

    const shipmentPlanId = planResponse.InboundShipmentPlans[0].ShipmentId;
    const destinationFC = planResponse.InboundShipmentPlans[0].DestinationFulfillmentCenterId;

    // 2. 納品ラベルを取得
    const labelResponse = await spApi.callAPI({
      operation: 'getLabels',
      endpoint: 'fbaInbound',
      query: {
        ShipmentId: shipmentPlanId,
        PageType: 'PackageLabel_Letter_2',
        NumberOfPackages: 1,
      },
    });

    const labelUrl = labelResponse.DownloadURL;

    return {
      success: true,
      shipment_plan_id: shipmentPlanId,
      label_pdf_url: labelUrl,
      destination_fc: destinationFC,
    };
    */

    // モック実装（開発用）
    console.log('🤖 [MOCK] FBA納品プラン作成中...');
    console.log(`   ASIN: ${request.asin}`);
    console.log(`   数量: ${request.quantity}`);
    console.log(`   対象国: ${request.target_country}`);

    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2秒待機

    const mockShipmentPlanId = `FBA${request.target_country}${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const mockLabelUrl = `https://mock-s3.amazonaws.com/fba-labels/${mockShipmentPlanId}.pdf`;
    const mockDestinationFC = request.target_country === 'US' ? 'PHX7' : 'NRT1';

    return {
      success: true,
      shipment_plan_id: mockShipmentPlanId,
      label_pdf_url: mockLabelUrl,
      destination_fc: mockDestinationFC,
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
    const { asin, quantity, target_country } = await request.json();

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
  return NextResponse.json({
    success: true,
    message: 'FBA plan creation API is active',
    endpoint: '/api/fba/create-plan',
    method: 'POST',
    note: 'This is a MOCK implementation. Production requires Amazon SP-API setup.',
    required_fields: {
      asin: 'string',
      quantity: 'number',
      target_country: '"US" | "JP"',
    },
  });
}
