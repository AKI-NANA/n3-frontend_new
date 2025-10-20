import { supabase } from '@/lib/auth/supabase'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/me
 * 現在のログインユーザーの情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // プロフィール情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // 割り当てられたツールを取得
    let assignedTools: string[] = []
    if (profile?.role === 'OUTSOURCER') {
      const { data: tools } = await supabase
        .from('outsourcer_tools_permissions')
        .select('tool_id')
        .eq('outsourcer_id', user.id)
        .eq('is_enabled', true)
      
      if (tools) {
        assignedTools = tools.map(t => t.tool_id)
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name,
        role: profile?.role || 'VIEWER',
        is_active: profile?.is_active !== false,
      },
      assignedTools,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
