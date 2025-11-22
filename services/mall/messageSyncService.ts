// messageSyncService.ts: マルチモールメッセージ同期サービス (I3-1)

import { createClient } from "@supabase/supabase-js";

// メッセージステータス
export enum MessageStatus {
  UNREAD = "UNREAD",
  READ = "READ",
  REPLIED = "REPLIED",
  ARCHIVED = "ARCHIVED",
}

// モール識別子
export enum MarketplaceId {
  AMAZON = "AMAZON",
  EBAY = "EBAY",
  SHOPEE = "SHOPEE",
  RAKUTEN = "RAKUTEN",
  LAZADA = "LAZADA",
  QOO10 = "QOO10",
  COUPANG = "COUPANG",
  BUYMA = "BUYMA",
}

// 統一メッセージ形式（unified_messagesテーブル）
export interface UnifiedMessage {
  messageId: string;
  externalMessageId: string; // モールのメッセージID
  marketplace: MarketplaceId;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  subject: string;
  body: string;
  status: MessageStatus;
  orderId?: string;
  threadId?: string;
  isUrgent: boolean;
  receivedAt: Date;
  readAt?: Date;
  repliedAt?: Date;
  metadata?: any;
}

/**
 * Amazon SP-API メッセージ取得
 */
class AmazonMessageSync {
  private apiKey: string;
  private refreshToken: string;

  constructor(apiKey: string, refreshToken: string) {
    this.apiKey = apiKey;
    this.refreshToken = refreshToken;
  }

  async fetchMessages(since?: Date): Promise<UnifiedMessage[]> {
    // Amazon SP-API Notifications API の実装
    // https://developer-docs.amazon.com/sp-api/docs/notifications-api-v1-reference

    try {
      // 実際のAPI呼び出しはここに実装
      // const response = await fetch(amazonApiEndpoint, { ... });

      // モックデータ（開発用）
      console.log("Fetching Amazon messages...");

      return this.mockAmazonMessages();
    } catch (error) {
      console.error("Amazon message fetch failed:", error);
      return [];
    }
  }

  private mockAmazonMessages(): UnifiedMessage[] {
    return [
      {
        messageId: `amz_${Date.now()}_1`,
        externalMessageId: "AMZ123456789",
        marketplace: MarketplaceId.AMAZON,
        customerName: "John Doe",
        customerEmail: "john@example.com",
        subject: "Question about product",
        body: "Is this product still in stock?",
        status: MessageStatus.UNREAD,
        isUrgent: false,
        receivedAt: new Date(),
      },
    ];
  }
}

/**
 * eBay Trading API メッセージ取得
 */
class EbayMessageSync {
  private apiKey: string;
  private oauthToken: string;

  constructor(apiKey: string, oauthToken: string) {
    this.apiKey = apiKey;
    this.oauthToken = oauthToken;
  }

  async fetchMessages(since?: Date): Promise<UnifiedMessage[]> {
    // eBay Trading API GetMyMessages の実装
    // https://developer.ebay.com/DevZone/XML/docs/Reference/eBay/GetMyMessages.html

    try {
      console.log("Fetching eBay messages...");

      return this.mockEbayMessages();
    } catch (error) {
      console.error("eBay message fetch failed:", error);
      return [];
    }
  }

  private mockEbayMessages(): UnifiedMessage[] {
    return [
      {
        messageId: `ebay_${Date.now()}_1`,
        externalMessageId: "EBAY987654321",
        marketplace: MarketplaceId.EBAY,
        customerName: "Jane Smith",
        subject: "Shipping question",
        body: "When will my order ship?",
        status: MessageStatus.UNREAD,
        isUrgent: true,
        receivedAt: new Date(),
      },
    ];
  }
}

/**
 * Shopee Partner API メッセージ取得
 */
class ShopeeMessageSync {
  private partnerId: string;
  private partnerKey: string;
  private shopId: string;

  constructor(partnerId: string, partnerKey: string, shopId: string) {
    this.partnerId = partnerId;
    this.partnerKey = partnerKey;
    this.shopId = shopId;
  }

  async fetchMessages(since?: Date): Promise<UnifiedMessage[]> {
    // Shopee Partner API - Get Message List
    // https://open.shopee.com/documents/v2/v2.message.get_message_list

    try {
      console.log("Fetching Shopee messages...");

      return this.mockShopeeMessages();
    } catch (error) {
      console.error("Shopee message fetch failed:", error);
      return [];
    }
  }

