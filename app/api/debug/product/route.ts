// app/api/debug/product/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'IDパラメータが必要です' },
        { status: 400 }
      )
    }

    console.log(`🔍 デバッグ: 商品ID=${id} (型: ${typeof id})`)

    // 複数の方法で検索を試みる
    const results: any = {
      id: id,
      idType: typeof id,
      queries: []
    }

    // 1. 文字列として検索
    const { data: data1, error: error1 } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', id)
      .single()

    results.queries.push({
      method: 'eq with string',
      success: !error1,
      error: error1?.message,
      data: data1 ? {
        id: data1.id,
        idType: typeof data1.id,
        title: data1.title?.substring(0, 50),
        price_jpy: data1.price_jpy,
        listing_data_exists: !!data1.listing_data,
        listing_data_weight: data1.listing_data?.weight_g,
        listing_data_keys: data1.listing_data ? Object.keys(data1.listing_data) : []
      } : null
    })

    // 2. 数値に変換して検索
    const numId = parseInt(id, 10)
    if (!isNaN(numId)) {
      const { data: data2, error: error2 } = await supabase
        .from('products_master')
        .select('*')
        .eq('id', numId)
        .single()

      results.queries.push({
        method: 'eq with number',
        success: !error2,
        error: error2?.message,
        data: data2 ? {
          id: data2.id,
          idType: typeof data2.id,
          title: data2.title?.substring(0, 50),
          price_jpy: data2.price_jpy,
          listing_data_exists: !!data2.listing_data,
          listing_data_weight: data2.listing_data?.weight_g
        } : null
      })
    }

    // 3. inクエリで検索（配列）
    const { data: data3, error: error3 } = await supabase
      .from('products_master')
      .select('*')
      .in('id', [id])

    results.queries.push({
      method: 'in with string array',
      success: !error3,
      error: error3?.message,
      count: data3?.length || 0,
      data: data3?.[0] ? {
        id: data3[0].id,
        idType: typeof data3[0].id,
        title: data3[0].title?.substring(0, 50),
        price_jpy: data3[0].price_jpy,
        listing_data_exists: !!data3[0].listing_data,
        listing_data_weight: data3[0].listing_data?.weight_g
      } : null
    })

    // 4. テーブル構造を確認
    const { data: sample, error: sampleError } = await supabase
      .from('products_master')
      .select('*')
      .limit(1)
      .single()

    results.tableInfo = {
      sampleIdType: sample ? typeof sample.id : 'unknown',
      sampleId: sample?.id,
      columns: sample ? Object.keys(sample) : []
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    console.error('❌ デバッグエラー:', error)
    return NextResponse.json(
      { error: error.message || 'デバッグ中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
