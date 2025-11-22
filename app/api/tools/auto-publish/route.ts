// ファイル: /app/api/tools/auto-publish/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { postToWordPress } from '@/lib/wp-client';
import { generateFullVideo } from '@/lib/media-converter';
import { ContentQueue, SiteConfig } from '@/types/ai';

export async function POST(request: Request) {
    // 1. キューから投稿待ちのアイテムを取得
    const { data: queueItems, error: fetchError } = await supabase
        .from('generated_content_queue')
        .select('*')
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true })
        .limit(5); // 一度に処理する数を制限

    if (fetchError || !queueItems || queueItems.length === 0) {
        return NextResponse.json({ success: true, message: 'No content pending.' });
    }

    const results = [];

    for (const item of queueItems) {
        // 2. サイト設定を取得
        const { data: siteConfig, error: configError } = await supabase
            .from('site_config_master')
            .select('*')
            .eq('id', item.site_id)
            .single();

        if (configError || !siteConfig) {
            results.push({ id: item.id, status: 'failed', error: 'Site config not found.' });
            continue;
        }

        try {
            let postUrl = '';

            // 3. プラットフォーム別の投稿ロジック実行
            if (item.platform === 'wordpress') {
                postUrl = await postToWordPress(item as ContentQueue, siteConfig as SiteConfig);
            } else if (item.platform === 'youtube' || item.platform === 'tiktok') {
                // 動画生成とアップロード
                const videoPath = await generateFullVideo(item as ContentQueue);
                // TODO: YouTube Data API または TikTok API を使って動画をアップロードし、postUrlを取得
                postUrl = `https://youtube.com/upload/${item.id}`; // 仮のURL
            }

            // 4. ステータスを更新
            await supabase
                .from('generated_content_queue')
                .update({ status: 'completed', post_url: postUrl })
                .eq('id', item.id);

            // 5. サイト最終投稿日時を更新 (サイトの活動状況追跡用)
            await supabase
                .from('site_config_master')
                .update({ last_post_at: new Date().toISOString() })
                .eq('id', siteConfig.id);

            results.push({ id: item.id, status: 'completed', url: postUrl });

        } catch (e: any) {
            console.error(`Publishing failed for item ${item.id}:`, e.message);
            await supabase
                .from('generated_content_queue')
                .update({ status: 'failed', post_url: null })
                .eq('id', item.id);
            results.push({ id: item.id, status: 'failed', error: e.message });
        }
    }

    return NextResponse.json({ success: true, results });
}
