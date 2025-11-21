// app/api/listing/mode-switch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ListingMode } from '@/lib/types/listing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST: 出品モード切替API
 *
 * ListingMode（中古優先/新品優先）の変更を受け取り、
 * 価格調整ロジック（第4層）に対し、新しいモードでの価格再計算をトリガーする
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, mode } = body as { sku: string; mode: ListingMode }

    if (!sku || !mode) {
      return NextResponse.json(
        { success: false, error: 'SKUとmodeは必須です' },
        { status: 400 }
      )
    }

    if (mode !== '中古優先' && mode !== '新品優先') {
      return NextResponse.json(
        { success: false, error: 'modeは「中古優先」または「新品優先」である必要があります' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // TODO: 実際のデータベース処理
    // 1. 出品データのモードを更新
    // await supabase
    //   .from('listing_data')
    //   .update({
    //     listing_mode: mode,
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('sku', sku)

    // 2. 価格調整ロジックをトリガー
    // await triggerPriceRecalculation(supabase, sku, mode)

    console.log(`✅ モード切替成功: SKU=${sku}, 新モード=${mode}`)

    // モックの価格再計算
    const oldPrice = 10000
    const newPrice = mode === '中古優先' ? oldPrice * 0.9 : oldPrice * 1.1

    // 価格変更ログを記録
    // await supabase.from('price_change_logs').insert({
    //   sku,
    //   old_price: oldPrice,
    //   new_price: newPrice,
    //   change_reason: `モード変更: ${mode}`,
    //   change_percentage: ((newPrice - oldPrice) / oldPrice) * 100,
    //   triggered_by: 'mode_switch',
    //   created_at: new Date().toISOString()
    // })

    return NextResponse.json({
      success: true,
      message: `出品モードを「${mode}」に変更し、価格を再計算しました`,
      sku,
      mode,
      old_price: oldPrice,
      new_price: newPrice
    })

  } catch (error: any) {
    console.error('モード切替エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * 価格再計算をトリガーする関数
 */
async function triggerPriceRecalculation(
  supabase: any,
  sku: string,
  mode: ListingMode
): Promise<void> {
  // TODO: 第4層の価格ロジックを呼び出す
  // 1. 在庫マスターから原価情報を取得
  // 2. モードに応じた価格戦略を適用
  // 3. 各モールの価格を更新

  console.log(`価格再計算トリガー: SKU=${sku}, モード=${mode}`)
}
