/**
 * dataFetcher.ts
 *
 * 刈り取り・せどりデータ取得サービス
 *
 * 機能:
 * - Amazon PA-API/SP-APIからリアルタイム価格・BSR・在庫状況を取得
 * - 楽天市場APIから仕入れ用の価格情報を取得
 * - Yahoo!ショッピングAPIから仕入れ用の価格情報を取得
 * - Keepa APIからの価格履歴取得（オプション）
 */

interface ProductData {
  asin?: string
  jan?: string
  sku?: string
  title: string
  current_price: number
  bsr?: number // ベストセラーランキング
  stock_status: 'in_stock' | 'out_of_stock' | 'low_stock' | 'unknown'
  images?: string[]
  category?: string
}

interface SupplierPriceData {
  supplier: 'rakuten' | 'yahoo' | 'amazon'
  product_url: string
  product_name: string
  price: number
  shipping_cost?: number
  stock_available: boolean
  seller_rating?: number
}

interface ArbitrageOpportunity {
  product: ProductData
  selling_price: number // 販売価格（Amazon等）
  supplier_prices: SupplierPriceData[]
  best_supplier: SupplierPriceData
  potential_profit: number
  profit_margin: number
  arbitrage_score: number // 0-100
}

export class DataFetcher {
  private amazonPaApiKey: string | null = null
  private rakutenAppId: string | null = null
  private yahooAppId: string | null = null
  private keepaApiKey: string | null = null

  constructor() {
    this.amazonPaApiKey = process.env.AMAZON_PA_API_KEY || null
    this.rakutenAppId = process.env.RAKUTEN_APP_ID || null
    this.yahooAppId = process.env.YAHOO_APP_ID || null
    this.keepaApiKey = process.env.KEEPA_API_KEY || null

    this.logApiStatus()
  }

  private logApiStatus() {
    console.log('📊 DataFetcher API Status:')
    console.log(`  Amazon PA-API: ${this.amazonPaApiKey ? '✅' : '❌'}`)
    console.log(`  楽天市場API: ${this.rakutenAppId ? '✅' : '❌'}`)
    console.log(`  Yahoo!API: ${this.yahooAppId ? '✅' : '❌'}`)
    console.log(`  Keepa API: ${this.keepaApiKey ? '✅' : '❌'}`)
  }

  /**
   * Amazon PA-APIから商品データを取得
   */
  async fetchAmazonProductData(asin: string): Promise<ProductData | null> {
    if (!this.amazonPaApiKey) {
      console.warn('⚠️ Amazon PA-API未設定 - モックデータを返します')
      return this.getMockAmazonData(asin)
    }

    try {
      // TODO: Amazon PA-API v5の実装
      // const ProductAdvertisingAPI = require('paapi5-nodejs-sdk')
      // const api = new ProductAdvertisingAPI.DefaultApi()
      // ...

      console.log(`🔍 Amazon PA-API: ${asin}の情報を取得中...`)

      // 暫定: モックデータ
      return this.getMockAmazonData(asin)

    } catch (error) {
      console.error('❌ Amazon PA-APIエラー:', error)
      return null
    }
  }

  /**
   * 楽天市場APIから仕入れ価格を取得
   */
  async fetchRakutenPrice(keyword: string): Promise<SupplierPriceData[]> {
    if (!this.rakutenAppId) {
      console.warn('⚠️ 楽天市場API未設定 - モックデータを返します')
      return this.getMockRakutenData(keyword)
    }

    try {
      const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706?format=json&applicationId=${this.rakutenAppId}&keyword=${encodeURIComponent(keyword)}&hits=10&sort=%2BitemPrice`

      console.log(`🔍 楽天市場API: "${keyword}"を検索中...`)

      const response = await fetch(url)
      const data = await response.json()

      if (!data.Items || data.Items.length === 0) {
        console.log('⚠️ 楽天市場: 該当商品なし')
        return []
      }

      const results: SupplierPriceData[] = data.Items.map((item: any) => ({
        supplier: 'rakuten' as const,
        product_url: item.Item.itemUrl,
        product_name: item.Item.itemName,
        price: item.Item.itemPrice,
        stock_available: item.Item.availability === 1,
        seller_rating: item.Item.reviewAverage,
      }))

      console.log(`✅ 楽天市場: ${results.length}件の商品を取得`)

      return results

    } catch (error) {
      console.error('❌ 楽天市場APIエラー:', error)
      return []
    }
  }

  /**
   * Yahoo!ショッピングAPIから仕入れ価格を取得
   */
  async fetchYahooPrice(keyword: string): Promise<SupplierPriceData[]> {
    if (!this.yahooAppId) {
      console.warn('⚠️ Yahoo!ショッピングAPI未設定 - モックデータを返します')
      return this.getMockYahooData(keyword)
    }

    try {
      const url = `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?appid=${this.yahooAppId}&query=${encodeURIComponent(keyword)}&results=10&sort=+price`

      console.log(`🔍 Yahoo!ショッピングAPI: "${keyword}"を検索中...`)

      const response = await fetch(url)
      const data = await response.json()

      if (!data.hits || data.hits.length === 0) {
        console.log('⚠️ Yahoo!ショッピング: 該当商品なし')
        return []
      }

      const results: SupplierPriceData[] = data.hits.map((hit: any) => ({
        supplier: 'yahoo' as const,
        product_url: hit.url,
        product_name: hit.name,
        price: parseFloat(hit.price),
        stock_available: hit.inStock,
        seller_rating: hit.review?.rate,
      }))

      console.log(`✅ Yahoo!ショッピング: ${results.length}件の商品を取得`)

      return results

    } catch (error) {
      console.error('❌ Yahoo!ショッピングAPIエラー:', error)
      return []
    }
  }

  /**
   * Keepa APIから価格履歴を取得
   */
  async fetchKeepaData(asin: string): Promise<any> {
    if (!this.keepaApiKey) {
      console.warn('⚠️ Keepa API未設定')
      return null
    }

    try {
      const url = `https://api.keepa.com/product?key=${this.keepaApiKey}&domain=5&asin=${asin}&stats=1&history=1`

      console.log(`🔍 Keepa API: ${asin}の価格履歴を取得中...`)

      const response = await fetch(url)
      const data = await response.json()

      if (!data.products || data.products.length === 0) {
        console.log('⚠️ Keepa: 該当商品なし')
        return null
      }

      const product = data.products[0]

      console.log(`✅ Keepa: 価格履歴を取得`)

      return {
        current_price: product.stats.current[0] / 100,
        avg_price_30d: product.stats.avg30[0] / 100,
        avg_price_90d: product.stats.avg90[0] / 100,
        sales_rank: product.stats.current[3],
        sales_rank_drops_30d: product.stats.salesRankDrops30,
        is_out_of_stock: product.stats.outOfStockPercentage30 > 50,
      }

    } catch (error) {
      console.error('❌ Keepa APIエラー:', error)
      return null
    }
  }

