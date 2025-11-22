// ファイル: /lib/ai/gemini-client.ts

import { MarketData, TradeDecision, FinanceStrategy } from '@/types/ai';

// Gemini AI クライアントの初期化
// TODO: 環境変数からAPIキーを取得し、Gemini AI SDKを初期化する
// import { GoogleGenerativeAI } from '@google/generative-ai';
// const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// モックのAIクライアント（実装時は上記のSDKを使用）
const mockAI = {
    models: {
        generateContent: async (config: any) => {
            // モック実装：実際のGemini APIを呼び出す代わりに、ダミーの取引判断を返す
            const { contents } = config;
            console.log('[MOCK AI] Generating trade decision for:', contents.substring(0, 100) + '...');

            return {
                text: JSON.stringify({
                    recommendation: 'HOLD',
                    target_quantity: 0,
                    justification: 'モックAI応答：現在の市場状況では様子見を推奨します。',
                    confidence_score: 0.75
                })
            };
        }
    }
};

// 実際の実装時は以下のコメントを解除
// const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const ai = mockAI;

/**
 * 市場データとN3の財務データを統合し、取引判断を生成する
 * @param marketData 市場データ
 * @param strategy 現在の戦略情報とポジション
 * @param internalExposure N3の現在保有する為替リスク額（為替ヘッジ戦略の場合）
 * @returns 取引判断 (TradeDecision)
 */
export async function generateTradeDecision(
    marketData: MarketData,
    strategy: FinanceStrategy,
    internalExposure: number
): Promise<TradeDecision> {

    const JSON_SCHEMA = JSON.stringify({
        type: "object",
        properties: {
            recommendation: { type: "string", enum: ['BUY', 'SELL', 'HOLD', 'CLOSE_POSITION'] },
            target_quantity: { type: "number", description: "取引を推奨する数量またはロット数。0の場合は取引なし。" },
            justification: { type: "string", description: "判断の根拠を、データに基づいて詳細に説明すること。" },
            confidence_score: { type: "number", description: "判断の確信度 (0.00-1.00)" }
        },
        required: ["recommendation", "target_quantity", "justification", "confidence_score"]
    });

    const context = strategy.strategy_name.includes('Hedge') ?
        `N3の現在未ヘッジの為替リスク額は ${internalExposure} USDです。このリスクを最大80%ヘッジすることを目標とします。` :
        `現在の戦略はモメンタム投資です。市場データに基づき、最適なエントリーまたはエグジットポイントを判断してください。`;

    const prompt = `
        あなたは高度な金融取引AIです。以下の情報に基づき、${strategy.strategy_name}戦略に最も適切な取引判断を下してください。

        ---
        【現在の戦略】: ${strategy.strategy_name} (${strategy.target_asset})
        【現在のポジション】: ${strategy.current_position} @ ${strategy.average_entry_price || 'N/A'}
        【市場データ】: 現在価格 ${marketData.current_price}, 出来高 ${marketData.volume}, センチメント: ${marketData.sentiment_data}
        【N3の財務コンテキスト】: ${context}

        【指示】: 取引判断（recommendation）と具体的な取引数量（target_quantity）、そしてその根拠（justification）を、JSON形式で出力してください。
        ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: JSON_SCHEMA,
                temperature: 0.5, // 創造性と論理性のバランス
            },
        });

        const jsonText = response.text.trim();
        const decision = JSON.parse(jsonText);

        // ヘッジ戦略の場合、数量は為替リスク額の範囲内に制限する
        if (strategy.strategy_name.includes('Hedge') && decision.recommendation === 'SELL' && decision.target_quantity > internalExposure * 0.8) {
            decision.target_quantity = Math.floor(internalExposure * 0.8 / marketData.current_price);
            decision.justification += " (数量はN3の為替リスク額の80%に制限されました)";
        }

        return decision as TradeDecision;

    } catch (error) {
        console.error('Gemini API Error (Trade Decision):', error);
        throw new Error('Failed to generate trade decision.');
    }
}
