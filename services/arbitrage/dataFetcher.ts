/**
 * Amazon刈り取りデータ取得サービス
 *
 * Keepa APIとAmazon PA-API/SP-APIからリアルタイムデータを取得する。
 *
 * 機能:
 * 1. Keepa APIから価格履歴・ランキング履歴を取得
 * 2. Amazon PA-APIから商品詳細を取得
 * 3. Amazon SP-APIから在庫ステータスを取得
 * 4. 取得したデータをproducts_masterに保存
 */

import axios from 'axios';
import { KeepaData } from '@/types/product';

/**
 * Keepa APIからデータを取得
 *
 * @param asin 商品のASIN
 * @param domain Amazon domain (1=US, 5=JP)
 * @returns Keepa価格履歴データ
 */
export async function fetchKeepaData(
  asin: string,
  domain: number = 1
): Promise<KeepaData | null> {
  const apiKey = process.env.KEEPA_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ KEEPA_API_KEY が設定されていません。モックデータを返します。');
    return getMockKeepaData(asin);
  }

  try {
    // Keepa APIエンドポイント
    const url = 'https://api.keepa.com/product';

    const response = await axios.get(url, {
      params: {
        key: apiKey,
        domain,
        asin,
        stats: 90, // 90日間の統計
        history: 1, // 価格履歴を含める
      },
      timeout: 10000,
    });

    if (!response.data || !response.data.products || response.data.products.length === 0) {
      console.warn(`⚠️ Keepaからデータが見つかりません: ${asin}`);
      return null;
    }

    const product = response.data.products[0];

    // Keepaのタイムスタンプは「Keepa Time Minutes」形式（2011年1月1日からの分数）
    const keepaTimeOffset = 21564000; // 2011-01-01 00:00:00 UTC in minutes

    // 価格履歴を変換
    const priceHistory: Array<{ timestamp: number; price: number }> = [];
    if (product.csv && product.csv[0]) {
      const prices = product.csv[0]; // Amazon価格
      for (let i = 0; i < prices.length; i += 2) {
        const keepaMinutes = prices[i];
        const price = prices[i + 1];

        if (price !== -1 && price !== null) {
          const timestamp = (keepaTimeOffset + keepaMinutes) * 60 * 1000; // ミリ秒に変換
          priceHistory.push({
            timestamp,
            price: price / 100, // Keepaは価格を100倍して保存
          });
        }
      }
    }

    // ランキング履歴を変換
    const rankHistory: Array<{ timestamp: number; rank: number }> = [];
    if (product.csv && product.csv[3]) {
      const ranks = product.csv[3]; // Sales Rank
      for (let i = 0; i < ranks.length; i += 2) {
        const keepaMinutes = ranks[i];
        const rank = ranks[i + 1];

        if (rank !== -1 && rank !== null) {
          const timestamp = (keepaTimeOffset + keepaMinutes) * 60 * 1000;
          rankHistory.push({
            timestamp,
            rank,
          });
        }
      }
    }

    // 現在価格と平均価格を計算
    const currentPrice = product.stats?.current?.[0] ? product.stats.current[0] / 100 : null;
    const averagePrice90d = product.stats?.avg90?.[0] ? product.stats.avg90[0] / 100 : null;

    // 価格下落率を計算
    let priceDropRatio = 0;
    if (currentPrice && averagePrice90d && averagePrice90d > 0) {
      priceDropRatio = (averagePrice90d - currentPrice) / averagePrice90d;
    }

    return {
      price_history: priceHistory.slice(-100), // 最新100件
      rank_history: rankHistory.slice(-100), // 最新100件
      price_drop_detected: priceDropRatio > 0.1, // 10%以上の下落
      price_drop_ratio: priceDropRatio,
      average_price_90d: averagePrice90d,
      current_price: currentPrice,
      last_updated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Keepa APIエラー:', error);
    return null;
  }
}

/**
 * Amazon PA-API（Product Advertising API）から商品詳細を取得
 *
 * ⚠️ PA-APIは別途申請が必要です。未設定の場合はSP-APIまたはスクレイピングで代替してください。
 */
export async function fetchAmazonProductDetails(asin: string, country: 'US' | 'JP' = 'US') {
  const paApiKey = process.env.AMAZON_PA_API_KEY;
  const paApiSecret = process.env.AMAZON_PA_API_SECRET;
  const paApiTag = process.env.AMAZON_PA_API_TAG;

  if (!paApiKey || !paApiSecret || !paApiTag) {
    console.warn('⚠️ Amazon PA-APIが設定されていません。モックデータを返します。');
    return getMockAmazonProductDetails(asin, country);
  }

  try {
    // PA-APIは署名が必要なため、amazon-paapi パッケージを使用
    // npm install amazon-paapi が必要
    const amazonPaapi = require('amazon-paapi');

    const commonParameters = {
      AccessKey: paApiKey,
      SecretKey: paApiSecret,
      PartnerTag: paApiTag,
      PartnerType: 'Associates',
      Marketplace: country === 'US' ? 'www.amazon.com' : 'www.amazon.co.jp',
    };

    const requestParameters = {
      ItemIds: [asin],
      Resources: [
        'ItemInfo.Title',
        'ItemInfo.Features',
        'Offers.Listings.Price',
        'Offers.Listings.Availability',
        'BrowseNodeInfo.BrowseNodes',
      ],
    };

    const response = await amazonPaapi.GetItems(commonParameters, requestParameters);

    if (!response || !response.ItemsResult || !response.ItemsResult.Items) {
      return null;
    }

    const item = response.ItemsResult.Items[0];

    return {
      title: item.ItemInfo?.Title?.DisplayValue || null,
      features: item.ItemInfo?.Features?.DisplayValues || [],
      current_price: item.Offers?.Listings?.[0]?.Price?.Amount || null,
      availability: item.Offers?.Listings?.[0]?.Availability?.Type || null,
      category: item.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName || null,
    };
  } catch (error) {
    console.error('❌ Amazon PA-APIエラー:', error);
    return null;
  }
}

