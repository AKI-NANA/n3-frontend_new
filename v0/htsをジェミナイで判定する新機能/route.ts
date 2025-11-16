// /app/api/products/update/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // サーバーサイドクライアントのインポート

export async function POST(req: Request) {
  const supabase = createClient();

  try {
    const { id, updates } = await req.json();

    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing product ID or updates' }, { status: 400 });
    }

    // 新しい HTS 関連フィールドを updates オブジェクトから取得
    const { hts_code, origin_country, material, ...otherUpdates } = updates;

    // Supabaseへの更新データ
    const updateData = {
      ...otherUpdates,
      // データベースのカラム名に合わせてフィールドをマッピング
      hts_code: hts_code || null,
      origin_country: origin_country || null,
      material: material || null,
    };

    const { error } = await supabase
      .from('products_master')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: 'Failed to update product in database.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('API execution error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}