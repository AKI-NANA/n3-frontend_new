import { NextRequest, NextResponse } from 'next/server'
import { calculateShipping } from '@/lib/shipping-calculator'
import type { ShippingCalculationInput } from '@/lib/shipping-calculator'

export async function POST(request: NextRequest) {
  try {
    const body: ShippingCalculationInput = await request.json()

    // 入力検証
    if (!body.weight_g || body.weight_g < 1 || body.weight_g > 30000) {
      return NextResponse.json(
        { error: '重量は1g〜30,000gの範囲で指定してください' },
        { status: 400 }
      )
    }

    if (!body.length_cm || !body.width_cm || !body.height_cm) {
      return NextResponse.json(
        { error: 'サイズ（長さ・幅・高さ）を入力してください' },
        { status: 400 }
      )
    }

    if (!body.country_code) {
      return NextResponse.json(
        { error: '配送先国を選択してください' },
        { status: 400 }
      )
    }

    // 送料計算
    const results = await calculateShipping(body)

    return NextResponse.json({
      success: true,
      results,
      input: body
    })

  } catch (error) {
    console.error('送料計算API エラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '送料計算中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
