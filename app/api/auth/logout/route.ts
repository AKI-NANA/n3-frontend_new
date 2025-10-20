import { supabase } from '@/lib/auth/supabase'
import { NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * ログアウト処理
 */
export async function POST() {
  try {
    await supabase.auth.signOut()
    
    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
