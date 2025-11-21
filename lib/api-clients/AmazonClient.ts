/**
 * Amazon SP-API クライアント
 * OAuth 2.0 方式を使用
 */

import { ApiClientConfig, ApiCallResult } from '@/types/api-credentials';
import { createHmac } from 'crypto';

/**
 * Amazon出品データ
 */
export interface AmazonListingData {
  sku: string;
  asin?: string;
  product_type: string;
  title: string;
  description: string;
  brand: string;
  price: number;
  quantity: number;
  condition: 'NewItem' | 'UsedLikeNew' | 'UsedVeryGood' | 'UsedGood';
  images: string[];
  bullet_points?: string[];
  item_dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'inches' | 'centimeters';
  };
  package_weight?: {
    value: number;
    unit: 'pounds' | 'kilograms';
  };
}

/**
 * Amazon Listings API レスポンス
 */
interface AmazonListingResponse {
  sku: string;
  status: string;
  submissionId?: string;
  issues?: Array<{
    code: string;
    message: string;
    severity: 'ERROR' | 'WARNING';
  }>;
}

export class AmazonClient {
  private config: ApiClientConfig;
  private marketplaceId: string;
  private apiBaseUrl: string;
  private region: string;

  constructor(config: ApiClientConfig, marketplaceId: string = 'ATVPDKIKX0DER') {
    this.config = config;
    this.marketplaceId = marketplaceId; // デフォルト: US
    this.region = config.sandbox ? 'us-east-1' : 'us-east-1';
    this.apiBaseUrl = config.sandbox
      ? 'https://sandbox.sellingpartnerapi-na.amazon.com'
      : 'https://sellingpartnerapi-na.amazon.com';
  }

  /**
   * 新規出品（Listings Item API）
   */
  async createListing(listingData: AmazonListingData): Promise<ApiCallResult<string>> {
    // ASINがない場合は出品をスキップ
    if (!listingData.asin) {
      return {
        success: false,
        error: {
          code: 'MISSING_ASIN',
          message: 'ASIN is required for Amazon listings',
        },
        retryable: false,
      };
    }

    const endpoint = `/listings/2021-08-01/items/${encodeURIComponent(listingData.sku)}`;
    const body = this.buildListingPayload(listingData);

    const response = await this.callApi('PUT', endpoint, body);

    if (!response.success || !response.data) {
      return response;
    }

    const data: AmazonListingResponse = response.data;

    if (data.status === 'ACCEPTED') {
      return {
        success: true,
        data: data.sku,
      };
    }

    // エラー処理
    const errors = data.issues?.filter((i) => i.severity === 'ERROR') || [];
    const errorMessages = errors.map((e) => `[${e.code}] ${e.message}`).join('; ');

    return {
      success: false,
      error: {
        code: errors[0]?.code || 'UNKNOWN',
        message: errorMessages || 'Listing submission failed',
        details: data.issues,
      },
      retryable: this.isRetryableError(errors[0]?.code),
    };
  }

