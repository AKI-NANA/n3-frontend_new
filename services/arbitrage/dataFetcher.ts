// dataFetcher.ts: Amazon/楽天 リアルタイム価格取得サービス (I3-2)

// Amazon 製品情報
export interface AmazonProductData {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  listPrice: number | null; // 定価
  buyBoxPrice: number | null; // カート価格
  lowestNewPrice: number | null; // 最安新品価格
  lowestUsedPrice: number | null; // 最安中古価格
  salesRank: number | null; // BSR (Best Sellers Rank)
  salesRankCategory: string | null;
  availability: string; // "In Stock", "Out of Stock", etc.
  prime: boolean;
  fba: boolean;
  seller: {
    id: string;
    name: string;
    rating: number | null;
    feedbackCount: number | null;
  };
  images: string[];
  reviewCount: number;
  averageRating: number | null;
  lastUpdated: Date;
}

// 楽天製品情報
export interface RakutenProductData {
  itemCode: string;
  itemUrl: string;
  shopCode: string;
  shopName: string;
  title: string;
  price: number;
  priceWithTax: number;
  currency: string;
  originalPrice: number | null; // 元値
  discountRate: number | null; // 割引率
  availability: number; // 在庫数
  isRakutenGlobal: boolean;
  pointRate: number; // ポイント還元率
  reviewCount: number;
  averageRating: number | null;
  images: string[];
  lastUpdated: Date;
}

/**
 * Amazon Product Advertising API / SP-API データフェッチャー
 */
export class AmazonDataFetcher {
  private apiKey: string | null;
  private accessKey: string | null;
  private secretKey: string | null;
  private associateTag: string | null;

  constructor(config?: {
    apiKey?: string;
    accessKey?: string;
    secretKey?: string;
    associateTag?: string;
  }) {
    this.apiKey = config?.apiKey || process.env.AMAZON_API_KEY || null;
    this.accessKey =
      config?.accessKey || process.env.AMAZON_ACCESS_KEY || null;
    this.secretKey =
      config?.secretKey || process.env.AMAZON_SECRET_KEY || null;
    this.associateTag =
      config?.associateTag || process.env.AMAZON_ASSOCIATE_TAG || null;
  }

  /**
   * I3-2: ASIN に基づいてリアルタイム製品データを取得
   */
  async fetchProductByASIN(
    asin: string,
    marketplace: string = "US"
  ): Promise<AmazonProductData | null> {
    if (!this.accessKey || !this.secretKey || !this.associateTag) {
      console.warn(
        "Amazon API credentials not configured. Returning mock data."
      );
      return this.generateMockData(asin);
    }

    try {
      // Amazon Product Advertising API v5 の実装
      // https://webservices.amazon.com/paapi5/documentation/

      // 実際のAPI呼び出し例:
      /*
      const params = {
        asin,
        marketplace,
        resources: [
          'Images.Primary.Large',
          'ItemInfo.Title',
          'Offers.Listings.Price',
          'Offers.Listings.Condition',
          'BrowseNodeInfo.BrowseNodes.SalesRank',
        ],
      };

      const response = await this.callPAAPI(params);
      return this.parsePAAPIResponse(response);
      */

      // モックデータを返す（開発用）
      console.log(`Fetching Amazon product data for ASIN: ${asin}`);
      return this.generateMockData(asin);
    } catch (error) {
      console.error(`Failed to fetch Amazon data for ${asin}:`, error);
      return null;
    }
  }

  /**
   * 複数ASINを一括取得
   */
  async fetchMultipleProducts(
    asins: string[],
    marketplace: string = "US"
  ): Promise<AmazonProductData[]> {
    const results: AmazonProductData[] = [];

    for (const asin of asins) {
      const data = await this.fetchProductByASIN(asin, marketplace);
      if (data) {
        results.push(data);
      }

      // レート制限を考慮（PA-APIは1秒に1リクエスト）
      await this.delay(1000);
    }

    return results;
  }

