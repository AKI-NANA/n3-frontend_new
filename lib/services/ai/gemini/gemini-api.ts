// /lib/gemini-api.ts

import { ResearchPromptType } from '@/types/product'; 

// 実際のプロンプトテンプレートは、AIが理解しやすいよう具体的な指示とJSONフォーマットでの出力を求めるべきです。
const PROMPT_TEMPLATES = {
    IMAGE_ONLY: (productData: any, imageUrl: string) => 
        `[画像URL]: ${imageUrl}\n以下のタスクを実行し、結果をJSON形式で返してください。\nタスク:\n1. この画像の商品を特定し、正確な英語タイトル、商品説明を生成。\n2. 市場での最安値をリサーチし、価格を提案（販売価格として適用）。\n3. HTSコード、原産国、素材をもしあればリサーチ。\n\n現在のデータ: ${JSON.stringify({ sku: productData.sku, name: productData.name })}`,
    
    FILL_MISSING_DATA: (productData: any) => 
        `[現在データ]: ${JSON.stringify(productData)}\n以下のデータ項目で不足しているものをリサーチし、全て補完した新しいJSONオブジェクトを返してください。\n- 英語タイトル\n- 英語説明文\n- HTSコード\n- 原産国\n- 素材`,
        
    FULL_RESEARCH_STANDARD: (productData: any) => 
        `[現在データ]: ${JSON.stringify(productData)}\nHTSコード、原産国、素材を優先的にリサーチし、データが取得できる場合はJSONオブジェクトに追加してください。市場調査（最安値リサーチ）は不要です。`,
        
    LISTING_DATA_ONLY: (productData: any) => 
        `[現在データ]: ${JSON.stringify(productData)}\n出品に必要な最低限のデータ（英語タイトル、英語説明文、eBay出品条件）のみを取得・生成したJSONオブジェクトを返してください。`,
    
    HTS_CLAUDE_MCP: (productData: any) =>
        `この商品データに基づき、Supabaseのデータベースに接続して過去事例を検索し、最も正確なHTSコードを取得してください。リサーチ結果をJSON形式で返してください。\n商品情報: ${JSON.stringify({ title: productData.name, category: productData.category })}`
};

/**
 * 選択されたタイプに基づき、AI実行用のプロンプトを生成する
 * @param type 選択されたプロンプトタイプ
 * @param productData 処理対象の商品データ（タイトル、画像URL、listing_dataなど）
 * @returns AIに渡すプロンプト文字列と、必要な場合は画像URL
 */
export function generateResearchPrompt(type: ResearchPromptType, productData: any): { prompt: string; imageUrl?: string } {
    // 優先度の高い画像URLを取得 (プライマリ画像、またはギャラリー画像の1枚目)
    const primaryImage = productData.listing_data?.primary_image_url || productData.gallery_images?.[0]?.url;

    if (type === 'IMAGE_ONLY' && primaryImage) {
        // IMAGE_ONLYプロンプトは画像URLが必須
        return { 
            prompt: PROMPT_TEMPLATES.IMAGE_ONLY(productData, primaryImage), 
            imageUrl: primaryImage 
        };
    }
    
    // 画像を使用しない、または画像がない場合の処理
    const prompt = PROMPT_TEMPLATES[type] ? PROMPT_TEMPLATES[type](productData) : '標準のリサーチプロンプト';
    
    return { prompt };
}