// src/routes/research.js - リサーチAPIルート
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const ebayService = require('../services/ebayService');
const Product = require('../models/Product');
const ResearchSession = require('../models/ResearchSession');

// バリデーションミドルウェア
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      Helpers.createResponse(false, null, 'Validation failed', errors.array())
    );
  }
  next();
};

// キーワード検索エンドポイント
router.post('/search/keyword',
  [
    body('query')
      .notEmpty()
      .withMessage('検索クエリは必須です')
      .isLength({ min: 1, max: 500 })
      .withMessage('検索クエリは1-500文字で入力してください'),
    
    body('filters').optional().isObject().withMessage('フィルターはオブジェクト形式で指定してください'),
    
    body('filters.minPrice').optional().isFloat({ min: 0 }).withMessage('最小価格は0以上の数値で指定してください'),
    body('filters.maxPrice').optional().isFloat({ min: 0 }).withMessage('最大価格は0以上の数値で指定してください'),
    body('filters.category').optional().isString().withMessage('カテゴリは文字列で指定してください'),
    body('filters.condition').optional().isArray().withMessage('コンディションは配列で指定してください'),
    body('filters.sellerCountry').optional().isString().isLength({ max: 2 }).withMessage('販売者国は2文字のコードで指定してください'),
    body('filters.page').optional().isInt({ min: 1, max: 100 }).withMessage('ページ番号は1-100の範囲で指定してください'),
    body('filters.limit').optional().isInt({ min: 1, max: 200 }).withMessage('取得件数は1-200の範囲で指定してください'),
    
    body('options').optional().isObject().withMessage('オプションはオブジェクト形式で指定してください'),
    body('options.saveResults').optional().isBoolean().withMessage('結果保存フラグはboolean値で指定してください'),
    body('options.bypassCache').optional().isBoolean().withMessage('キャッシュバイパスフラグはboolean値で指定してください')
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const requestId = Helpers.generateRequestId();
    
    try {
      const { query, filters = {}, options = {} } = req.body;
      const userId = req.user.id;
      
      logger.info('Keyword search started', {
        requestId,
        userId,
        query,
        filters: Object.keys(filters)
      });
      
      // eBay検索実行
      const searchResults = await ebayService.searchByKeyword(query, filters, options);
      
      // 検索セッション作成
      const sessionData = {
        userId,
        sessionName: `キーワード検索: ${query}`,
        searchQuery: query,
        searchType: 'keyword',
        searchFilters: filters,
        totalResultsFound: searchResults.totalResults,
        status: 'completed',
        sessionData: {
          requestId,
          searchDuration: Date.now() - startTime,
          apiCalls: 1,
          cacheUsed: !options.bypassCache
        }
      };
      
      let session = null;
      if (options.saveResults !== false) {
        try {
          session = await ResearchSession.create(sessionData);
        } catch (sessionError) {
          logger.warn('Failed to save research session', {
            requestId,
            error: sessionError.message
          });
        }
      }
      
      // 商品データ保存（バックグラウンドで非同期実行）
      if (options.saveResults !== false && searchResults.items.length > 0) {
        setImmediate(async () => {
          try {
            const productsToSave = searchResults.items.map(item => ({
              ebayItemId: item.ebayItemId,
              ebayTitle: item.title,
              ebayCategoryId: item.primaryCategory?.categoryId,
              ebayCategoryName: item.primaryCategory?.categoryName,
              ebayCondition: item.condition?.conditionDisplayName,
              ebaySellingPrice: item.currentPrice?.value,
              ebayCurrency: item.currentPrice?.currency,
              ebaySoldQuantity: item.sellingStatus?.quantitySold || 0,
              ebayWatchersCount: item.listingInfo?.watchCount || 0,
              ebayListingUrl: item.viewItemURL,
              ebayImageUrls: [item.galleryURL, item.pictureURLSuperSize, item.pictureURLLarge].filter(Boolean),
              ebaySellerUsername: item.sellerInfo?.sellerUserName,
              ebaySellerCountry: item.country,
              status: 'active',
              lastResearchAt: new Date().toISOString()
            }));
            
            const savedProducts = await Product.bulkCreate(productsToSave, userId);
            
            logger.info('Products saved in background', {
              requestId,
              savedCount: savedProducts.length,
              totalItems: searchResults.items.length
            });
            
          } catch (saveError) {
            logger.warn('Background product save failed', {
              requestId,
              error: saveError.message
            });
          }
        });
      }
      
      const responseData = {
        ...searchResults,
        session: session ? {
          id: session.id,
          uuid: session.uuid,
          sessionName: session.sessionName
        } : null,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          cached: searchResults.searchMetadata?.cached || false,
          savedToDatabase: options.saveResults !== false
        }
      };
      
      // ビジネスメトリクス記録
      logger.logBusinessMetric('keyword_search_completed', 1, {
        userId,
        totalResults: searchResults.totalResults,
        processingTime: Date.now() - startTime
      });
      
      res.json(
        Helpers.createResponse(
          true,
          responseData,
          `${searchResults.totalResults}件の商品が見つかりました`
        )
      );
      
    } catch (error) {
      logger.error('Keyword search failed', {
        requestId,
        userId: req.user?.id,
        query: req.body?.query,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json(
        Helpers.createResponse(
          false,
          null,
          'キーワード検索に失敗しました',
          [{ msg: error.message }]
        )
      );
    }
  }
);

// セラー分析エンドポイント
router.post('/search/seller',
  [
    body('sellerUsername')
      .notEmpty()
      .withMessage('セラー名は必須です')
      .isLength({ min: 1, max: 100 })
      .withMessage('セラー名は1-100文字で入力してください'),
    
    body('filters').optional().isObject(),
    body('filters.includeCompleted').optional().isBoolean().withMessage('完了商品含有フラグはboolean値で指定してください'),
    body('filters.category').optional().isString(),
    body('filters.minPrice').optional().isFloat({ min: 0 }),
    body('filters.maxPrice').optional().isFloat({ min: 0 }),
    body('filters.limit').optional().isInt({ min: 1, max: 200 }),
    
    body('options').optional().isObject(),
    body('options.saveResults').optional().isBoolean(),
    body('options.detailedAnalysis').optional().isBoolean().withMessage('詳細分析フラグはboolean値で指定してください')
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const requestId = Helpers.generateRequestId();
    
    try {
      const { sellerUsername, filters = {}, options = {} } = req.body;
      const userId = req.user.id;
      
      logger.info('Seller analysis started', {
        requestId,
        userId,
        sellerUsername,
        detailedAnalysis: options.detailedAnalysis
      });
      
      // セラー検索実行
      const sellerResults = await ebayService.searchBySeller(sellerUsername, filters, options);
      
      let completedResults = null;
      let detailedAnalysis = null;
      
      // 詳細分析が要求された場合
      if (options.detailedAnalysis && sellerResults.items.length > 0) {
        try {
          // 売れた商品も検索
          const completedFilters = { ...filters, soldItemsOnly: true };
          completedResults = await ebayService.searchCompletedItems('', {
            ...completedFilters,
            seller: sellerUsername
          });
          
          // 詳細分析データ生成
          detailedAnalysis = await this._generateSellerAnalysis(sellerResults, completedResults);
          
        } catch (analysisError) {
          logger.warn('Detailed seller analysis failed', {
            requestId,
            sellerUsername,
            error: analysisError.message
          });
        }
      }
      
      // セッション保存
      const sessionData = {
        userId,
        sessionName: `セラー分析: ${sellerUsername}`,
        searchQuery: sellerUsername,
        searchType: 'seller',
        searchFilters: filters,
        totalResultsFound: sellerResults.totalResults,
        status: 'completed',
        sessionData: {
          requestId,
          searchDuration: Date.now() - startTime,
          apiCalls: completedResults ? 2 : 1,
          detailedAnalysis: !!detailedAnalysis
        }
      };
      
      let session = null;
      if (options.saveResults !== false) {
        try {
          session = await ResearchSession.create(sessionData);
        } catch (sessionError) {
          logger.warn('Failed to save seller research session', {
            requestId,
            error: sessionError.message
          });
        }
      }
      
      const responseData = {
        seller: {
          username: sellerUsername,
          currentListings: sellerResults,
          completedListings: completedResults,
          analysis: detailedAnalysis,
          summary: sellerResults.sellerInfo
        },
        session: session ? {
          id: session.id,
          uuid: session.uuid,
          sessionName: session.sessionName
        } : null,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          detailedAnalysis: !!detailedAnalysis
        }
      };
      
      logger.logBusinessMetric('seller_analysis_completed', 1, {
        userId,
        sellerUsername,
        totalListings: sellerResults.totalResults,
        detailedAnalysis: !!detailedAnalysis
      });
      
      res.json(
        Helpers.createResponse(
          true,
          responseData,
          `${sellerUsername}の分析が完了しました（${sellerResults.totalResults}件の商品）`
        )
      );
      
    } catch (error) {
      logger.error('Seller analysis failed', {
        requestId,
        userId: req.user?.id,
        sellerUsername: req.body?.sellerUsername,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(
          false,
          null,
          'セラー分析に失敗しました',
          [{ msg: error.message }]
        )
      );
    }
  }
);

// 売れた商品検索エンドポイント
router.post('/search/completed',
  [
    body('query').optional().isString().isLength({ max: 500 }),
    body('filters').optional().isObject(),
    body('filters.category').optional().isString(),
    body('filters.minPrice').optional().isFloat({ min: 0 }),
    body('filters.maxPrice').optional().isFloat({ min: 0 }),
    body('filters.sellerCountry').optional().isString().isLength({ max: 2 }),
    body('filters.completedDays').optional().isInt({ min: 1, max: 90 }).withMessage('完了日数は1-90日の範囲で指定してください'),
    body('options').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const requestId = Helpers.generateRequestId();
    
    try {
      const { query = '', filters = {}, options = {} } = req.body;
      const userId = req.user.id;
      
      logger.info('Completed items search started', {
        requestId,
        userId,
        query,
        filters: Object.keys(filters)
      });
      
      // 売れた商品検索実行
      const completedResults = await ebayService.searchCompletedItems(query, filters, options);
      
      // セッション保存
      const sessionData = {
        userId,
        sessionName: query ? `売れた商品検索: ${query}` : '売れた商品検索',
        searchQuery: query,
        searchType: 'completed',
        searchFilters: filters,
        totalResultsFound: completedResults.totalResults,
        status: 'completed',
        sessionData: {
          requestId,
          searchDuration: Date.now() - startTime,
          apiCalls: 1
        }
      };
      
      let session = null;
      if (options.saveResults !== false) {
        try {
          session = await ResearchSession.create(sessionData);
        } catch (sessionError) {
          logger.warn('Failed to save completed search session', {
            requestId,
            error: sessionError.message
          });
        }
      }
      
      const responseData = {
        ...completedResults,
        session: session ? {
          id: session.id,
          uuid: session.uuid,
          sessionName: session.sessionName
        } : null,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime
        }
      };
      
      logger.logBusinessMetric('completed_search_completed', 1, {
        userId,
        totalResults: completedResults.totalResults,
        avgSoldPrice: completedResults.completedStats?.averageSoldPrice || 0
      });
      
      res.json(
        Helpers.createResponse(
          true,
          responseData,
          `${completedResults.totalResults}件の売れた商品が見つかりました`
        )
      );
      
    } catch (error) {
      logger.error('Completed items search failed', {
        requestId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(
          false,
          null,
          '売れた商品検索に失敗しました',
          [{ msg: error.message }]
        )
      );
    }
  }
);

// カテゴリ別検索エンドポイント
router.post('/search/category',
  [
    body('categoryId')
      .notEmpty()
      .withMessage('カテゴリIDは必須です')
      .isInt({ min: 1 })
      .withMessage('カテゴリIDは正の整数で指定してください'),
    
    body('filters').optional().isObject(),
    body('options').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const requestId = Helpers.generateRequestId();
    
    try {
      const { categoryId, filters = {}, options = {} } = req.body;
      const userId = req.user.id;
      
      logger.info('Category search started', {
        requestId,
        userId,
        categoryId
      });
      
      // カテゴリ検索実行
      const categoryResults = await ebayService.searchByCategory(categoryId, filters, options);
      
      // セッション保存
      const sessionData = {
        userId,
        sessionName: `カテゴリ検索: ${categoryId}`,
        searchQuery: categoryId.toString(),
        searchType: 'category',
        searchFilters: { ...filters, categoryId },
        totalResultsFound: categoryResults.totalResults,
        status: 'completed',
        sessionData: {
          requestId,
          searchDuration: Date.now() - startTime,
          apiCalls: 1
        }
      };
      
      let session = null;
      if (options.saveResults !== false) {
        try {
          session = await ResearchSession.create(sessionData);
        } catch (sessionError) {
          logger.warn('Failed to save category search session', {
            requestId,
            error: sessionError.message
          });
        }
      }
      
      const responseData = {
        ...categoryResults,
        session: session ? {
          id: session.id,
          uuid: session.uuid,
          sessionName: session.sessionName
        } : null,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime
        }
      };
      
      logger.logBusinessMetric('category_search_completed', 1, {
        userId,
        categoryId,
        totalResults: categoryResults.totalResults
      });
      
      res.json(
        Helpers.createResponse(
          true,
          responseData,
          `カテゴリID ${categoryId} で ${categoryResults.totalResults}件の商品が見つかりました`
        )
      );
      
    } catch (error) {
      logger.error('Category search failed', {
        requestId,
        userId: req.user?.id,
        categoryId: req.body?.categoryId,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(
          false,
          null,
          'カテゴリ検索に失敗しました',
          [{ msg: error.message }]
        )
      );
    }
  }
);

// 商品詳細取得エンドポイント
router.get('/item/:itemId',
  [
    query('includeSuppliers').optional().isBoolean().withMessage('仕入先含有フラグはboolean値で指定してください'),
    query('includeProfitCalc').optional().isBoolean().withMessage('利益計算含有フラグはboolean値で指定してください')
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const requestId = Helpers.generateRequestId();
    
    try {
      const { itemId } = req.params;
      const { includeSuppliers = false, includeProfitCalc = false } = req.query;
      const userId = req.user.id;
      
      logger.info('Item details request started', {
        requestId,
        userId,
        itemId,
        includeSuppliers,
        includeProfitCalc
      });
      
      // eBay商品詳細取得
      const itemDetails = await ebayService.getItemDetails(itemId);
      
      let supplierData = null;
      let profitData = null;
      
      // データベースから保存済み商品情報取得
      const savedProduct = await Product.findByEbayItemId(itemId, userId);
      
      if (includeSuppliers && savedProduct) {
        // 仕入先情報取得（実装は次のフェーズ）
        // supplierData = await SupplierService.findSuppliersForProduct(savedProduct.id);
      }
      
      if (includeProfitCalc && savedProduct && supplierData) {
        // 利益計算実行（実装は次のフェーズ）
        // profitData = await ProfitCalculationService.calculateProfit(savedProduct, supplierData);
      }
      
      const responseData = {
        ebayDetails: itemDetails,
        savedProduct: savedProduct ? savedProduct.toJSON() : null,
        suppliers: supplierData,
        profitCalculations: profitData,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          dataCompleteness: {
            ebayDetails: true,
            savedProduct: !!savedProduct,
            suppliers: !!supplierData,
            profitCalculations: !!profitData
          }
        }
      };
      
      res.json(
        Helpers.createResponse(
          true,
          responseData,
          '商品詳細を取得しました'
        )
      );
      
    } catch (error) {
      logger.error('Item details request failed', {
        requestId,
        userId: req.user?.id,
        itemId: req.params?.itemId,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(
          false,
          null,
          '商品詳細の取得に失敗しました',
          [{ msg: error.message }]
        )
      );
    }
  }
);

// 検索履歴取得エンドポイント
router.get('/history',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('ページ番号は1以上の整数で指定してください'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('取得件数は1-100の範囲で指定してください'),
    query('searchType').optional().isIn(['keyword', 'seller', 'category', 'completed']).withMessage('検索タイプが無効です'),
    query('dateFrom').optional().isISO8601().withMessage('開始日時はISO8601形式で指定してください'),
    query('dateTo').optional().isISO8601().withMessage('終了日時はISO8601形式で指定してください')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        searchType,
        dateFrom,
        dateTo
      } = req.query;
      
      const userId = req.user.id;
      
      const filters = { userId };
      if (searchType) filters.searchType = searchType;
      if (dateFrom) filters.createdAfter = dateFrom;
      if (dateTo) filters.createdBefore = dateTo;
      
      const history = await ResearchSession.search(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });
      
      res.json(
        Helpers.createResponse(
          true,
          history,
          '検索履歴を取得しました'
        )
      );
      
    } catch (error) {
      logger.error('Research history request failed', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(
          false,
          null,
          '検索履歴の取得に失敗しました',
          [{ msg: error.message }]
        )
      );
    }
  }
);

