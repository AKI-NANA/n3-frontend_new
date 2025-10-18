import { NextRequest, NextResponse } from 'next/server';

/**
 * 手数料取得API - ユーザー設定対応版
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category_id, price_usd, monthly_sales_usd = 0 } = body;

    if (!category_id) {
      return NextResponse.json(
        { success: false, error: 'カテゴリーIDが必要です' },
        { status: 400 }
      );
    }

    // Supabase REST APIで手数料取得
    const supabaseUrl = 'https://zdzfpucdyxdlavkgrvil.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDYxNjUsImV4cCI6MjA3NDYyMjE2NX0.iQbmWDhF4ba0HF3mCv74Kza5aOMScJCVEQpmWzbMAYU';

    const response = await fetch(
      `${supabaseUrl}/rest/v1/ebay_category_fees?category_id=eq.${category_id}`,
      {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
      }
    );

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'このカテゴリーの手数料データが見つかりません',
        category_id,
      });
    }

    const feeData = data[0];
    const priceUsd = price_usd || 0;

    // 🔥 月間売上による手数料レート調整
    let finalValueFeePercent = parseFloat(feeData.final_value_fee_percent);
    
    // 月間売上が$7,500以上の場合は割引レート適用
    if (monthly_sales_usd >= 7500) {
      // Trading Cardsの場合: 13.25% → 12.35%
      if (category_id === '183454') {
        finalValueFeePercent = 12.35;
      }
    }

    const finalValueFee = priceUsd * (finalValueFeePercent / 100);

    // 🔥 Payoneer手数料: 2%固定
    const payoneerFeePercent = 2.0;
    const payoneerFee = priceUsd * (payoneerFeePercent / 100);

    // 🔥 International fee: 1.65%（海外バイヤー向け）
    const internationalFeePercent = 1.65;
    const internationalFee = priceUsd * (internationalFeePercent / 100);

    const insertionFee = parseFloat(feeData.insertion_fee || 0);
    
    // 総手数料 = Final Value Fee + Payoneer + International + Insertion
    const totalFee = finalValueFee + payoneerFee + internationalFee + insertionFee;

    return NextResponse.json({
      success: true,
      fee: {
        category_id,
        final_value_fee_percent: finalValueFeePercent,
        final_value_fee_amount: parseFloat(finalValueFee.toFixed(2)),
        insertion_fee: insertionFee,
        payoneer_fee_percent: payoneerFeePercent,
        payoneer_fee: parseFloat(payoneerFee.toFixed(2)),
        international_fee_percent: internationalFeePercent,
        international_fee: parseFloat(internationalFee.toFixed(2)),
        total_fee: parseFloat(totalFee.toFixed(2)),
        price_usd: priceUsd,
        monthly_sales_tier: monthly_sales_usd >= 7500 ? 'premium' : 'standard',
      },
    });

  } catch (error) {
    console.error('[API Fee] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
