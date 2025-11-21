/**
 * Bonanza API クライアント
 */

import {
  BonanzaAuthConfig,
  BonanzaBooth,
  BonanzaItem,
  CreateItemRequest,
  BonanzaCategory,
  BonanzaShippingProfile,
  BonanzaInventory,
  BonanzaOrder,
  BonanzaApiResponse,
} from './types';

const BONANZA_API_BASE_URL = 'https://api.bonanza.com/api_requests/secure_request';

/**
 * Bonanza APIクライアント
 */
export class BonanzaApiClient {
  private config: BonanzaAuthConfig;

  constructor(config: BonanzaAuthConfig) {
    this.config = config;
  }

  /**
   * APIリクエスト実行
   */
  private async request<T>(
    requestName: string,
    params: Record<string, unknown> = {}
  ): Promise<BonanzaApiResponse<T>> {
    const requestParams = {
      requesterCredentials: {
        bonanzleAuthToken: this.config.token,
      },
      [requestName]: params,
    };

    const response = await fetch(BONANZA_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BONANZLE-API-DEV-NAME': this.config.devId,
        'X-BONANZLE-API-CERT-NAME': this.config.certName,
      },
      body: JSON.stringify(requestParams),
    });

    if (!response.ok) {
      throw new Error(`Bonanza API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errorMessage) {
      return {
        success: false,
        error: {
          code: data.errorMessage.error?.errorId || 'UNKNOWN',
          message: data.errorMessage.error?.message || 'Unknown error',
        },
      };
    }

    return {
      success: true,
      data: data[requestName]?.result,
    };
  }

  /**
   * ブース情報を取得
   */
  async getBooth(boothId?: string): Promise<BonanzaBooth> {
    const response = await this.request<BonanzaBooth>('getBoothRequest', {
      boothId: boothId || 'self',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get booth');
    }

    return response.data;
  }

  /**
   * アイテム一覧を取得
   */
  async getItems(params?: {
    page?: number;
    per_page?: number;
    status?: 'active' | 'inactive' | 'sold';
  }): Promise<BonanzaApiResponse<BonanzaItem[]>> {
    return this.request<BonanzaItem[]>('getItemsRequest', {
      pageNumber: params?.page || 1,
      entriesPerPage: params?.per_page || 50,
      itemStatus: params?.status,
    });
  }

  /**
   * アイテム詳細を取得
   */
  async getItem(itemId: string): Promise<BonanzaItem> {
    const response = await this.request<BonanzaItem>('getItemRequest', {
      itemId,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get item');
    }

    return response.data;
  }

  /**
   * アイテムを作成
   */
  async createItem(data: CreateItemRequest): Promise<BonanzaItem> {
    const itemData = {
      item: {
        title: data.title,
        description: data.description,
        price: data.price,
        quantity: data.quantity,
        categoryId: data.category_id,
        condition: data.condition || 'new',
        SKU: data.sku,
        UPC: data.upc,
        ISBN: data.isbn,
        pictureURL: data.image_urls,
        shippingProfileId: data.shipping_profile_id,
        shippingCost: data.shipping_cost,
        handlingTime: data.handling_time || 3,
        returnsAccepted: data.returns_accepted !== false,
        returnPeriod: data.return_period || 30,
        returnPolicy: data.return_policy,
        paymentMethods: data.payment_methods || ['PayPal', 'CreditCard'],
        listingFormat: data.listing_format || 'fixed_price',
        auctionDuration: data.auction_duration,
        startingPrice: data.starting_price,
        reservePrice: data.reserve_price,
        buyItNowPrice: data.buy_it_now_price,
        itemSpecifics: data.item_specifics,
      },
    };

    const response = await this.request<BonanzaItem>('addItemRequest', itemData);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create item');
    }

    return response.data;
  }

  /**
   * アイテムを更新
   */
  async updateItem(
    itemId: string,
    data: Partial<CreateItemRequest>
  ): Promise<BonanzaItem> {
    const itemData = {
      item: {
        itemId,
        ...data,
      },
    };

    const response = await this.request<BonanzaItem>('reviseItemRequest', itemData);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update item');
    }

    return response.data;
  }

  /**
   * アイテムを削除
   */
  async deleteItem(itemId: string): Promise<void> {
    const response = await this.request<void>('endItemRequest', {
      itemId,
      endingReason: 'NotAvailable',
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete item');
    }
  }

  /**
   * アイテムの価格を更新
   */
  async updateItemPrice(itemId: string, price: number): Promise<BonanzaItem> {
    return this.updateItem(itemId, { price });
  }

  /**
   * アイテムの在庫を更新
   */
  async updateItemQuantity(itemId: string, quantity: number): Promise<BonanzaItem> {
    return this.updateItem(itemId, { quantity });
  }

  /**
   * カテゴリ一覧を取得
   */
  async getCategories(parentId?: string): Promise<BonanzaCategory[]> {
    const response = await this.request<BonanzaCategory[]>('getCategoriesRequest', {
      parentCategoryId: parentId,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get categories');
    }

    return response.data;
  }

  /**
   * 配送プロファイル一覧を取得
   */
  async getShippingProfiles(): Promise<BonanzaShippingProfile[]> {
    const response = await this.request<BonanzaShippingProfile[]>(
      'getShippingProfilesRequest',
      {}
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get shipping profiles');
    }

    return response.data;
  }

  /**
   * 配送プロファイルを作成
   */
  async createShippingProfile(
    data: Omit<BonanzaShippingProfile, 'profile_id'>
  ): Promise<BonanzaShippingProfile> {
    const response = await this.request<BonanzaShippingProfile>(
      'addShippingProfileRequest',
      { shippingProfile: data }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create shipping profile');
    }

    return response.data;
  }

  /**
   * 在庫情報を取得
   */
  async getInventory(itemId: string): Promise<BonanzaInventory> {
    const item = await this.getItem(itemId);

    return {
      item_id: item.item_id,
      sku: item.sku || '',
      quantity: item.quantity,
      quantity_sold: 0, // Bonanza APIでは直接取得できない場合がある
      quantity_available: item.quantity,
      last_updated: item.updated_at,
    };
  }

  /**
   * 注文一覧を取得
   */
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    status?: 'pending' | 'paid' | 'shipped';
  }): Promise<BonanzaApiResponse<BonanzaOrder[]>> {
    return this.request<BonanzaOrder[]>('getOrdersRequest', {
      pageNumber: params?.page || 1,
      entriesPerPage: params?.per_page || 50,
      orderStatus: params?.status,
    });
  }

  /**
   * 注文詳細を取得
   */
  async getOrder(orderId: string): Promise<BonanzaOrder> {
    const response = await this.request<BonanzaOrder>('getOrderRequest', {
      orderId,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get order');
    }

    return response.data;
  }

  /**
   * 画像をアップロード（外部URLを使用）
   */
  async addImageToItem(itemId: string, imageUrl: string): Promise<void> {
    const response = await this.request<void>('addItemImageRequest', {
      itemId,
      pictureURL: imageUrl,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add image');
    }
  }
}

export default BonanzaApiClient;
