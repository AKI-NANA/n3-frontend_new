import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * GET /api/amazon/config
 * 全てのAmazon自動取得設定を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data, error } = await supabase
      .from('amazon_config')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching Amazon config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Get Amazon config error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get Amazon config' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/amazon/config
 * 新しい設定を保存または既存の設定を更新
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()
    const { id, ...updates } = body

    if (id) {
      // 更新
      const { data, error } = await supabase
        .from('amazon_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating Amazon config:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // 新規作成
      const { data, error } = await supabase
        .from('amazon_config')
        .insert(updates)
        .select()
        .single()

      if (error) {
        console.error('Error inserting Amazon config:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error: any) {
    console.error('Save Amazon config error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save Amazon config' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/amazon/config
 * 設定を削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('amazon_config')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting Amazon config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete Amazon config error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete Amazon config' },
      { status: 500 }
    )
  }
}
