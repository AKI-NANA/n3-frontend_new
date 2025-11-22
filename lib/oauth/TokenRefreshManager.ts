// TokenRefreshManager.ts: OAuth トークン自動リフレッシュマネージャー (I3-4)

import { createClient } from "@supabase/supabase-js";

// OAuth トークン情報
export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
}

// マーケットプレイス OAuth 設定
export interface MarketplaceOAuthConfig {
  marketplace: string; // "eBay", "Etsy", "Catawiki", "Bonanza", etc.
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  refreshTokenEndpoint?: string; // デフォルトはtokenEndpointと同じ
  scope?: string;
}

// トークンストレージインターフェース
export interface TokenStorage {
  getToken(marketplace: string): Promise<OAuthToken | null>;
  saveToken(marketplace: string, token: OAuthToken): Promise<boolean>;
  deleteToken(marketplace: string): Promise<boolean>;
}

/**
 * Supabase ベースのトークンストレージ
 */
export class SupabaseTokenStorage implements TokenStorage {
  private supabase: any;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  async getToken(marketplace: string): Promise<OAuthToken | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from("oauth_tokens")
        .select("*")
        .eq("marketplace", marketplace)
        .single();

      if (error || !data) return null;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at),
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      console.error(`Failed to get token for ${marketplace}:`, error);
      return null;
    }
  }

  async saveToken(
    marketplace: string,
    token: OAuthToken
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase.from("oauth_tokens").upsert({
        marketplace,
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        expires_at: token.expiresAt.toISOString(),
        token_type: token.tokenType,
        scope: token.scope,
        updated_at: new Date().toISOString(),
      });

      return !error;
    } catch (error) {
      console.error(`Failed to save token for ${marketplace}:`, error);
      return false;
    }
  }

  async deleteToken(marketplace: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from("oauth_tokens")
        .delete()
        .eq("marketplace", marketplace);

      return !error;
    } catch (error) {
      console.error(`Failed to delete token for ${marketplace}:`, error);
      return false;
    }
  }
}

/**
 * OAuth トークン自動リフレッシュマネージャー
 */
export class TokenRefreshManager {
  private storage: TokenStorage;
  private configs: Map<string, MarketplaceOAuthConfig>;
  private refreshPromises: Map<string, Promise<OAuthToken | null>>;

  constructor(storage?: TokenStorage) {
    this.storage = storage || new SupabaseTokenStorage();
    this.configs = new Map();
    this.refreshPromises = new Map();
  }

  /**
   * マーケットプレイスの OAuth 設定を登録
   */
  registerMarketplace(config: MarketplaceOAuthConfig): void {
    this.configs.set(config.marketplace, config);
  }

  /**
   * I3-4: トークンの取得（自動リフレッシュ付き）
   */
  async getValidToken(marketplace: string): Promise<string | null> {
    const token = await this.storage.getToken(marketplace);

    if (!token) {
      console.warn(`No token found for ${marketplace}`);
      return null;
    }

    // トークンの有効期限をチェック
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5分のバッファ

    if (token.expiresAt.getTime() > now.getTime() + bufferTime) {
      // トークンはまだ有効
      return token.accessToken;
    }

    // トークン期限切れ - リフレッシュが必要
    console.log(`Token expired for ${marketplace}, refreshing...`);

    const refreshedToken = await this.refreshToken(marketplace);

    if (refreshedToken) {
      return refreshedToken.accessToken;
    }

    console.error(`Failed to refresh token for ${marketplace}`);
    return null;
  }

  /**
   * トークンのリフレッシュ
   */
  async refreshToken(marketplace: string): Promise<OAuthToken | null> {
    // 既にリフレッシュ中の場合は、そのPromiseを返す
    if (this.refreshPromises.has(marketplace)) {
      return this.refreshPromises.get(marketplace)!;
    }

    const config = this.configs.get(marketplace);
    if (!config) {
      console.error(`No OAuth config found for ${marketplace}`);
      return null;
    }

    const currentToken = await this.storage.getToken(marketplace);
    if (!currentToken) {
      console.error(`No current token found for ${marketplace}`);
      return null;
    }

    // リフレッシュPromiseを作成
    const refreshPromise = this.performTokenRefresh(
      config,
      currentToken.refreshToken
    );

    this.refreshPromises.set(marketplace, refreshPromise);

    try {
      const newToken = await refreshPromise;

      if (newToken) {
        await this.storage.saveToken(marketplace, newToken);
      }

      return newToken;
    } finally {
      this.refreshPromises.delete(marketplace);
    }
  }

