// lib/ebay-pricing/ddp-calculator.ts
/**
 * DDP（Delivered Duty Paid）精密計算エンジン
 * 
 * DDPでは以下の手数料を正確に計算する必要があります:
 * 1. 関税 (Customs Duty)
 * 2. MPF (Merchandise Processing Fee)
 * 3. HMF (Harbor Maintenance Fee) - 港湾経由の場合
 * 4. DDP手数料 (eBayのDDPプログラム手数料)
 */

export interface DDPCalculationParams {
  cifPrice: number           // CIF価格（Cost + Insurance + Freight）
  hsCode: string            // HSコード
  originCountry: string     // 原産国
  isPortEntry: boolean      // 港湾経由かどうか
  tariffRate?: number       // 関税率（指定がない場合はHSコードから取得）
}

export interface DDPCalculationResult {
  totalDDP: number          // 総DDP費用
  customsDuty: number       // 関税
  mpf: number               // MPF
  hmf: number               // HMF
  ddpProgramFee: number     // eBay DDPプログラム手数料
  breakdown: string[]       // 計算式の内訳
}

/**
 * MPF (Merchandise Processing Fee) 計算
 * 
 * 正規輸入品の通関手数料で、CIF価格に基づいて計算されます。
 * - 最小額: $27.23
 * - 最大額: $528.33
 * - 計算式: CIF × 0.3464%
 */
export function calculateMPF(cifPrice: number): number {
  const mpf = cifPrice * 0.003464
  return Math.min(Math.max(mpf, 27.23), 528.33)
}

/**
 * HMF (Harbor Maintenance Fee) 計算
 * 
 * 港湾経由の輸入品にのみ適用される手数料。
 * - 計算式: CIF × 0.125%
 * - 空輸の場合は0
 */
export function calculateHMF(cifPrice: number, isPortEntry: boolean): number {
  if (!isPortEntry) return 0
  return cifPrice * 0.00125
}

/**
 * eBay DDPプログラム手数料計算
 * 
 * eBayが関税・税金の徴収代行を行う際の手数料。
 * - 基本手数料: $3.50
 * - CIF価格比例: CIF × 2.5%
 * - 上限: $25.00
 */
export function calculateEbayDDPFee(cifPrice: number): number {
  const baseFee = 3.5
  const proportionalFee = cifPrice * 0.025
  return Math.min(baseFee + proportionalFee, 25.0)
}

/**
 * 関税計算
 * 
 * @param cifPrice CIF価格
 * @param tariffRate 関税率（小数: 0.06 = 6%）
 * @returns 関税額
 */
export function calculateCustomsDuty(cifPrice: number, tariffRate: number): number {
  return cifPrice * tariffRate
}

/**
 * DDP総額計算（精密版）
 * 
 * すべての手数料を含めた正確なDDP計算を行います。
 */
export function calculateDDPPrecise(params: DDPCalculationParams): DDPCalculationResult {
  const {
    cifPrice,
    hsCode,
    originCountry,
    isPortEntry,
    tariffRate = 0.06, // デフォルト6%
  } = params

  // 1. 関税計算
  const customsDuty = calculateCustomsDuty(cifPrice, tariffRate)

  // 2. MPF計算
  const mpf = calculateMPF(cifPrice)

  // 3. HMF計算（港湾経由の場合のみ）
  const hmf = calculateHMF(cifPrice, isPortEntry)

  // 4. eBay DDPプログラム手数料
  const ddpProgramFee = calculateEbayDDPFee(cifPrice)

  // 5. 総DDP費用
  const totalDDP = customsDuty + mpf + hmf + ddpProgramFee

  // 6. 計算式の内訳
  const breakdown = [
    `CIF価格: $${cifPrice.toFixed(2)}`,
    `関税 (${(tariffRate * 100).toFixed(2)}%): $${customsDuty.toFixed(2)}`,
    `MPF (0.3464%, min $27.23, max $528.33): $${mpf.toFixed(2)}`,
    isPortEntry 
      ? `HMF (0.125%, 港湾経由): $${hmf.toFixed(2)}`
      : `HMF: $0.00 (空輸のため不要)`,
    `eBay DDPプログラム手数料 (min($3.50 + CIF×2.5%, $25)): $${ddpProgramFee.toFixed(2)}`,
    `────────────────────`,
    `総DDP費用: $${totalDDP.toFixed(2)}`,
  ]

  return {
    totalDDP,
    customsDuty,
    mpf,
    hmf,
    ddpProgramFee,
    breakdown,
  }
}

