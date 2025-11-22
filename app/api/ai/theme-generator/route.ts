// ファイル: /app/api/ai/theme-generator/route.ts
import { NextResponse } from 'next/server';
import { analyzeAndGenerateTheme } from '@/lib/ai/gemini-client';
import { supabase } from '@/lib/supabase'; // N3のSupabaseクライアントをインポート
import { IdeaSource, N3InternalData } from '@/types/ai';

// 仮のスクレイピング関数（実際はPuppeteerが必要）
async function scrapeUrlContent(url: string): Promise<string> {
  // TODO: Puppeteer (lib/scraping-client.ts) を使用してURLの主要コンテンツを抽出するロジックを実装
  // 現時点では、Fetch APIでメタデータやテキストの一部を取得するのみに留めます
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return `URL: ${url} - Failed to fetch (Status: ${response.status})`;
    }

    const html = await response.text();
    // 簡易的なテキスト抽出（実際はPuppeteerでより精密な抽出が必要）
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000); // 最初の3000文字のみ

    return `URL: ${url}\nContent: ${textContent}`;
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    return `URL: ${url} - Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// 内部データ（N3の高利益商品）を取得する関数
async function getInternalProfitData(): Promise<N3InternalData> {
  // N3のproducts_masterテーブルから、利益率の高い上位10件を抽出
  const { data, error } = await supabase
    .from('products_master')
    .select('title, profit_margin')
    .not('profit_margin', 'is', null)
    .order('profit_margin', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching internal profit data:', error);
    return { high_profit_examples: [] };
  }

  return {
    high_profit_examples: (data || []).map(item => ({
      title: item.title,
      profit_margin: item.profit_margin || 0,
    })),
  };
}

export async function POST(request: Request) {
  try {
    // 1. 未処理のアイデアソースを取得
    const { data: sources, error: fetchError } = await supabase
      .from('idea_source_master')
      .select('*')
      .eq('status', 'new')
      .limit(5); // 一度に処理する数を制限

    if (fetchError) {
      console.error('Error fetching idea sources:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch idea sources' },
        { status: 500 }
      );
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new ideas to process.',
        updated_ideas: 0
      });
    }

    // 2. 内部データを取得
    const internalData = await getInternalProfitData();

    // 3. 各URLのコンテンツを取得
    const trendContents = await Promise.all(
      sources.map(source => scrapeUrlContent(source.url))
    );

    // 4. Geminiで分析
    const analysisResult = await analyzeAndGenerateTheme(
      trendContents,
      internalData
    );

    // 5. DBを更新
    const updates = sources.map((source: IdeaSource) => ({
      id: source.id,
      status: 'processed',
      assigned_theme: analysisResult.final_theme_jp,
      updated_at: new Date().toISOString(),
    }));

    const { error: updateError } = await supabase
      .from('idea_source_master')
      .upsert(updates);

    if (updateError) {
      console.error('Error updating idea sources:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update idea sources' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      theme_decision: analysisResult,
      updated_ideas: sources.length,
      processed_sources: sources.map(s => s.url),
    });

  } catch (error: any) {
    console.error('Theme Generator Process Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
