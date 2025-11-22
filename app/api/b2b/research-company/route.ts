/**
 * API: B2B 企業リサーチ
 *
 * POST /api/b2b/research-company
 *
 * 目的: 企業のウェブサイトから情報を自動収集し、親和性スコアを計算
 */

import { NextRequest, NextResponse } from 'next/server';
import { researchCompany, calculateAffinityScore } from '@/lib/b2b/company-researcher';
import { fetchPersonaById, fetchSites } from '@/lib/supabase/b2b-partnership';
import type { ResearchCompanyRequest } from '@/types/b2b-partnership';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResearchCompanyRequest & {
      persona_id?: string;
    };

    const { company_url, product_category, persona_id } = body;

    // バリデーション
    if (!company_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'company_url is required',
        },
        { status: 400 }
      );
    }

    console.log(`[B2B] Researching company: ${company_url}`);

    // 企業情報をリサーチ
    const companyData = await researchCompany(company_url, {
      deep_research: false,
      extract_contacts: true,
      analyze_campaigns: true,
    });

    // 親和性スコアを計算（persona_idが提供された場合）
    let affinityScore: number | undefined;
    if (persona_id) {
      const persona = await fetchPersonaById(persona_id);
      const sites = await fetchSites(persona_id, 'active');

      const personaData = {
        expertise_areas: persona.expertise_areas || [],
        category: sites[0]?.category,
        target_audience: sites[0]?.target_audience,
      };

      affinityScore = calculateAffinityScore(companyData, personaData);

      console.log(`[B2B] Affinity score calculated: ${affinityScore}/100`);
    }

    return NextResponse.json(
      {
        success: true,
        data: companyData,
        affinity_score: affinityScore,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[B2B] Error researching company:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
