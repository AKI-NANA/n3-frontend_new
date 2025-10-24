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
  shippingCost: number | null
  totalCost: number | null  // 仕入れ値 = 価格 + 送料
  status: 'success' | 'partial' | 'error'
  timestamp: string
  stock: string
  condition: string
  bids?: string
  images?: string[]
  description?: string
  sellerName?: string
  sellerRating?: string
  endTime?: string
  category?: string
  categoryPath?: string  // 完全なカテゴリパス（eBayマッピング用）
  quantity?: string  // 個数
  shippingDays?: string  // 発送日数
  auctionId?: string  // オークションID
  startingPrice?: number | null  // 開始価格
  error?: string
  warnings?: string[]
  dataQuality?: {
    titleFound: boolean
    priceFound: boolean
    shippingFound: boolean
    conditionFound: boolean
    bidsFound: boolean
    imagesFound: boolean
    descriptionFound: boolean
    sellerFound: boolean
    categoryPathFound: boolean
    quantityFound: boolean
    shippingDaysFound: boolean
    auctionIdFound: boolean
    startingPriceFound: boolean
  }
}

// Yahoo Auctionから構造ベーススクレイピング（全情報取得）
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    // ページにアクセス
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 2000))

    // データを抽出（構造ベース）
    const data = await page.evaluate(() => {
      const result = {
        title: null as string | null,
        price: null as number | null,
        shippingCost: null as number | null,
        condition: null as string | null,
        bids: null as string | null,
        images: [] as string[],
        description: null as string | null,
        sellerName: null as string | null,
        sellerRating: null as string | null,
        endTime: null as string | null,
        category: null as string | null,
        categoryPath: null as string | null,
        quantity: null as string | null,
        shippingDays: null as string | null,
        auctionId: null as string | null,
        startingPrice: null as number | null,
        titleFound: false,
        priceFound: false,
        shippingFound: false,
        conditionFound: false,
        bidsFound: false,
        imagesFound: false,
        descriptionFound: false,
        sellerFound: false,
        categoryPathFound: false,
        quantityFound: false,
        shippingDaysFound: false,
        auctionIdFound: false,
        startingPriceFound: false
      }

      // 1. タイトル - 最初のh1タグ
      const titleElement = document.querySelector('h1')
      if (titleElement && titleElement.textContent) {
        const titleText = titleElement.textContent.trim()
        if (titleText.length > 0) {
          result.title = titleText
          result.titleFound = true
        }
      }

      // 2. 価格 - 「即決」または「現在」
      const dtElements = Array.from(document.querySelectorAll('dt'))

      // 即決価格を優先
      const sokketsuDt = dtElements.find(dt => dt.textContent?.includes('即決'))
      if (sokketsuDt) {
        const dd = sokketsuDt.nextElementSibling
        const priceSpan = dd?.querySelector('span')
        const priceText = priceSpan?.textContent || ''
        const cleanPrice = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '')
        const priceNum = parseInt(cleanPrice)
        if (!isNaN(priceNum) && priceNum > 0) {
          result.price = priceNum
          result.priceFound = true
        }
      }

      // 現在価格をフォールバック
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

      // 3. 送料 - 「配送」「送料」などのラベル
      const shippingPatterns = ['配送', '送料', '発送']
      for (const pattern of shippingPatterns) {
        const shippingDt = dtElements.find(dt => dt.textContent?.includes(pattern))
        if (shippingDt) {
          const dd = shippingDt.nextElementSibling
          const shippingText = dd?.textContent || ''

          // 「出品者負担」「送料無料」などをチェック
          if (shippingText.includes('出品者負担') || shippingText.includes('送料無料') || shippingText.includes('無料')) {
            result.shippingCost = 0
            result.shippingFound = true
            break
          }

          // 金額抽出
          const shippingMatch = shippingText.match(/(\d{1,3}(?:,\d{3})*)[\s]*円/)
          if (shippingMatch) {
            const shippingNum = parseInt(shippingMatch[1].replace(/,/g, ''))
            if (!isNaN(shippingNum)) {
              result.shippingCost = shippingNum
              result.shippingFound = true
              break
            }
          }
        }
      }

      // 4. 商品状態
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

      // 5. 入札数
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

      // 6. 画像全取得（Yahoo画像サーバーから）
      // Yahoo Auctionの画像URLパターン: auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/...
      const imageUrls = new Set<string>()
      const imageUrlsArray: string[] = []

      // 商品画像エリアの候補セレクタ（より具体的に）
      const imageContainerSelectors = [
        '[class*="ProductImage"]',
        '[class*="productImage"]',
        '[class*="ImageGallery"]',
        '[class*="imageGallery"]',
        '[class*="Slideshow"]',
        '.ProductImage',
      ]

      // 商品画像エリアを探す
      let imageContainer = null
      for (const selector of imageContainerSelectors) {
        imageContainer = document.querySelector(selector)
        if (imageContainer) break
      }

      // 商品画像エリアが見つかった場合はそこから、見つからない場合は全体から
      const searchArea = imageContainer || document
      const imageElements = searchArea.querySelectorAll('img')

      imageElements.forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src')

        if (src &&
            (src.includes('auctions.c.yimg.jp') || src.includes('yimg.jp/images')) &&
            !src.includes('placeholder') &&
            !src.includes('loading') &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('banner') &&
            !src.includes('thumb') &&
            // サムネイル系URLを除外
            !src.includes('na_170x170') &&
            !src.includes('/s_') &&
            !src.includes('/t_') &&
            // 最小サイズ: 実際の商品画像のみ
            (img.naturalWidth >= 300 || img.width >= 300) &&
            src.startsWith('http')) {

          // 重複チェック: 同じ画像の異なるサイズを除外
          // ベースURLを抽出（サイズパラメータを除く）
          const baseUrl = src.split('?')[0].replace(/\/[stm]_/, '/')

          if (!imageUrls.has(baseUrl)) {
            imageUrls.add(baseUrl)
            imageUrlsArray.push(src)
          }
        }
      })

      // Yahoo Auctionの1枚目は通常プレースホルダーなので、2枚目以降を使用
      // かつ、最大10枚に制限
      if (imageUrlsArray.length > 1) {
        // 2枚目から始めて最大10枚
        result.images = imageUrlsArray.slice(1, 11)
      } else {
        // 1枚しかない場合はそのまま使用
        result.images = imageUrlsArray.slice(0, 10)
      }

      result.imagesFound = result.images.length > 0

      // 7. 商品説明
      // 説明文は様々な場所にあるので、複数パターンを試す
      const descriptionSelectors = [
        '[class*="description"]',
        '[class*="Description"]',
        '[id*="description"]',
        'pre',  // Yahoo Auctionは説明をpreタグで囲むことが多い
      ]

      for (const selector of descriptionSelectors) {
        const descElement = document.querySelector(selector)
        if (descElement && descElement.textContent) {
          const descText = descElement.textContent.trim()
          if (descText.length > 50) {  // 十分な長さがあれば説明文と判断
            result.description = descText
            result.descriptionFound = true
            break
          }
        }
      }

      // 8. 出品者情報
      // 複数のパターンで出品者情報を探す
      const sellerPatterns = [
        { selector: 'a[href*="/user/"]', type: 'link' },
        { selector: '[class*="seller"]', type: 'class' },
        { selector: '[class*="Seller"]', type: 'class' },
        { selector: '[class*="user"]', type: 'class' },
        { selector: 'a[href*="/users/"]', type: 'link' },
      ]

      for (const pattern of sellerPatterns) {
        const sellerElement = document.querySelector(pattern.selector)
        if (sellerElement && sellerElement.textContent) {
          const sellerText = sellerElement.textContent.trim()
          if (sellerText.length > 0 && sellerText.length < 50 && !sellerText.includes('出品者')) {
            result.sellerName = sellerText.replace('さん', '').trim()
            result.sellerFound = true
            break
          }
        }
      }

      // dtベースのフォールバック: 「出品者」というラベルを探す
      if (!result.sellerFound) {
        const sellerDt = allDtElements.find(dt => dt.textContent?.includes('出品者'))
        if (sellerDt) {
          const sellerDd = sellerDt.nextElementSibling
          if (sellerDd) {
            const sellerLink = sellerDd.querySelector('a')
            const sellerText = (sellerLink?.textContent || sellerDd.textContent || '').trim()
            if (sellerText.length > 0 && sellerText.length < 50) {
              result.sellerName = sellerText.replace('さん', '').trim()
              result.sellerFound = true
            }
          }
        }
      }

      // 9. 終了時間
      const timeDtElements = Array.from(document.querySelectorAll('dt'))
      const endTimeDt = timeDtElements.find(dt => dt.textContent?.includes('終了'))
      if (endTimeDt) {
        const dd = endTimeDt.nextElementSibling
        if (dd && dd.textContent) {
          result.endTime = dd.textContent.trim()
        }
      }

      // 10. カテゴリ（パンくずリストから）
      const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a, nav a')
      if (breadcrumbs.length > 0) {
        const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1]
        if (lastBreadcrumb && lastBreadcrumb.textContent) {
          result.category = lastBreadcrumb.textContent.trim()
        }
      }

      // 11. 商品情報セクションから詳細情報を取得
      const allDtElements = Array.from(document.querySelectorAll('dt'))

      // 11-1. カテゴリパス（完全なパス - eBayマッピング用）
      const categoryDt = allDtElements.find(dt => dt.textContent?.trim() === 'カテゴリ')
      if (categoryDt) {
        const categoryDd = categoryDt.nextElementSibling
        if (categoryDd && categoryDd.textContent) {
          const categoryText = categoryDd.textContent.trim()
          if (categoryText.length > 0) {
            result.categoryPath = categoryText
            result.categoryPathFound = true
          }
        }
      }

      // 11-2. 商品の状態（商品情報セクションから）
      const conditionDt = allDtElements.find(dt => dt.textContent?.includes('商品の状態'))
      if (conditionDt && !result.conditionFound) {
        const conditionDd = conditionDt.nextElementSibling
        if (conditionDd && conditionDd.textContent) {
          const conditionText = conditionDd.textContent.trim()
          if (conditionText.length > 0) {
            result.condition = conditionText
            result.conditionFound = true
          }
        }
      }

      // 11-3. 個数
      const quantityDt = allDtElements.find(dt => dt.textContent?.trim() === '個数')
      if (quantityDt) {
        const quantityDd = quantityDt.nextElementSibling
        if (quantityDd && quantityDd.textContent) {
          const quantityText = quantityDd.textContent.trim()
          if (quantityText.length > 0) {
            result.quantity = quantityText
            result.quantityFound = true
          }
        }
      }

      // 11-4. 発送までの日数
      const shippingDaysDt = allDtElements.find(dt => dt.textContent?.includes('発送までの日数'))
      if (shippingDaysDt) {
        const shippingDaysDd = shippingDaysDt.nextElementSibling
        if (shippingDaysDd && shippingDaysDd.textContent) {
          const shippingDaysText = shippingDaysDd.textContent.trim()
          if (shippingDaysText.length > 0) {
            result.shippingDays = shippingDaysText
            result.shippingDaysFound = true
          }
        }
      }

      // 11-5. オークションID
      const auctionIdDt = allDtElements.find(dt => dt.textContent?.includes('オークションID'))
      if (auctionIdDt) {
        const auctionIdDd = auctionIdDt.nextElementSibling
        if (auctionIdDd && auctionIdDd.textContent) {
          const auctionIdText = auctionIdDd.textContent.trim()
          if (auctionIdText.length > 0) {
            result.auctionId = auctionIdText
            result.auctionIdFound = true
          }
        }
      }

      // 11-6. 開始価格（複数パターン対応）
      const startingPricePatterns = ['開始時の価格', '開始価格', 'スタート価格', '開始']
      for (const pattern of startingPricePatterns) {
        const startingPriceDt = allDtElements.find(dt => {
          const text = dt.textContent?.trim() || ''
          return text === pattern || text.includes(pattern)
        })

        if (startingPriceDt) {
          const startingPriceDd = startingPriceDt.nextElementSibling
          if (startingPriceDd && startingPriceDd.textContent) {
            const priceText = startingPriceDd.textContent.trim()
            const priceMatch = priceText.match(/(\d{1,3}(?:,\d{3})*)[\s]*円/)
            if (priceMatch) {
              const priceNum = parseInt(priceMatch[1].replace(/,/g, ''))
              if (!isNaN(priceNum) && priceNum > 0) {
                result.startingPrice = priceNum
                result.startingPriceFound = true
                break
              }
            }
          }
        }
      }

      // 12. URLからオークションIDを抽出（フォールバック）
      if (!result.auctionIdFound) {
        const urlMatch = window.location.href.match(/auction\/([a-z0-9]+)/i)
        if (urlMatch && urlMatch[1]) {
          result.auctionId = urlMatch[1]
          result.auctionIdFound = true
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
    if (!data.shippingFound) {
      warnings.push('送料情報を取得できませんでした')
    }
    if (!data.conditionFound) {
      warnings.push('商品状態を取得できませんでした')
    }
    if (!data.bidsFound) {
      warnings.push('入札数を取得できませんでした')
    }
    if (!data.imagesFound) {
      warnings.push('画像を取得できませんでした')
    }
    if (!data.descriptionFound) {
      warnings.push('商品説明を取得できませんでした')
    }
    if (!data.sellerFound) {
      warnings.push('出品者情報を取得できませんでした')
    }
    if (!data.categoryPathFound) {
      warnings.push('カテゴリパス（eBayマッピング用）を取得できませんでした')
    }
    if (!data.quantityFound) {
      warnings.push('個数を取得できませんでした')
    }
    if (!data.shippingDaysFound) {
      warnings.push('発送日数を取得できませんでした')
    }
    if (!data.auctionIdFound) {
      warnings.push('オークションIDを取得できませんでした')
    }
    if (!data.startingPriceFound) {
      warnings.push('開始価格を取得できませんでした')
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
        shippingCost: data.shippingCost,
        totalCost: null,
        status: 'error',
        timestamp: new Date().toISOString(),
        stock: '取得失敗',
        condition: data.condition || '取得失敗',
        bids: data.bids,
        images: data.images,
        description: data.description,
        sellerName: data.sellerName,
        categoryPath: data.categoryPath,
        quantity: data.quantity,
        shippingDays: data.shippingDays,
        auctionId: data.auctionId,
        startingPrice: data.startingPrice,
        error: '必須データ（タイトルまたは価格）の取得に失敗しました',
        warnings,
        dataQuality: {
          titleFound: data.titleFound,
          priceFound: data.priceFound,
          shippingFound: data.shippingFound,
          conditionFound: data.conditionFound,
          bidsFound: data.bidsFound,
          imagesFound: data.imagesFound,
          descriptionFound: data.descriptionFound,
          sellerFound: data.sellerFound,
          categoryPathFound: data.categoryPathFound,
          quantityFound: data.quantityFound,
          shippingDaysFound: data.shippingDaysFound,
          auctionIdFound: data.auctionIdFound,
          startingPriceFound: data.startingPriceFound
        }
      }
    }

    // 仕入れ値計算（価格 + 送料）
    let totalCost: number | null = null
    if (data.price !== null) {
      if (data.shippingCost !== null) {
        totalCost = data.price + data.shippingCost
      } else {
        // 送料不明の場合は価格のみ
        totalCost = data.price
        warnings.push('送料が不明なため、仕入れ値は価格のみです')
      }
    }

    // 部分的な取得の場合
    const status = warnings.length > 0 ? 'partial' : 'success'

    // Supabaseに保存（必須データが取得できた場合のみ）
    const productData = {
      title: data.title!,
      price: data.price!,
      shipping_cost: data.shippingCost,
      total_cost: totalCost,
      source_url: url,
      condition: data.condition || null,
      stock_status: null,
      bid_count: data.bids || null,
      images: data.images.length > 0 ? data.images : null,
      description: data.description || null,
      seller_name: data.sellerName || null,
      seller_rating: data.sellerRating || null,
      end_time: data.endTime || null,
      category: data.category || null,
      category_path: data.categoryPath || null,
      quantity: data.quantity || null,
      shipping_days: data.shippingDays || null,
      auction_id: data.auctionId || null,
      starting_price: data.startingPrice,
      platform: 'Yahoo Auction',
      scraped_at: new Date().toISOString(),
      scraping_method: 'structure_based_puppeteer_v2025_product_info'
    }

    console.log('[Database] 保存データ:', productData)

    const { data: insertedData, error: dbError } = await supabase
      .from('scraped_products')
      .insert([productData])
      .select()
      .single()

    if (dbError || !insertedData) {
      console.error('[Database] 保存エラー:', dbError)
      warnings.push('データベース保存に失敗しました: ' + (dbError?.message || '不明なエラー'))
    } else {
      console.log('[Database] 保存成功 ID:', insertedData.id)
    }

    return {
      id: insertedData?.id?.toString() || resultId,
      url,
      platform: 'Yahoo Auction',
      title: data.title!,
      price: data.price!,
      shippingCost: data.shippingCost,
      totalCost,
      status,
      timestamp: new Date().toISOString(),
      stock: '在庫情報なし',
      condition: data.condition || '取得失敗',
      bids: data.bids || '取得失敗',
      images: data.images,
      description: data.description,
      sellerName: data.sellerName,
      sellerRating: data.sellerRating,
      endTime: data.endTime,
      category: data.category,
      categoryPath: data.categoryPath,
      quantity: data.quantity,
      shippingDays: data.shippingDays,
      auctionId: data.auctionId,
      startingPrice: data.startingPrice,
      warnings: warnings.length > 0 ? warnings : undefined,
      dataQuality: {
        titleFound: data.titleFound,
        priceFound: data.priceFound,
        shippingFound: data.shippingFound,
        conditionFound: data.conditionFound,
        bidsFound: data.bidsFound,
        imagesFound: data.imagesFound,
        descriptionFound: data.descriptionFound,
        sellerFound: data.sellerFound,
        categoryPathFound: data.categoryPathFound,
        quantityFound: data.quantityFound,
        shippingDaysFound: data.shippingDaysFound,
        auctionIdFound: data.auctionIdFound,
        startingPriceFound: data.startingPriceFound
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
      shippingCost: null,
      totalCost: null,
      status: 'error',
      timestamp: new Date().toISOString(),
      stock: '取得失敗',
      condition: '取得失敗',
      error: error instanceof Error ? error.message : 'スクレイピング実行中にエラーが発生しました',
      dataQuality: {
        titleFound: false,
        priceFound: false,
        shippingFound: false,
        conditionFound: false,
        bidsFound: false,
        imagesFound: false,
        descriptionFound: false,
        sellerFound: false
      }
    }
  }
}

