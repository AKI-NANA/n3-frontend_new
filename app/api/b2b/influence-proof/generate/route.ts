/**
 * API: B2B 影響力証明データ生成
 *
 * POST /api/b2b/influence-proof/generate
 *
 * 目的: ペルソナの影響力証明データを自動生成
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateInfluenceProof,
  formatInfluenceProofAsMarkdown,
  formatInfluenceProofAsJSON,
} from '@/lib/b2b/influence-proof-generator';
import type { GenerateInfluenceProofRequest } from '@/types/b2b-partnership';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateInfluenceProofRequest;

    const { persona_id, site_ids } = body;

    // バリデーション
    if (!persona_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'persona_id is required',
        },
        { status: 400 }
      );
    }

    console.log(`[B2B] Generating influence proof for persona: ${persona_id}`);

    // 影響力証明データを生成
    const influenceProof = await generateInfluenceProof(persona_id, site_ids);

    // Markdown形式でフォーマット
    const markdown = formatInfluenceProofAsMarkdown(influenceProof);

    // JSON形式でフォーマット
    const json = formatInfluenceProofAsJSON(influenceProof);

    console.log(`[B2B] Influence proof generated successfully`);
    console.log(`  - Total followers: ${influenceProof.total_followers}`);
    console.log(`  - Monthly reach: ${influenceProof.monthly_reach}`);
    console.log(`  - Platforms: ${influenceProof.platforms?.join(', ')}`);

    return NextResponse.json(
      {
        success: true,
        data: influenceProof,
        markdown,
        json,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[B2B] Error generating influence proof:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
