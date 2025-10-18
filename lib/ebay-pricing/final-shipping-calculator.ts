/**
 * 送料計算ロジック（最終確定版）
 * 
 * 原則:
 * 1. 実重量の重量帯を使う（基本）
 * 2. DDP費用が高くて容量不足なら、上の重量帯を探す（例外）
 * 3. どの重量帯でも無理なら出品不可
 * 4. eBay送料上限は別問題（特定カテゴリのみ）
 */

import { createClient } from '@/lib/supabase/client'

export interface FinalShippingResult {
  // 基本情報
  actualWeight: number
  baseShipping: number        // 実重量の重量帯から取得
  ddpFee: number
  totalShippingCost: number   // 基準送料 + DDP費用
  
  // 重量帯選択結果
  selectedWeightTier: number  // 実際に使う重量帯
  tierCapacity: number        // その重量帯の容量
  usingHeavierTier: boolean   // より重い重量帯を使っているか
  
  // 表示金額
  displayShipping: number     // 最終的な表示送料
  productPriceAdjustment: number  // 商品価格への上乗せ（eBay上限対応）
  
  // eBay規約対応
  hasEbayLimit: boolean
  ebayShippingLimit: number | null
  
  // 判定
  canList: boolean            // 出品可能か
  reason: string              // 理由
  warnings: string[]
}

/**
 * メイン計算関数
 */
