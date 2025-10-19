// src/services/ebayService.js - eBay Finding API統合サービス
const axios = require('axios');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const { RedisHelper } = require('../config/database');

class EbayService {
  constructor() {
    // eBay API 設定
    this.appId = process.env.EBAY_APP_ID;
    this.certId = process.env.EBAY_CERT_ID;
    this.devId = process.env.EBAY_DEV_ID;
    this.userToken = process.env.EBAY_USER_TOKEN;
    
    // API エンドポイント
    this.findingServiceUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';
    this.shoppingServiceUrl = 'https://open.api.ebay.com/shopping';
    
    // デフォルト設定
    this.defaultSettings = {
      globalId: 'EBAY-US',
      serviceVersion: '1.0.0',
      responseFormat: 'JSON',
      maxResults: 100,
      cacheTimeout: 900, // 15分
      requestTimeout: 15000 // 15秒
    };
    
    // レート制限設定
    this.rateLimits = {
      finding: { requests: 5000, period: 3600 * 1000 }, // 1時間
      shopping: { requests: 10000, period: 3600 * 1000 }
    };
    
    // axios インスタンス作成
    this.httpClient = axios.create({
      timeout: this.defaultSettings.requestTimeout,
      headers: {
        'User-Agent': 'Research-Tool-Backend/1.0.0',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      }
    });
    
    // リクエストインターセプター
    this.httpClient.interceptors.request.use(
      (config) => {
        const requestId = Helpers.generateRequestId();
        config.metadata = { startTime: Date.now(), requestId };
        
        logger.debug('eBay API Request', {
          requestId,
          url: config.url,
          method: config.method,
          params: config.params ? Object.keys(config.params) : []
        });
        
        return config;
      },
      (error) => {
        logger.error('eBay API Request Setup Failed', error);
        return Promise.reject(error);
      }
    );
    
    // レスポンスインターセプター
    this.httpClient.interceptors.response.use(
      (response) => {
        const { startTime, requestId } = response.config.metadata;
        const duration = Date.now() - startTime;
        
        logger.logApiCall('eBay', response.config.url, response.config.method, 
                          response.status, duration, { requestId });
        
        return response;
      },
      (error) => {
        const { startTime, requestId } = error.config?.metadata || {};
        const duration = startTime ? Date.now() - startTime : 0;
        
        logger.logApiCall('eBay', error.config?.url || 'unknown', 
                          error.config?.method || 'unknown',
                          error.response?.status || 0, duration, 
                          { requestId, error: error.message });
        
        return Promise.reject(error);
      }
    );
  }
  
  // 基本設定検証
  validateConfig() {
    const required = ['EBAY_APP_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing eBay API configuration: ${missing.join(', ')}`);
    }
    
    return true;
  }
  
  // キーワード検索
  async searchByKeyword(query, filters = {}, options = {}) {
    this.validateConfig();
    
    const cacheKey = Helpers.generateCacheKey('ebay_search', query, filters);
    
    // キャッシュ確認
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      logger.debug('eBay search cache hit', { query, cacheKey });
      return cached;
    }
    
    try {
      const params = this._buildFindingParams('findItemsAdvanced', query, filters);
      const response = await this.httpClient.get(this.findingServiceUrl, { params });
      
      const parsedResults = this._parseFindingResponse(response.data, 'findItemsAdvanced');
      
      // 結果をキャッシュ
      await RedisHelper.setCache(cacheKey, parsedResults, this.defaultSettings.cacheTimeout);
      
      logger.info('eBay keyword search completed', {
        query,
        totalResults: parsedResults.totalResults,
        returnedResults: parsedResults.items.length
      });
      
      return parsedResults;
      
    } catch (error) {
      logger.error('eBay keyword search failed', {
        query,
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`eBay search failed: ${error.message}`);
    }
  }
  
  // セラー商品検索
  async searchBySeller(sellerUsername, filters = {}, options = {}) {
    this.validateConfig();
    
    const cacheKey = Helpers.generateCacheKey('ebay_seller', sellerUsername, filters);
    
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      logger.debug('eBay seller search cache hit', { sellerUsername, cacheKey });
      return cached;
    }
    
