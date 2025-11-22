// services/arbitrage/dataFetcher.ts

/**
 * I3: 外部APIの実データ連携
 * Amazon PA-API / 楽天 API 連携サービス
 *
 * このモジュールは、Amazon Product Advertising APIと楽天市場APIから
 * 商品データを取得し、裁定取引の機会を検出します。
 */

import crypto from "crypto";

// ============================================================================
// 型定義
// ============================================================================

/**
 * Amazon商品データ
 */
export interface AmazonProduct {
  asin: string;
  title: string;
  price: number;
  listPrice?: number;
  currency: string;
  availability: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  salesRank?: number;
  category?: string;
  brand?: string;
}

/**
 * 楽天商品データ
 */
export interface RakutenProduct {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  imageUrl?: string;
  shopName: string;
  shopCode: string;
  availability: number;
  reviewCount?: number;
  reviewAverage?: number;
  genreId?: string;
}

/**
 * 裁定取引機会
 */
export interface ArbitrageOpportunity {
  amazonProduct: AmazonProduct;
  rakutenProduct: RakutenProduct;
  profitAmount: number;
  profitRate: number;
  confidence: number; // 0-100
  matchScore: number; // 0-100 (商品一致度)
}

/**
 * Amazon PA-API 認証情報
 */
interface AmazonPAAPICredentials {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  marketplace: string;
}

/**
 * 楽天API認証情報
 */
interface RakutenAPICredentials {
  applicationId: string;
  affiliateId?: string;
}

// ============================================================================
// DataFetcher クラス
// ============================================================================

/**
 * Amazon PA-API / 楽天 API データ取得サービス
 */
export class DataFetcher {
  private amazonCreds: AmazonPAAPICredentials;
  private rakutenCreds: RakutenAPICredentials;

  constructor() {
    this.amazonCreds = this.loadAmazonCredentials();
    this.rakutenCreds = this.loadRakutenCredentials();
  }

  // ==========================================================================
  // Amazon PA-API: 商品検索
  // ==========================================================================

