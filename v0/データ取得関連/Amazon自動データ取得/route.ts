// /app/api/amazon/config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { AmazonConfig } from '@/services/amazonService'; // ステップ2で定義した型をインポート

// Supabaseクライアントの初期化（ここではモックまたは標準的な初期化を想定）
const supabase = createClient();

/**
 * GET /api/amazon/config
 * 全てのAmazon自動取得設定を取得 (リスト表示用)
 */
export async function GET() {
    const { data, error } = await supabase
        .from('amazon_config')
        .select('*')
        .order('id', { ascending: true }) as { data: AmazonConfig[] | null, error: any }; // 型アサーション
        
    if (error) {
        console.error('Error fetching Amazon config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

/**
 * POST /api/amazon/config
 * 新しい設定を保存または既存の設定を更新
 */
export async function POST(req: NextRequest) {
    const body: AmazonConfig = await req.json();
    const { id, ...updates } = body;
    
    if (id) {
        // 既存の設定を更新 (IDがある場合)
        const { data, error } = await supabase
            .from('amazon_config')
            .update(updates)
            .eq('id', id)
            .select()
            .single() as { data: AmazonConfig | null, error: any };

        if (error) {
            console.error('Error updating Amazon config:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
    } else {
        // 新しい設定を作成 (IDがない場合)
        const { data, error } = await supabase
            .from('amazon_config')
            .insert(updates)
            .select()
            .single() as { data: AmazonConfig | null, error: any };

        if (error) {
            console.error('Error inserting Amazon config:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
    }
}