/**
 * eBay Selling API クライアント
 * ✅ I3-5: OAuth自動更新対応
 *
 * 機能:
 * - 出品管理 (Inventory API)
 * - 価格・在庫更新
 * - オファー管理
 * - 自動トークン更新
 */

import { oauthManager } from './oauth-manager';

export interface EbaySavingAPIConfig {
  marketplace: 'ebay-us' | 'ebay-jp';
  accountId: string;
  siteId: number; // 0: US, 15: Japan
}

export class EbaySellingAPIClient {
  private config: EbaySavingAPIConfig;
  private endpoint: string;

  constructor(config: EbaySavingAPIConfig) {
    this.config = config;
    this.endpoint = process.env.EBAY_API_ENDPOINT || 'https://api.ebay.com';
  }

  /**
   * 認証ヘッダーを生成
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const accessToken = await oauthManager.getAccessToken(
      this.config.marketplace,
      this.config.accountId
    );

    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': this.config.marketplace === 'ebay-jp' ? 'EBAY_JP' : 'EBAY_US',
    };
  }

  /**
   * 在庫アイテムを作成・更新
   */
  async createOrUpdateInventoryItem(params: {
    sku: string;
    title: string;
    description: string;
    imageUrls: string[];
    category?: string;
    brand?: string;
    condition?: 'NEW' | 'USED_EXCELLENT' | 'USED_GOOD';
    conditionDescription?: string;
  }): Promise<{ success: boolean; sku: string; error?: string }> {
    try {
      const url = `${this.endpoint}/sell/inventory/v1/inventory_item/${params.sku}`;

      const body = {
        product: {
          title: params.title,
          description: params.description,
          imageUrls: params.imageUrls,
          aspects: {
            Brand: [params.brand || 'Unbranded'],
          },
        },
        condition: params.condition || 'NEW',
        conditionDescription: params.conditionDescription,
        availability: {
          shipToLocationAvailability: {
            quantity: 1, // デフォルト在庫数（後でupdateInventoryで更新）
          },
        },
      };

      const headers = await this.getAuthHeaders();

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.text();
        throw new Error(`eBay API Error: ${response.status} - ${error}`);
      }

      console.log(`[eBay Selling API] 在庫アイテム作成/更新成功: ${params.sku}`);

      return {
        success: true,
        sku: params.sku,
      };
    } catch (error: any) {
      console.error('[eBay Selling API] 在庫アイテム作成エラー:', error);
      return {
        success: false,
        sku: params.sku,
        error: error.message,
      };
    }
  }

  /**
   * オファーを作成・更新（価格設定）
   */
  async createOrUpdateOffer(params: {
    sku: string;
    offerId?: string;
    price: number;
    quantity: number;
    categoryId?: string;
    format?: 'FIXED_PRICE' | 'AUCTION';
    duration?: 'GTC' | 'DAYS_7' | 'DAYS_30';
  }): Promise<{ success: boolean; offerId?: string; error?: string }> {
    try {
      const method = params.offerId ? 'PUT' : 'POST';
      const url = params.offerId
        ? `${this.endpoint}/sell/inventory/v1/offer/${params.offerId}`
        : `${this.endpoint}/sell/inventory/v1/offer`;

      const body = {
        sku: params.sku,
        marketplaceId: this.config.marketplace === 'ebay-jp' ? 'EBAY_JP' : 'EBAY_US',
        format: params.format || 'FIXED_PRICE',
        availableQuantity: params.quantity,
        categoryId: params.categoryId || '1',
        listingDuration: params.duration || 'GTC',
        pricingSummary: {
          price: {
            currency: this.config.marketplace === 'ebay-jp' ? 'JPY' : 'USD',
            value: params.price.toFixed(2),
          },
        },
        listingPolicies: {
          fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
          paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
          returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
        },
      };

      const headers = await this.getAuthHeaders();

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`eBay API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      console.log(`[eBay Selling API] オファー作成/更新成功: ${params.sku} - ${params.price}`);

      return {
        success: true,
        offerId: data.offerId,
      };
    } catch (error: any) {
      console.error('[eBay Selling API] オファー作成エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * オファーを公開（出品）
   */
  async publishOffer(offerId: string): Promise<{ success: boolean; listingId?: string; error?: string }> {
    try {
      const url = `${this.endpoint}/sell/inventory/v1/offer/${offerId}/publish`;

      const headers = await this.getAuthHeaders();

      const response = await fetch(url, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`eBay API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      console.log(`[eBay Selling API] オファー公開成功: ${offerId} -> ${data.listingId}`);

      return {
        success: true,
        listingId: data.listingId,
      };
    } catch (error: any) {
      console.error('[eBay Selling API] オファー公開エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 在庫数を更新
   */
  async updateInventory(sku: string, quantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.endpoint}/sell/inventory/v1/inventory_item/${sku}`;

      const body = {
        availability: {
          shipToLocationAvailability: {
            quantity,
          },
        },
      };

      const headers = await this.getAuthHeaders();

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.text();
        throw new Error(`eBay API Error: ${response.status} - ${error}`);
      }

      console.log(`[eBay Selling API] 在庫更新成功: ${sku} - ${quantity}個`);

      return { success: true };
    } catch (error: any) {
      console.error('[eBay Selling API] 在庫更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 価格を更新
   */
  async updatePrice(offerId: string, price: number): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.endpoint}/sell/inventory/v1/offer/${offerId}/update_quantity_and_price`;

      const body = {
        requests: [{
          offerId,
          price: {
            currency: this.config.marketplace === 'ebay-jp' ? 'JPY' : 'USD',
            value: price.toFixed(2),
          },
        }],
      };

      const headers = await this.getAuthHeaders();

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`eBay API Error: ${response.status} - ${error}`);
      }

      console.log(`[eBay Selling API] 価格更新成功: ${offerId} - ${price}`);

      return { success: true };
    } catch (error: any) {
      console.error('[eBay Selling API] 価格更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * オファー一覧を取得
   */
  async getOffers(params: {
    sku?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams({
        ...(params.sku && { sku: params.sku }),
        limit: (params.limit || 100).toString(),
        offset: (params.offset || 0).toString(),
      });

      const url = `${this.endpoint}/sell/inventory/v1/offer?${queryParams.toString()}`;

      const headers = await this.getAuthHeaders();

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`eBay API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.offers || [];
    } catch (error: any) {
      console.error('[eBay Selling API] オファー取得エラー:', error);
      throw error;
    }
  }

  /**
   * 出品を一括で作成
   */
  async bulkCreateAndPublish(params: {
    sku: string;
    title: string;
    description: string;
    imageUrls: string[];
    price: number;
    quantity: number;
    categoryId?: string;
  }): Promise<{ success: boolean; listingId?: string; error?: string }> {
    try {
      // 1. 在庫アイテムを作成
      const itemResult = await this.createOrUpdateInventoryItem({
        sku: params.sku,
        title: params.title,
        description: params.description,
        imageUrls: params.imageUrls,
      });

      if (!itemResult.success) {
        return itemResult;
      }

      // 2. オファーを作成
      const offerResult = await this.createOrUpdateOffer({
        sku: params.sku,
        price: params.price,
        quantity: params.quantity,
        categoryId: params.categoryId,
      });

      if (!offerResult.success) {
        return { success: false, error: offerResult.error };
      }

      // 3. オファーを公開
      const publishResult = await this.publishOffer(offerResult.offerId!);

      return publishResult;
    } catch (error: any) {
      console.error('[eBay Selling API] 一括出品エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
