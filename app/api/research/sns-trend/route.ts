// ファイル: /app/api/research/sns-trend/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { analyzeSnsTrends } from '@/lib/research/sns-analyzer';

export async function POST(request: Request) {
    const supabase = createClient();

    try {
        // 1. 各SNSからトレンドデータを収集
        const trends = await analyzeSnsTrends();

        if (trends.length === 0) {
            return NextResponse.json({ success: true, message: 'No new trends found.' });
        }

        // 2. 既存のトレンドと重複しないかチェック（省略）

        // 3. データベースに保存
        const { error: insertError } = await supabase
            .from('sns_trend_master')
            .insert(trends);

        if (insertError) throw insertError;

        // 4. Content Autopilotのテーマ決定API（S3）に連携するためのフラグを立てる
        // この処理は次回のS3実行時にtrends_masterを参照するよう S3のロジックを変更することで実現

        return NextResponse.json({
            success: true,
            message: `Successfully analyzed and saved ${trends.length} SNS trends.`,
            new_trends: trends
        });

    } catch (error: any) {
        console.error('SNS Trend Analysis Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
