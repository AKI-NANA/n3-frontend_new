// ========================================
// supabase/functions/_shared/api-integrations.ts
// 外部API統合の完全実装
// ========================================

import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

// ========================================
// 1. Amazon Product Advertising API 5.0
// ========================================

interface AmazonAPIConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  region: string;
}

interface AmazonProductData {
  asin: string;
  title: string;
  price: number;
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  images: string[];
  rating?: number;
  reviewCount?: number;
  brand?: string;
  category?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  weight?: {
    value: number;
    unit: string;
  };
  features?: string[];
}

class AmazonPAAPI {
  private config: AmazonAPIConfig;
  private endpoint: string;

  constructor(config: AmazonAPIConfig) {
    this.config = config;
    this.endpoint = `https://webservices.amazon.${config.region}/paapi5/getitems`;
  }

  private async signRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    payload: string
  ): Promise<Record<string, string>> {
    const awsDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = awsDate.substr(0, 8);

    headers['host'] = new URL(url).host;
    headers['x-amz-date'] = awsDate;
    headers['x-amz-target'] = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';
    headers['content-encoding'] = 'amz-1.0';

    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
      .join('');

    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');

    const payloadHash = await this.sha256(payload);

    const canonicalRequest = [
      method,
      new URL(url).pathname,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.config.region}/ProductAdvertisingAPI/aws4_request`;
    const stringToSign = [
      algorithm,
      awsDate,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n');

    const signingKey = await this.getSignatureKey(
      this.config.secretKey,
      dateStamp,
      this.config.region,
      'ProductAdvertisingAPI'
    );

    const signature = await this.hmacSha256(signingKey, stringToSign);

    headers['Authorization'] = 
      `${algorithm} Credential=${this.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return headers;
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmacSha256(key: Uint8Array, message: string): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      new TextEncoder().encode(message)
    );
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<Uint8Array> {
    const kDate = await this.hmacSha256Raw(
      new TextEncoder().encode('AWS4' + key),
      dateStamp
    );
    const kRegion = await this.hmacSha256Raw(kDate, regionName);
    const kService = await this.hmacSha256Raw(kRegion, serviceName);
    const kSigning = await this.hmacSha256Raw(kService, 'aws4_request');
    return kSigning;
  }

  private async hmacSha256Raw(key: Uint8Array, message: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      new TextEncoder().encode(message)
    );
    return new Uint8Array(signature);
  }

  async getProductData(asin: string): Promise<AmazonProductData | null> {
    const payload = JSON.stringify({
      ItemIds: [asin],
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'ItemInfo.ProductInfo',
        'Offers.Listings.Price',
        'Offers.Listings.Availability.Message',
        'BrowseNodeInfo.BrowseNodes',
        'ItemInfo.ByLineInfo'
      ],
      PartnerTag: this.config.partnerTag,
      PartnerType: 'Associates',
      Marketplace: `www.amazon.${this.config.region}`
    });

    let headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8'
    };

    headers = await this.signRequest('POST', this.endpoint, headers, payload);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: payload
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Amazon API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.ItemsResult?.Items?.[0]) {
        return null;
      }

      const item = data.ItemsResult.Items[0];
      const offer = item.Offers?.Listings?.[0];

      return {
        asin: item.ASIN,
        title: item.ItemInfo?.Title?.DisplayValue || '',
        price: offer?.Price?.Amount || 0,
        currency: offer?.Price?.Currency || 'USD',
        availability: this.parseAvailability(offer?.Availability?.Message),
        images: item.Images?.Primary?.Large?.URL 
          ? [item.Images.Primary.Large.URL]
          : [],
        rating: item.CustomerReviews?.StarRating?.Value || undefined,
        reviewCount: item.CustomerReviews?.Count || undefined,
        brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || undefined,
        category: item.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName || undefined,
        dimensions: item.ItemInfo?.ProductInfo?.ItemDimensions 
          ? {
              length: item.ItemInfo.ProductInfo.ItemDimensions.Length?.DisplayValue || 0,
              width: item.ItemInfo.ProductInfo.ItemDimensions.Width?.DisplayValue || 0,
              height: item.ItemInfo.ProductInfo.ItemDimensions.Height?.DisplayValue || 0,
              unit: item.ItemInfo.ProductInfo.ItemDimensions.Length?.Unit || 'Inches'
            }
          : undefined,
        weight: item.ItemInfo?.ProductInfo?.ItemDimensions?.Weight
          ? {
              value: item.ItemInfo.ProductInfo.ItemDimensions.Weight.DisplayValue || 0,
              unit: item.ItemInfo.ProductInfo.ItemDimensions.Weight.Unit || 'Pounds'
            }
          : undefined,
        features: item.ItemInfo?.Features?.DisplayValues || undefined
      };
    } catch (error) {
      console.error('Amazon API fetch error:', error);
      throw error;
    }
  }

  private parseAvailability(message?: string): 'in_stock' | 'out_of_stock' | 'preorder' {
    if (!message) return 'out_of_stock';
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('in stock')) return 'in_stock';
    if (lowerMessage.includes('preorder') || lowerMessage.includes('pre-order')) return 'preorder';
    return 'out_of_stock';
  }

  async searchProducts(keyword: string, maxResults: number = 10): Promise<AmazonProductData[]> {
    // Search API implementation
    const endpoint = `https://webservices.amazon.${this.config.region}/paapi5/searchitems`;
    
    const payload = JSON.stringify({
      Keywords: keyword,
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price'
      ],
      PartnerTag: this.config.partnerTag,
      PartnerType: 'Associates',
      Marketplace: `www.amazon.${this.config.region}`,
      ItemCount: maxResults
    });

    let headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8'
    };

    headers = await this.signRequest('POST', endpoint, headers, payload);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payload
    });

    if (!response.ok) {
      throw new Error(`Amazon Search API error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.SearchResult?.Items || [];

    return items.map((item: any) => ({
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue || '',
      price: item.Offers?.Listings?.[0]?.Price?.Amount || 0,
      currency: item.Offers?.Listings?.[0]?.Price?.Currency || 'USD',
      availability: 'in_stock' as const,
      images: item.Images?.Primary?.Large?.URL ? [item.Images.Primary.Large.URL] : []
    }));
  }
}

// ========================================
// 2. Coupang Wing API Integration
// ========================================

interface CoupangAPIConfig {
  accessKey: string;
  secretKey: string;
  vendorId: string;
}

interface CoupangListingData {
  productId?: string;
  sellerProductId: string;
  displayCategoryCode: string;
  sellerProductName: string;
  vendorId: string;
  salePrice: number;
  originalPrice?: number;
  maximumBuyCount?: number;
  maximumBuyForPerson?: number;
  outboundShippingTimeDay: number;
  actualShippingInfo?: string;
  items: Array<{
    itemName: string;
    originalPrice?: number;
    salePrice: number;
    maximumBuyCount: number;
    maximumBuyForPerson: number;
    outboundShippingTimeDay: number;
    maximumBuyForPersonPeriod: number;
    unitCount: number;
    notice?: {
      productInfoProvidedNotice: {
        productInfoProvidedNoticeType: string;
      };
    };
  }>;
  images: Array<{
    imageOrder: number;
    vendorPath: string;
  }>;
  notice?: any;
  detailContents?: string;
}

class CoupangWingAPI {
  private config: CoupangAPIConfig;
  private baseUrl: string = 'https://api-gateway.coupang.com';

  constructor(config: CoupangAPIConfig) {
    this.config = config;
  }

  private generateHmac(method: string, path: string, timestamp: string, message?: string): string {
    const data = `${method}${path}${timestamp}${message || ''}`;
    const hmac = createHmac('sha256', this.config.secretKey);
    hmac.update(data);
    return hmac.digest('hex');
  }

  private getAuthHeaders(method: string, path: string, message?: string): Record<string, string> {
    const timestamp = new Date().getTime().toString();
    const authorization = this.generateHmac(method, path, timestamp, message);

    return {
      'Content-Type': 'application/json;charset=UTF-8',
      'Authorization': `HMAC-SHA256 apiKey=${this.config.accessKey}, signature=${authorization}`,
      'X-EXTENDED-TIMESTAMP': timestamp
    };
  }

  async createProduct(productData: CoupangListingData): Promise<{ success: boolean; productId?: string; error?: string }> {
    const path = '/v2/providers/seller_api/apis/api/v1/marketplace/seller-products';
    const message = JSON.stringify(productData);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.getAuthHeaders('POST', path, message),
        body: message
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || `API error: ${response.status}`
        };
      }

      return {
        success: true,
        productId: result.data?.sellerProductId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateProductPrice(sellerProductId: string, price: number): Promise<boolean> {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}/prices`;
    const message = JSON.stringify({ salePrice: price });

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: this.getAuthHeaders('PUT', path, message),
        body: message
      });

      return response.ok;
    } catch (error) {
      console.error('Coupang price update error:', error);
      return false;
    }
  }

  async updateProductStatus(sellerProductId: string, status: 'APPROVAL' | 'SUSPENSION'): Promise<boolean> {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}/sales`;
    const message = JSON.stringify({ status });

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: this.getAuthHeaders('PUT', path, message),
        body: message
      });

      return response.ok;
    } catch (error) {
      console.error('Coupang status update error:', error);
      return false;
    }
  }

  async getOrders(createdAtFrom: string, createdAtTo: string): Promise<any[]> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.config.vendorId}/ordersheets`;
    const queryParams = `?createdAtFrom=${createdAtFrom}&createdAtTo=${createdAtTo}`;

    try {
      const response = await fetch(`${this.baseUrl}${path}${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path + queryParams)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Coupang orders fetch error:', error);
      return [];
    }
  }

  async updateShipmentInfo(shipmentBoxId: string, trackingNumber: string): Promise<boolean> {
    const path = '/v2/providers/openapi/apis/api/v4/vendors/shipping/invoice';
    const message = JSON.stringify({
      shipmentBoxId,
      invoiceNumber: trackingNumber
    });

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: this.getAuthHeaders('PUT', path, message),
        body: message
      });

      return response.ok;
    } catch (error) {
      console.error('Coupang shipment update error:', error);
      return false;
    }
  }

  async searchProducts(keyword: string): Promise<any[]> {
    const path = '/v2/providers/marketplace/product-search';
    const queryParams = `?keyword=${encodeURIComponent(keyword)}`;

    try {
      const response = await fetch(`${this.baseUrl}${path}${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path + queryParams)
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.products || [];
    } catch (error) {
      console.error('Coupang search error:', error);
      return [];
    }
  }
}

