/**
 * 画像ルール API
 * GET: 画像ルールを取得
 * POST: 画像ルールを作成
 * PUT: 画像ルールを更新
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const marketplace = searchParams.get('marketplace')

    if (!marketplace) {
      return NextResponse.json(
        { error: 'marketplace パラメータが必要です' },
        { status: 400 }
      )
    }

    // 現在のユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      // ユーザーが認証されていない場合はデフォルトルールを返す
      return NextResponse.json({
        account_id: '',
        marketplace,
        watermark_enabled: false,
        watermark_image_url: null,
        watermark_position: 'bottom-right',
        watermark_opacity: 0.8,
        watermark_scale: 0.15,
        skip_watermark_for_amazon: true,
        auto_resize: true,
        target_size_px: 1600,
        quality: 90,
      })
    }

    // 画像ルールを取得
    const { data, error } = await supabase
      .from('image_rules')
      .select('*')
      .eq('account_id', user.id)
      .eq('marketplace', marketplace)
      .single()

    if (error) {
      // データが見つからない場合はデフォルトルールを返す
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          account_id: user.id,
          marketplace,
          watermark_enabled: false,
          watermark_image_url: null,
          watermark_position: 'bottom-right',
          watermark_opacity: 0.8,
          watermark_scale: 0.15,
          skip_watermark_for_amazon: true,
          auto_resize: true,
          target_size_px: 1600,
          quality: 90,
        })
      }

      console.error('画像ルール取得エラー:', error)
      return NextResponse.json({ error: '画像ルールの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API エラー:', error)
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 画像ルールを作成
    const { data, error } = await supabase
      .from('image_rules')
      .insert({
        ...body,
        account_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('画像ルール作成エラー:', error)
      return NextResponse.json({ error: '画像ルールの作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('API エラー:', error)
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id が必要です' }, { status: 400 })
    }

    // 現在のユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 画像ルールを更新
    const { data, error } = await supabase
      .from('image_rules')
      .update(updates)
      .eq('id', id)
      .eq('account_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('画像ルール更新エラー:', error)
      return NextResponse.json({ error: '画像ルールの更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API エラー:', error)
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 })
  }
}
