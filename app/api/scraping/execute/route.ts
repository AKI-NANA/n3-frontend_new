// API Route for Yahoo Auction scraping with structure-based selectors
import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ScrapingResult {
  id: string
  url: string
  platform: string
  title: string
  price: number
  status: 'success' | 'error'
  timestamp: string
  stock: string
  condition: string
  bids?: string
  error?: string
}

// Yahoo Auctionから構造ベーススクレイピング
// クラス名に依存せず、HTML構造とaria-label、テキストコンテンツで抽出
async function scrapeYahooAuction(url: string): Promise<ScrapingResult> {
  let browser
  const resultId = `result-${Date.now()}`

  try {
    console.log(`[Scraping] 構造ベーススクレイピング開始: ${url}`)

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

    // ページが読み込まれるまで待つ
    await page.waitForTimeout(2000)

    // データを抽出（構造ベース）
    const data = await page.evaluate(() => {
      // 1. タイトル - 最初のh1タグ（クラス名不要）
      const titleElement = document.querySelector('h1')
      const title = titleElement?.textContent?.trim() || ''

      // 2. 価格 - 「即決」というテキストを含むdtタグを探し、その次のdd > spanから取得
      let price = 0
      const dtElements = Array.from(document.querySelectorAll('dt'))
      const sokketsuDt = dtElements.find(dt => dt.textContent?.includes('即決'))

      if (sokketsuDt) {
        const dd = sokketsuDt.nextElementSibling
        const priceSpan = dd?.querySelector('span')
        const priceText = priceSpan?.textContent || ''
        // 数字とカンマのみ抽出（HTMLコメントも除去）
        const cleanPrice = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '')
        price = parseInt(cleanPrice) || 0
      }

      // 価格が取れなかった場合、「現在価格」を探す
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

      // 3. 商品状態 - aria-label="状態"を持つsvgの兄弟要素のspanを探す
      const conditionSvg = document.querySelector('svg[aria-label="状態"]')
      let condition = '不明'

      if (conditionSvg) {
        // 親要素から次のspanを探す
        const parentLi = conditionSvg.closest('li')
        const conditionSpan = parentLi?.querySelector('span:not(:has(svg))')
        const conditionText = conditionSpan?.textContent?.trim() || '不明'

        // テキストから状態を判定
        if (conditionText.includes('新品') || conditionText.includes('未使用') || conditionText.includes('未開封')) {
          condition = '新品'
        } else if (conditionText.includes('目立った傷や汚れなし')) {
          condition = '目立った傷や汚れなし'
        } else if (conditionText.includes('傷や汚れあり')) {
          condition = '傷や汚れあり'
        } else if (conditionText.includes('ジャンク')) {
          condition = 'ジャンク品'
        } else {
          condition = conditionText
        }
      }

      // 4. 入札数 - aria-label="入札"を持つsvgの兄弟要素のリンクを探す
      const bidsSvg = document.querySelector('svg[aria-label="入札"]')
      let bids = '0件'

      if (bidsSvg) {
        const parentLi = bidsSvg.closest('li')
        const bidsLink = parentLi?.querySelector('a')
        bids = bidsLink?.textContent?.trim() || '0件'
      }

      // 5. 在庫状況 - オークションは基本的に在庫あり
      const stock = '在庫あり'

      return {
        title,
        price,
        condition,
        stock,
        bids
      }
    })

    console.log(`[Scraping] 抽出成功:`, data)

    await browser.close()

    // Supabaseに保存
    const productData = {
      title: data.title,
      price: data.price,
      source_url: url,
      condition: data.condition,
      stock_status: data.stock,
      bid_count: data.bids,
      platform: 'Yahoo Auction',
      scraped_at: new Date().toISOString(),
      scraping_method: 'structure_based_puppeteer_v2025'
    }

    console.log('[Database] 保存データ:', productData)

    const { error: dbError } = await supabase
      .from('scraped_products')
      .insert([productData])

    if (dbError) {
      console.error('[Database] 保存エラー:', dbError)
    } else {
      console.log('[Database] 保存成功')
    }

    return {
      id: resultId,
      url,
      platform: 'Yahoo Auction',
      title: data.title || '取得失敗',
      price: data.price || 0,
      status: 'success',
      timestamp: new Date().toISOString(),
      stock: data.stock,
      condition: data.condition,
      bids: data.bids
    }

  } catch (error) {
    console.error(`[Scraping] エラー:`, error)
    console.error(`[Scraping] エラー詳細:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('[Scraping] ブラウザクローズエラー:', closeError)
      }
    }

    return {
      id: resultId,
      url,
      platform: 'Yahoo Auction',
      title: 'スクレイピング失敗',
      price: 0,
      status: 'error',
      timestamp: new Date().toISOString(),
      stock: '不明',
      condition: '不明',
      error: error instanceof Error ? error.message : 'スクレイピング失敗',
      debugInfo: {
        errorType: error instanceof Error ? error.name : 'Unknown',
        suggestion: 'Run: npx puppeteer browsers install chrome'
      }
    }
  }
}

// メインPOSTハンドラー
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, platforms } = body

    console.log(`[API] スクレイピングリクエスト受信: ${urls?.length || 0}件`)
    console.log(`[API] 環境:`, {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    // 各URLをスクレイピング
    const results: ScrapingResult[] = []

    for (const url of urls) {
      // Yahoo Auctionの判定
      if (url.includes('auctions.yahoo.co.jp') || url.includes('page.auctions.yahoo.co.jp')) {
        const result = await scrapeYahooAuction(url)
        results.push(result)
      } else {
        // 未対応のプラットフォーム
        results.push({
          id: `result-${Date.now()}-${results.length}`,
          url,
          platform: '未対応',
          title: '対応していないURLです',
          price: 0,
          status: 'error',
          timestamp: new Date().toISOString(),
          stock: '不明',
          condition: '不明',
          error: 'Yahoo Auction以外は現在対応していません'
        })
      }
    }

    // 成功/失敗の統計を計算
    const stats = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length
    }

    console.log('[API] スクレイピング完了:', stats)

    return NextResponse.json({
      success: true,
      results,
      stats,
      message: `${stats.success}件のデータ取得に成功しました`
    })

  } catch (error) {
    console.error('[API] エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}

// GETハンドラー（ヘルスチェック）
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Yahoo Auction Structure-Based Scraping API is running',
    version: '2025-v1',
    method: 'structure_based (no class names)',
    endpoints: {
      scrape: '/api/scraping/execute (POST)',
      test: '/api/scraping/execute (GET)'
    }
  })
}
