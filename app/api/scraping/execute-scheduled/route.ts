// API Route for executing scheduled scraping jobs
// This should be called by a cron job
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 実行すべきスケジュールを取得（scheduled_at が過去で status が pending）
    const { data: schedules, error: fetchError } = await supabase
      .from('scraping_schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10)  // 一度に最大10件

    if (fetchError) {
      console.error('[Execute Scheduled] 取得エラー:', fetchError)
      return NextResponse.json(
        { error: '取得失敗: ' + fetchError.message },
        { status: 500 }
      )
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({
        message: '実行すべきスケジュールがありません',
        executed: 0
      })
    }

    console.log(`[Execute Scheduled] ${schedules.length}件のスケジュールを実行します`)

    const results = []

    for (const schedule of schedules) {
      try {
        // スケジュールのステータスを running に更新
        await supabase
          .from('scraping_schedules')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', schedule.id)

        // スクレイピング実行
        const scrapeResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scraping/execute`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              urls: schedule.urls,
              platforms: schedule.platforms || []
            })
          }
        )

        const scrapeData = await scrapeResponse.json()

        // 結果をDBに保存
        await supabase
          .from('scraping_schedules')
          .update({
            status: 'completed',
            last_run_at: new Date().toISOString(),
            next_run_at: schedule.repeat_pattern ? calculateNextRun(schedule.scheduled_at, schedule.repeat_pattern) : null,
            results: scrapeData,
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id)

        results.push({
          scheduleId: schedule.id,
          status: 'success',
          resultCount: scrapeData.results?.length || 0
        })

      } catch (error) {
        console.error(`[Execute Scheduled] スケジュールID ${schedule.id} 実行エラー:`, error)

        // エラーをDBに記録
        await supabase
          .from('scraping_schedules')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id)

        results.push({
          scheduleId: schedule.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      executed: results.length,
      results
    })

  } catch (error) {
    console.error('[Execute Scheduled] エラー:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// 次回実行時刻を計算
function calculateNextRun(lastRun: string, pattern: string): string {
  const lastRunDate = new Date(lastRun)

  switch (pattern) {
    case 'daily':
      lastRunDate.setDate(lastRunDate.getDate() + 1)
      break
    case 'weekly':
      lastRunDate.setDate(lastRunDate.getDate() + 7)
      break
    case 'monthly':
      lastRunDate.setMonth(lastRunDate.getMonth() + 1)
      break
    default:
      return lastRun
  }

  return lastRunDate.toISOString()
}

// GET method for manual trigger
export async function GET(request: NextRequest) {
  // Same as POST for compatibility with cron services
  return POST(request)
}
