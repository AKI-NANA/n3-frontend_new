/**
 * I3: 外部API実データ連携 - 多モールメッセージ同期サービス
 * eBay, Amazon, Shopee などから新着メッセージを取得し、unified_messages に保存
 */

import { createClient } from '@supabase/supabase-js';

// ==========================================
// 型定義
// ==========================================

interface MarketplaceMessage {
  marketplace: string;
  marketplaceMessageId: string;
  threadId?: string;
  direction: 'inbound' | 'outbound';
  fromUser: string;
  toUser: string;
  subject?: string;
  body: string;
  messageType?: string;
  receivedAt: Date;
  orderNumber?: string;
}

interface SyncResult {
  marketplace: string;
  success: boolean;
  newMessages: number;
  error?: string;
}

// ==========================================
// Supabase クライアント
// ==========================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ==========================================
// MessageSyncService クラス
// ==========================================

export class MessageSyncService {
  private ebayApiKey: string;
  private amazonMwsKey: string;
  private shopeePartnerId: string;

  constructor() {
    this.ebayApiKey = process.env.EBAY_API_KEY || '';
    this.amazonMwsKey = process.env.AMAZON_MWS_KEY || '';
    this.shopeePartnerId = process.env.SHOPEE_PARTNER_ID || '';
  }

  /**
   * 全モールからメッセージを同期
   */
  async pollAllMalls(): Promise<SyncResult[]> {
    console.log('🔄 全モールメッセージポーリング開始...');

    const results: SyncResult[] = [];

    // 各モールから並列でメッセージを取得
    const [ebayResult, amazonResult, shopeeResult, mercariResult] = await Promise.allSettled([
      this.syncEbayMessages(),
      this.syncAmazonMessages(),
      this.syncShopeeMessages(),
      this.syncMercariMessages(),
    ]);

    // 結果を集約
    if (ebayResult.status === 'fulfilled') results.push(ebayResult.value);
    if (amazonResult.status === 'fulfilled') results.push(amazonResult.value);
    if (shopeeResult.status === 'fulfilled') results.push(shopeeResult.value);
    if (mercariResult.status === 'fulfilled') results.push(mercariResult.value);

    const totalNewMessages = results.reduce((sum, r) => sum + r.newMessages, 0);
    console.log(`✅ 全モール同期完了: ${totalNewMessages} 件の新着メッセージ`);

    return results;
  }

  /**
   * eBay メッセージ同期
   */
  private async syncEbayMessages(): Promise<SyncResult> {
    try {
      console.log('📧 eBay メッセージ同期中...');

      // eBay Trading API - GetMemberMessages を呼び出し
      // 実装例（実際のAPI呼び出しに置き換えてください）
      const ebayMessages = await this.fetchEbayMessages();

      let newCount = 0;

      for (const msg of ebayMessages) {
        const inserted = await this.saveMessage(msg);
        if (inserted) newCount++;
      }

      console.log(`✅ eBay 同期完了: ${newCount} 件の新着`);

      return {
        marketplace: 'eBay',
        success: true,
        newMessages: newCount,
      };
    } catch (error: any) {
      console.error('❌ eBay 同期エラー:', error.message);

      return {
        marketplace: 'eBay',
        success: false,
        newMessages: 0,
        error: error.message,
      };
    }
  }

  /**
   * Amazon メッセージ同期
   */
  private async syncAmazonMessages(): Promise<SyncResult> {
    try {
      console.log('📧 Amazon メッセージ同期中...');

      // Amazon SP-API - Messaging API を呼び出し
      const amazonMessages = await this.fetchAmazonMessages();

      let newCount = 0;

      for (const msg of amazonMessages) {
        const inserted = await this.saveMessage(msg);
        if (inserted) newCount++;
      }

      console.log(`✅ Amazon 同期完了: ${newCount} 件の新着`);

      return {
        marketplace: 'Amazon',
        success: true,
        newMessages: newCount,
      };
    } catch (error: any) {
      console.error('❌ Amazon 同期エラー:', error.message);

      return {
        marketplace: 'Amazon',
        success: false,
        newMessages: 0,
        error: error.message,
      };
    }
  }

  /**
   * Shopee メッセージ同期
   */
  private async syncShopeeMessages(): Promise<SyncResult> {
    try {
      console.log('📧 Shopee メッセージ同期中...');

      // Shopee Partner API - Get Conversations を呼び出し
      const shopeeMessages = await this.fetchShopeeMessages();

      let newCount = 0;

      for (const msg of shopeeMessages) {
        const inserted = await this.saveMessage(msg);
        if (inserted) newCount++;
      }

      console.log(`✅ Shopee 同期完了: ${newCount} 件の新着`);

      return {
        marketplace: 'Shopee',
        success: true,
        newMessages: newCount,
      };
    } catch (error: any) {
      console.error('❌ Shopee 同期エラー:', error.message);

      return {
        marketplace: 'Shopee',
        success: false,
        newMessages: 0,
        error: error.message,
      };
    }
  }

