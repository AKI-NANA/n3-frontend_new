import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tableName = searchParams.get('table')

    if (!tableName) {
      return NextResponse.json({
        success: false,
        error: 'テーブル名が指定されていません'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase環境変数が設定されていません'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // テーブルのカラム情報を取得（最初の1件から推測）
    const { data: firstRow, error: firstRowError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (firstRowError) {
      throw firstRowError
    }

    // カラム情報を生成
    const columns = firstRow && firstRow.length > 0
      ? Object.keys(firstRow[0]).map(key => ({
          name: key,
          type: typeof firstRow[0][key],
          nullable: firstRow[0][key] === null
        }))
      : []

    // サンプルデータを取得（最初の3件）
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(3)

    if (sampleError) {
      throw sampleError
    }

    // レコード数を取得
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw countError
    }

    return NextResponse.json({
      success: true,
      detail: {
        name: tableName,
        columns,
        sampleData: sampleData || [],
        rowCount: count || 0
      }
    })

  } catch (error: any) {
    console.error('Failed to fetch table detail:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'テーブル詳細の取得に失敗しました'
    }, { status: 500 })
  }
}
