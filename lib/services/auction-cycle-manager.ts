/**
 * オークション自動サイクル管理サービス
 * Phase 8: オークション終了時の自動処理
 * 要件8-5に対応
 */

import CatawikiApiClient from '../catawiki/api-client';
import BonanzaApiClient from '../bonanza/api-client';
import { CatawikiLot } from '../catawiki/types';
import { BonanzaItem } from '../bonanza/types';

/**
 * オークション終了イベント
 */
export interface AuctionEndEvent {
  marketplaceId: 'catawiki' | 'ebay' | 'bonanza';
  listingId: string;
  sku: string;
  finalPrice?: number;
  sold: boolean;
  bidCount: number;
  endTime: Date;
}

/**
 * 再出品オプション
 */
export interface RelistOptions {
  strategy: 'auction' | 'fixed-price' | 'both';
  priceAdjustment?: number; // Percentage adjustment (-20 to +20)
  duration?: number; // days
  autoRelist?: boolean;
}

/**
 * 再出品結果
 */
export interface RelistResult {
  success: boolean;
  newListingId?: string;
  format: 'auction' | 'fixed-price';
  newPrice?: number;
  error?: string;
}

/**
 * オークションサイクル管理サービス
 */
export class AuctionCycleManager {
  private catawikiClient?: CatawikiApiClient;
  private bonanzaClient?: BonanzaApiClient;
  // private ebayClient?: EbayApiClient;

  constructor(config: {
    catawikiToken?: string;
    bonanzaConfig?: unknown;
  }) {
    if (config.catawikiToken) {
      this.catawikiClient = new CatawikiApiClient(config.catawikiToken);
    }

    if (config.bonanzaConfig) {
      this.bonanzaClient = new BonanzaApiClient(config.bonanzaConfig as any);
    }
  }

