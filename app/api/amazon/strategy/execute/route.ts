import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AsinSelectionEngine } from '@/lib/amazon/asin-selection-engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの戦略設定を取得
    const { data: strategy, error: strategyError } = await supabase
      .from('amazon_research_strategies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (strategyError || !strategy) {
      return NextResponse.json(
        { error: 'Strategy configuration not found' },
        { status: 404 }
      )
    }

    if (!strategy.is_active) {
      return NextResponse.json(
        { error: 'Strategy is not active' },
        { status: 400 }
      )
    }

    // ASIN選定エンジンを実行
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const engine = new AsinSelectionEngine(supabaseUrl, supabaseKey)
    const result = await engine.executeStrategy(strategy, user.id)

    return NextResponse.json({
      success: result.success,
      result,
      message: result.success
        ? `Successfully selected ${result.asins_selected} ASINs and queued ${result.asins_queued}`
        : 'Strategy execution failed'
    })
  } catch (error: any) {
    console.error('Execute strategy error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute strategy' },
      { status: 500 }
    )
  }
}
