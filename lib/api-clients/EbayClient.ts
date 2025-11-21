/**
 * eBay Trading API クライアント
 *
 * eBay Trading APIを使用した出品管理
 * - OAuth認証
 * - XML形式のリクエスト/レスポンス
 * - VerifyAddItem による事前検証
 */

import { BaseApiClient, ApiResponse } from './BaseApiClient';
import type { ListingPayload, ApiCredentials } from '@/types/listing';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export class EbayClient extends BaseApiClient {
  private credentials: ApiCredentials['ebay'];
  private apiUrl: string;
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;

  constructor(credentials: ApiCredentials['ebay']) {
    super('ebay');

    if (!credentials) {
      throw new Error('eBay credentials are required');
    }

    this.credentials = credentials;
    this.apiUrl = 'https://api.ebay.com/ws/api.dll';
    this.xmlParser = new XMLParser({ ignoreAttributes: false });
    this.xmlBuilder = new XMLBuilder({ ignoreAttributes: false });
  }

  /**
   * 共通ヘッダーを構築
   */
  private buildHeaders(callName: string): Record<string, string> {
    return {
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1193',
      'X-EBAY-API-DEV-NAME': this.credentials!.devId,
      'X-EBAY-API-APP-NAME': this.credentials!.appId,
      'X-EBAY-API-CERT-NAME': this.credentials!.certId,
      'X-EBAY-API-CALL-NAME': callName,
      'X-EBAY-API-SITEID': this.credentials!.siteId,
      'Content-Type': 'text/xml; charset=utf-8',
    };
  }

  /**
   * XML リクエストボディを構築
   */
  private buildXmlRequest(callName: string, body: any): string {
    const request = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8',
      },
      [`${callName}Request`]: {
        '@_xmlns': 'urn:ebay:apis:eBLBaseComponents',
        RequesterCredentials: {
          eBayAuthToken: this.credentials!.oauthToken,
        },
        ...body,
      },
    };

    return this.xmlBuilder.build(request);
  }

  /**
   * API コール
   */
  private async callApi(callName: string, body: any): Promise<any> {
    const headers = this.buildHeaders(callName);
    const xml = this.buildXmlRequest(callName, body);

    this.log('info', `Calling ${callName}`, { body });

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: xml,
      });

      const responseText = await response.text();
      const parsed = this.xmlParser.parse(responseText);

      this.log('info', `${callName} response received`, { parsed });

      return parsed[`${callName}Response`];
    } catch (error) {
      this.log('error', `${callName} failed`, error);
      throw error;
    }
  }

  /**
   * Item を構築（AddItem / VerifyAddItem 共通）
   */
  private buildItem(payload: ListingPayload): any {
    return {
      Title: payload.title.substring(0, 80), // eBayのタイトル上限80文字
      Description: `<![CDATA[${payload.description}]]>`,
      PrimaryCategory: {
        CategoryID: payload.categoryId || '0', // TODO: カテゴリマッピング
      },
      StartPrice: payload.price.toString(),
      ConditionID: this.mapConditionToEbay(payload.condition),
      Country: 'US', // TODO: 動的に設定
      Currency: payload.currency || 'USD',
      DispatchTimeMax: 3,
      ListingDuration: 'GTC', // Good 'Til Cancelled
      ListingType: 'FixedPriceItem',
      PaymentMethods: 'PayPal',
      PayPalEmailAddress: 'payments@example.com', // TODO: 環境変数から取得
      PictureDetails: {
        PictureURL: payload.images.slice(0, 12), // eBayは最大12枚
      },
      Quantity: payload.quantity,
      SKU: payload.sku,
      ItemSpecifics: payload.itemSpecifics?.length
        ? {
            NameValueList: payload.itemSpecifics.map((spec) => ({
              Name: spec.key,
              Value: spec.value,
            })),
          }
        : undefined,
      ReturnPolicy: {
        ReturnsAcceptedOption: 'ReturnsAccepted',
        RefundOption: 'MoneyBack',
        ReturnsWithinOption: 'Days_30',
        ShippingCostPaidByOption: 'Buyer',
      },
      ShippingDetails: {
        ShippingType: 'Flat',
        ShippingServiceOptions: {
          ShippingServicePriority: 1,
          ShippingService: 'USPSPriority',
          ShippingServiceCost: '0.00', // Free shipping
        },
      },
    };
  }

  /**
   * コンディションをeBay形式にマッピング
   */
  private mapConditionToEbay(
    condition: 'New' | 'Used' | 'Refurbished'
  ): string {
    switch (condition) {
      case 'New':
        return '1000'; // New
      case 'Used':
        return '3000'; // Used
      case 'Refurbished':
        return '2000'; // Certified refurbished
      default:
        return '1000';
    }
  }

  /**
   * エラーを解析
   */
  private parseErrors(response: any): {
    code: string;
    message: string;
  } | null {
    const errors = response?.Errors;
    if (!errors) return null;

    const errorArray = Array.isArray(errors) ? errors : [errors];
    const firstError = errorArray[0];

    return {
      code: firstError.ErrorCode || 'UNKNOWN',
      message: firstError.LongMessage || firstError.ShortMessage || 'Unknown error',
    };
  }

  /**
   * 出品データの検証（VerifyAddItem）
   */
  async verifyListing(payload: ListingPayload): Promise<ApiResponse> {
    try {
      const item = this.buildItem(payload);

      const response = await this.retryRequest(() =>
        this.callApi('VerifyAddItem', { Item: item })
      );

      const ack = response.Ack;

      if (ack === 'Success' || ack === 'Warning') {
        return { success: true };
      } else {
        const error = this.parseErrors(response);
        return {
          success: false,
          error: {
            code: error?.code || 'VERIFY_FAILED',
            message: error?.message || 'Verification failed',
            type: this.classifyError(
              error?.code || '',
              error?.message || ''
            ),
          },
        };
      }
    } catch (error) {
      this.log('error', 'VerifyAddItem exception', error);
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }

  /**
   * 出品実行（AddItem）
   */
  async addListing(payload: ListingPayload): Promise<ApiResponse<string>> {
    try {
      const item = this.buildItem(payload);

      const response = await this.retryRequest(() =>
        this.callApi('AddItem', { Item: item })
      );

      const ack = response.Ack;

      if (ack === 'Success' || ack === 'Warning') {
        const itemId = response.ItemID;
        this.log('info', `AddItem success: ItemID=${itemId}`);

        return {
          success: true,
          data: itemId,
        };
      } else {
        const error = this.parseErrors(response);
        return {
          success: false,
          error: {
            code: error?.code || 'ADD_FAILED',
            message: error?.message || 'Add item failed',
            type: this.classifyError(
              error?.code || '',
              error?.message || ''
            ),
          },
        };
      }
    } catch (error) {
      this.log('error', 'AddItem exception', error);
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }

  /**
   * 出品更新（ReviseItem）
   */
  async updateListing(
    listingId: string,
    payload: Partial<ListingPayload>
  ): Promise<ApiResponse> {
    try {
      const item: any = {
        ItemID: listingId,
      };

      if (payload.title) item.Title = payload.title;
      if (payload.description)
        item.Description = `<![CDATA[${payload.description}]]>`;
      if (payload.price) item.StartPrice = payload.price.toString();
      if (payload.quantity) item.Quantity = payload.quantity;

      const response = await this.retryRequest(() =>
        this.callApi('ReviseItem', { Item: item })
      );

      const ack = response.Ack;

      if (ack === 'Success' || ack === 'Warning') {
        return { success: true };
      } else {
        const error = this.parseErrors(response);
        return {
          success: false,
          error: {
            code: error?.code || 'REVISE_FAILED',
            message: error?.message || 'Revise failed',
            type: this.classifyError(
              error?.code || '',
              error?.message || ''
            ),
          },
        };
      }
    } catch (error) {
      this.log('error', 'ReviseItem exception', error);
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }

  /**
   * 出品削除（EndItem）
   */
  async deleteListing(listingId: string): Promise<ApiResponse> {
    try {
      const response = await this.retryRequest(() =>
        this.callApi('EndItem', {
          ItemID: listingId,
          EndingReason: 'NotAvailable',
        })
      );

      const ack = response.Ack;

      if (ack === 'Success' || ack === 'Warning') {
        return { success: true };
      } else {
        const error = this.parseErrors(response);
        return {
          success: false,
          error: {
            code: error?.code || 'END_FAILED',
            message: error?.message || 'End item failed',
            type: this.classifyError(
              error?.code || '',
              error?.message || ''
            ),
          },
        };
      }
    } catch (error) {
      this.log('error', 'EndItem exception', error);
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }

  /**
   * 在庫数更新（ReviseInventoryStatus）
   */
  async updateQuantity(
    listingId: string,
    quantity: number
  ): Promise<ApiResponse> {
    try {
      const response = await this.retryRequest(() =>
        this.callApi('ReviseInventoryStatus', {
          InventoryStatus: {
            ItemID: listingId,
            Quantity: quantity,
          },
        })
      );

      const ack = response.Ack;

      if (ack === 'Success' || ack === 'Warning') {
        return { success: true };
      } else {
        const error = this.parseErrors(response);
        return {
          success: false,
          error: {
            code: error?.code || 'UPDATE_QTY_FAILED',
            message: error?.message || 'Update quantity failed',
            type: this.classifyError(
              error?.code || '',
              error?.message || ''
            ),
          },
        };
      }
    } catch (error) {
      this.log('error', 'ReviseInventoryStatus (quantity) exception', error);
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }

  /**
   * 価格更新（ReviseInventoryStatus）
   */
  async updatePrice(listingId: string, price: number): Promise<ApiResponse> {
    try {
      const response = await this.retryRequest(() =>
        this.callApi('ReviseInventoryStatus', {
          InventoryStatus: {
            ItemID: listingId,
            StartPrice: price.toString(),
          },
        })
      );

      const ack = response.Ack;

      if (ack === 'Success' || ack === 'Warning') {
        return { success: true };
      } else {
        const error = this.parseErrors(response);
        return {
          success: false,
          error: {
            code: error?.code || 'UPDATE_PRICE_FAILED',
            message: error?.message || 'Update price failed',
            type: this.classifyError(
              error?.code || '',
              error?.message || ''
            ),
          },
        };
      }
    } catch (error) {
      this.log('error', 'ReviseInventoryStatus (price) exception', error);
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: error instanceof Error ? error.message : String(error),
          type: 'temporary',
        },
      };
    }
  }
}
