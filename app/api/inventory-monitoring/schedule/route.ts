// app/api/inventory-monitoring/schedule/route.ts
// スケジュール設定の取得・更新

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('monitoring_schedules')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = No rows found (許容)
      throw error
    }

    return NextResponse.json({
      success: true,
      schedule: data || null,
    })
  } catch (error: any) {
    console.error('❌ スケジュール取得エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'スケジュール取得に失敗しました',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      enabled,
      frequency,
      time_window_start,
      time_window_end,
      max_items_per_batch,
      delay_min_seconds,
      delay_max_seconds,
      random_time_offset_minutes,
      email_notification,
      notification_emails,
      notify_on_changes_only,
    } = body

    // 既存のスケジュールを取得
    const { data: existingSchedule } = await supabase
      .from('monitoring_schedules')
      .select('id')
      .limit(1)
      .single()

    let result

    if (existingSchedule) {
      // 更新
      result = await supabase
        .from('monitoring_schedules')
        .update({
          enabled,
          frequency,
          time_window_start,
          time_window_end,
          max_items_per_batch,
          delay_min_seconds,
          delay_max_seconds,
          random_time_offset_minutes,
          email_notification,
          notification_emails,
          notify_on_changes_only,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSchedule.id)
        .select()
        .single()
    } else {
      // 新規作成
      result = await supabase
        .from('monitoring_schedules')
        .insert({
          enabled,
          frequency,
          time_window_start,
          time_window_end,
          max_items_per_batch,
          delay_min_seconds,
          delay_max_seconds,
          random_time_offset_minutes,
          email_notification,
          notification_emails,
          notify_on_changes_only,
        })
        .select()
        .single()
    }

    if (result.error) throw result.error

    return NextResponse.json({
      success: true,
      schedule: result.data,
      message: 'スケジュール設定を更新しました',
    })
  } catch (error: any) {
    console.error('❌ スケジュール更新エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'スケジュール更新に失敗しました',
      },
      { status: 500 }
    )
  }
}
