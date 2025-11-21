/**
 * Facebook Marketplace API クライアント
 * Facebook Graph API v18.0対応
 */

import {
  FacebookAuthConfig,
  FacebookTokens,
  FacebookShop,
  FacebookProduct,
  CreateProductRequest,
  FacebookCategory,
  FacebookOrder,
  FacebookCatalog,
  FacebookProductFeed,
  FacebookProductSet,
  FacebookInsights,
  FacebookApiResponse,
} from './types';

const FACEBOOK_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v18.0';
const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';

/**
 * Facebook Marketplace APIクライアント
 */
export class FacebookMarketplaceApiClient {
  private accessToken: string;
  private catalogId?: string;

  constructor(accessToken: string, catalogId?: string) {
    this.accessToken = accessToken;
    this.catalogId = catalogId;
  }

  /**
   * OAuth認証URLを生成
   */
  static getAuthorizationUrl(config: FacebookAuthConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(','),
      state,
      response_type: 'code',
    });

    return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  static async exchangeCodeForToken(
    config: FacebookAuthConfig,
    code: string
  ): Promise<FacebookTokens> {
    const params = new URLSearchParams({
      client_id: config.appId,
      client_secret: config.appSecret,
      redirect_uri: config.redirectUri,
      code,
    });

    const response = await fetch(
      `${FACEBOOK_GRAPH_API_BASE_URL}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'bearer',
    };
  }

  /**
   * 長期トークンを取得
   */
  static async getLongLivedToken(
    config: FacebookAuthConfig,
    shortLivedToken: string
  ): Promise<FacebookTokens> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: config.appId,
      client_secret: config.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${FACEBOOK_GRAPH_API_BASE_URL}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get long-lived token: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: 'bearer',
    };
  }

  /**
   * APIリクエスト実行
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<FacebookApiResponse<T>> {
    const url = `${FACEBOOK_GRAPH_API_BASE_URL}${endpoint}`;
    const separator = endpoint.includes('?') ? '&' : '?';
    const urlWithToken = `${url}${separator}access_token=${this.accessToken}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(urlWithToken, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: {
          message: response.statusText,
          type: 'UNKNOWN',
          code: response.status,
        },
      }));

      return {
        error: error.error,
      };
    }

    return response.json();
  }

  /**
   * カタログ情報を取得
   */
  async getCatalog(catalogId?: string): Promise<FacebookCatalog> {
    const id = catalogId || this.catalogId;
    if (!id) {
      throw new Error('Catalog ID is required');
    }

    const response = await this.request<FacebookCatalog>(
      `/${id}?fields=id,name,business_id,product_count,vertical`
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data!;
  }

  /**
   * 商品一覧を取得
   */
  async getProducts(params?: {
    limit?: number;
    after?: string;
  }): Promise<FacebookApiResponse<FacebookProduct[]>> {
    const catalogId = this.catalogId;
    if (!catalogId) {
      throw new Error('Catalog ID is required');
    }

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.after) queryParams.set('after', params.after);
    queryParams.set('fields', 'id,name,description,price,currency,availability,condition,image_url,inventory');

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

    return this.request<FacebookProduct[]>(`/${catalogId}/products${query}`);
  }

  /**
   * 商品詳細を取得
   */
  async getProduct(productId: string): Promise<FacebookProduct> {
    const response = await this.request<FacebookProduct>(
      `/${productId}?fields=id,name,description,price,currency,availability,condition,image_url,additional_image_urls,category,brand,retailer_id,inventory,visibility`
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data!;
  }

  /**
   * 商品を作成
   */
  async createProduct(data: CreateProductRequest): Promise<FacebookProduct> {
    const catalogId = this.catalogId;
    if (!catalogId) {
      throw new Error('Catalog ID is required');
    }

    const response = await this.request<FacebookProduct>(
      `/${catalogId}/products`,
      'POST',
      data
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data!;
  }

  /**
   * 商品を更新
   */
  async updateProduct(
    productId: string,
    data: Partial<CreateProductRequest>
  ): Promise<FacebookProduct> {
    const response = await this.request<FacebookProduct>(
      `/${productId}`,
      'POST',
      data
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data!;
  }

  /**
   * 商品を削除
   */
  async deleteProduct(productId: string): Promise<void> {
    const response = await this.request<{ success: boolean }>(
      `/${productId}`,
      'DELETE'
    );

    if (response.error) {
      throw new Error(response.error.message);
    }
  }

  /**
   * 在庫を更新
   */
  async updateInventory(productId: string, inventory: number): Promise<FacebookProduct> {
    return this.updateProduct(productId, { inventory });
  }

  /**
   * 価格を更新
   */
  async updatePrice(productId: string, price: number, currency: string): Promise<FacebookProduct> {
    return this.updateProduct(productId, { price, currency });
  }

  /**
   * 注文一覧を取得
   */
  async getOrders(params?: {
    state?: string;
    limit?: number;
  }): Promise<FacebookApiResponse<FacebookOrder[]>> {
    const catalogId = this.catalogId;
    if (!catalogId) {
      throw new Error('Catalog ID is required');
    }

    const queryParams = new URLSearchParams();
    if (params?.state) queryParams.set('state', params.state);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    queryParams.set('fields', 'id,order_status,created,last_updated,buyer_info,ship_to,items,estimated_payment_details');

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

    return this.request<FacebookOrder[]>(`/${catalogId}/orders${query}`);
  }

  /**
   * 注文詳細を取得
   */
  async getOrder(orderId: string): Promise<FacebookOrder> {
    const response = await this.request<FacebookOrder>(
      `/${orderId}?fields=id,order_status,created,last_updated,buyer_info,ship_to,items,estimated_payment_details`
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data!;
  }

  /**
   * 商品フィードを作成
   */
  async createProductFeed(
    catalogId: string,
    name: string,
    fileUrl: string
  ): Promise<FacebookProductFeed> {
    const response = await this.request<FacebookProductFeed>(
      `/${catalogId}/product_feeds`,
      'POST',
      { name, file_url: fileUrl }
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data!;
  }

  /**
   * インサイトを取得
   */
  async getInsights(
    productId: string,
    dateStart: string,
    dateStop: string
  ): Promise<FacebookInsights> {
    const response = await this.request<FacebookInsights>(
      `/${productId}/insights?date_start=${dateStart}&date_stop=${dateStop}`
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data!;
  }

  /**
   * 商品セットを作成
   */
  async createProductSet(
    catalogId: string,
    name: string,
    filter: string
  ): Promise<FacebookProductSet> {
    const response = await this.request<FacebookProductSet>(
      `/${catalogId}/product_sets`,
      'POST',
      { name, filter }
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data!;
  }
}

export default FacebookMarketplaceApiClient;
