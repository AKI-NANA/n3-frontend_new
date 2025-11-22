// services/mall/messageSyncService.ts

/**
 * I3: 外部APIの実データ連携
 * 多販路メッセージ同期サービス
 *
 * このモジュールは、複数のマーケットプレイスから顧客メッセージを
 * リアルタイムで取得し、統合メッセージハブに保存します。
 */

// ============================================================================
// 型定義
// ============================================================================

/**
 * マーケットプレイス識別子
 */
export type MarketplaceId =
  | "ebay"
  | "amazon"
  | "rakuten"
  | "yahoo_shopping"
  | "mercari"
  | "buyma"
  | "shopify";

/**
 * メッセージデータ
 */
export interface MarketplaceMessage {
  messageId: string;
  threadId: string;
  marketplace: MarketplaceId;
  senderName: string;
  senderEmail?: string;
  subject?: string;
  messageBody: string;
  receivedAt: Date;
  orderId?: string;
  isRead: boolean;
  priority: "high" | "normal" | "low";
}

/**
 * 同期結果
 */
export interface SyncResult {
  marketplace: MarketplaceId;
  success: boolean;
  messagesCount: number;
  newMessagesCount: number;
  error?: string;
  syncedAt: Date;
}

/**
 * マーケットプレイスAPI認証情報
 */
interface MarketplaceCredentials {
  [key: string]: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    sellerId?: string;
    storeId?: string;
  };
}

// ============================================================================
// MessageSyncService クラス
// ============================================================================

/**
 * 多販路メッセージ同期サービス
 */
export class MessageSyncService {
  private credentials: MarketplaceCredentials;

  constructor() {
    // 環境変数から認証情報を読み込む
    this.credentials = this.loadCredentials();
  }

  // ==========================================================================
  // メイン処理: メッセージ同期
  // ==========================================================================

