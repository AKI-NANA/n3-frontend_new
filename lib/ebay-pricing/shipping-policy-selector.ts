/**
 * 送料上限を考慮したポリシー選択
 * 
 * 送料が上限を超える場合:
 * 1. より重い重量帯のポリシーを選択
 * 2. 表示送料は上限内
 * 3. 差額は利益から控除（ただし赤字にはしない）
 */

import { createClient } from '@/lib/supabase/client'

export interface ShippingPolicySelection {
  recommendedWeight: number  // 推奨重量帯
  displayShipping: number    // 表示送料（上限内）
  actualCost: number         // 実際の送料コスト
  profitReduction: number    // 利益減少額
  isViable: boolean          // 出品可能か
  reason: string
}

/**
 * 送料上限を考慮した最適なポリシーを選択
 */
export async function selectOptimalShippingPolicy(params: {
  actualWeight: number       // 実際の重量
  baseShipping: number       // 実送料（DDP費用除く）
  ddpFee: number            // DDP費用
  shippingLimit: number     // eBay送料上限
  targetMargin: number      // 目標利益率
  productPrice: number      // 商品価格
}): Promise<ShippingPolicySelection> {
  const {
    actualWeight,
    baseShipping,
    ddpFee,
    shippingLimit,
    targetMargin,
    productPrice
  } = params

  const totalShipping = baseShipping + ddpFee

  // ケース1: 送料が上限内 → 問題なし
  if (totalShipping <= shippingLimit) {
    return {
      recommendedWeight: actualWeight,
      displayShipping: totalShipping,
      actualCost: totalShipping,
      profitReduction: 0,
      isViable: true,
      reason: '送料上限内のため問題なし'
    }
  }

  // ケース2: 送料が上限を超える
  const excessAmount = totalShipping - shippingLimit

  console.log(`⚠️ 送料$${totalShipping.toFixed(2)}が上限$${shippingLimit}を超過`)
  console.log(`💡 より重い重量帯のポリシーを使用することを推奨`)

  // DBから利用可能な重量帯を取得
  const supabase = createClient()
  const { data: rates } = await supabase
    .from('usa_ddp_rates')
    .select('weight, price_50, price_100, price_200, price_500')
    .gte('weight', actualWeight)
    .order('weight', { ascending: true })

  if (!rates || rates.length === 0) {
    return {
      recommendedWeight: actualWeight,
      displayShipping: shippingLimit,
      actualCost: totalShipping,
      profitReduction: excessAmount,
      isViable: excessAmount < productPrice * (targetMargin / 100),
      reason: '送料ポリシーが見つからないため、差額を利益から控除'
    }
  }

  // より重い重量帯を探す
  // 表示送料が上限内に収まるポリシーを見つける
  for (const rate of rates) {
    // この重量帯の送料を計算（簡易）
    const estimatedShipping = rate.price_50 || baseShipping * 1.2
    
    if (estimatedShipping >= totalShipping) {
      // この重量帯なら実送料をカバーできる
      const profitLoss = excessAmount  // 上限との差額分は利益減
      
      return {
        recommendedWeight: rate.weight,
        displayShipping: shippingLimit,
        actualCost: totalShipping,
        profitReduction: profitLoss,
        isViable: profitLoss < productPrice * (targetMargin / 100),
        reason: `${rate.weight}kgポリシーを使用（実送料$${totalShipping.toFixed(2)}をカバー）。` +
                `差額$${profitLoss.toFixed(2)}は利益から控除。`
      }
    }
  }

  // どのポリシーでもカバーできない場合
  return {
    recommendedWeight: actualWeight,
    displayShipping: shippingLimit,
    actualCost: totalShipping,
    profitReduction: excessAmount,
    isViable: false,
    reason: `送料$${totalShipping.toFixed(2)}が高すぎて、利用可能なポリシーでカバーできません。` +
            `商品価格を上げるか、出品を見送ることを推奨します。`
  }
}

/**
 * 送料上限調整後の最終価格を計算
 */
export function calculateFinalPriceWithShippingAdjustment(params: {
  productPrice: number
  policySelection: ShippingPolicySelection
  targetMargin: number
}): {
  adjustedProductPrice: number
  displayShipping: number
  actualProfit: number
  actualMargin: number
  warnings: string[]
} {
  const { productPrice, policySelection, targetMargin } = params

  const warnings: string[] = []

  // 利益減少を商品価格に転嫁するオプション
  // ただし、これはDDUバイヤーに不利になるため推奨しない
  
  // 現状維持: 商品価格は変えず、利益が減る
  const totalRevenue = productPrice + policySelection.displayShipping
  const actualProfit = totalRevenue - policySelection.actualCost - productPrice
  const actualMargin = (actualProfit / totalRevenue) * 100

  if (policySelection.profitReduction > 0) {
    warnings.push(
      `送料ポリシー調整により利益が$${policySelection.profitReduction.toFixed(2)}減少。` +
      `実質利益率${actualMargin.toFixed(1)}%`
    )
  }

  if (actualMargin < targetMargin - 5) {
    warnings.push(`目標利益率${targetMargin}%に対し、実質${actualMargin.toFixed(1)}%に低下`)
  }

  if (!policySelection.isViable) {
    warnings.push(`⚠️ 利益減少が大きすぎるため、出品を推奨しません`)
  }

  return {
    adjustedProductPrice: productPrice,  // 変更なし
    displayShipping: policySelection.displayShipping,
    actualProfit,
    actualMargin,
    warnings
  }
}
