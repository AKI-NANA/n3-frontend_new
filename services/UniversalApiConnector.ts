// services/UniversalApiConnector.ts

/**
 * T29: 汎用 API コネクタハブ
 * すべてのマーケットプレイスAPIを単一のインターフェースで処理するレイヤー
 *
 * このクラスは、約50の異なるAPIに対応するため、
 * API接続の抽象化と標準化を実現します。
 */

import type { MarketplaceId } from "./ListingGroupManager";

// ============================================================================
// 型定義
// ============================================================================

/**
 * API認証情報
 */
export interface ApiCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  merchantId?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * マーケットプレイス設定
 */
export interface MarketplaceConfig {
  id: MarketplaceId;
  name: string;
  baseUrl: string;
  apiVersion: string;
  authType: "oauth" | "api_key" | "bearer" | "basic";
  credentials: ApiCredentials;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
  timeout: number; // ミリ秒
}

/**
 * API呼び出しペイロード
 */
export interface ApiPayload {
  title: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  images: string[];
  category?: string;
  condition?: string;
  sku?: string;
  [key: string]: unknown; // 追加の専門属性
}

/**
 * API応答
 */
export interface ApiResponse {
  success: boolean;
  listingId?: string;
  externalId?: string;
  url?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  rawResponse?: unknown;
}

/**
 * API呼び出しオプション
 */
export interface ApiCallOptions {
  retryCount?: number; // リトライ回数
  retryDelay?: number; // リトライ間隔（ミリ秒）
  timeout?: number; // タイムアウト（ミリ秒）
}

// ============================================================================
// マーケットプレイス設定データ（モック）
// ============================================================================

/**
 * マーケットプレイス設定のデータベース
 * 実際の運用では、環境変数やデータベースから読み込む
 */
const MARKETPLACE_CONFIGS: Partial<Record<MarketplaceId, MarketplaceConfig>> = {
  // グローバル主力
  EBAY_US: {
    id: "EBAY_US",
    name: "eBay (United States)",
    baseUrl: "https://api.ebay.com",
    apiVersion: "v1",
    authType: "oauth",
    credentials: {
      clientId: process.env.EBAY_US_CLIENT_ID || "",
      clientSecret: process.env.EBAY_US_CLIENT_SECRET || "",
      accessToken: process.env.EBAY_US_ACCESS_TOKEN || "",
    },
    rateLimit: {
      requestsPerSecond: 5,
      requestsPerDay: 5000,
    },
    timeout: 30000,
  },

  AMAZON_US: {
    id: "AMAZON_US",
    name: "Amazon (United States)",
    baseUrl: "https://sellingpartnerapi-na.amazon.com",
    apiVersion: "2021-08-01",
    authType: "bearer",
    credentials: {
      clientId: process.env.AMAZON_US_CLIENT_ID || "",
      clientSecret: process.env.AMAZON_US_CLIENT_SECRET || "",
      accessToken: process.env.AMAZON_US_ACCESS_TOKEN || "",
      refreshToken: process.env.AMAZON_US_REFRESH_TOKEN || "",
    },
    rateLimit: {
      requestsPerSecond: 2,
      requestsPerDay: 10000,
    },
    timeout: 45000,
  },

  WALMART_US: {
    id: "WALMART_US",
    name: "Walmart (United States)",
    baseUrl: "https://marketplace.walmartapis.com",
    apiVersion: "v3",
    authType: "basic",
    credentials: {
      clientId: process.env.WALMART_US_CLIENT_ID || "",
      clientSecret: process.env.WALMART_US_CLIENT_SECRET || "",
    },
    rateLimit: {
      requestsPerSecond: 3,
      requestsPerDay: 5000,
    },
    timeout: 30000,
  },

  // ハイエンド・鑑定
  CHRONO24: {
    id: "CHRONO24",
    name: "Chrono24",
    baseUrl: "https://api.chrono24.com",
    apiVersion: "v1",
    authType: "api_key",
    credentials: {
      apiKey: process.env.CHRONO24_API_KEY || "",
      merchantId: process.env.CHRONO24_MERCHANT_ID || "",
    },
    rateLimit: {
      requestsPerSecond: 2,
      requestsPerDay: 1000,
    },
    timeout: 30000,
  },

  STOCKX: {
    id: "STOCKX",
    name: "StockX",
    baseUrl: "https://api.stockx.com",
    apiVersion: "v1",
    authType: "api_key",
    credentials: {
      apiKey: process.env.STOCKX_API_KEY || "",
      apiSecret: process.env.STOCKX_API_SECRET || "",
    },
    rateLimit: {
      requestsPerSecond: 1,
      requestsPerDay: 500,
    },
    timeout: 30000,
  },

  // ホビー・コレクティブル
  CARD_MARKET: {
    id: "CARD_MARKET",
    name: "Cardmarket",
    baseUrl: "https://api.cardmarket.com",
    apiVersion: "v2.0",
    authType: "oauth",
    credentials: {
      apiKey: process.env.CARD_MARKET_API_KEY || "",
      apiSecret: process.env.CARD_MARKET_API_SECRET || "",
      accessToken: process.env.CARD_MARKET_ACCESS_TOKEN || "",
    },
    rateLimit: {
      requestsPerSecond: 1,
      requestsPerDay: 5000,
    },
    timeout: 30000,
  },

  TCGPLAYER: {
    id: "TCGPLAYER",
    name: "TCGplayer",
    baseUrl: "https://api.tcgplayer.com",
    apiVersion: "v1",
    authType: "bearer",
    credentials: {
      clientId: process.env.TCGPLAYER_CLIENT_ID || "",
      clientSecret: process.env.TCGPLAYER_CLIENT_SECRET || "",
    },
    rateLimit: {
      requestsPerSecond: 2,
      requestsPerDay: 10000,
    },
    timeout: 30000,
  },

  // アジア主要市場
  SHOPEE_SG: {
    id: "SHOPEE_SG",
    name: "Shopee (Singapore)",
    baseUrl: "https://partner.shopeemobile.com",
    apiVersion: "v2",
    authType: "bearer",
    credentials: {
      apiKey: process.env.SHOPEE_SG_API_KEY || "",
      merchantId: process.env.SHOPEE_SG_MERCHANT_ID || "",
    },
    rateLimit: {
      requestsPerSecond: 5,
      requestsPerDay: 10000,
    },
    timeout: 30000,
  },

  RAKUTEN_JP: {
    id: "RAKUTEN_JP",
    name: "Rakuten Japan",
    baseUrl: "https://api.rms.rakuten.co.jp",
    apiVersion: "v1",
    authType: "api_key",
    credentials: {
      apiKey: process.env.RAKUTEN_JP_API_KEY || "",
      apiSecret: process.env.RAKUTEN_JP_API_SECRET || "",
    },
    rateLimit: {
      requestsPerSecond: 3,
      requestsPerDay: 5000,
    },
    timeout: 30000,
  },
};