// ========================================
// 3. Exchange Rate API
// ========================================

interface ExchangeRateData {
  base: string;
  date: string;
  rates: Record<string, number>;
}

class ExchangeRateAPI {
  private apiKey: string;
  private baseUrl: string = 'https://api.exchangerate-api.com/v4/latest';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
  }

  async getRate(from: string = 'USD', to: string = 'KRW'): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/${from}`);
      
      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.status}`);
      }

      const data: ExchangeRateData = await response.json();
      
      if (!data.rates[to]) {
        throw new Error(`Rate for ${to} not found`);
      }

      return data.rates[to];
    } catch (error) {
      console.error('Exchange rate fetch error:', error);
      // フォールバック: 固定レート
      return 1340;
    }
  }

  async getRates(base: string = 'USD'): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${this.baseUrl}/${base}`);
      const data: ExchangeRateData = await response.json();
      return data.rates;
    } catch (error) {
      console.error('Exchange rates fetch error:', error);
      return { KRW: 1340, JPY: 150, EUR: 0.92, GBP: 0.79 };
    }
  }
}

// ========================================
// 4. Google Translate API
// ========================================

class TranslationAPI {
  private apiKey: string;
  private baseUrl: string = 'https://translation.googleapis.com/language/translate/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(text: string, targetLang: string = 'ko', sourceLang: string = 'en'): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data.translations[0].translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text + ' (번역 실패)';
    }
  }

  async translateBatch(texts: string[], targetLang: string = 'ko', sourceLang: string = 'en'): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: texts,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data.translations.map((t: any) => t.translatedText);
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts.map(t => t + ' (번역 실패)');
    }
  }
}

// ========================================
// 5. DHL Shipping API
// ========================================

interface DHLRateRequest {
  accountNumber: string;
  originCountryCode: string;
  originPostalCode: string;
  destinationCountryCode: string;
  destinationPostalCode: string;
  weight: number; // kg
  dimensions: {
    length: number; // cm
    width: number;
    height: number;
  };
}

interface DHLRateResponse {
  totalPrice: number;
  currency: string;
  deliveryTime: string;
  service: string;
}

class DHLShippingAPI {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://express.api.dhl.com/mydhlapi/rates';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private getAuthHeader(): string {
    const credentials = btoa(`${this.apiKey}:${this.apiSecret}`);
    return `Basic ${credentials}`;
  }

  async getRates(request: DHLRateRequest): Promise<DHLRateResponse | null> {
    const payload = {
      customerDetails: {
        shipperDetails: {
          postalCode: request.originPostalCode,
          countryCode: request.originCountryCode
        },
        receiverDetails: {
          postalCode: request.destinationPostalCode,
          countryCode: request.destinationCountryCode
        }
      },
      accounts: [{ number: request.accountNumber, type: 'shipper' }],
      productCode: 'P',
      localProductCode: 'P',
      packages: [{
        weight: request.weight,
        dimensions: request.dimensions
      }],
      plannedShippingDateAndTime: new Date().toISOString(),
      unitOfMeasurement: 'metric'
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`DHL API error: ${response.status}`);
      }

      const result = await response.json();
      const product = result.products?.[0];

      if (!product) return null;

      return {
        totalPrice: product.totalPrice[0].price,
        currency: product.totalPrice[0].priceCurrency,
        deliveryTime: product.deliveryCapabilities.estimatedDeliveryDateAndTime,
        service: product.productName
      };
    } catch (error) {
      console.error('DHL rate fetch error:', error);
      return null;
    }
  }

  calculateEstimatedCost(weight: number, dimensions: { length: number; width: number; height: number }): number {
    // 簡易計算（実際のAPIが利用できない場合のフォールバック）
    const baseRate = 25;
    const weightRate = 8.5;
    const volumeWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
    const chargeableWeight = Math.max(weight, volumeWeight);
    
    return Math.ceil(baseRate + (chargeableWeight * weightRate));
  }
}

// ========================================
// Export all API classes
// ========================================

export {
  AmazonPAAPI,
  CoupangWingAPI,
  ExchangeRateAPI,
  TranslationAPI,
  DHLShippingAPI,
  type AmazonAPIConfig,
  type AmazonProductData,
  type CoupangAPIConfig,
  type CoupangListingData,
  type DHLRateRequest,
  type DHLRateResponse
};