  /**
   * 価格・在庫の更新
   */
  async updatePriceAndQuantity(
    sku: string,
    price: number,
    quantity: number
  ): Promise<ApiCallResult<string>> {
    const endpoint = `/listings/2021-08-01/items/${encodeURIComponent(sku)}`;
    const body = {
      productType: 'PRODUCT',
      patches: [
        {
          op: 'replace',
          path: '/attributes/fulfillment_availability',
          value: [
            {
              fulfillment_channel_code: 'DEFAULT',
              quantity: quantity,
            },
          ],
        },
        {
          op: 'replace',
          path: '/attributes/purchasable_offer',
          value: [
            {
              currency: 'USD',
              our_price: [
                {
                  schedule: [
                    {
                      value_with_tax: price,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await this.callApi('PATCH', endpoint, body);

    if (!response.success) {
      return response;
    }

    return {
      success: true,
      data: sku,
    };
  }

  /**
   * バリエーション商品の出品（親子関係）
   * 1. 親SKUを作成
   * 2. 子SKUを順次作成して親に紐付け
   */
  async createParentChildListings(variationData: any): Promise<ApiCallResult<string>> {
    try {
      // 1. 親SKUの作成
      const parentPayload = {
        productType: variationData.product_type,
        requirements: 'LISTING',
        attributes: variationData.attributes,
      };

      const parentEndpoint = `/listings/2021-08-01/items/${encodeURIComponent(
        variationData.parent_sku
      )}`;
      const parentResponse = await this.callApi('PUT', parentEndpoint, parentPayload);

      if (!parentResponse.success) {
        return {
          success: false,
          error: {
            code: 'PARENT_CREATION_FAILED',
            message: '親SKUの作成に失敗しました',
          },
          retryable: false,
        };
      }

      // 2. 子SKUの順次作成
      for (const child of variationData.children) {
        const childPayload = {
          productType: variationData.product_type,
          requirements: 'LISTING_OFFER_ONLY',
          attributes: {
            ...child.attributes,
            parent_sku: [
              {
                value: variationData.parent_sku,
                marketplace_id: this.marketplaceId,
              },
            ],
          },
          offers: child.offers,
        };

        const childEndpoint = `/listings/2021-08-01/items/${encodeURIComponent(child.sku)}`;
        const childResponse = await this.callApi('PUT', childEndpoint, childPayload);

        if (!childResponse.success) {
          console.error(`❌ 子SKU作成失敗: ${child.sku}`, childResponse.error);
          // 子SKUの失敗は警告として記録し、処理を継続
        }

        // レート制限対策
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      return {
        success: true,
        data: variationData.parent_sku,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VARIATION_CREATION_ERROR',
          message: error instanceof Error ? error.message : 'バリエーション作成中にエラーが発生しました',
        },
        retryable: false,
      };
    }
  }

  /**
   * Listing Payload構築
   */
  private buildListingPayload(data: AmazonListingData): any {
    return {
      productType: data.product_type,
      requirements: 'LISTING',
      attributes: {
        condition_type: [
          {
            value: data.condition,
            marketplace_id: this.marketplaceId,
          },
        ],
        item_name: [
          {
            value: data.title,
            language_tag: 'en_US',
            marketplace_id: this.marketplaceId,
          },
        ],
        brand: [
          {
            value: data.brand,
            marketplace_id: this.marketplaceId,
          },
        ],
        externally_assigned_product_identifier: data.asin
          ? [
              {
                type: 'ASIN',
                value: data.asin,
                marketplace_id: this.marketplaceId,
              },
            ]
          : undefined,
        bullet_point: data.bullet_points
          ? data.bullet_points.map((point) => ({
              value: point,
              language_tag: 'en_US',
              marketplace_id: this.marketplaceId,
            }))
          : undefined,
        product_description: [
          {
            value: data.description,
            language_tag: 'en_US',
            marketplace_id: this.marketplaceId,
          },
        ],
        fulfillment_availability: [
          {
            fulfillment_channel_code: 'DEFAULT',
            quantity: data.quantity,
            marketplace_id: this.marketplaceId,
          },
        ],
        purchasable_offer: [
          {
            currency: 'USD',
            our_price: [
              {
                schedule: [
                  {
                    value_with_tax: data.price,
                  },
                ],
              },
            ],
            marketplace_id: this.marketplaceId,
          },
        ],
        main_product_image_locator: data.images[0]
          ? [
              {
                media_location: data.images[0],
                marketplace_id: this.marketplaceId,
              },
            ]
          : undefined,
        other_product_image_locator: data.images.slice(1, 7).map((img) => ({
          media_location: img,
          marketplace_id: this.marketplaceId,
        })),
      },
    };
  }

  /**
   * Amazon SP-APIを呼び出し
   */
  private async callApi(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiCallResult<any>> {
    try {
      const url = `${this.apiBaseUrl}${endpoint}`;
      const headers = await this.getSignedHeaders(method, endpoint, body);

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
            code: responseData.errors?.[0]?.code || 'HTTP_ERROR',
            message: responseData.errors?.[0]?.message || response.statusText,
            details: responseData.errors,
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
   * AWS Signature Version 4 ヘッダーを生成
   * 簡易実装（本番環境では aws4fetch などのライブラリ使用推奨）
   */
  private async getSignedHeaders(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<Record<string, string>> {
    return {
      'Content-Type': 'application/json',
      'x-amz-access-token': this.config.credentials.access_token!,
      'x-amz-date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
    };
  }

  /**
   * リトライ可能なエラーか判定
   */
  private isRetryableError(errorCode?: string): boolean {
    if (!errorCode) return false;

    const retryableErrors = [
      'ServiceUnavailable',
      'InternalFailure',
      'Throttled',
      'QuotaExceeded',
    ];

    return retryableErrors.includes(errorCode);
  }
}
