/**
 * API認証情報管理 - 型定義
 * 多販路出品システムの認証管理用
 */

import { Platform } from './strategy';

/**
 * 認証タイプの定義
 */
export type AuthType =
  | 'auth_n_auth'      // eBay Auth'n'Auth Token (長期トークン)
  | 'oauth2'           // OAuth 2.0 (Amazon, Coupang, Shopee)
  | 'private_token'    // Private App Token (Shopify)
  | 'api_key';         // API Key/Secret方式

/**
 * PlatformCredentials テーブルの型定義
 */
export interface PlatformCredentials {
  credential_id: number;
  platform: Platform;
  account_id: number;
  account_name: string;
  auth_type: AuthType;

  // 認証情報（暗号化推奨）
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;  // ISO 8601形式

  // API Keys
  api_key?: string | null;
  api_secret?: string | null;
  app_id?: string | null;

  // eBay専用
  ebay_auth_token?: string | null;    // Auth'n'Auth Token
  ebay_token_expires_at?: string | null;

  // 環境設定
  is_sandbox: boolean;
  api_base_url?: string | null;

  // ステータス
  is_active: boolean;
  last_token_refresh?: string | null;

  // メタデータ
  created_at: string;
  updated_at: string;
}

/**
 * 認証情報の作成リクエスト
 */
export interface CreateCredentialsRequest {
  platform: Platform;
  account_id: number;
  account_name: string;
  auth_type: AuthType;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  api_key?: string;
  api_secret?: string;
  app_id?: string;
  ebay_auth_token?: string;
  ebay_token_expires_at?: string;
  is_sandbox?: boolean;
  api_base_url?: string;
}

/**
 * トークン更新リクエスト
 */
export interface RefreshTokenRequest {
  credential_id: number;
  refresh_token: string;
}

/**
 * トークン更新レスポンス
 */
export interface RefreshTokenResponse {
  success: boolean;
  access_token?: string;
  expires_in?: number;
  token_expires_at?: string;
  error?: string;
}

/**
 * APIクライアント設定
 */
export interface ApiClientConfig {
  credentials: PlatformCredentials;
  sandbox?: boolean;
  timeout?: number;
  retryCount?: number;
}

/**
 * API呼び出し結果
 */
export interface ApiCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  status?: number;
  retryable?: boolean;  // リトライ可能なエラーか
}

/**
 * 出品ステータス
 */
export type ListingStatus =
  | '出品戦略決定済'
  | '出品処理中'
  | '出品中'
  | '出品停止'
  | 'APIリトライ待ち'
  | '出品失敗（要確認）';

/**
 * 出品結果ログ
 */
export interface ListingResultLog {
  log_id: number;
  sku: string;
  platform: Platform;
  account_id: number;
  status: ListingStatus;

  // 出品結果
  listing_id?: string | null;      // モール側のID (eBay Item ID, Amazon ASINなど)
  success: boolean;

  // エラー情報
  error_code?: string | null;
  error_message?: string | null;
  error_details?: any;               // JSONB

  // リトライ情報
  retry_count: number;
  last_retry_at?: string | null;

  // メタデータ
  created_at: string;
  updated_at: string;
}

/**
 * 排他的ロック情報
 */
export interface ExclusiveLock {
  lock_id: number;
  sku: string;
  locked_platform: Platform;
  locked_account_id: number;

  // ロック理由
  reason: 'listing_active' | 'duplicate_prevention';

  // ロック管理
  is_active: boolean;
  locked_at: string;
  unlocked_at?: string | null;

  created_at: string;
}
