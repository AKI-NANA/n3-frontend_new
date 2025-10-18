import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // Rate Tablesを削除
    const { error: rateError, count: rateCount } = await supabase
      .from('ebay_rate_tables')
      .delete()
      .neq('id', 0) // すべて削除

    if (rateError) throw rateError

    // Policiesを削除
    const { error: policyError, count: policyCount } = await supabase
      .from('ebay_shipping_policies')
      .delete()
      .neq('id', 0) // すべて削除

    if (policyError) throw policyError

    const totalDeleted = (rateCount || 0) + (policyCount || 0)

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      message: `${totalDeleted} 項目を削除しました`
    })
  } catch (error: any) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message 
      },
      { status: 500 }
    )
  }
}
