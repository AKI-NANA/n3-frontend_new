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

  } catch (error: any) {
    console.error('❌ 翻訳エラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || '翻訳に失敗しました' 
      },
      { status: 500 }
    )
  }
}

/**
 * 単一テキスト翻訳のヘルパー関数
 */
export async function translateText(text: string): Promise<string> {
  if (!text || text.trim() === '') return text

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'single',
        text,
        sourceLang: 'ja',
        targetLang: 'en'
      })
    })

    const result = await response.json()
    
    if (result.success && result.translated) {
      return result.translated
    }
    
    return text
  } catch (error) {
    console.error('Translation error:', error)
    return text
  }
}

/**
 * バッチ翻訳のヘルパー関数
 */
export async function translateBatch(texts: string[]): Promise<string[]> {
  if (!texts || texts.length === 0) return texts

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'batch',
        texts,
        sourceLang: 'ja',
        targetLang: 'en'
      })
    })

    const result = await response.json()
    
    if (result.success && result.results) {
      return result.results
    }
    
    return texts
  } catch (error) {
    console.error('Batch translation error:', error)
    return texts
  }
}