// セラー分析詳細生成ヘルパー
router._generateSellerAnalysis = async function(currentListings, completedListings) {
  const analysis = {
    listingStats: {
      totalCurrentListings: currentListings.totalResults,
      totalCompletedListings: completedListings ? completedListings.totalResults : 0,
      averageCurrentPrice: this._calculateAveragePrice(currentListings.items),
      averageCompletedPrice: completedListings ? this._calculateAveragePrice(completedListings.items) : 0
    },
    categoryAnalysis: {
      topCategories: this._extractTopCategories(currentListings.items),
      categoryDistribution: this._calculateCategoryDistribution(currentListings.items)
    },
    priceAnalysis: {
      priceRanges: this._calculatePriceRanges(currentListings.items),
      priceTrends: completedListings ? this._analyzePriceTrends(currentListings.items, completedListings.items) : null
    },
    performanceMetrics: completedListings ? {
      successRate: (completedListings.totalResults / currentListings.totalResults * 100),
      averageTimeTaken: this._calculateAverageListingDuration(completedListings.items)
    } : null
  };
  
  return analysis;
};

// 価格計算ヘルパー
router._calculateAveragePrice = function(items) {
  if (!items || items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + (item.currentPrice?.value || 0), 0);
  return Math.round((total / items.length) * 100) / 100;
};

