// src/routes/suppliers.js - 仕入先APIルート
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();

const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const Product = require('../models/Product');
const DomesticSupplier = require('../models/DomesticSupplier');
const supplierSearchService = require('../services/supplierSearchService');

// バリデーションエラーハンドラー
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      Helpers.createResponse(false, null, 'Validation failed', errors.array())
    );
  }
  next();
};

// 商品の仕入先検索
router.post('/search/:productId',
  [
    param('productId').isInt().withMessage('Product ID must be an integer'),
    body('options').optional().isObject().withMessage('Options must be an object'),
    body('options.bypassCache').optional().isBoolean(),
    body('options.platforms').optional().isArray().withMessage('Platforms must be an array'),
    body('options.maxResults').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    const startTime = Date.now();
    
    try {
      const { productId } = req.params;
      const { options = {} } = req.body;
      const userId = req.user.id;
      
      logger.info('Supplier search started', {
        requestId,
        userId,
        productId,
        options
      });
      
      // 商品存在確認
      const product = await Product.findById(productId, userId);
      if (!product) {
        return res.status(404).json(
          Helpers.createResponse(false, null, 'Product not found')
        );
      }
      
      // API クォータ消費
      await req.user.consumeQuota(5); // 仕入先検索は重い処理なので5ポイント消費
      
      // 既存仕入先確認
      let existingSuppliers = [];
      if (!options.bypassCache) {
        existingSuppliers = await DomesticSupplier.findByProductId(productId);
        
        // 最近のデータがあれば返す（6時間以内）
        const recentSuppliers = existingSuppliers.filter(supplier => {
          const lastCheck = new Date(supplier.lastPriceCheck);
          const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
          return lastCheck > sixHoursAgo;
        });
        
        if (recentSuppliers.length > 0) {
          logger.info('Returning cached supplier data', {
            requestId,
            productId,
            supplierCount: recentSuppliers.length
          });
          
          return res.json(
            Helpers.createResponse(
              true,
              {
                suppliers: recentSuppliers.map(s => s.toJSON()),
                cached: true,
                searchMetadata: {
                  requestId,
                  processingTime: Date.now() - startTime,
                  dataSource: 'cache'
                }
              },
              `${recentSuppliers.length}件の仕入先候補が見つかりました（キャッシュ）`
            )
          );
        }
      }
      
      // 新しい検索実行
      const productData = {
        title: product.ebayTitle,
        brand: product.brand,
        model: product.model,
        janCode: product.janCode,
        ebaySellingPrice: product.ebaySellingPrice
      };
      
      const searchResult = await supplierSearchService.searchAllPlatforms(
        product.ebayTitle,
        productData,
        options
      );
      
      // 結果をデータベースに保存
      const savedSuppliers = [];
      for (const supplierData of searchResult.suppliers) {
        try {
          // マッチング信頼度計算
          const matchingConfidence = supplierSearchService.calculateMatchingConfidence(
            supplierData,
            productData
          );
          
          const supplier = new DomesticSupplier({
            productId: productId,
            ...supplierData,
            matchingConfidence,
            lastPriceCheck: new Date().toISOString()
          });
          
          await supplier.create();
          savedSuppliers.push(supplier);
          
        } catch (saveError) {
          logger.warn('Failed to save supplier', {
            requestId,
            productId,
            supplierType: supplierData.supplierType,
            error: saveError.message
          });
        }
      }
      
      // ビジネスメトリクス記録
      logger.logBusinessMetric('supplier_search_completed', 1, {
        userId,
        productId,
        suppliersFound: savedSuppliers.length,
        processingTime: Date.now() - startTime
      });
      
      const responseData = {
        suppliers: savedSuppliers.map(s => s.toJSON()),
        cached: false,
        errors: searchResult.errors,
        searchMetadata: {
          ...searchResult.searchMetadata,
          requestId,
          processingTime: Date.now() - startTime,
          dataSource: 'live_search'
        }
      };
      
      res.json(
        Helpers.createResponse(
          true,
          responseData,
          `${savedSuppliers.length}件の仕入先候補が見つかりました`
        )
      );
      
    } catch (error) {
      logger.error('Supplier search failed', {
        requestId,
        userId: req.user?.id,
        productId: req.params?.productId,
        error: error.message
      });
      
      if (error.message.includes('quota exceeded')) {
        return res.status(429).json(
          Helpers.createResponse(false, null, 'API quota exceeded')
        );
      }
      
      res.status(500).json(
        Helpers.createResponse(false, null, '仕入先検索に失敗しました')
      );
    }
  }
);

