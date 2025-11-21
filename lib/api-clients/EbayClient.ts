/**
 * eBay Trading API クライアント
 * Auth'n'Auth Token 方式を使用
 */

import { ApiClientConfig, ApiCallResult } from '@/types/api-credentials';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

/**
 * eBay出品データ
 */
export interface EbayListingData {
  sku: string;
  title: string;
  description: string;
  category_id: string;
  price: number;
  quantity: number;
  condition: 'New' | 'Used' | 'Refurbished';
  images: string[];
  shipping_policy_id?: string;
  payment_policy_id?: string;
  return_policy_id?: string;
  item_specifics?: Record<string, string>;
}

/**
 * eBay Trading API レスポンス
 */
interface EbayApiResponse {
  AddItemResponse?: {
    Ack: string;
    ItemID?: string;
    Errors?: Array<{
      ShortMessage: string;
      LongMessage: string;
      ErrorCode: string;
      SeverityCode: string;
    }>;
  };
  ReviseItemResponse?: {
    Ack: string;
    ItemID?: string;
    Errors?: Array<{
      ShortMessage: string;
      LongMessage: string;
      ErrorCode: string;
      SeverityCode: string;
    }>;
  };
}

export class EbayClient {
  private config: ApiClientConfig;
  private apiUrl: string;
  private xmlBuilder: XMLBuilder;
  private xmlParser: XMLParser;

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.apiUrl = config.sandbox
      ? 'https://api.sandbox.ebay.com/ws/api.dll'
      : 'https://api.ebay.com/ws/api.dll';

    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
    });

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
    });
  }

  /**
   * 新規出品（AddItem）
   */
  async addItem(listingData: EbayListingData): Promise<ApiCallResult<string>> {
    const xml = this.buildAddItemXML(listingData);
    const response = await this.callApi('AddItem', xml);

    if (!response.success || !response.data) {
      return response;
    }

    const parsed: EbayApiResponse = this.xmlParser.parse(response.data);

    if (parsed.AddItemResponse?.Ack === 'Success') {
      return {
        success: true,
        data: parsed.AddItemResponse.ItemID,
      };
    }

    // エラー処理
    const errors = parsed.AddItemResponse?.Errors || [];
    const errorMessages = errors.map((e) => `[${e.ErrorCode}] ${e.LongMessage}`).join('; ');

    return {
      success: false,
      error: {
        code: errors[0]?.ErrorCode || 'UNKNOWN',
        message: errorMessages || 'Unknown error',
        details: errors,
      },
      retryable: this.isRetryableError(errors[0]?.ErrorCode),
    };
  }

  /**
   * 既存出品の更新（ReviseItem）
   */
  async reviseItem(
    itemId: string,
    listingData: Partial<EbayListingData>
  ): Promise<ApiCallResult<string>> {
    const xml = this.buildReviseItemXML(itemId, listingData);
    const response = await this.callApi('ReviseItem', xml);

    if (!response.success || !response.data) {
      return response;
    }

    const parsed: EbayApiResponse = this.xmlParser.parse(response.data);

    if (parsed.ReviseItemResponse?.Ack === 'Success') {
      return {
        success: true,
        data: parsed.ReviseItemResponse.ItemID,
      };
    }

    // エラー処理
    const errors = parsed.ReviseItemResponse?.Errors || [];
    const errorMessages = errors.map((e) => `[${e.ErrorCode}] ${e.LongMessage}`).join('; ');

    return {
      success: false,
      error: {
        code: errors[0]?.ErrorCode || 'UNKNOWN',
        message: errorMessages || 'Unknown error',
        details: errors,
      },
      retryable: this.isRetryableError(errors[0]?.ErrorCode),
    };
  }

  /**
   * AddItem用のXMLを構築
   */
  private buildAddItemXML(data: EbayListingData): string {
    const itemObj = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8',
      },
      AddItemRequest: {
        '@_xmlns': 'urn:ebay:apis:eBLBaseComponents',
        RequesterCredentials: {
          eBayAuthToken: this.config.credentials.ebay_auth_token,
        },
        ErrorLanguage: 'en_US',
        WarningLevel: 'High',
        Item: {
          Title: data.title,
          Description: `<![CDATA[${data.description}]]>`,
          PrimaryCategory: {
            CategoryID: data.category_id,
          },
          StartPrice: data.price.toFixed(2),
          ConditionID: this.getConditionId(data.condition),
          Country: 'US',
          Currency: 'USD',
          DispatchTimeMax: 3,
          ListingDuration: 'GTC', // Good 'Til Cancelled
          ListingType: 'FixedPriceItem',
          PaymentMethods: 'PayPal',
          Quantity: data.quantity,
          SKU: data.sku,
          PictureDetails: {
            PictureURL: data.images,
          },
          ShippingDetails: data.shipping_policy_id
            ? {
                ShippingServiceOptions: {
                  ShippingService: 'USPSPriority',
                  ShippingServiceCost: 0,
                },
              }
            : undefined,
          ItemSpecifics: data.item_specifics
            ? {
                NameValueList: Object.entries(data.item_specifics).map(([name, value]) => ({
                  Name: name,
                  Value: value,
                })),
              }
            : undefined,
        },
      },
    };

    return this.xmlBuilder.build(itemObj);
  }

  /**
   * ReviseItem用のXMLを構築
   */
  private buildReviseItemXML(itemId: string, data: Partial<EbayListingData>): string {
    const itemObj = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8',
      },
      ReviseItemRequest: {
        '@_xmlns': 'urn:ebay:apis:eBLBaseComponents',
        RequesterCredentials: {
          eBayAuthToken: this.config.credentials.ebay_auth_token,
        },
        ErrorLanguage: 'en_US',
        WarningLevel: 'High',
        Item: {
          ItemID: itemId,
          Title: data.title,
          Description: data.description ? `<![CDATA[${data.description}]]>` : undefined,
          StartPrice: data.price ? data.price.toFixed(2) : undefined,
          Quantity: data.quantity,
        },
      },
    };

    return this.xmlBuilder.build(itemObj);
  }

  /**
   * eBay Trading APIを呼び出し
   */
  private async callApi(callName: string, xmlBody: string): Promise<ApiCallResult<string>> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-CALL-NAME': callName,
          'X-EBAY-API-SITEID': '0', // US
          'Content-Type': 'text/xml',
        },
        body: xmlBody,
      });

      const responseText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
          status: response.status,
          retryable: response.status >= 500,
        };
      }

      return {
        success: true,
        data: responseText,
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
   * Condition IDを取得
   */
  private getConditionId(condition: string): string {
    const conditionMap: Record<string, string> = {
      New: '1000',
      'Like New': '1500',
      Used: '3000',
      Refurbished: '2000',
    };
    return conditionMap[condition] || '3000';
  }

  /**
   * リトライ可能なエラーか判定
   */
  private isRetryableError(errorCode?: string): boolean {
    if (!errorCode) return false;

    const retryableErrors = [
      '10007', // Internal error
      '11001', // Service unavailable
      '21916615', // Timeout
    ];

    return retryableErrors.includes(errorCode);
  }
}
