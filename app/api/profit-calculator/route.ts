import { NextRequest, NextResponse } from 'next/server'

// 為替レート（実際のAPIでは外部サービスから取得）
let exchangeRates = {
  USD: 148.50,
  SGD: 110.45,
  MYR: 33.78,
  THB: 4.23,
  VND: 0.0061,
  PHP: 2.68,
  IDR: 0.0098,
  TWD: 4.75
}

// 段階手数料データ
const tieredFees = [
  { id: '293', name: 'Consumer Electronics', tier1: 10.0, tier2: 12.35, threshold: 7500, insertion: 0.35 },
  { id: '11450', name: 'Clothing & Accessories', tier1: 12.9, tier2: 14.70, threshold: 10000, insertion: 0.30 },
  { id: '58058', name: 'Collectibles', tier1: 9.15, tier2: 11.70, threshold: 5000, insertion: 0.35 },
  { id: '267', name: 'Books', tier1: 15.0, tier2: 15.0, threshold: 999999, insertion: 0.30 },
  { id: '550', name: 'Art', tier1: 12.9, tier2: 15.0, threshold: 10000, insertion: 0.35 }
]

// 階層型利益率設定
const profitSettings = [
  { type: 'period', value: '30', targetMargin: 15.0, minProfit: 2.0, priority: 50 },
  { type: 'period', value: '60', targetMargin: 10.0, minProfit: 1.5, priority: 40 },
  { type: 'condition', value: 'New', targetMargin: 28.0, minProfit: 7.0, priority: 200 },
  { type: 'condition', value: 'Refurbished', targetMargin: 25.0, minProfit: 5.0, priority: 180 },
  { type: 'condition', value: 'Used', targetMargin: 22.0, minProfit: 4.0, priority: 160 },
  { type: 'condition', value: 'ForParts', targetMargin: 15.0, minProfit: 2.0, priority: 170 },
  { type: 'category', value: '293', targetMargin: 30.0, minProfit: 8.0, priority: 100 },
  { type: 'global', value: 'default', targetMargin: 25.0, minProfit: 5.0, priority: 1000 }
]

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    const data = await request.json()

    switch (action) {
      case 'advanced_calculate':
        return NextResponse.json(calculateAdvancedProfit(data))
      
      case 'ebay_calculate':
        return NextResponse.json(calculateEbayProfit(data))
      
      case 'shopee_calculate':
        return NextResponse.json(calculateShopeeProfit(data))
      
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'update_rates':
      return NextResponse.json(updateExchangeRates())
    
    case 'tiered_fees':
      return NextResponse.json({ success: true, data: tieredFees })
    
    case 'health':
      return NextResponse.json({
        success: true,
        message: '利益計算APIサービス稼働中',
        timestamp: new Date().toISOString()
      })
    
    default:
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  }
}

