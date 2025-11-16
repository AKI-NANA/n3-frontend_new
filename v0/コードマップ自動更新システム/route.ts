// /app/api/doc/update-code-map/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateUpdatePrompt } from '@/lib/doc-processor';
// 💡 LLM APIクライアントとファイルシステム操作モジュールをインポート
// import { callLLMForDocUpdate, saveCodeMapJson } from '@/lib/doc-processor'; 

/**
 * POST /api/doc/update-code-map
 * 変更されたコードの差分を受け取り、LLMを呼び出してコードマップを更新する
 */
export async function POST(req: NextRequest) {
    try {
        const { codeChanges } = await req.json(); // codeChanges: git diffの結果など

        if (!codeChanges) {
            return NextResponse.json({ success: false, error: 'Code changes (git diff) must be provided.' }, { status: 400 });
        }

        // 1. LLM実行用のプロンプトを生成
        const prompt = generateUpdatePrompt(codeChanges);
        
        // 2. LLMを呼び出し、新しいJSON配列を取得 (Mock)
        // const newJsonString = await callLLMForDocUpdate(prompt);
        
        // *** 実際にはLLMが実行されますが、ここではモックレスポンスを返します ***
        const mockLLMResponse = JSON.stringify([
             {
                "path": "/src/components/ProductModal/components/Tabs/TabMirror.tsx",
                "title": "類似商品レコメンド画面",
                "description_level_h": "商品詳細画面で、**バリエーション対応フラグも考慮して**似ている商品を見つけるための画面に進化しました。",
                "last_updated": "2025-11-12" // 更新
            },
            {
                "path": "/app/api/scrape/inventory-data/route.ts", // 新規追加をシミュレート
                "title": "在庫・市場データ取得API",
                "description_level_h": "外部サイトから商品の現在の在庫数と販売価格、ライバル出品者数を取得し、DBに履歴として保存する裏側の仕組みです。在庫差異があるかどうかもチェックします。",
                "last_updated": "2025-11-12"
            }
        ]);
        
        // 3. ファイルシステムに新しいJSONを保存 (Mock)
        // await saveCodeMapJson(newJsonString); 

        return NextResponse.json({
            success: true,
            message: 'Code map update successful.',
            // updatedMap: JSON.parse(mockLLMResponse),
            promptPreview: prompt.substring(0, 300) + '...',
        }, { status: 200 });

    } catch (error: any) {
        console.error('Code Map Update API Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'コードマップの更新中にエラーが発生しました。' },
            { status: 500 }
        );
    }
}