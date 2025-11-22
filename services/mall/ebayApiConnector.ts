// services/mall/ebayApiConnector.ts

/**
 * I3: 外部APIの実データ連携
 * eBay Analytics API 連携サービス
 *
 * このモジュールは、eBay Analytics APIからリスティングの
 * 閲覧数、販売データ、パフォーマンス指標を取得します。
 */

// ============================================================================
// 型定義
// ============================================================================

/**
 * eBay Analytics データ
 */
export interface EbayAnalyticsData {
  listingId: string;
  sku: string;
  title: string;
  impressions: number; // 表示回数
  clicks: number; // クリック数
  views: number; // 詳細閲覧数
  watchers: number; // ウォッチリスト追加数
  sales: number; // 販売数
  revenue: number; // 売上
  conversionRate: number; // コンバージョン率
  clickThroughRate: number; // クリック率
  dateRange: {
    from: Date;
    to: Date;
  };
}

/**
 * eBay リスティングパフォーマンス
 */
export interface EbayListingPerformance {
  listingId: string;
  sku: string;
  currentPrice: number;
  competitorAvgPrice?: number;
  trafficScore: number; // 0-100
  salesVelocity: number; // 日次販売数
  inventoryLevel: number;
  daysOnMarket: number;
  healthScore: number; // 総合健全性スコア (0-100)
}

/**
 * eBay OAuth トークン
 */
interface EbayOAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
}

/**
 * eBay API認証情報
 */
interface EbayAPICredentials {
  clientId: string;
  clientSecret: string;
  devId: string;
  redirectUri: string;
  environment: "production" | "sandbox";
}

// ============================================================================
// EbayApiConnector クラス
// ============================================================================

/**
 * eBay Analytics API 連携サービス
 */
export class EbayApiConnector {
  private credentials: EbayAPICredentials;
  private oauthToken: EbayOAuthToken | null = null;

  constructor() {
    this.credentials = this.loadCredentials();
  }

  // ==========================================================================
  // OAuth認証
  // ==========================================================================

  /**
   * OAuth アクセストークンを取得
   *
   * @param authCode - 認証コード
   * @returns OAuthトークン
   */
  async getAccessToken(authCode: string): Promise<EbayOAuthToken> {
    console.log("\n🔐 [EbayApiConnector] Getting OAuth access token...");

    const url =
      this.credentials.environment === "production"
        ? "https://api.ebay.com/identity/v1/oauth2/token"
        : "https://api.sandbox.ebay.com/identity/v1/oauth2/token";

    const credentials = Buffer.from(
      `${this.credentials.clientId}:${this.credentials.clientSecret}`
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: this.credentials.redirectUri,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(`OAuth error: ${response.statusText}`);
      }

      const data = await response.json();

      this.oauthToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        tokenType: data.token_type,
      };

      console.log("   ✅ Access token obtained");

