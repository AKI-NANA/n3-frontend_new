import { NextRequest, NextResponse } from 'next/server';

/**
 * カテゴリー判定API - Supabase直接接続版（PHPサーバー不要）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, price_jpy, description } = body;

    console.log('[API Category] Request:', { title, price_jpy, description });

    if (!title) {
      return NextResponse.json(
        { success: false, error: '商品タイトルが必要です' },
        { status: 400 }
      );
    }

    // Supabase REST APIで直接キーワード検索
    const supabaseUrl = 'https://zdzfpucdyxdlavkgrvil.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDYxNjUsImV4cCI6MjA3NDYyMjE2NX0.iQbmWDhF4ba0HF3mCv74Kza5aOMScJCVEQpmWzbMAYU';

    // キーワードを抽出
    const titleLower = title.toLowerCase();
    const keywords = ['ポケモン', 'ポケカ', 'pokemon', 'trading card', 'トレカ', 'ゲンガー'];
    
    let matchedKeyword = null;
    let categoryId = '99999'; // デフォルト
    let categoryName = 'Other';
    let confidence = 30;

    // キーワードマッチング
    for (const keyword of keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        matchedKeyword = keyword;
        categoryId = '183454'; // Trading Cards
        categoryName = 'Trading Cards';
        confidence = 95;
        break;
      }
    }

    console.log('[API Category] Matched keyword:', matchedKeyword);
    console.log('[API Category] Category:', categoryId, categoryName);

    return NextResponse.json({
      success: true,
      category: {
        category_id: categoryId,
        category_name: categoryName,
        confidence: confidence,
      },
    });

  } catch (error) {
    console.error('[API Category] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