// ============================================================================
// UniversalApiConnector クラス
// ============================================================================

/**
 * 汎用 API コネクタハブ
 * すべてのマーケットプレイスAPIを統一されたインターフェースで呼び出す
 */
export class UniversalApiConnector {
  private static rateLimitTracker: Map<
    MarketplaceId,
    { count: number; resetAt: number }
  > = new Map();

  /**
   * マーケットプレイス設定を取得
   */
  private static getConfig(marketplaceId: MarketplaceId): MarketplaceConfig {
    const config = MARKETPLACE_CONFIGS[marketplaceId];

    if (!config) {
      throw new Error(
        `❌ [UniversalApiConnector] Marketplace configuration not found: ${marketplaceId}. ` +
        `Please add configuration for this marketplace.`
      );
    }

    return config;
  }

  /**
   * レート制限をチェック
   */
  private static checkRateLimit(marketplaceId: MarketplaceId): void {
    const config = this.getConfig(marketplaceId);
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(marketplaceId);

    if (!tracker || now > tracker.resetAt) {
      // レート制限をリセット
      this.rateLimitTracker.set(marketplaceId, {
        count: 1,
        resetAt: now + 1000, // 1秒後にリセット
      });
      return;
    }

    if (tracker.count >= config.rateLimit.requestsPerSecond) {
      const waitTime = tracker.resetAt - now;
      throw new Error(
        `⏳ [UniversalApiConnector] Rate limit exceeded for ${marketplaceId}. ` +
        `Wait ${waitTime}ms before retrying.`
      );
    }

    tracker.count += 1;
  }

  /**
   * API呼び出しを実行（内部実装）
   */
  private static async executeApiCall(
    marketplaceId: MarketplaceId,
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    payload?: unknown
  ): Promise<unknown> {
    const config = this.getConfig(marketplaceId);
    const url = `${config.baseUrl}${endpoint}`;

    // 認証ヘッダーの構築
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "N3-MultiMarketplace-System/1.0",
    };

    switch (config.authType) {
      case "oauth":
      case "bearer":
        if (config.credentials.accessToken) {
          headers["Authorization"] = `Bearer ${config.credentials.accessToken}`;
        }
        break;
      case "api_key":
        if (config.credentials.apiKey) {
          headers["X-API-Key"] = config.credentials.apiKey;
        }
        break;
      case "basic":
        if (config.credentials.clientId && config.credentials.clientSecret) {
          const auth = Buffer.from(
            `${config.credentials.clientId}:${config.credentials.clientSecret}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${auth}`;
        }
        break;
    }

    // API呼び出し（モック実装）
    console.log(
      `📡 [UniversalApiConnector] ${method} ${url} for ${marketplaceId}`
    );
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    // 実際のAPI呼び出しはここで実装
    // const response = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    // return await response.json();

    // モックレスポンス
    return {
      success: true,
      id: `${marketplaceId}_${Date.now()}`,
      message: "Listing created successfully (MOCK)",
    };
  }

