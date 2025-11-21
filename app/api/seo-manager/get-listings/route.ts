/**
 * SEOマネージャー - リスティングデータ取得API
 * GET /api/seo-manager/get-listings
 *
 * eBayリスティングの健全性データを取得し、SEOスコアの計算に必要な情報を返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const marketplace = searchParams.get('marketplace') || 'ebay';
    const minDaysActive = parseInt(searchParams.get('minDaysActive') || '0');
    const limit = parseInt(searchParams.get('limit') || '1000');

    const supabase = await createClient();

    // marketplace_listings テーブルからデータを取得
    // このテーブルには、各マーケットプレイスへの出品情報が格納されている想定
    let query = supabase
      .from('marketplace_listings')
      .select(`
        id,
        sku,
        title,
        category,
        marketplace,
        status,
        listed_at,
        views_count,
        sales_count,
        price_usd,
        created_at,
        updated_at
      `)
      .eq('marketplace', marketplace)
      .order('views_count', { ascending: false });

    if (minDaysActive > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - minDaysActive);
      query = query.lte('listed_at', cutoffDate.toISOString());
    }

    query = query.limit(limit);

    const { data: listings, error, count } = await query;

    if (error) {
      console.error('リスティング取得エラー:', error);
      return NextResponse.json(
        { error: 'データベースエラー', details: error.message },
        { status: 500 }
      );
    }

    // データを変換し、daysActiveを計算
    const processedListings = (listings || []).map((listing: any) => {
      const listedAt = new Date(listing.listed_at || listing.created_at);
      const now = new Date();
      const daysActive = Math.floor((now.getTime() - listedAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: listing.id,
        title: listing.title || `商品 ${listing.sku}`,
        category: listing.category || '未分類',
        daysActive: daysActive,
        views: listing.views_count || 0,
        sales: listing.sales_count || 0,
      };
    });

    return NextResponse.json({
      success: true,
      listings: processedListings,
      total: count || processedListings.length,
      marketplace,
    });

  } catch (error: any) {
    console.error('リスティング取得API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラー', details: error.message },
      { status: 500 }
    );
  }
}
