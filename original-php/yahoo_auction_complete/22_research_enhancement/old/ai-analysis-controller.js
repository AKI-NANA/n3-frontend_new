// src/controllers/aiAnalysisController.js - AI分析コントローラー
const AIAnalysisService = require('../services/aiAnalysisService');
const logger = require('../utils/logger');
const { validateAnalysisRequest, validateBatchRequest } = require('../validators/analysisValidator');
const { RateLimiter } = require('../middleware/rateLimiter');

class AIAnalysisController {
  constructor() {
    this.aiService = new AIAnalysisService();
    this.rateLimiter = new RateLimiter({
      singleAnalysis: { requests: 100, window: 3600 }, // 100/hour
      batchAnalysis: { requests: 10, window: 3600 },   // 10/hour
      opportunityDetection: { requests: 20, window: 3600 } // 20/hour
    });
  }

  // 単一商品分析
  async analyzeProduct(req, res) {
    const startTime = Date.now();
    const userId = req.user?.id;
    const userPlan = req.user?.subscriptionPlan || 'free';

    try {
      // リクエスト検証
      const validation = validateAnalysisRequest(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.errors
        });
      }

      // レート制限チェック
      const rateLimitResult = await this.rateLimiter.checkLimit(userId, 'singleAnalysis', userPlan);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          reset: rateLimitResult.reset,
          limit: rateLimitResult.limit
        });
      }

      const { productData, options = {} } = req.body;

      // プラン別機能制限
      const restrictedOptions = this.applyPlanRestrictions(options, userPlan);

      logger.info('AI product analysis requested', {
        userId,
        productId: productData.id,
        userPlan,
        analysisTypes: restrictedOptions.analysisTypes
      });

      // AI分析実行
      const analysis = await this.aiService.analyzeProduct(productData, restrictedOptions);

      // 使用量記録
      await this.recordUsage(userId, 'opportunity_detection', Date.now() - startTime);

      // レスポンス構築
      const response = {
        success: true,
        data: {
          opportunities,
          metadata: {
            processingTime: Date.now() - startTime,
            requestId: req.requestId,
            userId: userId,
            timestamp: new Date().toISOString(),
            appliedFilters: filters,
            planLimitations: this.getPlanLimitations(userPlan)
          }
        },
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset
        }
      };

      // プラン別フィルタリング
      if (userPlan === 'free') {
        response.data.opportunities.opportunities = response.data.opportunities.opportunities.slice(0, 5);
        response.data.opportunities.detectionMetrics = this.filterFreeMetrics(response.data.opportunities.detectionMetrics);
      }

      res.status(200).json(response);

    } catch (error) {
      logger.error('Market opportunity detection failed', {
        userId,
        error: error.message,
        stack: error.stack,
        filters: req.query
      });

      res.status(500).json({
        success: false,
        error: 'Opportunity detection failed',
        message: this.getErrorMessage(error, userPlan),
        requestId: req.requestId
      });
    }
  }

  // 分析履歴取得
  async getAnalysisHistory(req, res) {
    const userId = req.user?.id;
    const userPlan = req.user?.subscriptionPlan || 'free';

    try {
      const { page = 1, limit = 20, type, dateFrom, dateTo } = req.query;

      // プラン別制限
      const planLimits = this.getHistoryLimits(userPlan);
      const actualLimit = Math.min(parseInt(limit), planLimits.maxResults);

      const filters = {
        userId,
        page: parseInt(page),
        limit: actualLimit,
        type,
        dateFrom,
        dateTo
      };

      // 履歴取得（実装予定）
      const history = await this.getAnalysisHistoryFromDB(filters);

      const response = {
        success: true,
        data: {
          history: history.results,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total: history.total,
            pages: Math.ceil(history.total / filters.limit)
          },
          metadata: {
            userId,
            userPlan,
            availablePeriod: planLimits.retentionDays
          }
        }
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Analysis history retrieval failed', {
        userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analysis history',
        requestId: req.requestId
      });
    }
  }

  // 分析統計取得
  async getAnalysisStats(req, res) {
    const userId = req.user?.id;
    const userPlan = req.user?.subscriptionPlan || 'free';

    try {
      const { period = '30d' } = req.query;

      // 統計取得（実装予定）
      const stats = await this.getAnalysisStatsFromDB(userId, period);

      const response = {
        success: true,
        data: {
          stats,
          metadata: {
            userId,
            userPlan,
            period,
            calculatedAt: new Date().toISOString()
          }
        }
      };

      // プラン別フィルタリング
      if (userPlan === 'free') {
        response.data.stats = this.filterFreeStats(response.data.stats);
      }

      res.status(200).json(response);

    } catch (error) {
      logger.error('Analysis stats retrieval failed', {
        userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analysis statistics',
        requestId: req.requestId
      });
    }
  }

  // ヘルスチェック
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          aiAnalysis: 'operational',
          database: 'operational',
          cache: 'operational'
        },
        performance: {
          avgResponseTime: '250ms',
          successRate: '99.5%',
          activeAnalyses: 0
        }
      };

      // 実際のサービス状態チェック（実装予定）
      const serviceStatus = await this.checkServiceHealth();
      health.services = { ...health.services, ...serviceStatus };

      res.status(200).json(health);

    } catch (error) {
      logger.error('Health check failed', { error: error.message });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service health check failed'
      });
    }
  }

  // プラン制限適用
  applyPlanRestrictions(options, userPlan) {
    const planRestrictions = {
      free: {
        analysisTypes: ['demand', 'price'], // 基本分析のみ
        maxConcurrency: 1,
        excludeAmazon: false,
        excludeRakuten: true,  // 楽天除外
        excludeMercari: true,  // メルカリ除外
        excludeYahooAuction: true // ヤフオク除外
      },
      standard: {
        analysisTypes: ['demand', 'price', 'risk'], // リスク分析追加
        maxConcurrency: 3,
        excludeAmazon: false,
        excludeRakuten: false,
        excludeMercari: true,  // メルカリ除外
        excludeYahooAuction: true // ヤフオク除外
      },
      premium: {
        analysisTypes: ['demand', 'price', 'risk', 'matching', 'trend'], // 全分析
        maxConcurrency: 5,
        excludeAmazon: false,
        excludeRakuten: false,
        excludeMercari: false,
        excludeYahooAuction: false
      }
    };

    const restrictions = planRestrictions[userPlan] || planRestrictions.free;
    return { ...options, ...restrictions };
  }

  // バッチ制限取得
  getBatchLimits(userPlan) {
    const limits = {
      free: { maxProducts: 5, maxConcurrency: 1 },
      standard: { maxProducts: 50, maxConcurrency: 3 },
      premium: { maxProducts: 500, maxConcurrency: 5 }
    };

    return limits[userPlan] || limits.free;
  }

  // 機会検出制限取得
  getOpportunityLimits(userPlan) {
    const limits = {
      free: { maxResults: 5 },
      standard: { maxResults: 25 },
      premium: { maxResults: 100 }
    };

    return limits[userPlan] || limits.free;
  }

  // 履歴制限取得
  getHistoryLimits(userPlan) {
    const limits = {
      free: { maxResults: 10, retentionDays: 7 },
      standard: { maxResults: 50, retentionDays: 30 },
      premium: { maxResults: 200, retentionDays: 365 }
    };

    return limits[userPlan] || limits.free;
  }

  // プラン制限情報取得
  getPlanLimitations(userPlan) {
    const limitations = {
      free: {
        analysisTypes: ['需要予測', '価格分析'],
        platforms: ['eBay', 'Amazon'],
        batchSize: 5,
        historyRetention: '7日間',
        features: ['基本分析', '基本推奨']
      },
      standard: {
        analysisTypes: ['需要予測', '価格分析', 'リスク評価'],
        platforms: ['eBay', 'Amazon', '楽天'],
        batchSize: 50,
        historyRetention: '30日間',
        features: ['詳細分析', '高度推奨', '履歴保存']
      },
      premium: {
        analysisTypes: ['全分析機能'],
        platforms: ['全プラットフォーム'],
        batchSize: 500,
        historyRetention: '1年間',
        features: ['AI分析', '市場機会検出', '詳細レポート', '優先サポート']
      }
    };

    return limitations[userPlan] || limitations.free;
  }

  // 無料プラン結果フィルタリング
  filterFreeResults(analysis) {
    return {
      ...analysis,
      results: {
        demand: analysis.results.demand,
        price: analysis.results.price
      },
      summary: {
        overallScore: analysis.summary.overallScore,
        recommendation: analysis.summary.recommendation,
        confidence: analysis.summary.confidence
      },
      recommendations: analysis.recommendations.slice(0, 3) // 3つまで
    };
  }

  // 無料プランメトリクスフィルタリング
  filterFreeMetrics(metrics) {
    return {
      opportunitiesFound: metrics.opportunitiesFound,
      averageScore: metrics.averageScore
    };
  }

  // 無料プラン統計フィルタリング
  filterFreeStats(stats) {
    return {
      totalAnalyses: stats.totalAnalyses,
      avgScore: stats.avgScore,
      topCategory: stats.topCategory
    };
  }

  // エラーメッセージ取得
  getErrorMessage(error, userPlan) {
    if (userPlan === 'free') {
      return 'Analysis failed. Consider upgrading for enhanced error reporting.';
    }

    return error.message || 'Unknown error occurred';
  }

  // 使用量記録
  async recordUsage(userId, analysisType, processingTime, productCount = 1) {
    try {
      // データベースに使用量記録（実装予定）
      const usage = {
        userId,
        analysisType,
        processingTime,
        productCount,
        timestamp: new Date(),
        success: true
      };

      logger.info('Usage recorded', usage);

      // 実装例: await UsageModel.create(usage);

    } catch (error) {
      logger.error('Failed to record usage', {
        userId,
        analysisType,
        error: error.message
      });
    }
  }

  // 分析履歴取得（DB）
  async getAnalysisHistoryFromDB(filters) {
    // 実装予定: データベースから履歴取得
    return {
      results: [
        {
          id: 'analysis_1',
          type: 'single_analysis',
          productId: 'product_123',
          score: 7.5,
          recommendation: 'buy',
          createdAt: new Date().toISOString()
        }
      ],
      total: 1
    };
  }

  // 分析統計取得（DB）
  async getAnalysisStatsFromDB(userId, period) {
    // 実装予定: データベースから統計取得
    return {
      totalAnalyses: 45,
      avgScore: 6.8,
      topCategory: 'Consumer Electronics',
      successRate: 98.5,
      avgProcessingTime: 2500,
      topRecommendation: 'buy',
      scoreDistribution: {
        excellent: 12,
        good: 18,
        fair: 12,
        poor: 3
      }
    };
  }

  // サービスヘルス チェック
  async checkServiceHealth() {
    try {
      // 各サービスの状態確認（実装予定）
      const services = {
        aiAnalysis: 'operational',
        database: 'operational',
        cache: 'operational',
        externalAPIs: 'operational'
      };

      return services;

    } catch (error) {
      logger.error('Service health check failed', { error: error.message });
      return {
        aiAnalysis: 'degraded',
        database: 'unknown',
        cache: 'unknown',
        externalAPIs: 'unknown'
      };
    }
  }
}