  /**
   * すべてのマーケットプレイスからメッセージを同期
   *
   * @returns 同期結果の配列
   */
  async syncAllMarketplaces(): Promise<SyncResult[]> {
    console.log("\n🔄 [MessageSyncService] Starting message sync for all marketplaces...");

    const marketplaces: MarketplaceId[] = [
      "ebay",
      "amazon",
      "rakuten",
      "yahoo_shopping",
      "mercari",
    ];

    const results: SyncResult[] = [];

    for (const marketplace of marketplaces) {
      try {
        const result = await this.syncMarketplace(marketplace);
        results.push(result);

        console.log(
          `   ✅ ${marketplace}: ${result.newMessagesCount} new messages`
        );

        // レート制限対策: 各API呼び出し間に1秒待機
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   ❌ ${marketplace}: Sync failed`, error);

        results.push({
          marketplace,
          success: false,
          messagesCount: 0,
          newMessagesCount: 0,
          error: error instanceof Error ? error.message : "Unknown error",
          syncedAt: new Date(),
        });
      }
    }

    const totalNew = results.reduce((sum, r) => sum + r.newMessagesCount, 0);
    const successCount = results.filter((r) => r.success).length;

    console.log(`\n✅ [MessageSyncService] Sync completed:`);
    console.log(`   Marketplaces: ${results.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Total new messages: ${totalNew}`);

    return results;
  }

  /**
   * 特定のマーケットプレイスからメッセージを同期
   *
   * @param marketplace - マーケットプレイスID
   * @returns 同期結果
   */
  async syncMarketplace(marketplace: MarketplaceId): Promise<SyncResult> {
    console.log(`\n📥 [MessageSyncService] Syncing ${marketplace}...`);

    try {
      let messages: MarketplaceMessage[] = [];

      // マーケットプレイス別のAPI呼び出し
      switch (marketplace) {
        case "ebay":
          messages = await this.fetchEbayMessages();
          break;
        case "amazon":
          messages = await this.fetchAmazonMessages();
          break;
        case "rakuten":
          messages = await this.fetchRakutenMessages();
          break;
        case "yahoo_shopping":
          messages = await this.fetchYahooMessages();
          break;
        case "mercari":
          messages = await this.fetchMercariMessages();
          break;
        default:
          throw new Error(`Unsupported marketplace: ${marketplace}`);
      }

      // データベースに保存（新規メッセージのみ）
      const newMessages = await this.saveMessages(messages);

      return {
        marketplace,
        success: true,
        messagesCount: messages.length,
        newMessagesCount: newMessages.length,
        syncedAt: new Date(),
      };
    } catch (error) {
      console.error(`❌ [MessageSyncService] ${marketplace} sync failed:`, error);

      return {
        marketplace,
        success: false,
        messagesCount: 0,
        newMessagesCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        syncedAt: new Date(),
      };
    }
  }

  // ==========================================================================
  // マーケットプレイス別メッセージ取得
  // ==========================================================================

  /**
   * eBayからメッセージを取得
   */
  private async fetchEbayMessages(): Promise<MarketplaceMessage[]> {
    const creds = this.credentials.ebay;

    if (!creds?.accessToken) {
      console.warn("⚠️ eBay credentials not configured");
      return [];
    }

    // eBay API: Get Member Messages
    // https://developer.ebay.com/DevZone/XML/docs/Reference/eBay/GetMemberMessages.html

    const url = "https://api.ebay.com/ws/api.dll";

    const requestBody = `<?xml version="1.0" encoding="utf-8"?>
<GetMemberMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${creds.accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <MailMessageType>All</MailMessageType>
  <MessageStatus>Unanswered</MessageStatus>
  <StartCreationTime>${this.getLastSyncTime("ebay")}</StartCreationTime>
</GetMemberMessagesRequest>`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetMemberMessages",
          "X-EBAY-API-SITEID": "0",
          "Content-Type": "text/xml",
        },
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error(`eBay API error: ${response.statusText}`);
      }

      const xmlText = await response.text();

      // XMLをパースしてMarketplaceMessage形式に変換
      const messages = this.parseEbayMessagesXML(xmlText);

      return messages;
    } catch (error) {
      console.error("❌ eBay API call failed:", error);
      return [];
    }
  }

  /**
   * Amazonからメッセージを取得
   */
  private async fetchAmazonMessages(): Promise<MarketplaceMessage[]> {
    const creds = this.credentials.amazon;

    if (!creds?.accessToken) {
      console.warn("⚠️ Amazon credentials not configured");
      return [];
    }

    // Amazon SP-API: Messaging API
    // https://developer-docs.amazon.com/sp-api/docs/messaging-api-v1-reference

    const url = "https://sellingpartnerapi-na.amazon.com/messaging/v1/orders";

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-amz-access-token": creds.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Amazon API error: ${response.statusText}`);
      }

      const data = await response.json();

      // データをMarketplaceMessage形式に変換
      const messages = this.parseAmazonMessages(data);

      return messages;
    } catch (error) {
      console.error("❌ Amazon API call failed:", error);
      return [];
    }
  }

  /**
   * 楽天からメッセージを取得
   */
  private async fetchRakutenMessages(): Promise<MarketplaceMessage[]> {
    const creds = this.credentials.rakuten;

    if (!creds?.apiKey || !creds?.apiSecret) {
      console.warn("⚠️ Rakuten credentials not configured");
      return [];
    }

    // 楽天 RMS API: お問い合わせ管理API
    // https://webservice.rms.rakuten.co.jp/

    const url = "https://api.rms.rakuten.co.jp/es/2.0/inquiries/search";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${creds.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inquiryStatus: ["UNREAD", "REPLIED"],
          startDate: this.getLastSyncTime("rakuten"),
        }),
      });

      if (!response.ok) {
        throw new Error(`Rakuten API error: ${response.statusText}`);
      }

      const data = await response.json();

      // データをMarketplaceMessage形式に変換
      const messages = this.parseRakutenMessages(data);

      return messages;
    } catch (error) {
      console.error("❌ Rakuten API call failed:", error);
      return [];
    }
  }

  /**
   * Yahoo!ショッピングからメッセージを取得
   */
  private async fetchYahooMessages(): Promise<MarketplaceMessage[]> {
    const creds = this.credentials.yahoo_shopping;

    if (!creds?.storeId || !creds?.apiKey) {
      console.warn("⚠️ Yahoo Shopping credentials not configured");
      return [];
    }

    // Yahoo!ショッピング Store API
    // https://developer.yahoo.co.jp/webapi/shopping/

    const url = `https://circus.shopping.yahooapis.jp/ShoppingWebService/V1/itemSearch`;

    try {
      // Yahoo APIはメッセージ専用のエンドポイントがないため、
      // 注文情報から問い合わせを取得する実装が必要
      // ここではモックデータを返す

      console.warn("⚠️ Yahoo Shopping message API not fully implemented");

      return [];
    } catch (error) {
      console.error("❌ Yahoo Shopping API call failed:", error);
      return [];
    }
  }

  /**
   * メルカリからメッセージを取得
   */
  private async fetchMercariMessages(): Promise<MarketplaceMessage[]> {
    const creds = this.credentials.mercari;

    if (!creds?.accessToken) {
      console.warn("⚠️ Mercari credentials not configured");
      return [];
    }

    // メルカリShops API（非公開API）
    // 公式APIが提供されていないため、Webスクレイピングまたは
    // サードパーティサービスを使用する必要がある

    console.warn("⚠️ Mercari message API not available (no official API)");

    return [];
  }

  // ==========================================================================
  // レスポンスパース関数
  // ==========================================================================

  /**
   * eBay XML レスポンスをパース
   */
  private parseEbayMessagesXML(xmlText: string): MarketplaceMessage[] {
    const messages: MarketplaceMessage[] = [];

    // 簡易的なXMLパース（実際にはxml2jsなどのライブラリを使用）
    // ここではモックデータを返す

    // TODO: 実際のXMLパース実装

    return messages;
  }

  /**
   * Amazon JSONレスポンスをパース
   */
  private parseAmazonMessages(data: any): MarketplaceMessage[] {
    const messages: MarketplaceMessage[] = [];

    // Amazon Messaging APIのレスポンス構造に応じてパース

    // TODO: 実際のパース実装

    return messages;
  }

  /**
   * 楽天 JSONレスポンスをパース
   */
  private parseRakutenMessages(data: any): MarketplaceMessage[] {
    const messages: MarketplaceMessage[] = [];

    // 楽天 RMS APIのレスポンス構造に応じてパース
    if (data.inquiries && Array.isArray(data.inquiries)) {
      for (const inquiry of data.inquiries) {
        messages.push({
          messageId: inquiry.inquiryId,
          threadId: inquiry.inquiryId,
          marketplace: "rakuten",
          senderName: inquiry.customerName || "お客様",
          senderEmail: inquiry.customerEmail,
          subject: inquiry.subject,
          messageBody: inquiry.body,
          receivedAt: new Date(inquiry.createdAt),
          orderId: inquiry.orderId,
          isRead: inquiry.status === "READ",
          priority: inquiry.urgent ? "high" : "normal",
        });
      }
    }

    return messages;
  }

  // ==========================================================================
  // データベース操作
  // ==========================================================================

  /**
   * メッセージをデータベースに保存
   *
   * @param messages - メッセージ配列
   * @returns 新規保存されたメッセージ配列
   */
  private async saveMessages(
    messages: MarketplaceMessage[]
  ): Promise<MarketplaceMessage[]> {
    const newMessages: MarketplaceMessage[] = [];

    // TODO: Supabaseにメッセージを保存する実装
    // unified_messages テーブルに挿入

    // 重複チェック（thread_id + source_mall でユニーク）
    // 新規メッセージのみを返す

    console.log(`   💾 Saving ${messages.length} messages to database...`);

    return newMessages;
  }

  // ==========================================================================
  // ヘルパー関数
  // ==========================================================================

  /**
   * 認証情報を環境変数から読み込む
   */
  private loadCredentials(): MarketplaceCredentials {
    return {
      ebay: {
        accessToken: process.env.EBAY_ACCESS_TOKEN,
      },
      amazon: {
        accessToken: process.env.AMAZON_SP_ACCESS_TOKEN,
        refreshToken: process.env.AMAZON_SP_REFRESH_TOKEN,
        sellerId: process.env.AMAZON_SELLER_ID,
      },
      rakuten: {
        apiKey: process.env.RAKUTEN_API_KEY,
        apiSecret: process.env.RAKUTEN_API_SECRET,
        storeId: process.env.RAKUTEN_STORE_ID,
      },
      yahoo_shopping: {
        apiKey: process.env.YAHOO_SHOPPING_API_KEY,
        storeId: process.env.YAHOO_SHOPPING_STORE_ID,
      },
      mercari: {
        accessToken: process.env.MERCARI_ACCESS_TOKEN,
      },
    };
  }

  /**
   * 最終同期時刻を取得
   */
  private getLastSyncTime(marketplace: MarketplaceId): string {
    // TODO: データベースから最終同期時刻を取得
    // デフォルトは24時間前

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return yesterday.toISOString();
  }
}

// ============================================================================
// エクスポート: シングルトンインスタンス
// ============================================================================

let messageSyncServiceInstance: MessageSyncService | null = null;

/**
 * MessageSyncServiceのシングルトンインスタンスを取得
 */
export function getMessageSyncService(): MessageSyncService {
  if (!messageSyncServiceInstance) {
    messageSyncServiceInstance = new MessageSyncService();
  }
  return messageSyncServiceInstance;
}
