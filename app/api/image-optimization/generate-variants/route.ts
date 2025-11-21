/**
 * 画像最適化 API - P1/P2/P3 自動生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateZoomVariants } from '@/lib/services/image/ImageProcessorService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, sku } = body

    if (!imageUrl || !sku) {
      return NextResponse.json(
        { error: 'imageUrl と sku が必要です' },
        { status: 400 }
      )
    }

    console.log('[API] P1/P2/P3 生成開始:', { imageUrl, sku })

    // P1/P2/P3 を生成
    const variants = await generateZoomVariants(imageUrl, sku)

    console.log('[API] P1/P2/P3 生成完了:', variants.length)

    return NextResponse.json({
      success: true,
      variants: variants.map((v) => ({
        variant: v.variant,
        zoom: v.zoom,
        url: v.url,
      })),
    })
  } catch (error) {
    console.error('[API] P1/P2/P3 生成エラー:', error)
    return NextResponse.json(
      {
        error: '画像生成中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