  /**
   * オークション終了時の自動処理
   * 1. 売れた場合: 在庫を減らし、他のモールでも停止
   * 2. 売れなかった場合: 自動で再出品または定額に変換
   */
  async handleAuctionEnd(
    event: AuctionEndEvent,
    options: RelistOptions
  ): Promise<RelistResult> {
    const { marketplaceId, listingId, sku, sold, finalPrice } = event;

    // 売れた場合の処理
    if (sold) {
      console.log(`✅ Auction sold: ${listingId} for ${finalPrice}`);
      // Inventory sync service would handle stock reduction
      return {
        success: true,
        format: 'auction',
      };
    }

    // 売れなかった場合の再出品処理
    console.log(`❌ Auction unsold: ${listingId}. Initiating relist...`);

    try {
      switch (marketplaceId) {
        case 'catawiki':
          return await this.relistCatawikiLot(listingId, sku, options);

        case 'bonanza':
          return await this.relistBonanzaItem(listingId, sku, options);

        case 'ebay':
          return await this.relistEbayItem(listingId, sku, options);

        default:
          throw new Error(`Unsupported marketplace: ${marketplaceId}`);
      }
    } catch (error) {
      return {
        success: false,
        format: 'auction',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Catawikiロットの再出品
   */
  private async relistCatawikiLot(
    lotId: string,
    sku: string,
    options: RelistOptions
  ): Promise<RelistResult> {
    if (!this.catawikiClient) {
      throw new Error('Catawiki client not initialized');
    }

    try {
      // 既存のロット情報を取得
      const lotResponse = await this.catawikiClient.getLot(lotId);

      if (!lotResponse.success || !lotResponse.data) {
        throw new Error('Failed to fetch lot data');
      }

      const lot: CatawikiLot = lotResponse.data;

      // 価格調整
      const priceAdjustment = options.priceAdjustment || -10; // デフォルト10%値下げ
      const newStartingPrice = lot.starting_price * (1 + priceAdjustment / 100);
      const newReservePrice = lot.reserve_price
        ? lot.reserve_price * (1 + priceAdjustment / 100)
        : undefined;

      // 再出品戦略に応じた処理
      if (options.strategy === 'auction') {
        // オークション形式で再出品
        const newLotResponse = await this.catawikiClient.createLot({
          title: lot.title,
          description: lot.description,
          category_id: lot.category_id,
          starting_price: newStartingPrice,
          reserve_price: newReservePrice,
          estimated_value: lot.estimated_value,
          condition: lot.condition,
          condition_description: lot.condition_description,
          authenticity_status: lot.authenticity_status,
          shipping_method: lot.shipping_method,
          shipping_from: lot.shipping_from,
          ships_to: lot.ships_to,
        });

        if (!newLotResponse.success || !newLotResponse.data) {
          throw new Error('Failed to create new lot');
        }

        return {
          success: true,
          newListingId: newLotResponse.data.id,
          format: 'auction',
          newPrice: newStartingPrice,
        };
      } else if (options.strategy === 'fixed-price') {
        // Catawikiは固定価格をサポートしていないため、
        // 他のマーケットプレイス（BonanzaやeBay）に自動移行
        console.log('Catawiki does not support fixed-price. Consider listing on Bonanza or eBay.');
        return {
          success: false,
          format: 'auction',
          error: 'Catawiki does not support fixed-price listings',
        };
      }

      return {
        success: false,
        format: 'auction',
        error: 'Invalid strategy',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bonanzaアイテムの再出品
   */
  private async relistBonanzaItem(
    itemId: string,
    sku: string,
    options: RelistOptions
  ): Promise<RelistResult> {
    if (!this.bonanzaClient) {
      throw new Error('Bonanza client not initialized');
    }

    try {
      // 既存のアイテム情報を取得
      const item: BonanzaItem = await this.bonanzaClient.getItem(itemId);

      // 価格調整
      const priceAdjustment = options.priceAdjustment || -10;
      const newPrice = item.price * (1 + priceAdjustment / 100);

      // 再出品戦略に応じた処理
      if (options.strategy === 'fixed-price') {
        // オークション → 固定価格に自動変換
        const newItem = await this.bonanzaClient.updateItem(itemId, {
          listing_format: 'fixed_price',
          price: newPrice,
          quantity: item.quantity,
        });

        return {
          success: true,
          newListingId: newItem.item_id,
          format: 'fixed-price',
          newPrice,
        };
      } else if (options.strategy === 'auction') {
        // オークション形式で再出品
        const newItem = await this.bonanzaClient.createItem({
          title: item.title,
          description: item.description,
          price: newPrice,
          quantity: item.quantity,
          category_id: item.category_id,
          condition: item.condition,
          sku: item.sku,
          image_urls: item.image_urls,
          listing_format: 'auction',
          auction_duration: options.duration || 7,
          starting_price: newPrice,
          returns_accepted: item.returns_accepted,
          payment_methods: item.payment_methods,
        });

        return {
          success: true,
          newListingId: newItem.item_id,
          format: 'auction',
          newPrice,
        };
      }

      return {
        success: false,
        format: 'auction',
        error: 'Invalid strategy',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * eBayアイテムの再出品
   */
  private async relistEbayItem(
    itemId: string,
    sku: string,
    options: RelistOptions
  ): Promise<RelistResult> {
    // eBay API integration would be implemented here
    // Similar to Bonanza logic

    console.log('eBay relist not yet implemented');

    return {
      success: false,
      format: 'auction',
      error: 'eBay relist not yet implemented',
    };
  }

  /**
   * 定期的なオークション監視
   * 終了間近のオークションをチェックし、自動処理の準備
   */
  async monitorUpcomingAuctionEnds(
    withinHours: number = 24
  ): Promise<AuctionEndEvent[]> {
    const upcomingEnds: AuctionEndEvent[] = [];

    try {
      // Catawikiのオークションをチェック
      if (this.catawikiClient) {
        const lotsResponse = await this.catawikiClient.getLots({
          status: 'active',
        });

        if (lotsResponse.success && lotsResponse.data) {
          const lots = lotsResponse.data;

          lots.forEach((lot: CatawikiLot) => {
            if (lot.auction_end) {
              const endTime = new Date(lot.auction_end);
              const hoursUntilEnd =
                (endTime.getTime() - Date.now()) / (1000 * 60 * 60);

              if (hoursUntilEnd <= withinHours && hoursUntilEnd > 0) {
                upcomingEnds.push({
                  marketplaceId: 'catawiki',
                  listingId: lot.id,
                  sku: '', // Would be retrieved from database
                  sold: false,
                  bidCount: lot.bid_count,
                  endTime,
                });
              }
            }
          });
        }
      }

      // Bonanzaのオークションをチェック
      if (this.bonanzaClient) {
        const itemsResponse = await this.bonanzaClient.getItems({
          status: 'active',
        });

        if (itemsResponse.success && itemsResponse.data) {
          const items = itemsResponse.data;

          items.forEach((item: BonanzaItem) => {
            if (item.listing_format === 'auction' && item.ended_at) {
              const endTime = new Date(item.ended_at);
              const hoursUntilEnd =
                (endTime.getTime() - Date.now()) / (1000 * 60 * 60);

              if (hoursUntilEnd <= withinHours && hoursUntilEnd > 0) {
                upcomingEnds.push({
                  marketplaceId: 'bonanza',
                  listingId: item.item_id,
                  sku: item.sku || '',
                  sold: false,
                  bidCount: 0, // Bonanza API doesn't expose this
                  endTime,
                });
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error monitoring auctions:', error);
    }

    return upcomingEnds;
  }

  /**
   * 自動再出品の一括処理
   * 夜間バッチ処理などで使用
   */
  async processEndedAuctions(
    defaultOptions: RelistOptions
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    results: RelistResult[];
  }> {
    const results: RelistResult[] = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      // Catawiki
      if (this.catawikiClient) {
        const lotsResponse = await this.catawikiClient.getLots({
          status: 'ended',
        });

        if (lotsResponse.success && lotsResponse.data) {
          const lots = lotsResponse.data;

          for (const lot of lots) {
            processed++;

            const event: AuctionEndEvent = {
              marketplaceId: 'catawiki',
              listingId: lot.id,
              sku: '', // Would be retrieved from database
              sold: lot.status === 'sold',
              bidCount: lot.bid_count,
              endTime: new Date(lot.auction_end || Date.now()),
            };

            const result = await this.handleAuctionEnd(event, defaultOptions);
            results.push(result);

            if (result.success) {
              succeeded++;
            } else {
              failed++;
            }
          }
        }
      }

      // Bonanza
      if (this.bonanzaClient) {
        const itemsResponse = await this.bonanzaClient.getItems({
          status: 'sold',
        });

        if (itemsResponse.success && itemsResponse.data) {
          const items = itemsResponse.data;

          for (const item of items) {
            if (item.listing_format === 'auction') {
              processed++;

              const event: AuctionEndEvent = {
                marketplaceId: 'bonanza',
                listingId: item.item_id,
                sku: item.sku || '',
                sold: item.status === 'sold',
                bidCount: 0,
                endTime: new Date(item.ended_at || Date.now()),
              };

              const result = await this.handleAuctionEnd(event, defaultOptions);
              results.push(result);

              if (result.success) {
                succeeded++;
              } else {
                failed++;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing ended auctions:', error);
    }

    return {
      processed,
      succeeded,
      failed,
      results,
    };
  }
}

export default AuctionCycleManager;
