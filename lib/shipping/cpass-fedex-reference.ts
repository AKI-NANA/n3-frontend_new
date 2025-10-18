// lib/shipping/cpass-fedex-reference.ts
// CPASS FedEx料金を参照した見かけ上の送料計算

/**
 * CPASS FedEx Express料金参照データ
 * 実際のCPASSシステムから取得した料金を元に設定
 */
export const CPASS_FEDEX_EXPRESS_RATES = {
  // Zone 1: North America
  ZONE_1: {
    zone_name: 'North America',
    countries: ['US', 'CA', 'MX'],
    rates_by_weight: {
      0.5: { base: 18.50, fuel_surcharge: 2.78, total: 21.28 },
      1.0: { base: 22.00, fuel_surcharge: 3.30, total: 25.30 },
      2.0: { base: 28.50, fuel_surcharge: 4.28, total: 32.78 },
      5.0: { base: 45.00, fuel_surcharge: 6.75, total: 51.75 },
      10.0: { base: 75.00, fuel_surcharge: 11.25, total: 86.25 },
      20.0: { base: 135.00, fuel_surcharge: 20.25, total: 155.25 },
      30.0: { base: 185.00, fuel_surcharge: 27.75, total: 212.75 }
    }
  },
  
  // Zone 2: Europe West
  ZONE_2: {
    zone_name: 'Europe West',
    countries: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'IE', 'PT', 'DK', 'SE', 'NO', 'FI'],
    rates_by_weight: {
      0.5: { base: 24.00, fuel_surcharge: 3.60, total: 27.60 },
      1.0: { base: 28.50, fuel_surcharge: 4.28, total: 32.78 },
      2.0: { base: 38.00, fuel_surcharge: 5.70, total: 43.70 },
      5.0: { base: 62.00, fuel_surcharge: 9.30, total: 71.30 },
      10.0: { base: 105.00, fuel_surcharge: 15.75, total: 120.75 },
      20.0: { base: 185.00, fuel_surcharge: 27.75, total: 212.75 },
      30.0: { base: 255.00, fuel_surcharge: 38.25, total: 293.25 }
    }
  },
  
  // Zone 3: Europe East
  ZONE_3: {
    zone_name: 'Europe East',
    countries: ['PL', 'CZ', 'HU', 'RO', 'BG', 'SK', 'SI', 'HR', 'EE', 'LV', 'LT'],
    rates_by_weight: {
      0.5: { base: 26.00, fuel_surcharge: 3.90, total: 29.90 },
      1.0: { base: 31.00, fuel_surcharge: 4.65, total: 35.65 },
      2.0: { base: 42.00, fuel_surcharge: 6.30, total: 48.30 },
      5.0: { base: 68.00, fuel_surcharge: 10.20, total: 78.20 },
      10.0: { base: 115.00, fuel_surcharge: 17.25, total: 132.25 },
      20.0: { base: 205.00, fuel_surcharge: 30.75, total: 235.75 },
      30.0: { base: 285.00, fuel_surcharge: 42.75, total: 327.75 }
    }
  },
  
  // Zone 4: Asia
  ZONE_4: {
    zone_name: 'Asia',
    countries: ['JP', 'KR', 'CN', 'TW', 'HK', 'SG', 'TH', 'MY', 'VN', 'PH', 'ID', 'IN'],
    rates_by_weight: {
      0.5: { base: 28.00, fuel_surcharge: 4.20, total: 32.20 },
      1.0: { base: 34.00, fuel_surcharge: 5.10, total: 39.10 },
      2.0: { base: 46.00, fuel_surcharge: 6.90, total: 52.90 },
      5.0: { base: 75.00, fuel_surcharge: 11.25, total: 86.25 },
      10.0: { base: 128.00, fuel_surcharge: 19.20, total: 147.20 },
      20.0: { base: 230.00, fuel_surcharge: 34.50, total: 264.50 },
      30.0: { base: 320.00, fuel_surcharge: 48.00, total: 368.00 }
    }
  },
  
  // Zone 5: Oceania
  ZONE_5: {
    zone_name: 'Oceania',
    countries: ['AU', 'NZ'],
    rates_by_weight: {
      0.5: { base: 30.00, fuel_surcharge: 4.50, total: 34.50 },
      1.0: { base: 36.00, fuel_surcharge: 5.40, total: 41.40 },
      2.0: { base: 50.00, fuel_surcharge: 7.50, total: 57.50 },
      5.0: { base: 82.00, fuel_surcharge: 12.30, total: 94.30 },
      10.0: { base: 140.00, fuel_surcharge: 21.00, total: 161.00 },
      20.0: { base: 255.00, fuel_surcharge: 38.25, total: 293.25 },
      30.0: { base: 355.00, fuel_surcharge: 53.25, total: 408.25 }
    }
  },
  
  // Zone 6: South America
  ZONE_6: {
    zone_name: 'South America',
    countries: ['BR', 'AR', 'CL', 'CO', 'PE', 'EC', 'UY', 'PY'],
    rates_by_weight: {
      0.5: { base: 32.00, fuel_surcharge: 4.80, total: 36.80 },
      1.0: { base: 39.00, fuel_surcharge: 5.85, total: 44.85 },
      2.0: { base: 54.00, fuel_surcharge: 8.10, total: 62.10 },
      5.0: { base: 88.00, fuel_surcharge: 13.20, total: 101.20 },
      10.0: { base: 152.00, fuel_surcharge: 22.80, total: 174.80 },
      20.0: { base: 280.00, fuel_surcharge: 42.00, total: 322.00 },
      30.0: { base: 390.00, fuel_surcharge: 58.50, total: 448.50 }
    }
  },
  
  // Zone 7: Africa
  ZONE_7: {
    zone_name: 'Africa',
    countries: ['ZA', 'EG', 'NG', 'KE', 'MA', 'TN', 'GH'],
    rates_by_weight: {
      0.5: { base: 35.00, fuel_surcharge: 5.25, total: 40.25 },
      1.0: { base: 42.00, fuel_surcharge: 6.30, total: 48.30 },
      2.0: { base: 58.00, fuel_surcharge: 8.70, total: 66.70 },
      5.0: { base: 95.00, fuel_surcharge: 14.25, total: 109.25 },
      10.0: { base: 165.00, fuel_surcharge: 24.75, total: 189.75 },
      20.0: { base: 305.00, fuel_surcharge: 45.75, total: 350.75 },
      30.0: { base: 425.00, fuel_surcharge: 63.75, total: 488.75 }
    }
  },
  
  // Zone 8: Middle East
  ZONE_8: {
    zone_name: 'Middle East',
    countries: ['AE', 'SA', 'IL', 'TR', 'QA', 'KW', 'OM', 'BH', 'JO', 'LB'],
    rates_by_weight: {
      0.5: { base: 33.00, fuel_surcharge: 4.95, total: 37.95 },
      1.0: { base: 40.00, fuel_surcharge: 6.00, total: 46.00 },
      2.0: { base: 56.00, fuel_surcharge: 8.40, total: 64.40 },
      5.0: { base: 92.00, fuel_surcharge: 13.80, total: 105.80 },
      10.0: { base: 158.00, fuel_surcharge: 23.70, total: 181.70 },
      20.0: { base: 295.00, fuel_surcharge: 44.25, total: 339.25 },
      30.0: { base: 410.00, fuel_surcharge: 61.50, total: 471.50 }
    }
  }
}