// 仕入先リスト取得
router.get('/product/:productId',
  [
    param('productId').isInt().withMessage('Product ID must be an integer'),
    query('supplierType').optional().isIn(['amazon', 'rakuten', 'mercari', 'yahoo_auctions', 'yahoo_shopping']),
    query('sortBy').optional().isIn(['price', 'reliability', 'matching_confidence']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productId } = req.params;
      const {
        supplierType,
        sortBy = 'matching_confidence',
        sortOrder = 'desc',
        limit = 20
      } = req.query;
      
      const userId = req.user.id;
      
      // 商品所有者確認
      const product = await Product.findById(productId, userId);
      if (!product) {
        return res.status(404).json(
          Helpers.createResponse(false, null, 'Product not found')
        );
      }
      
      // 仕入先取得
      let suppliers = await DomesticSupplier.findByProductId(productId);
      
      // フィルタリング
      if (supplierType) {
        suppliers = suppliers.filter(s => s.supplierType === supplierType);
      }
      
      // ソート
      suppliers.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'price':
            aValue = a.price || 0;
            bValue = b.price || 0;
            break;
          case 'reliability':
            aValue = a.reliabilityScore || 0;
            bValue = b.reliabilityScore || 0;
            break;
          case 'matching_confidence':
            aValue = a.matchingConfidence || 0;
            bValue = b.matchingConfidence || 0;
            break;
          default:
            aValue = bValue = 0;
        }
        
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
      
      // 制限
      suppliers = suppliers.slice(0, parseInt(limit));
      
      res.json(
        Helpers.createResponse(
          true,
          {
            suppliers: suppliers.map(s => s.toJSON()),
            totalCount: suppliers.length,
            filters: { supplierType, sortBy, sortOrder, limit }
          },
          `${suppliers.length}件の仕入先を取得しました`
        )
      );
      
    } catch (error) {
      logger.error('Get suppliers failed', {
        userId: req.user?.id,
        productId: req.params?.productId,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, '仕入先リスト取得に失敗しました')
      );
    }
  }
);

// 仕入先価格更新
router.put('/:supplierId/update-price',
  [
    param('supplierId').isInt().withMessage('Supplier ID must be an integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { supplierId } = req.params;
      const userId = req.user.id;
      
      // 仕入先取得
      const supplier = await DomesticSupplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json(
          Helpers.createResponse(false, null, 'Supplier not found')
        );
      }
      
      // 商品所有者確認
      const product = await Product.findById(supplier.productId, userId);
      if (!product) {
        return res.status(403).json(
          Helpers.createResponse(false, null, 'Access denied')
        );
      }
      
      // API クォータ消費
      await req.user.consumeQuota(2);
      
      // 価格更新処理（実際の実装では各プラットフォームのAPIを呼ぶ）
      const oldPrice = supplier.price;
      
      // モック価格更新
      const priceVariation = 0.95 + (Math.random() * 0.1); // ±5%の変動
      const newPrice = Math.round(oldPrice * priceVariation);
      
      await supplier.updatePriceHistory(newPrice);
      
      logger.info('Supplier price updated', {
        supplierId,
        userId,
        oldPrice,
        newPrice,
        priceChange: newPrice - oldPrice
      });
      
      res.json(
        Helpers.createResponse(
          true,
          supplier.toJSON(),
          '価格を更新しました'
        )
      );
      
    } catch (error) {
      logger.error('Price update failed', {
        supplierId: req.params?.supplierId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, '価格更新に失敗しました')
      );
    }
  }
);

