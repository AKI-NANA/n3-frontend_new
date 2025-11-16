// /app/api/ebay/variation-categories/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { EbayCategory } from '@/types/product'; 

const supabase = createClient();

/**
 * GET /api/ebay/variation-categories
 * UIのプルダウン向け：DBにフラグが立っているバリエーション出品可能なカテゴリーのリストを返します。
 */
export async function GET() {
  try {
    // DBの supports_variations = true のレコードのみを選択
    const { data, error } = await supabase
      .from('ebay_categories')
      .select('category_id, name')
      .eq('supports_variations', true) 
      .order('name', { ascending: true }) as { data: Pick<EbayCategory, 'category_id' | 'name'>[] | null, error: any };

    if (error) throw error;

    if (!data) {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    return NextResponse.json({ 
        success: true, 
        data: data.map(item => ({ id: item.category_id, name: item.name })) 
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'eBayカテゴリーリストの取得に失敗しました。', details: error.message },
      { status: 500 }
    );
  }
}