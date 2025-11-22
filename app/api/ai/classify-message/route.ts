/**
 * AIメッセージ分類API
 * Gemini APIを使用してメッセージの緊急度を自動判定
 */

import { NextRequest, NextResponse } from 'next/server'
import { classifyMessageUrgency } from '@/lib/ai/gemini-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subject, body: messageBody, marketplace } = body

    if (!subject || !messageBody) {
      return NextResponse.json(
        {
          success: false,
          error: 'subject and body are required',
        },
        { status: 400 }
      )
    }

    console.log('[AI] メッセージ分類実行')

    const result = await classifyMessageUrgency({
      subject,
      body: messageBody,
      marketplace: marketplace || 'unknown',
    })

    return NextResponse.json({
      success: true,
      urgency_level: result.urgency_level,
      category: result.category,
      reasoning: result.reasoning,
      suggested_response: result.suggested_response,
    })
  } catch (error: any) {
    console.error('[AI] メッセージ分類エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
