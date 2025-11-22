// app/api/ai/persona-content/route.ts
// ペルソナ駆動の記事自動生成API - フェーズI S4実装

import { NextResponse } from 'next/server';
import { generatePersonaContent } from '@/lib/ai/gemini-client';
import { createClient } from '@/lib/supabase/client';
import { ContentInput, N3InternalData } from '@/types/ai';

/**
 * N3の内部データを取得する関数
 * products_masterから利益率の高い商品TOP10を取得
 */
async function getInternalProfitData(supabase: any): Promise<N3InternalData> {
  try {
    const { data, error } = await supabase
      .from('products_master')
      .select('title, profit_margin')
      .order('profit_margin', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching internal profit data:', error);
      return { high_profit_examples: [] };
    }

    return {
      high_profit_examples: data
        ? data.map((item: any) => ({
            title: item.title || 'Unknown Product',
            profit_margin: item.profit_margin || 0,
          }))
        : [],
    };
  } catch (error) {
    console.error('Exception in getInternalProfitData:', error);
    return { high_profit_examples: [] };
  }
}

/**
 * POST /api/ai/persona-content
 * ペルソナ駆動の記事本文を自動生成
 *
 * リクエストボディ:
 * {
 *   "idea_id": number,      // idea_source_master のID
 *   "site_id": number       // site_config_master のID
 * }
 *
 * レスポンス:
 * {
 *   "success": boolean,
 *   "content_metadata": {
 *     "theme": string,
 *     "persona": string
 *   },
 *   "generated_content": {
 *     "article_markdown": string,
 *     "image_prompts": string[],
 *     "final_affiliate_links": string[]
 *   }
 * }
 */
export async function POST(request: Request) {
  const supabase = createClient();

  try {
    // リクエストボディのパース
    const body = await request.json();
    const { idea_id, site_id } = body;

    // バリデーション
    if (!idea_id || !site_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'idea_id and site_id are required.',
        },
        { status: 400 }
      );
    }

    console.log('📝 Persona-driven content generation started:', {
      idea_id,
      site_id,
    });

    // 1. 決定済みテーマとアフィリエイト候補を取得
    const { data: idea, error: ideaError } = await supabase
      .from('idea_source_master')
      .select('assigned_theme, assigned_affiliate_links')
      .eq('id', idea_id)
      .single();

    if (ideaError || !idea) {
      console.error('Error fetching idea:', ideaError);
      return NextResponse.json(
        {
          success: false,
          error: 'Idea not found. Please ensure the idea_id exists in idea_source_master.',
        },
        { status: 404 }
      );
    }

    if (!idea.assigned_theme) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Theme not assigned. Please run S3 (Theme Generator) first to assign a theme to this idea.',
        },
        { status: 400 }
      );
    }

    // 2. ペルソナのstyle_promptを取得
    const { data: site, error: siteError } = await supabase
      .from('site_config_master')
      .select('persona_master(id, name, style_prompt)')
      .eq('id', site_id)
      .single();

    if (siteError || !site) {
      console.error('Error fetching site config:', siteError);
      return NextResponse.json(
        {
          success: false,
          error: 'Site configuration not found.',
        },
        { status: 404 }
      );
    }

    const personaData = site.persona_master as any;
    const style_prompt = personaData?.style_prompt;

    if (!style_prompt) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Persona style prompt not found. Please ensure the site has a valid persona assigned.',
        },
        { status: 400 }
      );
    }

    console.log('✅ Persona loaded:', personaData?.name || 'Unknown Persona');

    // 3. N3の内部データ（高利益商品）を取得
    const internalData = await getInternalProfitData(supabase);
    console.log(
      '✅ Internal data loaded:',
      internalData.high_profit_examples.length,
      'products'
    );

    // 4. LLMへの入力データ作成
    const input: ContentInput = {
      theme: idea.assigned_theme,
      style_prompt: style_prompt,
      internal_data: internalData,
      affiliate_candidates: idea.assigned_affiliate_links || [],
    };

    // 5. Geminiでコンテンツを生成
    console.log('🤖 Generating content with Gemini...');
    const generatedContent = await generatePersonaContent(input);

    console.log('✅ Content generation completed');
    console.log(
      '   - Article length:',
      generatedContent.article_markdown.length,
      'characters'
    );
    console.log(
      '   - Image prompts:',
      generatedContent.image_prompts.length
    );
    console.log(
      '   - Affiliate links:',
      generatedContent.final_affiliate_links.length
    );

    // 6. レスポンスを返す
    // TODO: 次のステップ（画像生成と投稿）のためにコンテンツをDBに一時保存
    // 例: generated_content_queue テーブルに保存

    return NextResponse.json({
      success: true,
      content_metadata: {
        theme: idea.assigned_theme,
        persona: personaData?.name || 'Unknown Persona',
      },
      generated_content: generatedContent,
    });
  } catch (error: any) {
    console.error('❌ Content Generation Process Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred.',
        details:
          process.env.NODE_ENV === 'development'
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}
