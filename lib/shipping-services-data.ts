// 全配送サービス（eBayの実データ）- 最終確定版
// 実際に使うのは4種類のみ

export const ALL_SHIPPING_SERVICES_FINAL = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Expedited services（速達サービス - EMS/クーリエ最速便）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { 
    category: 'expedited_intl', 
    code: 'ExpeditedShippingFromOutsideUS', 
    name: 'Expedited Shipping from outside US',
    nameJa: '米国外からの速達配送',
    days: '1-4',
    description: '【最速便】EMS・FedEx Express・DHL Express・UPS Expressの最速サービスすべて。高額商品や急ぎの注文に最適',
    carrier: 'EMS / FedEx / DHL / UPS',
    serviceType: 'EMS・クーリエ最速便',
    actualService: 'EMS / FedEx International Priority / DHL Express / UPS Worldwide Express',
    usageNote: '⭐ よく使う - すべての高速配送をカバー',
    recommended: true
  },
  { 
    category: 'expedited_intl', 
    code: 'eBaySpeedPAKExpedited', 
    name: 'eBay SpeedPAK Expedited',
    nameJa: 'eBay SpeedPAK 速達',
    days: '1-4',
    description: '【使わない】個別のDHL速達は不要（Expeditedに含まれる）',
    carrier: 'eBay SpeedPAK (via DHL)',
    serviceType: 'DHL速達（単体）',
    actualService: 'DHL Express',
    usageNote: '✕ 使わない - Expeditedに含まれるため不要',
    recommended: false
  },
  { 
    category: 'expedited_intl', 
    code: 'eBaySpeedPAKExpress', 
    name: 'eBay SpeedPAK Express',
    nameJa: 'eBay SpeedPAK 特急',
    days: '1-3',
    description: '【使わない】DHL最速便は不要（Expeditedに含まれる）',
    carrier: 'eBay SpeedPAK (via DHL)',
    serviceType: 'DHL特急',
    actualService: 'DHL Express Plus',
    usageNote: '✕ 使わない - Expeditedに含まれるため不要',
    recommended: false
  },
  { 
    category: 'expedited_intl', 
    code: 'FedExInternationalEconomy', 
    name: 'FedEx International Economy',
    nameJa: 'FedEx 国際エコノミー',
    days: '2-4',
    description: '【使わない】Standard Shippingで代用',
    carrier: 'FedEx',
    serviceType: 'FedExエコノミー',
    actualService: 'FedEx International Economy',
    usageNote: '✕ 使わない - Standard Shippingに含まれる',
    recommended: false
  },
  { 
    category: 'expedited_intl', 
    code: 'UPSWorldwideExpedited', 
    name: 'UPS Worldwide Expedited',
    nameJa: 'UPS 世界速達',
    days: '2-5',
    description: '【使わない】Expeditedに含まれる',
    carrier: 'UPS',
    serviceType: 'UPS速達',
    actualService: 'UPS Worldwide Expedited',
    usageNote: '✕ 使わない - Expeditedに含まれるため不要',
    recommended: false
  },
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Standard services（標準サービス - クーリエのエコノミー便）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { 
    category: 'standard_intl', 
    code: 'StandardShippingFromOutsideUS', 
    name: 'Standard Shipping from outside US',
    nameJa: '米国外からの標準配送',
    days: '5-10',
    description: '【標準配送】FedEx/DHL/UPSのエコノミー便。速達より遅いが安い。通常配送に最適',
    carrier: 'FedEx / DHL / UPS',
    serviceType: 'クーリエ エコノミー便',
    actualService: 'FedEx International Economy / DHL eCommerce / UPS Standard',
    usageNote: '⭐ よく使う - 標準的な配送（速達と格安の中間）',
    recommended: true
  },
  { 
    category: 'standard_intl', 
    code: 'eBaySpeedPAKStandard', 
    name: 'eBay SpeedPAK Standard',
    nameJa: 'eBay SpeedPAK 標準',
    days: '5-9',
    description: '【使わない】Standard Shippingで代用',
    carrier: 'eBay SpeedPAK (CPASS)',
    serviceType: 'CPASSスピードパック',
    actualService: 'DHL eCommerce / CPASS標準便',
    usageNote: '✕ 使わない - Standard Shippingで代用',
    recommended: false
  },
  { 
    category: 'standard_intl', 
    code: 'ePacketChina', 
    name: 'ePacket delivery from China',
    nameJa: 'eパケット（中国発）',
    days: '7-12',
    description: '【使わない】中国発送専用',
    carrier: 'China Post',
    serviceType: 'eパケット',
    actualService: 'China Post ePacket',
    usageNote: '✕ 使わない - 中国発送専用',
    recommended: false
  },
  { 
    category: 'standard_intl', 
    code: 'StandardShippingFromGreaterChina', 
    name: 'Standard Shipping from Greater China',
    nameJa: '中国からの標準配送',
    days: '7-19',
    description: '【使わない】中国発送専用',
    carrier: 'China Post',
    serviceType: '航空便（中国郵政）',
    actualService: 'China Post Air Parcel',
    usageNote: '✕ 使わない - 中国発送専用',
    recommended: false
  },
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Economy services（エコノミー - CPASS + 日本郵便格安便）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { 
    category: 'economy_intl', 
    code: 'eBaySpeedPAKEconomy', 
    name: 'eBay SpeedPAK Economy',
    nameJa: 'eBay SpeedPAK エコノミー',
    days: '8-12',
    description: '【CPASSエコノミー】eBayのエコノミー配送。追跡付きで低価格。CPASSエコノミー便',
    carrier: 'eBay SpeedPAK (CPASS)',
    serviceType: 'CPASSエコノミー',
    actualService: 'DHL eCommerce / CPASS エコノミー',
    usageNote: '⭐ よく使う - 追跡付き格安配送',
    recommended: true
  },
  { 
    category: 'economy_intl', 
    code: 'EconomyShippingFromOutsideUS', 
    name: 'Economy Shipping from outside US',
    nameJa: '米国外からのエコノミー配送',
    days: '11-23',
    description: '【日本郵便・格安便】小型包装物・書状・船便。最安値だが時間がかかる',
    carrier: 'USPS（日本郵便）',
    serviceType: '小型包装物・書状・船便',
    actualService: '日本郵便 小形包装物 / 国際書状 / 船便',
    usageNote: '⭐ よく使う - 最安値配送（時間がかかってもOK）',
    recommended: true
  },
  { 
    category: 'economy_intl', 
    code: 'EconomyShippingFromCanada', 
    name: 'Economy Shipping from Canada',
    nameJa: 'カナダからのエコノミー配送',
    days: '5-12',
    description: '【使わない】カナダ発送専用',
    carrier: 'Canada Post',
    serviceType: 'エコノミー',
    actualService: 'Canada Post International Parcel',
    usageNote: '✕ 使わない - カナダ発送専用',
    recommended: false
  },
  { 
    category: 'economy_intl', 
    code: 'EconomyShippingFromGreaterChina', 
    name: 'Economy Shipping from Greater China',
    nameJa: '中国からのエコノミー配送',
    days: '11-35',
    description: '【使わない】中国発送専用',
    carrier: 'China Post',
    serviceType: '船便（中国郵政）',
    actualService: 'China Post Surface Mail',
    usageNote: '✕ 使わない - 中国発送専用',
    recommended: false
  },
  { 
    category: 'economy_intl', 
    code: 'EconomyShippingFromIndia', 
    name: 'Economy Shipping from India',
    nameJa: 'インドからのエコノミー配送',
    days: '8-13',
    description: '【使わない】インド発送専用',
    carrier: 'India Post',
    serviceType: 'エコノミー',
    actualService: 'India Post International Parcel',
    usageNote: '✕ 使わない - インド発送専用',
    recommended: false
  },
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // International services（その他 - すべて使わない）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { 
    category: 'international', 
    code: 'USPSFirstClassPackageInternational', 
    name: 'USPS First Class Package International',
    nameJa: 'USPS ファーストクラス国際小包',
    days: '11-20',
    description: '【使わない】Economy Shippingで代用',
    carrier: 'USPS（日本郵便）',
    serviceType: '小型包装物',
    actualService: '日本郵便 小形包装物',
    usageNote: '✕ 使わない - Economy Shippingで代用',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'USPSPriorityMailInternational', 
    name: 'USPS Priority Mail International',
    nameJa: 'USPS 優先国際郵便（EMS）',
    days: '6-25',
    description: '【使わない】Expeditedに含まれる',
    carrier: 'USPS（日本郵便）',
    serviceType: 'EMS',
    actualService: '日本郵便 EMS',
    usageNote: '✕ 使わない - Expeditedに含まれる',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'StandardInternationalShipping', 
    name: 'Standard International Shipping',
    nameJa: '標準国際配送',
    days: '11-20',
    description: '【使わない】日本郵便の航空便（追跡なし）は使わない',
    carrier: 'USPS（日本郵便）',
    serviceType: '航空便（追跡なし）',
    actualService: '日本郵便 国際小包（航空便・追跡なし）',
    usageNote: '✕ 使わない - Standard ShippingかEconomyで代用',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'ExpeditedInternationalShipping', 
    name: 'Expedited International Shipping',
    nameJa: '速達国際配送',
    days: '7-15',
    description: '【使わない】あいまいなサービス',
    carrier: 'USPS（日本郵便）',
    serviceType: '速達',
    actualService: '不明',
    usageNote: '✕ 使わない - あいまい',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'USPSPriorityMailInternationalFlatRateEnvelope', 
    name: 'USPS Priority Mail International Flat Rate Envelope',
    nameJa: 'USPS 優先郵便 定額封筒',
    days: '6-25',
    description: '【使わない】定額封筒は使わない',
    carrier: 'USPS（日本郵便）',
    serviceType: 'EMS定額封筒',
    actualService: '日本郵便 EMS 定額封筒',
    usageNote: '✕ 使わない',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'USPSPriorityMailInternationalPaddedFlatRateEnvelope', 
    name: 'USPS Priority Mail International Padded Flat Rate Envelope',
    nameJa: 'USPS 優先郵便 クッション付き定額封筒',
    days: '6-25',
    description: '【使わない】定額封筒は使わない',
    carrier: 'USPS（日本郵便）',
    serviceType: 'EMS緩衝封筒',
    actualService: '日本郵便 EMS クッション封筒',
    usageNote: '✕ 使わない',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'USPSPriorityMailInternationalSmallFlatRateBox', 
    name: 'USPS Priority Mail International Small Flat Rate Box',
    nameJa: 'USPS 優先郵便 小型定額箱',
    days: '6-25',
    description: '【使わない】定額箱は使わない',
    carrier: 'USPS（日本郵便）',
    serviceType: 'EMS定額小型箱',
    actualService: '日本郵便 EMS 小型箱',
    usageNote: '✕ 使わない',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'USPSPriorityMailInternationalMediumFlatRateBox', 
    name: 'USPS Priority Mail International Medium Flat Rate Box',
    nameJa: 'USPS 優先郵便 中型定額箱',
    days: '6-25',
    description: '【使わない】定額箱は使わない',
    carrier: 'USPS（日本郵便）',
    serviceType: 'EMS定額中型箱',
    actualService: '日本郵便 EMS 中型箱',
    usageNote: '✕ 使わない',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'USPSPriorityMailInternationalLargeFlatRateBox', 
    name: 'USPS Priority Mail International Large Flat Rate Box',
    nameJa: 'USPS 優先郵便 大型定額箱',
    days: '6-25',
    description: '【使わない】定額箱は使わない',
    carrier: 'USPS（日本郵便）',
    serviceType: 'EMS定額大型箱',
    actualService: '日本郵便 EMS 大型箱',
    usageNote: '✕ 使わない',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'FedExInternationalPriority', 
    name: 'FedEx International Priority',
    nameJa: 'FedEx 国際優先便',
    days: '1-3',
    description: '【使わない】Expeditedに含まれる',
    carrier: 'FedEx',
    serviceType: '最速便',
    actualService: 'FedEx International Priority',
    usageNote: '✕ 使わない - Expeditedに含まれる',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'UPSWorldwideSaver', 
    name: 'UPS Worldwide Saver',
    nameJa: 'UPS 世界エコノミー',
    days: '1-3',
    description: '【使わない】Standard Shippingで代用',
    carrier: 'UPS',
    serviceType: 'エコノミー速達',
    actualService: 'UPS Worldwide Saver',
    usageNote: '✕ 使わない - Standard Shippingに含まれる',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'UPSWorldwideExpress', 
    name: 'UPS Worldwide Express',
    nameJa: 'UPS 世界特急',
    days: '1-2',
    description: '【使わない】Expeditedに含まれる',
    carrier: 'UPS',
    serviceType: '特急',
    actualService: 'UPS Worldwide Express',
    usageNote: '✕ 使わない - Expeditedに含まれる',
    recommended: false
  },
  { 
    category: 'international', 
    code: 'UPSWorldwideExpressPlus', 
    name: 'UPS Worldwide Express Plus',
    nameJa: 'UPS 世界特急プラス',
    days: '1-2',
    description: '【使わない】Expeditedに含まれる',
    carrier: 'UPS',
    serviceType: '特急プラス',
    actualService: 'UPS Worldwide Express Plus',
    usageNote: '✕ 使わない - Expeditedに含まれる',
    recommended: false
  },
] as const

// まとめ：実際に使うのは以下の4種類のみ
// ⭐ 1. Expedited Shipping from outside US - EMS/FedEx/DHL/UPS 最速便（1-4日）
// ⭐ 2. Standard Shipping from outside US - FedEx/DHL/UPS エコノミー便（5-10日）
// ⭐ 3. eBay SpeedPAK Economy - CPASS エコノミー（8-12日）
// ⭐ 4. Economy Shipping from outside US - 日本郵便 小型包装物・書状・船便（11-23日）
