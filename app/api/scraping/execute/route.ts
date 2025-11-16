// Yahoo Auction Scraping API - 完全版（画像・ブランド・リードタイム対応）
import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GAS_TRANSLATE_URL = process.env.GOOGLE_APPS_SCRIPT_TRANSLATE_URL

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
  category?: string
  description?: string
  bids?: string
  error?: string
  images?: string[]
  shipping?: number
  brand?: string
  lead_time?: string
  yahoo_id?: number
}

/**
 * Google Apps Script翻訳API呼び出し
 */
async function translateText(text: string): Promise<string> {
  if (!text || !GAS_TRANSLATE_URL) return text

  try {
    const response = await fetch(GAS_TRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'single',
        text,
        sourceLang: 'ja',
        targetLang: 'en'
      })
    })

    const result = await response.json()
    
    if (result.success && result.translated) {
      return result.translated
    }
    
    return text
  } catch (error) {
    console.error('[Translation] エラー:', error)
    return text
  }
}

/**
 * yahoo_scraped_products から products_master へ同期
 */
async function syncToMaster(yahooId: number): Promise<boolean> {
  try {
    console.log(`[Sync] yahoo_scraped_products ID ${yahooId} を同期開始...`)

    const { data: yahooData, error: yahooError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .eq('id', yahooId)
      .single()

    if (yahooError || !yahooData) {
      console.error('[Sync] データ取得エラー:', yahooError)
      return false
    }

    const scrapedData = yahooData.scraped_data || {}
    const imageUrls = scrapedData.images || []
    const condition = scrapedData.condition || 'Unknown'
    const category = scrapedData.category || 'Uncategorized'
    const categoryHierarchy = scrapedData.category_hierarchy || []
    const brand = scrapedData.brand || ''
    const leadTime = scrapedData.lead_time || ''
    const shippingCost = scrapedData.shipping_cost || 0

    const basePrice = yahooData.price_jpy || 0
    const totalPriceJPY = basePrice + shippingCost

    console.log(`[Sync] 価格計算: ¥${basePrice} + 送料¥${shippingCost} = ¥${totalPriceJPY}`)

    // 翻訳実行
    let englishTitle = ''
    let englishDescription = ''
    let englishCondition = ''

    if (yahooData.title) {
      console.log('[Sync] タイトル翻訳中...')
      englishTitle = await translateText(yahooData.title)
      console.log(`[Sync] 翻訳完了: ${englishTitle.substring(0, 50)}...`)
    }

    const description = yahooData.description || ''
    if (description && description.length > 10) {
      console.log('[Sync] 説明翻訳中...')
      englishDescription = await translateText(description)
    }

    if (condition) {
      console.log('[Sync] 状態翻訳中...')
      englishCondition = await translateText(condition)
    }

    // 既存チェック
    const { data: existing } = await supabase
      .from('products_master')
      .select('id')
      .eq('source_system', 'yahoo_scraped_products')
      .eq('source_id', String(yahooId))
      .single()

    const productData = {
      title: yahooData.title,
      english_title: englishTitle,
      description: description,
      english_description: englishDescription,
      condition_name: condition,
      english_condition: englishCondition,
      category: category,
      primary_image_url: imageUrls[0] || null,
      gallery_images: imageUrls,
      scraped_data: {
        ...scrapedData,
        brand: brand,
        lead_time: leadTime,
        category_hierarchy: categoryHierarchy
      },
      current_price: totalPriceJPY,
      price_jpy: totalPriceJPY,
      updated_at: new Date().toISOString()
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('products_master')
        .update(productData)
        .eq('id', existing.id)

      if (updateError) {
        console.error('[Sync] 更新エラー:', updateError)
        return false
      }

      console.log(`[Sync] ✅ 更新完了: products_master ID ${existing.id}`)
    } else {
      const { error: insertError } = await supabase
        .from('products_master')
        .insert({
          source_system: 'yahoo_scraped_products',
          source_id: String(yahooId),
          sku: yahooData.sku,
          ...productData,
          profit_amount: yahooData.profit_amount_usd || 0,
          profit_margin: yahooData.profit_margin || 0,
          workflow_status: yahooData.status || 'scraped',
          approval_status: 'pending',
          listing_status: 'not_listed',
          listing_price: yahooData.price_usd || 0,
          inventory_quantity: yahooData.current_stock || 1,
          created_at: yahooData.created_at
        })

      if (insertError) {
        console.error('[Sync] 挿入エラー:', insertError)
        return false
      }

      console.log(`[Sync] ✅ 新規追加完了`)
    }

    return true
  } catch (error) {
    console.error('[Sync] 予期しないエラー:', error)
    return false
  }
}

async function scrapeYahooAuction(url: string): Promise<ScrapingResult> {
  let browser
  const resultId = `result-${Date.now()}`

  try {
    console.log(`[Scraping] 開始: ${url}`)

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(resolve => setTimeout(resolve, 3000))

    const data = await page.evaluate(() => {
      const result: any = {}

      console.log('========================================')
      console.log('Yahoo!オークション スクレイピング開始')
      console.log('========================================')

      // ========================================
      // 1. タイトル取得
      // ========================================
      const h1 = document.querySelector('h1')
      result.title = h1?.textContent?.trim() || 'タイトル取得失敗'
      console.log('📝 タイトル:', result.title)

      // ========================================
      // 2. 価格取得（即決 or 現在価格）
      // ========================================
      let price = 0
      const allDtElements = Array.from(document.querySelectorAll('dt'))
      const sokketsuDt = allDtElements.find(dt => dt.textContent?.trim() === '即決')
      
      if (sokketsuDt) {
        const dd = sokketsuDt.nextElementSibling
        const priceSpan = dd?.querySelector('span')
        if (priceSpan) {
          const priceText = priceSpan.innerHTML
            .replace(/<!--.*?-->/g, '')
            .replace(/<[^>]*>/g, '')
            .trim()
          const numbers = priceText.match(/[\d,]+/)
          if (numbers) {
            price = parseInt(numbers[0].replace(/,/g, ''))
            console.log('💰 即決価格:', price)
          }
        }
      }
      
      if (price === 0) {
        const priceSpans = Array.from(document.querySelectorAll('span'))
        const priceSpan = priceSpans.find(span => {
          const text = span.innerHTML || ''
          return text.includes('円') && text.match(/[\d,]+/)
        })
        
        if (priceSpan) {
          let priceText = priceSpan.innerHTML
            .replace(/<!--.*?-->/g, '')
            .replace(/<[^>]*>/g, '')
            .trim()
          
          const numbers = priceText.match(/[\d,]+/)
          if (numbers) {
            price = parseInt(numbers[0].replace(/,/g, ''))
            console.log('💰 価格(fallback):', price)
          }
        }
      }
      
      result.price = price

      // ========================================
      // 3. 送料取得
      // ========================================
      let shipping = 0
      const itemPostage = document.getElementById('itemPostage')
      if (itemPostage) {
        console.log('📦 itemPostageセクション発見')
        const postageText = itemPostage.textContent || ''
        const match = postageText.match(/全国一律.*?(\d+)円/)
        if (match) {
          shipping = parseInt(match[1])
          console.log('  ✅ 送料(itemPostage):', shipping)
        }
      }
      
      if (shipping === 0) {
        const dlElements = document.querySelectorAll('dl')
        dlElements.forEach(dl => {
          const dtElements = dl.querySelectorAll('dt')
          dtElements.forEach(dt => {
            const dtText = dt.textContent?.trim() || ''
            if (dtText.includes('送料')) {
              const dd = dt.nextElementSibling
              if (!dd || dd.tagName !== 'DD') return
              const ddText = dd.textContent || ''
              const match = ddText.match(/全国一律.*?(\d+)円/)
              if (match) {
                shipping = parseInt(match[1])
                console.log('  ✅ 送料(dt/dd):', shipping)
              }
              if (ddText.includes('送料無料') || ddText.includes('無料') || 
                  ddText.includes('出品者負担') || ddText.includes('送料込')) {
                shipping = 0
                console.log('  ✅ 送料無料/込み')
              }
            }
          })
        })
      }
      
      result.shipping = shipping

      // ========================================
      // 4. 商品状態取得
      // ========================================
      let condition = '不明'
      const itemInfo = document.getElementById('itemInfo')
      if (itemInfo) {
        const dtElements = itemInfo.querySelectorAll('dt')
        dtElements.forEach(dt => {
          const dtText = dt.textContent?.trim() || ''
          if (dtText.includes('商品の状態') || dtText === '状態') {
            const dd = dt.nextElementSibling
            if (dd && dd.tagName === 'DD') {
              const conditionLink = dd.querySelector('a')
              if (conditionLink) {
                condition = conditionLink.textContent?.trim() || '不明'
                console.log('  ✅ 状態(itemInfo):', condition)
              }
            }
          }
        })
      }
      
      if (condition === '不明') {
        const svgElements = document.querySelectorAll('svg[aria-label="状態"]')
        svgElements.forEach(svg => {
          const parentLi = svg.closest('li')
          if (parentLi) {
            const spans = parentLi.querySelectorAll('span')
            spans.forEach(span => {
              if (!span.querySelector('svg') && span.textContent) {
                const text = span.textContent.trim()
                if (text && text !== '状態') {
                  condition = text
                  console.log('  ✅ 状態(SVG):', condition)
                }
              }
            })
          }
        })
      }
      
      result.condition = condition

      // ========================================
      // 5. カテゴリー取得（階層構造）
      // ========================================
      const categories: string[] = []
      if (itemInfo) {
        const dtElements = itemInfo.querySelectorAll('dt')
        dtElements.forEach(dt => {
          const dtText = dt.textContent?.trim() || ''
          if (dtText.includes('カテゴリ') || dtText === 'カテゴリ') {
            const dd = dt.nextElementSibling
            if (dd && dd.tagName === 'DD') {
              const categoryLinks = dd.querySelectorAll('a')
              categoryLinks.forEach(link => {
                const text = link.textContent?.trim()
                if (text) {
                  categories.push(text)
                  console.log('  📌 カテゴリー:', text)
                }
              })
            }
          }
        })
      }
      
      result.category_hierarchy = categories
      result.category = categories.length > 0 ? categories[categories.length - 1] : '未分類'
      console.log('📂 カテゴリー階層:', categories)
      console.log('📂 最終カテゴリー:', result.category)

      // ========================================
      // 6. ブランド取得
      // ========================================
      let brand = ''
      if (itemInfo) {
        const dtElements = itemInfo.querySelectorAll('dt')
        dtElements.forEach(dt => {
          const dtText = dt.textContent?.trim() || ''
          if (dtText.includes('ブランド') || dtText === 'ブランド') {
            const dd = dt.nextElementSibling
            if (dd && dd.tagName === 'DD') {
              const brandLink = dd.querySelector('a')
              if (brandLink) {
                brand = brandLink.textContent?.trim() || ''
                console.log('  ✅ ブランド:', brand)
              }
            }
          }
        })
      }
      result.brand = brand

      // ========================================
      // 7. 発送までの日数取得
      // ========================================
      let leadTime = ''
      if (itemInfo) {
        const dtElements = itemInfo.querySelectorAll('dt')
        dtElements.forEach(dt => {
          const dtText = dt.textContent?.trim() || ''
          if (dtText.includes('発送までの日数')) {
            const dd = dt.nextElementSibling
            if (dd && dd.tagName === 'DD') {
              leadTime = dd.textContent?.trim() || ''
              console.log('  ✅ 発送日数:', leadTime)
            }
          }
        })
      }
      result.lead_time = leadTime

      // ========================================
      // 8. 入札数取得
      // ========================================
      let bids = '0件'
      const allText = document.body.textContent || ''
      const bidMatch = allText.match(/(\d+)<!-- -->件/)
      if (bidMatch) {
        bids = `${bidMatch[1]}件`
      }
      result.bids = bids
      console.log('🔨 入札数:', bids)

      // ========================================
      // 9. 商品説明取得（HTMLタグ・CSS除去）
      // 🔥 Yahoo!オークションは商品説明が無いためスキップ
      // ========================================
      let description = ''
      
      // Yahoo!オークションは商品説明を取得しない
      // （オークション情報やCSSコードしかないため）
      console.log('🚫 Yahoo!オークション: 商品説明はスキップ（以後、HTMLテンプレートで自動生成）')
      description = 'なし'
      
      // 💡 他のプラットフォーム（Amazon、メルカリなど）では以下のコードを有効化
      /*
      // 1. <pre>要素から取得（CSSコードを含むものは除外）
      const preElements = document.querySelectorAll('pre')
      for (const pre of Array.from(preElements)) {
        const text = pre.textContent?.trim() || ''
        // CSSコードやスタイル定義を含む場合はスキップ
        if (text.length > 30 && 
            !text.includes('{') && 
            !text.includes('display:') &&
            !text.includes('background-') &&
            !text.includes('#msthd')) {
          description = text
          console.log('📄 説明文(pre):', text.substring(0, 50) + '...')
          break
        }
      }
      
      // 2. <div>要素から取得（より厳格なフィルタリング）
      if (!description) {
        const divElements = Array.from(document.querySelectorAll('div'))
        for (const div of divElements) {
          const childDivs = div.querySelectorAll('div')
          if (childDivs.length < 3) {
            const text = div.textContent?.trim() || ''
            // CSSコード、不要なUI要素を除外
            if (text.length > 100 && text.length < 5000 &&
                !text.includes('入札する') && 
                !text.includes('ウォッチ') && 
                !text.includes('カテゴリ') &&
                !text.includes('支払い方法') &&
                !text.includes('今すぐ落札') &&
                !text.includes('{') &&
                !text.includes('display:') &&
                !text.includes('background-') &&
                !text.includes('#msthd') &&
                !text.includes('クーポン')) {
              description = text
              console.log('📄 説明文(div):', text.substring(0, 50) + '...')
              break
            }
          }
        }
      }
      */
      
      // 🔥 強化版: HTMLタグ、CSSコード、JavaScriptを完全除去
      if (description) {
        description = description
          // 1. HTMLコメント除去
          .replace(/<!--[\s\S]*?-->/g, '')
          // 2. CSSブロック除去（#と.で始まるスタイル定義）
          .replace(/#[a-zA-Z0-9_-]+\s*\{[\s\S]*?\}/g, '')
          .replace(/\.[a-zA-Z0-9_-]+\s*\{[\s\S]*?\}/g, '')
          // 3. インラインスタイル属性除去
          .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '')
          // 4. HTMLタグ除去
          .replace(/<[^>]*>/g, '')
          // 5. Yahoo特有の不要文言除去（柔軟なマッチング）
          .replace(/ログイン.*?クーポン.*?(\n|$)/gi, '')
          .replace(/お買い物.*?クーポン.*?(\n|$)/gi, '')
          .replace(/.*?OFFクーポン.*?(\n|$)/gi, '')
          // 6. CSS変数やプロパティの残骸除去
          .replace(/\*[a-z-]+\s*:\s*[^;]+;/g, '')
          .replace(/[a-z-]+\s*:\s*[^;]+;/g, '')
          // 7. 連続改行を整理
          .replace(/\n{3,}/g, '\n\n')
          // 8. 先頭・末尾の空白削除
          .trim()
        
        // 9. クリーニング後に10文字未満または意味のない文字列なら「なし」
        if (description.length < 10 || description.match(/^[\s\*\{\}\[\]\(\)\-\_]+$/)) {
          description = 'なし'
        }
      }
      
      result.description = description || 'なし'

      // ========================================
      // 10. 画像URL取得（id="imageGallery"から）
      // ========================================
      const images: string[] = []
      const seenUrls = new Set<string>()
      
      console.log('🖼️ 画像取得開始')
      
      // 方法1: id="imageGallery" から取得（最優先）
      const imageGallery = document.getElementById('imageGallery')
      if (imageGallery) {
        console.log('  ✅ imageGalleryセクション発見')
        
        // alt属性に "_画像" を含む画像のみ取得
        const galleryImages = imageGallery.querySelectorAll('img[alt*="_画像"]')
        console.log(`  見つかった画像: ${galleryImages.length}枚`)
        
        galleryImages.forEach((img, index) => {
          const src = img.getAttribute('src') || ''
          const alt = img.getAttribute('alt') || ''
          
          // サムネイル除外: ?pri= または auc-pctr を含むURLは除外
          if (src && !src.includes('?pri=') && !src.includes('auc-pctr')) {
            if (!seenUrls.has(src)) {
              images.push(src)
              seenUrls.add(src)
              console.log(`    画像${images.length}: ${alt} -> ${src.substring(src.length - 50)}`)
            }
          }
        })
      }
      
      // 方法2: フォールバック（imageGalleryが見つからない場合）
      if (images.length === 0) {
        console.log('  ⚠️ imageGalleryから取得失敗、フォールバック実行')
        const allImages = document.querySelectorAll('img')
        
        allImages.forEach((img) => {
          const src = img.getAttribute('src') || ''
          const alt = img.getAttribute('alt') || ''
          
          if ((src.includes('auctions.c.yimg.jp') || src.includes('auctions.yahoo.co.jp')) &&
              alt.includes('_画像')) {
            let cleanUrl = src
            
            if (src.includes('/i/auctions.c.yimg.jp/')) {
              const match = src.match(/\/i\/(auctions\.c\.yimg\.jp\/images\.auctions\.yahoo\.co\.jp\/image\/[^?]+)/)
              if (match) {
                cleanUrl = `https://${match[1]}`
              }
            } else {
              cleanUrl = src.split('?')[0]
            }
            
            if (!seenUrls.has(cleanUrl) && 
                !cleanUrl.includes('_t.jpg') && 
                !cleanUrl.includes('_s.jpg') &&
                cleanUrl.includes('image/dr000')) {
              images.push(cleanUrl)
              seenUrls.add(cleanUrl)
              console.log(`    画像${images.length}(fallback): ${cleanUrl.substring(cleanUrl.length - 50)}`)
            }
          }
        })
      }
      
      // 2枚目をメイン画像にする（ギャラリーの表示順）
      if (images.length >= 2) {
        const reordered = [images[1], images[0], ...images.slice(2)]
        result.images = reordered
        console.log('  🔄 画像順序変更: 2枚目をメインに')
      } else {
        result.images = images
      }
      
      result.stock = '在庫あり'
      
      console.log('========================================')
      console.log('✅ スクレイピング完了')
      console.log('📊 最終結果:', {
        title: result.title?.substring(0, 30) + '...',
        price: result.price,
        shipping: result.shipping,
        condition: result.condition,
        category: result.category,
        brand: result.brand,
        lead_time: result.lead_time,
        images: result.images?.length,
        description: result.description !== 'なし' ? result.description.substring(0, 30) + '...' : 'なし'
      })
      console.log('========================================')

      return result
    })

    await browser.close()

    console.log(`✅ Puppeteerスクレイピング成功`)
    console.log(`  タイトル: ${data.title}`)
    console.log(`  価格: ¥${data.price.toLocaleString()}`)
    console.log(`  送料: ¥${data.shipping}`)
    console.log(`  状態: ${data.condition}`)
    console.log(`  カテゴリー: ${data.category}`)
    console.log(`  ブランド: ${data.brand || 'なし'}`)
    console.log(`  発送日数: ${data.lead_time || 'なし'}`)
    console.log(`  説明: ${data.description ? data.description.substring(0, 100) + '...' : 'なし'}`)
    console.log(`  画像: ${data.images?.length}枚`)

    const timestamp = Date.now()
    const sku = `YAH-${timestamp.toString().slice(-6)}`

    const productData = {
      sku: sku,
      title: data.title,
      price_jpy: data.price,
      currency: 'JPY',
      source_url: url,
      bid_count: data.bids,
      stock_status: data.stock,
      status: 'scraped',
      description: data.description || null,
      scraped_data: {
        images: data.images || [],
        condition: data.condition,
        category: data.category,
        category_hierarchy: data.category_hierarchy || [],
        brand: data.brand || '',
        lead_time: data.lead_time || '',
        shipping_cost: data.shipping || 0
      },
      profit_margin: 15,
      master_key: `ST-YAH-GEN-U-${String(timestamp).slice(-5)}-${new Date().toISOString().slice(2, 7).replace('-', '')}-EBY-JP-000-L20`
    }

    const { data: insertedData, error: dbError } = await supabase
      .from('yahoo_scraped_products')
      .insert([productData])
      .select()

    if (dbError) {
      console.error('[DB] エラー:', dbError)
      throw new Error(`Database error: ${dbError.message}`)
    }

    const yahooId = insertedData[0].id
    console.log(`[DB] ✅ yahoo_scraped_products に保存: ID ${yahooId}`)

    // 🔥 自動同期実行
    console.log('[Auto-Sync] products_master への自動同期を開始...')
    const syncSuccess = await syncToMaster(yahooId)
    
    if (syncSuccess) {
      console.log('[Auto-Sync] ✅ 自動同期完了')
    } else {
      console.log('[Auto-Sync] ⚠️ 自動同期失敗（手動同期が必要）')
    }

    return {
      id: resultId,
      url,
      platform: 'Yahoo Auction',
      title: data.title,
      price: data.price,
      status: 'success',
      timestamp: new Date().toISOString(),
      stock: data.stock,
      condition: data.condition,
      category: data.category,
      description: data.description,
      bids: data.bids,
      images: data.images,
      shipping: data.shipping,
      brand: data.brand,
      lead_time: data.lead_time,
      yahoo_id: yahooId
    }

  } catch (error) {
    console.error(`❌ エラー:`, error)
    if (browser) await browser.close().catch(() => {})

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
      error: error instanceof Error ? error.message : 'スクレイピング失敗'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls } = body

    console.log(`[API] リクエスト: ${urls?.length || 0}件`)

    const results: ScrapingResult[] = []

    for (const url of urls) {
      if (url.includes('auctions.yahoo.co.jp')) {
        const result = await scrapeYahooAuction(url)
        results.push(result)
      } else {
        results.push({
          id: `error-${Date.now()}`,
          url,
          platform: '未対応',
          title: 'Yahoo Auction以外は未対応',
          price: 0,
          status: 'error',
          timestamp: new Date().toISOString(),
          stock: '不明',
          condition: '不明',
          error: 'Yahoo Auction以外は現在対応していません'
        })
      }
    }

    const stats = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      synced: results.filter(r => r.status === 'success' && r.yahoo_id).length
    }

    console.log('[API] ✅ 完了:', stats)

    return NextResponse.json({
      success: true,
      results,
      stats,
      message: `${stats.success}件スクレイピング成功、${stats.synced}件自動同期完了`
    })

  } catch (error) {
    console.error('[API] ❌ エラー:', error)
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Yahoo Auction Scraping API - Complete Version with Brand & Lead Time',
    version: '2025-v15-complete'
  })
}