// 最安値仕入先検索
router.get('/cheapest/:productId',
  [
    param('productId').isInt().withMessage('Product ID must be an integer'),
    query('platforms').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productId } = req.params;
      const platforms = req.query.platforms ? req.query.platforms.split(',') : [];
      const userId = req.user.id;
      
      // 商品所有者確認
      const product = await Product.findById(productId, userId);
      if (!product) {
        return res.status(404).json(
          Helpers.createResponse(false, null, 'Product not found')
        );
      }
      
      const cheapestSuppliers = await DomesticSupplier.findCheapestByProduct(productId, platforms);
      
      res.json(
        Helpers.createResponse(
          true,
          {
            suppliers: cheapestSuppliers.map(s => s.toJSON()),
            platforms: platforms.length > 0 ? platforms : 'all'
          },
          `最安値の仕入先候補 ${cheapestSuppliers.length}件`
        )
      );
      
    } catch (error) {
      logger.error('Get cheapest suppliers failed', {
        productId: req.params?.productId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, '最安値検索に失敗しました')
      );
    }
  }
);

module.exports = router;

// src/routes/profits.js - 利益計算APIルート
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();

const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const Product = require('../models/Product');
const DomesticSupplier = require('../models/DomesticSupplier');
const ProfitCalculation = require('../models/ProfitCalculation');
const profitCalculationService = require('../services/profitCalculationService');

// バリデーションエラーハンドラー
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      Helpers.createResponse(false, null, 'Validation failed', errors.array())
    );
  }
  next();
};

// 単一利益計算
router.post('/calculate',
  [
    body('productId').isInt().withMessage('Product ID must be an integer'),
    body('supplierId').isInt().withMessage('Supplier ID must be an integer'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    body('settings.exchangeRateUsdJpy').optional().isFloat({ min: 100, max: 200 }),
    body('settings.shippingMethod').optional().isIn(['ems', 'sal', 'dhl']),
    body('settings.insuranceEnabled').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    const startTime = Date.now();
    
    try {
      const { productId, supplierId, settings = {} } = req.body;
      const userId = req.user.id;
      
      logger.info('Profit calculation started', {
        requestId,
        userId,
        productId,
        supplierId
      });
      
      // 商品確認
      const product = await Product.findById(productId, userId);
      if (!product) {
        return res.status(404).json(
          Helpers.createResponse(false, null, 'Product not found')
        );
      }
      
      // 仕入先確認
      const supplier = await DomesticSupplier.findById(supplierId);
      if (!supplier || supplier.productId !== parseInt(productId)) {
        return res.status(404).json(
          Helpers.createResponse(false, null, 'Supplier not found or not associated with product')
        );
      }
      
      // API クォータ消費
      await req.user.consumeQuota(3);
      
      // 既存計算確認
      const existingCalculation = await ProfitCalculation.findByProductAndSupplier(productId, supplierId);
      
      // 1時間以内の計算があれば返す
      if (existingCalculation && !settings.forceRecalculate) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const calculationTime = new Date(existingCalculation.createdAt);
        
        if (calculationTime > oneHourAgo) {
          return res.json(
            Helpers.createResponse(
              true,
              {
                calculation: existingCalculation.toJSON(),
                cached: true,
                calculationAge: Math.round((Date.now() - calculationTime.getTime()) / (1000 * 60))
              },
              '利益計算結果（キャッシュ）'
            )
          );
        }
      }
      
      // 新しい計算実行
      const calculation = await profitCalculationService.calculateProfit(
        product,
        supplier,
        { settings }
      );
      
      // ビジネスメトリクス記録
      logger.logBusinessMetric('profit_calculation_completed', 1, {
        userId,
        productId,
        supplierId,
        netProfit: calculation.netProfit,
        roiPercentage: calculation.roiPercentage
      });
      
      const responseData = {
        calculation: calculation.toJSON(),
        cached: false,
        summary: {
          profitable: calculation.netProfit > 0,
          profitabilityRating: this.getProfitabilityRating(calculation),
          recommendation: this.getRecommendation(calculation)
        },
        metadata: {
          requestId,
          processingTime: Date.now() - startTime
        }
      };
      
      res.json(
        Helpers.createResponse(
          true,
          responseData,
          calculation.netProfit > 0 ? 
            `利益予想: ¥${calculation.netProfit.toLocaleString()}` :
            '利益が見込めません'
        )
      );
      
    } catch (error) {
      logger.error('Profit calculation failed', {
        requestId,
        userId: req.user?.id,
        productId: req.body?.productId,
        supplierId: req.body?.supplierId,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, '利益計算に失敗しました')
      );
    }
  }
);

