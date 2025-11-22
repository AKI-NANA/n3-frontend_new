/**
 * NAGANO-3 B2B Partnership - メール送信
 *
 * 目的: 提案メールを自動生成・送信（Resend使用）
 */

import type { PartnershipProposal, PersonaMaster } from '@/types/b2b-partnership';

/**
 * メール送信インターフェース
 */
export interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

/**
 * 提案メールを送信
 */
export async function sendProposalEmail(
  proposal: PartnershipProposal,
  persona: PersonaMaster,
  recipientEmail: string,
  recipientName?: string,
  companyName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // メール本文を生成
    const emailContent = generateProposalEmail(
      proposal,
      persona,
      recipientName,
      companyName
    );

    // メールを送信
    const result = await sendEmail({
      from: persona.email || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    console.log(`[B2B] Proposal email sent to ${recipientEmail}`);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[B2B] Error sending proposal email:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 提案メールの内容を生成
 */
function generateProposalEmail(
  proposal: PartnershipProposal,
  persona: PersonaMaster,
  recipientName?: string,
  companyName?: string
): { subject: string; html: string; text: string } {
  const greeting = recipientName ? `${recipientName}様` : `ご担当者様`;

  const subject = `【タイアップのご提案】${proposal.title}`;

  const text = `
${greeting}

はじめまして、${persona.persona_name}と申します。

${companyName || '貴社'}の事業内容を拝見し、ぜひタイアップのご提案をさせていただきたくご連絡いたしました。

■ 提案概要
${proposal.proposal_summary}

■ 期待効果
- 推定リーチ: ${proposal.estimated_reach?.toLocaleString() || 'N/A'} 人
- 推定エンゲージメント: ${proposal.estimated_engagement?.toLocaleString() || 'N/A'} 回
${proposal.estimated_conversions ? `- 推定コンバージョン: ${proposal.estimated_conversions.toLocaleString()} 件` : ''}

■ 提案価格
¥${proposal.proposed_price_jpy?.toLocaleString() || 'N/A'}

詳細な企画書は別途PDFにてお送りいたします。
ご興味をお持ちいただけましたら、ぜひお打ち合わせの機会をいただけますと幸いです。

何卒よろしくお願い申し上げます。

---
${persona.persona_name}
${persona.email || ''}
${persona.phone || ''}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 10px;
      border-left: 4px solid #3498db;
      padding-left: 10px;
    }
    .metrics {
      background-color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      margin-top: 10px;
    }
    .metrics li {
      margin-bottom: 5px;
    }
    .price {
      font-size: 24px;
      font-weight: bold;
      color: #e74c3c;
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0; color: #2c3e50;">【タイアップのご提案】</h2>
    <h3 style="margin: 10px 0 0 0; color: #3498db;">${proposal.title}</h3>
  </div>

  <p>${greeting}</p>

  <p>
    はじめまして、<strong>${persona.persona_name}</strong>と申します。
  </p>

  <p>
    ${companyName || '貴社'}の事業内容を拝見し、ぜひタイアップのご提案をさせていただきたくご連絡いたしました。
  </p>

  <div class="section">
    <div class="section-title">■ 提案概要</div>
    <p>${proposal.proposal_summary}</p>
  </div>

  <div class="section">
    <div class="section-title">■ 期待効果</div>
    <div class="metrics">
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>推定リーチ:</strong> ${proposal.estimated_reach?.toLocaleString() || 'N/A'} 人</li>
        <li><strong>推定エンゲージメント:</strong> ${proposal.estimated_engagement?.toLocaleString() || 'N/A'} 回</li>
        ${proposal.estimated_conversions ? `<li><strong>推定コンバージョン:</strong> ${proposal.estimated_conversions.toLocaleString()} 件</li>` : ''}
      </ul>
    </div>
  </div>

  <div class="section">
    <div class="section-title">■ 提案価格</div>
    <div class="price">¥${proposal.proposed_price_jpy?.toLocaleString() || 'N/A'}</div>
  </div>

  <p>
    詳細な企画書は別途PDFにてお送りいたします。<br>
    ご興味をお持ちいただけましたら、ぜひお打ち合わせの機会をいただけますと幸いです。
  </p>

  <p>何卒よろしくお願い申し上げます。</p>

  <div class="footer">
    <strong>${persona.persona_name}</strong><br>
    ${persona.email ? `Email: ${persona.email}<br>` : ''}
    ${persona.phone ? `Tel: ${persona.phone}` : ''}
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

/**
 * メール送信（Resend使用）
 */
async function sendEmail(
  options: EmailOptions
): Promise<{ messageId: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[B2B] RESEND_API_KEY is not set. Using mock email sender.');
    return sendEmailMock(options);
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return { messageId: data.id };
  } catch (error) {
    console.error('[B2B] Error sending email with Resend:', error);
    throw error;
  }
}

/**
 * モックメール送信（開発用）
 */
async function sendEmailMock(
  options: EmailOptions
): Promise<{ messageId: string }> {
  console.log('[B2B] Mock email sent:');
  console.log(`  From: ${options.from}`);
  console.log(`  To: ${options.to}`);
  console.log(`  Subject: ${options.subject}`);
  console.log(`  HTML length: ${options.html.length} characters`);

  // モックメッセージID
  const messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  return { messageId };
}

/**
 * フォローアップメールを送信
 */
export async function sendFollowUpEmail(
  originalEmail: {
    subject: string;
    recipientEmail: string;
    recipientName?: string;
  },
  persona: PersonaMaster,
  followUpNumber: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const greeting = originalEmail.recipientName
    ? `${originalEmail.recipientName}様`
    : `ご担当者様`;

  const subject = `Re: ${originalEmail.subject}`;

  const text = `
${greeting}

先日お送りしたタイアップのご提案について、ご確認いただけましたでしょうか。

ご多忙のところ恐縮ですが、ご興味をお持ちいただけましたら、
ぜひ一度お話しする機会をいただけますと幸いです。

引き続きよろしくお願い申し上げます。

---
${persona.persona_name}
${persona.email || ''}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <p>${greeting}</p>

  <p>先日お送りしたタイアップのご提案について、ご確認いただけましたでしょうか。</p>

  <p>
    ご多忙のところ恐縮ですが、ご興味をお持ちいただけましたら、<br>
    ぜひ一度お話しする機会をいただけますと幸いです。
  </p>

  <p>引き続きよろしくお願い申し上げます。</p>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
    <strong>${persona.persona_name}</strong><br>
    ${persona.email ? `Email: ${persona.email}` : ''}
  </div>
</body>
</html>
  `.trim();

  try {
    const result = await sendEmail({
      from: persona.email || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
      to: originalEmail.recipientEmail,
      subject,
      html,
      text,
    });

    console.log(`[B2B] Follow-up email #${followUpNumber} sent to ${originalEmail.recipientEmail}`);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[B2B] Error sending follow-up email:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
