/**
 * 送料計算ロジック（最終版）
 * 
 * フロー:
 * 1. 実重量からprice_60を取得（基準送料）
 * 2. DDP費用を計算
 * 3. 合計が重量帯の容量を超える → より重い重量帯を選択
 * 4. eBay送料上限チェック（特定カテゴリのみ） → 商品価格に転嫁
 */

import { createClient } from '@/lib/supabase/client'

export interface ShippingCalculationV2Result {
  // 基本情報
  actualWeight: number
  baseShippingFrom60: number  // price_60から取得した基準送料
  ddpFee: number
  totalShippingNeeded: number  // 必要な送料（基準+DDP）
  
  // 重量帯選択
  selectedWeightTier: number  // 実際に使う重量帯
  tierCapacity: number        // その重量帯の容量
  displayShipping: number     // 最終的な表示送料
  
  // eBay送料上限対応
  ebayShippingLimit: number | null
  productPriceAdjustment: number  // 商品価格への上乗せ
  
  // 判定
  isViable: boolean
  warnings: string[]
  debugInfo: string[]
}

/**
 * メイン計算関数
 */
export async function calculateShippingV2(params: {
  actualWeight: number
  productPrice: number
  tariffRate: number
  originCountry: string
  ebayCategory: string | null
}): Promise<ShippingCalculationV2Result> {
  const { actualWeight, productPrice, tariffRate, originCountry, ebayCategory } = params
  
  const warnings: string[] = []
  const debugInfo: string[] = []
  const supabase = createClient()

  debugInfo.push(`=== 送料計算開始 ===`)
  debugInfo.push(`実重量: ${actualWeight}kg`)
  debugInfo.push(`商品価格: $${productPrice}`)
  debugInfo.push(`関税率: ${(tariffRate * 100).toFixed(1)}%`)
  debugInfo.push(`原産国: ${originCountry}`)

  // ========================================
  // STEP 1: 実重量からprice_60を取得
  // ========================================
  
  const { data: baseTierData } = await supabase
    .from('usa_ddp_rates')
    .select('weight, price_60')
    .eq('weight', actualWeight)
    .single()

  if (!baseTierData) {
    return {
      actualWeight,
      baseShippingFrom60: 0,
      ddpFee: 0,
      totalShippingNeeded: 0,
      selectedWeightTier: actualWeight,
      tierCapacity: 0,
      displayShipping: 0,
      ebayShippingLimit: null,
      productPriceAdjustment: 0,
      isViable: false,
      warnings: ['重量帯データが見つかりません'],
      debugInfo
    }
  }

  const baseShipping = baseTierData.price_60
  debugInfo.push(``)
  debugInfo.push(`[STEP 1] 基準送料取得`)
  debugInfo.push(`  ${actualWeight}kgのprice_60: $${baseShipping}`)

  // ========================================
  // STEP 2: DDP費用を計算
  // ========================================
  
  const salesTaxRate = 0.08
  const ddpServiceFee = 15
  const effectiveDDPRate = tariffRate + salesTaxRate
  const ddpFee = productPrice * effectiveDDPRate + ddpServiceFee
  
  debugInfo.push(``)
  debugInfo.push(`[STEP 2] DDP費用計算`)
  debugInfo.push(`  関税: ${(tariffRate * 100).toFixed(1)}%`)
  debugInfo.push(`  販売税: ${(salesTaxRate * 100).toFixed(1)}%`)
  debugInfo.push(`  実効DDP率: ${(effectiveDDPRate * 100).toFixed(1)}%`)
  debugInfo.push(`  DDP費用: $${productPrice} × ${(effectiveDDPRate * 100).toFixed(1)}% + $${ddpServiceFee} = $${ddpFee.toFixed(2)}`)

  const totalShippingNeeded = baseShipping + ddpFee
  debugInfo.push(`  合計必要送料: $${baseShipping} + $${ddpFee.toFixed(2)} = $${totalShippingNeeded.toFixed(2)}`)

  // ========================================
  // STEP 3: 重量帯の容量チェック
  // ========================================
  
  debugInfo.push(``)
  debugInfo.push(`[STEP 3] 重量帯容量チェック`)
  debugInfo.push(`  ${actualWeight}kgの容量: $${baseShipping}`)
  debugInfo.push(`  必要な送料: $${totalShippingNeeded.toFixed(2)}`)

  let selectedTier = actualWeight
  let tierCapacity = baseShipping
  let canFitInOriginalTier = totalShippingNeeded <= baseShipping

  if (!canFitInOriginalTier) {
    debugInfo.push(`  ⚠️ 容量不足！より重い重量帯を探します`)
    
    // より重い重量帯を探す
    const { data: heavierTiers } = await supabase
      .from('usa_ddp_rates')
      .select('weight, price_60')
      .gt('weight', actualWeight)
      .gte('price_60', totalShippingNeeded)
      .order('weight', { ascending: true })
      .limit(1)

    if (heavierTiers && heavierTiers.length > 0) {
      selectedTier = heavierTiers[0].weight
      tierCapacity = heavierTiers[0].price_60
      debugInfo.push(`  ✅ ${selectedTier}kg重量帯を使用（容量$${tierCapacity}）`)
      warnings.push(
        `実重量${actualWeight}kgですが、DDP費用が高いため${selectedTier}kg重量帯を使用します。`
      )
    } else {
      debugInfo.push(`  ❌ 十分な容量の重量帯が見つかりません`)
      warnings.push(`送料$${totalShippingNeeded.toFixed(2)}をカバーできる重量帯がありません`)
      
      return {
        actualWeight,
        baseShippingFrom60: baseShipping,
        ddpFee,
        totalShippingNeeded,
        selectedWeightTier: actualWeight,
        tierCapacity: baseShipping,
        displayShipping: totalShippingNeeded,
        ebayShippingLimit: null,
        productPriceAdjustment: 0,
        isViable: false,
        warnings,
        debugInfo
      }
    }
  } else {
    debugInfo.push(`  ✅ ${actualWeight}kg重量帯で対応可能`)
  }

  // ========================================
  // STEP 4: eBay送料上限チェック（特定カテゴリのみ）
  // ========================================
  
  const ebayLimit = getEbayShippingLimit(ebayCategory)
  let finalDisplayShipping = totalShippingNeeded
  let productPriceAdjustment = 0

  debugInfo.push(``)
  debugInfo.push(`[STEP 4] eBay送料上限チェック`)
  debugInfo.push(`  カテゴリ: ${ebayCategory || 'なし'}`)
  debugInfo.push(`  送料上限: ${ebayLimit ? `$${ebayLimit}` : 'なし'}`)

  if (ebayLimit && totalShippingNeeded > ebayLimit) {
    productPriceAdjustment = totalShippingNeeded - ebayLimit
    finalDisplayShipping = ebayLimit
    
    debugInfo.push(`  ⚠️ 送料上限超過`)
    debugInfo.push(`  計算送料: $${totalShippingNeeded.toFixed(2)}`)
    debugInfo.push(`  上限: $${ebayLimit}`)
    debugInfo.push(`  超過額: $${productPriceAdjustment.toFixed(2)}`)
    debugInfo.push(`  → 商品価格に$${productPriceAdjustment.toFixed(2)}を転嫁`)
    
    warnings.push(
      `eBay規約により送料上限$${ebayLimit}。` +
      `差額$${productPriceAdjustment.toFixed(2)}を商品価格に上乗せします。`
    )
  } else if (ebayLimit) {
    debugInfo.push(`  ✅ 送料上限内`)
  } else {
    debugInfo.push(`  ✅ 送料上限なし`)
  }

  debugInfo.push(``)
  debugInfo.push(`[結果]`)
  debugInfo.push(`  表示送料: $${finalDisplayShipping.toFixed(2)}`)
  debugInfo.push(`  商品価格調整: $${productPriceAdjustment.toFixed(2)}`)
  debugInfo.push(`  使用重量帯: ${selectedTier}kg`)

  return {
    actualWeight,
    baseShippingFrom60: baseShipping,
    ddpFee,
    totalShippingNeeded,
    selectedWeightTier: selectedTier,
    tierCapacity,
    displayShipping: finalDisplayShipping,
    ebayShippingLimit: ebayLimit,
    productPriceAdjustment,
    isViable: true,
    warnings,
    debugInfo
  }
}

/**
 * eBay送料上限を取得（特定カテゴリのみ）
 */
function getEbayShippingLimit(category: string | null): number | null {
  if (!category) return null
  
  const SHIPPING_LIMITS: Record<string, number> = {
    '267': 20,      // Books
    '617': 20,      // DVDs & Blu-ray  
    '176985': 25,   // Music CDs
    '176984': 40,   // Vinyl Records
    '11232': 20,    // DVDs & Movies
  }
  
  return SHIPPING_LIMITS[category] || null
}
