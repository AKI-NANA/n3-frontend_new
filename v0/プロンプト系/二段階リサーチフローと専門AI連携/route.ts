// /app/api/research/finalize-sku/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { IntermediateResearchData } from '@/types/product';
import { runClaudeAnalysis } from '@/services/claude-analysis-service';
import { createClient } from '@/lib/supabase'; // 既存のSupabaseクライアント

const supabase = createClient();

/**
 * POST /api/research/finalize-sku
 * 中間データを最終確定し、Claude解析を経てSKUマスターへ登録する
 */
export async function POST(req: NextRequest) {
    try {
        const data: IntermediateResearchData = await req.json();
        
        // 1. Claudeによる専門解析の実行
        const claudeResult = await runClaudeAnalysis(data);

        // 2. SKUマスター（products_master）に格納する最終データの準備
        const finalSkuData = {
            // 基本情報
            name: data.ebay_title_draft || data.input_title,
            primary_image_url: data.input_url, // 画像URLを主画像として利用 (簡略化)
            
            // 市場情報 (中間データ)
            supplier_candidates_json: JSON.stringify(data.supplier_candidates),
            market_listing_count: data.market_listing_count,
            community_score_summary: data.community_score_summary,

            // Claude解析結果
            hts_code: claudeResult.hts_code,
            origin_country: claudeResult.origin_country,
            vero_risk_level: claudeResult.vero_risk_level,
            vero_safe_title: claudeResult.vero_safe_title,
        };

        // 3. SupabaseのSKUマスターテーブルへ新規挿入
        // 💡 SKU生成ロジックは別途必要ですが、ここでは自動生成されるものと仮定
        const { data: insertedProduct, error: dbError } = await supabase
            .from('products_master')
            .insert(finalSkuData)
            .select('*')
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({
            success: true,
            message: 'SKU data finalized and registered.',
            productId: insertedProduct.id,
            claudeResult: claudeResult
        }, { status: 200 });

    } catch (error: any) {
        console.error('Finalize SKU API Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'SKU登録と専門解析の実行に失敗しました。' },
            { status: 500 }
        );
    }
}