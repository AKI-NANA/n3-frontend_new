// /services/claude-analysis-service.ts

import { IntermediateResearchData } from '@/types/product'; 

// 💡 実際のClaude APIクライアントは別途用意されているものと想定
// import { callClaudeApi } from '@/lib/claude-api-client';

/**
 * Claudeに専門解析を依頼するためのプロンプトを生成する
 * @param data 中間リサーチデータ
 * @returns Claude実行用のプロンプト文字列
 */
function generateClaudeAnalysisPrompt(data: IntermediateResearchData): string {
    const dataContext = `
商品タイトル: ${data.input_title}
主要URL: ${data.input_url}
仕入れ先候補: ${data.supplier_candidates.join(', ')}
`;

    // 以下のJSON構造で結果を返すよう指示（ClaudeはJSON/XML生成に優れる）
    const prompt = `
[システム指示]
あなたは国際貿易および知的財産リスクの専門家です。以下の商品情報に基づき、求められる解析を厳密に行い、結果を以下のJSON形式で返却してください。JSON構造は厳守してください。

[解析依頼データ]
---
${dataContext}
---

[解析タスク]
1. HTSコード推定と原産国の特定: 渡された情報から、最も正確な**HTSコード（8桁以上）**と、最も可能性の高い**原産国（英語名）**を推定してください。
2. VEROリスク判定: 新品の商品であることを前提とし、ブランド名と商品カテゴリからeBayのVERO（知的財産保護）プログラムによる出品削除リスクを「High」「Medium」「Low」で判定してください。
3. VERO回避用タイトル生成: VEROリスクが「Medium」または「High」の場合のみ、ブランド名を完全に削除し、商品の説明的なキーワードのみを使用した**eBay向けリライトタイトル**（最大80文字）を生成してください。それ以外の場合は空欄にしてください。

[応答形式 (JSON)]
{
  "hts_code": "xxxxxxxxxx",
  "origin_country": "Country Name",
  "vero_risk_level": "High | Medium | Low | N/A",
  "vero_safe_title": "Example descriptive title without brand name"
}
`;
    return prompt;
}

/**
 * Claude APIを呼び出し、専門解析を実行し結果を返す
 * @param data 中間リサーチデータ
 * @returns Claude解析結果を含むIntermediateResearchDataのサブセット
 */
export async function runClaudeAnalysis(data: IntermediateResearchData): Promise<Pick<IntermediateResearchData, 'hts_code' | 'origin_country' | 'vero_risk_level' | 'vero_safe_title'>> {
    const prompt = generateClaudeAnalysisPrompt(data);
    
    // 💡 実際には Claude APIクライアントを呼び出す
    // const apiResponse = await callClaudeApi(prompt);
    
    // *** モック応答（成功時）***
    const mockResponse = {
        hts_code: data.input_title.includes('Bag') ? '4202.22.8000' : '9506.69.0000',
        origin_country: data.input_title.includes('Bag') ? 'China' : 'Vietnam',
        vero_risk_level: data.input_title.includes('Nike') ? 'High' : 'Low',
        vero_safe_title: data.input_title.includes('Nike') ? 'Quality Sports Running Athletic Shoes' : '',
    };
    
    // return JSON.parse(apiResponse) as any;
    return mockResponse as any;
}