    try {
      // セラー専用フィルターを追加
      const sellerFilters = {
        ...filters,
        seller: sellerUsername
      };
      
      const params = this._buildFindingParams('findItemsByKeywords', '', sellerFilters);
      const response = await this.httpClient.get(this.findingServiceUrl, { params });
      
      const parsedResults = this._parseFindingResponse(response.data, 'findItemsByKeywords');
      
      // セラー情報を補強
      parsedResults.sellerInfo = {
        username: sellerUsername,
        totalListings: parsedResults.totalResults,
        averagePrice: this._calculateAveragePrice(parsedResults.items),
        topCategories: this._extractTopCategories(parsedResults.items)
      };
      
      await RedisHelper.setCache(cacheKey, parsedResults, this.defaultSettings.cacheTimeout);
      
      logger.info('eBay seller search completed', {
        sellerUsername,
        totalResults: parsedResults.totalResults,
        returnedResults: parsedResults.items.length
      });
      
      return parsedResults;
      
    } catch (error) {
      logger.error('eBay seller search failed', {
        sellerUsername,
        error: error.message
      });
      throw new Error(`eBay seller search failed: ${error.message}`);
    }
  }
  
  // 売れた商品検索（Completed Items）
  async searchCompletedItems(query, filters = {}, options = {}) {
    this.validateConfig();
    
    const cacheKey = Helpers.generateCacheKey('ebay_completed', query, filters);
    
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      return cached;
    }
    
    try {
      const params = this._buildFindingParams('findCompletedItems', query, filters);
      const response = await this.httpClient.get(this.findingServiceUrl, { params });
      
      const parsedResults = this._parseFindingResponse(response.data, 'findCompletedItems');
      
      // 売れた商品専用の統計追加
      parsedResults.completedStats = this._calculateCompletedStats(parsedResults.items);
      
      await RedisHelper.setCache(cacheKey, parsedResults, this.defaultSettings.cacheTimeout);
      
      logger.info('eBay completed items search completed', {
        query,
        totalResults: parsedResults.totalResults,
        avgSoldPrice: parsedResults.completedStats.averageSoldPrice
      });
      
      return parsedResults;
      
    } catch (error) {
      logger.error('eBay completed items search failed', {
        query,
        error: error.message
      });
      throw new Error(`eBay completed search failed: ${error.message}`);
    }
  }
  
  // カテゴリ検索
  async searchByCategory(categoryId, filters = {}, options = {}) {
    this.validateConfig();
    
    const cacheKey = Helpers.generateCacheKey('ebay_category', categoryId, filters);
    
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      return cached;
    }
    
    try {
      const categoryFilters = {
        ...filters,
        categoryId: categoryId
      };
      
      const params = this._buildFindingParams('findItemsByCategory', '', categoryFilters);
      const response = await this.httpClient.get(this.findingServiceUrl, { params });
      
      const parsedResults = this._parseFindingResponse(response.data, 'findItemsByCategory');
      
      await RedisHelper.setCache(cacheKey, parsedResults, this.defaultSettings.cacheTimeout);
      
      logger.info('eBay category search completed', {
        categoryId,
        totalResults: parsedResults.totalResults
      });
      
      return parsedResults;
      
    } catch (error) {
      logger.error('eBay category search failed', {
        categoryId,
        error: error.message
      });
      throw new Error(`eBay category search failed: ${error.message}`);
    }
  }
  
  // 商品詳細情報取得
  async getItemDetails(itemId, options = {}) {
    this.validateConfig();
    
    const cacheKey = `ebay_item_details:${itemId}`;
    
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      return cached;
    }
    
    try {
      const params = {
        callname: 'GetSingleItem',
        responseencoding: 'JSON',
        appid: this.appId,
        siteid: 0,
        version: 967,
        ItemID: itemId,
        IncludeSelector: 'Description,Details,ItemSpecifics,ShippingCosts'
      };
      
      const response = await this.httpClient.get(this.shoppingServiceUrl, { params });
      const itemData = response.data.Item;
      
      if (!itemData) {
        throw new Error('Item not found');
      }
      
      const itemDetails = this._parseItemDetails(itemData);
      
      await RedisHelper.setCache(cacheKey, itemDetails, this.defaultSettings.cacheTimeout);
      
      logger.info('eBay item details retrieved', {
        itemId,
        title: itemDetails.title
      });
      
      return itemDetails;
      
    } catch (error) {
      logger.error('eBay item details retrieval failed', {
        itemId,
        error: error.message
      });
      throw new Error(`Failed to get item details: ${error.message}`);
    }
  }
  
  // Finding APIパラメータ構築
  _buildFindingParams(operation, query, filters) {
    const params = {
      'OPERATION-NAME': operation,
      'SERVICE-VERSION': this.defaultSettings.serviceVersion,
      'SECURITY-APPNAME': this.appId,
      'RESPONSE-DATA-FORMAT': this.defaultSettings.responseFormat,
      'REST-PAYLOAD': ''
    };
    
    // キーワード設定
    if (query && query.trim()) {
      params.keywords = query.trim();
    }
    
    // ページネーション
    params['paginationInput.entriesPerPage'] = Math.min(filters.limit || 100, this.defaultSettings.maxResults);
    params['paginationInput.pageNumber'] = filters.page || 1;
    
    // アスペクトフィルター構築
    let filterIndex = 0;
    
    // カテゴリフィルター
    if (filters.categoryId) {
      params[`itemFilter(${filterIndex}).name`] = 'CategoryId';
      params[`itemFilter(${filterIndex}).value`] = filters.categoryId;
      filterIndex++;
    }
    
    // 価格フィルター
    if (filters.minPrice) {
      params[`itemFilter(${filterIndex}).name`] = 'MinPrice';
      params[`itemFilter(${filterIndex}).value`] = filters.minPrice;
      params[`itemFilter(${filterIndex}).paramName`] = 'Currency';
      params[`itemFilter(${filterIndex}).paramValue`] = filters.currency || 'USD';
      filterIndex++;
    }
    
    if (filters.maxPrice) {
      params[`itemFilter(${filterIndex}).name`] = 'MaxPrice';
      params[`itemFilter(${filterIndex}).value`] = filters.maxPrice;
      params[`itemFilter(${filterIndex}).paramName`] = 'Currency';
      params[`itemFilter(${filterIndex}).paramValue`] = filters.currency || 'USD';
      filterIndex++;
    }
    
    // コンディションフィルター
    if (filters.condition) {
      params[`itemFilter(${filterIndex}).name`] = 'Condition';
      const conditions = Array.isArray(filters.condition) ? filters.condition : [filters.condition];
      conditions.forEach((condition, i) => {
        params[`itemFilter(${filterIndex}).value(${i})`] = condition;
      });
      filterIndex++;
    }
    
    // セラー国フィルター
    if (filters.sellerCountry) {
      params[`itemFilter(${filterIndex}).name`] = 'LocatedIn';
      params[`itemFilter(${filterIndex}).value`] = filters.sellerCountry;
      filterIndex++;
    }
    
    // セラーフィルター
    if (filters.seller) {
      params[`itemFilter(${filterIndex}).name`] = 'Seller';
      params[`itemFilter(${filterIndex}).value`] = filters.seller;
      filterIndex++;
    }
    
    // リスティングタイプフィルター
    if (filters.listingType) {
      params[`itemFilter(${filterIndex}).name`] = 'ListingType';
      const types = Array.isArray(filters.listingType) ? filters.listingType : [filters.listingType];
      types.forEach((type, i) => {
        params[`itemFilter(${filterIndex}).value(${i})`] = type;
      });
      filterIndex++;
    }
    
    // 送料無料フィルター
    if (filters.freeShipping) {
      params[`itemFilter(${filterIndex}).name`] = 'FreeShippingOnly';
      params[`itemFilter(${filterIndex}).value`] = 'true';
      filterIndex++;
    }
    
    // 即決価格フィルター
    if (filters.buyItNow) {
      params[`itemFilter(${filterIndex}).name`] = 'AvailableTo';
      params[`itemFilter(${filterIndex}).value`] = filters.buyItNow;
      filterIndex++;
    }
    
    // ソート設定
    if (filters.sortOrder) {
      params['sortOrder'] = filters.sortOrder; // 'BestMatch', 'EndTimeSoonest', 'PricePlusShippingLowest', etc.
    }
    
    // アウトプットセレクター（取得項目指定）
    const outputSelectors = [
      'SellerInfo',
      'StoreInfo',
      'PictureURLSuperSize',
      'PictureURLLarge'
    ];
    outputSelectors.forEach((selector, i) => {
      params[`outputSelector(${i})`] = selector;
    });
    
    return params;
  }
  
  // Finding APIレスポンス解析
  _parseFindingResponse(data, operation) {
    try {
      const response = data[`${operation}Response`]?.[0];
      
      if (!response) {
        throw new Error('Invalid response structure');
      }
      
      // エラーチェック
      if (response.errorMessage) {
        const errors = Array.isArray(response.errorMessage) ? response.errorMessage : [response.errorMessage];
        throw new Error(`eBay API Error: ${errors.map(e => e.error?.[0]?.message?.[0] || 'Unknown error').join(', ')}`);
      }
      
      const searchResult = response.searchResult?.[0];
      
      if (!searchResult) {
        return {
          items: [],
          totalResults: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: 0
        };
      }
      
      // ページング情報
      const paginationOutput = response.paginationOutput?.[0];
      const totalEntries = parseInt(paginationOutput?.totalEntries?.[0] || '0');
      const totalPages = parseInt(paginationOutput?.totalPages?.[0] || '0');
      const pageNumber = parseInt(paginationOutput?.pageNumber?.[0] || '1');
      const entriesPerPage = parseInt(paginationOutput?.entriesPerPage?.[0] || '0');
      
      // 商品データ解析
      const items = (searchResult.item || []).map(item => this._parseItemData(item));
      
      return {
        items,
        totalResults: totalEntries,
        totalPages,
        currentPage: pageNumber,
        itemsPerPage: entriesPerPage,
        searchMetadata: {
          timestamp: new Date().toISOString(),
          operation,
          processingTime: response.timestamp?.[0]
        }
      };
      
    } catch (error) {
      logger.error('Failed to parse eBay Finding response', {
        operation,
        error: error.message,
        dataStructure: Object.keys(data)
      });
      throw error;
    }
  }
  
  // 個別商品データ解析
  _parseItemData(item) {
    try {
      return {
        ebayItemId: item.itemId?.[0],
        title: item.title?.[0],
        subtitle: item.subtitle?.[0] || '',
        
        // カテゴリ情報
        primaryCategory: {
          categoryId: item.primaryCategory?.[0]?.categoryId?.[0],
          categoryName: item.primaryCategory?.[0]?.categoryName?.[0]
        },
        
        // 価格情報
        currentPrice: {
          value: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
          currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD'
        },
        
        // 販売状況
        sellingStatus: {
          sellingState: item.sellingStatus?.[0]?.sellingState?.[0],
          timeLeft: item.sellingStatus?.[0]?.timeLeft?.[0],
          bidCount: parseInt(item.sellingStatus?.[0]?.bidCount?.[0] || '0'),
          quantitySold: parseInt(item.sellingStatus?.[0]?.quantitySold?.[0] || '0')
        },
        
        // リスティング情報
        listingInfo: {
          bestOfferEnabled: item.listingInfo?.[0]?.bestOfferEnabled?.[0] === 'true',
          buyItNowAvailable: item.listingInfo?.[0]?.buyItNowAvailable?.[0] === 'true',
          startTime: item.listingInfo?.[0]?.startTime?.[0],
          endTime: item.listingInfo?.[0]?.endTime?.[0],
          listingType: item.listingInfo?.[0]?.listingType?.[0],
          gift: item.listingInfo?.[0]?.gift?.[0] === 'true',
          watchCount: parseInt(item.listingInfo?.[0]?.watchCount?.[0] || '0')
        },
        
        // 配送情報
        shippingInfo: {
          shippingServiceCost: {
            value: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || '0'),
            currency: item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.['@currencyId'] || 'USD'
          },
          shippingType: item.shippingInfo?.[0]?.shippingType?.[0],
          expeditedShipping: item.shippingInfo?.[0]?.expeditedShipping?.[0] === 'true',
          oneDayShipping: item.shippingInfo?.[0]?.oneDayShipping?.[0] === 'true',
          returnsAccepted: item.returnsInfo?.[0]?.returnsAccepted?.[0] === 'true'
        },
        
        // セラー情報
        sellerInfo: {
          sellerUserName: item.sellerInfo?.[0]?.sellerUserName?.[0],
          feedbackScore: parseInt(item.sellerInfo?.[0]?.feedbackScore?.[0] || '0'),
          positiveFeedbackPercent: parseFloat(item.sellerInfo?.[0]?.positiveFeedbackPercent?.[0] || '0'),
          feedbackRatingStar: item.sellerInfo?.[0]?.feedbackRatingStar?.[0],
          topRatedSeller: item.sellerInfo?.[0]?.topRatedSeller?.[0] === 'true'
        },
        
        // 画像・URL
        galleryURL: item.galleryURL?.[0] || '',
        pictureURLSuperSize: item.pictureURLSuperSize?.[0] || '',
        pictureURLLarge: item.pictureURLLarge?.[0] || '',
        viewItemURL: item.viewItemURL?.[0] || '',
        
        // 基本情報
        location: item.location?.[0] || '',
        country: item.country?.[0] || '',
        condition: {
          conditionId: item.condition?.[0]?.conditionId?.[0],
          conditionDisplayName: item.condition?.[0]?.conditionDisplayName?.[0]
        },
        
        // ストア情報（もしあれば）
        storeInfo: item.storeInfo?.[0] ? {
          storeName: item.storeInfo[0].storeName?.[0],
          storeURL: item.storeInfo[0].storeURL?.[0]
        } : null,
        
        // メタデータ
        distance: item.distance?.[0] ? {
          value: parseFloat(item.distance[0].__value__),
          unit: item.distance[0]['@unit']
        } : null,
        
        compatibility: item.compatibility?.[0] || '',
        topRatedListing: item.topRatedListing?.[0] === 'true',
        
        // 解析時刻
        parsedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.warn('Failed to parse individual item data', {
        itemId: item.itemId?.[0] || 'unknown',
        error: error.message
      });
      
      // 最小限の情報で返す
      return {
        ebayItemId: item.itemId?.[0] || null,
        title: item.title?.[0] || 'Unknown Title',
        currentPrice: {
          value: 0,
          currency: 'USD'
        },
        error: 'Partial parse failure'
      };
    }
  }
  
  // Shopping API商品詳細解析
  _parseItemDetails(itemData) {
    return {
      itemId: itemData.ItemID,
      title: itemData.Title,
      description: itemData.Description,
      
      // 価格情報
      currentPrice: {
        value: parseFloat(itemData.ConvertedCurrentPrice?.Value || '0'),
        currency: itemData.ConvertedCurrentPrice?.CurrencyID || 'USD'
      },
      
      // 商品仕様
      itemSpecifics: (itemData.ItemSpecifics || []).map(spec => ({
        name: spec.Name,
        value: Array.isArray(spec.Value) ? spec.Value : [spec.Value]
      })),
      
      // 画像
      pictureURL: itemData.PictureURL || [],
      
      // 詳細情報
      brand: itemData.Brand || '',
      mpn: itemData.MPN || '',
      upc: itemData.UPC || '',
      ean: itemData.EAN || '',
      
      // 配送情報
      shippingCostSummary: itemData.ShippingCostSummary,
      
      // セラー情報
      seller: {
        userName: itemData.Seller?.UserID,
        feedbackScore: itemData.Seller?.FeedbackScore,
        feedbackPercent: itemData.Seller?.PositiveFeedbackPercent
      },
      
      // サイト情報
      site: itemData.Site,
      location: itemData.Location,
      country: itemData.Country
    };
  }
  
  // 統計計算ヘルパー
  _calculateAveragePrice(items) {
    if (!items.length) return 0;
    
    const total = items.reduce((sum, item) => sum + (item.currentPrice?.value || 0), 0);
    return Math.round((total / items.length) * 100) / 100;
  }
  
  _extractTopCategories(items) {
    const categoryCount = {};
    
    items.forEach(item => {
      const categoryName = item.primaryCategory?.categoryName;
      if (categoryName) {
        categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }
  
  _calculateCompletedStats(items) {
    const soldItems = items.filter(item => item.sellingStatus?.quantitySold > 0);
    
    if (!soldItems.length) {
      return {
        totalSold: 0,
        averageSoldPrice: 0,
        soldItemsCount: 0,
        successRate: 0
      };
    }
    
    const totalSoldQuantity = soldItems.reduce((sum, item) => sum + item.sellingStatus.quantitySold, 0);
    const averageSoldPrice = this._calculateAveragePrice(soldItems);
    const successRate = Math.round((soldItems.length / items.length) * 100 * 100) / 100;
    
    return {
      totalSold: totalSoldQuantity,
      averageSoldPrice,
      soldItemsCount: soldItems.length,
      successRate
    };
  }
}

module.exports = new EbayService();