// バッチ利益計算
router.post('/calculate-batch',
  [
    body('calculations').isArray({ min: 1, max: 20 }).withMessage('Calculations array required (max 20)'),
    body('calculations.*.productId').isInt(),
    body('calculations.*.supplierId').isInt(),
    body('settings').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    const startTime = Date.now();
    
    try {
      const { calculations: calculationRequests, settings = {} } = req.body;
      const userId = req.user.id;
      
      logger.info('Batch profit calculation started', {
        requestId,
        userId,
        calculationCount: calculationRequests.length
      });
      
      // API クォータ消費（バッチ処理は件数x2）
      await req.user.consumeQuota(calculationRequests.length * 2);
      
      // 商品・仕入先ペア作成
      const productSupplierPairs = [];
      
      for (const calcRequest of calculationRequests) {
        const product = await Product.findById(calcRequest.productId, userId);
        const supplier = await DomesticSupplier.findById(calcRequest.supplierId);
        
        if (product && supplier && supplier.productId === calcRequest.productId) {
          productSupplierPairs.push({ product, supplier });
        }
      }
      
      // バッチ計算実行
      const batchResult = await profitCalculationService.calculateBatchProfits(
        productSupplierPairs,
        { settings }
      );
      
      logger.logBusinessMetric('batch_profit_calculation_completed', 1, {
        userId,
        requestedCalculations: calculationRequests.length,
        successfulCalculations: batchResult.calculations.length,
        profitableOpportunities: batchResult.summary.profitableOpportunities
      });
      
      const responseData = {
        ...batchResult,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          requestedCalculations: calculationRequests.length
        }
      };
      
      res.json(
        Helpers.createResponse(
          true,
          responseData,
          `${batchResult.calculations.length}件の利益計算が完了しました`
        )
      );
      
    } catch (error) {
      logger.error('Batch profit calculation failed', {
        requestId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'バッチ利益計算に失敗しました')
      );
    }
  }
);

// 利益計算履歴取得
router.get('/history',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['created_at', 'net_profit', 'roi_percentage']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('profitableOnly').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
        profitableOnly = false
      } = req.query;
      
      const userId = req.user.id;
      
      // ユーザーの商品IDリスト取得
      const userProducts = await Product.search({ userId }, { limit: 1000 });
      const productIds = userProducts.data.map(p => p.id);
      
      if (productIds.length === 0) {
        return res.json(
          Helpers.createResponse(
            true,
            { calculations: [], pagination: null },
            '計算履歴がありません'
          )
        );
      }
      
      // 利益計算履歴クエリ構築
      let whereConditions = [`product_id IN (${productIds.map((_, i) => `${i + 1}`).join(', ')})`];
      let values = [...productIds];
      let paramCount = productIds.length + 1;
      
      if (profitableOnly) {
        whereConditions.push(`net_profit > 0`);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      const orderBy = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      
      const baseQuery = `
        SELECT pc.*, p.ebay_title, ds.supplier_name, ds.supplier_type
        FROM profit_calculations pc
        JOIN products p ON pc.product_id = p.id
        JOIN domestic_suppliers ds ON pc.supplier_id = ds.id
        ${whereClause}
        ${orderBy}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as count
        FROM profit_calculations pc
        JOIN products p ON pc.product_id = p.id
        ${whereClause}
      `;
      
      const result = await DatabaseHelper.paginate(
        baseQuery, values, page, limit, countQuery
      );
      
      const calculations = result.data.map(row => ({
        ...new ProfitCalculation(row).toJSON(),
        productTitle: row.ebay_title,
        supplierName: row.supplier_name,
        supplierType: row.supplier_type
      }));
      
      res.json(
        Helpers.createResponse(
          true,
          {
            calculations,
            pagination: result.pagination
          },
          `${calculations.length}件の計算履歴を取得しました`
        )
      );
      
    } catch (error) {
      logger.error('Get profit calculation history failed', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, '計算履歴取得に失敗しました')
      );
    }
  }
);