/**
 * DDU（Delivered Duty Unpaid）計算
 * 
 * DDUの場合、関税は購入者負担のため、
 * eBay側で計算する必要があるのはHandling Feeのみです。
 */
export function calculateDDU(cifPrice: number, handlingFee: number) {
  return {
    totalDDU: handlingFee,
    handlingFee,
    breakdown: [
      `CIF価格: $${cifPrice.toFixed(2)}`,
      `Handling Fee: $${handlingFee.toFixed(2)}`,
      `────────────────────`,
      `総DDU費用: $${handlingFee.toFixed(2)}`,
      `※関税は購入者負担`,
    ],
  }
}

/**
 * Section 301追加関税の考慮
 * 
 * 中国製品に対する追加関税（Section 301）を考慮します。
 */
export function applySection301(
  baseTariffRate: number,
  originCountry: string,
  section301Rate: number = 0.25
): number {
  if (originCountry === 'CN') {
    return baseTariffRate + section301Rate
  }
  return baseTariffRate
}

/**
 * 輸送方法の判定
 * 
 * 商品のサイズ・重量から輸送方法（港湾経由 or 空輸）を推定します。
 */
export function estimateShippingMethod(weight: number, volume: number): {
  method: 'port' | 'air'
  isPortEntry: boolean
  reason: string
} {
  // 大型・重量物は港湾経由の可能性が高い
  if (weight > 10 || volume > 100000) {
    return {
      method: 'port',
      isPortEntry: true,
      reason: '大型・重量物のため港湾経由と推定',
    }
  }

  // 小型・軽量物は空輸が一般的
  return {
    method: 'air',
    isPortEntry: false,
    reason: '小型・軽量物のため空輸と推定',
  }
}

/**
 * DDP vs DDU 比較
 * 
 * DDPとDDUのコストを比較し、推奨する配送方法を提案します。
 */
export function compareDDPvsDDU(params: {
  cifPrice: number
  hsCode: string
  originCountry: string
  tariffRate: number
  handlingFeeDDP: number
  handlingFeeDDU: number
  isPortEntry: boolean
}): {
  ddp: DDPCalculationResult
  ddu: ReturnType<typeof calculateDDU>
  recommendation: 'DDP' | 'DDU'
  reason: string
  totalDDPCost: number
  totalDDUCost: number
} {
  const ddp = calculateDDPPrecise({
    cifPrice: params.cifPrice,
    hsCode: params.hsCode,
    originCountry: params.originCountry,
    tariffRate: params.tariffRate,
    isPortEntry: params.isPortEntry,
  })

  const ddu = calculateDDU(params.cifPrice, params.handlingFeeDDU)

  // DDPのHandling Feeを加算
  const totalDDPCost = ddp.totalDDP + params.handlingFeeDDP
  const totalDDUCost = ddu.totalDDU

  let recommendation: 'DDP' | 'DDU'
  let reason: string

  if (totalDDPCost < totalDDUCost * 1.1) {
    // DDPの方が安い、または10%以内の差
    recommendation = 'DDP'
    reason = `総コスト差: $${(totalDDPCost - totalDDUCost).toFixed(2)} (DDP推奨: 関税リスク回避)`
  } else {
    recommendation = 'DDU'
    reason = `総コスト差: $${(totalDDUCost - totalDDPCost).toFixed(2)} (DDU推奨: コスト削減)`
  }

  return {
    ddp,
    ddu,
    recommendation,
    reason,
    totalDDPCost,
    totalDDUCost,
  }
}