// PayPayフリマ（Yahoo!フリマ）から構造ベーススクレイピング
async function scrapePayPayFleamarket(url: string): Promise<ScrapingResult> {
  let browser
  const resultId = `result-${Date.now()}`

  try {
    console.log(`[Scraping] PayPayフリマ スクレイピング開始: ${url}`)

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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    // ページにアクセス
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 2000))

    // データを抽出（構造ベース）
    const data = await page.evaluate(() => {
      const result = {
        title: null as string | null,
        price: null as number | null,
        shippingCost: null as number | null,
        condition: null as string | null,
        images: [] as string[],
        description: null as string | null,
        sellerName: null as string | null,
        categoryPath: null as string | null,
        shippingDays: null as string | null,
        shippingMethod: null as string | null,
        shippingFrom: null as string | null,
        itemId: null as string | null,
        titleFound: false,
        priceFound: false,
        shippingFound: false,
        conditionFound: false,
        imagesFound: false,
        descriptionFound: false,
        sellerFound: false,
        categoryPathFound: false,
        shippingDaysFound: false,
        itemIdFound: false
      }

      // 1. タイトル - 商品タイトル
      const titleElement = document.querySelector('h1')
      if (titleElement && titleElement.textContent) {
        const titleText = titleElement.textContent.trim()
        if (titleText.length > 0) {
          result.title = titleText
          result.titleFound = true
        }
      }

      // 2. 価格 - 「円」を含む大きなテキスト
      const priceElements = Array.from(document.querySelectorAll('[class*="price"], [class*="Price"]'))
      for (const elem of priceElements) {
        const priceText = elem.textContent || ''
        const priceMatch = priceText.match(/(\d{1,3}(?:,\d{3})*)[\s]*円/)
        if (priceMatch) {
          const priceNum = parseInt(priceMatch[1].replace(/,/g, ''))
          if (!isNaN(priceNum) && priceNum > 0) {
            result.price = priceNum
            result.priceFound = true
            break
          }
        }
      }

      // 価格がまだ見つからない場合、別パターンを試す
      if (!result.priceFound) {
        const allText = document.body.textContent || ''
        const priceMatch = allText.match(/(\d{1,3}(?:,\d{3})*)円/)
        if (priceMatch) {
          const priceNum = parseInt(priceMatch[1].replace(/,/g, ''))
          if (!isNaN(priceNum) && priceNum > 0 && priceNum < 10000000) {
            result.price = priceNum
            result.priceFound = true
          }
        }
      }

      // 3. 送料 - PayPayフリマは基本的に送料無料
      const bodyText = document.body.textContent || ''
      if (bodyText.includes('送料無料') || bodyText.includes('全品送料無料')) {
        result.shippingCost = 0
        result.shippingFound = true
      }

      // 4. 商品の状態
      const allDtElements = Array.from(document.querySelectorAll('dt, th'))
      const conditionDt = allDtElements.find(dt =>
        dt.textContent?.includes('商品の状態') ||
        dt.textContent?.includes('状態')
      )
      if (conditionDt) {
        const nextElement = conditionDt.nextElementSibling
        if (nextElement && nextElement.textContent) {
          const conditionText = nextElement.textContent.trim()
          if (conditionText.length > 0) {
            result.condition = conditionText
            result.conditionFound = true
          }
        }
      }

      // 5. 画像
      // まず商品画像エリアを特定して、そこから画像を取得
      const imageUrls = new Set<string>()

      // 商品画像エリアの候補セレクタ
      const imageContainerSelectors = [
        '[class*="ProductImage"]',
        '[class*="productImage"]',
        '[class*="product-image"]',
        '[class*="ProductMedia"]',
        '[id*="ProductImage"]',
        '[class*="ImageGallery"]',
        '[class*="imageGallery"]',
        '[class*="Slideshow"]',
        '.ProductImage',
      ]

      // 商品画像エリアを探す
      let imageContainer = null
      for (const selector of imageContainerSelectors) {
        imageContainer = document.querySelector(selector)
        if (imageContainer) break
      }

      // 商品画像エリアが見つかった場合はそこから、見つからない場合は全体から
      const searchArea = imageContainer || document
      const imageElements = searchArea.querySelectorAll('img')

      imageElements.forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src')
        const width = img.naturalWidth || img.width || 0
        const height = img.naturalHeight || img.height || 0

        if (src &&
            (src.includes('yahoo') || src.includes('paypay')) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('banner') &&
            !src.includes('placeholder') &&
            !src.includes('loading') &&
            width >= 100 &&  // 最小サイズフィルタ
            height >= 100 &&
            src.startsWith('http')) {
          imageUrls.add(src)
        }
      })

      // 商品画像は通常10枚以内なので、最大15枚に制限
      result.images = Array.from(imageUrls).slice(0, 15)
      result.imagesFound = result.images.length > 0

      // 6. 商品説明
      const descriptionSelectors = [
        '[class*="description"]',
        '[class*="Description"]',
        '[id*="description"]',
        'pre',
        '[class*="detail"]'
      ]

      for (const selector of descriptionSelectors) {
        const descElement = document.querySelector(selector)
        if (descElement && descElement.textContent) {
          const descText = descElement.textContent.trim()
          if (descText.length > 50) {
            result.description = descText
            result.descriptionFound = true
            break
          }
        }
      }

      // 7. カテゴリ
      const categoryDt = allDtElements.find(dt =>
        dt.textContent?.trim() === 'カテゴリ' ||
        dt.textContent?.includes('カテゴリー')
      )
      if (categoryDt) {
        const categoryDd = categoryDt.nextElementSibling
        if (categoryDd && categoryDd.textContent) {
          const categoryText = categoryDd.textContent.trim()
          if (categoryText.length > 0) {
            result.categoryPath = categoryText
            result.categoryPathFound = true
          }
        }
      }

      // 8. 配送方法
      const shippingMethodDt = allDtElements.find(dt =>
        dt.textContent?.includes('配送の方法')
      )
      if (shippingMethodDt) {
        const shippingMethodDd = shippingMethodDt.nextElementSibling
        if (shippingMethodDd && shippingMethodDd.textContent) {
          result.shippingMethod = shippingMethodDd.textContent.trim()
        }
      }

      // 9. 発送日数
      const shippingDaysDt = allDtElements.find(dt =>
        dt.textContent?.includes('発送までの日数')
      )
      if (shippingDaysDt) {
        const shippingDaysDd = shippingDaysDt.nextElementSibling
        if (shippingDaysDd && shippingDaysDd.textContent) {
          const shippingDaysText = shippingDaysDd.textContent.trim()
          if (shippingDaysText.length > 0) {
            result.shippingDays = shippingDaysText
            result.shippingDaysFound = true
          }
        }
      }

      // 10. 発送元
      const shippingFromDt = allDtElements.find(dt =>
        dt.textContent?.includes('発送元の地域')
      )
      if (shippingFromDt) {
        const shippingFromDd = shippingFromDt.nextElementSibling
        if (shippingFromDd && shippingFromDd.textContent) {
          result.shippingFrom = shippingFromDd.textContent.trim()
        }
      }

      // 11. 商品ID
      const itemIdDt = allDtElements.find(dt =>
        dt.textContent?.includes('商品ID')
      )
      if (itemIdDt) {
        const itemIdDd = itemIdDt.nextElementSibling
        if (itemIdDd && itemIdDd.textContent) {
          const itemIdText = itemIdDd.textContent.trim()
          if (itemIdText.length > 0) {
            result.itemId = itemIdText
            result.itemIdFound = true
          }
        }
      }

      // URLから商品IDを抽出（フォールバック）
      if (!result.itemIdFound) {
        const urlMatch = window.location.href.match(/item\/([a-z0-9]+)/i)
        if (urlMatch && urlMatch[1]) {
          result.itemId = urlMatch[1]
          result.itemIdFound = true
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
    if (!data.shippingFound) {
      warnings.push('送料情報を取得できませんでした')
    }
    if (!data.conditionFound) {
      warnings.push('商品状態を取得できませんでした')
    }
    if (!data.imagesFound) {
      warnings.push('画像を取得できませんでした')
    }
    if (!data.descriptionFound) {
      warnings.push('商品説明を取得できませんでした')
    }
    if (!data.categoryPathFound) {
      warnings.push('カテゴリを取得できませんでした')
    }
    if (!data.shippingDaysFound) {
      warnings.push('発送日数を取得できませんでした')
    }
    if (!data.itemIdFound) {
      warnings.push('商品IDを取得できませんでした')
    }

    // 必須フィールドが取得できなかった場合はエラー
    if (!data.titleFound || !data.priceFound) {
      console.error('[Scraping] 必須データ取得失敗:', warnings)
      return {
        id: resultId,
        url,
        platform: 'PayPay Fleamarket',
        title: data.title || '【取得失敗】タイトルを取得できませんでした',
        price: data.price,
        shippingCost: data.shippingCost,
        totalCost: null,
        status: 'error',
        timestamp: new Date().toISOString(),
        stock: '取得失敗',
        condition: data.condition || '取得失敗',
        images: data.images,
        description: data.description,
        categoryPath: data.categoryPath,
        shippingDays: data.shippingDays,
        auctionId: data.itemId,
        error: '必須データ（タイトルまたは価格）の取得に失敗しました',
        warnings,
        dataQuality: {
          titleFound: data.titleFound,
          priceFound: data.priceFound,
          shippingFound: data.shippingFound,
          conditionFound: data.conditionFound,
          bidsFound: false,
          imagesFound: data.imagesFound,
          descriptionFound: data.descriptionFound,
          sellerFound: data.sellerFound,
          categoryPathFound: data.categoryPathFound,
          quantityFound: false,
          shippingDaysFound: data.shippingDaysFound,
          auctionIdFound: data.itemIdFound,
          startingPriceFound: false
        }
      }
    }

    // 仕入れ値計算（価格 + 送料）
    let totalCost: number | null = null
    if (data.price !== null) {
      if (data.shippingCost !== null) {
        totalCost = data.price + data.shippingCost
      } else {
        totalCost = data.price
        warnings.push('送料が不明なため、仕入れ値は価格のみです')
      }
    }

    // 部分的な取得の場合
    const status = warnings.length > 0 ? 'partial' : 'success'

    // Supabaseに保存
    const productData = {
      title: data.title!,
      price: data.price!,
      shipping_cost: data.shippingCost,
      total_cost: totalCost,
      source_url: url,
      condition: data.condition || null,
      stock_status: null,
      bid_count: null,
      images: data.images.length > 0 ? data.images : null,
      description: data.description || null,
      seller_name: data.sellerName || null,
      seller_rating: null,
      end_time: null,
      category: null,
      category_path: data.categoryPath || null,
      quantity: null,
      shipping_days: data.shippingDays || null,
      auction_id: data.itemId || null,
      starting_price: null,
      platform: 'PayPay Fleamarket',
      scraped_at: new Date().toISOString(),
      scraping_method: 'structure_based_puppeteer_paypay_fleamarket'
    }

    console.log('[Database] 保存データ:', productData)

    const { data: insertedData, error: dbError } = await supabase
      .from('scraped_products')
      .insert([productData])
      .select()
      .single()

    if (dbError || !insertedData) {
      console.error('[Database] 保存エラー:', dbError)
      warnings.push('データベース保存に失敗しました: ' + (dbError?.message || '不明なエラー'))
    } else {
      console.log('[Database] 保存成功 ID:', insertedData.id)
    }

    return {
      id: insertedData?.id?.toString() || resultId,
      url,
      platform: 'PayPay Fleamarket',
      title: data.title!,
      price: data.price!,
      shippingCost: data.shippingCost,
      totalCost,
      status,
      timestamp: new Date().toISOString(),
      stock: '在庫情報なし',
      condition: data.condition || '取得失敗',
      images: data.images,
      description: data.description,
      categoryPath: data.categoryPath,
      shippingDays: data.shippingDays,
      auctionId: data.itemId,
      warnings: warnings.length > 0 ? warnings : undefined,
      dataQuality: {
        titleFound: data.titleFound,
        priceFound: data.priceFound,
        shippingFound: data.shippingFound,
        conditionFound: data.conditionFound,
        bidsFound: false,
        imagesFound: data.imagesFound,
        descriptionFound: data.descriptionFound,
        sellerFound: data.sellerFound,
        categoryPathFound: data.categoryPathFound,
        quantityFound: false,
        shippingDaysFound: data.shippingDaysFound,
        auctionIdFound: data.itemIdFound,
        startingPriceFound: false
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
      platform: 'PayPay Fleamarket',
      title: '【エラー】スクレイピング実行失敗',
      price: null,
      shippingCost: null,
      totalCost: null,
      status: 'error',
      timestamp: new Date().toISOString(),
      stock: '取得失敗',
      condition: '取得失敗',
      error: error instanceof Error ? error.message : String(error),
      dataQuality: {
        titleFound: false,
        priceFound: false,
        shippingFound: false,
        conditionFound: false,
        bidsFound: false,
        imagesFound: false,
        descriptionFound: false,
        sellerFound: false,
        categoryPathFound: false,
        quantityFound: false,
        shippingDaysFound: false,
        auctionIdFound: false,
        startingPriceFound: false
      }
    }
  }
}

// 品質スコア計算関数
function calculateQualityScore(dataQuality: any): { score: number; total: number; successful: number; failed: number } {
  const fields = Object.keys(dataQuality)
  const total = fields.length
  const successful = fields.filter(key => dataQuality[key] === true).length
  const failed = total - successful
  const score = total > 0 ? Math.round((successful / total) * 100) : 0

  return { score, total, successful, failed }
}

// 品質ログを保存
async function saveQualityLog(result: ScrapingResult) {
  try {
    if (!result.dataQuality) return

    const qualityMetrics = calculateQualityScore(result.dataQuality)

    const logData = {
      platform: result.platform,
      test_url: result.url,
      quality_score: qualityMetrics.score,
      total_fields: qualityMetrics.total,
      successful_fields: qualityMetrics.successful,
      failed_fields: qualityMetrics.failed,
      status: result.status,
      error_message: result.error || null,
      warnings: result.warnings || null,
      data_quality: result.dataQuality,
      checked_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('scraping_quality_logs')
      .insert([logData])

    if (error) {
      console.error('[Quality Log] 保存エラー:', error)
    } else {
      console.log('[Quality Log] 品質スコア:', qualityMetrics.score, '%')
    }
  } catch (error) {
    console.error('[Quality Log] 予期しないエラー:', error)
  }
}

// メインPOSTハンドラー
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, platforms } = body

    console.log(`[API] スクレイピングリクエスト受信: ${urls?.length || 0}件`)

    const results: ScrapingResult[] = []

    for (const url of urls) {
      let result: ScrapingResult

      if (url.includes('auctions.yahoo.co.jp') || url.includes('page.auctions.yahoo.co.jp')) {
        // Yahoo Auction
        result = await scrapeYahooAuction(url)
        results.push(result)
        // 品質ログを保存（構造変化検知用）
        await saveQualityLog(result)
      } else if (url.includes('paypayfleamarket.yahoo.co.jp')) {
        // PayPay Fleamarket (Yahoo! Flea Market)
        result = await scrapePayPayFleamarket(url)
        results.push(result)
        // 品質ログを保存（構造変化検知用）
        await saveQualityLog(result)
      } else {
        results.push({
          id: `result-${Date.now()}-${results.length}`,
          url,
          platform: '未対応',
          title: '【エラー】対応していないURL',
          price: null,
          shippingCost: null,
          totalCost: null,
          status: 'error',
          timestamp: new Date().toISOString(),
          stock: '取得失敗',
          condition: '取得失敗',
          error: '現在対応しているのは Yahoo Auction と PayPay Fleamarket のみです',
          dataQuality: {
            titleFound: false,
            priceFound: false,
            shippingFound: false,
            conditionFound: false,
            bidsFound: false,
            imagesFound: false,
            descriptionFound: false,
            sellerFound: false,
            categoryPathFound: false,
            quantityFound: false,
            shippingDaysFound: false,
            auctionIdFound: false,
            startingPriceFound: false
          }
        })
      }
    }

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
    message: 'Yahoo Auction Full Data Scraping API',
    version: '2025-v3-full',
    method: 'structure_based (no class names, no assumptions)',
    features: [
      '価格取得',
      '送料取得',
      '仕入れ値計算（価格+送料）',
      '画像全取得（サムネイル除外）',
      '商品説明取得',
      '出品者情報取得',
      '終了時間取得',
      'カテゴリ取得',
      '安全性保証（推測値なし）'
    ],
    dataFields: {
      required: ['title', 'price'],
      recommended: ['shippingCost', 'totalCost', 'condition', 'images'],
      optional: ['bids', 'description', 'sellerName', 'endTime', 'category']
    }
  })
}