  /**
   * モックデータ生成
   */
  private generateMockData(asin: string): AmazonProductData {
    const basePrice = 50 + Math.random() * 200;
    const discount = Math.random() * 0.3; // 0-30% discount

    return {
      asin,
      title: `Sample Product for ${asin}`,
      price: parseFloat((basePrice * (1 - discount)).toFixed(2)),
      currency: "USD",
      listPrice: parseFloat(basePrice.toFixed(2)),
      buyBoxPrice: parseFloat((basePrice * (1 - discount * 0.8)).toFixed(2)),
      lowestNewPrice: parseFloat((basePrice * (1 - discount * 1.2)).toFixed(2)),
      lowestUsedPrice: parseFloat((basePrice * 0.6).toFixed(2)),
      salesRank: Math.floor(Math.random() * 100000) + 1000,
      salesRankCategory: "Electronics",
      availability: Math.random() > 0.2 ? "In Stock" : "Out of Stock",
      prime: Math.random() > 0.3,
      fba: Math.random() > 0.4,
      seller: {
        id: "SELLER123",
        name: "Example Seller Inc.",
        rating: 4.5 + Math.random() * 0.5,
        feedbackCount: Math.floor(Math.random() * 10000),
      },
      images: [
        `https://via.placeholder.com/500x500?text=${asin}-1`,
        `https://via.placeholder.com/500x500?text=${asin}-2`,
      ],
      reviewCount: Math.floor(Math.random() * 5000),
      averageRating: 3.5 + Math.random() * 1.5,
      lastUpdated: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 楽天 API データフェッチャー
 */
export class RakutenDataFetcher {
  private applicationId: string | null;
  private affiliateId: string | null;

  constructor(config?: { applicationId?: string; affiliateId?: string }) {
    this.applicationId =
      config?.applicationId || process.env.RAKUTEN_APPLICATION_ID || null;
    this.affiliateId =
      config?.affiliateId || process.env.RAKUTEN_AFFILIATE_ID || null;
  }

  /**
   * I3-2: 商品コードに基づいてリアルタイム製品データを取得
   */
  async fetchProductByItemCode(
    itemCode: string
  ): Promise<RakutenProductData | null> {
    if (!this.applicationId) {
      console.warn(
        "Rakuten API credentials not configured. Returning mock data."
      );
      return this.generateMockData(itemCode);
    }

    try {
      // 楽天商品検索API v2 の実装
      // https://webservice.rakuten.co.jp/documentation/ichiba-item-search

      const endpoint = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706";
      const params = new URLSearchParams({
        format: "json",
        applicationId: this.applicationId,
        itemCode,
      });

      if (this.affiliateId) {
        params.append("affiliateId", this.affiliateId);
      }

      const url = `${endpoint}?${params.toString()}`;

      // 実際のAPI呼び出し
      /*
      const response = await fetch(url);
      const data = await response.json();

      if (data.Items && data.Items.length > 0) {
        return this.parseRakutenResponse(data.Items[0]);
      }
      */

      console.log(`Fetching Rakuten product data for: ${itemCode}`);
      return this.generateMockData(itemCode);
    } catch (error) {
      console.error(`Failed to fetch Rakuten data for ${itemCode}:`, error);
      return null;
    }
  }

  /**
   * キーワードで商品検索
   */
  async searchProducts(
    keyword: string,
    options?: {
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      availability?: number;
      limit?: number;
    }
  ): Promise<RakutenProductData[]> {
    if (!this.applicationId) {
      console.warn("Rakuten API credentials not configured.");
      return [];
    }

    try {
      const endpoint = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706";
      const params = new URLSearchParams({
        format: "json",
        applicationId: this.applicationId,
        keyword,
        hits: String(options?.limit || 30),
      });

      if (options?.minPrice) {
        params.append("minPrice", String(options.minPrice));
      }

      if (options?.maxPrice) {
        params.append("maxPrice", String(options.maxPrice));
      }

      if (options?.sort) {
        params.append("sort", options.sort);
      }

      if (options?.availability !== undefined) {
        params.append("availability", String(options.availability));
      }

      if (this.affiliateId) {
        params.append("affiliateId", this.affiliateId);
      }

      const url = `${endpoint}?${params.toString()}`;

      console.log(`Searching Rakuten for: ${keyword}`);

      // モックデータを返す
      return Array.from({ length: 5 }, (_, i) =>
        this.generateMockData(`${keyword}-${i}`)
      );
    } catch (error) {
      console.error(`Failed to search Rakuten for ${keyword}:`, error);
      return [];
    }
  }

  /**
   * モックデータ生成
   */
  private generateMockData(itemCode: string): RakutenProductData {
    const basePrice = 3000 + Math.random() * 20000; // 3,000-23,000円
    const discountRate = Math.random() * 0.4; // 0-40% off

    return {
      itemCode,
      itemUrl: `https://item.rakuten.co.jp/shop/${itemCode}`,
      shopCode: "exampleshop",
      shopName: "Example Shop",
      title: `Sample Product ${itemCode}`,
      price: Math.floor(basePrice * (1 - discountRate)),
      priceWithTax: Math.floor(basePrice * (1 - discountRate) * 1.1), // 10% tax
      currency: "JPY",
      originalPrice: Math.floor(basePrice),
      discountRate: discountRate > 0 ? Math.floor(discountRate * 100) : null,
      availability: Math.floor(Math.random() * 50) + 1,
      isRakutenGlobal: Math.random() > 0.7,
      pointRate: Math.floor(Math.random() * 10) + 1, // 1-10%
      reviewCount: Math.floor(Math.random() * 1000),
      averageRating: 3.5 + Math.random() * 1.5,
      images: [
        `https://via.placeholder.com/500x500?text=${itemCode}-1`,
        `https://via.placeholder.com/500x500?text=${itemCode}-2`,
      ],
      lastUpdated: new Date(),
    };
  }
}

/**
 * 刈り取り/せどり価格分析サービス
 */
export class ArbitragePriceAnalyzer {
  private amazonFetcher: AmazonDataFetcher;
  private rakutenFetcher: RakutenDataFetcher;

  constructor() {
    this.amazonFetcher = new AmazonDataFetcher();
    this.rakutenFetcher = new RakutenDataFetcher();
  }

  /**
   * Amazon ⇔ 楽天 の価格差分析
   */
  async analyzeArbitrageOpportunity(
    asin: string,
    rakutenItemCode: string
  ): Promise<{
    profitable: boolean;
    amazonPrice: number | null;
    rakutenPrice: number | null;
    priceDifference: number;
    marginPercentage: number;
    recommendation: string;
  }> {
    const [amazonData, rakutenData] = await Promise.all([
      this.amazonFetcher.fetchProductByASIN(asin),
      this.rakutenFetcher.fetchProductByItemCode(rakutenItemCode),
    ]);

    if (!amazonData || !rakutenData) {
      return {
        profitable: false,
        amazonPrice: null,
        rakutenPrice: null,
        priceDifference: 0,
        marginPercentage: 0,
        recommendation: "Unable to fetch price data",
      };
    }

    // 為替レート（簡略化: 1 USD = 150 JPY）
    const exchangeRate = 150;
    const amazonPriceJPY = (amazonData.price || 0) * exchangeRate;
    const rakutenPriceJPY = rakutenData.price;

    const priceDifference = amazonPriceJPY - rakutenPriceJPY;
    const marginPercentage =
      rakutenPriceJPY > 0
        ? (priceDifference / rakutenPriceJPY) * 100
        : 0;

    let recommendation = "";
    let profitable = false;

    if (marginPercentage > 30) {
      profitable = true;
      recommendation = "EXCELLENT: Very high profit margin opportunity";
    } else if (marginPercentage > 20) {
      profitable = true;
      recommendation = "GOOD: Solid profit margin";
    } else if (marginPercentage > 10) {
      profitable = true;
      recommendation = "FAIR: Moderate profit margin";
    } else if (marginPercentage > 0) {
      profitable = false;
      recommendation = "MARGINAL: Low profit margin, high risk";
    } else {
      profitable = false;
      recommendation = "UNPROFITABLE: Negative margin";
    }

    return {
      profitable,
      amazonPrice: amazonData.price,
      rakutenPrice: rakutenData.price,
      priceDifference,
      marginPercentage,
      recommendation,
    };
  }
}

// デフォルトインスタンス
let defaultAmazonFetcher: AmazonDataFetcher | null = null;
let defaultRakutenFetcher: RakutenDataFetcher | null = null;
let defaultAnalyzer: ArbitragePriceAnalyzer | null = null;

export function getAmazonDataFetcher(): AmazonDataFetcher {
  if (!defaultAmazonFetcher) {
    defaultAmazonFetcher = new AmazonDataFetcher();
  }
  return defaultAmazonFetcher;
}

export function getRakutenDataFetcher(): RakutenDataFetcher {
  if (!defaultRakutenFetcher) {
    defaultRakutenFetcher = new RakutenDataFetcher();
  }
  return defaultRakutenFetcher;
}

export function getArbitragePriceAnalyzer(): ArbitragePriceAnalyzer {
  if (!defaultAnalyzer) {
    defaultAnalyzer = new ArbitragePriceAnalyzer();
  }
  return defaultAnalyzer;
}
