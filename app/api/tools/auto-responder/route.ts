// /app/api/tools/auto-responder/route.ts
// チャット自動応答・一斉返信API

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchNewChatInquiries, sendFinalResponse } from '@/lib/external/chat-adapter';
import { generateChatResponseRewrite } from '@/lib/ai/gemini-client';
import type { ResponseQueueItem, Persona } from '@/types/ai';

/**
 * ペルソナスタイルを取得する関数
 * TODO: 実際には site_config_master や persona_master テーブルから取得する
 */
async function getPersonaStyle(supabase: any): Promise<string> {
    // デフォルトのペルソナスタイル
    const defaultStyle = "丁寧で、親しみやすいが、専門知識に裏打ちされた文体。クレーム対応ではまず共感を示すこと。";

    try {
        // TODO: 実際のテーブルから取得
        // const { data, error } = await supabase
        //     .from('persona_master')
        //     .select('style_description')
        //     .eq('is_active', true)
        //     .single();
        //
        // if (error) throw error;
        // return data?.style_description || defaultStyle;

        return defaultStyle;
    } catch (error) {
        console.error('Failed to fetch persona style:', error);
        return defaultStyle;
    }
}

/**
 * POST: 新規問い合わせの処理と承認済み返信の一斉送信
 */
export async function POST(request: Request) {
    // Supabaseクライアントの作成
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
            { success: false, error: 'Supabase credentials not configured' },
            { status: 500 }
        );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false
        }
    });

    let itemsProcessed = 0;
    let sentCount = 0;

    try {
        const personaStyle = await getPersonaStyle(supabase);

        // ========================================
        // STEP 1: 新規チャット問い合わせを取得し、AI処理
        // ========================================
        console.log('[AUTO-RESPONDER] Fetching new chat inquiries...');
        const inquiries = await fetchNewChatInquiries();
        console.log(`[AUTO-RESPONDER] Found ${inquiries.length} new inquiries`);

        for (const inquiry of inquiries) {
            // 重複チェック (conversation_idで判断)
            const { count } = await supabase
                .from('response_queue')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', inquiry.conversation_id);

            if (count && count > 0) {
                console.log(`[AUTO-RESPONDER] Skipping duplicate conversation: ${inquiry.conversation_id}`);
                continue;
            }

            // AI による返信案生成・リライト
            console.log(`[AUTO-RESPONDER] Generating response for: ${inquiry.conversation_id}`);
            const rewriteResult = await generateChatResponseRewrite(
                inquiry.message,
                '',
                personaStyle
            );

            // response_queue テーブルに保存（外注レビュー待ち）
            const logData = {
                source_platform: inquiry.platform,
                conversation_id: inquiry.conversation_id,
                original_message: inquiry.message,
                ai_classification: rewriteResult.category,
                ai_generated_response: rewriteResult.rewritten_body,
                final_response: rewriteResult.rewritten_body, // 初期値として設定
                status: 'pending_review',
            };

            const { error: insertError } = await supabase
                .from('response_queue')
                .insert([logData]);

            if (insertError) {
                console.error(`[AUTO-RESPONDER] Failed to insert response queue:`, insertError);
                continue;
            }

            itemsProcessed++;
            console.log(`[AUTO-RESPONDER] Processed inquiry: ${inquiry.conversation_id}`);
        }

        // ========================================
        // STEP 2: 外注が「承認済み（approved_ready）」にしたものを一斉返信
        // ========================================
        console.log('[AUTO-RESPONDER] Fetching approved responses...');
        const { data: approvedItems, error: fetchError } = await supabase
            .from('response_queue')
            .select('*')
            .eq('status', 'approved_ready');

        if (fetchError) {
            console.error('[AUTO-RESPONDER] Failed to fetch approved items:', fetchError);
            throw fetchError;
        }

        console.log(`[AUTO-RESPONDER] Found ${approvedItems?.length || 0} approved responses`);

        for (const item of (approvedItems || []) as ResponseQueueItem[]) {
            if (!item.final_response) {
                console.warn(`[AUTO-RESPONDER] Skipping item ${item.id} - no final_response`);
                continue;
            }

            // 外部ツールへ送信
            console.log(`[AUTO-RESPONDER] Sending response for: ${item.conversation_id}`);
            const success = await sendFinalResponse(
                item.conversation_id,
                item.final_response
            );

            // DBステータス更新
            if (success) {
                const { error: updateError } = await supabase
                    .from('response_queue')
                    .update({
                        status: 'sent',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`[AUTO-RESPONDER] Failed to update status for ${item.id}:`, updateError);
                } else {
                    sentCount++;
                    console.log(`[AUTO-RESPONDER] Successfully sent response for: ${item.conversation_id}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${itemsProcessed} new inquiries. Sent ${sentCount} approved responses.`,
            stats: {
                new_inquiries_processed: itemsProcessed,
                approved_responses_sent: sentCount,
            }
        });

    } catch (error: any) {
        console.error('[AUTO-RESPONDER] Core Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Internal server error',
                stats: {
                    new_inquiries_processed: itemsProcessed,
                    approved_responses_sent: sentCount,
                }
            },
            { status: 500 }
        );
    }
}

/**
 * GET: ステータス確認（オプション）
 */
export async function GET(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
            { success: false, error: 'Supabase credentials not configured' },
            { status: 500 }
        );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false
        }
    });

    try {
        // 各ステータスの件数を取得
        const { data: pending, error: pendingError } = await supabase
            .from('response_queue')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending_review');

        const { data: approved, error: approvedError } = await supabase
            .from('response_queue')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'approved_ready');

        const { data: sent, error: sentError } = await supabase
            .from('response_queue')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'sent');

        if (pendingError || approvedError || sentError) {
            throw new Error('Failed to fetch status counts');
        }

        return NextResponse.json({
            success: true,
            status: {
                pending_review: pending || 0,
                approved_ready: approved || 0,
                sent: sent || 0,
            },
            message: 'Auto-responder is running',
        });

    } catch (error: any) {
        console.error('[AUTO-RESPONDER] Status check error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
