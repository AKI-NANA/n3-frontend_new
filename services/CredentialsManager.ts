/**
 * 認証情報管理サービス
 * PlatformCredentials テーブルの操作とトークン自動更新
 */

import { createClient } from '@/lib/supabase/server';
import {
  PlatformCredentials,
  RefreshTokenResponse,
  ApiClientConfig,
} from '@/types/api-credentials';
import { Platform } from '@/types/strategy';

export class CredentialsManager {
  /**
   * プラットフォームとアカウントIDから認証情報を取得
   */
  static async getCredentials(
    platform: Platform,
    accountId: number
  ): Promise<PlatformCredentials | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('platform_credentials')
      .select('*')
      .eq('platform', platform)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error(`❌ 認証情報の取得に失敗: ${platform} #${accountId}`, error);
      return null;
    }

    return data as PlatformCredentials;
  }

  /**
   * トークンの有効期限をチェック
   * 期限切れの場合は自動でリフレッシュを試みる
   */
  static async ensureValidToken(
    credentials: PlatformCredentials
  ): Promise<PlatformCredentials> {
    // Auth'n'Auth Token (eBay) の場合
    if (credentials.auth_type === 'auth_n_auth') {
      if (credentials.ebay_token_expires_at) {
        const expiresAt = new Date(credentials.ebay_token_expires_at);
        const now = new Date();

        if (expiresAt <= now) {
          throw new Error('eBay Auth Token has expired. Manual renewal required.');
        }
      }
      return credentials;
    }

    // OAuth 2.0の場合（Amazon, Coupang, Shopee）
    if (credentials.auth_type === 'oauth2') {
      if (!credentials.token_expires_at) {
        return credentials; // 有効期限が設定されていない場合はそのまま
      }

      const expiresAt = new Date(credentials.token_expires_at);
      const now = new Date();
      const bufferMinutes = 10; // 10分前にリフレッシュ
      const expiresWithBuffer = new Date(expiresAt.getTime() - bufferMinutes * 60 * 1000);

      if (now >= expiresWithBuffer) {
        console.log(`🔄 トークンの有効期限が近いため自動更新: ${credentials.platform} #${credentials.account_id}`);
        return await this.refreshOAuth2Token(credentials);
      }
    }

    // Private Token / API Keyの場合はそのまま返す
    return credentials;
  }

  /**
   * OAuth 2.0 トークンを自動更新
   */
  static async refreshOAuth2Token(
    credentials: PlatformCredentials
  ): Promise<PlatformCredentials> {
    if (!credentials.refresh_token) {
      throw new Error('Refresh token not available');
    }

    let refreshResult: RefreshTokenResponse;

    // プラットフォーム別のリフレッシュロジック
    switch (credentials.platform) {
      case 'amazon':
        refreshResult = await this.refreshAmazonToken(credentials);
        break;
      case 'shopee':
        refreshResult = await this.refreshShopeeToken(credentials);
        break;
      default:
        throw new Error(`Token refresh not implemented for ${credentials.platform}`);
    }

    if (!refreshResult.success || !refreshResult.access_token) {
      throw new Error(`Token refresh failed: ${refreshResult.error}`);
    }

    // DBを更新
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('platform_credentials')
      .update({
        access_token: refreshResult.access_token,
        token_expires_at: refreshResult.token_expires_at,
        last_token_refresh: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('credential_id', credentials.credential_id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update credentials in DB: ${error?.message}`);
    }

    console.log(`✅ トークン更新成功: ${credentials.platform} #${credentials.account_id}`);
    return data as PlatformCredentials;
  }

  /**
   * Amazon SP-API トークンリフレッシュ
   */
  private static async refreshAmazonToken(
    credentials: PlatformCredentials
  ): Promise<RefreshTokenResponse> {
    try {
      // Amazon LWA (Login with Amazon) Token Endpoint
      const tokenEndpoint = 'https://api.amazon.com/auth/o2/token';

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refresh_token!,
          client_id: credentials.api_key!,
          client_secret: credentials.api_secret!,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Amazon token refresh failed: ${errorData.error_description || errorData.error}`,
        };
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        success: true,
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_expires_at: expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Shopee トークンリフレッシュ
   */
  private static async refreshShopeeToken(
    credentials: PlatformCredentials
  ): Promise<RefreshTokenResponse> {
    try {
      // Shopee Refresh Token Endpoint (実装例)
      const baseUrl = credentials.api_base_url || 'https://partner.shopeemobile.com';
      const endpoint = `${baseUrl}/api/v2/auth/access_token/get`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: parseInt(credentials.api_key!),
          refresh_token: credentials.refresh_token,
          shop_id: credentials.account_id,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Shopee token refresh failed: ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          error: `Shopee API error: ${data.message}`,
        };
      }

      const expiresAt = new Date(Date.now() + data.expire_in * 1000).toISOString();

      return {
        success: true,
        access_token: data.access_token,
        expires_in: data.expire_in,
        token_expires_at: expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * APIクライアント設定を取得
   */
  static async getClientConfig(
    platform: Platform,
    accountId: number
  ): Promise<ApiClientConfig> {
    const credentials = await this.getCredentials(platform, accountId);

    if (!credentials) {
      throw new Error(`Credentials not found for ${platform} #${accountId}`);
    }

    // トークンの有効性を確認・更新
    const validCredentials = await this.ensureValidToken(credentials);

    return {
      credentials: validCredentials,
      sandbox: validCredentials.is_sandbox,
      timeout: 30000,      // 30秒
      retryCount: 3,       // 3回まで自動リトライ
    };
  }
}
