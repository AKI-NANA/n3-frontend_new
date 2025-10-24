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
  price: number | null
  status: 'success' | 'partial' | 'error'
  timestamp: string
  stock: string
  condition: string
  bids?: string
  error?: string
  warnings?: string[]
  dataQuality?: {
    titleFound: boolean
    priceFound: boolean
    conditionFound: boolean
    bidsFound: boolean
  }
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

    // 少し待機（networkidle2の後に追加で待つ）
    await new Promise(resolve => setTimeout(resolve, 2000))

    // データを抽出（構造ベース）
    const data = await page.evaluate(() => {
      const result = {
        title: null as string | null,
        price: null as number | null,
        condition: null as string | null,
        bids: null as string | null,
        titleFound: false,
        priceFound: false,
        conditionFound: false,
        bidsFound: false
      }

      // 1. タイトル - 最初のh1タグ（クラス名不要）
      const titleElement = document.querySelector('h1')
      if (titleElement && titleElement.textContent) {
        const titleText = titleElement.textContent.trim()
        if (titleText.length > 0) {
          result.title = titleText
          result.titleFound = true
        }
      }

      // 2. 価格 - 「即決」というテキストを含むdtタグを探し、その次のdd > spanから取得
      const dtElements = Array.from(document.querySelectorAll('dt'))
      const sokketsuDt = dtElements.find(dt => dt.textContent?.includes('即決'))

      if (sokketsuDt) {
        const dd = sokketsuDt.nextElementSibling
        const priceSpan = dd?.querySelector('span')
        const priceText = priceSpan?.textContent || ''
        // 数字とカンマのみ抽出（HTMLコメントも除去）
        const cleanPrice = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '')
        const priceNum = parseInt(cleanPrice)
        if (!isNaN(priceNum) && priceNum > 0) {
          result.price = priceNum
          result.priceFound = true
        }
      }

      // 価格が取れなかった場合、「現在価格」を探す
      if (!result.priceFound) {
        const genzaiDt = dtElements.find(dt => dt.textContent?.includes('現在'))
        if (genzaiDt) {
          const dd = genzaiDt.nextElementSibling
          const priceSpan = dd?.querySelector('span')
          const priceText = priceSpan?.textContent || ''
          const cleanPrice = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '')
          const priceNum = parseInt(cleanPrice)
          if (!isNaN(priceNum) && priceNum > 0) {
            result.price = priceNum
            result.priceFound = true
          }
        }
      }

      // 3. 商品状態 - aria-label="状態"を持つsvgの兄弟要素のspanを探す
      const conditionSvg = document.querySelector('svg[aria-label="状態"]')
      if (conditionSvg) {
        const parentLi = conditionSvg.closest('li')
        const conditionSpan = parentLi?.querySelector('span:not(:has(svg))')
        if (conditionSpan && conditionSpan.textContent) {
          const conditionText = conditionSpan.textContent.trim()
          if (conditionText.length > 0) {
            result.condition = conditionText
            result.conditionFound = true
          }
        }
      }

      // 4. 入札数 - aria-label="入札"を持つsvgの兄弟要素のリンクを探す
      const bidsSvg = document.querySelector('svg[aria-label="入札"]')
      if (bidsSvg) {
        const parentLi = bidsSvg.closest('li')
        const bidsLink = parentLi?.querySelector('a')
        if (bidsLink && bidsLink.textContent) {
          const bidsText = bidsLink.textContent.trim()
          if (bidsText.length > 0) {
            result.bids = bidsText
            result.bidsFound = true
          }
        }
      }

      return result
    })

    console.log(`[Scraping] 抽出結果:`, data)

    await browser.close()

    // データ品質チェック
    const warnings: string[] = []

    // 必須フィールドチェック
    if (!data.titleFound) {
      warnings.push('タイトルを取得できませんでした')
    }
    if (!data.priceFound) {
      warnings.push('価格を取得できませんでした')
    }

    // オプションフィールドチェック
    if (!data.conditionFound) {
      warnings.push('商品状態を取得できませんでした')
    }
    if (!data.bidsFound) {
      warnings.push('入札数を取得できませんでした')
    }

    // 必須フィールドが取得できなかった場合はエラー
    if (!data.titleFound || !data.priceFound) {
      console.error('[Scraping] 必須データ取得失敗:', warnings)
      return {
        id: resultId,
        url,
        platform: 'Yahoo Auction',
        title: data.title || '【取得失敗】タイトルを取得できませんでした',
        price: data.price,
        status: 'error',
        timestamp: new Date().toISOString(),
        stock: '取得失敗',
        condition: data.condition || '取得失敗',
        bids: data.bids,
        error: '必須データ（タイトルまたは価格）の取得に失敗しました',
        warnings,
        dataQuality: {
          titleFound: data.titleFound,
          priceFound: data.priceFound,
          conditionFound: data.conditionFound,
          bidsFound: data.bidsFound
        }
      }
    }

    // 部分的な取得の場合
    const status = warnings.length > 0 ? 'partial' : 'success'

    // Supabaseに保存（必須データが取得できた場合のみ）
    const productData = {
      title: data.title!,
      price: data.price!,
      source_url: url,
      condition: data.condition || null,
      stock_status: null, // 推測しない
      bid_count: data.bids || null,
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
      warnings.push('データベース保存に失敗しました')
    } else {
      console.log('[Database] 保存成功')
    }

    return {
      id: resultId,
      url,
      platform: 'Yahoo Auction',
      title: data.title!,
      price: data.price!,
      status,
      timestamp: new Date().toISOString(),
      stock: '在庫情報なし', // Yahoo Auctionでは在庫情報は提供されない
      condition: data.condition || '取得失敗',
      bids: data.bids || '取得失敗',
      warnings: warnings.length > 0 ? warnings : undefined,
      dataQuality: {
        titleFound: data.titleFound,
        priceFound: data.priceFound,
        conditionFound: data.conditionFound,
        bidsFound: data.bidsFound
      }
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
      title: '【エラー】スクレイピング実行失敗',
      price: null,
      status: 'error',
      timestamp: new Date().toISOString(),
      stock: '取得失敗',
      condition: '取得失敗',
      error: error instanceof Error ? error.message : 'スクレイピング実行中にエラーが発生しました',
      dataQuality: {
        titleFound: false,
        priceFound: false,
        conditionFound: false,
        bidsFound: false
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
          title: '【エラー】対応していないURL',
          price: null,
          status: 'error',
          timestamp: new Date().toISOString(),
          stock: '取得失敗',
          condition: '取得失敗',
          error: 'Yahoo Auction以外のURLは現在対応していません',
          dataQuality: {
            titleFound: false,
            priceFound: false,
            conditionFound: false,
            bidsFound: false
          }
        })
      }
    }

    // 成功/失敗の統計を計算
    const stats = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      partial: results.filter(r => r.status === 'partial').length,
      failed: results.filter(r => r.status === 'error').length
    }

    console.log('[API] スクレイピング完了:', stats)

    return NextResponse.json({
      success: true,
      results,
      stats,
      message: `成功: ${stats.success}件、部分的: ${stats.partial}件、失敗: ${stats.failed}件`
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
    version: '2025-v2-safe',
    method: 'structure_based (no class names, no assumptions)',
    safetyFeatures: [
      '必須データ（タイトル・価格）が取得できない場合はエラー',
      '推測値は絶対に返さない',
      'データ品質フラグで取得状況を明示',
      '警告メッセージで部分的な取得を通知'
    ],
    endpoints: {
      scrape: '/api/scraping/execute (POST)',
      test: '/api/scraping/execute (GET)'
    }
  })
}
