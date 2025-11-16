import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // html_templatesテーブルの状態を確認
    const { data: templates, error: templatesError } = await supabase
      .from('html_templates')
      .select('id, name, is_default_preview, is_active, created_at')
      .order('created_at', { ascending: false });

    if (templatesError) {
      console.error('❌ html_templates取得エラー:', templatesError);
    }

    // product_html_generatedテーブルのサンプル
    const { data: generatedHtml, error: generatedError } = await supabase
      .from('product_html_generated')
      .select('sku, marketplace, template_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (generatedError) {
      console.error('❌ product_html_generated取得エラー:', generatedError);
    }

    // デフォルトテンプレートの確認
    const { data: defaultTemplate, error: defaultError } = await supabase
      .from('html_templates')
      .select('*')
      .eq('is_default_preview', true)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        templates: {
          count: templates?.length || 0,
          items: templates || [],
          error: templatesError?.message || null,
        },
        generatedHtml: {
          count: generatedHtml?.length || 0,
          items: generatedHtml || [],
          error: generatedError?.message || null,
        },
        defaultTemplate: {
          exists: !!defaultTemplate,
          data: defaultTemplate,
          error: defaultError?.message || null,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ デバッグAPI実行エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