  /**
   * 実際のトークンリフレッシュ処理
   */
  private async performTokenRefresh(
    config: MarketplaceOAuthConfig,
    refreshToken: string
  ): Promise<OAuthToken | null> {
    try {
      const endpoint =
        config.refreshTokenEndpoint || config.tokenEndpoint;

      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      if (config.scope) {
        params.append("scope", config.scope);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(
          `Token refresh failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return this.parseTokenResponse(data);
    } catch (error) {
      console.error(
        `Token refresh failed for ${config.marketplace}:`,
        error
      );
      return null;
    }
  }

  /**
   * トークンレスポンスのパース
   */
  private parseTokenResponse(data: any): OAuthToken {
    const expiresIn = data.expires_in || 3600; // デフォルト1時間
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      tokenType: data.token_type || "Bearer",
      scope: data.scope,
    };
  }

  /**
   * トークンの有効期限チェック
   */
  async isTokenValid(marketplace: string): Promise<boolean> {
    const token = await this.storage.getToken(marketplace);

    if (!token) return false;

    const now = new Date();
    return token.expiresAt.getTime() > now.getTime();
  }

  /**
   * トークンの手動設定
   */
  async setToken(
    marketplace: string,
    token: OAuthToken
  ): Promise<boolean> {
    return this.storage.saveToken(marketplace, token);
  }

  /**
   * トークンの削除
   */
  async revokeToken(marketplace: string): Promise<boolean> {
    return this.storage.deleteToken(marketplace);
  }

  /**
   * 全マーケットプレイスのトークンステータスを取得
   */
  async getAllTokenStatus(): Promise<
    Array<{ marketplace: string; valid: boolean; expiresAt: Date | null }>
  > {
    const statuses: Array<{
      marketplace: string;
      valid: boolean;
      expiresAt: Date | null;
    }> = [];

    for (const marketplace of this.configs.keys()) {
      const token = await this.storage.getToken(marketplace);

      statuses.push({
        marketplace,
        valid: token
          ? token.expiresAt.getTime() > Date.now()
          : false,
        expiresAt: token ? token.expiresAt : null,
      });
    }

    return statuses;
  }
}

/**
 * 事前設定されたマーケットプレイス設定
 */
export const MARKETPLACE_CONFIGS: MarketplaceOAuthConfig[] = [
  {
    marketplace: "eBay",
    clientId: process.env.EBAY_CLIENT_ID || "",
    clientSecret: process.env.EBAY_CLIENT_SECRET || "",
    tokenEndpoint:
      "https://api.ebay.com/identity/v1/oauth2/token",
    scope:
      "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory",
  },
  {
    marketplace: "Etsy",
    clientId: process.env.ETSY_CLIENT_ID || "",
    clientSecret: process.env.ETSY_CLIENT_SECRET || "",
    tokenEndpoint: "https://api.etsy.com/v3/public/oauth/token",
    scope: "listings_r listings_w transactions_r",
  },
  {
    marketplace: "Shopee",
    clientId: process.env.SHOPEE_PARTNER_ID || "",
    clientSecret: process.env.SHOPEE_PARTNER_KEY || "",
    tokenEndpoint: "https://partner.shopeemobile.com/api/v2/auth/token/get",
  },
  {
    marketplace: "Bonanza",
    clientId: process.env.BONANZA_CLIENT_ID || "",
    clientSecret: process.env.BONANZA_CLIENT_SECRET || "",
    tokenEndpoint: "https://api.bonanza.com/api_requests/secure_request",
  },
];

// デフォルトマネージャーインスタンス
let defaultManager: TokenRefreshManager | null = null;

export function getTokenRefreshManager(): TokenRefreshManager {
  if (!defaultManager) {
    defaultManager = new TokenRefreshManager();

    // 事前設定されたマーケットプレイスを登録
    for (const config of MARKETPLACE_CONFIGS) {
      if (config.clientId && config.clientSecret) {
        defaultManager.registerMarketplace(config);
      }
    }
  }

  return defaultManager;
}

// 使用例
export const TokenRefreshExample = {
  async example() {
    const manager = getTokenRefreshManager();

    // トークンの取得（自動リフレッシュ付き）
    const ebayToken = await manager.getValidToken("eBay");
    console.log("eBay token:", ebayToken);

    // トークンのステータス確認
    const statuses = await manager.getAllTokenStatus();
    console.log("Token statuses:", statuses);
  },
};
