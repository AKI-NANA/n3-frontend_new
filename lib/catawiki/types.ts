/**
 * Catawiki API型定義
 * Catawiki Seller API対応
 */

/**
 * OAuth認証情報
 */
export interface CatawikiAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * アクセストークン
 */
export interface CatawikiTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * ロット（出品アイテム）情報
 */
export interface CatawikiLot {
  id: string;
  title: string;
  description: string;
  category_id: string;

  // オークション情報
  auction_id?: string;
  starting_price: number;
  reserve_price?: number;
  current_bid?: number;
  bid_count: number;

  // 推定価値
  estimated_value?: {
    min: number;
    max: number;
    currency: string;
  };

  // 画像
  images: CatawikiImage[];

  // 状態
  condition: 'new' | 'as_new' | 'very_good' | 'good' | 'fair' | 'poor';
  condition_description?: string;

  // 鑑定情報
  expert_notes?: string;
  authenticity_status: 'uncertified' | 'certified' | 'pending';
  expertise_status: 'none' | 'requested' | 'pending' | 'approved' | 'rejected';
  expert_name?: string;

  // 配送情報
  shipping_method: 'DDP' | 'DDU';
  shipping_cost?: number;
  shipping_from: {
    country: string;
    postal_code?: string;
    city?: string;
  };
  ships_to?: string[]; // ISO country codes

  // ステータス
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'ended' | 'sold' | 'unsold' | 'cancelled';

  // タイムスタンプ
  created_at: string;
  updated_at: string;
  auction_start?: string;
  auction_end?: string;

  // その他
  currency: string;
  seller_id: string;
  lot_number?: string;
  provenance?: string; // 来歴情報
  literature?: string; // 文献情報
  exhibited?: string; // 展示歴
}

/**
 * ロット作成リクエスト
 */
export interface CreateLotRequest {
  title: string;
  description: string;
  category_id: string;
  starting_price: number;
  reserve_price?: number;
  estimated_value?: {
    min: number;
    max: number;
  };
  condition: 'new' | 'as_new' | 'very_good' | 'good' | 'fair' | 'poor';
  condition_description?: string;
  authenticity_status?: 'uncertified' | 'certified';
  request_expertise?: boolean;
  shipping_method: 'DDP' | 'DDU';
  shipping_from: {
    country: string;
    postal_code?: string;
    city?: string;
  };
  ships_to?: string[];
  provenance?: string;
  literature?: string;
  exhibited?: string;
  currency?: string;
}

/**
 * 画像情報
 */
export interface CatawikiImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  position: number;
  width?: number;
  height?: number;
}

/**
 * カテゴリ情報
 */
export interface CatawikiCategory {
  id: string;
  name: string;
  parent_id?: string;
  level: number;
  path: string[];
  requires_expertise: boolean;
  commission_rate: number; // percentage
  description?: string;
}

/**
 * オークション情報
 */
export interface CatawikiAuction {
  id: string;
  title: string;
  category_id: string;
  status: 'upcoming' | 'live' | 'ended';
  start_date: string;
  end_date: string;
  lot_count: number;
  currency: string;
  timezone: string;
}

/**
 * 入札情報
 */
export interface CatawikiBid {
  id: string;
  lot_id: string;
  bidder_id: string;
  amount: number;
  currency: string;
  timestamp: string;
  is_winning: boolean;
}

/**
 * エキスパート（鑑定士）情報
 */
export interface CatawikiExpert {
  id: string;
  name: string;
  specialization: string[];
  bio?: string;
  avatar_url?: string;
}

/**
 * エキスパートリクエスト
 */
export interface ExpertiseRequest {
  lot_id: string;
  notes?: string;
  images?: string[];
  urgent?: boolean;
}

/**
 * エキスパート評価
 */
export interface ExpertiseEvaluation {
  id: string;
  lot_id: string;
  expert_id: string;
  expert_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_changes';
  notes: string;
  estimated_value?: {
    min: number;
    max: number;
    currency: string;
  };
  authenticity_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 販売結果
 */
export interface CatawikiSaleResult {
  lot_id: string;
  final_price: number;
  currency: string;
  bid_count: number;
  winner_id?: string;
  sold: boolean;
  auction_end: string;
  commission: number;
  net_proceeds: number;
}

/**
 * 手数料情報
 */
export interface CatawikiCommission {
  lot_id: string;
  sale_price: number;
  commission_rate: number;
  commission_amount: number;
  vat_rate?: number;
  vat_amount?: number;
  net_proceeds: number;
  currency: string;
}

/**
 * API応答
 */
export interface CatawikiApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}