      return this.oauthToken;
    } catch (error) {
      console.error("❌ Failed to get access token:", error);
      throw error;
    }
  }

  /**
   * OAuth トークンを自動リフレッシュ
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.oauthToken?.refreshToken) {
      throw new Error("No refresh token available");
    }

    console.log("\n🔄 [EbayApiConnector] Refreshing access token...");

    const url =
      this.credentials.environment === "production"
        ? "https://api.ebay.com/identity/v1/oauth2/token"
        : "https://api.sandbox.ebay.com/identity/v1/oauth2/token";

    const credentials = Buffer.from(
      `${this.credentials.clientId}:${this.credentials.clientSecret}`
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.oauthToken.refreshToken,
      scope: "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.analytics.readonly",
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh error: ${response.statusText}`);
      }

      const data = await response.json();

      this.oauthToken = {
        accessToken: data.access_token,
        refreshToken: this.oauthToken.refreshToken, // 同じリフレッシュトークンを維持
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        tokenType: data.token_type,
      };

      console.log("   ✅ Access token refreshed");
    } catch (error) {
      console.error("❌ Failed to refresh token:", error);
      throw error;
    }
  }

  /**
   * トークンの有効性をチェックし、必要に応じてリフレッシュ
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.oauthToken) {
      throw new Error("No OAuth token available. Please authenticate first.");
    }

    // トークンの有効期限が5分以内の場合はリフレッシュ
    const expiresIn = this.oauthToken.expiresAt.getTime() - Date.now();
    if (expiresIn < 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
  }

  // ==========================================================================
  // Analytics API: リスティング分析
  // ==========================================================================

  /**
   * リスティングの分析データを取得
   *
   * @param listingIds - リスティングID配列
   * @param dateRange - 期間
   * @returns 分析データ配列
   */
  async getListingAnalytics(
    listingIds: string[],
    dateRange?: { from: Date; to: Date }
  ): Promise<EbayAnalyticsData[]> {
    await this.ensureValidToken();

    console.log(
      `\n📊 [EbayApiConnector] Fetching analytics for ${listingIds.length} listings...`
    );

    const from = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30日前
    const to = dateRange?.to || new Date();

    const baseUrl =
      this.credentials.environment === "production"
        ? "https://api.ebay.com/sell/analytics/v1"
        : "https://api.sandbox.ebay.com/sell/analytics/v1";

    const analyticsData: EbayAnalyticsData[] = [];

    for (const listingId of listingIds) {
      try {
        // Traffic Report API
        const trafficUrl = `${baseUrl}/traffic_report?listing_ids=${listingId}&start_date=${from.toISOString().split('T')[0]}&end_date=${to.toISOString().split('T')[0]}`;

        const response = await fetch(trafficUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.oauthToken!.accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.warn(`   ⚠️ Failed to fetch analytics for ${listingId}: ${response.statusText}`);
          continue;
        }

        const data = await response.json();

        // レスポンスをパース
        const analytics = this.parseAnalyticsResponse(data, listingId, {
          from,
          to,
        });

        if (analytics) {
          analyticsData.push(analytics);
        }

        // レート制限対策: 500ms待機
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`   ❌ Error fetching analytics for ${listingId}:`, error);
      }
    }

    console.log(`   ✅ Fetched analytics for ${analyticsData.length} listings`);

    return analyticsData;
  }

  /**
   * リスティングパフォーマンスを取得
   *
   * @param listingIds - リスティングID配列
   * @returns パフォーマンスデータ配列
   */
  async getListingPerformance(
    listingIds: string[]
  ): Promise<EbayListingPerformance[]> {
    await this.ensureValidToken();

    console.log(
      `\n📈 [EbayApiConnector] Fetching performance for ${listingIds.length} listings...`
    );

    const baseUrl =
      this.credentials.environment === "production"
        ? "https://api.ebay.com/sell/inventory/v1"
        : "https://api.sandbox.ebay.com/sell/inventory/v1";

    const performanceData: EbayListingPerformance[] = [];

    for (const listingId of listingIds) {
      try {
        // Inventory Item API
        const url = `${baseUrl}/inventory_item/${listingId}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.oauthToken!.accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.warn(`   ⚠️ Failed to fetch performance for ${listingId}: ${response.statusText}`);
          continue;
        }

        const data = await response.json();

        // レスポンスをパース
        const performance = this.parsePerformanceResponse(data, listingId);

        if (performance) {
          performanceData.push(performance);
        }

        // レート制限対策: 500ms待機
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`   ❌ Error fetching performance for ${listingId}:`, error);
      }
    }

    console.log(`   ✅ Fetched performance for ${performanceData.length} listings`);

    return performanceData;
  }

  // ==========================================================================
  // レスポンスパース
  // ==========================================================================

  /**
   * Analytics APIレスポンスをパース
   */
  private parseAnalyticsResponse(
    data: any,
    listingId: string,
    dateRange: { from: Date; to: Date }
  ): EbayAnalyticsData | null {
    try {
      const record = data.records?.[0];

      if (!record) {
        return null;
      }

      const impressions = record.impressions || 0;
      const clicks = record.clicks || 0;
      const views = record.page_views || 0;
      const watchers = record.watchers || 0;
      const sales = record.transaction_count || 0;
      const revenue = record.total_sales_amount?.value || 0;

      const clickThroughRate = impressions > 0 ? clicks / impressions : 0;
      const conversionRate = clicks > 0 ? sales / clicks : 0;

      return {
        listingId,
        sku: record.sku || listingId,
        title: record.title || "",
        impressions,
        clicks,
        views,
        watchers,
        sales,
        revenue,
        conversionRate,
        clickThroughRate,
        dateRange,
      };
    } catch (error) {
      console.error("❌ Failed to parse analytics response:", error);
      return null;
    }
  }

  /**
   * Performance APIレスポンスをパース
   */
  private parsePerformanceResponse(
    data: any,
    listingId: string
  ): EbayListingPerformance | null {
    try {
      const sku = data.sku || listingId;
      const currentPrice = data.product?.pricing?.price?.value || 0;
      const inventoryLevel = data.availability?.shipToLocationAvailability?.quantity || 0;

      // 簡易的なスコア計算（実際にはより高度なロジックが必要）
      const trafficScore = 50; // TODO: 実際のトラフィックデータから計算
      const salesVelocity = 0; // TODO: 実際の販売データから計算
      const daysOnMarket = 30; // TODO: 実際の出品日から計算
      const healthScore = 70; // TODO: 複数の指標から総合スコアを計算

      return {
        listingId,
        sku,
        currentPrice,
        trafficScore,
        salesVelocity,
        inventoryLevel,
        daysOnMarket,
        healthScore,
      };
    } catch (error) {
      console.error("❌ Failed to parse performance response:", error);
      return null;
    }
  }

  // ==========================================================================
  // ヘルパー関数
  // ==========================================================================

  /**
   * 認証情報を環境変数から読み込む
   */
  private loadCredentials(): EbayAPICredentials {
    return {
      clientId: process.env.EBAY_CLIENT_ID || "",
      clientSecret: process.env.EBAY_CLIENT_SECRET || "",
      devId: process.env.EBAY_DEV_ID || "",
      redirectUri: process.env.EBAY_REDIRECT_URI || "http://localhost:3000/ebay/callback",
      environment: (process.env.EBAY_ENVIRONMENT as "production" | "sandbox") || "sandbox",
    };
  }

  /**
   * 既存のトークンを設定
   */
  setToken(token: EbayOAuthToken): void {
    this.oauthToken = token;
  }

  /**
   * 現在のトークンを取得
   */
  getToken(): EbayOAuthToken | null {
    return this.oauthToken;
  }
}

// ============================================================================
// エクスポート: シングルトンインスタンス
// ============================================================================

let ebayApiConnectorInstance: EbayApiConnector | null = null;

/**
 * EbayApiConnectorのシングルトンインスタンスを取得
 */
export function getEbayApiConnector(): EbayApiConnector {
  if (!ebayApiConnectorInstance) {
    ebayApiConnectorInstance = new EbayApiConnector();
  }
  return ebayApiConnectorInstance;
}
