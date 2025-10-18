/**
 * 最安値分析API
 * 
 * eBay検索結果から最安値を取得し、利益を計算
 * リサーチツール・データ編集で共通利用
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  analyzeLowestPrice, 
  calculateProfitAtLowestPrice,
  type CompetitorData 
} from '@/lib/research/profit-analyzer'

export async function POST(request: NextRequest) {
  try {
    const { 
      competitors, 
      actualCostJPY, 
      weightG, 
      exchangeRate = 150 
    } = await request.json()

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json(
        { error: '競合データが必要です' },
        { status: 400 }
      )
    }

    if (!weightG) {
      return NextResponse.json(
        { error: '重量情報が必要です' },
        { status: 400 }
      )
    }

    console.log(`📊 最安値分析開始: 競合${competitors.length}件, 重量${weightG}g`)

    // 最安値を分析
    const lowestPriceAnalysis = analyzeLowestPrice(competitors as CompetitorData[])

    console.log(`💰 最安値: $${lowestPriceAnalysis.lowestPrice}`)
    console.log(`📈 平均価格: $${lowestPriceAnalysis.averagePrice.toFixed(2)}`)
    console.log(`🏪 競合数: ${lowestPriceAnalysis.competitorCount}`)

    // 実際の仕入れ価格が指定されている場合、利益を計算
    let profitAnalysis = null
    if (actualCostJPY) {
      console.log(`🔢 仕入れ価格: ¥${actualCostJPY}で利益計算`)
      
      profitAnalysis = await calculateProfitAtLowestPrice(
        lowestPriceAnalysis.lowestPrice,
        actualCostJPY,
        weightG,
        exchangeRate
      )

      console.log(`✅ 利益率: ${profitAnalysis.profitMargin.toFixed(1)}%`)
      console.log(`💵 利益額: $${profitAnalysis.profitAmount.toFixed(2)} (¥${profitAnalysis.profitAmountJPY.toFixed(0)})`)
      console.log(`⚖️ 損益分岐点: ¥${profitAnalysis.breakEvenCostJPY.toFixed(0)}`)
      console.log(`🎯 推奨仕入れ価格: ¥${profitAnalysis.recommendedMaxCostJPY.toFixed(0)} 以下`)
    }

    return NextResponse.json({
      success: true,
      lowestPriceAnalysis,
      profitAnalysis,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ 最安値分析エラー:', error)
    return NextResponse.json(
      { error: error.message || '最安値分析に失敗しました' },
      { status: 500 }
    )
  }
}
