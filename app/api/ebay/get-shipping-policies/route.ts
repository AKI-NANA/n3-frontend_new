// app/api/ebay/get-shipping-policies/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // 配送ポリシー一覧を取得
    const { data: policies, error } = await supabase
      .from('ebay_shipping_policies_v2')
      .select('id, policy_name, weight_min_kg, weight_max_kg, pricing_basis, created_at, updated_at')
      .order('weight_min_kg', { ascending: true })
      .order('pricing_basis', { ascending: true })

    if (error) {
      console.error('配送ポリシー取得エラー:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch shipping policies',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      policies: policies || [],
      count: policies?.length || 0
    })
  } catch (error) {
    console.error('配送ポリシー取得エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch shipping policies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
