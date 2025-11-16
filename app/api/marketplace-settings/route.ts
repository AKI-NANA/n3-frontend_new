import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * マーケットプレイス設定API
 * GET /api/marketplace-settings - 設定取得
 * POST /api/marketplace-settings - 設定作成・更新
 * PUT /api/marketplace-settings - 設定更新
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const marketplace = searchParams.get('marketplace')
    const accountId = searchParams.get('account_id')
    
    let query = supabase.from('marketplace_settings').select('*')
    
    if (marketplace) {
      query = query.eq('marketplace', marketplace)
    }
    
    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    
    const { data, error } = await query.order('marketplace').order('account_id')
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Marketplace settings GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('marketplace_settings')
      .upsert({
        ...body,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'marketplace,account_id'
      })
      .select()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      message: '設定を保存しました',
      data 
    })
  } catch (error: any) {
    console.error('Marketplace settings POST error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'IDが必要です' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('marketplace_settings')
      .update({ 
        ...updates, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      message: '設定を更新しました',
      data 
    })
  } catch (error: any) {
    console.error('Marketplace settings PUT error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'IDが必要です' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('marketplace_settings')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      message: '設定を削除しました'
    })
  } catch (error: any) {
    console.error('Marketplace settings DELETE error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
