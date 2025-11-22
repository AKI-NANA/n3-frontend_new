/**
 * Amazon SP-API クライアント
 * ✅ I3-5: OAuth自動更新対応
 *
 * 機能:
 * - 出品管理 (Listings Items API)
 * - 在庫管理 (FBA Inventory API)
 * - 注文管理 (Orders API)
 * - 自動トークン更新
 */

import { oauthManager } from './oauth-manager';
import crypto from 'crypto';

export interface AmazonSPAPIConfig {
  marketplace: 'amazon-jp' | 'amazon-us' | 'amazon-global';
  accountId: string;
  sellerId: string;
  region: 'us-east-1' | 'eu-west-1' | 'us-west-2' | 'fe';
}

export class AmazonSPAPIClient {
  private config: AmazonSPAPIConfig;
  private endpoint: string;

  constructor(config: AmazonSPAPIConfig) {
    this.config = config;

    // リージョンごとのエンドポイント
    const endpoints: Record<string, string> = {
      'us-east-1': 'https://sellingpartnerapi-na.amazon.com',
      'eu-west-1': 'https://sellingpartnerapi-eu.amazon.com',
      'fe': 'https://sellingpartnerapi-fe.amazon.com',
      'us-west-2': 'https://sellingpartnerapi-na.amazon.com',
    };

    this.endpoint = endpoints[this.config.region];
  }

  /**
   * 認証ヘッダーを生成
   */
  private async getAuthHeaders(method: string, path: string, body?: string): Promise<Record<string, string>> {
    const accessToken = await oauthManager.getAccessToken(
      this.config.marketplace,
      this.config.accountId
    );

    return {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 商品を出品・更新
   */
  async updateListing(params: {
    sku: string;
    asin?: string;
    title: string;
    description: string;
    price: number;
    quantity: number;
    imageUrls: string[];
    category?: string;
    brand?: string;
    condition?: 'New' | 'Used' | 'Refurbished';
  }): Promise<{ success: boolean; sku: string; status?: string; error?: string }> {
    try {
      const path = `/listings/2021-08-01/items/${this.config.sellerId}/${params.sku}`;
      const url = `${this.endpoint}${path}`;

      const body = {
        productType: 'PRODUCT',
        requirements: 'LISTING',
        attributes: {
          condition_type: [{ value: params.condition || 'New', marketplace_id: 'ATVPDKIKX0DER' }],
          item_name: [{ value: params.title, language_tag: 'ja_JP' }],
          description: [{ value: params.description, language_tag: 'ja_JP' }],
          brand: [{ value: params.brand || 'Generic' }],
          main_product_image_locator: [{ value: params.imageUrls[0] }],
          other_product_image_locator: params.imageUrls.slice(1, 9).map(url => ({
            media_location: url,
            value: url,
          })),
          list_price: [{
            currency: 'JPY',
            value: params.price,
          }],
          fulfillment_availability: [{
            fulfillment_channel_code: 'DEFAULT',
            quantity: params.quantity,
          }],
        },
      };

      const headers = await this.getAuthHeaders('PUT', path, JSON.stringify(body));

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Amazon SP-API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      console.log(`[Amazon SP-API] 出品更新成功: ${params.sku}`);

      return {
        success: true,
        sku: params.sku,
        status: data.status,
      };
    } catch (error: any) {
      console.error('[Amazon SP-API] 出品更新エラー:', error);
      return {
        success: false,
        sku: params.sku,
        error: error.message,
      };
    }
  }

  /**
   * 在庫数を更新
   */
  async updateInventory(sku: string, quantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      const path = `/fba/inventory/v1/items/inventory`;
      const url = `${this.endpoint}${path}`;

      const body = {
        sellerSku: sku,
        quantity,
      };

      const headers = await this.getAuthHeaders('POST', path, JSON.stringify(body));

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Amazon SP-API Error: ${response.status} - ${error}`);
      }

      console.log(`[Amazon SP-API] 在庫更新成功: ${sku} - ${quantity}個`);

      return { success: true };
    } catch (error: any) {
      console.error('[Amazon SP-API] 在庫更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 価格を更新
   */
  async updatePrice(sku: string, price: number): Promise<{ success: boolean; error?: string }> {
    try {
      const path = `/listings/2021-08-01/items/${this.config.sellerId}/${sku}`;
      const url = `${this.endpoint}${path}`;

      const body = {
        productType: 'PRODUCT',
        patches: [
          {
            op: 'replace',
            path: '/attributes/list_price',
            value: [{
              currency: 'JPY',
              value: price,
            }],
          },
        ],
      };

      const headers = await this.getAuthHeaders('PATCH', path, JSON.stringify(body));

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Amazon SP-API Error: ${response.status} - ${error}`);
      }

      console.log(`[Amazon SP-API] 価格更新成功: ${sku} - ¥${price}`);

      return { success: true };
    } catch (error: any) {
      console.error('[Amazon SP-API] 価格更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 注文一覧を取得
   */
  async getOrders(params: {
    createdAfter?: string;
    createdBefore?: string;
    orderStatuses?: string[];
    maxResults?: number;
  } = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams({
        MarketplaceIds: 'A1VC38T7YXB528', // Amazon JP
        CreatedAfter: params.createdAfter || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        ...(params.createdBefore && { CreatedBefore: params.createdBefore }),
        ...(params.maxResults && { MaxResultsPerPage: params.maxResults.toString() }),
      });

      if (params.orderStatuses && params.orderStatuses.length > 0) {
        params.orderStatuses.forEach(status => queryParams.append('OrderStatuses', status));
      }

      const path = `/orders/v0/orders?${queryParams.toString()}`;
      const url = `${this.endpoint}${path}`;

      const headers = await this.getAuthHeaders('GET', path);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Amazon SP-API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.payload.Orders || [];
    } catch (error: any) {
      console.error('[Amazon SP-API] 注文取得エラー:', error);
      throw error;
    }
  }
}
