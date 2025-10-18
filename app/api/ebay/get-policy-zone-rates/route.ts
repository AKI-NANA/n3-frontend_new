// app/api/ebay/get-policy-zone-rates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('policyId')

    if (!policyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'policyId parameter is required'
        },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 指定されたポリシーのZONE別送料を取得
    const { data: rates, error } = await supabase
      .from('ebay_policy_zone_rates_v2')
      .select('*')
      .eq('policy_id', parseInt(policyId))
      .order('zone_type', { ascending: true })
      .order('zone_code', { ascending: true })

    if (error) {
      console.error('ZONE別送料取得エラー:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch policy zone rates',
          details: error.message
        },
        { status: 500 }
      )
    }

    // USA と OTHER のみに絞る（簡略化）
    const usaRate = rates?.find(r => r.zone_type === 'USA')
    const otherRates = rates?.filter(r => r.zone_type === 'OTHER') || []
    
    // OTHER の平均を取る（または最初の1件のみ）
    const otherRate = otherRates.length > 0 ? otherRates[0] : null

    const simplifiedRates = []
    if (usaRate) simplifiedRates.push(usaRate)
    if (otherRate) simplifiedRates.push(otherRate)

    return NextResponse.json({
      success: true,
      rates: simplifiedRates,
      allRates: rates || [], // 全ZONE情報も返す
      count: rates?.length || 0
    })
  } catch (error) {
    console.error('ZONE別送料取得エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch policy zone rates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