/**
 * Amazon SP-APIから在庫ステータスを取得
 */
export async function fetchAmazonInventoryStatus(asin: string, country: 'US' | 'JP' = 'US') {
  const spApiClientId = process.env.SP_API_CLIENT_ID;

  if (!spApiClientId) {
    console.warn('⚠️ Amazon SP-APIが設定されていません。モックデータを返します。');
    return {
      in_stock: true,
      price: country === 'US' ? 29.99 : 3299,
    };
  }

  try {
    const SellingPartner = require('amazon-sp-api');

    const region = country === 'US' ? 'na' : 'fe';

    const spApi = new SellingPartner({
      region,
      refresh_token: process.env.SP_API_REFRESH_TOKEN,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.SP_API_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.SP_API_CLIENT_SECRET,
      },
    });

    // Catalog Items APIで商品情報を取得
    const response = await spApi.callAPI({
      operation: 'getCatalogItem',
      endpoint: 'catalogItems',
      path: {
        asin,
      },
      query: {
        marketplaceIds: country === 'US' ? 'ATVPDKIKX0DER' : 'A1VC38T7YXB528',
        includedData: 'offers,salesRanks',
      },
    });

    const item = response?.payload;

    if (!item) {
      return null;
    }

    const offers = item.offers || [];
    const lowestOffer = offers.find((offer: any) => offer.sellerType === 'AMAZON');

    return {
      in_stock: lowestOffer?.availability?.availabilityType === 'AVAILABLE',
      price: lowestOffer?.price?.amount || null,
      sales_rank: item.salesRanks?.[0]?.rank || null,
    };
  } catch (error) {
    console.error('❌ Amazon SP-APIエラー:', error);
    return null;
  }
}

/**
 * Keepaデータのモック（開発用）
 */
function getMockKeepaData(asin: string): KeepaData {
  const now = Date.now();
  const priceHistory = [];
  const rankHistory = [];

  // 過去90日分のモックデータ
  for (let i = 90; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const basePrice = 50;
    const variation = Math.sin(i / 10) * 10;

    priceHistory.push({
      timestamp,
      price: basePrice + variation,
    });

    rankHistory.push({
      timestamp,
      rank: 5000 + Math.floor(Math.random() * 1000),
    });
  }

  return {
    price_history: priceHistory,
    rank_history: rankHistory,
    price_drop_detected: true,
    price_drop_ratio: 0.25,
    average_price_90d: 55,
    current_price: 42,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Amazon商品詳細のモック（開発用）
 */
function getMockAmazonProductDetails(asin: string, country: 'US' | 'JP') {
  return {
    title: `Mock Product Title for ${asin}`,
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
    current_price: country === 'US' ? 29.99 : 3299,
    availability: 'Available',
    category: 'Electronics',
  };
}

/**
 * 商品データを一括取得してDBに保存
 */
export async function fetchAndSaveProductData(
  asin: string,
  country: 'US' | 'JP' = 'US',
  supabase: any
) {
  console.log(`📊 商品データ取得開始: ${asin} (${country})`);

  // 1. Keepaデータ取得
  const keepaData = await fetchKeepaData(asin, country === 'US' ? 1 : 5);

  // 2. Amazon商品詳細取得
  const productDetails = await fetchAmazonProductDetails(asin, country);

  // 3. Amazon在庫ステータス取得
  const inventoryStatus = await fetchAmazonInventoryStatus(asin, country);

  // 4. DBに保存
  const { error } = await supabase
    .from('products_master')
    .upsert(
      {
        asin,
        target_country: country,
        keepa_data: keepaData,
        amazon_inventory_status: inventoryStatus?.in_stock ? 'in_stock' : 'out_of_stock',
        keepa_ranking_avg_90d: keepaData?.rank_history
          ? keepaData.rank_history.reduce((sum, r) => sum + r.rank, 0) /
            keepaData.rank_history.length
          : null,
        title: productDetails?.title,
        price: inventoryStatus?.price,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'asin',
      }
    );

  if (error) {
    console.error('❌ DBへの保存に失敗:', error);
    return { success: false, error };
  }

  console.log(`✅ 商品データ取得完了: ${asin}`);

  return {
    success: true,
    data: {
      keepa_data: keepaData,
      product_details: productDetails,
      inventory_status: inventoryStatus,
    },
  };
}
