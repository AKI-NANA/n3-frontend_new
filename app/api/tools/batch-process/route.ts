/**
 * バッチ処理API
 *
 * 選択された商品に対して全てのツールAPIを一括実行
 * - カテゴリ分析
 * - 送料計算
 * - 利益計算
 * - SellerMirror分析
 * - HTML生成
 * - フィルターチェック
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BatchProcessResult {
  productId: number;
  title: string;
  status: 'success' | 'partial' | 'failed';
  results: {
    category?: { success: boolean; error?: string; data?: any };
    shipping?: { success: boolean; error?: string; data?: any };
    profit?: { success: boolean; error?: string; data?: any };
    sellermirror?: { success: boolean; error?: string; data?: any };
    html?: { success: boolean; error?: string; data?: any };
    filter?: { success: boolean; error?: string; data?: any };
  };
  errors: string[];
}

/**
 * カテゴリ分析を実行
 */
async function processCategoryAnalyze(productId: number): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tools/category-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [productId] })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Category analyze failed' };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 送料計算を実行
 */
async function processShippingCalculate(productId: number): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tools/shipping-calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [productId] })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Shipping calculate failed' };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 利益計算を実行
 */
async function processProfitCalculate(productId: number): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tools/profit-calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [productId] })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Profit calculate failed' };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * SellerMirror分析を実行
 */
async function processSellerMirrorAnalyze(productId: number): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tools/sellermirror-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [productId] })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'SellerMirror analyze failed' };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * HTML生成を実行
 */
async function processHtmlGenerate(productId: number): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tools/html-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [productId] })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'HTML generate failed' };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * フィルターチェックを実行
 */
async function processFilterCheck(productId: number): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // フィルター設定を取得
    const { data: filters, error: filterError } = await supabase
      .from('filters')
      .select('*')
      .eq('is_active', true);

    if (filterError) {
      return { success: false, error: filterError.message };
    }

    // 商品情報を取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return { success: false, error: 'Product not found' };
    }

    // フィルターチェック
    const failedFilters: string[] = [];

    for (const filter of filters || []) {
      // フィルタータイプに応じた判定
      let passed = true;

      switch (filter.filter_type) {
        case 'price':
          if (filter.min_value && product.price_usd < filter.min_value) passed = false;
          if (filter.max_value && product.price_usd > filter.max_value) passed = false;
          break;

        case 'profit_margin':
          if (filter.min_value && (product.profit_margin || 0) < filter.min_value) passed = false;
          break;

        case 'category':
          if (filter.value && product.ebay_api_data?.category_name) {
            if (!product.ebay_api_data.category_name.includes(filter.value)) passed = false;
          }
          break;

        case 'keyword_blacklist':
          if (filter.value && product.title) {
            const keywords = filter.value.split(',').map((k: string) => k.trim());
            if (keywords.some((keyword: string) => product.title.toLowerCase().includes(keyword.toLowerCase()))) {
              passed = false;
            }
          }
          break;
      }

      if (!passed) {
        failedFilters.push(filter.name || filter.filter_type);
      }
    }

    // フィルター結果を保存
    const filterStatus = failedFilters.length > 0 ? 'rejected' : 'approved';
    const { error: updateError } = await supabase
      .from('products')
      .update({
        filter_status: filterStatus,
        filter_rejected_reasons: failedFilters.length > 0 ? failedFilters : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      data: {
        status: filterStatus,
        failedFilters: failedFilters,
        filterCount: filters?.length || 0
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 1商品の全処理を実行
 */
async function processProduct(productId: number, title: string): Promise<BatchProcessResult> {
  console.log(`[Batch] Processing product ${productId}: ${title}`);

  const results: BatchProcessResult['results'] = {};
  const errors: string[] = [];

  // カテゴリ分析
  console.log(`[Batch] - Category analyze...`);
  results.category = await processCategoryAnalyze(productId);
  if (!results.category.success) {
    errors.push(`Category: ${results.category.error}`);
  }

  // 送料計算
  console.log(`[Batch] - Shipping calculate...`);
  results.shipping = await processShippingCalculate(productId);
  if (!results.shipping.success) {
    errors.push(`Shipping: ${results.shipping.error}`);
  }

  // 利益計算
  console.log(`[Batch] - Profit calculate...`);
  results.profit = await processProfitCalculate(productId);
  if (!results.profit.success) {
    errors.push(`Profit: ${results.profit.error}`);
  }

  // SellerMirror分析
  console.log(`[Batch] - SellerMirror analyze...`);
  results.sellermirror = await processSellerMirrorAnalyze(productId);
  if (!results.sellermirror.success) {
    errors.push(`SellerMirror: ${results.sellermirror.error}`);
  }

  // HTML生成
  console.log(`[Batch] - HTML generate...`);
  results.html = await processHtmlGenerate(productId);
  if (!results.html.success) {
    errors.push(`HTML: ${results.html.error}`);
  }

  // フィルターチェック
  console.log(`[Batch] - Filter check...`);
  results.filter = await processFilterCheck(productId);
  if (!results.filter.success) {
    errors.push(`Filter: ${results.filter.error}`);
  }

  // ステータス判定
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalCount = Object.keys(results).length;

  let status: 'success' | 'partial' | 'failed' = 'success';
  if (successCount === 0) {
    status = 'failed';
  } else if (successCount < totalCount) {
    status = 'partial';
  }

  console.log(`[Batch] Product ${productId} completed: ${status} (${successCount}/${totalCount})`);

  return {
    productId,
    title,
    status,
    results,
    errors
  };
}

/**
 * バッチ処理メインエンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds array is required' },
        { status: 400 }
      );
    }

    console.log(`[Batch] Starting batch process for ${productIds.length} products`);

    // 商品情報を取得
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, title')
      .in('id', productIds);

    if (fetchError || !products) {
      return NextResponse.json(
        { error: 'Failed to fetch products: ' + (fetchError?.message || 'Unknown error') },
        { status: 500 }
      );
    }

    // 各商品を順次処理
    const results: BatchProcessResult[] = [];

    for (const product of products) {
      const result = await processProduct(product.id, product.title);
      results.push(result);
    }

    // 集計
    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      partial: results.filter(r => r.status === 'partial').length,
      failed: results.filter(r => r.status === 'failed').length
    };

    console.log(`[Batch] Completed: ${summary.success} success, ${summary.partial} partial, ${summary.failed} failed`);

    return NextResponse.json({
      success: true,
      summary,
      results
    });

  } catch (error: any) {
    console.error('[Batch] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
