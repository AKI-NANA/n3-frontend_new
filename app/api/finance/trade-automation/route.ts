// ファイル: /app/api/finance/trade-automation/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { classifyIncomingEmail, generateMultilingualResponse } from '@/lib/ai/gemini-client';
import { fetchIncomingTradeEmails } from '@/lib/email/auto-classifier';
import { sendEmail } from '@/lib/email/smtp-client';
import { TradeEmailLog, AutoResponse } from '@/types/ai';

// 自動返信を許可する確信度の閾値
const AUTO_SEND_THRESHOLD = 0.85;

export async function POST(request: Request) {
    let emailsProcessed = 0;

    try {
        // 1. 未処理の貿易メールを取得
        const incomingEmails = await fetchIncomingTradeEmails();

        const results = [];

        for (const email of incomingEmails) {
            let logData: Partial<TradeEmailLog> = { ...email, processed_at: new Date().toISOString() };
            let autoResponse: AutoResponse | null = null;
            let targetLanguage: 'English' | 'Chinese' = 'English';

            try {
                // 2. LLMでメールを分類し、データを抽出
                const classification = await classifyIncomingEmail(email.email_body_original!);

                logData.language = classification.language;
                logData.classification = classification.classification;
                logData.extracted_data = classification.extracted_data;

                // 3. 返信ターゲット言語を決定
                if (classification.language === 'Chinese') {
                    targetLanguage = 'Chinese';
                }

                // 4. LLMで返信メールを生成
                autoResponse = await generateMultilingualResponse(classification, email.email_body_original!, targetLanguage);

                logData.response_subject = autoResponse.subject;
                logData.response_body = autoResponse.body;

                // 5. 自動送信の判断
                if (classification.confidence_score >= AUTO_SEND_THRESHOLD && classification.classification !== 'Unknown') {
                    // 信頼度が高ければ自動送信
                    const sent = await sendEmail({
                        target_email: email.sender_email!,
                        email_subject: autoResponse.subject,
                        email_body: autoResponse.body
                    });

                    logData.auto_send_status = sent ? 'sent_auto' : 'failed';
                    results.push({ sender: email.sender_email, status: sent ? 'AUTO_SENT' : 'SMTP_FAIL', classification: logData.classification });

                } else {
                    // 低信頼度の場合はレビュー待ち
                    logData.auto_send_status = 'pending_review';
                    results.push({ sender: email.sender_email, status: 'PENDING_REVIEW', classification: logData.classification, confidence: classification.confidence_score });
                }

                // 6. ログをDBに保存
                const { error } = await supabase.from('trade_email_log').insert([logData as any]);
                if (error) {
                    console.error('Database insert error:', error);
                }
                emailsProcessed++;

            } catch (error: any) {
                console.error(`Error processing email from ${email.sender_email}:`, error.message);
                logData.auto_send_status = 'failed';
                await supabase.from('trade_email_log').insert([logData as any]);
                results.push({ sender: email.sender_email, status: 'PROCESSING_ERROR' });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${emailsProcessed} trade emails.`,
            results
        });

    } catch (error: any) {
        console.error('Trade Automation Core Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
