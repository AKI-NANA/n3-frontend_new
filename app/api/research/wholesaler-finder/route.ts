// ファイル: /app/api/research/wholesaler-finder/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { searchWholesalerUrls, scrapeContactInfo } from '@/lib/research/contact-scraper';
import { generateB2BEmail } from '@/lib/ai/gemini-client';
import { sendEmail } from '@/lib/email/smtp-client';
import { OutreachLog, Persona } from '@/types/ai';

export async function POST(request: Request) {
    const supabase = createClient();

    // 営業メールに使用するペルソナIDを指定（ここではID=1のペルソナを使用すると仮定）
    const PERSONA_ID = 1;

    try {
        // 1. 営業メール用ペルソナの取得
        const { data: persona, error: personaError } = await supabase
            .from('persona_master')
            .select('*')
            .eq('id', PERSONA_ID)
            .single();

        if (personaError || !persona) throw new Error('Persona not found for B2B outreach.');

        // 2. N3の高利益商品（未開拓の）を1つ選定
        // TODO: products_masterから、outreach_log_masterに履歴のない商品を選ぶロジックを実装
        const { data: product, error: productError } = await supabase
            .from('products_master')
            .select('id, title, profit_margin')
            .order('profit_margin', { ascending: false })
            .limit(1)
            .single();

        if (productError || !product) {
            return NextResponse.json({ success: true, message: 'No high-profit products available for outreach.' });
        }

        const productName = product.title;

        // 3. 問屋・メーカーのURLを検索
        const wholesalerUrls = await searchWholesalerUrls(productName);

        const results = [];

        for (const url of wholesalerUrls) {
            // 4. 連絡先情報をスクレイピング
            const contact = await scrapeContactInfo(url);

            if (contact.contact_email) {
                // 5. LLMでメールを生成
                const { subject, body } = await generateB2BEmail(
                    (persona as Persona).style_prompt,
                    contact.company_name,
                    productName
                );

                // 6. ログデータを作成
                const log: Partial<OutreachLog> = {
                    target_company: contact.company_name,
                    target_email: contact.contact_email,
                    target_url: contact.contact_url,
                    product_id: product.id,
                    persona_id: PERSONA_ID,
                    email_subject: subject,
                    email_body: body,
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    reply_at: null,
                };

                // 7. メールを送信
                const sent = await sendEmail(log as OutreachLog);

                // 8. ログをDBに保存
                const { data: savedLog, error: logError } = await supabase
                    .from('outreach_log_master')
                    .insert([log])
                    .select();

                if (logError) throw logError;

                results.push({ company: contact.company_name, email: contact.contact_email, status: sent ? 'SENT' : 'SMTP_FAIL' });
            } else {
                results.push({ company: contact.company_name, email: 'N/A', status: 'NO_EMAIL_FOUND' });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed outreach for ${productName}.`,
            results
        });

    } catch (error: any) {
        console.error('Wholesaler Finder Process Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
