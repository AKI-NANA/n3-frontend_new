// ファイル: /lib/email/smtp-client.ts
// NodeMailerなどのSMTPクライアントを想定

import { OutreachLog } from '@/types/ai';

/**
 * 自動生成されたメールをターゲットに送信する
 * @param logData 送信するメールの情報
 * @returns 成功/失敗
 */
export async function sendEmail(logData: OutreachLog): Promise<boolean> {
    // TODO: nodemailerやSendGrid/SESなどの外部SMTPサービスを利用した送信ロジックを実装

    if (!process.env.SMTP_HOST || !logData.target_email) {
        console.warn('SMTP settings are incomplete or target email is missing. Skipping actual send.');
        return false;
    }

    console.log(`[SMTP] Sending email to: ${logData.target_email}`);
    console.log(`[SMTP] Subject: ${logData.email_subject}`);
    // 実際にはここでSMTPクライアントを実行

    return true; // 成功をモック
}
