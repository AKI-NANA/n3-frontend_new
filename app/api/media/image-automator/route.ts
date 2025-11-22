// ファイル: /app/api/media/image-automator/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { optimizeImagePrompt } from '@/lib/ai/gemini-client';
import { generateImageFromPrompt, uploadImageToCDN } from '@/lib/media/image-generator';

// 画像生成が必要なレコードをDBから取得する関数（cf_project_masterからLP構成案のプロンプトを抽出）
async function fetchProjectsNeedingImages(supabase: any) {
  // cf_project_master の lp_proposal_json に image_prompt が存在するものを抽出
  const { data } = await supabase
    .from('cf_project_master')
    .select(`
      id,
      project_title,
      lp_proposal_json
    `)
    .eq('status', 'analyzed')
    .is('image_generated', null) // 未生成のもののみ
    .limit(5);

  // 抽出ロジックの簡略化と、必要な情報の整理
  const imageRequests = [];
  if (data) {
    for (const item of data) {
      if (item.lp_proposal_json && item.lp_proposal_json.lp_structure) {
        for (const section of item.lp_proposal_json.lp_structure) {
          if (section.image_prompt) {
            // セクションごとの画像プロンプトを抽出
            imageRequests.push({
              id: item.id,
              title: item.project_title,
              base_prompt: section.image_prompt,
              section_title: section.section_title
            });
          }
        }
      }
    }
  }
  return imageRequests;
}

export async function POST(request: Request) {
  const supabase = createClient();
  let totalImagesGenerated = 0;

  try {
    // 1. 画像が必要な CF プロジェクトを取得
    const imageRequests = await fetchProjectsNeedingImages(supabase);
    const results = [];

    for (const req of imageRequests) {

      // 2. LLMでプロンプトを最適化
      const optimizedPromptData = await optimizeImagePrompt(
        req.base_prompt,
        `CFプロジェクトタイトル: ${req.title}, ターゲットセクション: ${req.section_title}`
      );

      // 3. 外部APIで画像を生成
      const { temp_url, model, cost } = await generateImageFromPrompt(optimizedPromptData.optimized_prompt);

      // 4. 画像をCDNにアップロード
      const finalImageUrl = await uploadImageToCDN(temp_url);

      // 5. ログを DB に保存
      const { error: logError } = await supabase
        .from('image_generation_log')
        .insert([{
          source_cf_project_id: req.id,
          prompt_original: req.base_prompt,
          prompt_optimized: optimizedPromptData.optimized_prompt,
          generated_image_url: finalImageUrl,
          generation_model: model,
          cost_usd: cost,
          status: 'success',
        }]);

      if (logError) throw logError;

      // 6. cf_project_master にも画像URLを紐づける（簡略化：ここではログの記録のみ）
      // 実際は、特定のフィールド (例: primary_lp_image_url) を更新

      totalImagesGenerated++;
      results.push({ title: req.title, section: req.section_title, url: finalImageUrl });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated and processed ${totalImagesGenerated} images.`,
      results
    });

  } catch (error: any) {
    console.error('Image Automator Core Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
