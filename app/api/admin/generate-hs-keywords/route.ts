// app/api/admin/generate-hs-keywords/route.ts
// 管理者用: HSコードキーワード一括生成API

import { NextRequest, NextResponse } from 'next/server'
import { HSKeywordGeneratorService, HsInput } from '@/lib/services/hts/HSKeywordGeneratorService'

/**
 * HSコードキーワード一括生成API
 *
 * リクエストボディ:
 * {
 *   hsCodes: Array<{ hs_code: string, description_ja?: string, description_en?: string }>
 * }
 *
 * レスポンス:
 * {
 *   total: number,
 *   succeeded: number,
 *   failed: number,
 *   errors?: Array<{ hs_code: string, error: string }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hsCodes } = body

    // バリデーション
    if (!hsCodes || !Array.isArray(hsCodes)) {
      return NextResponse.json(
        { error: 'hsCodesが配列形式で必要です' },
        { status: 400 }
      )
    }

    if (hsCodes.length === 0) {
      return NextResponse.json(
        { error: 'hsCodesが空です' },
        { status: 400 }
      )
    }

    console.log(`🚀 キーワード生成API呼び出し: ${hsCodes.length}件のHSコード`)

    // HSKeywordGeneratorServiceのインスタンス作成
    const service = new HSKeywordGeneratorService()

    // キーワード生成実行
    const result = await service.processAllHsCodes(hsCodes as HsInput[])

    console.log(`✅ キーワード生成完了: 成功 ${result.succeeded}件, 失敗 ${result.failed}件`)

    // レスポンス
    return NextResponse.json({
      total: result.total,
      completed: result.completed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors || []
    })

  } catch (error: any) {
    console.error('❌ キーワード生成APIエラー:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * 既存のHSコードリストを取得するAPI（オプション）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hsCode = searchParams.get('hs_code')

    if (!hsCode) {
      return NextResponse.json(
        { error: 'hs_codeパラメータが必要です' },
        { status: 400 }
      )
    }

    const service = new HSKeywordGeneratorService()
    const keywords = await service.getKeywordsByHsCode(hsCode)

    if (!keywords) {
      return NextResponse.json(
        { error: 'キーワードが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(keywords)

  } catch (error: any) {
    console.error('❌ キーワード取得エラー:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error.message },
      { status: 500 }
    )
  }
}
