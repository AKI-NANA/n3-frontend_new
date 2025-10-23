// API Route for data collection/scraping
import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Yahoo Auctionからスクレイピング
async function scrapeYahooAuction(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Yahoo Auctionのページ構造に基づいてデータを抽出
    const title = $('h1.ProductTitle__text').text().trim() ||
                  $('.ProductTitle h1').text().trim() ||
                  $('title').text().replace(' - Yahoo!オークション', '').trim()

    const priceText = $('.Price__value').first().text().trim() ||
                      $('.ProductDetail__price').first().text().trim() ||
                      $('[class*="price"]').first().text().trim()
    const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0

    const condition = $('.ProductDetail__condition').text().trim() ||
                     $('[class*="condition"]').text().trim() ||
                     '不明'

    const stock = '在庫あり' // Yahoo Auctionは基本的に在庫あり

    return {
      success: true,
      title,
      price,
      condition,
      stock,
      url
    }
  } catch (error) {
    console.error(`[Scraping] Yahoo Auction error for ${url}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'スクレイピング失敗',
      url
    }
  }
}

// 汎用スクレイピング（他のサイト用）
async function scrapeGeneric(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // タイトル取得（複数の方法を試す）
    const title = $('h1').first().text().trim() ||
                  $('title').text().trim() ||
                  'タイトル取得失敗'

    // 価格取得（一般的な価格クラス名で検索）
    const priceText = $('[class*="price"]').first().text().trim() ||
                      $('[class*="Price"]').first().text().trim() ||
                      '0'
    const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0

    return {
      success: true,
      title,
      price,
      condition: '不明',
      stock: '確認が必要',
      url
    }
  } catch (error) {
    console.error(`[Scraping] Generic error for ${url}:`, error)
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

    // 各URLをスクレイピング
    const results = await Promise.all(
      urls.map(async (url: string, index: number) => {
        // URLからプラットフォームを判定
        const isYahooAuction = url.includes('yahoo.co.jp') || url.includes('aucfan.com')

        let scrapeResult
        if (isYahooAuction) {
          scrapeResult = await scrapeYahooAuction(url)
        } else {
          scrapeResult = await scrapeGeneric(url)
        }

        return {
          id: `result-${Date.now()}-${index}`,
          url,
          platform: isYahooAuction ? 'yahoo-auction' : 'generic',
          title: scrapeResult.success ? scrapeResult.title : `スクレイピング失敗: ${scrapeResult.error}`,
          price: scrapeResult.success ? scrapeResult.price : 0,
          status: scrapeResult.success ? 'success' : 'error',
          timestamp: new Date().toISOString(),
          stock: scrapeResult.success ? scrapeResult.stock : 'エラー',
          condition: scrapeResult.success ? scrapeResult.condition : 'エラー',
          error: scrapeResult.success ? undefined : scrapeResult.error
        }
      })
    )

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      results,
      message: `データ取得完了: ${successCount}件成功, ${errorCount}件失敗`,
      stats: {
        total: results.length,
        success: successCount,
        failed: errorCount
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
