// API Route for scheduling scraping jobs
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// スケジュール済みジョブの作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, platforms, scheduledAt, repeat } = body

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLsは必須です' },
        { status: 400 }
      )
    }

    // スケジュールをDBに保存
    const { data, error } = await supabase
      .from('scraping_schedules')
      .insert([
        {
          urls: urls,
          platforms: platforms || [],
          scheduled_at: scheduledAt || new Date().toISOString(),
          repeat_pattern: repeat || null, // 'daily', 'weekly', etc.
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('[Schedule] DB保存エラー:', error)
      return NextResponse.json(
        { error: 'スケジュール保存失敗: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      schedule: data[0],
      message: 'スクレイピングをスケジュールしました'
    })

  } catch (error) {
    console.error('[Schedule] エラー:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// スケジュール一覧取得
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('scraping_schedules')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: 'スケジュール取得失敗: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ schedules: data })

  } catch (error) {
    console.error('[Schedule] エラー:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// スケジュール削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'IDは必須です' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('scraping_schedules')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'スケジュール削除失敗: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Schedule] エラー:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
