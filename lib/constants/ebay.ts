// lib/constants/ebay.ts
// eBay関連の定数

/**
 * eBayストアタイプごとの手数料設定
 */
export const STORE_FEES = {
  none: {
    name: 'ストアなし',
    monthlyFee: 0,
    fvfDiscount: 0,
  },
  starter: {
    name: 'Starter',
    monthlyFee: 7.95,
    fvfDiscount: 0.05, // 5%割引
  },
  basic: {
    name: 'Basic',
    monthlyFee: 27.95,
    fvfDiscount: 0.1, // 10%割引
  },
  premium: {
    name: 'Premium',
    monthlyFee: 74.95,
    fvfDiscount: 0.15, // 15%割引
  },
  anchor: {
    name: 'Anchor',
    monthlyFee: 349.95,
    fvfDiscount: 0.2, // 20%割引
  },
  enterprise: {
    name: 'Enterprise',
    monthlyFee: 2999.95,
    fvfDiscount: 0.25, // 25%割引
  },
} as const

export type StoreType = keyof typeof STORE_FEES
