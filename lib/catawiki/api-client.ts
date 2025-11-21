/**
 * Catawiki API クライアント
 * Catawiki Seller API対応
 */

import {
  CatawikiAuthConfig,
  CatawikiTokens,
  CatawikiLot,
  CreateLotRequest,
  CatawikiCategory,
  CatawikiAuction,
  CatawikiBid,
  ExpertiseRequest,
  ExpertiseEvaluation,
  CatawikiSaleResult,
  CatawikiCommission,
  CatawikiApiResponse,
} from './types';

const CATAWIKI_API_BASE_URL = 'https://api.catawiki.com/v1';
const CATAWIKI_OAUTH_URL = 'https://www.catawiki.com/oauth';

/**
 * Catawiki APIクライアント
 */
export class CatawikiApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * OAuth認証URLを生成
   */
  static getAuthorizationUrl(config: CatawikiAuthConfig, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
    });

    return `${CATAWIKI_OAUTH_URL}/authorize?${params.toString()}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  static async exchangeCodeForToken(
    config: CatawikiAuthConfig,
    code: string
  ): Promise<CatawikiTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    });

    const response = await fetch(`${CATAWIKI_OAUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  /**
   * リフレッシュトークンから新しいアクセストークンを取得
   */
  static async refreshAccessToken(
    config: CatawikiAuthConfig,
    refreshToken: string
  ): Promise<CatawikiTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(`${CATAWIKI_OAUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  /**
   * APIリクエスト実行
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<CatawikiApiResponse<T>> {
    const url = `${CATAWIKI_API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        code: 'UNKNOWN',
        message: response.statusText,
      }));

      return {
        success: false,
        error: {
          code: error.code || 'UNKNOWN',
          message: error.message || response.statusText,
          details: error,
        },
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  }

  /**
   * ロット一覧を取得
   */
  async getLots(params?: {
    status?: 'draft' | 'pending_approval' | 'approved' | 'active' | 'ended';
    page?: number;
    per_page?: number;
  }): Promise<CatawikiApiResponse<CatawikiLot[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

    return this.request<CatawikiLot[]>(`/lots${query}`);
  }

  /**
   * ロット詳細を取得
   */
  async getLot(lotId: string): Promise<CatawikiApiResponse<CatawikiLot>> {
    return this.request<CatawikiLot>(`/lots/${lotId}`);
  }

  /**
   * ロットを作成
   */
  async createLot(data: CreateLotRequest): Promise<CatawikiApiResponse<CatawikiLot>> {
    return this.request<CatawikiLot>('/lots', 'POST', data);
  }

  /**
   * ロットを更新
   */
  async updateLot(
    lotId: string,
    data: Partial<CreateLotRequest>
  ): Promise<CatawikiApiResponse<CatawikiLot>> {
    return this.request<CatawikiLot>(`/lots/${lotId}`, 'PATCH', data);
  }

  /**
   * ロットを削除
   */
  async deleteLot(lotId: string): Promise<CatawikiApiResponse<void>> {
    return this.request<void>(`/lots/${lotId}`, 'DELETE');
  }

  /**
   * カテゴリ一覧を取得
   */
  async getCategories(parentId?: string): Promise<CatawikiApiResponse<CatawikiCategory[]>> {
    const query = parentId ? `?parent_id=${parentId}` : '';
    return this.request<CatawikiCategory[]>(`/categories${query}`);
  }

  /**
   * カテゴリ詳細を取得
   */
  async getCategory(categoryId: string): Promise<CatawikiApiResponse<CatawikiCategory>> {
    return this.request<CatawikiCategory>(`/categories/${categoryId}`);
  }

  /**
   * オークション一覧を取得
   */
  async getAuctions(params?: {
    status?: 'upcoming' | 'live' | 'ended';
    category_id?: string;
  }): Promise<CatawikiApiResponse<CatawikiAuction[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.category_id) queryParams.set('category_id', params.category_id);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

    return this.request<CatawikiAuction[]>(`/auctions${query}`);
  }

  /**
   * オークション詳細を取得
   */
  async getAuction(auctionId: string): Promise<CatawikiApiResponse<CatawikiAuction>> {
    return this.request<CatawikiAuction>(`/auctions/${auctionId}`);
  }

  /**
   * ロットの入札履歴を取得
   */
  async getLotBids(lotId: string): Promise<CatawikiApiResponse<CatawikiBid[]>> {
    return this.request<CatawikiBid[]>(`/lots/${lotId}/bids`);
  }

  /**
   * エキスパート鑑定をリクエスト
   */
  async requestExpertise(
    lotId: string,
    request: ExpertiseRequest
  ): Promise<CatawikiApiResponse<ExpertiseEvaluation>> {
    return this.request<ExpertiseEvaluation>(
      `/lots/${lotId}/expertise`,
      'POST',
      request
    );
  }

  /**
   * エキスパート鑑定結果を取得
   */
  async getExpertiseEvaluation(
    lotId: string
  ): Promise<CatawikiApiResponse<ExpertiseEvaluation>> {
    return this.request<ExpertiseEvaluation>(`/lots/${lotId}/expertise`);
  }

  /**
   * ロットの販売結果を取得
   */
  async getSaleResult(lotId: string): Promise<CatawikiApiResponse<CatawikiSaleResult>> {
    return this.request<CatawikiSaleResult>(`/lots/${lotId}/sale-result`);
  }

  /**
   * 手数料情報を計算
   */
  async calculateCommission(
    lotId: string,
    estimatedPrice: number
  ): Promise<CatawikiApiResponse<CatawikiCommission>> {
    return this.request<CatawikiCommission>(`/lots/${lotId}/commission`, 'POST', {
      estimated_price: estimatedPrice,
    });
  }

  /**
   * 画像をアップロード
   */
  async uploadImage(lotId: string, imageFile: File): Promise<CatawikiApiResponse<{ id: string; url: string }>> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const url = `${CATAWIKI_API_BASE_URL}/lots/${lotId}/images`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: `Failed to upload image: ${response.statusText}`,
        },
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  }

  /**
   * 画像を外部URLから追加
   */
  async addImageFromUrl(
    lotId: string,
    imageUrl: string
  ): Promise<CatawikiApiResponse<{ id: string; url: string }>> {
    return this.request<{ id: string; url: string }>(
      `/lots/${lotId}/images`,
      'POST',
      { url: imageUrl }
    );
  }

  /**
   * Reserve Price（最低落札価格）を自動計算
   * Phase 1の利益保証ロジックを活用
   */
  async calculateReservePrice(
    costPrice: number,
    targetProfitMargin: number,
    categoryId: string
  ): Promise<number> {
    // カテゴリ情報を取得して手数料率を確認
    const categoryResponse = await this.getCategory(categoryId);

    if (!categoryResponse.success || !categoryResponse.data) {
      // デフォルト手数料率を使用
      const commissionRate = 0.09; // 9%
      const reservePrice = costPrice / (1 - commissionRate - targetProfitMargin);
      return Math.ceil(reservePrice * 100) / 100;
    }

    const commissionRate = categoryResponse.data.commission_rate / 100;
    const reservePrice = costPrice / (1 - commissionRate - targetProfitMargin);

    return Math.ceil(reservePrice * 100) / 100;
  }
}

export default CatawikiApiClient;
