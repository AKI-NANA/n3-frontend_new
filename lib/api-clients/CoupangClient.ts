/**
 * Coupang Wing API クライアント
 * OAuth 2.0 方式を使用
 */

import { ApiClientConfig, ApiCallResult } from '@/types/api-credentials';
import { createHmac } from 'crypto';

/**
 * Coupang出品データ
 */
export interface CoupangListingData {
  sku: string;
  title_ko: string;          // 韓国語タイトル（必須）
  description_ko: string;     // 韓国語商品説明（必須）
  brand: string;
  category_id: string;
  price: number;
  quantity: number;
  images: string[];
  manufacturer?: string;
  origin_country?: string;
  item_attributes?: Record<string, string>;
}

/**
 * Coupang API レスポンス
 */
interface CoupangResponse {
  code: string;
  message: string;
  data?: {
    sellerProductId: string;
    statusCode: string;
  };
}

export class CoupangClient {
  private config: ApiClientConfig;
  private apiBaseUrl: string;
  private vendorId: string;

  constructor(config: ApiClientConfig, vendorId: string) {
    this.config = config;
    this.vendorId = vendorId;
    this.apiBaseUrl = config.sandbox
      ? 'https://api-sandbox.coupang.com'
      : 'https://api-gateway.coupang.com';
  }

  /**
   * 新規出品（CreateItem）
   */
  async createItem(listingData: CoupangListingData): Promise<ApiCallResult<string>> {
    // 韓国語タイトルと説明の存在チェック
    if (!listingData.title_ko || !listingData.description_ko) {
      return {
        success: false,
        error: {
          code: 'MISSING_KOREAN_TEXT',
          message: 'Korean title and description are required for Coupang listings',
        },
        retryable: false,
      };
    }

    const endpoint = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`;
    const body = this.buildCreateItemPayload(listingData);

    const response = await this.callApi('POST', endpoint, body);

    if (!response.success || !response.data) {
      return response;
    }

    const data: CoupangResponse = response.data;

    if (data.code === 'SUCCESS' && data.data?.sellerProductId) {
      return {
        success: true,
        data: data.data.sellerProductId,
      };
    }

    return {
      success: false,
      error: {
        code: data.code,
        message: data.message || 'Item creation failed',
      },
      retryable: this.isRetryableError(data.code),
    };
  }

  /**
   * 在庫・価格の更新
   */
  async updateInventory(
    sellerProductId: string,
    price: number,
    quantity: number
  ): Promise<ApiCallResult<string>> {
    const endpoint = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}`;
    const body = {
      items: [
        {
          itemId: sellerProductId,
          originalPrice: price,
          salePrice: price,
          maximumBuyCount: quantity,
          outboundShippingTimeDay: 3,
        },
      ],
    };

    const response = await this.callApi('PUT', endpoint, body);

    if (!response.success) {
      return response;
    }

    return {
      success: true,
      data: sellerProductId,
    };
  }

  /**
   * CreateItem Payload構築
   */
  private buildCreateItemPayload(data: CoupangListingData): any {
    return {
      sellerProductName: data.title_ko,
      displayCategoryCode: data.category_id,
      brand: data.brand,
      manufacture: data.manufacturer || data.brand,
      productDescription: data.description_ko,
      items: [
        {
          itemName: data.title_ko,
          originalPrice: data.price,
          salePrice: data.price,
          maximumBuyCount: data.quantity,
          outboundShippingTimeDay: 3,
          maximumBuyForPerson: 10,
          usedProduct: false,
          taxType: 'TAX',
          images: data.images.map((url, index) => ({
            imageOrder: index + 1,
            imageType: index === 0 ? 'REPRESENTATION' : 'DETAIL',
            vendorPath: url,
          })),
          notices: [
            {
              noticeCategoryName: '상품상세참조',
              noticeCategoryDetailName: '상품상세참조',
            },
          ],
          certifications: [],
          searchTags: [],
          items: [],
        },
      ],
    };
  }

  /**
   * Coupang Wing APIを呼び出し
   */
  private async callApi(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiCallResult<any>> {
    try {
      const url = `${this.apiBaseUrl}${endpoint}`;
      const headers = this.getHeaders(method, endpoint, body);

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
            code: responseData.code || 'HTTP_ERROR',
            message: responseData.message || response.statusText,
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

  /**
   * HMAC署名付きヘッダーを生成
   */
  private getHeaders(method: string, path: string, body?: any): Record<string, string> {
    const timestamp = Date.now().toString();
    const message = `${timestamp}${method}${path}${body ? JSON.stringify(body) : ''}`;

    const signature = createHmac('sha256', this.config.credentials.api_secret!)
      .update(message)
      .digest('hex');

    return {
      'Content-Type': 'application/json;charset=UTF-8',
      Authorization: `Bearer ${this.config.credentials.access_token}`,
      'X-COUPANG-VENDORID': this.vendorId,
      'X-COUPANG-TIMESTAMP': timestamp,
      'X-COUPANG-SIGNATURE': signature,
    };
  }

  /**
   * リトライ可能なエラーか判定
   */
  private isRetryableError(errorCode?: string): boolean {
    if (!errorCode) return false;

    const retryableErrors = ['SYSTEM_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];

    return retryableErrors.includes(errorCode);
  }
}
