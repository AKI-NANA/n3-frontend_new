import { createClient } from '@/lib/supabase/server'; // 修正: createClient に
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 修正: createClient を呼び出す
    const supabase = await createClient();

    const { data: products, error } = await supabase
      .from('products_master')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('データベース取得エラー:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('API実行エラー:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