// カテゴリ分析ヘルパー
router._extractTopCategories = function(items) {
  const categoryCount = {};
  items.forEach(item => {
    const category = item.primaryCategory?.categoryName;
    if (category) {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }
  });
  
  return Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
};

router._calculateCategoryDistribution = function(items) {
  const distribution = {};
  const total = items.length;
  
  items.forEach(item => {
    const category = item.primaryCategory?.categoryName || 'その他';
    distribution[category] = (distribution[category] || 0) + 1;
  });
  
  Object.keys(distribution).forEach(category => {
    distribution[category] = {
      count: distribution[category],
      percentage: Math.round((distribution[category] / total) * 100 * 100) / 100
    };
  });
  
  return distribution;
};

// 価格レンジ分析ヘルパー
router._calculatePriceRanges = function(items) {
  const ranges = {
    '0-25': 0,
    '25-50': 0,
    '50-100': 0,
    '100-250': 0,
    '250-500': 0,
    '500+': 0
  };
  
  items.forEach(item => {
    const price = item.currentPrice?.value || 0;
    if (price < 25) ranges['0-25']++;
    else if (price < 50) ranges['25-50']++;
    else if (price < 100) ranges['50-100']++;
    else if (price < 250) ranges['100-250']++;
    else if (price < 500) ranges['250-500']++;
    else ranges['500+']++;
  });
  
  return ranges;
};

module.exports = router;