  /**
   * Mercari メッセージ同期
   */
  private async syncMercariMessages(): Promise<SyncResult> {
    try {
      console.log('📧 Mercari メッセージ同期中...');

      // Mercari API（非公式または スクレイピング）
      const mercariMessages = await this.fetchMercariMessages();

      let newCount = 0;

      for (const msg of mercariMessages) {
        const inserted = await this.saveMessage(msg);
        if (inserted) newCount++;
      }

      console.log(`✅ Mercari 同期完了: ${newCount} 件の新着`);

      return {
        marketplace: 'Mercari',
        success: true,
        newMessages: newCount,
      };
    } catch (error: any) {
      console.error('❌ Mercari 同期エラー:', error.message);

      return {
        marketplace: 'Mercari',
        success: false,
        newMessages: 0,
        error: error.message,
      };
    }
  }

  /**
   * eBay メッセージ取得（実際のAPI呼び出し）
   */
  private async fetchEbayMessages(): Promise<MarketplaceMessage[]> {
    // 実際のeBay Trading API呼び出し実装例
    // https://developer.ebay.com/devzone/xml/docs/reference/ebay/GetMemberMessages.html

    const endpoint = 'https://api.ebay.com/ws/api.dll';

    const xmlPayload = `
<?xml version="1.0" encoding="utf-8"?>
<GetMemberMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${this.ebayApiKey}</eBayAuthToken>
  </RequesterCredentials>
  <MailMessageType>All</MailMessageType>
  <MessageStatus>Unanswered</MessageStatus>
  <DetailLevel>ReturnMessages</DetailLevel>
</GetMemberMessagesRequest>`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-CALL-NAME': 'GetMemberMessages',
          'Content-Type': 'text/xml',
        },
        body: xmlPayload,
      });

      if (!response.ok) {
        throw new Error(`eBay API エラー: ${response.statusText}`);
      }

      const xmlText = await response.text();

      // XMLパース（実際の実装ではxml2jsなどを使用）
      const messages = this.parseEbayXMLResponse(xmlText);

      return messages;
    } catch (error: any) {
      console.error('eBay API呼び出しエラー:', error);
      return [];
    }
  }

  /**
   * Amazon メッセージ取得（実際のAPI呼び出し）
   */
  private async fetchAmazonMessages(): Promise<MarketplaceMessage[]> {
    // Amazon SP-API Messaging API 実装例
    // https://developer-docs.amazon.com/sp-api/docs/messaging-api-v1-reference

    // 注: Amazon SP-APIは認証が複雑なため、専用ライブラリの使用を推奨
    // 例: amazon-sp-api (npm)

    try {
      // モック実装（実際のAPIクライアントライブラリに置き換えてください）
      const messages: MarketplaceMessage[] = [];

      // 実際の実装例:
      // const spApi = new AmazonSpApi(config);
      // const response = await spApi.messaging.getMessagingActionsForOrder(orderId);

      return messages;
    } catch (error) {
      console.error('Amazon API呼び出しエラー:', error);
      return [];
    }
  }

  /**
   * Shopee メッセージ取得（実際のAPI呼び出し）
   */
  private async fetchShopeeMessages(): Promise<MarketplaceMessage[]> {
    // Shopee Partner API 実装例
    // https://open.shopee.com/documents/v2/v2.message.get_conversation_list

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/api/v2/message/get_conversation_list';

      // シグネチャ生成（Shopee API仕様に従う）
      const signature = this.generateShopeeSignature(path, timestamp);

      const endpoint = `https://partner.shopeemobile.com${path}`;

      const response = await fetch(
        `${endpoint}?partner_id=${this.shopeePartnerId}&timestamp=${timestamp}&sign=${signature}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopee API エラー: ${response.statusText}`);
      }

      const data = await response.json();

      // レスポンスをパースしてMarketplaceMessage形式に変換
      const messages = this.parseShopeeResponse(data);

      return messages;
    } catch (error) {
      console.error('Shopee API呼び出しエラー:', error);
      return [];
    }
  }

  /**
   * Mercari メッセージ取得
   */
  private async fetchMercariMessages(): Promise<MarketplaceMessage[]> {
    // Mercari は公式APIが限定的なため、Webスクレイピングまたは
    // 非公式APIを使用する必要があります
    // ここではモック実装を提供

    try {
      // モック実装
      const messages: MarketplaceMessage[] = [];

      // 実際の実装では、Puppeteerなどを使ったスクレイピングが必要
      // const browser = await puppeteer.launch();
      // const page = await browser.newPage();
      // await page.goto('https://www.mercari.com/jp/mypage/');
      // ... メッセージを抽出 ...

      return messages;
    } catch (error) {
      console.error('Mercari メッセージ取得エラー:', error);
      return [];
    }
  }

  /**
   * メッセージをデータベースに保存
   */
  private async saveMessage(message: MarketplaceMessage): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('unified_messages').insert({
        marketplace: message.marketplace,
        marketplace_message_id: message.marketplaceMessageId,
        thread_id: message.threadId,
        direction: message.direction,
        from_user: message.fromUser,
        to_user: message.toUser,
        subject: message.subject,
        body: message.body,
        message_type: message.messageType,
        received_at: message.receivedAt.toISOString(),
        order_number: message.orderNumber,
        status: 'unread',
      });

      if (error) {
        // 重複エラーは無視（既に保存済み）
        if (error.code === '23505') {
          return false;
        }

        throw error;
      }

      return true;
    } catch (error: any) {
      console.error('メッセージ保存エラー:', error.message);
      return false;
    }
  }

  /**
   * ヘルパー: eBay XML レスポンスパース
   */
  private parseEbayXMLResponse(xmlText: string): MarketplaceMessage[] {
    // 実際の実装ではxml2jsなどのライブラリを使用
    // ここでは簡易的なパース例を示す

    const messages: MarketplaceMessage[] = [];

    // 正規表現でメッセージを抽出（簡易版）
    const messageRegex = /<MemberMessage>([\s\S]*?)<\/MemberMessage>/g;
    const matches = xmlText.matchAll(messageRegex);

    for (const match of matches) {
      const messageXml = match[1];

      const messageId = this.extractXmlValue(messageXml, 'MessageID');
      const sender = this.extractXmlValue(messageXml, 'Sender');
      const subject = this.extractXmlValue(messageXml, 'Subject');
      const body = this.extractXmlValue(messageXml, 'Body');
      const receivedDate = this.extractXmlValue(messageXml, 'ReceiveDate');

      if (messageId && body) {
        messages.push({
          marketplace: 'eBay',
          marketplaceMessageId: messageId,
          direction: 'inbound',
          fromUser: sender || 'Unknown',
          toUser: 'me',
          subject,
          body,
          receivedAt: new Date(receivedDate || Date.now()),
        });
      }
    }

    return messages;
  }

  /**
   * ヘルパー: XML値抽出
   */
  private extractXmlValue(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * ヘルパー: Shopee シグネチャ生成
   */
  private generateShopeeSignature(path: string, timestamp: number): string {
    const crypto = require('crypto');
    const partnerKey = process.env.SHOPEE_PARTNER_KEY || '';

    const baseString = `${this.shopeePartnerId}${path}${timestamp}`;
    const hmac = crypto.createHmac('sha256', partnerKey);
    hmac.update(baseString);

    return hmac.digest('hex');
  }

  /**
   * ヘルパー: Shopee レスポンスパース
   */
  private parseShopeeResponse(data: any): MarketplaceMessage[] {
    const messages: MarketplaceMessage[] = [];

    if (data.conversations && Array.isArray(data.conversations)) {
      data.conversations.forEach((conv: any) => {
        if (conv.last_message) {
          messages.push({
            marketplace: 'Shopee',
            marketplaceMessageId: conv.conversation_id || `shopee-${Date.now()}`,
            threadId: conv.conversation_id,
            direction: conv.last_message.from_shop ? 'outbound' : 'inbound',
            fromUser: conv.last_message.from_shop ? 'me' : conv.buyer_username,
            toUser: conv.last_message.from_shop ? conv.buyer_username : 'me',
            body: conv.last_message.content,
            receivedAt: new Date(conv.last_message.created_at * 1000),
          });
        }
      });
    }

    return messages;
  }
}

// ==========================================
// エクスポート
// ==========================================

export default MessageSyncService;

// シングルトンインスタンス
let messageSyncServiceInstance: MessageSyncService | null = null;

export function getMessageSyncService(): MessageSyncService {
  if (!messageSyncServiceInstance) {
    messageSyncServiceInstance = new MessageSyncService();
  }
  return messageSyncServiceInstance;
}
