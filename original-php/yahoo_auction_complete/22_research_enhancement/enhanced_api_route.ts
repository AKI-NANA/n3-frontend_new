// app/api/research/ebay/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      keywords,
      categoryId,
      minPrice,
      maxPrice,
      condition,
      sortOrder = 'BestMatch',
      limit = 100,
      enableAIAnalysis = true  // 🔥 AI分析フラグ
    } = body;

    // バリデーション
    if (!keywords || keywords.trim().length === 0) {
      return NextResponse.json(
        { error: 'キーワードは必須です' },
        { status: 400 }
      );
    }

    console.log(`🔍 リサーチ開始: ${keywords} (AI分析: ${enableAIAnalysis})`);

    // Desktop Crawler完全統合システムを呼び出し
    const crawlerUrl = process.env.CRAWLER_API_URL || 'http://localhost:8000';
    const crawlerApiKey = process.env.CRAWLER_API_KEY;

    let crawlerResponse;
    try {
      crawlerResponse = await fetch(`${crawlerUrl}/api/research/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': crawlerApiKey || ''
        },
        body: JSON.stringify({
          keywords,
          category_id: categoryId,
          min_price: minPrice,
          max_price: maxPrice,
          condition,
          sort_order: sortOrder,
          limit,
          enable_ai_analysis: enableAIAnalysis
        }),
        signal: AbortSignal.timeout(120000) // 2分タイムアウト（AI分析込み）
      });

      if (!crawlerResponse.ok) {
        const errorText = await crawlerResponse.text();
        throw new Error(`Desktop Crawler API error: ${crawlerResponse.status} - ${errorText}`);
      }

      const crawlerData = await crawlerResponse.json();
      console.log(`✅ Desktop Crawler完了: ${crawlerData.summary?.total_products || 0}件`);

    } catch (crawlerError) {
      console.warn('⚠️  Desktop Crawler利用不可、既存データから検索:', crawlerError);
      
      // Desktop Crawler不在時はSupabaseから既存データを検索
      return await searchFromDatabase(keywords, {
        categoryId,
        minPrice,
        maxPrice,
        condition,
        limit
      });
    }

    // Supabaseから最新データ取得（Crawlerが保存済み + AI分析済み）
    const products = await getProductsWithAIAnalysis(keywords, {
      categoryId,
      minPrice,
      maxPrice,
      condition,
      limit
    });

    console.log(`📊 最終結果: ${products.length}件（AI分析: ${products.filter(p => p.ai_analysis).length}件）`);

    // 検索履歴保存
    try {
      await saveSearchHistory('product', keywords, {
        categoryId,
        minPrice,
        maxPrice,
        condition,
        sortOrder,
        enableAIAnalysis
      }, products.length);
    } catch (historyError) {
      console.error('検索履歴保存失敗:', historyError);
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
      source: 'live',
      ai_analyzed: products.filter(p => p.ai_analysis).length
    });

  } catch (error) {
    console.error('❌ 検索エラー:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Supabaseから製品+AI分析データを取得
async function getProductsWithAIAnalysis(
  keywords: string,
  filters: {
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    limit: number;
  }
) {
  let query = supabase
    .from('research_products_master')
    .select(`
      *,
      shopping_details:research_shopping_details(*),
      ai_analysis:research_ai_analysis(*)
    `)
    .ilike('title', `%${keywords}%`)
    .order('search_date', { ascending: false })
    .limit(filters.limit);

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.minPrice !== undefined) {
    query = query.gte('current_price', filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    query = query.lte('current_price', filters.maxPrice);
  }

  if (filters.condition) {
    query = query.eq('condition', filters.condition);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabaseクエリエラー:', error);
    throw error;
  }

  // データ整形
  return (data || []).map((item: any) => ({
    id: item.id,
    ebay_item_id: item.ebay_item_id,
    title: item.title,
    category_id: item.category_id,
    category_name: item.category_name,
    current_price: item.current_price,
    currency: item.currency,
    shipping_cost: item.shipping_cost,
    listing_type: item.listing_type,
    condition: item.condition,
    seller_username: item.seller_username,
    seller_country: item.seller_country,
    seller_feedback_score: item.seller_feedback_score,
    seller_positive_percentage: item.seller_positive_percentage,
    primary_image_url: item.primary_image_url,
    item_url: item.item_url,
    search_query: item.search_query,
    search_date: item.search_date,
    created_at: item.created_at,
    updated_at: item.updated_at,

    // Shopping詳細
    sold_quantity: item.shopping_details?.[0]?.quantity_sold || 0,
    watch_count: item.shopping_details?.[0]?.watch_count || 0,
    hit_count: item.shopping_details?.[0]?.hit_count || 0,
    description: item.shopping_details?.[0]?.description,
    picture_urls: item.shopping_details?.[0]?.picture_urls,
    item_specifics: item.shopping_details?.[0]?.item_specifics,

    // 🔥 AI分析結果
    ai_analysis: item.ai_analysis?.[0] ? {
      hs_code: item.ai_analysis[0].hs_code,
      hs_description: item.ai_analysis[0].hs_description,
      origin_country: item.ai_analysis[0].origin_country,
      origin_source: item.ai_analysis[0].origin_source,
      is_hazardous: item.ai_analysis[0].is_hazardous,
      hazard_type: item.ai_analysis[0].hazard_type,
      is_prohibited: item.ai_analysis[0].is_prohibited,
      air_shippable: item.ai_analysis[0].air_shippable,
      vero_risk: item.ai_analysis[0].vero_risk,
      vero_brand_matched: item.ai_analysis[0].vero_brand_matched,
      patent_troll_risk: item.ai_analysis[0].patent_troll_risk,
      // フリーテキスト分析（将来実装）
      sellingReasons: [],
      marketTrend: '',
      riskFactors: item.ai_analysis[0].is_hazardous ? ['危険物'] : [],
      recommendations: []
    } : undefined,

    // セラーミラー連携
    is_exported_to_seller_mirror: item.is_exported_to_seller_mirror,
    exported_at: item.exported_at
  }));
}

// 既存データから検索（フォールバック）
async function searchFromDatabase(
  keywords: string,
  filters: {
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    limit: number;
  }
) {
  const products = await getProductsWithAIAnalysis(keywords, filters);

  return NextResponse.json({
    success: true,
    count: products.length,
    products,
    source: 'cache',
    message: 'Desktop Crawler不在のため既存データを表示',
    ai_analyzed: products.filter(p => p.ai_analysis).length
  });
}

// 検索履歴保存
async function saveSearchHistory(
  searchType: string,
  query: string,
  params: any,
  resultsCount: number
) {
  await supabase.from('search_history').insert({
    search_type: searchType,
    search_query: query,
    search_params: params,
    results_count: resultsCount,
    created_at: new Date().toISOString()
  });
}
