// app/api/inventory-monitoring/changes/mark-completed/route.ts
// 変動を手動完了としてマーク

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { changeIds } = body

    if (!changeIds || !Array.isArray(changeIds) || changeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '変動IDが指定されていません' },
        { status: 400 }
      )
    }

    // ステータスをappliedに更新
    const { error } = await supabase
      .from('inventory_changes')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        notes: '手動で完了としてマーク',
      })
      .in('id', changeIds)

    if (error) throw error

    return NextResponse.json({
      success: true,
      updated: changeIds.length,
      message: `${changeIds.length}件を完了としてマークしました`,
    })
  } catch (error: any) {
    console.error('❌ 完了マークエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '完了マークに失敗しました',
      },
      { status: 500 }
    )
  }
}