  private mockShopeeMessages(): UnifiedMessage[] {
    return [];
  }
}

/**
 * Rakuten API メッセージ取得
 */
class RakutenMessageSync {
  private serviceSecret: string;
  private licenseKey: string;

  constructor(serviceSecret: string, licenseKey: string) {
    this.serviceSecret = serviceSecret;
    this.licenseKey = licenseKey;
  }

  async fetchMessages(since?: Date): Promise<UnifiedMessage[]> {
    // Rakuten RMS API の実装

    try {
      console.log("Fetching Rakuten messages...");

      return this.mockRakutenMessages();
    } catch (error) {
      console.error("Rakuten message fetch failed:", error);
      return [];
    }
  }

  private mockRakutenMessages(): UnifiedMessage[] {
    return [];
  }
}

/**
 * メッセージ同期サービス
 */
export class MessageSyncService {
  private supabase: any;
  private amazonSync?: AmazonMessageSync;
  private ebaySync?: EbayMessageSync;
  private shopeeSync?: ShopeeMessageSync;
  private rakutenSync?: RakutenMessageSync;

  constructor(config?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    amazonApiKey?: string;
    amazonRefreshToken?: string;
    ebayApiKey?: string;
    ebayOauthToken?: string;
    shopeePartnerId?: string;
    shopeePartnerKey?: string;
    shopeeShopId?: string;
    rakutenServiceSecret?: string;
    rakutenLicenseKey?: string;
  }) {
    // Supabase クライアント初期化
    const supabaseUrl =
      config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      config?.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    // 各モールの同期クライアント初期化
    if (config?.amazonApiKey && config?.amazonRefreshToken) {
      this.amazonSync = new AmazonMessageSync(
        config.amazonApiKey,
        config.amazonRefreshToken
      );
    }

    if (config?.ebayApiKey && config?.ebayOauthToken) {
      this.ebaySync = new EbayMessageSync(
        config.ebayApiKey,
        config.ebayOauthToken
      );
    }

    if (
      config?.shopeePartnerId &&
      config?.shopeePartnerKey &&
      config?.shopeeShopId
    ) {
      this.shopeeSync = new ShopeeMessageSync(
        config.shopeePartnerId,
        config.shopeePartnerKey,
        config.shopeeShopId
      );
    }

    if (config?.rakutenServiceSecret && config?.rakutenLicenseKey) {
      this.rakutenSync = new RakutenMessageSync(
        config.rakutenServiceSecret,
        config.rakutenLicenseKey
      );
    }
  }

  /**
   * I3-1: 全モールからメッセージをポーリング
   */
  async pollAllMalls(since?: Date): Promise<{
    totalMessages: number;
    newMessages: number;
    byMarketplace: Record<string, number>;
  }> {
    const allMessages: UnifiedMessage[] = [];
    const byMarketplace: Record<string, number> = {};

    // Amazon
    if (this.amazonSync) {
      try {
        const messages = await this.amazonSync.fetchMessages(since);
        allMessages.push(...messages);
        byMarketplace[MarketplaceId.AMAZON] = messages.length;
      } catch (error) {
        console.error("Amazon sync failed:", error);
        byMarketplace[MarketplaceId.AMAZON] = 0;
      }
    }

    // eBay
    if (this.ebaySync) {
      try {
        const messages = await this.ebaySync.fetchMessages(since);
        allMessages.push(...messages);
        byMarketplace[MarketplaceId.EBAY] = messages.length;
      } catch (error) {
        console.error("eBay sync failed:", error);
        byMarketplace[MarketplaceId.EBAY] = 0;
      }
    }

    // Shopee
    if (this.shopeeSync) {
      try {
        const messages = await this.shopeeSync.fetchMessages(since);
        allMessages.push(...messages);
        byMarketplace[MarketplaceId.SHOPEE] = messages.length;
      } catch (error) {
        console.error("Shopee sync failed:", error);
        byMarketplace[MarketplaceId.SHOPEE] = 0;
      }
    }

    // Rakuten
    if (this.rakutenSync) {
      try {
        const messages = await this.rakutenSync.fetchMessages(since);
        allMessages.push(...messages);
        byMarketplace[MarketplaceId.RAKUTEN] = messages.length;
      } catch (error) {
        console.error("Rakuten sync failed:", error);
        byMarketplace[MarketplaceId.RAKUTEN] = 0;
      }
    }

    // データベースに保存
    const newMessages = await this.saveToDatabase(allMessages);

    return {
      totalMessages: allMessages.length,
      newMessages,
      byMarketplace,
    };
  }

  /**
   * データベースへの保存
   */
  private async saveToDatabase(
    messages: UnifiedMessage[]
  ): Promise<number> {
    if (!this.supabase || messages.length === 0) {
      return 0;
    }

    try {
      let newCount = 0;

      for (const message of messages) {
        // 重複チェック
        const { data: existing } = await this.supabase
          .from("unified_messages")
          .select("message_id")
          .eq("external_message_id", message.externalMessageId)
          .eq("marketplace", message.marketplace)
          .single();

        if (existing) {
          // 既存メッセージは更新のみ
          await this.supabase
            .from("unified_messages")
            .update({
              status: message.status,
              read_at: message.readAt,
              replied_at: message.repliedAt,
            })
            .eq("message_id", existing.message_id);
        } else {
          // 新規メッセージを挿入
          const { error } = await this.supabase
            .from("unified_messages")
            .insert({
              message_id: message.messageId,
              external_message_id: message.externalMessageId,
              marketplace: message.marketplace,
              customer_id: message.customerId,
              customer_name: message.customerName,
              customer_email: message.customerEmail,
              subject: message.subject,
              body: message.body,
              status: message.status,
              order_id: message.orderId,
              thread_id: message.threadId,
              is_urgent: message.isUrgent,
              received_at: message.receivedAt.toISOString(),
              metadata: message.metadata,
            });

          if (!error) {
            newCount++;
          }
        }
      }

      return newCount;
    } catch (error) {
      console.error("Database save failed:", error);
      return 0;
    }
  }

  /**
   * 未読メッセージの取得
   */
  async getUnreadMessages(
    marketplace?: MarketplaceId
  ): Promise<UnifiedMessage[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      let query = this.supabase
        .from("unified_messages")
        .select("*")
        .eq("status", MessageStatus.UNREAD)
        .order("received_at", { ascending: false });

      if (marketplace) {
        query = query.eq("marketplace", marketplace);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch unread messages:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Get unread messages failed:", error);
      return [];
    }
  }

  /**
   * メッセージを既読にマーク
   */
  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from("unified_messages")
        .update({
          status: MessageStatus.READ,
          read_at: new Date().toISOString(),
        })
        .eq("message_id", messageId);

      return !error;
    } catch (error) {
      console.error("Mark as read failed:", error);
      return false;
    }
  }

  /**
   * 緊急メッセージの検出とトリガー
   */
  async detectUrgentMessages(): Promise<UnifiedMessage[]> {
    const unreadMessages = await this.getUnreadMessages();

    const urgentMessages = unreadMessages.filter((msg) => {
      // キーワードベースの緊急度判定
      const urgentKeywords = [
        "refund",
        "dispute",
        "complaint",
        "urgent",
        "asap",
        "immediately",
        "lawyer",
        "legal",
      ];

      const lowerBody = msg.body.toLowerCase();
      const lowerSubject = msg.subject.toLowerCase();

      return urgentKeywords.some(
        (keyword) =>
          lowerBody.includes(keyword) || lowerSubject.includes(keyword)
      );
    });

    // 緊急フラグを更新
    for (const msg of urgentMessages) {
      if (!msg.isUrgent) {
        await this.supabase
          .from("unified_messages")
          .update({ is_urgent: true })
          .eq("message_id", msg.messageId);
      }
    }

    return urgentMessages;
  }
}

// デフォルトインスタンス
let defaultService: MessageSyncService | null = null;

export function getMessageSyncService(): MessageSyncService {
  if (!defaultService) {
    defaultService = new MessageSyncService({
      // 環境変数から設定を読み込み
      amazonApiKey: process.env.AMAZON_SP_API_KEY,
      amazonRefreshToken: process.env.AMAZON_REFRESH_TOKEN,
      ebayApiKey: process.env.EBAY_API_KEY,
      ebayOauthToken: process.env.EBAY_OAUTH_TOKEN,
      shopeePartnerId: process.env.SHOPEE_PARTNER_ID,
      shopeePartnerKey: process.env.SHOPEE_PARTNER_KEY,
      shopeeShopId: process.env.SHOPEE_SHOP_ID,
      rakutenServiceSecret: process.env.RAKUTEN_SERVICE_SECRET,
      rakutenLicenseKey: process.env.RAKUTEN_LICENSE_KEY,
    });
  }
  return defaultService;
}
