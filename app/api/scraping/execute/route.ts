// API Route for data collection/scraping
import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { createClient } from '@/lib/supabase/server'

// Puppeteerを使用したYahoo Auctionスクレイピング
async function scrapeYahooAuction(url: string) {
  let browser
  try {
    console.log(`[Scraping] Starting Yahoo Auction scrape for: ${url}`)

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

    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    // ページにアクセス
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    // ページが読み込まれるまで少し待つ
    await page.waitForTimeout(2000)

    // データを抽出
    const data = await page.evaluate(() => {
      // タイトル取得
      const titleElement = document.querySelector('h1.ProductTitle__text') ||
                          document.querySelector('.ProductTitle h1') ||
                          document.querySelector('h1')
      const title = titleElement?.textContent?.trim() || ''

      // 価格取得（複数のパターンを試す）
      let price = 0

      // 現在価格
      const priceElement = document.querySelector('.Price__value') ||
                          document.querySelector('[class*="Price__value"]') ||
                          document.querySelector('.Price') ||
                          document.querySelector('[data-testid="price"]')

      if (priceElement) {
        const priceText = priceElement.textContent || ''
        price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0
      }

      // 即決価格も確認
      if (price === 0) {
        const buyNowElement = document.querySelector('[class*="BuyNow"]')
        if (buyNowElement) {
          const buyNowText = buyNowElement.textContent || ''
          price = parseInt(buyNowText.replace(/[^0-9]/g, '')) || 0
        }
      }

      // コンディション取得
      const conditionElement = document.querySelector('.ProductDetail__condition') ||
                              document.querySelector('[class*="condition"]') ||
                              document.querySelector('[class*="Condition"]')
      const condition = conditionElement?.textContent?.trim() || '不明'

      // 在庫状況（オークションは基本的に在庫あり）
      const stock = '在庫あり'

      // 入札数
      const bidsElement = document.querySelector('[class*="Bids"]')
      const bids = bidsElement?.textContent?.trim() || '0'

      return {
        title,
        price,
        condition,
        stock,
        bids
      }
    })

    console.log(`[Scraping] Success: ${data.title}, Price: ${data.price}`)

    await browser.close()

    return {
      success: true,
      ...data,
      url
    }

  } catch (error) {
    console.error(`[Scraping] Yahoo Auction error for ${url}:`, error)
    if (browser) {
      await browser.close()
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'スクレイピング失敗',
      url
    }
  }
}

// 汎用スクレイピング（puppeteer使用）
async function scrapeGeneric(url: string) {
  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    const data = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent?.trim() ||
                   document.title ||
                   'タイトル取得失敗'

      const priceElement = document.querySelector('[class*="price"]') ||
                          document.querySelector('[class*="Price"]')
      const priceText = priceElement?.textContent || '0'
      const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0

      return { title, price }
    })

    await browser.close()

    return {
      success: true,
      title: data.title,
      price: data.price,
      condition: '不明',
      stock: '確認が必要',
      url
    }

  } catch (error) {
    console.error(`[Scraping] Generic error for ${url}:`, error)
    if (browser) {
      await browser.close()
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'スクレイピング失敗',
      url
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, platforms } = body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'URLsが指定されていません' },
        { status: 400 }
      )
    }

    console.log(`[Scraping] Processing ${urls.length} URLs`)

    // 各URLをスクレイピング（並列処理は避ける - リソース節約）
    const results = []
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]

      // URLからプラットフォームを判定
      const isYahooAuction = url.includes('auctions.yahoo.co.jp')

      console.log(`[Scraping] Processing URL ${i + 1}/${urls.length}: ${url}`)

      let scrapeResult
      if (isYahooAuction) {
        scrapeResult = await scrapeYahooAuction(url)
      } else {
        scrapeResult = await scrapeGeneric(url)
      }

      results.push({
        id: `result-${Date.now()}-${i}`,
        url,
        platform: isYahooAuction ? 'yahoo-auction' : 'generic',
        title: scrapeResult.success ? scrapeResult.title : `スクレイピング失敗: ${scrapeResult.error}`,
        price: scrapeResult.success ? scrapeResult.price : 0,
        status: scrapeResult.success ? 'success' : 'error',
        timestamp: new Date().toISOString(),
        stock: scrapeResult.success ? scrapeResult.stock : 'エラー',
        condition: scrapeResult.success ? scrapeResult.condition : 'エラー',
        bids: scrapeResult.bids || '0',
        error: scrapeResult.success ? undefined : scrapeResult.error
      })
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    console.log(`[Scraping] Complete: ${successCount} success, ${errorCount} failed`)

    // 成功した結果をDBに保存
    let savedCount = 0
    if (successCount > 0) {
      try {
        const supabase = await createClient()

        // 成功した結果のみを保存
        const successResults = results.filter(r => r.status === 'success')

        for (const result of successResults) {
          try {
            const { data, error } = await supabase
              .from('products')
              .insert({
                title: result.title,
                price: result.price,
                condition: result.condition,
                stock_status: result.stock,
                source_url: result.url,
                platform: result.platform,
                scraping_date: result.timestamp,
                ready_to_list: false, // 初期状態では未承認
                status: 'draft' // ドラフト状態
              })
              .select()

            if (error) {
              console.error(`[Scraping] DB save error for ${result.url}:`, error)
            } else {
              savedCount++
              console.log(`[Scraping] Saved to DB: ${result.title}`)
            }
          } catch (dbError) {
            console.error(`[Scraping] DB error:`, dbError)
          }
        }

        console.log(`[Scraping] Saved ${savedCount}/${successCount} items to database`)
      } catch (error) {
        console.error('[Scraping] Database connection error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `データ取得完了: ${successCount}件成功, ${errorCount}件失敗${savedCount > 0 ? `, ${savedCount}件をDBに保存` : ''}`,
      stats: {
        total: results.length,
        success: successCount,
        failed: errorCount,
        saved: savedCount
      }
    })

  } catch (error) {
    console.error('[Scraping] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Data Collection API is running',
    endpoints: {
      scrape: '/api/scraping/execute',
      status: '/api/scraping/status',
      history: '/api/scraping/history'
    }
  })
}
