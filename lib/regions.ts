// 世界地域の定義
export const REGIONS = {
  'asia': 'アジア',
  'europe': 'ヨーロッパ',
  'north_america': '北米',
  'south_america': '南米',
  'oceania': 'オセアニア',
  'africa': 'アフリカ',
  'middle_east': '中東'
} as const

export type Region = keyof typeof REGIONS

// 国コードと地域のマッピング
export const COUNTRY_REGIONS: Record<string, Region> = {
  // アジア
  'CN': 'asia', 'JP': 'asia', 'KR': 'asia', 'TW': 'asia', 'HK': 'asia', 'MO': 'asia',
  'TH': 'asia', 'VN': 'asia', 'PH': 'asia', 'ID': 'asia', 'MY': 'asia', 'SG': 'asia',
  'IN': 'asia', 'PK': 'asia', 'BD': 'asia', 'LK': 'asia', 'NP': 'asia', 'MM': 'asia',
  'KH': 'asia', 'LA': 'asia', 'MN': 'asia', 'BT': 'asia', 'MV': 'asia', 'BN': 'asia',
  'TL': 'asia', 'KP': 'asia', 'AF': 'asia',
  
  // ヨーロッパ
  'GB': 'europe', 'FR': 'europe', 'DE': 'europe', 'IT': 'europe', 'ES': 'europe',
  'NL': 'europe', 'BE': 'europe', 'CH': 'europe', 'AT': 'europe', 'SE': 'europe',
  'NO': 'europe', 'DK': 'europe', 'FI': 'europe', 'PL': 'europe', 'CZ': 'europe',
  'HU': 'europe', 'RO': 'europe', 'BG': 'europe', 'GR': 'europe', 'PT': 'europe',
  'IE': 'europe', 'HR': 'europe', 'SI': 'europe', 'SK': 'europe', 'LT': 'europe',
  'LV': 'europe', 'EE': 'europe', 'IS': 'europe', 'LU': 'europe', 'MT': 'europe',
  'CY': 'europe', 'AL': 'europe', 'BA': 'europe', 'ME': 'europe', 'MK': 'europe',
  'RS': 'europe', 'XK': 'europe', 'BY': 'europe', 'UA': 'europe', 'MD': 'europe',
  'GE': 'europe', 'AM': 'europe', 'AZ': 'europe', 'LI': 'europe', 'MC': 'europe',
  'SM': 'europe', 'VA': 'europe', 'AD': 'europe', 'FO': 'europe', 'GI': 'europe',
  'GG': 'europe', 'JE': 'europe', 'IM': 'europe',
  
  // 北米
  'US': 'north_america', 'CA': 'north_america', 'MX': 'north_america',
  'GT': 'north_america', 'BZ': 'north_america', 'SV': 'north_america',
  'HN': 'north_america', 'NI': 'north_america', 'CR': 'north_america',
  'PA': 'north_america', 'CU': 'north_america', 'JM': 'north_america',
  'HT': 'north_america', 'DO': 'north_america', 'PR': 'north_america',
  'BS': 'north_america', 'BB': 'north_america', 'TT': 'north_america',
  'KY': 'north_america', 'TC': 'north_america', 'BM': 'north_america',
  'AG': 'north_america', 'DM': 'north_america', 'GD': 'north_america',
  'KN': 'north_america', 'LC': 'north_america', 'VC': 'north_america',
  'VG': 'north_america', 'VI': 'north_america', 'AI': 'north_america',
  'MS': 'north_america', 'GP': 'north_america', 'MQ': 'north_america',
  'BL': 'north_america', 'MF': 'north_america', 'SX': 'north_america',
  'CW': 'north_america', 'AW': 'north_america', 'BQ': 'north_america',
  'BX': 'north_america',
  
  // 南米
  'BR': 'south_america', 'AR': 'south_america', 'CL': 'south_america',
  'CO': 'south_america', 'PE': 'south_america', 'VE': 'south_america',
  'EC': 'south_america', 'BO': 'south_america', 'PY': 'south_america',
  'UY': 'south_america', 'GY': 'south_america', 'SR': 'south_america',
  'GF': 'south_america', 'FK': 'south_america',
  
  // オセアニア
  'AU': 'oceania', 'NZ': 'oceania', 'PG': 'oceania', 'FJ': 'oceania',
  'NC': 'oceania', 'PF': 'oceania', 'SB': 'oceania', 'VU': 'oceania',
  'WS': 'oceania', 'GU': 'oceania', 'AS': 'oceania', 'MP': 'oceania',
  'FM': 'oceania', 'MH': 'oceania', 'PW': 'oceania', 'KI': 'oceania',
  'NR': 'oceania', 'TV': 'oceania', 'TO': 'oceania', 'NU': 'oceania',
  'CK': 'oceania', 'WF': 'oceania',
  
  // アフリカ
  'ZA': 'africa', 'EG': 'africa', 'NG': 'africa', 'KE': 'africa',
  'ET': 'africa', 'GH': 'africa', 'TZ': 'africa', 'UG': 'africa',
  'MA': 'africa', 'DZ': 'africa', 'SD': 'africa', 'AO': 'africa',
  'MZ': 'africa', 'CM': 'africa', 'CI': 'africa', 'NE': 'africa',
  'BF': 'africa', 'ML': 'africa', 'MW': 'africa', 'ZM': 'africa',
  'SN': 'africa', 'SO': 'africa', 'TD': 'africa', 'GN': 'africa',
  'RW': 'africa', 'BJ': 'africa', 'BI': 'africa', 'TN': 'africa',
  'SS': 'africa', 'TG': 'africa', 'SL': 'africa', 'LY': 'africa',
  'LR': 'africa', 'MR': 'africa', 'CF': 'africa', 'ER': 'africa',
  'GM': 'africa', 'BW': 'africa', 'GA': 'africa', 'GW': 'africa',
  'LS': 'africa', 'NA': 'africa', 'GQ': 'africa', 'MU': 'africa',
  'SZ': 'africa', 'DJ': 'africa', 'RE': 'africa', 'KM': 'africa',
  'CV': 'africa', 'ST': 'africa', 'SC': 'africa', 'MG': 'africa',
  'ZW': 'africa', 'CD': 'africa', 'CG': 'africa', 'YT': 'africa',
  'SH': 'africa',
  
  // 中東
  'SA': 'middle_east', 'AE': 'middle_east', 'IL': 'middle_east',
  'IQ': 'middle_east', 'IR': 'middle_east', 'JO': 'middle_east',
  'KW': 'middle_east', 'LB': 'middle_east', 'OM': 'middle_east',
  'PS': 'middle_east', 'QA': 'middle_east', 'SY': 'middle_east',
  'TR': 'middle_east', 'YE': 'middle_east', 'BH': 'middle_east',
  'KZ': 'middle_east', 'UZ': 'middle_east', 'TM': 'middle_east',
  'TJ': 'middle_east', 'KG': 'middle_east', 'RU': 'middle_east'
}

// 地域名を取得する関数
export function getRegionName(countryCode: string): string {
  const region = COUNTRY_REGIONS[countryCode]
  return region ? REGIONS[region] : '不明'
}

// 地域でフィルタリングする関数
export function filterByRegion<T extends { country_code: string }>(
  items: T[],
  regions: Region[]
): T[] {
  if (regions.length === 0) return items
  return items.filter(item => {
    const region = COUNTRY_REGIONS[item.country_code]
    return region && regions.includes(region)
  })
}
