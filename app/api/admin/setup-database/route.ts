import { createClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { action } = await request.json();
  
  // サーバーサイドのSupabaseクライアントを使用
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const { createClient: createServerClient } = await import('@supabase/supabase-js');
  const supabase = createServerClient(supabaseUrl, supabaseServiceKey);

  try {
    if (action === 'insert_samples') {
      // まず既存のproductsテーブル構造を確認
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'products');

      console.log('Existing columns:', columns);

      // サンプルデータ（data_sourceとtool_processedなしバージョン）
      const samples = [
        {
          sku: 'PKM-PIKA-VMAX-001',
          title: 'ポケモンカード ピカチュウ V-MAX',
          english_title: 'Pokemon Card Pikachu V-MAX PSA 10',
          item_id: 'PKM-001',
          brand: 'Pokemon Company',
          manufacturer: 'Pokemon',
          condition: 'Used',
          stock_quantity: 1,
          acquired_price_jpy: 12000,
          price_jpy: 12000,
          price_usd: 80.00,
          ddp_price_usd: 89.99,
          ddu_price_usd: 84.99,
          weight_g: 50,
          length_cm: 10.0,
          width_cm: 7.0,
          height_cm: 0.3,
          category_name: 'Trading Cards > Pokemon',
          image_urls: ['https://placehold.co/400x400/4CAF50/ffffff?text=Pikachu+VMAX'],
          image_count: 1,
          html_applied: false,
          ready_to_list: false
        },
        {
          sku: 'NSW-OLED-WHT-001',
          title: 'Nintendo Switch 有機ELモデル ホワイト',
          english_title: 'Nintendo Switch OLED Model White Console',
          item_id: 'NSW-001',
          brand: 'Nintendo',
          manufacturer: 'Nintendo',
          condition: 'New',
          stock_quantity: 3,
          acquired_price_jpy: 38000,
          price_jpy: 38000,
          price_usd: 253.33,
          ddp_price_usd: 279.99,
          ddu_price_usd: 269.99,
          weight_g: 800,
          length_cm: 24.0,
          width_cm: 18.0,
          height_cm: 6.0,
          category_name: 'Video Games > Consoles > Nintendo Switch',
          image_urls: ['https://placehold.co/400x400/E91E63/ffffff?text=Switch+OLED'],
          image_count: 1,
          html_applied: true,
          ready_to_list: true
        },
        {
          sku: 'YGO-BEWD-INIT-001',
          title: '遊戯王カード ブルーアイズホワイトドラゴン 初期版',
          english_title: 'Yu-Gi-Oh! Blue-Eyes White Dragon 1st Edition',
          item_id: 'YGO-001',
          brand: 'Konami',
          manufacturer: 'Konami',
          condition: 'Used',
          stock_quantity: 1,
          acquired_price_jpy: 150000,
          price_jpy: 150000,
          price_usd: 1000.00,
          ddp_price_usd: 1199.99,
          ddu_price_usd: 1149.99,
          weight_g: 20,
          length_cm: 8.5,
          width_cm: 6.0,
          height_cm: 0.2,
          category_name: 'Trading Cards > Yu-Gi-Oh',
          image_urls: ['https://placehold.co/400x400/2196F3/ffffff?text=Blue+Eyes'],
          image_count: 1,
          html_applied: true,
          ready_to_list: false
        },
        {
          sku: 'OP-LUFFY-G5-001',
          title: 'ワンピース フィギュア ルフィ ギア5',
          english_title: 'One Piece Figure Luffy Gear 5',
          item_id: 'OP-001',
          brand: 'Bandai',
          manufacturer: 'Bandai',
          condition: 'New',
          stock_quantity: 2,
          acquired_price_jpy: 8500,
          price_jpy: 8500,
          price_usd: 56.67,
          ddp_price_usd: 69.99,
          ddu_price_usd: 64.99,
          weight_g: 350,
          length_cm: 25.0,
          width_cm: 18.0,
          height_cm: 12.0,
          category_name: 'Collectibles > Anime > One Piece',
          image_urls: ['https://placehold.co/400x400/FF5722/ffffff?text=Luffy+G5'],
          image_count: 1,
          html_applied: false,
          ready_to_list: false
        },
        {
          sku: 'KNY-MANGA-SET-001',
          title: '鬼滅の刃 全巻セット 1-23巻',
          english_title: 'Demon Slayer Kimetsu no Yaiba Complete Set Vol 1-23',
          item_id: 'KNY-001',
          brand: 'Shueisha',
          manufacturer: 'Shueisha',
          condition: 'Used',
          stock_quantity: 1,
          acquired_price_jpy: 15000,
          price_jpy: 15000,
          price_usd: 100.00,
          ddp_price_usd: 119.99,
          ddu_price_usd: 114.99,
          weight_g: 2500,
          length_cm: 30.0,
          width_cm: 22.0,
          height_cm: 18.0,
          category_name: 'Books > Manga > Demon Slayer',
          image_urls: ['https://placehold.co/400x400/9C27B0/ffffff?text=Demon+Slayer'],
          image_count: 1,
          html_applied: false,
          ready_to_list: false
        }
      ];

      const { data, error } = await supabase
        .from('products_master')
        .upsert(samples, { onConflict: 'sku' })
        .select();

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        message: `${data?.length || 0}件のサンプルデータを追加・更新しました（Price, English Titleなど全フィールド入り）`,
        data 
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: '不明なアクション' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('Database setup error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'エラーが発生しました',
      details: error
    }, { status: 500 });
  }
}
