import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { QueueProcessor } from '@/lib/amazon/queue-processor'

// キュープロセッサーを手動で起動
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { batchSize = 10, maxProcessingTime = 3600000 } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const processor = new QueueProcessor(supabaseUrl, supabaseKey)

    // バックグラウンドで処理を開始（非同期）
    processor.startProcessing({ batchSize, maxProcessingTime }).catch(error => {
      console.error('Queue processor error:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Queue processor started',
      status: processor.getStatus()
    })
  } catch (error: any) {
    console.error('Start queue processor error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start queue processor' },
      { status: 500 }
    )
  }
}

// キュープロセッサーの状態を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 注: グローバルプロセッサーの状態を取得する場合
    // この実装では、各リクエストで新しいインスタンスが作成されるため、
    // 実際の運用では、プロセッサーをシングルトンとして管理するか、
    // 別のサービス（VPS上のバッチ処理など）で実行する必要があります

    return NextResponse.json({
      message: 'Queue processor status endpoint',
      note: 'This endpoint is for manual triggering. For production, use a separate batch service.'
    })
  } catch (error: any) {
    console.error('Get queue processor status error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get queue processor status' },
      { status: 500 }
    )
  }
}
