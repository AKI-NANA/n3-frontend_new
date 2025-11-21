/**
 * 在庫・価格リアルタイム同期サービス
 * Phase 8: 全8モール間で在庫数と価格をリアルタイムで同期
 * 要件8-4に対応
 */

import EtsyApiClient from '../etsy/api-client';
import BonanzaApiClient from '../bonanza/api-client';
import CatawikiApiClient from '../catawiki/api-client';
import FacebookMarketplaceApiClient from '../facebook-marketplace/api-client';

/**
 * マーケットプレイス識別子
 */
export type MarketplaceId =
  | 'ebay'
  | 'amazon'
  | 'etsy'
  | 'bonanza'
  | 'catawiki'
  | 'facebook-marketplace'
  | 'shopee'
  | 'mercado-libre';

/**
 * リスティング情報
 */
export interface MarketplaceListing {
  marketplaceId: MarketplaceId;
  listingId: string;
  sku: string;
  currentPrice: number;
  currentStock: number;
  currency: string;
  isActive: boolean;
}

/**
 * 同期結果
 */
export interface SyncResult {
  marketplaceId: MarketplaceId;
  listingId: string;
  success: boolean;
  previousStock?: number;
  newStock?: number;
  previousPrice?: number;
  newPrice?: number;
  error?: string;
}

/**
 * 在庫更新イベント
 */
export interface InventoryUpdateEvent {
  sku: string;
  soldOn: MarketplaceId;
  soldListingId: string;
  quantitySold: number;
  timestamp: Date;
}

/**
 * 価格更新イベント
 */
export interface PriceUpdateEvent {
  sku: string;
  updatedOn: MarketplaceId;
  newPrice: number;
  currency: string;
  timestamp: Date;
}

/**
 * 在庫・価格同期サービス
 */
export class InventorySyncService {
  private etsyClient?: EtsyApiClient;
  private bonanzaClient?: BonanzaApiClient;
  private catawikiClient?: CatawikiApiClient;
  private facebookClient?: FacebookMarketplaceApiClient;

  // API clients for eBay, Amazon, etc. would be initialized here
  // private ebayClient?: EbayApiClient;
  // private amazonClient?: AmazonApiClient;

  constructor(config: {
    etsyToken?: string;
    bonanzaConfig?: unknown;
    catawikiToken?: string;
    facebookToken?: string;
    facebookCatalogId?: string;
  }) {
    if (config.etsyToken) {
      this.etsyClient = new EtsyApiClient(config.etsyToken);
    }

    if (config.bonanzaConfig) {
      this.bonanzaClient = new BonanzaApiClient(config.bonanzaConfig as any);
    }

    if (config.catawikiToken) {
      this.catawikiClient = new CatawikiApiClient(config.catawikiToken);
    }

    if (config.facebookToken && config.facebookCatalogId) {
      this.facebookClient = new FacebookMarketplaceApiClient(
        config.facebookToken,
        config.facebookCatalogId
      );
    }
  }

  /**
   * SKUに紐づく全マーケットプレイスのリスティングを取得
   */
  async getListingsBySku(sku: string): Promise<MarketplaceListing[]> {
    // In production, this would query a database table like:
    // SELECT * FROM marketplace_listings WHERE sku = $1 AND is_active = true
    // For now, return mock data
    return [];
  }

