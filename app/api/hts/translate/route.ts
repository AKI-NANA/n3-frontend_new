// app/api/hts/translate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

        const { data, error } = await query;

        if (error) {
            console.error('HTS検索エラー:', error);
            return NextResponse.json({ data: [], message: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, message: 'Search successful' });
    } catch (error) {
        console.error('予期しないエラー:', error);
        return NextResponse.json({ data: [], message: 'Internal server error' }, { status: 500 });
    }
}
