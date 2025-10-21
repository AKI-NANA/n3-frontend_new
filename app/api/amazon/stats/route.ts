import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 総商品数
    const { count: totalProducts } = await supabase
      .from('amazon_products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // 平均スコア
    const { data: avgScoreData } = await supabase
      .from('amazon_products')
      .select('profit_score')
      .eq('user_id', user.id)
      .not('profit_score', 'is', null)

    const avgProfitScore = avgScoreData && avgScoreData.length > 0
      ? avgScoreData.reduce((sum, p) => sum + (p.profit_score || 0), 0) / avgScoreData.length
      : 0

    // 高利益商品数（スコア80以上）
    const { count: highProfitCount } = await supabase
      .from('amazon_products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('profit_score', 80)

    // 在庫あり商品数
    const { count: inStockCount } = await supabase
      .from('amazon_products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('availability_status', 'In Stock')

    return NextResponse.json({
      totalProducts: totalProducts || 0,
      avgProfitScore: avgProfitScore || 0,
      highProfitCount: highProfitCount || 0,
      inStockCount: inStockCount || 0
    })
  } catch (error: any) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get stats' },
      { status: 500 }
    )
  }
}