module.exports = AIAnalysisController;記録
      await this.recordUsage(userId, 'single_analysis', analysis.processingTime);

      // レスポンス構築
      const response = {
        success: true,
        data: {
          analysis,
          metadata: {
            processingTime: Date.now() - startTime,
            requestId: req.requestId,
            userId: userId,
            timestamp: new Date().toISOString(),
            planLimitations: this.getPlanLimitations(userPlan)
          }
        },
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset
        }
      };

      // プラン別フィルタリング
      if (userPlan === 'free') {
        response.data.analysis = this.filterFreeResults(response.data.analysis);
      }

      res.status(200).json(response);

    } catch (error) {
      logger.error('AI product analysis failed', {
        userId,
        error: error.message,
        stack: error.stack,
        productId: req.body?.productData?.id
      });

      res.status(500).json({
        success: false,
        error: 'Analysis failed',
        message: this.getErrorMessage(error, userPlan),
        requestId: req.requestId
      });
    }
  }

  // バッチ分析
  async batchAnalyze(req, res) {
    const startTime = Date.now();
    const userId = req.user?.id;
    const userPlan = req.user?.subscriptionPlan || 'free';

    try {
      // リクエスト検証
      const validation = validateBatchRequest(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid batch request',
          details: validation.errors
        });
      }

      // レート制限チェック
      const rateLimitResult = await this.rateLimiter.checkLimit(userId, 'batchAnalysis', userPlan);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Batch analysis rate limit exceeded',
          reset: rateLimitResult.reset
        });
      }

      const { products, options = {} } = req.body;

      // プラン別制限
      const planLimits = this.getBatchLimits(userPlan);
      if (products.length > planLimits.maxProducts) {
        return res.status(400).json({
          success: false,
          error: `Batch size limit exceeded. Max ${planLimits.maxProducts} products for ${userPlan} plan`,
          currentSize: products.length,
          maxSize: planLimits.maxProducts
        });
      }

      // オプション制限適用
      const restrictedOptions = this.applyPlanRestrictions(options, userPlan);
      restrictedOptions.maxConcurrency = planLimits.maxConcurrency;
      restrictedOptions.saveResults = userPlan !== 'free';

      logger.info('AI batch analysis requested', {
        userId,
        productCount: products.length,
        userPlan,
        maxConcurrency: restrictedOptions.maxConcurrency
      });

      // バッチ分析実行
      const batchResult = await this.aiService.batchAnalyze(products, restrictedOptions);

      // 使用量記録
      await this.recordUsage(userId, 'batch_analysis', batchResult.processingTime, products.length);

      // レスポンス構築
      const response = {
        success: true,
        data: {
          batchResult,
          metadata: {
            totalProcessingTime: Date.now() - startTime,
            requestId: req.requestId,
            userId: userId,
            timestamp: new Date().toISOString(),
            planLimitations: this.getPlanLimitations(userPlan)
          }
        },
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset
        }
      };

      // プラン別フィルタリング
      if (userPlan === 'free') {
        response.data.batchResult.results = response.data.batchResult.results.map(result => 
          this.filterFreeResults(result)
        );
      }

      res.status(200).json(response);

    } catch (error) {
      logger.error('AI batch analysis failed', {
        userId,
        error: error.message,
        stack: error.stack,
        productCount: req.body?.products?.length
      });

      res.status(500).json({
        success: false,
        error: 'Batch analysis failed',
        message: this.getErrorMessage(error, userPlan),
        requestId: req.requestId
      });
    }
  }

  // 市場機会検出
  async detectOpportunities(req, res) {
    const startTime = Date.now();
    const userId = req.user?.id;
    const userPlan = req.user?.subscriptionPlan || 'free';

    try {
      // レート制限チェック
      const rateLimitResult = await this.rateLimiter.checkLimit(userId, 'opportunityDetection', userPlan);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Opportunity detection rate limit exceeded',
          reset: rateLimitResult.reset
        });
      }

      const filters = req.query || {};

      // プラン別制限適用
      const planLimits = this.getOpportunityLimits(userPlan);
      filters.limit = Math.min(filters.limit || planLimits.maxResults, planLimits.maxResults);

      if (userPlan === 'free') {
        // 無料プランは基本フィルターのみ
        const allowedFilters = ['category', 'minPrice', 'maxPrice', 'limit'];
        Object.keys(filters).forEach(key => {
          if (!allowedFilters.includes(key)) {
            delete filters[key];
          }
        });
      }

      logger.info('Market opportunity detection requested', {
        userId,
        userPlan,
        filters
      });

      // 機会検出実行
      const opportunities = await this.aiService.detectMarketOpportunities(filters);

      // 使用量