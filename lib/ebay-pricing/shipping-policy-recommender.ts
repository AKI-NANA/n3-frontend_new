/**
 * 高関税商品の判定とShipping Policy選択
 */

export interface ShippingPolicyRecommendation {
  isHighTariff: boolean
  usaPolicy: 'DDP' | 'DDU'
  rowPolicy: 'DDP' | 'DDU' | 'BOTH'
  reason: string
  estimatedTariffRate: number
}

/**
 * 商品の関税率を計算して、適切な配送ポリシーを推奨
 */
export async function recommendShippingPolicy(params: {
  originCountry: string
  hsCode: string
  targetMargin: number
}): Promise<ShippingPolicyRecommendation> {
  const { originCountry, hsCode, targetMargin } = params

  // 関税率を取得
  const supabase = createClient()
  
  const { data: hsData } = await supabase
    .from('hts_codes')
    .select('base_rate')
    .eq('code', hsCode)
    .single()

  const baseTariffRate = hsData?.base_rate || 0.058

  const { data: additionalData } = await supabase
    .from('country_additional_tariffs')
    .select('additional_rate')
    .eq('country_code', originCountry)
    .eq('is_active', true)
    .single()

  const additionalTariffRate = additionalData?.additional_rate || 0
  const totalTariffRate = baseTariffRate + additionalTariffRate
  const effectiveDDPRate = totalTariffRate + 0.08 // 販売税8%

  console.log(`📊 ${originCountry}の実効DDP率: ${(effectiveDDPRate * 100).toFixed(1)}%`)

  // 🎯 判定ロジック
  const HIGH_TARIFF_THRESHOLD = 0.5  // 50%以上を高関税と判定

  if (effectiveDDPRate > HIGH_TARIFF_THRESHOLD) {
    // 高関税商品
    return {
      isHighTariff: true,
      usaPolicy: 'DDU',  // USA向けはDDU
      rowPolicy: 'BOTH', // 他国はDDP/DDU両方提供
      reason: `実効DDP率${(effectiveDDPRate * 100).toFixed(1)}%が高いため、` +
              `USA向けはDDU（関税別）を推奨します。` +
              `商品価格をDDP用に高く設定すると市場競争力を失います。`,
      estimatedTariffRate: effectiveDDPRate
    }
  } else {
    // 低関税商品
    return {
      isHighTariff: false,
      usaPolicy: 'DDP',  // USA向けもDDP可能
      rowPolicy: 'DDP',  // 他国もDDP
      reason: `実効DDP率${(effectiveDDPRate * 100).toFixed(1)}%は許容範囲内のため、` +
              `全世界向けにDDP（関税込み）配送が可能です。`,
      estimatedTariffRate: effectiveDDPRate
    }
  }
}

/**
 * 商品に適用すべきShipping Policy IDを返す
 */
export function getApplicableShippingPolicies(
  recommendation: ShippingPolicyRecommendation
): {
  usaPolicyId: string
  rowPolicyId: string
} {
  if (recommendation.isHighTariff) {
    return {
      usaPolicyId: 'POLICY_DDU_USA_ONLY',      // USA向けDDU
      rowPolicyId: 'POLICY_DDP_EXCLUDE_USA'    // USA除外DDP
    }
  } else {
    return {
      usaPolicyId: 'POLICY_DDP_WORLDWIDE',     // 全世界DDP
      rowPolicyId: 'POLICY_DDP_WORLDWIDE'      // 同じポリシー
    }
  }
}
