import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AmazonUpdateQueue, QueueStats } from '@/types/amazon-strategy'

// キュー統計の取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'stats') {
      // キュー統計を取得
      const { data: queueItems, error } = await supabase
        .from('amazon_update_queue')
        .select('status, source, completed_at, started_at')

      if (error) throw error

      const stats: QueueStats = {
        total: queueItems?.length || 0,
        pending: queueItems?.filter(q => q.status === 'pending').length || 0,
        processing: queueItems?.filter(q => q.status === 'processing').length || 0,
        completed: queueItems?.filter(q => q.status === 'completed').length || 0,
        failed: queueItems?.filter(q => q.status === 'failed').length || 0,
        bySource: {}
      }

      // ソース別カウント
      queueItems?.forEach(item => {
        stats.bySource[item.source] = (stats.bySource[item.source] || 0) + 1
      })

      // 平均処理時間の計算
      const completedItems = queueItems?.filter(
        q => q.status === 'completed' && q.started_at && q.completed_at
      ) || []

      if (completedItems.length > 0) {
        const totalTime = completedItems.reduce((sum, item) => {
          const start = new Date(item.started_at!).getTime()
          const end = new Date(item.completed_at!).getTime()
          return sum + (end - start)
        }, 0)
        stats.avgProcessingTime = totalTime / completedItems.length / 1000 // 秒単位
      }

      return NextResponse.json({ stats })
    } else {
      // キューアイテム一覧を取得
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')
      const status = searchParams.get('status')

      let query = supabase
        .from('amazon_update_queue')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (status) {
        query = query.eq('status', status)
      }

      query = query.range(offset, offset + limit - 1)

      const { data: queueItems, error } = await query

      if (error) throw error

      return NextResponse.json({ queueItems: queueItems || [] })
    }
  } catch (error: any) {
    console.error('Get queue error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get queue' },
      { status: 500 }
    )
  }
}

// キューへのASIN追加
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { asins, source = 'manual', priority = 5 } = body

    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      return NextResponse.json({ error: 'ASINs array required' }, { status: 400 })
    }

    // 既にキューに存在するASINをチェック
    const { data: existingQueue, error: checkError } = await supabase
      .from('amazon_update_queue')
      .select('asin')
      .in('asin', asins)
      .in('status', ['pending', 'processing'])

    if (checkError) throw checkError

    const existingAsins = new Set(existingQueue?.map(q => q.asin) || [])
    const newAsins = asins.filter(asin => !existingAsins.has(asin))

    if (newAsins.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All ASINs already in queue',
        added: 0,
        skipped: asins.length
      })
    }

    // 新しいASINをキューに追加
    const queueItems: Partial<AmazonUpdateQueue>[] = newAsins.map(asin => ({
      asin,
      source,
      priority,
      status: 'pending',
      retry_count: 0,
      scheduled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('amazon_update_queue')
      .insert(queueItems)
      .select()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      added: newAsins.length,
      skipped: asins.length - newAsins.length,
      queueItems: inserted
    })
  } catch (error: any) {
    console.error('Add to queue error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add to queue' },
      { status: 500 }
    )
  }
}

// キューアイテムの削除/リセット
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    if (action === 'clear_completed') {
      // 完了済みアイテムをクリア
      const { error } = await supabase
        .from('amazon_update_queue')
        .delete()
        .eq('status', 'completed')

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Completed items cleared' })
    } else if (action === 'reset_failed') {
      // 失敗アイテムをリセット
      const { error } = await supabase
        .from('amazon_update_queue')
        .update({
          status: 'pending',
          retry_count: 0,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('status', 'failed')

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Failed items reset' })
    } else if (id) {
      // 特定のアイテムを削除
      const { error } = await supabase
        .from('amazon_update_queue')
        .delete()
        .eq('id', id)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Item deleted' })
    } else {
      return NextResponse.json({ error: 'Invalid action or missing ID' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Queue delete/reset error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete/reset queue' },
      { status: 500 }
    )
  }
}
