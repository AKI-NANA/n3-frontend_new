/**
 * チェック頻度制御API
 * Shopeeセール時の高頻度チェック切り替え
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  setHighFrequencyForShopee,
  resetToNormalFrequency,
} from '@/services/InventoryTracker'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_ids, frequency } = body

    if (!product_ids || !Array.isArray(product_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'product_ids array is required',
        },
        { status: 400 }
      )
    }

    if (!frequency || !['通常', '高頻度'].includes(frequency)) {
      return NextResponse.json(
        {
          success: false,
          error: 'frequency must be "通常" or "高頻度"',
        },
        { status: 400 }
      )
    }

    console.log(`[API] チェック頻度変更: ${product_ids.length}件を${frequency}に設定`)

    if (frequency === '高頻度') {
      await setHighFrequencyForShopee(product_ids)
    } else {
      await resetToNormalFrequency(product_ids)
    }

    return NextResponse.json({
      success: true,
      message: `${product_ids.length}件の商品のチェック頻度を${frequency}に変更しました`,
      updated_count: product_ids.length,
    })
  } catch (error: any) {
    console.error('[API] チェック頻度変更エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
