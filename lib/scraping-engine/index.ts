/**
 * 共通スクレイピングエンジン - Yahoo!オークション実装
 */

import puppeteer from 'puppeteer'

export interface ScrapingOptions {
  extract_price?: boolean
  extract_stock?: boolean
  check_page_exists?: boolean
  extract_images?: boolean
  extract_details?: boolean
  timeout?: number
  retryCount?: number
}

export interface ScrapingResult {
  success: boolean
  page_exists: boolean
  price?: number
  stock?: number | string
  condition?: string
  images?: string[]
  title?: string
  error?: string
}

/**
 * Yahoo!オークションから在庫監視用データを取得
 */
export async function executeProductScraping(options: {
  url: string
  marketplace: string
  extract_price?: boolean
  extract_stock?: boolean
  check_page_exists?: boolean
}): Promise<ScrapingResult> {
  let browser

  try {
    console.log(`[Scraping] 在庫監視実行: ${options.url}`)

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

    // ページが存在するかチェック
    try {
      const response = await page.goto(options.url, {
        waitUntil: 'networkidle2',
        timeout: 15000
      })

      if (!response || response.status() === 404) {
        await browser.close()
        return {
          success: true,
          page_exists: false,
          price: undefined,
          stock: 0
        }
      }
    } catch (error) {
      await browser.close()
      return {
        success: true,
        page_exists: false,
        price: undefined,
        stock: 0
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    // データを抽出（在庫監視用に最小限）
    const data = await page.evaluate(() => {
      // 1. 価格取得
      let price = 0
      const dtElements = Array.from(document.querySelectorAll('dt'))
      
      // 即決価格を優先
      const sokketsuDt = dtElements.find(dt => dt.textContent?.includes('即決'))
      if (sokketsuDt) {
        const dd = sokketsuDt.nextElementSibling
        const priceSpan = dd?.querySelector('span')
        const priceText = priceSpan?.textContent || ''
        const cleanPrice = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '')
        price = parseInt(cleanPrice) || 0
      }

      // 即決価格がない場合は現在価格
      if (price === 0) {
        const genzaiDt = dtElements.find(dt => dt.textContent?.includes('現在'))
        if (genzaiDt) {
          const dd = genzaiDt.nextElementSibling
          const priceSpan = dd?.querySelector('span')
          const priceText = priceSpan?.textContent || ''
          const cleanPrice = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '')
          price = parseInt(cleanPrice) || 0
        }
      }

      // 2. 在庫状況（オークション終了していないか）
      const titleElement = document.querySelector('h1')
      const title = titleElement?.textContent?.trim() || ''
      
      // 終了している場合
      if (title.includes('オークションは終了しました') || title.includes('取り下げ')) {
        return { price, stock: 0, available: false }
      }

      // 3. 状態チェック
      const conditionSvg = document.querySelector('svg[aria-label="状態"]')
      let condition = '不明'
      if (conditionSvg) {
        const parentLi = conditionSvg.closest('li')
        const conditionSpan = parentLi?.querySelector('span:not(:has(svg))')
        condition = conditionSpan?.textContent?.trim() || '不明'
      }

      return {
        price,
        stock: 1, // Yahoo!オークションは通常1点
        available: true,
        condition
      }
    })

    await browser.close()

    return {
      success: true,
      page_exists: true,
      price: data.price,
      stock: data.stock,
      condition: data.condition
    }

  } catch (error) {
    console.error(`[Scraping] エラー:`, error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        // 無視
      }
    }

    return {
      success: false,
      page_exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 複数の商品を一括スクレイピング
 */
export async function scrapeMultipleProducts(products: Array<{
  url: string
  marketplace: string
}>): Promise<ScrapingResult[]> {
  const results: ScrapingResult[] = []

  for (const product of products) {
    const result = await executeProductScraping({
      url: product.url,
      marketplace: product.marketplace,
      extract_price: true,
      extract_stock: true,
      check_page_exists: true
    })

    results.push(result)

    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return results
}