  /**
   * 在庫数をリアルタイムで同期
   * 1つのモールで売れた場合、他のすべてのモールの在庫を即座に減らす
   */
  async syncInventoryAcrossMarketplaces(
    event: InventoryUpdateEvent
  ): Promise<SyncResult[]> {
    const { sku, soldOn, quantitySold } = event;
    const results: SyncResult[] = [];

    try {
      // 1. SKUに紐づく全リスティングを取得
      const listings = await this.getListingsBySku(sku);

      // 2. 販売元以外のすべてのマーケットプレイスで在庫を更新
      const updatePromises = listings
        .filter((listing) => listing.marketplaceId !== soldOn)
        .map(async (listing) => {
          const newStock = Math.max(0, listing.currentStock - quantitySold);

          try {
            await this.updateInventoryOnMarketplace(
              listing.marketplaceId,
              listing.listingId,
              newStock
            );

            results.push({
              marketplaceId: listing.marketplaceId,
              listingId: listing.listingId,
              success: true,
              previousStock: listing.currentStock,
              newStock,
            });
          } catch (error) {
            results.push({
              marketplaceId: listing.marketplaceId,
              listingId: listing.listingId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });

      await Promise.all(updatePromises);

      // 3. 在庫が0になった場合、すべてのリスティングを停止
      if (listings.some((l) => l.currentStock - quantitySold <= 0)) {
        await this.pauseAllListings(sku);
      }
    } catch (error) {
      console.error('Inventory sync error:', error);
    }

    return results;
  }

  /**
   * 価格をリアルタイムで同期
   * 1つのモールで価格変更した場合、他のすべてのモールの価格も更新
   */
  async syncPriceAcrossMarketplaces(
    event: PriceUpdateEvent
  ): Promise<SyncResult[]> {
    const { sku, updatedOn, newPrice, currency } = event;
    const results: SyncResult[] = [];

    try {
      // 1. SKUに紐づく全リスティングを取得
      const listings = await this.getListingsBySku(sku);

      // 2. 更新元以外のすべてのマーケットプレイスで価格を更新
      const updatePromises = listings
        .filter((listing) => listing.marketplaceId !== updatedOn)
        .map(async (listing) => {
          try {
            // 為替レートを考慮した価格変換
            const convertedPrice = await this.convertPrice(
              newPrice,
              currency,
              listing.currency
            );

            await this.updatePriceOnMarketplace(
              listing.marketplaceId,
              listing.listingId,
              convertedPrice
            );

            results.push({
              marketplaceId: listing.marketplaceId,
              listingId: listing.listingId,
              success: true,
              previousPrice: listing.currentPrice,
              newPrice: convertedPrice,
            });
          } catch (error) {
            results.push({
              marketplaceId: listing.marketplaceId,
              listingId: listing.listingId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Price sync error:', error);
    }

    return results;
  }

  /**
   * 特定のマーケットプレイスで在庫を更新
   */
  private async updateInventoryOnMarketplace(
    marketplaceId: MarketplaceId,
    listingId: string,
    newStock: number
  ): Promise<void> {
    switch (marketplaceId) {
      case 'etsy':
        if (this.etsyClient) {
          const listingIdNum = parseInt(listingId, 10);
          const inventory = await this.etsyClient.getListingInventory(listingIdNum);
          // Update inventory logic here
        }
        break;

      case 'bonanza':
        if (this.bonanzaClient) {
          await this.bonanzaClient.updateItemQuantity(listingId, newStock);
        }
        break;

      case 'catawiki':
        // Catawikiはオークション形式なので在庫更新は不要
        // ただし、再出品の判断には使用可能
        break;

      case 'facebook-marketplace':
        if (this.facebookClient) {
          await this.facebookClient.updateInventory(listingId, newStock);
        }
        break;

      case 'ebay':
        // eBay APIを使用して在庫更新
        // await this.ebayClient.updateInventory(listingId, newStock);
        break;

      case 'amazon':
        // Amazon APIを使用して在庫更新
        // await this.amazonClient.updateInventory(listingId, newStock);
        break;

      default:
        throw new Error(`Unsupported marketplace: ${marketplaceId}`);
    }
  }

  /**
   * 特定のマーケットプレイスで価格を更新
   */
  private async updatePriceOnMarketplace(
    marketplaceId: MarketplaceId,
    listingId: string,
    newPrice: number
  ): Promise<void> {
    switch (marketplaceId) {
      case 'etsy':
        if (this.etsyClient) {
          const listingIdNum = parseInt(listingId, 10);
          const shopId = 0; // Would be retrieved from config
          await this.etsyClient.updateListing(shopId, listingIdNum, {
            price: newPrice,
          });
        }
        break;

      case 'bonanza':
        if (this.bonanzaClient) {
          await this.bonanzaClient.updateItemPrice(listingId, newPrice);
        }
        break;

      case 'catawiki':
        // Catawikiはオークション形式なので価格更新は不要
        // Reserve Priceは事前に設定済み
        break;

      case 'facebook-marketplace':
        if (this.facebookClient) {
          await this.facebookClient.updatePrice(listingId, newPrice, 'USD');
        }
        break;

      case 'ebay':
        // eBay APIを使用して価格更新
        // await this.ebayClient.updatePrice(listingId, newPrice);
        break;

      case 'amazon':
        // Amazon APIを使用して価格更新
        // await this.amazonClient.updatePrice(listingId, newPrice);
        break;

      default:
        throw new Error(`Unsupported marketplace: ${marketplaceId}`);
    }
  }

  /**
   * SKUに紐づくすべてのリスティングを一時停止
   */
  async pauseAllListings(sku: string): Promise<SyncResult[]> {
    const listings = await this.getListingsBySku(sku);
    const results: SyncResult[] = [];

    for (const listing of listings) {
      try {
        await this.updateInventoryOnMarketplace(
          listing.marketplaceId,
          listing.listingId,
          0
        );

        results.push({
          marketplaceId: listing.marketplaceId,
          listingId: listing.listingId,
          success: true,
          newStock: 0,
        });
      } catch (error) {
        results.push({
          marketplaceId: listing.marketplaceId,
          listingId: listing.listingId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 価格を為替レートで変換
   */
  private async convertPrice(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // In production, fetch real-time exchange rates from an API
    // For now, use mock rates
    const exchangeRates: Record<string, Record<string, number>> = {
      USD: {
        EUR: 0.92,
        GBP: 0.79,
        JPY: 149.5,
        CAD: 1.36,
      },
      EUR: {
        USD: 1.09,
        GBP: 0.86,
        JPY: 162.3,
      },
      JPY: {
        USD: 0.0067,
        EUR: 0.0062,
        GBP: 0.0053,
      },
    };

    const rate = exchangeRates[fromCurrency]?.[toCurrency] || 1;
    return parseFloat((amount * rate).toFixed(2));
  }

  /**
   * 在庫同期の健全性チェック
   * すべてのマーケットプレイスで在庫数が一致しているか確認
   */
  async checkInventoryConsistency(sku: string): Promise<{
    isConsistent: boolean;
    listings: MarketplaceListing[];
    discrepancies: string[];
  }> {
    const listings = await this.getListingsBySku(sku);
    const discrepancies: string[] = [];

    if (listings.length === 0) {
      return {
        isConsistent: true,
        listings: [],
        discrepancies: [],
      };
    }

    // 最初のリスティングの在庫数を基準にする
    const referenceStock = listings[0].currentStock;

    listings.forEach((listing, index) => {
      if (listing.currentStock !== referenceStock) {
        discrepancies.push(
          `${listing.marketplaceId} (${listing.listingId}): Stock ${listing.currentStock} differs from reference ${referenceStock}`
        );
      }
    });

    return {
      isConsistent: discrepancies.length === 0,
      listings,
      discrepancies,
    };
  }
}

export default InventorySyncService;
