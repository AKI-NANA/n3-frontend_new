// app/api/kobutsu/ledger/route.ts
// 古物台帳データ取得API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 古物台帳データ取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const supplierName = searchParams.get('supplierName');
    const supplierType = searchParams.get('supplierType');

    const supabase = await createClient();

    let query = supabase
      .from('kobutsu_ledger')
      .select('*')
      .order('acquisition_date', { ascending: false });

    // フィルター適用
    if (dateFrom) {
      query = query.gte('acquisition_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('acquisition_date', dateTo);
    }
    if (supplierName) {
      query = query.ilike('supplier_name', `%${supplierName}%`);
    }
    if (supplierType && supplierType !== 'all') {
      query = query.eq('supplier_type', supplierType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Ledger fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '古物台帳データの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