/**
 * 重量から最適なレートを取得（線形補間）
 */
export function getCpassRate(zoneCode: string, weightKg: number): number {
  const zone = CPASS_FEDEX_EXPRESS_RATES[zoneCode as keyof typeof CPASS_FEDEX_EXPRESS_RATES]
  if (!zone) return 0
  
  const weights = Object.keys(zone.rates_by_weight).map(Number).sort((a, b) => a - b)
  
  // 最小重量より軽い場合
  if (weightKg <= weights[0]) {
    return zone.rates_by_weight[weights[0] as keyof typeof zone.rates_by_weight].total
  }
  
  // 最大重量より重い場合
  if (weightKg >= weights[weights.length - 1]) {
    const maxWeight = weights[weights.length - 1]
    const maxRate = zone.rates_by_weight[maxWeight as keyof typeof zone.rates_by_weight].total
    // 30kg超は1kgあたり$15追加と仮定
    return maxRate + (weightKg - maxWeight) * 15
  }
  
  // 線形補間
  for (let i = 0; i < weights.length - 1; i++) {
    const w1 = weights[i]
    const w2 = weights[i + 1]
    
    if (weightKg >= w1 && weightKg <= w2) {
      const r1 = zone.rates_by_weight[w1 as keyof typeof zone.rates_by_weight].total
      const r2 = zone.rates_by_weight[w2 as keyof typeof zone.rates_by_weight].total
      
      // 線形補間
      const ratio = (weightKg - w1) / (w2 - w1)
      return r1 + (r2 - r1) * ratio
    }
  }
  
  return 0
}

/**
 * 見かけ上の送料計算（CPASS料金 × 調整係数）
 */
export function calculateDisplayShipping(
  zoneCode: string,
  weightKg: number,
  adjustmentFactor: number = 1.2
): number {
  const cpassRate = getCpassRate(zoneCode, weightKg)
  const displayRate = cpassRate * adjustmentFactor
  
  // 自然な金額に丸める
  return roundToNatural(displayRate)
}

/**
 * 自然な金額に丸める
 */
function roundToNatural(amount: number): number {
  if (amount < 10) {
    // $10未満: $0.50刻み ($5.50, $6.00, $6.50...)
    return Math.ceil(amount * 2) / 2
  } else if (amount < 50) {
    // $10-50: $0.95刻み ($18.95, $19.95, $24.95...)
    return Math.floor(amount) + 0.95
  } else if (amount < 100) {
    // $50-100: $5刻み ($55, $60, $65...)
    return Math.ceil(amount / 5) * 5
  } else {
    // $100以上: $10刻み ($110, $120, $130...)
    return Math.ceil(amount / 10) * 10
  }
}
