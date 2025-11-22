// ファイル: /app/api/research/cf-analyzer/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeCrowdfundingOpportunity } from '@/lib/ai/gemini-client';
import { fetchCrowdfundingProjects } from '@/lib/research/cf-scraper';
import { CrowdfundingProject, LPProposalJson, N3InternalData } from '@/types/ai';

// 仮の内部データ取得関数（S3のロジックを再利用）
async function getInternalProfitData(supabase: any): Promise<N3InternalData> {
    // N3のproducts_masterから、利益率の高い上位5件を抽出 (簡略化)
    // テーブルが存在しない場合は、amazon_productsを使用
    const { data: productsData } = await supabase
        .from('amazon_products')
        .select('title, profit_margin')
        .order('profit_margin', { ascending: false })
        .limit(5);

    return {
        high_profit_examples: productsData ? productsData.map((item: any) => ({
            title: item.title,
            profit_margin: item.profit_margin || 0
        })) : [],
    };
}

export async function POST(request: Request) {
    const supabase = createRouteHandlerClient({ cookies });
    // 分析対象のCFプラットフォームを指定（設定ファイルから取得を想定）
    const TARGET_PLATFORM = 'makuake';
    let projectsAnalyzed = 0;

    try {
        // 1. N3の内部データを取得
        const internalData = await getInternalProfitData(supabase);

        // 2. CFプロジェクトデータを取得
        const projects = await fetchCrowdfundingProjects(TARGET_PLATFORM);

        const results = [];

        for (const project of projects) {
            // 3. 既に分析済みのプロジェクトかチェック (URLで判断)
            const { count } = await supabase
                .from('cf_project_master')
                .select('id', { count: 'exact', head: true })
                .eq('project_url', project.project_url);

            if (count && count > 0) {
                results.push({ title: project.project_title, status: 'SKIPPED (Already Analyzed)' });
                continue;
            }

            // 4. LLMで評価とLP構成案を生成
            const proposal = await analyzeCrowdfundingOpportunity(project, internalData);

            // 5. DBに保存
            const { error: insertError } = await supabase
                .from('cf_project_master')
                .insert([{
                    platform: project.platform,
                    project_title: project.project_title,
                    project_url: project.project_url,
                    funding_amount_actual: project.funding_amount_actual,
                    backers_count: project.backers_count,
                    marketability_score: proposal.overall_score,
                    profitability_score: (proposal.overall_score * 0.8), // 簡易計算
                    competitiveness_score: (proposal.overall_score * 1.2), // 簡易計算
                    overall_evaluation: proposal.market_insight,
                    lp_proposal_json: proposal as unknown as LPProposalJson,
                    status: 'analyzed',
                }]);

            if (insertError) throw insertError;

            projectsAnalyzed++;
            results.push({ title: project.project_title, score: proposal.overall_score, status: 'ANALYZED' });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully analyzed ${projectsAnalyzed} CF projects from ${TARGET_PLATFORM}.`,
            results
        });

    } catch (error: any) {
        console.error('CF Analyzer Process Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