  /**
   * リトライ付きAPI呼び出し
   */
  private static async callWithRetry(
    marketplaceId: MarketplaceId,
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    payload?: unknown,
    options: ApiCallOptions = {}
  ): Promise<unknown> {
    const { retryCount = 3, retryDelay = 1000 } = options;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        this.checkRateLimit(marketplaceId);
        return await this.executeApiCall(marketplaceId, endpoint, method, payload);
      } catch (error) {
        const isLastAttempt = attempt === retryCount;

        if (isLastAttempt) {
          throw error;
        }

        console.warn(
          `⚠️ [UniversalApiConnector] Attempt ${attempt}/${retryCount} failed for ${marketplaceId}. ` +
          `Retrying in ${retryDelay}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }

    throw new Error(`Failed after ${retryCount} attempts`);
  }

  // ==========================================================================
  // 公開メソッド
  // ==========================================================================

  /**
   * 出品を実行
   *
   * @param payload - 出品ペイロード
   * @param marketplaceId - マーケットプレイスID
   * @param options - API呼び出しオプション
   * @returns API応答
   */
  public static async publishListing(
    payload: ApiPayload,
    marketplaceId: MarketplaceId,
    options?: ApiCallOptions
  ): Promise<ApiResponse> {
    try {
      console.log(
        `\n🚀 [UniversalApiConnector] Publishing to ${marketplaceId}...`
      );

      const response = await this.callWithRetry(
        marketplaceId,
        "/listings",
        "POST",
        payload,
        options
      );

      console.log(
        `✅ [UniversalApiConnector] Successfully published to ${marketplaceId}`
      );

      return {
        success: true,
        listingId: (response as { id: string }).id,
        message: (response as { message: string }).message,
        rawResponse: response,
      };
    } catch (error) {
      console.error(
        `❌ [UniversalApiConnector] Failed to publish to ${marketplaceId}:`,
        error
      );

      return {
        success: false,
        error: {
          code: "PUBLISH_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
          details: error,
        },
      };
    }
  }

  /**
   * 出品を更新
   *
   * @param listingId - 出品ID
   * @param payload - 更新ペイロード
   * @param marketplaceId - マーケットプレイスID
   * @param options - API呼び出しオプション
   * @returns API応答
   */
  public static async updateListing(
    listingId: string,
    payload: Partial<ApiPayload>,
    marketplaceId: MarketplaceId,
    options?: ApiCallOptions
  ): Promise<ApiResponse> {
    try {
      console.log(
        `\n🔄 [UniversalApiConnector] Updating listing ${listingId} on ${marketplaceId}...`
      );

      const response = await this.callWithRetry(
        marketplaceId,
        `/listings/${listingId}`,
        "PUT",
        payload,
        options
      );

      console.log(
        `✅ [UniversalApiConnector] Successfully updated listing on ${marketplaceId}`
      );

      return {
        success: true,
        listingId,
        message: (response as { message: string }).message,
        rawResponse: response,
      };
    } catch (error) {
      console.error(
        `❌ [UniversalApiConnector] Failed to update listing on ${marketplaceId}:`,
        error
      );

      return {
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
          details: error,
        },
      };
    }
  }

  /**
   * 出品を削除
   *
   * @param listingId - 出品ID
   * @param marketplaceId - マーケットプレイスID
   * @param options - API呼び出しオプション
   * @returns API応答
   */
  public static async deleteListing(
    listingId: string,
    marketplaceId: MarketplaceId,
    options?: ApiCallOptions
  ): Promise<ApiResponse> {
    try {
      console.log(
        `\n🗑️ [UniversalApiConnector] Deleting listing ${listingId} from ${marketplaceId}...`
      );

      const response = await this.callWithRetry(
        marketplaceId,
        `/listings/${listingId}`,
        "DELETE",
        undefined,
        options
      );

      console.log(
        `✅ [UniversalApiConnector] Successfully deleted listing from ${marketplaceId}`
      );

      return {
        success: true,
        listingId,
        message: (response as { message: string }).message,
        rawResponse: response,
      };
    } catch (error) {
      console.error(
        `❌ [UniversalApiConnector] Failed to delete listing from ${marketplaceId}:`,
        error
      );

      return {
        success: false,
        error: {
          code: "DELETE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
          details: error,
        },
      };
    }
  }

  /**
   * 在庫を更新
   *
   * @param listingId - 出品ID
   * @param quantity - 新しい在庫数
   * @param marketplaceId - マーケットプレイスID
   * @param options - API呼び出しオプション
   * @returns API応答
   */
  public static async updateInventory(
    listingId: string,
    quantity: number,
    marketplaceId: MarketplaceId,
    options?: ApiCallOptions
  ): Promise<ApiResponse> {
    return this.updateListing(
      listingId,
      { quantity },
      marketplaceId,
      options
    );
  }

  /**
   * 価格を更新
   *
   * @param listingId - 出品ID
   * @param price - 新しい価格
   * @param marketplaceId - マーケットプレイスID
   * @param options - API呼び出しオプション
   * @returns API応答
   */
  public static async updatePrice(
    listingId: string,
    price: number,
    marketplaceId: MarketplaceId,
    options?: ApiCallOptions
  ): Promise<ApiResponse> {
    return this.updateListing(
      listingId,
      { price },
      marketplaceId,
      options
    );
  }
}
