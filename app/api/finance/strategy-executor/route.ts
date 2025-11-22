// ファイル: /app/api/finance/strategy-executor/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchMarketData, executeTrade } from '@/lib/finance/broker-client';
import { generateTradeDecision } from '@/lib/ai/gemini-client';
import { FinanceStrategy } from '@/types/ai';

// N3の現在の為替リスクエクスポージャー（簡略化。実際は trade_email_log や products_masterから算出）
async function getForexExposure(supabaseClient: typeof supabase): Promise<number> {
    // 例: 未払い外貨建て請求額の総額
    // 現在はモック
    return 150000; // 15万USDのリスクがあるとする
}

export async function POST(request: Request) {
    let tradesExecuted = 0;

    try {
        // 1. 実行対象の金融戦略をDBから取得
        const { data: strategies, error: sError } = await supabase
            .from('finance_strategy_master')
            .select('*');

        if (sError || !strategies || strategies.length === 0) {
            return NextResponse.json({ success: true, message: 'No active finance strategies found.' });
        }

        const internalExposure = await getForexExposure(supabase);
        const results = [];

        for (const strategy of strategies as FinanceStrategy[]) {
            const ticker = strategy.target_asset;

            // 2. 市場データを取得
            const marketData = await fetchMarketData(ticker);

            // 3. LLMで取引判断を生成
            const decision = await generateTradeDecision(marketData, strategy, internalExposure);

            // 4. 取引を実行
            let executed = false;
            if (decision.confidence_score >= 0.7) { // 確信度が高ければ実行
                 executed = await executeTrade(strategy, decision);
            }

            // 5. DBを更新
            if (executed) {
                // 実際の取引結果に基づいてポジションを更新する必要があるが、ここでは簡略化
                strategy.current_position += (decision.recommendation === 'BUY' ? decision.target_quantity : -decision.target_quantity);
                strategy.last_executed_at = new Date().toISOString();
                tradesExecuted++;
            }

            await supabase
                .from('finance_strategy_master')
                .update({
                    ai_recommendation: decision.recommendation + ' - ' + decision.justification,
                    last_executed_at: new Date().toISOString(),
                    current_position: strategy.current_position,
                })
                .eq('id', strategy.id);

            results.push({ strategy: strategy.strategy_name, decision: decision.recommendation, executed: executed });
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${strategies.length} finance strategies. Executed ${tradesExecuted} trades.`,
            results
        });

    } catch (error: any) {
        console.error('Finance Automation Core Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
