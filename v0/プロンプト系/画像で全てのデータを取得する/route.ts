// /app/api/gemini/run-prompt/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateResearchPrompt } from '@/lib/gemini-api';
import { ResearchPromptType } from '@/types/product';
// import { runClaudeMcp } from '@/lib/claude-mcp-api'; // HTS専用の外部APIクライアントを想定
// import { runGeminiVision } from '@/lib/gemini-vision-api'; // 画像処理APIクライアントを想定

/**
 * POST /api/gemini/run-prompt
 * 選択されたプロンプトタイプに基づき、AIを実行する
 */
export async function POST(req: NextRequest) {
    try {
        const { productId, type, productData } = await req.json() as {
            productId: number;
            type: ResearchPromptType;
            productData: any; // 現在の全商品データ
        };
        const promptType: ResearchPromptType = type;

        // 1. プロンプトと画像URLの生成
        const { prompt, imageUrl } = generateResearchPrompt(promptType, productData);

        // 2. 特殊ロジックの振り分け
        if (promptType === 'HTS_CLAUDE_MCP') {
            // 💡 HTS専用の場合はClaude MCPを呼び出す（Geminiとは異なるエンドポイント）
            // const htsResult = await runClaudeMcp(productData, prompt);
            // await updateProductData(productId, htsResult);
            return NextResponse.json({ success: true, message: 'Claude MCPによるHTS取得ロジックを実行しました。（実装待ち）', promptSent: prompt });
        }
        
        // 3. 標準AI（Gemini/Vision）の処理
        let aiResult: string;
        
        if (imageUrl) {
            // 💡 画像が必要な場合 (IMAGE_ONLY) は、Gemini Vision APIを呼び出す
            // aiResult = await runGeminiVision(prompt, imageUrl);
            aiResult = `[Mock Vision Result] Prompt: ${prompt.substring(0, 50)}... | Image used: YES`;
        } else {
            // テキストベースの標準リサーチ
            // aiResult = await runGeminiText(prompt);
            aiResult = `[Mock Text Result] Prompt: ${prompt.substring(0, 50)}... | Image used: NO`;
        }

        // 4. 結果のパースとDB更新 (実際にはここでJSONパースし、SupabaseなどでDBを更新する)
        // const parsedAiResult = JSON.parse(aiResult);
        // await updateProductData(productId, parsedAiResult);

        return NextResponse.json({ 
            success: true, 
            promptSent: prompt, 
            usedImage: imageUrl || 'None', 
            // result: parsedAiResult, 
            message: 'Geminiリサーチを実行し、結果をDBに保存しました。（Mock）'
        }, { status: 200 });

    } catch (error: any) {
        console.error('AI Run Prompt API Error:', error.message);
        return NextResponse.json(
          { success: false, error: 'AIプロンプトの実行に失敗しました。', details: error.message },
          { status: 500 }
        );
    }
}