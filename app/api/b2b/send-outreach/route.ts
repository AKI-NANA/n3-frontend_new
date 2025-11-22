/**
 * API: B2B アウトリーチメール送信
 *
 * POST /api/b2b/send-outreach
 *
 * 目的: 提案メールを自動送信し、アウトリーチログを記録
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendProposalEmail } from '@/lib/b2b/email-sender';
import {
  fetchProposalById,
  fetchPersonaById,
  createOutreachLog,
} from '@/lib/supabase/b2b-partnership';
import type { SendOutreachEmailRequest } from '@/types/b2b-partnership';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendOutreachEmailRequest;

    const { proposal_id, contact_email, contact_person, company_name, personalize } = body;

    // バリデーション
    if (!proposal_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'proposal_id is required',
        },
        { status: 400 }
      );
    }

    if (!contact_email) {
      return NextResponse.json(
        {
          success: false,
          error: 'contact_email is required',
        },
        { status: 400 }
      );
    }

    console.log(`[B2B] Sending outreach email for proposal: ${proposal_id}`);
    console.log(`[B2B] Recipient: ${contact_email}`);

    // 提案書を取得
    const proposal = await fetchProposalById(proposal_id);

    if (!proposal.persona_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proposal has no associated persona',
        },
        { status: 400 }
      );
    }

    // ペルソナ情報を取得
    const persona = await fetchPersonaById(proposal.persona_id);

    // メールを送信
    const emailResult = await sendProposalEmail(
      proposal,
      persona,
      contact_email,
      contact_person,
      company_name || proposal.target_company
    );

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    console.log(`[B2B] Email sent successfully: ${emailResult.messageId}`);

    // アウトリーチログを作成
    const outreachLog = await createOutreachLog({
      company_name: company_name || proposal.target_company,
      company_url: null,
      contact_email,
      contact_person,
      proposal_id,
      persona_id: proposal.persona_id,
      outreach_type: 'email',
      email_subject: `【タイアップのご提案】${proposal.title}`,
      email_body: proposal.proposal_summary,
      status: 'sent',
      ai_generated: proposal.ai_generated,
    });

    console.log(`[B2B] Outreach log created: ${outreachLog.id}`);

    return NextResponse.json(
      {
        success: true,
        outreach_log_id: outreachLog.id,
        message: `Outreach email sent to ${contact_email}`,
        email_message_id: emailResult.messageId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[B2B] Error sending outreach email:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
