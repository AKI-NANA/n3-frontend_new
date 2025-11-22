/**
 * プラットフォーム自動判定ユーティリティ
 * URLからプラットフォームを自動判定する
 */

export type PlatformType =
  | 'yahoo_auction'
  | 'mercari'
  | 'mercari_shops'
  | 'yahoo_fleamarket'
  | 'rakuten'
  | 'amazon'
  | 'yodobashi'
  | 'monotaro'
  | 'other'

interface PlatformDetectionResult {
  platform: PlatformType
  confidence: 'high' | 'medium' | 'low'
}

/**
 * URLドメインからプラットフォームを判定
 */
export function detectPlatformFromUrl(url: string): PlatformDetectionResult {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    const pathname = urlObj.pathname.toLowerCase()

    // Yahoo! オークション
    if (hostname.includes('yahoo') && (pathname.includes('auction') || hostname.includes('auctions.yahoo'))) {
      return { platform: 'yahoo_auction', confidence: 'high' }
    }

    // メルカリ
    if (hostname.includes('mercari.com') || hostname === 'jp.mercari.com') {
      return { platform: 'mercari', confidence: 'high' }
    }

    // メルカリShops
    if (hostname.includes('mercari-shops') || hostname.includes('shops.mercari')) {
      return { platform: 'mercari_shops', confidence: 'high' }
    }

    // ヤフーフリマ
    if (hostname.includes('yahoo') && (pathname.includes('fleamarket') || hostname.includes('paypayfleamarket'))) {
      return { platform: 'yahoo_fleamarket', confidence: 'high' }
    }

    // 楽天
    if (hostname.includes('rakuten.co.jp') || hostname.includes('rakuten-')) {
      return { platform: 'rakuten', confidence: 'high' }
    }

    // Amazon
    if (hostname.includes('amazon.co.jp') || hostname.includes('amazon.com')) {
      return { platform: 'amazon', confidence: 'high' }
    }

    // ヨドバシ
    if (hostname.includes('yodobashi.com')) {
      return { platform: 'yodobashi', confidence: 'high' }
    }

    // モノタロウ
    if (hostname.includes('monotaro.com')) {
      return { platform: 'monotaro', confidence: 'high' }
    }

    // 不明なプラットフォーム
    return { platform: 'other', confidence: 'low' }
  } catch (error) {
    console.error('URL解析エラー:', error)
    return { platform: 'other', confidence: 'low' }
  }
}

/**
 * 複数URLからプラットフォームを一括判定
 */
export function detectPlatformsFromUrls(urls: string[]): Array<{
  url: string
  platform: PlatformType
  confidence: 'high' | 'medium' | 'low'
}> {
  return urls.map(url => {
    const detection = detectPlatformFromUrl(url)
    return {
      url,
      ...detection
    }
  })
}

/**
 * URLの妥当性チェック
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * URLリストから重複を除去
 */
export function deduplicateUrls(urls: string[]): string[] {
  return [...new Set(urls.filter(url => url.trim().length > 0))]
}

/**
 * CSVテキストをURL配列にパース
 */
export function parseCsvToUrls(csvText: string): string[] {
  const lines = csvText.split('\n')
  const urls: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // コメント行やヘッダー行をスキップ
    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.toLowerCase() === 'url') {
      continue
    }

    // カンマ区切りの場合、最初のカラムをURLとして扱う
    const columns = trimmed.split(',')
    const potentialUrl = columns[0].trim()

    if (isValidUrl(potentialUrl)) {
      urls.push(potentialUrl)
    }
  }

  return deduplicateUrls(urls)
}
