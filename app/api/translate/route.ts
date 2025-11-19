// app/api/translate/route.ts
import { NextRequest, NextResponse } from 'next/server'

const GAS_TRANSLATE_URL = process.env.GOOGLE_APPS_SCRIPT_TRANSLATE_URL

/**
 * Google Apps Script翻訳APIのラッパー
 */
export async function POST(request: NextRequest) {
  try {
    if (!GAS_TRANSLATE_URL) {
      return NextResponse.json(
        { error: 'Google Apps Script URLが設定されていません' },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    console.log('📡 翻訳API呼び出し:', {
      type: body.type,
      textCount: body.texts?.length || (body.text ? 1 : 0)
    })

    // Google Apps Scriptに転送
    const response = await fetch(GAS_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`Google Apps Script API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || '翻訳に失敗しました')
    }

    console.log('✅ 翻訳完了')

    return NextResponse.json(result)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '翻訳に失敗しました'
    console.error('❌ 翻訳エラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage
      },
      { status: 500 }
    )
  }
}
