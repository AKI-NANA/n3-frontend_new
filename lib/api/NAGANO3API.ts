/**
 * NAGANO-3 API抽象化層
 * 既存PHPバックエンドとの通信を管理
 */

import type {
  Product,
  GetProductRequest,
  GetProductResponse,
  UpdateProductRequest,
  UpdateProductResponse,
  SaveImagesRequest,
  SaveImagesResponse,
} from '@/types/product';
import { getMockProduct, delay } from './mockData';

/**
 * API設定
 */
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  phpPath: '/original-php/yahoo_auction_complete/07_editing',
  timeout: 30000, // 30秒
  useMock: process.env.NEXT_PUBLIC_USE_MOCK_API === 'true', // モックモード
};

/**
 * APIエラークラス
 */
export class NAGANO3APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'NAGANO3APIError';
  }
}

/**
 * NAGANO3API クラス
 * 既存PHP APIとの通信を抽象化
 */
export class NAGANO3API {
  private baseUrl: string;
  private phpPath: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.phpPath = API_CONFIG.phpPath;
  }

  /**
   * 商品データ取得
   */
  async getProduct(params: GetProductRequest): Promise<GetProductResponse> {
    // モックモード
    if (API_CONFIG.useMock) {
      return this.getMockProduct(params);
    }

    try {
      const queryParams = new URLSearchParams();
      if (params.id) queryParams.append('id', params.id);
      if (params.asin) queryParams.append('asin', params.asin);
      if (params.sku) queryParams.append('sku', params.sku);
      queryParams.append('action', 'get_product_details');

      const url = `${this.baseUrl}${this.phpPath}/editor.php?${queryParams}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      });

      if (!response.ok) {
        throw new NAGANO3APIError(
          `HTTP Error: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      
      // PHP APIのレスポンス形式を標準化
      return this.normalizeProductResponse(data);
    } catch (error) {
      console.error('getProduct error:', error);
      
      if (error instanceof NAGANO3APIError) {
        throw error;
      }
      
      throw new NAGANO3APIError(
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }

  /**
   * 商品データ更新
   */
  async updateProduct(
    params: UpdateProductRequest
  ): Promise<UpdateProductResponse> {
    // モックモード
    if (API_CONFIG.useMock) {
      await delay(500);
      return {
        success: true,
        data: params.updates as Product,
        message: 'モックモード: 更新成功',
      };
    }

    try {
      const url = `${this.baseUrl}${this.phpPath}/editor.php`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_product',
          id: params.id,
          updates: params.updates,
        }),
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      });

      if (!response.ok) {
        throw new NAGANO3APIError(
          `HTTP Error: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      
      return this.normalizeUpdateResponse(data);
    } catch (error) {
      console.error('updateProduct error:', error);
      
      if (error instanceof NAGANO3APIError) {
        throw error;
      }
      
      throw new NAGANO3APIError(
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }

  /**
   * 画像選択保存
   */
  async saveImages(params: SaveImagesRequest): Promise<SaveImagesResponse> {
    try {
      const url = `${this.baseUrl}${this.phpPath}/editor.php`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_images',
          product_id: params.productId,
          images: params.images,
          marketplace: params.marketplace,
        }),
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      });

      if (!response.ok) {
        throw new NAGANO3APIError(
          `HTTP Error: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      
      return {
        success: data.success || false,
        savedCount: data.saved_count,
        error: data.error,
        message: data.message,
      };
    } catch (error) {
      console.error('saveImages error:', error);
      
      if (error instanceof NAGANO3APIError) {
        throw error;
      }
      
      throw new NAGANO3APIError(
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }

  /**
   * カテゴリ判定（11_category連携）
   */
  async detectCategory(params: {
    productId: string;
    title?: string;
    description?: string;
  }): Promise<{ success: boolean; category?: any; error?: string }> {
    try {
      const url = `${this.baseUrl}/original-php/yahoo_auction_complete/11_category/detect.php`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      });

      if (!response.ok) {
        throw new NAGANO3APIError(
          `HTTP Error: ${response.status}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      console.error('detectCategory error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 利益計算（05_rieki連携）
   */
  async calculateProfit(params: {
    productId: string;
    price: number;
    cost: number;
    marketplace?: string;
  }): Promise<{ success: boolean; profit?: number; error?: string }> {
    try {
      const url = `${this.baseUrl}/original-php/yahoo_auction_complete/05_rieki/calculate.php`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      });

      if (!response.ok) {
        throw new NAGANO3APIError(
          `HTTP Error: ${response.status}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      console.error('calculateProfit error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * PHPレスポンスの正規化
   */
  private normalizeProductResponse(data: any): GetProductResponse {
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Invalid response format',
      };
    }

    // PHP APIのレスポンス形式に応じて調整
    if (data.success === false) {
      return {
        success: false,
        error: data.error || data.message || 'Unknown error',
      };
    }

    // 商品データの正規化
    const product: Product | undefined = data.product || data.data;
    
    if (!product) {
      return {
        success: false,
        error: 'No product data in response',
      };
    }

    return {
      success: true,
      data: this.normalizeProduct(product),
    };
  }

  /**
   * 商品データの正規化
   */
  private normalizeProduct(rawProduct: any): Product {
    return {
      id: rawProduct.id || rawProduct.product_id || '',
      asin: rawProduct.asin || '',
      sku: rawProduct.sku || '',
      title: rawProduct.title || rawProduct.product_name || '',
      description: rawProduct.description || '',
      price: parseFloat(rawProduct.price) || 0,
      cost: rawProduct.cost ? parseFloat(rawProduct.cost) : undefined,
      profit: rawProduct.profit ? parseFloat(rawProduct.profit) : undefined,
      
      images: this.normalizeImages(rawProduct.images || []),
      selectedImages: rawProduct.selected_images || [],
      
      category: rawProduct.category,
      stock: rawProduct.stock,
      marketplace: rawProduct.marketplace,
      
      createdAt: rawProduct.created_at,
      updatedAt: rawProduct.updated_at,
      lastEditedBy: rawProduct.last_edited_by,
    };
  }

  /**
   * 画像データの正規化
   */
  private normalizeImages(rawImages: any[]): any[] {
    if (!Array.isArray(rawImages)) {
      return [];
    }

    return rawImages.map((img, index) => ({
      id: img.id || `img-${index}`,
      url: img.url || img.image_url || img.src || '',
      thumbnail: img.thumbnail || img.thumb || '',
      isMain: img.is_main || img.main || index === 0,
      order: img.order !== undefined ? img.order : index,
      alt: img.alt || '',
      selected: img.selected || false,
    }));
  }

  /**
   * 更新レスポンスの正規化
   */
  private normalizeUpdateResponse(data: any): UpdateProductResponse {
    return {
      success: data.success || false,
      data: data.product ? this.normalizeProduct(data.product) : undefined,
      error: data.error,
      message: data.message,
    };
  }

  /**
   * モック商品データ取得
   */
  private async getMockProduct(
    params: GetProductRequest
  ): Promise<GetProductResponse> {
    await delay(500); // 実際のAPIを模擬

    const productId = params.id || params.asin || params.sku || '';
    const product = getMockProduct(productId);

    if (!product) {
      return {
        success: false,
        error: `商品が見つかりません: ${productId}`,
      };
    }

    return {
      success: true,
      data: product,
    };
  }
}

/**
 * シングルトンインスタンス
 */
export const nagano3API = new NAGANO3API();
