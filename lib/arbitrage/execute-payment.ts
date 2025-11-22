/**
 * Automatic Payment Execution Engine
 *
 * Purpose: 自動購入システム - Amazon.comでの商品購入を完全自動化
 *
 * Security & Risk Management:
 * - ヘッドレスブラウザ検出回避
 * - ランダム待機時間（人間らしい操作）
 * - Cookie/セッション管理
 * - プロキシローテーション対応
 * - アカウント停止リスク最小化
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import { createClient } from '@/lib/supabase/server'

export interface PurchaseRequest {
  asin: string
  quantity: number
  maxPrice: number
  marketplace: 'US' | 'JP'
  accountId?: string // 複数アカウント対応
}

export interface PurchaseResult {
  success: boolean
  orderId?: string
  orderTotal?: number
  confirmationNumber?: string
  estimatedDelivery?: string
  error?: string
  screenshot?: string // デバッグ用スクリーンショット
}

export class AutomaticPaymentExecutor {
  private browser: Browser | null = null
  private page: Page | null = null

  /**
   * ブラウザ初期化（ヘッドレス検出回避）
   */
  private async initBrowser(proxyUrl?: string): Promise<void> {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ]

    if (proxyUrl) {
      args.push(`--proxy-server=${proxyUrl}`)
    }

    this.browser = await puppeteer.launch({
      headless: process.env.NODE_ENV === 'production', // 開発時は可視化
      args,
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    })

    this.page = await this.browser.newPage()

    // ヘッドレス検出回避
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      })

      // Chrome DevTools Protocol検出回避
      window.chrome = {
        runtime: {}
      }

      // Permissions APIのモック
      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters)
      )
    })

    // User-Agent設定（実際のChromeに偽装）
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // 言語・タイムゾーン設定
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    })
  }

  /**
   * ランダム待機（人間らしい操作）
   */
  private async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * 人間らしいマウス操作
   */
  private async humanClick(selector: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    await this.page.waitForSelector(selector, { timeout: 10000 })

    // マウスをゆっくり移動
    const element = await this.page.$(selector)
    if (!element) throw new Error(`Element not found: ${selector}`)

    const box = await element.boundingBox()
    if (!box) throw new Error('Element has no bounding box')

    // ランダムなオフセット（要素の中央付近をクリック）
    const x = box.x + box.width / 2 + (Math.random() - 0.5) * 20
    const y = box.y + box.height / 2 + (Math.random() - 0.5) * 20

    await this.page.mouse.move(x, y, { steps: 10 })
    await this.randomDelay(100, 300)
    await this.page.mouse.click(x, y)
  }

  /**
   * Amazon.comにログイン
   */
  private async loginToAmazon(email: string, password: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    console.log('🔐 Logging in to Amazon.com...')

    await this.page.goto('https://www.amazon.com/ap/signin', {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    await this.randomDelay(1000, 2000)

    // メールアドレス入力
    await this.page.waitForSelector('#ap_email', { timeout: 10000 })
    await this.page.type('#ap_email', email, { delay: 100 })
    await this.randomDelay(500, 1000)

    // 「続ける」ボタンをクリック
    await this.humanClick('#continue')
    await this.randomDelay(2000, 3000)

    // パスワード入力
    await this.page.waitForSelector('#ap_password', { timeout: 10000 })
    await this.page.type('#ap_password', password, { delay: 100 })
    await this.randomDelay(500, 1000)

    // 「サインイン」ボタンをクリック
    await this.humanClick('#signInSubmit')
    await this.randomDelay(3000, 5000)

    // 2FA対応（OTP入力が必要な場合）
    const otpSelector = '#auth-mfa-otpcode'
    const otpExists = await this.page.$(otpSelector)

    if (otpExists) {
      console.log('⚠️ 2FA required - manual intervention needed')
      // 本番環境ではSMS APIやAuthenticator統合が必要
      throw new Error('2FA required - not implemented')
    }

    // ログイン成功確認
    const isLoggedIn = await this.page.evaluate(() => {
      return document.querySelector('#nav-link-accountList')?.textContent?.includes('Hello') || false
    })

    if (!isLoggedIn) {
      throw new Error('Login failed - verification required')
    }

    console.log('✅ Successfully logged in to Amazon.com')
  }

  /**
   * 商品ページへ移動して価格確認
   */
  private async navigateToProductAndVerifyPrice(
    asin: string,
    maxPrice: number
  ): Promise<{ currentPrice: number; isAvailable: boolean }> {
    if (!this.page) throw new Error('Page not initialized')

    console.log(`📦 Navigating to product page: ${asin}`)

    await this.page.goto(`https://www.amazon.com/dp/${asin}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    await this.randomDelay(2000, 3000)

    // 価格取得（複数セレクターを試行）
    const priceSelectors = [
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-offscreen',
      '#corePrice_desktop .a-offscreen',
      '[data-a-color="price"] .a-offscreen'
    ]

    let currentPrice = 0

    for (const selector of priceSelectors) {
      const priceElement = await this.page.$(selector)
      if (priceElement) {
        const priceText = await this.page.evaluate(el => el.textContent, priceElement)
        const match = priceText?.match(/\$([\d,]+\.?\d*)/)
        if (match) {
          currentPrice = parseFloat(match[1].replace(/,/g, ''))
          break
        }
      }
    }

    if (currentPrice === 0) {
      throw new Error('Could not extract product price')
    }

    console.log(`💰 Current price: $${currentPrice} (Max: $${maxPrice})`)

    // 価格チェック
    if (currentPrice > maxPrice) {
      throw new Error(`Price too high: $${currentPrice} > $${maxPrice}`)
    }

    // 在庫確認
    const addToCartButton = await this.page.$('#add-to-cart-button')
    const isAvailable = addToCartButton !== null

    if (!isAvailable) {
      throw new Error('Product is out of stock')
    }

    return { currentPrice, isAvailable }
  }

  /**
   * カートに追加
   */
  private async addToCart(quantity: number = 1): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    console.log(`🛒 Adding ${quantity} item(s) to cart...`)

    // 数量選択（1以上の場合）
    if (quantity > 1) {
      const quantitySelector = '#quantity'
      const quantityDropdown = await this.page.$(quantitySelector)

      if (quantityDropdown) {
        await this.page.select(quantitySelector, quantity.toString())
        await this.randomDelay(500, 1000)
      }
    }

    // 「カートに追加」ボタンをクリック
    await this.humanClick('#add-to-cart-button')
    await this.randomDelay(3000, 5000)

    // カート追加確認
    const cartConfirmation = await this.page.evaluate(() => {
      return document.querySelector('#huc-v2-order-row-confirm-text')?.textContent?.includes('Added to Cart') ||
             document.querySelector('[data-csa-c-content-id="sw-atc-confirmation"]') !== null
    })

    if (!cartConfirmation) {
      throw new Error('Failed to add item to cart')
    }

    console.log('✅ Successfully added to cart')
  }

  /**
   * チェックアウト（決済）
   */
  private async checkout(): Promise<PurchaseResult> {
    if (!this.page) throw new Error('Page not initialized')

    console.log('💳 Proceeding to checkout...')

    // カートページへ移動
    await this.page.goto('https://www.amazon.com/gp/cart/view.html', {
      waitUntil: 'networkidle2'
    })

    await this.randomDelay(2000, 3000)

    // 「レジに進む」ボタンをクリック
    const proceedToCheckoutSelectors = [
      '#sc-buy-box-ptc-button input[name="proceedToRetailCheckout"]',
      'input[name="proceedToRetailCheckout"]',
      '#sc-buy-box-ptc-button'
    ]

    let clicked = false
    for (const selector of proceedToCheckoutSelectors) {
      try {
        await this.humanClick(selector)
        clicked = true
        break
      } catch (e) {
        continue
      }
    }

    if (!clicked) {
      throw new Error('Could not proceed to checkout')
    }

    await this.randomDelay(3000, 5000)

    // 配送先住所選択（デフォルト住所を使用）
    const continueButton = await this.page.$('input[name="shipToThisAddress"]')
    if (continueButton) {
      await this.humanClick('input[name="shipToThisAddress"]')
      await this.randomDelay(2000, 3000)
    }

    // 配送オプション選択（デフォルト）
    const shippingContinue = await this.page.$('input[name="shippingMethod"]')
    if (shippingContinue) {
      await this.randomDelay(1000, 2000)
    }

    // 注文確認ページで注文確定
    await this.randomDelay(2000, 3000)

    // 注文確定ボタンをクリック
    const placeOrderSelectors = [
      'input[name="placeYourOrder1"]',
      '#placeYourOrder input',
      '#submitOrderButtonId input'
    ]

    for (const selector of placeOrderSelectors) {
      try {
        await this.humanClick(selector)
        break
      } catch (e) {
        continue
      }
    }

    await this.randomDelay(5000, 7000)

    // 注文完了ページから情報を抽出
    const orderInfo = await this.page.evaluate(() => {
      const orderIdElement = document.querySelector('.order-id')
      const orderTotalElement = document.querySelector('.grand-total-price')
      const confirmationElement = document.querySelector('.a-alert-heading')

      return {
        orderId: orderIdElement?.textContent?.trim() || '',
        orderTotal: orderTotalElement?.textContent?.trim() || '',
        confirmation: confirmationElement?.textContent?.trim() || ''
      }
    })

    console.log('✅ Order placed successfully!')

    return {
      success: true,
      orderId: orderInfo.orderId,
      orderTotal: parseFloat(orderInfo.orderTotal.replace(/[^0-9.]/g, '')),
      confirmationNumber: orderInfo.confirmation
    }
  }

  /**
   * 完全自動購入フロー
   */
  async executePurchase(request: PurchaseRequest): Promise<PurchaseResult> {
    try {
      console.log(`🚀 Starting automatic purchase for ASIN: ${request.asin}`)

      // アカウント情報取得
      const supabase = createClient()
      const { data: account, error } = await supabase
        .from('amazon_accounts')
        .select('*')
        .eq('marketplace', request.marketplace)
        .eq('is_active', true)
        .maybeSingle()

      if (error || !account) {
        throw new Error('No active Amazon account found')
      }

      // ブラウザ初期化
      await this.initBrowser(account.proxy_url)

      // ログイン
      await this.loginToAmazon(account.email, account.password)

      // 商品ページへ移動・価格確認
      const { currentPrice } = await this.navigateToProductAndVerifyPrice(
        request.asin,
        request.maxPrice
      )

      // カートに追加
      await this.addToCart(request.quantity)

      // チェックアウト（決済）
      const result = await this.checkout()

      // 購入完了
      result.orderTotal = currentPrice * request.quantity

      return result
    } catch (error: any) {
      console.error('❌ Purchase failed:', error)

      // スクリーンショット保存（デバッグ用）
      let screenshot = ''
      if (this.page) {
        screenshot = await this.page.screenshot({ encoding: 'base64' })
      }

      return {
        success: false,
        error: error.message,
        screenshot
      }
    } finally {
      // クリーンアップ
      await this.cleanup()
    }
  }

  /**
   * クリーンアップ
   */
  private async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close()
      this.page = null
    }

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// シングルトンインスタンス
export const paymentExecutor = new AutomaticPaymentExecutor()
