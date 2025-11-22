// ファイル: /lib/email/smtp-client.ts
// 簡易SMTP送信モック（実際の実装が必要）

interface EmailPayload {
    target_email: string;
    email_subject: string;
    email_body: string;
}

/**
 * メール送信関数（モック実装）
 * TODO: 実際のSMTP送信ライブラリ（nodemailer等）を統合する
 * @param payload メール送信情報
 * @returns 送信成功の場合true
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
    console.log('📧 [MOCK] Sending email to:', payload.target_email);
    console.log('Subject:', payload.email_subject);
    console.log('Body:', payload.email_body.substring(0, 100) + '...');

    // TODO: 実際のSMTP送信処理を実装
    // 例: nodemailer を使用
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({ ... });
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.target_email,
        subject: payload.email_subject,
        text: payload.email_body,
    });
    */

    // モックとして常に成功を返す
    return true;
}