// 利益ランキング取得
router.get('/ranking',
  [
    query('period').optional().isIn(['7d', '30d', '90d']),
    query('metric').optional().isIn(['net_profit', 'roi_percentage', 'profit_margin']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        period = '30d',
        metric = 'net_profit',
        limit = 20
      } = req.query;
      
      const userId = req.user.id;
      
      // 期間設定
      const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90
      };
      
      const daysAgo = periodDays[period] || 30;
      const dateFrom = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      // ユーザーの商品IDリスト取得
      const userProducts = await Product.search({ userId }, { limit: 1000 });
      const productIds = userProducts.data.map(p => p.id);
      
      if (productIds.length === 0) {
        return res.json(
          Helpers.createResponse(
            true,
            { ranking: [] },
            'データがありません'
          )
        );
      }
      
      const query = `
        SELECT 
          pc.*,
          p.ebay_title,
          ds.supplier_name,
          ds.supplier_type,
          RANK() OVER (ORDER BY pc.${metric} DESC) as rank
        FROM profit_calculations pc
        JOIN products p ON pc.product_id = p.id
        JOIN domestic_suppliers ds ON pc.supplier_id = ds.id
        WHERE pc.product_id IN (${productIds.map((_, i) => `${i + 2}`).join(', ')})
          AND pc.created_at >= $1
          AND pc.${metric} > 0
        ORDER BY pc.${metric} DESC
        LIMIT ${productIds.length + 2}
      `;
      
      const values = [dateFrom, ...productIds, parseInt(limit)];
      const result = await pool.query(query, values);
      
      const ranking = result.rows.map(row => ({
        rank: row.rank,
        calculation: new ProfitCalculation(row).toJSON(),
        productTitle: row.ebay_title,
        supplierName: row.supplier_name,
        supplierType: row.supplier_type
      }));
      
      res.json(
        Helpers.createResponse(
          true,
          {
            ranking,
            period,
            metric,
            totalEntries: ranking.length
          },
          `${metric}ランキング上位${ranking.length}件`
        )
      );
      
    } catch (error) {
      logger.error('Get profit ranking failed', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'ランキング取得に失敗しました')
      );
    }
  }
);

// 利益計算設定更新
router.put('/settings',
  [
    body('exchangeRateUsdJpy').optional().isFloat({ min: 100, max: 200 }),
    body('ebayFinalValueFeeRate').optional().isFloat({ min: 0, max: 0.2 }),
    body('paypalFeeRate').optional().isFloat({ min: 0, max: 0.1 }),
    body('currencyConversionFeeRate').optional().isFloat({ min: 0, max: 0.1 }),
    body('japanConsumptionTaxRate').optional().isFloat({ min: 0, max: 0.2 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const newSettings = req.body;
      const userId = req.user.id;
      
      // 設定更新
      profitCalculationService.updateSettings(newSettings);
      
      logger.info('Profit calculation settings updated', {
        userId,
        newSettings
      });
      
      res.json(
        Helpers.createResponse(
          true,
          { settings: newSettings },
          '利益計算設定を更新しました'
        )
      );
      
    } catch (error) {
      logger.error('Update profit calculation settings failed', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, '設定更新に失敗しました')
      );
    }
  }
);

// ヘルパー関数
router.getProfitabilityRating = function(calculation) {
  const roi = calculation.roiPercentage || 0;
  const profitMargin = calculation.profitMargin || 0;
  
  if (roi >= 50 && profitMargin >= 30) return 'excellent';
  if (roi >= 30 && profitMargin >= 20) return 'good';
  if (roi >= 15 && profitMargin >= 10) return 'fair';
  if (roi > 0 && profitMargin > 0) return 'poor';
  return 'unprofitable';
};

router.getRecommendation = function(calculation) {
  const rating = router.getProfitabilityRating(calculation);
  const riskScore = calculation.riskScore || 0;
  
  if (rating === 'excellent' && riskScore < 0.1) {
    return '強く推奨: 高利益・低リスクの優良案件です';
  } else if (rating === 'good' && riskScore < 0.2) {
    return '推奨: 良好な利益が期待できます';
  } else if (rating === 'fair') {
    return '要検討: 利益は少ないですが案件として成立します';
  } else if (riskScore > 0.3) {
    return '注意: リスクが高いため慎重に検討してください';
  } else {
    return '非推奨: 利益が見込めません';
  }
};

module.exports = router;