export async function calculateFinalShipping(params: {
  actualWeight: number
  productPrice: number
  tariffRate: number
  originCountry: string
  ebayCategory: string | null
}): Promise<FinalShippingResult> {
  const { actualWeight, productPrice, tariffRate, originCountry, ebayCategory } = params
  
  const warnings: string[] = []
  const supabase = createClient()

  console.log(`\n📦 送料計算開始`)
  console.log(`実重量: ${actualWeight}kg`)
  console.log(`商品価格: $${productPrice}`)
  console.log(`関税率: ${(tariffRate * 100).toFixed(1)}%`)

  // ========================================
  // STEP 1: 実重量の重量帯から基準送料を取得
  // ========================================
  
  const { data: tierData } = await supabase
    .from('usa_ddp_rates')
    .select('weight, price_60')
    .eq('weight', actualWeight)
    .single()

  if (!tierData) {
    console.error(`❌ ${actualWeight}kgの重量帯データが見つかりません`)
    return createErrorResult(actualWeight, '重量帯データなし')
  }

  const baseShipping = tierData.price_60
  console.log(`\n[1] 基準送料: $${baseShipping}（${actualWeight}kg重量帯）`)

  // ========================================
  // STEP 2: DDP費用を計算
  // ========================================
  
  const salesTaxRate = 0.08
  const ddpServiceFee = 15
  const effectiveDDPRate = tariffRate + salesTaxRate
  const ddpFee = productPrice * effectiveDDPRate + ddpServiceFee
  
  console.log(`\n[2] DDP費用計算`)
  console.log(`    実効DDP率: ${(effectiveDDPRate * 100).toFixed(1)}%`)
  console.log(`    DDP費用: $${ddpFee.toFixed(2)}`)

  const totalShippingCost = baseShipping + ddpFee
  console.log(`    合計送料: $${baseShipping} + $${ddpFee.toFixed(2)} = $${totalShippingCost.toFixed(2)}`)

  // ========================================
  // STEP 3: 重量帯の容量チェック
  // ========================================
  
  console.log(`\n[3] 容量チェック`)
  console.log(`    ${actualWeight}kg重量帯の容量: $${baseShipping}`)
  console.log(`    必要な送料: $${totalShippingCost.toFixed(2)}`)

  let selectedTier = actualWeight
  let tierCapacity = baseShipping
  let usingHeavierTier = false

  // 容量不足チェック
  if (totalShippingCost > baseShipping) {
    console.log(`    ⚠️ 容量不足（$${totalShippingCost.toFixed(2)} > $${baseShipping}）`)
    console.log(`    より重い重量帯を探します...`)
    
    // より重い重量帯を探す
    const { data: heavierTiers } = await supabase
      .from('usa_ddp_rates')
      .select('weight, price_60')
      .gt('weight', actualWeight)
      .gte('price_60', totalShippingCost)
      .order('weight', { ascending: true })
      .limit(1)

    if (heavierTiers && heavierTiers.length > 0) {
      selectedTier = heavierTiers[0].weight
      tierCapacity = heavierTiers[0].price_60
      usingHeavierTier = true
      
      console.log(`    ✅ ${selectedTier}kg重量帯を使用（容量$${tierCapacity}）`)
      warnings.push(
        `DDP費用が高いため、実重量${actualWeight}kgですが${selectedTier}kg重量帯を使用します。`
      )
    } else {
      // どの重量帯でも無理
      console.error(`    ❌ 利用可能な重量帯がありません`)
      console.error(`    必要: $${totalShippingCost.toFixed(2)}をカバーできる重量帯が存在しません`)
      
      return {
        actualWeight,
        baseShipping,
        ddpFee,
        totalShippingCost,
        selectedWeightTier: actualWeight,
        tierCapacity: baseShipping,
        usingHeavierTier: false,
        displayShipping: totalShippingCost,
        productPriceAdjustment: 0,
        hasEbayLimit: false,
        ebayShippingLimit: null,
        canList: false,
        reason: `送料$${totalShippingCost.toFixed(2)}をカバーできる重量帯がありません`,
        warnings: [...warnings, '出品不可']
      }
    }
  } else {
    console.log(`    ✅ ${actualWeight}kg重量帯で対応可能`)
  }

  // ========================================
  // STEP 4: eBay送料上限チェック（特定カテゴリのみ）
  // ========================================
  
  const ebayLimit = getEbayShippingLimit(ebayCategory)
  let displayShipping = totalShippingCost
  let productPriceAdjustment = 0

  console.log(`\n[4] eBay送料上限チェック`)
  console.log(`    カテゴリ: ${ebayCategory || 'なし'}`)
  console.log(`    送料上限: ${ebayLimit ? `$${ebayLimit}` : 'なし'}`)

  if (ebayLimit && totalShippingCost > ebayLimit) {
    productPriceAdjustment = totalShippingCost - ebayLimit
    displayShipping = ebayLimit
    
    console.log(`    ⚠️ 送料上限超過`)
    console.log(`    計算送料: $${totalShippingCost.toFixed(2)} > 上限$${ebayLimit}`)
    console.log(`    → 差額$${productPriceAdjustment.toFixed(2)}を商品価格に転嫁`)
    
    warnings.push(
      `eBay規約により送料上限$${ebayLimit}。差額$${productPriceAdjustment.toFixed(2)}を商品価格に上乗せします。`
    )
  } else if (ebayLimit) {
    console.log(`    ✅ 送料上限$${ebayLimit}内`)
  }

  // ========================================
  // 結果
  // ========================================
  
  console.log(`\n✅ 送料計算完了`)
  console.log(`   表示送料: $${displayShipping.toFixed(2)}`)
  console.log(`   商品価格調整: $${productPriceAdjustment.toFixed(2)}`)
  console.log(`   使用重量帯: ${selectedTier}kg${usingHeavierTier ? ' (変更)' : ' (標準)'}`)
  console.log(`   出品可能: はい\n`)

  return {
    actualWeight,
    baseShipping,
    ddpFee,
    totalShippingCost,
    selectedWeightTier: selectedTier,
    tierCapacity,
    usingHeavierTier,
    displayShipping,
    productPriceAdjustment,
    hasEbayLimit: ebayLimit !== null,
    ebayShippingLimit: ebayLimit,
    canList: true,
    reason: '出品可能',
    warnings
  }
}

/**
 * エラー時の結果を生成
 */
function createErrorResult(weight: number, reason: string): FinalShippingResult {
  return {
    actualWeight: weight,
    baseShipping: 0,
    ddpFee: 0,
    totalShippingCost: 0,
    selectedWeightTier: weight,
    tierCapacity: 0,
    usingHeavierTier: false,
    displayShipping: 0,
    productPriceAdjustment: 0,
    hasEbayLimit: false,
    ebayShippingLimit: null,
    canList: false,
    reason,
    warnings: [reason]
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
