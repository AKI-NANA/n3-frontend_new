/**
 * Amazon Selling Partner API (SP-API) クライアント
 *
 * Amazon SP-APIを使用した出品管理
 * - LWA (Login with Amazon) 認証
 * - Listings Items API
 * - Feeds API
 */

import { BaseApiClient, ApiResponse } from './BaseApiClient';
import type { ListingPayload, ApiCredentials } from '@/types/listing';
import crypto from 'crypto';

export class AmazonSPClient extends BaseApiClient {
  private credentials: ApiCredentials['amazon'];
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(credentials: ApiCredentials['amazon']) {
    super('amazon');

    if (!credentials) {
      throw new Error('Amazon credentials are required');
    }

    this.credentials = credentials;
  }

  /**
   * エンドポイントURLを取得
   */
  private getEndpoint(): string {
    switch (this.credentials!.region) {
      case 'us':
        return 'https://sellingpartnerapi-na.amazon.com';
      case 'eu':
        return 'https://sellingpartnerapi-eu.amazon.com';
      case 'fe':
        return 'https://sellingpartnerapi-fe.amazon.com';
      default:
        return 'https://sellingpartnerapi-na.amazon.com';
    }
  }

  /**
   * LWAトークンを取得（OAuth）
   */
  private async getAccessToken(): Promise<string> {
    // トークンが有効な場合は再利用
    if (
      this.accessToken &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date()
    ) {
      return this.accessToken;
    }

    this.log('info', 'Fetching new LWA access token');

    try {
      const response = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials!.refreshToken,
          client_id: this.credentials!.clientId,
          client_secret: this.credentials!.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`LWA token request failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      this.log('info', 'LWA access token obtained');
      return this.accessToken;
    } catch (error) {
      this.log('error', 'Failed to get LWA access token', error);
      throw error;
    }
  }

  /**
   * SP-API リクエストのヘッダーを構築
   */
  private async buildHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.getAccessToken();

    return {
      'Content-Type': 'application/json',
      'x-amz-access-token': accessToken,
      'x-amz-date': new Date().toISOString(),
    };
  }

  /**
   * SP-API コール
   */
  private async callApi(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const endpoint = this.getEndpoint();
    const url = `${endpoint}${path}`;
    const headers = await this.buildHeaders();

    this.log('info', `Calling ${method} ${path}`, { body });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        this.log('error', `API call failed: ${response.status}`, data);
        throw new Error(
          data.errors?.[0]?.message || `API call failed: ${response.statusText}`
        );
      }

      this.log('info', `API call success: ${method} ${path}`, data);
      return data;
    } catch (error) {
      this.log('error', `API call exception: ${method} ${path}`, error);
      throw error;
    }
  }

  /**
   * 出品データの検証
   * Amazon SP-APIには事前検証APIがないため、データ形式のみ検証
   */
  async verifyListing(payload: ListingPayload): Promise<ApiResponse> {
    // 必須フィールドの検証
    if (!payload.sku || !payload.title || !payload.price) {
      return {
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'SKU, title, and price are required',
          type: 'fatal',
        },
      };
    }

    return { success: true };
  }

  /**
   * 出品実行（Listings Items API）
   */
  async addListing(payload: ListingPayload): Promise<ApiResponse<string>> {
    try {
      const sellerId = this.credentials!.sellerId;
      const marketplaceId = this.credentials!.marketplaceId;

      // Listings Items API を使用
      const path = `/listings/2021-08-01/items/${sellerId}/${payload.sku}`;

      const body = {
        productType: 'PRODUCT', // TODO: カテゴリに応じて動的に設定
        requirements: 'LISTING',
        attributes: {
          condition_type: [
            {
              value: payload.condition.toUpperCase(),
              marketplace_id: marketplaceId,
            },
          ],
          item_name: [
            {
              value: payload.title,
              language_tag: 'en_US',
              marketplace_id: marketplaceId,
            },
          ],
          list_price: [
            {
              value: {
                Amount: payload.price,
                CurrencyCode: payload.currency,
              },
              marketplace_id: marketplaceId,
            },
          ],
          quantity: [
            {
              value: payload.quantity,
              marketplace_id: marketplaceId,
            },
          ],
          main_product_image_locator: payload.images[0]
            ? [
                {
                  value: {
                    media_location: payload.images[0],
                  },
                  marketplace_id: marketplaceId,
                },
              ]
            : undefined,
          product_description: payload.description
            ? [
                {
                  value: payload.description,
                  language_tag: 'en_US',
                  marketplace_id: marketplaceId,
                },
              ]
            : undefined,
        },
      };

      const response = await this.retryRequest(() =>
        this.callApi('PUT', path, body)
      );

      // SP-APIはSKUをそのまま返す
      this.log('info', `AddListing success: SKU=${payload.sku}`);

      return {
        success: true,
        data: payload.sku, // AmazonではSKUがリスティングIDとして機能
      };
    } catch (error) {
      this.log('error', 'AddListing exception', error);
      return {
        success: false,
        error: {
          code: 'ADD_FAILED',
          message: error instanceof Error ? error.message : String(error),
          type: this.classifyError(
            'ADD_FAILED',
            error instanceof Error ? error.message : String(error)
          ),
        },
      };
    }
  }

  /**
   * 出品更新
   */
  async updateListing(
    listingId: string,
    payload: Partial<ListingPayload>
  ): Promise<ApiResponse> {
    try {
      const sellerId = this.credentials!.sellerId;
      const marketplaceId = this.credentials!.marketplaceId;

      const path = `/listings/2021-08-01/items/${sellerId}/${listingId}`;

      const attributes: any = {};

      if (payload.title) {
        attributes.item_name = [
          {
            value: payload.title,
            language_tag: 'en_US',
            marketplace_id: marketplaceId,
          },
        ];
      }

      if (payload.price) {
        attributes.list_price = [
          {
            value: {
              Amount: payload.price,
              CurrencyCode: payload.currency || 'USD',
            },
            marketplace_id: marketplaceId,
          },
        ];
      }

      if (payload.quantity !== undefined) {
        attributes.quantity = [
          {
            value: payload.quantity,
            marketplace_id: marketplaceId,
          },
        ];
      }

      const body = {
        productType: 'PRODUCT',
        patches: [
          {
            op: 'replace',
            path: '/attributes',
            value: [attributes],
          },
        ],
      };

      await this.retryRequest(() => this.callApi('PATCH', path, body));

      return { success: true };
    } catch (error) {
      this.log('error', 'UpdateListing exception', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }

  /**
   * 出品削除
   */
  async deleteListing(listingId: string): Promise<ApiResponse> {
    try {
      const sellerId = this.credentials!.sellerId;
      const marketplaceId = this.credentials!.marketplaceId;

      const path = `/listings/2021-08-01/items/${sellerId}/${listingId}?marketplaceIds=${marketplaceId}`;

      await this.retryRequest(() => this.callApi('DELETE', path));

      return { success: true };
    } catch (error) {
      this.log('error', 'DeleteListing exception', error);
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }

  /**
   * 在庫数更新
   */
  async updateQuantity(
    listingId: string,
    quantity: number
  ): Promise<ApiResponse> {
    return this.updateListing(listingId, { quantity } as Partial<ListingPayload>);
  }

  /**
   * 価格更新
   */
  async updatePrice(listingId: string, price: number): Promise<ApiResponse> {
    return this.updateListing(listingId, {
      price,
      currency: 'USD',
    } as Partial<ListingPayload>);
  }
}