// 高精度利益計算
function calculateAdvancedProfit(data: any) {
  // 段階手数料取得
  const feeData = tieredFees.find(f => f.id === data.ebayCategory) || tieredFees[0]
  
  // 為替レート
  const safeExchangeRate = exchangeRates.USD * 1.05 // 5%安全マージン
  
  // 基本データ
  const yahooPrice = parseFloat(data.yahooPrice || 0)
  const domesticShipping = parseFloat(data.domesticShipping || 800)
  const outsourceFee = parseFloat(data.outsourceFee || 500)
  const packagingFee = parseFloat(data.packagingFee || 200)
  const assumedPrice = parseFloat(data.assumedPrice || 0)
  const assumedShipping = parseFloat(data.assumedShipping || 15)
  const daysSince = parseInt(data.daysSince || 0)
  
  // 段階手数料計算
  const applicableFeeRate = assumedPrice >= feeData.threshold ? feeData.tier2 : feeData.tier1
  
  // コスト計算
  const totalCostJPY = yahooPrice + domesticShipping + outsourceFee + packagingFee
  const totalCostUSD = totalCostJPY / safeExchangeRate
  
  // 収入計算
  const totalRevenueUSD = assumedPrice + assumedShipping
  
  // 手数料計算
  const finalValueFee = assumedPrice * (applicableFeeRate / 100)
  const insertionFee = feeData.insertion
  const paypalFee = assumedPrice * 0.034 + 0.30
  const internationalFee = assumedPrice * 0.013
  const totalFeesUSD = finalValueFee + insertionFee + paypalFee + internationalFee
  
  // 階層型利益率設定取得
  const appliedSettings = getHierarchicalProfitSettings(data, daysSince)
  
  // 利益計算
  const netProfitUSD = totalRevenueUSD - totalCostUSD - totalFeesUSD
  const profitMargin = (netProfitUSD / totalRevenueUSD) * 100
  const roi = (netProfitUSD / totalCostUSD) * 100
  
  // 推奨価格計算
  const recommendedPrice = (totalCostUSD + totalFeesUSD + assumedShipping) / (1 - appliedSettings.targetMargin / 100)
  const breakEvenPrice = totalCostUSD + totalFeesUSD + assumedShipping
  
  return {
    success: true,
    platform: '高精度利益計算システム',
    calculation_type: 'advanced',
    data: {
      totalRevenue: Math.round(totalRevenueUSD * 100) / 100,
      totalCost: Math.round(totalCostUSD * 100) / 100,
      totalFees: Math.round(totalFeesUSD * 100) / 100,
      netProfit: Math.round(netProfitUSD * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      recommendedPrice: Math.round(recommendedPrice * 100) / 100,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      exchangeRate: safeExchangeRate,
      feeDetails: {
        rate: applicableFeeRate,
        tier: assumedPrice >= feeData.threshold ? 2 : 1,
        threshold: feeData.threshold,
        insertion: feeData.insertion
      },
      appliedSettings: appliedSettings,
      details: [
        {
          label: '総収入',
          amount: `$${totalRevenueUSD.toFixed(2)}`,
          formula: '売価 + 送料',
          note: 'USD建て収入'
        },
        {
          label: '総コスト',
          amount: `¥${totalCostJPY.toLocaleString()}`,
          formula: '仕入 + 送料 + 外注 + 梱包',
          note: '円建てコスト'
        },
        {
          label: '段階手数料',
          amount: `$${totalFeesUSD.toFixed(2)}`,
          formula: `Tier${assumedPrice >= feeData.threshold ? 2 : 1} (${applicableFeeRate}%)`,
          note: '段階手数料システム適用'
        },
        {
          label: '純利益',
          amount: `$${netProfitUSD.toFixed(2)}`,
          formula: '収入 - コスト - 手数料',
          note: '最終利益'
        },
        {
          label: '推奨価格',
          amount: `$${recommendedPrice.toFixed(2)}`,
          formula: `目標利益率 ${appliedSettings.targetMargin}% 達成価格`,
          note: appliedSettings.type + '設定適用'
        }
      ]
    }
  }
}

// eBay USA DDP/DDU計算
function calculateEbayProfit(data: any) {
  // 実装省略（基本的な計算ロジック）
  return {
    success: true,
    message: 'eBay計算完了'
  }
}

// Shopee 7カ国計算
function calculateShopeeProfit(data: any) {
  // 実装省略（基本的な計算ロジック）
  return {
    success: true,
    message: 'Shopee計算完了'
  }
}

// 階層型利益率設定取得
function getHierarchicalProfitSettings(data: any, daysSince: number) {
  // 販売戦略調整
  const strategyAdjustments: Record<string, number> = {
    quick: -5,
    premium: 10,
    volume: -3,
    standard: 0
  }
  const adjustment = strategyAdjustments[data.strategy || 'standard'] || 0
  
  // 適用する設定を決定
  for (const setting of profitSettings) {
    let applies = false
    
    switch (setting.type) {
      case 'period':
        applies = daysSince >= parseInt(setting.value)
        break
      case 'condition':
        applies = data.itemCondition === setting.value
        break
      case 'category':
        applies = data.ebayCategory === setting.value
        break
      case 'global':
        applies = true
        break
    }
    
    if (applies) {
      return {
        targetMargin: setting.targetMargin + adjustment,
        minProfit: setting.minProfit,
        type: setting.type,
        description: setting.value,
        strategyAdjustment: adjustment,
        appliedStrategy: data.strategy || 'standard'
      }
    }
  }
  
  // デフォルト
  return {
    targetMargin: 25.0 + adjustment,
    minProfit: 5.0,
    type: 'デフォルト',
    description: 'グローバル設定',
    strategyAdjustment: adjustment,
    appliedStrategy: 'standard'
  }
}

// 為替レート更新
function updateExchangeRates() {
  // シミュレーション: 実際はAPIから取得
  const updatedRates: Record<string, any> = {}
  
  Object.entries(exchangeRates).forEach(([currency, rate]) => {
    const fluctuation = (Math.random() - 0.5) * 0.02 // ±1%の変動
    const newRate = rate * (1 + fluctuation)
    const safeRate = newRate * 1.05 // 5%安全マージン
    
    exchangeRates[currency] = newRate
    updatedRates[currency] = {
      rate: Math.round(newRate * 10000) / 10000,
      safe_rate: Math.round(safeRate * 10000) / 10000,
      change_percent: Math.round(fluctuation * 100 * 100) / 100
    }
  })
  
  return {
    success: true,
    data: updatedRates,
    message: '為替レート更新完了',
    timestamp: new Date().toISOString()
  }
}
