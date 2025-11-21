/**
 * 無在庫輸入商品取得API
 *
 * GET /api/dropship/products
 * Query: status, minScore, supplier, limit, offset
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDropshipProducts, getListingCandidates, getDashboardStats } from '@/lib/dropship/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    // ダッシュボード統計情報を取得
    if (action === 'stats') {
      const { data: stats, error } = await getDashboardStats()

      if (error) {
        return NextResponse.json(
          { error: '統計情報取得に失敗しました' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        stats,
      })
    }

    // 出品候補を取得
    if (action === 'candidates') {
      const { data: candidates, error } = await getListingCandidates()

      if (error) {
        return NextResponse.json(
          { error: '出品候補取得に失敗しました' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        products: candidates || [],
        count: candidates?.length || 0,
      })
    }

    // 通常の商品一覧取得
    const status = searchParams.get('status')?.split(',')
    const minScore = searchParams.get('minScore')
    const supplier = searchParams.get('supplier')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const { data: products, error } = await getDropshipProducts({
      status,
      minScore: minScore ? parseFloat(minScore) : undefined,
      supplier: supplier || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })

    if (error) {
      return NextResponse.json(
        { error: '商品取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      count: products?.length || 0,
    })
  } catch (error) {
    console.error('[Products API] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
