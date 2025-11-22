// ファイル: /lib/ai/gemini-client.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini AI インスタンスの初期化
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

/**
 * ペルソナと商品データに基づき、取引打診メールを生成する
 * @param personaStyle ペルソナの文体指示
 * @param targetCompany 送付先企業名
 * @param productTitle 提案商品（N3の高利益商品）
 * @returns 件名と本文
 */
export async function generateB2BEmail(
    personaStyle: string,
    targetCompany: string,
    productTitle: string
): Promise<{ subject: string; body: string }> {

    const prompt = `
        あなたは、${targetCompany}に対し、日本の高利益商品である「${productTitle}」の取引を提案するメールを作成する、経験豊富な物販セラーです。

        ---
        【あなたのペルソナと文体指示】:
        ${personaStyle}

        【メール作成のルール】
        1. 丁寧語、謙譲語を適切に使用し、日本のビジネスマナーに則ったメール本文を作成すること。
        2. 提案商品「${productTitle}」が、なぜ御社（${targetCompany}）にとって利益になるのかを明確に提示すること。
        3. 貴社の信頼性を高めるため、ペルソナの専門性をさりげなく示唆すること。
        4. 出力は件名と本文を含むJSON形式とすること。
        ---

        分析結果をJSON形式で出力してください。
        以下の形式で出力してください：
        {
            "subject": "件名をここに記載",
            "body": "メール本文をここに記載"
        }
    `;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.5, // 堅実なビジネス文生成のため、低めに設定
                responseMimeType: "application/json",
            },
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonText = response.text().trim();

        return JSON.parse(jsonText);

    } catch (error) {
        console.error('Gemini API Error (B2B Email Generation):', error);
        throw new Error('Failed to generate B2B email from AI.');
    }
}
