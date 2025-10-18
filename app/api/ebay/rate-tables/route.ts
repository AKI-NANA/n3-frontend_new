import { NextResponse } from 'next/server'
import {
  generateAllRateTables,
  getRateTableStats,
  getRateTablePreview
} from '@/lib/shipping/ebay-rate-table'

/**
 * GET /api/ebay/rate-tables
 * Rate Table統計情報取得
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const preview = searchParams.get('preview')
    const table = searchParams.get('table')

    // プレビューリクエスト
    if (preview === 'true' && table) {
      const limit = parseInt(searchParams.get('limit') || '50')
      const data = await getRateTablePreview(table, limit)
      return NextResponse.json({ success: true, data })
    }

    // 統計情報取得
    const stats = await getRateTableStats()
    return NextResponse.json({ success: true, stats })

  } catch (error) {
    console.error('Rate Table取得エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ebay/rate-tables
 * Rate Table生成実行
 */
export async function POST() {
  try {
    console.log('🚀 Rate Table生成API実行開始')

    const result = await generateAllRateTables()

    if (result.success) {
      console.log('✅ Rate Table生成成功')
      return NextResponse.json({
        success: true,
        message: '全Rate Tableを生成しました',
        ...result
      })
    } else {
      console.error('⚠️ 一部のRate Table生成に失敗')
      return NextResponse.json(
        {
          success: false,
          message: '一部のRate Table生成に失敗しました',
          ...result
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Rate Table生成エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ebay/rate-tables
 * Rate Table全削除
 */
export async function DELETE() {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    const { error } = await supabase
      .from('ebay_rate_table_entries')
      .delete()
      .neq('id', 0) // 全件削除

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      message: '全Rate Tableを削除しました'
    })

  } catch (error) {
    console.error('Rate Table削除エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      },
      { status: 500 }
    )
  }
}
