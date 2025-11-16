// app/api/hts/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

/**
 * GET /api/hts/search?keyword=...&lang=...
 * 日英両対応のHTSコード検索API
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const keyword = searchParams.get('keyword');
        const lang = searchParams.get('lang') || 'ja'; // デフォルトは日本語検索

        if (!keyword || keyword.length < 3) {
            return NextResponse.json({ data: [], message: 'Keyword must be at least 3 characters long.' });
        }
        
        // 検索対象フィールドを言語に応じて決定
        const descriptionField = lang === 'ja' ? 'description_ja' : 'description';

        // HTSコードのフィールド（hts_number）と、言語別の説明フィールドをOR検索
        const query = supabase
            .from('hts_codes_details')
            .select('hts_number, description, description_ja, general_rate') // 必要なフィールドを選択
            .or(`hts_number.ilike.%${keyword}%, ${descriptionField}.ilike.%${keyword}%`)
            .limit(50);
            
        // 💡 データベースの日本語フィールドがまだ存在しない（または空）の場合、英語フィールドにもフォールバックできるようにする
        if (lang === 'ja') {
            query.or(`hts_number.ilike.%${keyword}%, description_ja.ilike.%${keyword}%, description.ilike.%${keyword}%`);
        }


        const { data, error } = await query;

        if (error) {
            console.error('HTS Search Error:', error.message);
            return NextResponse.json({ success: false, error: 'DB search failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('API Error:', error.message);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}