  /**
   * Amazon PA-APIで商品を検索
   *
   * @param keyword - 検索キーワード
   * @param options - 検索オプション
   * @returns Amazon商品データ配列
   */
  async searchAmazonProducts(
    keyword: string,
    options?: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: string;
    }
  ): Promise<AmazonProduct[]> {
    console.log(`\n🔍 [DataFetcher] Searching Amazon for: "${keyword}"`);

    if (!this.amazonCreds.accessKey) {
      console.warn("⚠️ Amazon PA-API credentials not configured");
      return [];
    }

    try {
      const endpoint = "webservices.amazon.co.jp";
      const uri = "/paapi5/searchitems";

      const requestBody = {
        Keywords: keyword,
        Resources: [
          "Images.Primary.Large",
          "ItemInfo.Title",
          "ItemInfo.Features",
          "Offers.Listings.Price",
          "Offers.Listings.Availability.Message",
          "BrowseNodeInfo.BrowseNodes.SalesRank",
        ],
        PartnerTag: this.amazonCreds.partnerTag,
        PartnerType: "Associates",
        Marketplace: this.amazonCreds.marketplace,
        ...(options?.category && { SearchIndex: options.category }),
        ...(options?.minPrice && { MinPrice: options.minPrice }),
        ...(options?.maxPrice && { MaxPrice: options.maxPrice }),
        ...(options?.sortBy && { SortBy: options.sortBy }),
      };

      const headers = this.generateAmazonPAAPIHeaders(
        endpoint,
        uri,
        JSON.stringify(requestBody)
      );

      const response = await fetch(`https://${endpoint}${uri}`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Amazon PA-API error: ${response.statusText}`);
      }

      const data = await response.json();

      // レスポンスをパース
      const products = this.parseAmazonSearchResults(data);

      console.log(`   ✅ Found ${products.length} Amazon products`);

      return products;
    } catch (error) {
      console.error("❌ Amazon PA-API search failed:", error);
      return [];
    }
  }

  /**
   * ASINで商品情報を取得
   *
   * @param asin - Amazon ASIN
   * @returns Amazon商品データ
   */
  async getAmazonProductByASIN(asin: string): Promise<AmazonProduct | null> {
    console.log(`\n📦 [DataFetcher] Fetching Amazon product: ${asin}`);

    if (!this.amazonCreds.accessKey) {
      console.warn("⚠️ Amazon PA-API credentials not configured");
      return null;
    }

    try {
      const endpoint = "webservices.amazon.co.jp";
      const uri = "/paapi5/getitems";

      const requestBody = {
        ItemIds: [asin],
        Resources: [
          "Images.Primary.Large",
          "ItemInfo.Title",
          "ItemInfo.Features",
          "Offers.Listings.Price",
          "Offers.Listings.Availability.Message",
          "BrowseNodeInfo.BrowseNodes.SalesRank",
        ],
        PartnerTag: this.amazonCreds.partnerTag,
        PartnerType: "Associates",
        Marketplace: this.amazonCreds.marketplace,
      };

      const headers = this.generateAmazonPAAPIHeaders(
        endpoint,
        uri,
        JSON.stringify(requestBody)
      );

      const response = await fetch(`https://${endpoint}${uri}`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Amazon PA-API error: ${response.statusText}`);
      }

      const data = await response.json();

      // レスポンスをパース
      const products = this.parseAmazonGetItemsResults(data);

      if (products.length > 0) {
        console.log(`   ✅ Found product: ${products[0].title}`);
        return products[0];
      }

      return null;
    } catch (error) {
      console.error("❌ Amazon PA-API get item failed:", error);
      return null;
    }
  }

  // ==========================================================================
  // 楽天API: 商品検索
  // ==========================================================================

  /**
   * 楽天APIで商品を検索
   *
   * @param keyword - 検索キーワード
   * @param options - 検索オプション
   * @returns 楽天商品データ配列
   */
  async searchRakutenProducts(
    keyword: string,
    options?: {
      genreId?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      hits?: number;
    }
  ): Promise<RakutenProduct[]> {
    console.log(`\n🔍 [DataFetcher] Searching Rakuten for: "${keyword}"`);

    if (!this.rakutenCreds.applicationId) {
      console.warn("⚠️ Rakuten API credentials not configured");
      return [];
    }

    try {
      const baseUrl = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601";

      const params = new URLSearchParams({
        applicationId: this.rakutenCreds.applicationId,
        keyword: keyword,
        hits: (options?.hits || 30).toString(),
        ...(options?.genreId && { genreId: options.genreId }),
        ...(options?.minPrice && { minPrice: options.minPrice.toString() }),
        ...(options?.maxPrice && { maxPrice: options.maxPrice.toString() }),
        ...(options?.sort && { sort: options.sort }),
        ...(this.rakutenCreds.affiliateId && { affiliateId: this.rakutenCreds.affiliateId }),
      });

      const url = `${baseUrl}?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Rakuten API error: ${response.statusText}`);
      }

      const data = await response.json();

      // レスポンスをパース
      const products = this.parseRakutenSearchResults(data);

      console.log(`   ✅ Found ${products.length} Rakuten products`);

      return products;
    } catch (error) {
      console.error("❌ Rakuten API search failed:", error);
      return [];
    }
  }

  // ==========================================================================
  // 裁定取引機会の検出
  // ==========================================================================

  /**
   * Amazon ⇄ 楽天 間の裁定取引機会を検出
   *
   * @param keyword - 検索キーワード
   * @param options - 検索オプション
   * @returns 裁定取引機会配列
   */
  async findArbitrageOpportunities(
    keyword: string,
    options?: {
      minProfitRate?: number;
      minProfitAmount?: number;
      maxRakutenPrice?: number;
    }
  ): Promise<ArbitrageOpportunity[]> {
    console.log(`\n💰 [DataFetcher] Finding arbitrage opportunities for: "${keyword}"`);

    const minProfitRate = options?.minProfitRate || 0.15; // 15%
    const minProfitAmount = options?.minProfitAmount || 500; // ¥500

    // STEP 1: Amazon と楽天から商品を検索
    const [amazonProducts, rakutenProducts] = await Promise.all([
      this.searchAmazonProducts(keyword),
      this.searchRakutenProducts(keyword, {
        maxPrice: options?.maxRakutenPrice,
      }),
    ]);

    console.log(`   📊 Amazon: ${amazonProducts.length} products`);
    console.log(`   📊 Rakuten: ${rakutenProducts.length} products`);

    // STEP 2: 商品をマッチング
    const opportunities: ArbitrageOpportunity[] = [];

    for (const rakutenProduct of rakutenProducts) {
      for (const amazonProduct of amazonProducts) {
        // 商品名の類似度を計算
        const matchScore = this.calculateMatchScore(
          rakutenProduct.itemName,
          amazonProduct.title
        );

        // 類似度が60%以上の場合のみマッチングとみなす
        if (matchScore < 60) continue;

        // 利益を計算
        const amazonPrice = amazonProduct.price;
        const rakutenPrice = rakutenProduct.itemPrice;

        // Amazonで売って楽天で買う場合の利益
        const amazonFee = amazonPrice * 0.15; // Amazon手数料15%
        const shippingCost = 500; // 配送コスト概算
        const profitAmount =
          amazonPrice - amazonFee - rakutenPrice - shippingCost;
        const profitRate = profitAmount / rakutenPrice;

        // 最低利益条件をチェック
        if (
          profitAmount < minProfitAmount ||
          profitRate < minProfitRate
        ) {
          continue;
        }

        // 信頼度を計算（商品一致度、価格差、販売実績など）
        const confidence = this.calculateConfidence(
          amazonProduct,
          rakutenProduct,
          matchScore
        );

        opportunities.push({
          amazonProduct,
          rakutenProduct,
          profitAmount,
          profitRate,
          confidence,
          matchScore,
        });
      }
    }

    // 利益率の高い順にソート
    opportunities.sort((a, b) => b.profitRate - a.profitRate);

    console.log(`   ✅ Found ${opportunities.length} arbitrage opportunities`);
    if (opportunities.length > 0) {
      const best = opportunities[0];
      console.log(`      Best: ¥${best.profitAmount.toLocaleString()} profit (${(best.profitRate * 100).toFixed(1)}%)`);
    }

    return opportunities;
  }

  // ==========================================================================
  // ヘルパー関数: Amazon PA-API
  // ==========================================================================

  /**
   * Amazon PA-API v5 の署名ヘッダーを生成
   */
  private generateAmazonPAAPIHeaders(
    endpoint: string,
    uri: string,
    payload: string
  ): Record<string, string> {
    const accessKey = this.amazonCreds.accessKey;
    const secretKey = this.amazonCreds.secretKey;

    const host = endpoint;
    const region = "us-west-2";
    const service = "ProductAdvertisingAPI";

    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const datestamp = timestamp.slice(0, 8);

    // リクエストのハッシュ
    const payloadHash = crypto
      .createHash("sha256")
      .update(payload)
      .digest("hex");

    // Canonical Request
    const canonicalRequest =
      `POST\n` +
      `${uri}\n` +
      `\n` +
      `content-type:application/json; charset=utf-8\n` +
      `host:${host}\n` +
      `x-amz-date:${timestamp}\n` +
      `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems\n` +
      `\n` +
      `content-type;host;x-amz-date;x-amz-target\n` +
      `${payloadHash}`;

    const canonicalRequestHash = crypto
      .createHash("sha256")
      .update(canonicalRequest)
      .digest("hex");

    // String to Sign
    const stringToSign =
      `AWS4-HMAC-SHA256\n` +
      `${timestamp}\n` +
      `${datestamp}/${region}/${service}/aws4_request\n` +
      `${canonicalRequestHash}`;

    // Signing Key
    const kDate = crypto
      .createHmac("sha256", `AWS4${secretKey}`)
      .update(datestamp)
      .digest();
    const kRegion = crypto
      .createHmac("sha256", kDate)
      .update(region)
      .digest();
    const kService = crypto
      .createHmac("sha256", kRegion)
      .update(service)
      .digest();
    const kSigning = crypto
      .createHmac("sha256", kService)
      .update("aws4_request")
      .digest();

    // Signature
    const signature = crypto
      .createHmac("sha256", kSigning)
      .update(stringToSign)
      .digest("hex");

    // Authorization Header
    const authorization =
      `AWS4-HMAC-SHA256 ` +
      `Credential=${accessKey}/${datestamp}/${region}/${service}/aws4_request, ` +
      `SignedHeaders=content-type;host;x-amz-date;x-amz-target, ` +
      `Signature=${signature}`;

    return {
      "Content-Type": "application/json; charset=utf-8",
      "Host": host,
      "X-Amz-Date": timestamp,
      "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
      "Authorization": authorization,
    };
  }

  /**
   * Amazon PA-API 検索結果をパース
   */
  private parseAmazonSearchResults(data: any): AmazonProduct[] {
    const products: AmazonProduct[] = [];

    if (data.SearchResult && data.SearchResult.Items) {
      for (const item of data.SearchResult.Items) {
        const product = this.parseAmazonItem(item);
        if (product) products.push(product);
      }
    }

    return products;
  }

  /**
   * Amazon PA-API GetItems結果をパース
   */
  private parseAmazonGetItemsResults(data: any): AmazonProduct[] {
    const products: AmazonProduct[] = [];

    if (data.ItemsResult && data.ItemsResult.Items) {
      for (const item of data.ItemsResult.Items) {
        const product = this.parseAmazonItem(item);
        if (product) products.push(product);
      }
    }

    return products;
  }

  /**
   * Amazon PA-API アイテムをパース
   */
  private parseAmazonItem(item: any): AmazonProduct | null {
    try {
      const asin = item.ASIN;
      const title = item.ItemInfo?.Title?.DisplayValue || "";
      const price = item.Offers?.Listings?.[0]?.Price?.Amount || 0;
      const currency = item.Offers?.Listings?.[0]?.Price?.Currency || "JPY";
      const availability =
        item.Offers?.Listings?.[0]?.Availability?.Message || "不明";
      const imageUrl = item.Images?.Primary?.Large?.URL;
      const salesRank = item.BrowseNodeInfo?.BrowseNodes?.[0]?.SalesRank;

      return {
        asin,
        title,
        price,
        currency,
        availability,
        imageUrl,
        salesRank,
      };
    } catch (error) {
      console.error("❌ Failed to parse Amazon item:", error);
      return null;
    }
  }

  // ==========================================================================
  // ヘルパー関数: 楽天API
  // ==========================================================================

  /**
   * 楽天API検索結果をパース
   */
  private parseRakutenSearchResults(data: any): RakutenProduct[] {
    const products: RakutenProduct[] = [];

    if (data.Items && Array.isArray(data.Items)) {
      for (const itemWrapper of data.Items) {
        const item = itemWrapper.Item;
        if (!item) continue;

        products.push({
          itemCode: item.itemCode,
          itemName: item.itemName,
          itemPrice: item.itemPrice,
          itemUrl: item.itemUrl,
          imageUrl: item.mediumImageUrls?.[0]?.imageUrl,
          shopName: item.shopName,
          shopCode: item.shopCode,
          availability: item.availability,
          reviewCount: item.reviewCount,
          reviewAverage: item.reviewAverage,
          genreId: item.genreId,
        });
      }
    }

    return products;
  }

  // ==========================================================================
  // ヘルパー関数: マッチング
  // ==========================================================================

  /**
   * 商品名の類似度を計算（簡易版）
   */
  private calculateMatchScore(title1: string, title2: string): number {
    // 簡易的な類似度計算（実際にはより高度なアルゴリズムを使用）
    const words1 = title1.toLowerCase().split(/\s+/);
    const words2 = title2.toLowerCase().split(/\s+/);

    let matchCount = 0;
    for (const word1 of words1) {
      if (words2.some((word2) => word2.includes(word1) || word1.includes(word2))) {
        matchCount++;
      }
    }

    const score = (matchCount / Math.max(words1.length, words2.length)) * 100;

    return Math.min(100, score);
  }

  /**
   * 裁定取引機会の信頼度を計算
   */
  private calculateConfidence(
    amazonProduct: AmazonProduct,
    rakutenProduct: RakutenProduct,
    matchScore: number
  ): number {
    let confidence = matchScore;

    // Amazonの販売ランクが高い場合は信頼度アップ
    if (amazonProduct.salesRank && amazonProduct.salesRank < 10000) {
      confidence += 10;
    }

    // 楽天のレビューが多い場合は信頼度アップ
    if (rakutenProduct.reviewCount && rakutenProduct.reviewCount > 10) {
      confidence += 10;
    }

    return Math.min(100, confidence);
  }

  // ==========================================================================
  // 認証情報読み込み
  // ==========================================================================

  /**
   * Amazon PA-API認証情報を読み込み
   */
  private loadAmazonCredentials(): AmazonPAAPICredentials {
    return {
      accessKey: process.env.AMAZON_PAAPI_ACCESS_KEY || "",
      secretKey: process.env.AMAZON_PAAPI_SECRET_KEY || "",
      partnerTag: process.env.AMAZON_PAAPI_PARTNER_TAG || "",
      marketplace: process.env.AMAZON_PAAPI_MARKETPLACE || "www.amazon.co.jp",
    };
  }

  /**
   * 楽天API認証情報を読み込み
   */
  private loadRakutenCredentials(): RakutenAPICredentials {
    return {
      applicationId: process.env.RAKUTEN_APPLICATION_ID || "",
      affiliateId: process.env.RAKUTEN_AFFILIATE_ID,
    };
  }
}

// ============================================================================
// エクスポート: シングルトンインスタンス
// ============================================================================

let dataFetcherInstance: DataFetcher | null = null;

/**
 * DataFetcherのシングルトンインスタンスを取得
 */
export function getDataFetcher(): DataFetcher {
  if (!dataFetcherInstance) {
    dataFetcherInstance = new DataFetcher();
  }
  return dataFetcherInstance;
}
