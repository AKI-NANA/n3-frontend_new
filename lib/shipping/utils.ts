// 送料計算関連のユーティリティ関数

/**
 * 価格フォーマット（日本円）
 */
export function formatPriceJPY(price: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0
  }).format(Math.round(price))
}

/**
 * 価格フォーマット（米ドル）
 */
export function formatPriceUSD(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price)
}

/**
 * シンプルな価格フォーマット（通貨記号なし）
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ja-JP').format(Math.round(price))
}

/**
 * 重量フォーマット
 */
export function formatWeight(weightG: number, unit: 'g' | 'kg' = 'kg'): string {
  if (unit === 'g') {
    return `${weightG.toFixed(0)}g`
  }
  return `${(weightG / 1000).toFixed(2)}kg`
}

/**
 * 寸法フォーマット
 */
export function formatDimensions(
  length: number,
  width: number,
  height: number,
  unit: 'cm' | 'inch' = 'cm'
): string {
  return `${length}×${width}×${height}${unit}`
}

/**
 * 配送日数フォーマット
 */
export function formatDeliveryDays(min: number, max: number): string {
  if (min === max) {
    return `${min}営業日`
  }
  return `${min}-${max}営業日`
}

/**
 * 配送業者コードから表示名を取得
 */
export function getCarrierDisplayName(carrierCode: string): string {
  const carrierMap: Record<string, string> = {
    'CPASS': 'CPass',
    'JPPOST': '日本郵便',
    'ELOJI': 'Eloji',
    'UPS': 'UPS',
    'DHL': 'DHL',
    'FEDEX': 'FedEx'
  }
  return carrierMap[carrierCode] || carrierCode
}

/**
 * サービスタイプから表示名を取得
 */
export function getServiceTypeDisplayName(serviceType: string): string {
  const serviceMap: Record<string, string> = {
    'express': 'エクスプレス',
    'standard': 'スタンダード',
    'economy': 'エコノミー',
    'surface': '船便'
  }
  return serviceMap[serviceType] || serviceType
}

/**
 * 国コードから国名を取得
 */
export function getCountryName(countryCode: string): string {
  const countryMap: Record<string, string> = {
    'US': 'アメリカ',
    'GB': 'イギリス',
    'DE': 'ドイツ',
    'AU': 'オーストラリア',
    'CA': 'カナダ',
    'FR': 'フランス',
    'KR': '韓国',
    'SG': 'シンガポール',
    'TH': 'タイ',
    'MY': 'マレーシア',
    'TW': '台湾',
    'HK': '香港',
    'CN': '中国',
    'JP': '日本'
  }
  return countryMap[countryCode] || countryCode
}

/**
 * 国フラグ絵文字を取得
 */
export function getCountryFlag(countryCode: string): string {
  const flagMap: Record<string, string> = {
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'AU': '🇦🇺',
    'CA': '🇨🇦',
    'FR': '🇫🇷',
    'KR': '🇰🇷',
    'SG': '🇸🇬',
    'TH': '🇹🇭',
    'MY': '🇲🇾',
    'TW': '🇹🇼',
    'HK': '🇭🇰',
    'CN': '🇨🇳',
    'JP': '🇯🇵'
  }
  return flagMap[countryCode] || '🌍'
}

/**
 * エラーメッセージの整形
 */
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }
  
  if (error?.message) {
    return error.message
  }
  
  if (error?.error_description) {
    return error.error_description
  }
  
  return '不明なエラーが発生しました'
}

/**
 * 配送制限のチェック
 */
export function checkShippingRestrictions(
  weight: number,
  dimensions: { length: number; width: number; height: number },
  country: string,
  serviceConfig: any
): string[] {
  const restrictions: string[] = []
  
  // 重量制限
  if (serviceConfig.max_weight_g && weight > serviceConfig.max_weight_g) {
    restrictions.push(`重量制限: ${formatWeight(serviceConfig.max_weight_g)}以下`)
  }
  
  // サイズ制限
  if (serviceConfig.max_dimension_cm) {
    const maxSide = Math.max(dimensions.length, dimensions.width, dimensions.height)
    if (maxSide > serviceConfig.max_dimension_cm) {
      restrictions.push(`最大辺制限: ${serviceConfig.max_dimension_cm}cm以下`)
    }
  }
  
  if (serviceConfig.max_total_dimension_cm) {
    const totalDimension = dimensions.length + dimensions.width + dimensions.height
    if (totalDimension > serviceConfig.max_total_dimension_cm) {
      restrictions.push(`3辺合計制限: ${serviceConfig.max_total_dimension_cm}cm以下`)
    }
  }
  
  // 国別制限
  if (serviceConfig.available_to && !serviceConfig.available_to.includes(country)) {
    restrictions.push(`配送不可地域: ${getCountryName(country)}`)
  }
  
  return restrictions
}

/**
 * 配送信頼性スコア計算
 */
export function calculateReliabilityScore(result: {
  tracking: boolean
  insurance_included: boolean
  signature_available: boolean
  delivery_days_min: number
  delivery_days_max: number
}): number {
  let score = 0
  
  // 追跡機能
  if (result.tracking) score += 30
  
  // 保険
  if (result.insurance_included) score += 25
  
  // 署名確認
  if (result.signature_available) score += 20
  
  // 配送日数の安定性（幅が狭いほど高スコア）
  const dayRange = result.delivery_days_max - result.delivery_days_min
  if (dayRange <= 2) score += 25
  else if (dayRange <= 5) score += 15
  else if (dayRange <= 10) score += 5
  
  return Math.min(score, 100)
}

/**
 * 為替レート取得（モック版）
 */
export async function getExchangeRate(): Promise<{ usd_jpy: number; updated_at: string }> {
  // 実際の実装では外部APIから取得
  return {
    usd_jpy: 154.32,
    updated_at: new Date().toISOString()
  }
}

/**
 * デバウンス関数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * ローカルストレージ操作
 */
export const localStorage = {
  set: (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  },
  
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue
      } catch {
        return defaultValue
      }
    }
    return defaultValue
  },
  
  remove: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key)
    }
  }
}

/**
 * CSV出力用のデータ変換
 */
export function convertToCSV(results: any[]): string {
  if (results.length === 0) return ''
  
  const headers = [
    '配送業者',
    'サービス',
    'ゾーン',
    '基本料金',
    '追加料金',
    '合計料金',
    'USD料金',
    '配送日数',
    '追跡',
    '保険',
    '署名',
    'データソース'
  ]
  
  const rows = results.map(result => [
    result.carrier_name,
    result.service_name,
    result.zone_name,
    result.base_price_jpy,
    result.fuel_surcharge_jpy + result.insurance_fee_jpy + result.signature_fee_jpy + result.oversize_fee_jpy,
    result.total_price_jpy,
    result.total_price_usd.toFixed(2),
    result.delivery_days_text,
    result.tracking ? 'あり' : 'なし',
    result.insurance_included ? 'あり' : 'なし',
    result.signature_available ? 'あり' : 'なし',
    result.source_table
  ])
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
}

/**
 * CSVダウンロード
 */
export function downloadCSV(data: string, filename: string = 'shipping_rates.csv') {
  if (typeof window === 'undefined') return
  
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
