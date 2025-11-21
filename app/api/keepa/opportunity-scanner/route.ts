/**
 * Keepa Opportunity Scanner API
 * GET /api/keepa/opportunity-scanner?domain=1&minScore=40&limit=50
 *
 * Purpose: P-4/P-1スコアに基づいて自動で購入機会をスキャン
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = parseInt(searchParams.get('domain') || '0', 10)
    const minScore = parseFloat(searchParams.get('minScore') || '40')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const strategy = searchParams.get('strategy') // 'P-4', 'P-1', or null (both)

    const supabase = createClient()

    // クエリビルダー
    let query = supabase
      .from('products_master')
      .select('*')
      .eq('should_purchase', true)
      .gte('primary_score', minScore)
      .order('primary_score', { ascending: false })
      .limit(limit)

    // ドメインフィルター
    if (domain > 0) {
      query = query.eq('keepa_domain', domain)
    }

    // 戦略フィルター
    if (strategy) {
      query = query.eq('primary_strategy', strategy)
    }

    const { data: opportunities, error } = await query

    if (error) {
      console.error('Failed to fetch opportunities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch opportunities from database' },
        { status: 500 }
      )
    }

    // 緊急度別にグループ化
    const grouped = {
      high: opportunities?.filter(p => p.urgency === 'high') || [],
      medium: opportunities?.filter(p => p.urgency === 'medium') || [],
      low: opportunities?.filter(p => p.urgency === 'low') || []
    }

    // 戦略別にグループ化
    const byStrategy = {
      'P-4': opportunities?.filter(p => p.primary_strategy === 'P-4') || [],
      'P-1': opportunities?.filter(p => p.primary_strategy === 'P-1') || []
    }

    return NextResponse.json({
      total: opportunities?.length || 0,
      opportunities: opportunities || [],
      grouped,
      byStrategy,
      filters: {
        domain: domain > 0 ? domain : 'all',
        minScore,
        strategy: strategy || 'all'
      }
    })
  } catch (error) {
    console.error('Opportunity scanner API error:', error)
    return NextResponse.json(
      { error: 'Failed to scan opportunities' },
      { status: 500 }
    )
  }
}
