/**
 * Shopify Admin API クライアント
 * Private App Token 方式を使用
 */

import { ApiClientConfig, ApiCallResult } from '@/types/api-credentials';

/**
 * Shopify出品データ
 */
export interface ShopifyListingData {
  sku: string;
  title: string;
  description: string;
  vendor: string;
  product_type: string;
  price: number;
  compare_at_price?: number;
  quantity: number;
  images: string[];
  tags?: string[];
  options?: Array<{
    name: string;
    values: string[];
  }>;
  weight?: number;
  weight_unit?: 'kg' | 'lb';
}

/**
 * Shopify Product レスポンス
 */
interface ShopifyProductResponse {
  product?: {
    id: number;
    title: string;
    variants: Array<{
      id: number;
      sku: string;
      inventory_item_id: number;
    }>;
  };
  errors?: Record<string, string[]>;
}

export class ShopifyClient {
  private config: ApiClientConfig;
  private shopDomain: string;
  private apiVersion: string = '2024-01';

  constructor(config: ApiClientConfig, shopDomain: string) {
    this.config = config;
    this.shopDomain = shopDomain;
  }

  /**
   * 新規商品作成
   */
  async createProduct(listingData: ShopifyListingData): Promise<ApiCallResult<string>> {
    const endpoint = `/admin/api/${this.apiVersion}/products.json`;
    const body = this.buildProductPayload(listingData);

    const response = await this.callApi('POST', endpoint, body);

    if (!response.success || !response.data) {
      return response;
    }

    const data: ShopifyProductResponse = response.data;

    if (data.product) {
      // 在庫数を設定
      if (data.product.variants[0]?.inventory_item_id) {
        await this.setInventoryLevel(
          data.product.variants[0].inventory_item_id,
          listingData.quantity
        );
      }

      return {
        success: true,
        data: data.product.id.toString(),
      };
    }

    return {
      success: false,
      error: {
        code: 'PRODUCT_CREATION_FAILED',
        message: JSON.stringify(data.errors || 'Unknown error'),
      },
      retryable: false,
    };
  }

  /**
   * 商品情報の更新
   */
  async updateProduct(
    productId: string,
    updates: Partial<ShopifyListingData>
  ): Promise<ApiCallResult<string>> {
    const endpoint = `/admin/api/${this.apiVersion}/products/${productId}.json`;
    const body = {
      product: {
        id: parseInt(productId),
        title: updates.title,
        body_html: updates.description,
        variants: updates.price
          ? [
              {
                price: updates.price.toFixed(2),
              },
            ]
          : undefined,
      },
    };

    const response = await this.callApi('PUT', endpoint, body);

    if (!response.success) {
      return response;
    }

    return {
      success: true,
      data: productId,
    };
  }

  /**
   * 在庫レベルの設定
   */
  async setInventoryLevel(
    inventoryItemId: number,
    quantity: number
  ): Promise<ApiCallResult<void>> {
    // まずロケーションIDを取得
    const locationsResponse = await this.callApi(
      'GET',
      `/admin/api/${this.apiVersion}/locations.json`,
      undefined
    );

    if (!locationsResponse.success || !locationsResponse.data?.locations?.[0]) {
      return {
        success: false,
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'No location found for inventory update',
        },
      };
    }

    const locationId = locationsResponse.data.locations[0].id;

    // 在庫レベルを設定
    const endpoint = `/admin/api/${this.apiVersion}/inventory_levels/set.json`;
    const body = {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available: quantity,
    };

    const response = await this.callApi('POST', endpoint, body);

    if (!response.success) {
      return response;
    }

    return {
      success: true,
    };
  }

  /**
   * Product Payload構築
   */
  private buildProductPayload(data: ShopifyListingData): any {
    return {
      product: {
        title: data.title,
        body_html: data.description,
        vendor: data.vendor,
        product_type: data.product_type,
        tags: data.tags?.join(', '),
        variants: [
          {
            sku: data.sku,
            price: data.price.toFixed(2),
            compare_at_price: data.compare_at_price
              ? data.compare_at_price.toFixed(2)
              : undefined,
            inventory_management: 'shopify',
            inventory_policy: 'deny',
            weight: data.weight,
            weight_unit: data.weight_unit || 'kg',
          },
        ],
        images: data.images.map((url, index) => ({
          src: url,
          position: index + 1,
        })),
        options: data.options || [
          {
            name: 'Title',
            values: ['Default Title'],
          },
        ],
      },
    };
  }

  /**
   * Shopify Admin APIを呼び出し
   */
  private async callApi(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiCallResult<any>> {
    try {
      const url = `https://${this.shopDomain}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.config.credentials.api_key!,
      };

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'HTTP_ERROR',
            message: responseData.errors || response.statusText,
            details: responseData,
          },
          status: response.status,
          retryable: response.status >= 500 || response.status === 429,
        };
      }

      return {
        success: true,
        data: responseData,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        retryable: true,
      };
    }
  }
}
