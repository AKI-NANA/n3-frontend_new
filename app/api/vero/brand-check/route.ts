/**
 * VEROリスク判定API
 * GET /api/vero/brand-check?brand=Nike
 *
 * eBay VeRO (Verified Rights Owner) プログラムに登録されているブランドかチェック
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * VERO登録ブランドのリスクレベル
 */
export type VeroRiskLevel = 'high' | 'medium' | 'low' | 'safe';

/**
 * VEROチェック結果
 */
export interface VeroCheckResult {
  brand: string;
  is_vero: boolean;
  risk_level: VeroRiskLevel;
  warning_message?: string;
  recommended_action?: string;
  last_updated?: string;
}

/**
 * 高リスクVEROブランドリスト
 * 実際の運用では、Supabaseテーブルやサードパーティーデータベースから取得
 */
const HIGH_RISK_VERO_BRANDS = [
  'Nike',
  'Adidas',
  'Apple',
  'Louis Vuitton',
  'Gucci',
  'Chanel',
  'Rolex',
  'Disney',
  'LEGO',
  'Supreme',
  'The North Face',
  'Coach',
  'Michael Kors',
  'Ray-Ban',
  'Oakley',
  'UGG',
  'Beats by Dre',
  'Tiffany & Co.',
  'Christian Dior',
  'Prada',
];

const MEDIUM_RISK_VERO_BRANDS = [
  'Sony',
  'Samsung',
  'Canon',
  'Nikon',
  'Bose',
  'JBL',
  'Under Armour',
  'Puma',
  'Reebok',
  'New Balance',
  'Vans',
  'Converse',
  'Timberland',
  'Columbia',
  'Patagonia',
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brand = searchParams.get('brand');

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brand name is required',
        },
        { status: 400 }
      );
    }

    // ブランド名を正規化（大文字小文字を無視）
    const normalizedBrand = brand.trim();
    const brandLower = normalizedBrand.toLowerCase();

    // VEROデータベースをチェック（優先順位: DB → ハードコードリスト）
    const dbResult = await checkVeroDatabase(normalizedBrand);
    if (dbResult) {
      return NextResponse.json(dbResult);
    }

    // ハードコードリストでチェック
    const isHighRisk = HIGH_RISK_VERO_BRANDS.some(
      (b) => b.toLowerCase() === brandLower
    );

    if (isHighRisk) {
      return NextResponse.json({
        brand: normalizedBrand,
        is_vero: true,
        risk_level: 'high',
        warning_message: `⚠️ ${normalizedBrand}はeBay VeROプログラムに登録されています。無許可の出品は削除される可能性が高いです。`,
        recommended_action:
          '正規の仕入れルートからの購入証明書を用意するか、出品を避けてください。',
        last_updated: new Date().toISOString(),
      } as VeroCheckResult);
    }

    const isMediumRisk = MEDIUM_RISK_VERO_BRANDS.some(
      (b) => b.toLowerCase() === brandLower
    );

    if (isMediumRisk) {
      return NextResponse.json({
        brand: normalizedBrand,
        is_vero: true,
        risk_level: 'medium',
        warning_message: `⚠️ ${normalizedBrand}はVeRO監視対象ブランドです。正規品の証明が求められる場合があります。`,
        recommended_action: '正規仕入れルートからの購入を推奨します。',
        last_updated: new Date().toISOString(),
      } as VeroCheckResult);
    }

    // VEROリストに該当なし
    return NextResponse.json({
      brand: normalizedBrand,
      is_vero: false,
      risk_level: 'safe',
      last_updated: new Date().toISOString(),
    } as VeroCheckResult);
  } catch (error) {
    console.error('❌ VERO check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Supabaseデータベースからブランド情報を取得
 */
async function checkVeroDatabase(
  brand: string
): Promise<VeroCheckResult | null> {
  try {
    const supabase = await createClient();

    // vero_brands テーブルから検索
    const { data, error } = await supabase
      .from('vero_brands')
      .select('*')
      .ilike('brand_name', brand)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      brand: data.brand_name,
      is_vero: data.is_vero,
      risk_level: data.risk_level as VeroRiskLevel,
      warning_message: data.warning_message,
      recommended_action: data.recommended_action,
      last_updated: data.updated_at,
    };
  } catch (error) {
    console.error('❌ Database query error:', error);
    return null;
  }
}