  /**
   * 刈り取り機会を分析
   */
  async findArbitrageOpportunities(asin: string): Promise<ArbitrageOpportunity | null> {
    console.log(`\n🎯 刈り取り機会を分析: ${asin}`)

    // Step 1: Amazon商品データを取得
    const productData = await this.fetchAmazonProductData(asin)
    if (!productData) {
      console.log('❌ Amazon商品データが取得できませんでした')
      return null
    }

    // Step 2: 仕入れ先の価格を取得
    const [rakutenPrices, yahooPrices] = await Promise.all([
      this.fetchRakutenPrice(productData.title),
      this.fetchYahooPrice(productData.title),
    ])

    const supplierPrices = [...rakutenPrices, ...yahooPrices]

    if (supplierPrices.length === 0) {
      console.log('⚠️ 仕入れ先が見つかりませんでした')
      return null
    }

    // Step 3: 最安仕入れ先を特定
    const bestSupplier = supplierPrices.reduce((best, current) =>
      current.price < best.price ? current : best
    )

    // Step 4: 利益計算
    const sellingPrice = productData.current_price
    const purchaseCost = bestSupplier.price + (bestSupplier.shipping_cost || 0)
    const amazonFee = sellingPrice * 0.15 // 15%手数料
    const potentialProfit = sellingPrice - purchaseCost - amazonFee
    const profitMargin = potentialProfit / sellingPrice

    // Step 5: スコアリング
    let score = 50

    // 利益率でスコア加算
    if (profitMargin > 0.3) score += 30
    else if (profitMargin > 0.2) score += 20
    else if (profitMargin > 0.15) score += 10

    // BSRでスコア加算
    if (productData.bsr && productData.bsr < 5000) score += 20
    else if (productData.bsr && productData.bsr < 20000) score += 10

    console.log(`\n📊 分析結果:`)
    console.log(`  販売価格: ¥${sellingPrice.toLocaleString()}`)
    console.log(`  仕入れ価格: ¥${purchaseCost.toLocaleString()} (${bestSupplier.supplier})`)
    console.log(`  利益: ¥${potentialProfit.toLocaleString()} (${(profitMargin * 100).toFixed(1)}%)`)
    console.log(`  スコア: ${score}/100`)

    return {
      product: productData,
      selling_price: sellingPrice,
      supplier_prices: supplierPrices,
      best_supplier: bestSupplier,
      potential_profit: potentialProfit,
      profit_margin: profitMargin,
      arbitrage_score: score,
    }
  }

  /**
   * モックデータ（Amazon）
   */
  private getMockAmazonData(asin: string): ProductData {
    return {
      asin,
      title: `テスト商品 ${asin}`,
      current_price: 3000,
      bsr: 15000,
      stock_status: 'in_stock',
      images: [`https://via.placeholder.com/500?text=${asin}`],
      category: 'Electronics',
    }
  }

  /**
   * モックデータ（楽天）
   */
  private getMockRakutenData(keyword: string): SupplierPriceData[] {
    return [
      {
        supplier: 'rakuten',
        product_url: 'https://item.rakuten.co.jp/example',
        product_name: keyword,
        price: 2000,
        stock_available: true,
        seller_rating: 4.5,
      },
    ]
  }

  /**
   * モックデータ（Yahoo!）
   */
  private getMockYahooData(keyword: string): SupplierPriceData[] {
    return [
      {
        supplier: 'yahoo',
        product_url: 'https://shopping.yahoo.co.jp/example',
        product_name: keyword,
        price: 2100,
        stock_available: true,
        seller_rating: 4.3,
      },
    ]
  }
}

/**
 * シングルトンインスタンス
 */
let dataFetcherInstance: DataFetcher | null = null

export function getDataFetcher(): DataFetcher {
  if (!dataFetcherInstance) {
    dataFetcherInstance = new DataFetcher()
  }
  return dataFetcherInstance
}
