// lib/shipping/ebay-shipping-services.ts
// eBay公式の配送サービスコード定義

export interface ShippingServiceOption {
  code: string
  name: string
  carrier: string
  minDays?: number
  maxDays?: number
  category: 'domestic' | 'international'
  type: 'economy' | 'standard' | 'expedited' | 'international'
}

// 国内配送サービス（USPS）
export const DOMESTIC_SERVICES: ShippingServiceOption[] = [
  {
    code: 'USPSPriorityFlatRateBox',
    name: 'USPS Priority Flat Rate Box',
    carrier: 'USPS',
    category: 'domestic',
    type: 'standard'
  },
  {
    code: 'USPSPriorityFlatRateEnvelope',
    name: 'USPS Priority Flat Rate Envelope',
    carrier: 'USPS',
    category: 'domestic',
    type: 'standard'
  },
  {
    code: 'USPSPriorityMail',
    name: 'USPS Priority Mail',
    carrier: 'USPS',
    minDays: 1,
    maxDays: 3,
    category: 'domestic',
    type: 'standard'
  },
  {
    code: 'USPSMedia',
    name: 'USPS Media Mail',
    carrier: 'USPS',
    minDays: 2,
    maxDays: 8,
    category: 'domestic',
    type: 'economy'
  }
]

// 国際配送サービス - Economy
export const INTERNATIONAL_ECONOMY_SERVICES: ShippingServiceOption[] = [
  {
    code: 'EconomyShippingFromOutsideUS',
    name: 'Economy Shipping from Outside US',
    carrier: 'OTHER',
    minDays: 13,
    maxDays: 23,
    category: 'international',
    type: 'economy'
  },
  {
    code: 'EconomyInternationalShipping',
    name: 'Economy International Shipping',
    carrier: 'OTHER',
    minDays: 13,
    maxDays: 23,
    category: 'international',
    type: 'economy'
  },
  {
    code: 'EconomyShippingFromGreaterChina',
    name: 'Economy Shipping from Greater China to worldwide',
    carrier: 'OTHER',
    minDays: 11,
    maxDays: 35,
    category: 'international',
    type: 'economy'
  }
]

// 国際配送サービス - Standard
export const INTERNATIONAL_STANDARD_SERVICES: ShippingServiceOption[] = [
  {
    code: 'StandardInternationalShipping',
    name: 'Standard International Shipping',
    carrier: 'OTHER',
    minDays: 11,
    maxDays: 20,
    category: 'international',
    type: 'standard'
  },
  {
    code: 'StandardShippingFromGreaterChina',
    name: 'Standard Shipping from Greater China to worldwide',
    carrier: 'OTHER',
    minDays: 7,
    maxDays: 19,
    category: 'international',
    type: 'standard'
  }
]

// 国際配送サービス - Expedited
export const INTERNATIONAL_EXPEDITED_SERVICES: ShippingServiceOption[] = [
  {
    code: 'ExpeditedShippingFromOutsideUS',
    name: 'Expedited Shipping from Outside US',
    carrier: 'OTHER',
    minDays: 7,
    maxDays: 15,
    category: 'international',
    type: 'expedited'
  },
  {
    code: 'ExpeditedInternationalShipping',
    name: 'Expedited International Shipping',
    carrier: 'OTHER',
    minDays: 7,
    maxDays: 15,
    category: 'international',
    type: 'expedited'
  },
  {
    code: 'FedExInternationalEconomy',
    name: 'FedEx International Economy',
    carrier: 'FedEx',
    category: 'international',
    type: 'expedited'
  },
  {
    code: 'FedExInternationalPriority',
    name: 'FedEx International Priority',
    carrier: 'FedEx',
    category: 'international',
    type: 'expedited'
  },
  {
    code: 'UPSWorldwideExpedited',
    name: 'UPS Worldwide Expedited',
    carrier: 'UPS',
    minDays: 2,
    maxDays: 5,
    category: 'international',
    type: 'expedited'
  },
  {
    code: 'UPSWorldwideSaver',
    name: 'UPS Worldwide Saver',
    carrier: 'UPS',
    minDays: 1,
    maxDays: 3,
    category: 'international',
    type: 'expedited'
  }
]

// USPS国際配送サービス
export const USPS_INTERNATIONAL_SERVICES: ShippingServiceOption[] = [
  {
    code: 'USPSFirstClassPackageInternationalService',
    name: 'USPS First Class Package International',
    carrier: 'USPS',
    category: 'international',
    type: 'economy'
  },
  {
    code: 'USPSPriorityMailInternational',
    name: 'USPS Priority Mail International',
    carrier: 'USPS',
    minDays: 6,
    maxDays: 25,
    category: 'international',
    type: 'standard'
  },
  {
    code: 'USPSPriorityMailInternationalFlatRateEnvelope',
    name: 'USPS Priority Mail International Flat Rate Envelope',
    carrier: 'USPS',
    minDays: 6,
    maxDays: 25,
    category: 'international',
    type: 'standard'
  },
  {
    code: 'USPSPriorityMailExpressInternational',
    name: 'USPS Priority Mail Express International',
    carrier: 'USPS',
    minDays: 3,
    maxDays: 5,
    category: 'international',
    type: 'expedited'
  }
]

// 全国際配送サービス
export const ALL_INTERNATIONAL_SERVICES = [
  ...INTERNATIONAL_ECONOMY_SERVICES,
  ...INTERNATIONAL_STANDARD_SERVICES,
  ...INTERNATIONAL_EXPEDITED_SERVICES,
  ...USPS_INTERNATIONAL_SERVICES
]

// サービスコードから詳細を取得
export function getServiceByCode(code: string): ShippingServiceOption | undefined {
  return [...DOMESTIC_SERVICES, ...ALL_INTERNATIONAL_SERVICES].find(s => s.code === code)
}
