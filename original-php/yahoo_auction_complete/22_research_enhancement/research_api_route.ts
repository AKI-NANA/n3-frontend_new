// app/api/research/ebay/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { researchClient } from '@/lib/supabase/research-client';

export async function POST(request: NextRequest) {
  try {
    const { keywords, categoryId, minPrice, maxPrice, condition, sortOrder, limit } = 
      await request.json();

    // バリデーション
    if (!keywords || keywords.trim().length === 0) {
      return NextResponse.json(
        { error: 'キーワードは必須です' },
        { status: 400 }
      );
    }

    // Desktop Crawler APIを呼び出し（環境変数から取得）
    const crawlerUrl = process.env.CRAWLER_API_URL || 'http://localhost:8000';
    
    let crawlerResponse;
    try {
      crawlerResponse = await fetch(`${crawlerUrl}/api/ebay/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CRAWLER_API_KEY || ''
        },
        body: JSON.stringify({
          keywords,
          category_id: categoryId,
          min_price: minPrice,
          max_price: maxPrice,
          condition,
          sort_order: sortOrder,
          limit: limit || 100
        }),
        signal: AbortSignal.timeout(30000) // 30秒タイムアウト
      });

      if (!crawlerResponse.ok) {
        throw new Error(`Desktop Crawler API error: ${crawlerResponse.status}`);
      }
    } catch (crawlerError) {
      // Desktop Crawlerが利用できない場合、Supabaseから既存データを検索
      console.warn('Desktop Crawler not available, using existing data:', crawlerError);
      
      const products = await researchClient.searchProducts({
        keywords,
        category: categoryId,
        minPrice,
        maxPrice,
        condition
      }, limit || 100);

      return NextResponse.json({
        success: true,
        count: products.length,
        products,
        source: 'cache',
        message: 'Desktop Crawlerが利用できないため、既存データを表示しています'
      });
    }

    // Supabaseから最新データ取得（Crawlerが保存済み）
    const products = await researchClient.searchProducts({
      keywords,
      category: categoryId,
      minPrice,
      maxPrice,
      condition,
      sortBy: 'search_date'
    }, limit || 100);

    // 検索履歴保存
    try {
      await researchClient.saveSearchHistory(
        'product',
        keywords,
        { categoryId, minPrice, maxPrice, condition, sortOrder },
        products.length
      );
    } catch (historyError) {
      console.error('Failed to save search history:', historyError);
      // 履歴保存失敗は無視
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
      source: 'live'
    });

  } catch (error) {
    console.error('eBay search error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET: 検索履歴取得
export async function GET(request: NextRequest) {
  try {
    const history = await researchClient.getSearchHistory(20);
    
    return NextResponse.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Get search history error:', error);
    return NextResponse.json(
      { error: 'Failed to get search history' },
      { status: 500 }
    );
  }
}
