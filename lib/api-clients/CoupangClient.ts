/**
 * Coupang Partner API クライアント
 *
 * Coupang Partner APIを使用した出品管理
 * - HMAC-SHA256 署名認証
 * - create-product エンドポイント
 */

import { BaseApiClient, ApiResponse } from './BaseApiClient';
import type { ListingPayload, ApiCredentials } from '@/types/listing';
import crypto from 'crypto';

export class CoupangClient extends BaseApiClient {
  private credentials: ApiCredentials['coupang'];
  private apiUrl: string = 'https://api-gateway.coupang.com';

  constructor(credentials: ApiCredentials['coupang']) {
    super('coupang');

    if (!credentials) {
      throw new Error('Coupang credentials are required');
    }

    this.credentials = credentials;
  }

  /**
   * HMAC-SHA256 署名を生成
   */
  private generateSignature(
    method: string,
    path: string,
    timestamp: string
  ): string {
    const message = `${timestamp}${method}${path}`;
    const hmac = crypto.createHmac('sha256', this.credentials!.secretKey);
    hmac.update(message);
    return hmac.digest('hex');
  }

  /**
   * リクエストヘッダーを構築
   */
  private buildHeaders(method: string, path: string): Record<string, string> {
    const timestamp = new Date().getTime().toString();
    const signature = this.generateSignature(method, path, timestamp);

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${signature}`,
      'X-COUPANG-ACCESS-KEY': this.credentials!.accessKey,
      'X-COUPANG-VENDOR-ID': this.credentials!.vendorId,
      'X-COUPANG-TIMESTAMP': timestamp,
    };
  }

  /**
   * API コール
   */
  private async callApi(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.apiUrl}${path}`;
    const headers = this.buildHeaders(method, path);

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
          data.message || `API call failed: ${response.statusText}`
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
   * コンディションをCoupang形式にマッピング
   */
  private mapConditionToCoupang(
    condition: 'New' | 'Used' | 'Refurbished'
  ): string {
    switch (condition) {
      case 'New':
        return 'NEW';
      case 'Used':
        return 'USED';
      case 'Refurbished':
        return 'REFURBISHED';
      default:
        return 'NEW';
    }
  }

  /**
   * 出品データの検証
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

    if (payload.images.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'At least one image is required',
          type: 'fatal',
        },
      };
    }

    return { success: true };
  }

  /**
   * 出品実行（create-product）
   */
  async addListing(payload: ListingPayload): Promise<ApiResponse<string>> {
    try {
      const path = '/v2/providers/marketplace/apis/api/v1/create-product';

      const body = {
        vendorId: this.credentials!.vendorId,
        vendorItemId: payload.sku,
        salePrice: payload.price,
        originalPrice: payload.price,
        displayCategoryCode: payload.categoryId || '0', // TODO: カテゴリマッピング
        itemName: payload.title,
        productDescription: payload.description,
        brand: payload.itemSpecifics?.find((s) => s.key === 'Brand')?.value || '',
        manufacturer: payload.itemSpecifics?.find((s) => s.key === 'Manufacturer')?.value || '',
        modelName: payload.itemSpecifics?.find((s) => s.key === 'Model')?.value || '',
        notice: {
          // 상품 정보 고시 (韓国法定表示事項)
          productInfoProvidedNotice: {
            productInfoProvidedNoticeType: 'WEAR',
          },
        },
        certifications: [],
        searchTags: [],
        images: payload.images.slice(0, 10).map((url, index) => ({
          imageOrder: index + 1,
          imageUrl: url,
        })),
        itemStatus: this.mapConditionToCoupang(payload.condition),
        adultProduct: 'EVERYONE',
        taxType: 'TAX',
        parallelImported: 'NOT_PARALLEL_IMPORTED',
        overseasPurchased: false,
        pccNeeded: false,
        externalVendorSku: payload.sku,
        barcode: '', // TODO: バーコードがあれば設定
        modelNo: payload.sku,
        emptyBarcode: true,
        emptyBarcodeReason: 'NOT_EXIST',
        maximumBuyCount: 999,
        maximumBuyForPerson: 0,
        maximumBuyForPersonPeriod: 0,
        outboundShippingTimeDay: 3,
        unitCount: 1,
        adultOnly: false,
        taxFreeOnly: false,
        externalVendorSkuCode: payload.sku,
        items: [
          {
            itemName: payload.title,
            originalPrice: payload.price,
            salePrice: payload.price,
            maximumBuyCount: 999,
            maximumBuyForPerson: 0,
            maximumBuyForPersonPeriod: 0,
            outboundShippingTimeDay: 3,
            unitCount: 1,
            adultOnly: false,
            taxFreeOnly: false,
            attributes: [],
            vendorItemId: payload.sku,
            externalVendorSku: payload.sku,
          },
        ],
      };

      const response = await this.retryRequest(() =>
        this.callApi('POST', path, body)
      );

      const productId = response.data?.productId || response.productId;

      if (productId) {
        this.log('info', `CreateProduct success: ProductID=${productId}`);
        return {
          success: true,
          data: productId,
        };
      } else {
        throw new Error('ProductID not returned');
      }
    } catch (error) {
      this.log('error', 'CreateProduct exception', error);
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : String(error),
          type: this.classifyError(
            'CREATE_FAILED',
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
      const path = '/v2/providers/marketplace/apis/api/v1/update-product';

      const body: any = {
        productId: listingId,
      };

      if (payload.title) body.itemName = payload.title;
      if (payload.description) body.productDescription = payload.description;
      if (payload.price) {
        body.salePrice = payload.price;
        body.originalPrice = payload.price;
      }

      const response = await this.retryRequest(() =>
        this.callApi('PUT', path, body)
      );

      return { success: true };
    } catch (error) {
      this.log('error', 'UpdateProduct exception', error);
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
   * 出品削除（ステータス変更）
   */
  async deleteListing(listingId: string): Promise<ApiResponse> {
    try {
      const path = '/v2/providers/marketplace/apis/api/v1/update-product-status';

      const body = {
        productId: listingId,
        status: 'SUSPENSION', // 판매중지
      };

      await this.retryRequest(() => this.callApi('PUT', path, body));

      return { success: true };
    } catch (error) {
      this.log('error', 'DeleteProduct exception', error);
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
   * 在庫数更新（Coupangは在庫管理が別API）
   */
  async updateQuantity(
    listingId: string,
    quantity: number
  ): Promise<ApiResponse> {
    try {
      const path = '/v2/providers/marketplace/apis/api/v1/update-inventory';

      const body = {
        productId: listingId,
        quantity,
      };

      await this.retryRequest(() => this.callApi('PUT', path, body));

      return { success: true };
    } catch (error) {
      this.log('error', 'UpdateQuantity exception', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_QTY_FAILED',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }

  /**
   * 価格更新
   */
  async updatePrice(listingId: string, price: number): Promise<ApiResponse> {
    return this.updateListing(listingId, {
      price,
    } as Partial<ListingPayload>);
  }
}
