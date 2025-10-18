// DDP/DDU価格調整APIクライアント

const API_BASE_URL = 'http://localhost:5001/api';

export interface ExchangeRateResponse {
  success: boolean;
  base_rate?: number;
  calculated_rate?: number;
  change_from_previous?: number;
  change_percentage?: number;
  rate_date?: string;
  error?: string;
}

export interface FuelSurchargeResponse {
  success: boolean;
  results?: {
    [key: string]: {
      success: boolean;
      rate?: number;
      effective_date?: string;
      error?: string;
    };
  };
  error?: string;
}

export interface TariffRateResponse {
  success: boolean;
  hts_code?: string;
  origin_country?: string;
  effective_rate?: number;
  section_301_applicable?: boolean;
  last_verified_date?: string;
  error?: string;
}

export interface PriceCalculationRequest {
  purchase_cost_jpy: number;
  hts_code: string;
  origin_country: string;
  category_id: number;
  weight_kg: number;
  carrier: 'FEDEX' | 'DHL' | 'UPS';
}

export interface PriceCalculationResponse {
  success: boolean;
  ddp_price?: number;
  ddu_price?: number;
  breakdown?: any;
  error?: string;
}

class DDPDDUApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: string; database: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  /**
   * 最新の為替レートを取得
   */
  async getExchangeRate(): Promise<ExchangeRateResponse> {
    const response = await fetch(`${this.baseUrl}/exchange-rate`);
    return response.json();
  }

  /**
   * DBから最新の為替レートを取得
   */
  async getLatestExchangeRate(): Promise<{ success: boolean; calculated_rate?: number }> {
    const response = await fetch(`${this.baseUrl}/exchange-rate/latest`);
    return response.json();
  }

  /**
   * 為替レート履歴を取得
   */
  async getExchangeRateHistory(days: number = 30): Promise<any> {
    const response = await fetch(`${this.baseUrl}/exchange-rate/history?days=${days}`);
    return response.json();
  }

  /**
   * 燃油サーチャージを取得
   */
  async getFuelSurcharge(carrier?: string): Promise<FuelSurchargeResponse> {
    const url = carrier 
      ? `${this.baseUrl}/fuel-surcharge/${carrier}`
      : `${this.baseUrl}/fuel-surcharge`;
    const response = await fetch(url);
    return response.json();
  }

  /**
   * 特定キャリアの最新サーチャージを取得
   */
  async getLatestFuelSurcharge(carrier: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/fuel-surcharge/${carrier}/latest`);
    return response.json();
  }

  /**
   * 関税率を取得
   */
  async getTariffRate(htsCode: string, country: string): Promise<TariffRateResponse> {
    const response = await fetch(`${this.baseUrl}/tariff/${htsCode}/${country}`);
    return response.json();
  }

  /**
   * 全レートを一括更新
   */
  async updateAllRates(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/update-all-rates`, {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * DDP/DDU価格を計算
   */
  async calculatePrice(data: PriceCalculationRequest): Promise<PriceCalculationResponse> {
    const response = await fetch(`${this.baseUrl}/calculate-ddp-ddu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * データベース状態を取得
   */
  async getDatabaseStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/database/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Database status fetch error:', error);
      return {
        success: false,
        error: 'データベース状態の取得に失敗しました'
      };
    }
  }

  /**
   * Supabase接続状態を取得（廃止 - 直接Supabaseから取得）
   */
  // async getSupabaseStatus(): Promise<any> {
  //   const response = await fetch(`${this.baseUrl}/supabase/status`);
  //   return response.json();
  // }

  /**
   * HTSコード一覧を取得
   */
  async getHTSCodes(limit: number = 100): Promise<any> {
    const response = await fetch(`${this.baseUrl}/supabase/hts?limit=${limit}`);
    return response.json();
  }

  /**
   * HTSコードを検索
   */
  async searchHTSCodes(keyword: string, limit: number = 10): Promise<any> {
    const response = await fetch(`${this.baseUrl}/supabase/hts/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
    return response.json();
  }

  /**
   * eBay手数料一覧を取得
   */
  async getEbayFees(limit: number = 100): Promise<any> {
    const response = await fetch(`${this.baseUrl}/supabase/ebay-fees?limit=${limit}`);
    return response.json();
  }

  /**
   * 原産国一覧を取得
   */
  async getOriginCountries(activeOnly: boolean = true): Promise<any> {
    const response = await fetch(`${this.baseUrl}/supabase/countries?active_only=${activeOnly}`);
    return response.json();
  }

  /**
   * 為替レート履歴を取得（Supabase）
   */
  async getSupabaseExchangeRates(limit: number = 10): Promise<any> {
    const response = await fetch(`${this.baseUrl}/supabase/exchange-rates?limit=${limit}`);
    return response.json();
  }
}

// シングルトンインスタンスをエクスポート
export const ddpDduApi = new DDPDDUApiClient();

// クラスもエクスポート（カスタムインスタンスが必要な場合）
export default DDPDDUApiClient;
