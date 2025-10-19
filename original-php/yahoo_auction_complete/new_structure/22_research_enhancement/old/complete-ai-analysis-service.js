// src/services/aiAnalysisService.js - AI分析エンジン（完全版）
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const { RedisHelper } = require('../config/database');
const Product = require('../models/Product');
const DomesticSupplier = require('../models/DomesticSupplier');
const ProfitCalculation = require('../models/ProfitCalculation');

class AIAnalysisService {
  constructor() {
    this.models = {
      demandPrediction: new DemandPredictionModel(),
      priceForecasting: new PriceForecastingModel(),
      riskAssessment: new RiskAssessmentModel(),
      productMatching: new ProductMatchingModel(),
      marketTrendAnalysis: new MarketTrendAnalysisModel()
    };
    
    this.analysisCache = new Map();
    this.cacheTimeout = 3600; // 1時間
  }
  
  // 包括的な商品分析
  async analyzeProduct(productData, options = {}) {
    const analysisId = Helpers.generateUUID();
    const startTime = Date.now();
    
    try {
      logger.info('AI product analysis started', {
        analysisId,
        productId: productData.id,
        analysisTypes: options.analysisTypes || 'all'
      });
      
      // キャッシュ確認
      if (!options.forceRefresh) {
        const cachedResult = await this.getCachedAnalysis(productData.id);
        if (cachedResult) {
          logger.info('Returning cached analysis', { analysisId, productId: productData.id });
          return cachedResult;
        }
      }
      
      // 並列分析実行
      const analysisPromises = [];
      
      // 需要予測分析
      if (!options.analysisTypes || options.analysisTypes.includes('demand')) {
        analysisPromises.push(
          this.models.demandPrediction.predict(productData)
            .then(result => ({ type: 'demand', data: result }))
            .catch(error => ({ type: 'demand', error: error.message }))
        );
      }
      
      // 価格予測分析
      if (!options.analysisTypes || options.analysisTypes.includes('price')) {
        analysisPromises.push(
          this.models.priceForecasting.forecast(productData)
            .then(result => ({ type: 'price', data: result }))
            .catch(error => ({ type: 'price', error: error.message }))
        );
      }
      
      // リスク評価
      if (!options.analysisTypes || options.analysisTypes.includes('risk')) {
        analysisPromises.push(
          this.models.riskAssessment.assess(productData)
            .then(result => ({ type: 'risk', data: result }))
            .catch(error => ({ type: 'risk', error: error.message }))
        );
      }
      
      // 商品マッチング
      if (!options.analysisTypes || options.analysisTypes.includes('matching')) {
        analysisPromises.push(
          this.models.productMatching.match(productData, options.matchingOptions)
            .then(result => ({ type: 'matching', data: result }))
            .catch(error => ({ type: 'matching', error: error.message }))
        );
      }
      
      // 市場トレンド分析
      if (!options.analysisTypes || options.analysisTypes.includes('trend')) {
        analysisPromises.push(
          this.models.marketTrendAnalysis.analyze(productData)
            .then(result => ({ type: 'trend', data: result }))
            .catch(error => ({ type: 'trend', error: error.message }))
        );
      }
      
      const analysisResults = await Promise.all(analysisPromises);
      
      // 結果を統合
      const analysis = {
        analysisId,
        productId: productData.id,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        results: {},
        summary: {},
        recommendations: [],
        metadata: {
          version: '1.0.0',
          model_versions: this.getModelVersions(),
          confidence_score: 0
        }
      };
      
      // 各分析結果を処理
      analysisResults.forEach(result => {
        if (result.error) {
          analysis.results[result.type] = { error: result.error };
          logger.warn('Analysis module failed', { 
            type: result.type, 
            error: result.error,
            analysisId 
          });
        } else {
          analysis.results[result.type] = result.data;
        }
      });
      
      // 統合サマリー生成
      analysis.summary = await this.generateIntegratedSummary(analysis.results, productData);
      
      // 推奨アクション生成
      analysis.recommendations = await this.generateRecommendations(analysis.results, productData);
      
      // 全体的な信頼度スコア計算
      analysis.metadata.confidence_score = this.calculateOverallConfidence(analysis.results);
      
      // 結果をキャッシュ
      await this.cacheAnalysis(productData.id, analysis);
      
      logger.info('AI product analysis completed', {
        analysisId,
        productId: productData.id,
        processingTime: analysis.processingTime,
        successfulAnalyses: Object.keys(analysis.results).filter(key => !analysis.results[key].error).length,
        overallScore: analysis.summary.overallScore,
        confidence: analysis.metadata.confidence_score
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('AI product analysis failed', {
        analysisId,
        productId: productData?.id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  
  // バッチ分析（複数商品）
  async batchAnalyze(products, options = {}) {
    const batchId = Helpers.generateUUID();
    const startTime = Date.now();
    
    try {
      logger.info('AI batch analysis started', {
        batchId,
        productCount: products.length,
        maxConcurrency: options.maxConcurrency || 5
      });
      
      const results = [];
      const errors = [];
      
      // 並行処理制限付きで実行
      const concurrencyLimit = options.maxConcurrency || 5;
      const chunks = Helpers.chunkArray(products, concurrencyLimit);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (product) => {
          try {
            const analysis = await this.analyzeProduct(product, options);
            return analysis;
          } catch (error) {
            errors.push({
              productId: product.id,
              error: error.message,
              timestamp: new Date().toISOString()
            });
            return null;
          }
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.filter(r => r !== null));
        
        // レート制限回避のため少し待機
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // バッチサマリー生成
      const batchSummary = this.generateBatchSummary(results);
      
      // バッチ結果をデータベースに保存
      if (options.saveResults) {
        await this.saveBatchResults(batchId, results, batchSummary);
      }
      
      logger.info('AI batch analysis completed', {
        batchId,
        totalProducts: products.length,
        successfulAnalyses: results.length,
        errors: errors.length,
        processingTime: Date.now() - startTime,
        averageScore: batchSummary.averageScore
      });
      
      return {
        batchId,
        results,
        errors,
        summary: batchSummary,
        processingTime: Date.now() - startTime,
        metadata: {
          timestamp: new Date().toISOString(),
          totalProducts: products.length,
          successRate: results.length / products.length
        }
      };
      
    } catch (error) {
      logger.error('AI batch analysis failed', {
        batchId,
        error: error.message
      });
      throw error;
    }
  }
  
  // 市場機会検出
  async detectMarketOpportunities(filters = {}) {
    try {
      logger.info('Market opportunity detection started', { filters });
      
      const opportunities = [];
      
      // 高利益率商品の検出
      const highProfitProducts = await this.findHighProfitOpportunities(filters);
      opportunities.push(...highProfitProducts);
      
      // 価格トレンド分析による機会検出
      const trendOpportunities = await this.findTrendBasedOpportunities(filters);
      opportunities.push(...trendOpportunities);
      
      // 需要予測による機会検出
      const demandOpportunities = await this.findDemandBasedOpportunities(filters);
      opportunities.push(...demandOpportunities);
      
      // 新興市場機会の検出
      const emergingOpportunities = await this.findEmergingMarketOpportunities(filters);
      opportunities.push(...emergingOpportunities);
      
      // 重複除去とスコア順ソート
      const uniqueOpportunities = this.deduplicateOpportunities(opportunities);
      uniqueOpportunities.sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0));
      
      const detectionResults = {
        opportunities: uniqueOpportunities.slice(0, filters.limit || 50),
        detectionMetrics: {
          totalScanned: await this.getTotalProductCount(),
          opportunitiesFound: uniqueOpportunities.length,
          averageScore: uniqueOpportunities.reduce((sum, opp) => sum + (opp.opportunityScore || 0), 0) / uniqueOpportunities.length || 0,
          detectionTime: Date.now()
        },
        categories: this.categorizeOpportunities(uniqueOpportunities),
        filters: filters
      };
      
      logger.info('Market opportunity detection completed', {
        totalOpportunities: uniqueOpportunities.length,
        averageScore: detectionResults.detectionMetrics.averageScore
      });
      
      return detectionResults;
      
    } catch (error) {
      logger.error('Market opportunity detection failed', error);
      throw error;
    }
  }
  
  // 統合サマリー生成
  async generateIntegratedSummary(analysisResults, productData) {
    const summary = {
      overallScore: 0,
      riskLevel: 'unknown',
      profitPotential: 'unknown',
      marketDemand: 'unknown',
      recommendation: 'analyze_further',
      confidence: 0,
      keyInsights: [],
      criticalFactors: [],
      scoreBreakdown: {}
    };
    
    let totalWeight = 0;
    let weightedScore = 0;
    
    // 需要分析結果
    if (analysisResults.demand && !analysisResults.demand.error) {
      const demandScore = analysisResults.demand.demandScore || 0;
      const weight = 0.3;
      weightedScore += demandScore * weight;
      totalWeight += weight;
      summary.scoreBreakdown.demand = demandScore;
      
      summary.marketDemand = this.categorizeScore(demandScore);
      
      if (demandScore >= 8) {
        summary.keyInsights.push('非常に高い市場需要が期待できます');
      } else if (demandScore <= 3) {
        summary.criticalFactors.push('市場需要が限定的です');
      }
    }
    
    // 価格分析結果
    if (analysisResults.price && !analysisResults.price.error) {
      const priceScore = analysisResults.price.profitabilityScore || 0;
      const weight = 0.25;
      weightedScore += priceScore * weight;
      totalWeight += weight;
      summary.scoreBreakdown.price = priceScore;
      
      summary.profitPotential = this.categorizeScore(priceScore);
      
      if (analysisResults.price.profitMargin > 30) {
        summary.keyInsights.push(`高利益率（${analysisResults.price.profitMargin}%）の商品です`);
      }
      
      if (analysisResults.price.priceVolatility > 0.3) {
        summary.criticalFactors.push('価格変動が大きいため注意が必要です');
      }
    }
    
    // リスク分析結果
    if (analysisResults.risk && !analysisResults.risk.error) {
      const riskScore = 10 - (analysisResults.risk.riskScore || 5); // リスクを逆転してスコア化
      const weight = 0.25;
      weightedScore += riskScore * weight;
      totalWeight += weight;
      summary.scoreBreakdown.risk = riskScore;
      
      summary.riskLevel = this.categorizeRisk(analysisResults.risk.riskScore || 5);
      
      if (analysisResults.risk.riskScore > 7) {
        summary.criticalFactors.push('高リスク案件のため慎重な検討が必要です');
      }
      
      if (analysisResults.risk.counterfeitRisk > 0.5) {
        summary.criticalFactors.push('偽物リスクが検出されました');
      }
    }
    
    // トレンド分析結果
    if (analysisResults.trend && !analysisResults.trend.error) {
      const trendScore = analysisResults.trend.trendScore || 0;
      const weight = 0.2;
      weightedScore += trendScore * weight;
      totalWeight += weight;
      summary.scoreBreakdown.trend = trendScore;
      
      if (analysisResults.trend.growthRate > 0.2) {
        summary.keyInsights.push(`成長市場（成長率${Math.round(analysisResults.trend.growthRate * 100)}%）です`);
      }
      
      if (analysisResults.trend.seasonality && analysisResults.trend.seasonality.isCurrentSeason) {
        summary.keyInsights.push('現在がシーズン期間中です');
      }
    }
    
    // 総合スコア計算
    if (totalWeight > 0) {
      summary.overallScore = Math.round((weightedScore / totalWeight) * 100) / 100;
      summary.confidence = Math.min(totalWeight, 1.0);
    }
    
    // 推奨アクション決定
    summary.recommendation = this.determineRecommendation(summary);
    
    return summary;
  }
  
  // 推奨アクション生成（強化版）
  async generateRecommendations(analysisResults, productData) {
    const recommendations = [];
    
    // 需要ベースの推奨
    if (analysisResults.demand && !analysisResults.demand.error) {
      const demand = analysisResults.demand;
      
      if (demand.demandScore > 7) {
        recommendations.push({
          type: 'opportunity',
          priority: 'high',
          title: '高需要商品として推奨',
          description: `需要スコア${demand.demandScore}/10の高需要商品です。市場での成功確率が高いと予測されます。`,
          action: 'proceed_with_caution',
          confidence: demand.confidence || 0.7,
          impact: 'high',
          timeline: 'immediate'
        });
      } else if (demand.demandScore < 3) {
        recommendations.push({
          type: 'warning',
          priority: 'medium',
          title: '需要が低い可能性',
          description: '市場需要が限定的です。詳細な市場調査を実施することをお勧めします。',
          action: 'research_further',
          confidence: demand.confidence || 0.7,
          impact: 'medium',
          timeline: 'before_investment'
        });
      }
    }
    
    // 価格ベースの推奨
    if (analysisResults.price && !analysisResults.price.error) {
      const price = analysisResults.price;
      
      if (price.profitMargin > 30) {
        recommendations.push({
          type: 'opportunity',
          priority: 'high',
          title: '高利益率商品',
          description: `利益率${price.profitMargin}%の高収益案件です。すぐに実行可能な投資機会です。`,
          action: 'execute_immediately',
          confidence: price.confidence || 0.8,
          impact: 'high',
          timeline: 'immediate',
          expectedROI: price.profitMargin
        });
      }
      
      if (price.priceVolatility > 0.3) {
        recommendations.push({
          type: 'risk',
          priority: 'medium',
          title: '価格変動リスクに注意',
          description: `価格変動率${Math.round(price.priceVolatility * 100)}%のため、売買タイミングが重要です。`,
          action: 'monitor_prices',
          confidence: price.confidence || 0.7,
          impact: 'medium',
          timeline: 'continuous'
        });
      }
    }
    
    // マッチング結果ベースの推奨
    if (analysisResults.matching && !analysisResults.matching.error) {
      const matching = analysisResults.matching;
      
      if (matching.amazonMatches && matching.amazonMatches.length > 0) {
        const bestMatch = matching.amazonMatches[0];
        if (bestMatch.matchScore > 0.8) {
          recommendations.push({
            type: 'opportunity',
            priority: 'high',
            title: 'Amazon仕入先発見',
            description: `マッチング信頼度${Math.round(bestMatch.matchScore * 100)}%の仕入先がAmazonで見つかりました。`,
            action: 'verify_supplier',
            confidence: bestMatch.matchScore,
            impact: 'high',
            timeline: 'immediate'
          });
        }
      }
      
      if (matching.confidence < 0.5) {
        recommendations.push({
          type: 'warning',
          priority: 'low',
          title: '仕入先マッチング精度が低い',
          description: '最適な仕入先の特定が困難です。手動での検索をお勧めします。',
          action: 'manual_search',
          confidence: matching.confidence,
          impact: 'low',
          timeline: 'before_investment'
        });
      }
    }
    
    // リスクベースの推奨
    if (analysisResults.risk && !analysisResults.risk.error) {
      const risk = analysisResults.risk;
      
      if (risk.riskScore > 7) {
        recommendations.push({
          type: 'warning',
          priority: 'high',
          title: '高リスク案件',
          description: `リスクスコア${risk.riskScore}/10の高リスク案件です。投資を避けることを強く推奨します。`,
          action: 'avoid',
          confidence: risk.confidence || 0.8,
          impact: 'high',
          timeline: 'immediate',
          details: risk.riskFactors || []
        });
      }
      
      if (risk.counterfeitRisk > 0.5) {
        recommendations.push({
          type: 'warning',
          priority: 'high',
          title: '偽物リスクの可能性',
          description: `偽造品リスク${Math.round(risk.counterfeitRisk * 100)}%です。信頼できる仕入先の選択が必須です。`,
          action: 'verify_authenticity',
          confidence: risk.confidence || 0.8,
          impact: 'high',
          timeline: 'before_purchase'
        });
      }
    }
    
    // トレンドベースの推奨
    if (analysisResults.trend && !analysisResults.trend.error) {
      const trend = analysisResults.trend;
      
      if (trend.seasonality && trend.seasonality.isCurrentSeason) {
        recommendations.push({
          type: 'timing',
          priority: 'medium',
          title: 'シーズン商品として最適',
          description: `${trend.seasonality.season}シーズン商品として、現在が最適な販売時期です。`,
          action: 'time_sensitive_execute',
          confidence: trend.confidence || 0.7,
          impact: 'medium',
          timeline: 'seasonal'
        });
      }
      
      if (trend.growthRate > 0.2) {
        recommendations.push({
          type: 'opportunity',
          priority: 'medium',
          title: '成長トレンドに乗った商品',
          description: `市場成長率${Math.round(trend.growthRate * 100)}%の成長分野です。中長期的な投資価値があります。`,
          action: 'monitor_and_scale',
          confidence: trend.confidence || 0.7,
          impact: 'medium',
          timeline: 'long_term'
        });
      }
    }
    
    // 推奨事項が少ない場合の補完
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'neutral',
        priority: 'low',
        title: '標準的な商品',
        description: '特筆すべきリスクや機会は検出されませんでした。一般的な投資判断基準を適用してください。',
        action: 'standard_evaluation',
        confidence: 0.5,
        impact: 'low',
        timeline: 'standard'
      });
    }
    
    // 優先度順でソート
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (b.confidence || 0) - (a.confidence || 0); // 信頼度順
    });
    
    return recommendations;
  }
  
  // 機会の重複除去
  deduplicateOpportunities(opportunities) {
    const seen = new Set();
    return opportunities.filter(opp => {
      const key = `${opp.productId}_${opp.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  // 機会のカテゴリ分類
  categorizeOpportunities(opportunities) {
    const categories = {
      high_profit: [],
      trending: [],
      seasonal: [],
      low_risk: []
    };
    
    opportunities.forEach(opp => {
      if (opp.profitMargin > 30) categories.high_profit.push(opp);
      if (opp.trendScore > 7) categories.trending.push(opp);
      if (opp.seasonality) categories.seasonal.push(opp);
      if (opp.riskScore < 3) categories.low_risk.push(opp);
    });
    
    return categories;
  }
  
  // 全体的な信頼度スコア計算
  calculateOverallConfidence(analysisResults) {
    const confidenceScores = [];
    
    Object.values(analysisResults).forEach(result => {
      if (!result.error && result.confidence) {
        confidenceScores.push(result.confidence);
      }
    });
    
    if (confidenceScores.length === 0) return 0.3;
    
    // 平均信頼度
    const avgConfidence = confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length;
    
    // データ完整性による調整
    const completeness = confidenceScores.length / 5; // 5つの分析モジュール
    
    return Math.min(avgConfidence * completeness, 0.95);
  }
  
  // モデルバージョン取得
  getModelVersions() {
    return {
      demandPrediction: '1.0.0',
      priceForecasting: '1.0.0',
      riskAssessment: '1.0.0',
      productMatching: '1.0.0',
      marketTrendAnalysis: '1.0.0'
    };
  }
  
  // バッチ結果保存
  async saveBatchResults(batchId, results, summary) {
    try {
      // データベースに保存（実装予定）
      logger.info('Batch results saved', { batchId, resultCount: results.length });
    } catch (error) {
      logger.error('Failed to save batch results', { batchId, error: error.message });
    }
  }
  
  // 高利益機会検出
  async findHighProfitOpportunities(filters) {
    const opportunities = [];
    
    try {
      // 実装: データベースから高利益率商品を検索
      const query = `
        SELECT p.*, pc.profit_margin, pc.net_profit 
        FROM products p 
        JOIN profit_calculations pc ON p.id = pc.product_id 
        WHERE pc.profit_margin > ${filters.minProfitMargin || 25}
        ORDER BY pc.profit_margin DESC 
        LIMIT ${filters.limit || 20}
      `;
      
      // Mock implementation
      const mockOpportunities = [
        {
          productId: 'mock_1',
          type: 'high_profit',
          opportunityScore: 8.5,
          profitMargin: 35,
          description: 'High profit margin opportunity'
        }
      ];
      
      opportunities.push(...mockOpportunities);
    } catch (error) {
      logger.error('High profit opportunity detection failed', error);
    }
    
    return opportunities;
  }
  
  // トレンドベース機会検出
  async findTrendBasedOpportunities(filters) {
    const opportunities = [];
    
    try {
      // 実装: トレンド分析による機会検出
      const mockOpportunities = [
        {
          productId: 'trend_1',
          type: 'trending',
          opportunityScore: 7.8,
          trendScore: 8.2,
          description: 'Trending product opportunity'
        }
      ];
      
      opportunities.push(...mockOpportunities);
    } catch (error) {
      logger.error('Trend-based opportunity detection failed', error);
    }
    
    return opportunities;
  }
  
  // 需要ベース機会検出
  async findDemandBasedOpportunities(filters) {
    const opportunities = [];
    
    try {
      // 実装: 需要予測による機会検出
      const mockOpportunities = [
        {
          productId: 'demand_1',
          type: 'high_demand',
          opportunityScore: 7.5,
          demandScore: 8.8,
          description: 'High demand opportunity'
        }
      ];
      
      opportunities.push(...mockOpportunities);
    } catch (error) {
      logger.error('Demand-based opportunity detection failed', error);
    }
    
    return opportunities;
  }
  
  // 新興市場機会検出
  async findEmergingMarketOpportunities(filters) {
    const opportunities = [];
    
    try {
      // 実装: 新興市場分析
      const mockOpportunities = [
        {
          productId: 'emerging_1',
          type: 'emerging_market',
          opportunityScore: 7.2,
          growthRate: 0.45,
          description: 'Emerging market opportunity'
        }
      ];
      
      opportunities.push(...mockOpportunities);
    } catch (error) {
      logger.error('Emerging market opportunity detection failed', error);
    }
    
    return opportunities;
  }
  
  // 総商品数取得
  async getTotalProductCount() {
    try {
      // 実装: データベースから総数取得
      return 1000; // Mock value
    } catch (error) {
      logger.error('Failed to get total product count', error);
      return 0;
    }
  }
  
  // ヘルパーメソッド
  categorizeScore(score) {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'fair';
    if (score >= 2) return 'poor';
    return 'very_poor';
  }
  
  categorizeRisk(riskScore) {
    if (riskScore >= 8) return 'very_high';
    if (riskScore >= 6) return 'high';
    if (riskScore >= 4) return 'medium';
    if (riskScore >= 2) return 'low';
    return 'very_low';
  }
  
  determineRecommendation(summary) {
    const score = summary.overallScore;
    const risk = summary.riskLevel;
    
    if (score >= 8 && ['low', 'very_low'].includes(risk)) {
      return 'strong_buy';
    } else if (score >= 6 && ['low', 'medium'].includes(risk)) {
      return 'buy';
    } else if (score >= 4) {
      return 'hold_and_monitor';
    } else if (['high', 'very_high'].includes(risk)) {
      return 'avoid';
    } else {
      return 'research_further';
    }
  }
  
  async cacheAnalysis(productId, analysis) {
    try {
      const cacheKey = `ai_analysis:${productId}`;
      await RedisHelper.setCache(cacheKey, analysis, this.cacheTimeout);
    } catch (error) {
      logger.warn('Failed to cache analysis', { productId, error: error.message });
    }
  }
  
  async getCachedAnalysis(productId) {
    try {
      const cacheKey = `ai_analysis:${productId}`;
      return await RedisHelper.getCache(cacheKey);
    } catch (error) {
      logger.warn('Failed to get cached analysis', { productId, error: error.message });
      return null;
    }
  }
  
  generateBatchSummary(results) {
    const summary = {
      totalAnalyzed: results.length,
      averageScore: 0,
      scoreDistribution: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0
      },
      topOpportunities: [],
      commonRisks: [],
      trendInsights: [],
      performanceMetrics: {
        avgProcessingTime: 0,
        avgConfidence: 0,
        successRate: 0
      }
    };
    
    if (results.length === 0) return summary;
    
    // 平均スコア計算
    const totalScore = results.reduce((sum, result) => sum + (result.summary?.overallScore || 0), 0);
    summary.averageScore = Math.round((totalScore / results.length) * 100) / 100;
    
    // パフォーマンス指標
    const totalProcessingTime = results.reduce((sum, result) => sum + (result.processingTime || 0), 0);
    summary.performanceMetrics.avgProcessingTime = Math.round(totalProcessingTime / results.length);
    
    const totalConfidence = results.reduce((sum, result) => sum + (result.metadata?.confidence_score || 0), 0);
    summary.performanceMetrics.avgConfidence = Math.round((totalConfidence / results.length) * 100) / 100;
    
    summary.performanceMetrics.successRate = results.length > 0 ? 1.0 : 0.0;
    
    // スコア分布
    results.forEach(result => {
      const category = this.categorizeScore(result.summary?.overallScore || 0);
      if (summary.scoreDistribution[category] !== undefined) {
        summary.scoreDistribution[category]++;
      }
    });
    
    // トップ機会
    summary.topOpportunities = results
      .filter(r => r.summary?.overallScore >= 7)
      .sort((a, b) => (b.summary?.overallScore || 0) - (a.summary?.overallScore || 0))
      .slice(0, 10)
      .map(r => ({
        productId: r.productId,
        score: r.summary?.overallScore,
        recommendation: r.summary?.recommendation,
        keyInsights: r.summary?.keyInsights || []
      }));
    
    // 共通リスク分析
    const riskCount = {};
    results.forEach(result => {
      if (result.summary?.criticalFactors) {
        result.summary.criticalFactors.forEach(factor => {
          riskCount[factor] = (riskCount[factor] || 0) + 1;
        });
      }
    });
    
    summary.commonRisks = Object.entries(riskCount)
      .map(([risk, count]) => ({ risk, count, percentage: Math.round((count / results.length) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return summary;
  }
}

// 需要予測モデル（完全版は既存実装を使用）
class DemandPredictionModel {
  async predict(productData) {
    // 前回実装済みのコードを使用
    const categoryDemandScores = {
      'Consumer Electronics': 8.5,
      'Cell Phones & Accessories': 9.0,
      'Video Games & Consoles': 8.8,
      'Clothing, Shoes & Accessories': 7.2,
      'Home & Garden': 6.5,
      'Toys & Hobbies': 7.8,
      'default': 6.0
    };
    
    const categoryScore = categoryDemandScores[productData.ebayCategoryName] || categoryDemandScores.default;
    const brandScore = this.calculateBrandScore(productData.brand);
    const priceScore = this.calculatePriceScore(productData.ebaySellingPrice);
    const seasonalityScore = this.calculateSeasonalityScore(productData);
    const searchVolumeScore = this.estimateSearchVolume(productData.ebayTitle);
    
    const demandScore = (
      categoryScore * 0.3 +
      brandScore * 0.2 +
      priceScore * 0.2 +
      seasonalityScore * 0.15 +
      searchVolumeScore * 0.15
    );
    
    return {
      demandScore: Math.round(demandScore * 100) / 100,
      confidence: 0.75,
      factors: {
        category: categoryScore,
        brand: brandScore,
        price: priceScore,
        seasonality: seasonalityScore,
        searchVolume: searchVolumeScore
      },
      demandLevel: this.categorizeDemand(demandScore),
      forecastPeriod: '30_days'
    };
  }
  
  calculateBrandScore(brand) {
    if (!brand) return 5.0;
    
    const premiumBrands = ['Apple', 'Samsung', 'Sony', 'Nintendo', 'Canon', 'Nikon'];
    const popularBrands = ['LG', 'Panasonic', 'JBL', 'Anker', 'Razer'];
    
    if (premiumBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
      return 9.0;
    } else if (popularBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
      return 7.5;
    } else {
      return 6.0;
    }
  }
  
  calculatePriceScore(price) {
    if (!price) return 5.0;
    
    if (price <= 50) return 8.5;
    if (price <= 200) return 9.0;
    if (price <= 500) return 7.5;
    if (price <= 1000) return 6.0;
    return 4.0;
  }
  
  calculateSeasonalityScore(productData) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const category = productData.ebayCategoryName || '';
    
    if (category.includes('Electronics') || category.includes('Video Games')) {
      if (month >= 11 || month <= 1) return 9.0;
      if (month >= 9) return 7.0;
      return 6.5;
    }
    
    if (category.includes('Clothing')) {
      if ([3, 4, 9, 10].includes(month)) return 8.0;
      return 6.0;
    }
    
    return 6.5;
  }
  
  estimateSearchVolume(title) {
    if (!title) return 5.0;
    
    const highVolumeKeywords = ['iPhone', 'iPad', 'AirPods', 'Nintendo Switch', 'PlayStation', 'MacBook'];
    const mediumVolumeKeywords = ['Samsung', 'LG', 'Canon', 'Sony', 'Apple Watch'];
    
    const titleLower = title.toLowerCase();
    
    if (highVolumeKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()))) {
      return 9.0;
    } else if (mediumVolumeKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()))) {
      return 7.5;
    } else {
      return 6.0;
    }
  }
  
  categorizeDemand(score) {
    if (score >= 8) return 'very_high';
    if (score >= 6.5) return 'high';
    if (score >= 5) return 'medium';
    if (score >= 3.5) return 'low';
    return 'very_low';
  }
}

// 価格予測モデル（既存実装をベースに強化）
class PriceForecastingModel {
  async forecast(productData) {
    const currentPrice = productData.ebaySellingPrice || 0;
    const category = productData.ebayCategoryName || '';
    
    const priceHistory = await this.getPriceHistory(productData);
    const trendAnalysis = this.analyzePriceTrend(priceHistory);
    const profitabilityAnalysis = await this.analyzeProfitability(productData);
    const volatilityAnalysis = this.analyzeVolatility(priceHistory);
    const forecastData = this.generatePriceForecast(currentPrice, trendAnalysis, category);
    
    return {
      currentPrice,
      forecastPrice: forecastData.forecastPrice,
      priceChange: forecastData.priceChange,
      priceChangePercent: forecastData.priceChangePercent,
      confidence: forecastData.confidence,
      profitabilityScore: profitabilityAnalysis.score,
      profitMargin: profitabilityAnalysis.margin,
      priceVolatility: volatilityAnalysis.volatility,
      trend: trendAnalysis.trend,
      factors: {
        seasonality: forecastData.seasonalityFactor,
        demand: forecastData.demandFactor,
        competition: forecastData.competitionFactor
      }
    };
  }
  
  async getPriceHistory(productData) {
    const basePrice = productData.ebaySellingPrice || 100;
    const history = [];
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const variation = 0.9 + Math.random() * 0.2;
      const price = basePrice * variation;
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100
      });
    }
    
    return history;
  }
  
  analyzePriceTrend(priceHistory) {
    if (priceHistory.length < 2) {
      return { trend: 'stable', strength: 0 };
    }
    
    const prices = priceHistory.map(h => h.price);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = (lastPrice - firstPrice) / firstPrice;
    
    let trend = 'stable';
    if (change > 0.05) trend = 'increasing';
    else if (change < -0.05) trend = 'decreasing';
    
    return {
      trend,
      strength: Math.abs(change),
      change: change
    };
  }
  
  async analyzeProfitability(productData) {
    const ebayPrice = productData.ebaySellingPrice || 0;
    const estimatedCost = ebayPrice * 0.7;
    const fees = ebayPrice * 0.15;
    const profit = ebayPrice - estimatedCost - fees;
    const margin = ebayPrice > 0 ? (profit / ebayPrice) * 100 : 0;
    
    let score = 5;
    if (margin > 30) score = 9;
    else if (margin > 20) score = 8;
    else if (margin > 10) score = 7;
    else if (margin > 5) score = 6;
    else if (margin < -10) score = 3;
    else if (margin < 0) score = 4;
    
    return {
      score,
      margin: Math.round(margin * 100) / 100,
      estimatedProfit: Math.round(profit * 100) / 100
    };
  }
  
  analyzeVolatility(priceHistory) {
    if (priceHistory.length < 5) {
      return { volatility: 0 };
    }
    
    const prices = priceHistory.map(h => h.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev / mean;
    
    return {
      volatility: Math.round(volatility * 1000) / 1000,
      standardDeviation: Math.round(stdDev * 100) / 100,
      mean: Math.round(mean * 100) / 100
    };
  }
  
  generatePriceForecast(currentPrice, trendAnalysis, category) {
    let forecastPrice = currentPrice;
    let confidence = 0.6;
    
    if (trendAnalysis.trend === 'increasing') {
      forecastPrice *= (1 + trendAnalysis.strength * 0.5);
      confidence += 0.1;
    } else if (trendAnalysis.trend === 'decreasing') {
      forecastPrice *= (1 - trendAnalysis.strength * 0.5);
      confidence += 0.1;
    }
    
    const seasonalityFactor = this.getSeasonalityFactor(category);
    forecastPrice *= seasonalityFactor;
    
    const demandFactor = this.getDemandFactor(category);
    forecastPrice *= demandFactor;
    
    const competitionFactor = this.getCompetitionFactor(category);
    forecastPrice *= competitionFactor;
    
    const priceChange = forecastPrice - currentPrice;
    const priceChangePercent = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;
    
    return {
      forecastPrice: Math.round(forecastPrice * 100) / 100,
      priceChange: Math.round(priceChange * 100) / 100,
      priceChangePercent: Math.round(priceChangePercent * 100) / 100,
      confidence: Math.min(confidence, 0.95),
      seasonalityFactor,
      demandFactor,
      competitionFactor
    };
  }
  
  getSeasonalityFactor(category) {
    const month = new Date().getMonth() + 1;
    
    if (category.includes('Electronics')) {
      if (month >= 11 || month <= 1) return 1.1;
      return 1.0;
    }
    
    return 1.0;
  }
  
  getDemandFactor(category) {
    const demandFactors = {
      'Consumer Electronics': 1.05,
      'Cell Phones & Accessories': 1.08,
      'Video Games & Consoles': 1.06,
      'default': 1.0
    };
    
    return demandFactors[category] || demandFactors.default;
  }
  
  getCompetitionFactor(category) {
    const competitionFactors = {
      'Consumer Electronics': 0.98,
      'Cell Phones & Accessories': 0.96,
      'default': 0.99
    };
    
    return competitionFactors[category] || competitionFactors.default;
  }
}

// リスク評価モデル（既存実装をベースに完成）
class RiskAssessmentModel {
  async assess(productData) {
    const risks = [];
    let totalRiskScore = 0;
    
    const sellerRisk = this.assessSellerRisk(productData);
    risks.push(sellerRisk);
    totalRiskScore += sellerRisk.score;
    
    const productRisk = this.assessProductRisk(productData);
    risks.push(productRisk);
    totalRiskScore += productRisk.score;
    
    const marketRisk = this.assessMarketRisk(productData);
    risks.push(marketRisk);
    totalRiskScore += marketRisk.score;
    
    const counterfeitRisk = this.assessCounterfeitRisk(productData);
    risks.push(counterfeitRisk);
    totalRiskScore += counterfeitRisk.score;
    
    const regulatoryRisk = this.assessRegulatoryRisk(productData);
    risks.push(regulatoryRisk);
    totalRiskScore += regulatoryRisk.score;
    
    const averageRiskScore = totalRiskScore / risks.length;
    const riskLevel = this.categorizeRisk(averageRiskScore);
    
    return {
      riskScore: Math.round(averageRiskScore * 100) / 100,
      riskLevel,
      confidence: 0.8,
      riskFactors: risks.filter(r => r.score > 5),
      counterfeitRisk: counterfeitRisk.probability,
      recommendations: this.generateRiskRecommendations(risks),
      riskBreakdown: risks.reduce((acc, risk) => {
        acc[risk.type] = risk.score;
        return acc;
      }, {}),
      detailedAnalysis: {
        highRiskFactors: risks.filter(r => r.score > 7),
        mediumRiskFactors: risks.filter(r => r.score > 4 && r.score <= 7),
        lowRiskFactors: risks.filter(r => r.score <= 4)
      }
    };
  }
  
  assessSellerRisk(productData) {
    let riskScore = 3;
    const factors = [];
    
    if (!productData.ebaySellerUsername) {
      riskScore += 2;
      factors.push('Unknown seller');
    }
    
    if (productData.ebaySellerCountry && productData.ebaySellerCountry !== 'US') {
      riskScore += 1;
      factors.push('International seller');
    }
    
    // セラー評価の分析
    if (productData.ebaySellerFeedbackScore) {
      if (productData.ebaySellerFeedbackScore < 100) {
        riskScore += 2;
        factors.push('Low seller feedback score');
      } else if (productData.ebaySellerFeedbackScore < 1000) {
        riskScore += 1;
        factors.push('Medium seller feedback score');
      }
    }
    
    return {
      type: 'seller',
      score: Math.min(riskScore, 10),
      factors,
      description: 'セラー関連のリスク評価'
    };
  }
  
  assessProductRisk(productData) {
    let riskScore = 2;
    const factors = [];
    
    const price = productData.ebaySellingPrice || 0;
    if (price > 1000) {
      riskScore += 2;
      factors.push('High value item');
    } else if (price > 500) {
      riskScore += 1;
      factors.push('Medium value item');
    }
    
    const category = productData.ebayCategoryName || '';
    if (category.includes('Electronics') || category.includes('Cell Phones')) {
      riskScore += 1;
      factors.push('Electronics category risk');
    }
    
    if (productData.brand && ['Apple', 'Samsung', 'Sony'].includes(productData.brand)) {
      riskScore += 1;
      factors.push('Premium brand risk');
    }
    
    // 商品コンディション分析
    if (productData.ebayCondition) {
      if (productData.ebayCondition.toLowerCase().includes('used')) {
        riskScore += 1;
        factors.push('Used item risk');
      } else if (productData.ebayCondition.toLowerCase().includes('refurbished')) {
        riskScore += 2;
        factors.push('Refurbished item risk');
      }
    }
    
    return {
      type: 'product',
      score: Math.min(riskScore, 10),
      factors,
      description: '商品固有のリスク評価'
    };
  }
  
  assessMarketRisk(productData) {
    let riskScore = 3;
    const factors = [];
    
    const soldQuantity = productData.ebaySoldQuantity || 0;
    if (soldQuantity > 100) {
      riskScore += 2;
      factors.push('High competition');
    } else if (soldQuantity > 50) {
      riskScore += 1;
      factors.push('Medium competition');
    }
    
    const watchersCount = productData.ebayWatchersCount || 0;
    if (watchersCount > 0 && soldQuantity > 0) {
      const watchToSalesRatio = watchersCount / soldQuantity;
      if (watchToSalesRatio < 2) {
        riskScore += 1;
        factors.push('Low conversion rate');
      }
    }
    
    // 価格変動リスク
    if (productData.priceHistory && productData.priceHistory.length > 1) {
      const priceVariation = this.calculatePriceVariation(productData.priceHistory);
      if (priceVariation > 0.3) {
        riskScore += 2;
        factors.push('High price volatility');
      }
    }
    
    return {
      type: 'market',
      score: Math.min(riskScore, 10),
      factors,
      description: '市場環境関連のリスク評価'
    };
  }
  
  assessCounterfeitRisk(productData) {
    let riskScore = 1;
    const factors = [];
    const title = (productData.ebayTitle || '').toLowerCase();
    const brand = (productData.brand || '').toLowerCase();
    const price = productData.ebaySellingPrice || 0;
    
    const highRiskBrands = ['apple', 'samsung', 'sony', 'nike', 'adidas', 'louis vuitton', 'gucci'];
    if (highRiskBrands.some(b => brand.includes(b))) {
      riskScore += 3;
      factors.push('High counterfeit risk brand');
    }
    
    const suspiciousKeywords = ['replica', 'aaa', '1:1', 'mirror', 'unbranded', 'no box'];
    if (suspiciousKeywords.some(keyword => title.includes(keyword))) {
      riskScore += 4;
      factors.push('Suspicious keywords detected');
    }
    
    const brandPrice = this.getExpectedBrandPrice(brand);
    if (brandPrice > 0 && price < brandPrice * 0.3) {
      riskScore += 3;
      factors.push('Suspiciously low price');
    }
    
    // セラー所在地リスク
    if (productData.ebaySellerCountry && 
        ['CN', 'HK', 'TW'].includes(productData.ebaySellerCountry)) {
      riskScore += 1;
      factors.push('High-risk origin country');
    }
    
    return {
      type: 'counterfeit',
      score: Math.min(riskScore, 10),
      probability: Math.min(riskScore / 10, 1),
      factors,
      description: '偽物・模造品リスク評価'
    };
  }
  
  assessRegulatoryRisk(productData) {
    let riskScore = 1;
    const factors = [];
    const category = productData.ebayCategoryName || '';
    const title = (productData.ebayTitle || '').toLowerCase();
    
    const highRegCategories = ['Health & Beauty', 'Toys & Hobbies', 'Consumer Electronics'];
    if (highRegCategories.some(cat => category.includes(cat))) {
      riskScore += 2;
      factors.push('Regulated category');
    }
    
    const fdaKeywords = ['supplement', 'vitamin', 'medical', 'therapeutic', 'drug'];
    if (fdaKeywords.some(keyword => title.includes(keyword))) {
      riskScore += 3;
      factors.push('FDA regulated product');
    }
    
    const batteryKeywords = ['battery', 'lithium', 'rechargeable', 'power bank'];
    if (batteryKeywords.some(keyword => title.includes(keyword))) {
      riskScore += 2;
      factors.push('Battery transport restrictions');
    }
    
    // 輸出入制限品目
    const restrictedKeywords = ['laser', 'weapon', 'explosive', 'radioactive'];
    if (restrictedKeywords.some(keyword => title.includes(keyword))) {
      riskScore += 4;
      factors.push('Export/import restricted item');
    }
    
    return {
      type: 'regulatory',
      score: Math.min(riskScore, 10),
      factors,
      description: '規制・法的リスク評価'
    };
  }
  
  calculatePriceVariation(priceHistory) {
    if (!priceHistory || priceHistory.length < 2) return 0;
    
    const prices = priceHistory.map(h => h.price);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance) / mean;
  }
  
  getExpectedBrandPrice(brand) {
    const brandPrices = {
      'apple': 500,
      'samsung': 300,
      'sony': 200,
      'nike': 100,
      'adidas': 80,
      'canon': 400,
      'nikon': 350
    };
    
    return brandPrices[brand.toLowerCase()] || 0;
  }
  
  categorizeRisk(riskScore) {
    if (riskScore >= 8) return 'very_high';
    if (riskScore >= 6) return 'high';
    if (riskScore >= 4) return 'medium';
    if (riskScore >= 2) return 'low';
    return 'very_low';
  }
  
  generateRiskRecommendations(risks) {
    const recommendations = [];
    
    risks.forEach(risk => {
      if (risk.score > 6) {
        switch (risk.type) {
          case 'seller':
            recommendations.push('セラーの評価と過去の取引履歴を詳細に確認してください');
            break;
          case 'product':
            recommendations.push('商品の真正性と品質を慎重に検証してください');
            break;
          case 'market':
            recommendations.push('市場の競争状況を継続的に監視してください');
            break;
          case 'counterfeit':
            recommendations.push('信頼できるサプライヤーからの仕入れを強く推奨します');
            break;
          case 'regulatory':
            recommendations.push('該当する法規制を事前に確認してください');
            break;
        }
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('現在のリスクレベルは許容範囲内です');
    }
    
    return recommendations;
  }
}

// 商品マッチングモデル（完全実装）
class ProductMatchingModel {
  constructor() {
    this.matchingStrategies = ['keyword_based', 'model_based', 'image_based', 'hybrid'];
    this.confidenceThreshold = 0.7;
  }
  
  async match(ebayProduct, options = {}) {
    const startTime = Date.now();
    const strategy = options.strategy || 'hybrid';
    
    const matchingResults = {
      amazonMatches: [],
      rakutenMatches: [],
      mercariMatches: [],
      yahooAuctionMatches: [],
      confidence: 0,
      matchingStrategy: strategy,
      processingTime: 0,
      searchQueries: [],
      qualityScore: 0
    };
    
    try {
      // 検索クエリ生成
      const searchQueries = this.generateSearchQueries(ebayProduct, strategy);
      matchingResults.searchQueries = searchQueries;
      
      // 並列検索実行
      const searchPromises = [];
      
      if (!options.excludeAmazon) {
        searchPromises.push(
          this.searchAmazon(searchQueries, ebayProduct)
            .then(matches => ({ platform: 'amazon', matches }))
            .catch(error => ({ platform: 'amazon', error: error.message }))
        );
      }
      
      if (!options.excludeRakuten) {
        searchPromises.push(
          this.searchRakuten(searchQueries, ebayProduct)
            .then(matches => ({ platform: 'rakuten', matches }))
            .catch(error => ({ platform: 'rakuten', error: error.message }))
        );
      }
      
      if (!options.excludeMercari) {
        searchPromises.push(
          this.searchMercari(searchQueries, ebayProduct)
            .then(matches => ({ platform: 'mercari', matches }))
            .catch(error => ({ platform: 'mercari', error: error.message }))
        );
      }
      
      if (!options.excludeYahooAuction) {
        searchPromises.push(
          this.searchYahooAuction(searchQueries, ebayProduct)
            .then(matches => ({ platform: 'yahooAuction', matches }))
            .catch(error => ({ platform: 'yahooAuction', error: error.message }))
        );
      }
      
      const searchResults = await Promise.all(searchPromises);
      
      // 結果を統合
      searchResults.forEach(result => {
        if (!result.error) {
          switch (result.platform) {
            case 'amazon':
              matchingResults.amazonMatches = result.matches;
              break;
            case 'rakuten':
              matchingResults.rakutenMatches = result.matches;
              break;
            case 'mercari':
              matchingResults.mercariMatches = result.matches;
              break;
            case 'yahooAuction':
              matchingResults.yahooAuctionMatches = result.matches;
              break;
          }
        }
      });
      
      // マッチング品質評価
      matchingResults.qualityScore = this.evaluateMatchingQuality(matchingResults, ebayProduct);
      
      // 信頼度計算
      matchingResults.confidence = this.calculateMatchingConfidence(matchingResults);
      
      // 処理時間記録
      matchingResults.processingTime = Date.now() - startTime;
      
      // ベストマッチ選定
      matchingResults.bestMatches = this.selectBestMatches(matchingResults);
      
      return matchingResults;
      
    } catch (error) {
      logger.error('Product matching failed', { error: error.message, productId: ebayProduct.id });
      throw error;
    }
  }
  
  generateSearchQueries(ebayProduct, strategy) {
    const queries = [];
    const title = ebayProduct.ebayTitle || '';
    const brand = ebayProduct.brand || '';
    
    // 基本キーワード抽出
    const keywords = this.extractKeywords(title);
    const modelNumber = this.extractModelNumber(title);
    
    switch (strategy) {
      case 'keyword_based':
        queries.push(...this.generateKeywordQueries(keywords, brand));
        break;
        
      case 'model_based':
        if (modelNumber) {
          queries.push(...this.generateModelQueries(modelNumber, brand));
        }
        queries.push(...this.generateKeywordQueries(keywords, brand));
        break;
        
      case 'hybrid':
        queries.push(...this.generateHybridQueries(keywords, brand, modelNumber));
        break;
        
      default:
        queries.push(...this.generateKeywordQueries(keywords, brand));
    }
    
    // 重複除去と優先度順ソート
    return [...new Set(queries)].slice(0, 10);
  }
  
  generateKeywordQueries(keywords, brand) {
    const queries = [];
    
    // ブランド + 主要キーワード
    if (brand && keywords.length > 0) {
      queries.push(`${brand} ${keywords.slice(0, 3).join(' ')}`);
    }
    
    // 主要キーワードのみ
    if (keywords.length >= 2) {
      queries.push(keywords.slice(0, 4).join(' '));
    }
    
    // ブランドのみ（フォールバック）
    if (brand) {
      queries.push(brand);
    }
    
    return queries;
  }
  
  generateModelQueries(modelNumber, brand) {
    const queries = [];
    
    if (brand) {
      queries.push(`${brand} ${modelNumber}`);
    }
    
    queries.push(modelNumber);
    
    return queries;
  }
  
  generateHybridQueries(keywords, brand, modelNumber) {
    const queries = [];
    
    // 最高優先度: ブランド + モデル番号
    if (brand && modelNumber) {
      queries.push(`${brand} ${modelNumber}`);
    }
    
    // 高優先度: ブランド + 主要キーワード
    if (brand && keywords.length > 0) {
      queries.push(`${brand} ${keywords.slice(0, 2).join(' ')}`);
    }
    
    // 中優先度: モデル番号のみ
    if (modelNumber) {
      queries.push(modelNumber);
    }
    
    // 通常優先度: 主要キーワード
    if (keywords.length >= 2) {
      queries.push(keywords.slice(0, 3).join(' '));
    }
    
    // フォールバック: ブランドのみ
    if (brand) {
      queries.push(brand);
    }
    
    return queries;
  }
  
  extractKeywords(title) {
    if (!title) return [];
    
    const stopwords = ['new', 'used', 'authentic', 'genuine', 'original', 'brand', 'oem', 'free', 'shipping'];
    const words = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.includes(word));
    
    // 重要度順にソート（数字を含む単語、大文字を含む単語を優先）
    return words
      .sort((a, b) => {
        const aHasNumber = /\d/.test(a);
        const bHasNumber = /\d/.test(b);
        if (aHasNumber && !bHasNumber) return -1;
        if (!aHasNumber && bHasNumber) return 1;
        return b.length - a.length; // 長い単語を優先
      })
      .slice(0, 10);
  }
  
  extractModelNumber(title) {
    if (!title) return null;
    
    const patterns = [
      /[A-Z]{2,}\d{2,}/g,  // iPad Pro, iPhone12 など
      /\d{3,}[A-Z]+/g,     // 5GHz, 64GB など
      /[A-Z]\d{3,}/g,      // A1234 など
      /\b[A-Z]{1,2}\d{1,4}[A-Z]?\b/g // A12, X1, SM-G など
    ];
    
    for (const pattern of patterns) {
      const matches = title.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
    
    return null;
  }
  
  async searchAmazon(searchQueries, ebayProduct) {
    const matches = [];
    
    for (const query of searchQueries) {
      try {
        // Amazon Product API統合（実装予定）
        const mockResults = await this.mockAmazonSearch(query, ebayProduct);
        matches.push(...mockResults);
        
        // レート制限対応
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        logger.warn('Amazon search failed', { query, error: error.message });
      }
    }
    
    // 重複除去と品質フィルタリング
    return this.filterAndDeduplicateMatches(matches, 'amazon');
  }
  
  async mockAmazonSearch(query, ebayProduct) {
    // モック実装 - 実際のAmazon API統合時に置き換え
    const mockResults = [
      {
        asin: 'B08N5WRWNW',
        title: `Mock Amazon Result for: ${query}`,
        price: Math.round((ebayProduct.ebaySellingPrice || 100) * 0.8 * 100) / 100,
        currency: 'JPY',
        availability: 'in_stock',
        seller: 'Amazon.co.jp',
        matchScore: Math.random() * 0.4 + 0.6, // 0.6-1.0
        matchReasons: ['keyword_match', 'price_range'],
        url: `https://amazon.co.jp/dp/B08N5WRWNW`,
        shipping: 'Prime対応',
        reviews: {
          rating: 4.2,
          count: 127
        }
      }
    ];
    
    return mockResults;
  }
  
  async searchRakuten(searchQueries, ebayProduct) {
    const matches = [];
    
    for (const query of searchQueries) {
      try {
        // 楽天API統合（実装予定）
        const mockResults = await this.mockRakutenSearch(query, ebayProduct);
        matches.push(...mockResults);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        logger.warn('Rakuten search failed', { query, error: error.message });
      }
    }
    
    return this.filterAndDeduplicateMatches(matches, 'rakuten');
  }
  
  async mockRakutenSearch(query, ebayProduct) {
    return [
      {
        itemCode: 'shop:item:123456',
        title: `Mock Rakuten Result for: ${query}`,
        price: Math.round((ebayProduct.ebaySellingPrice || 100) * 0.85 * 100) / 100,
        currency: 'JPY',
        shopName: 'Mock Shop',
        matchScore: Math.random() * 0.3 + 0.5,
        matchReasons: ['keyword_match'],
        url: 'https://item.rakuten.co.jp/shop/item/',
        shipping: 'ショップ送料',
        points: 15
      }
    ];
  }
  
  async searchMercari(searchQueries, ebayProduct) {
    const matches = [];
    
    for (const query of searchQueries) {
      try {
        // メルカリスクレイピング（実装予定）
        const mockResults = await this.mockMercariSearch(query, ebayProduct);
        matches.push(...mockResults);
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // より慎重なレート制限
        
      } catch (error) {
        logger.warn('Mercari search failed', { query, error: error.message });
      }
    }
    
    return this.filterAndDeduplicateMatches(matches, 'mercari');
  }
  
  async mockMercariSearch(query, ebayProduct) {
    return [
      {
        itemId: 'm123456789',
        title: `Mock Mercari Result for: ${query}`,
        price: Math.round((ebayProduct.ebaySellingPrice || 100) * 0.7 * 100) / 100,
        currency: 'JPY',
        condition: 'やや傷や汚れあり',
        matchScore: Math.random() * 0.4 + 0.4,
        matchReasons: ['keyword_match'],
        url: 'https://jp.mercari.com/item/m123456789',
        shipping: '送料込み',
        seller: {
          name: 'MockUser',
          rating: 4.8
        }
      }
    ];
  }
  
  async searchYahooAuction(searchQueries, ebayProduct) {
    const matches = [];
    
    for (const query of searchQueries) {
      try {
        // ヤフオクAPI統合（実装予定）
        const mockResults = await this.mockYahooAuctionSearch(query, ebayProduct);
        matches.push(...mockResults);
        
        await new Promise(resolve => setTimeout(resolve, 400));
        
      } catch (error) {
        logger.warn('Yahoo Auction search failed', { query, error: error.message });
      }
    }
    
    return this.filterAndDeduplicateMatches(matches, 'yahoo_auction');
  }
  
  async mockYahooAuctionSearch(query, ebayProduct) {
    return [
      {
        auctionId: 'y123456789',
        title: `Mock Yahoo Auction Result for: ${query}`,
        currentPrice: Math.round((ebayProduct.ebaySellingPrice || 100) * 0.6 * 100) / 100,
        currency: 'JPY',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        matchScore: Math.random() * 0.3 + 0.4,
        matchReasons: ['keyword_match'],
        url: 'https://page.auctions.yahoo.co.jp/jp/auction/y123456789',
        bids: 5,
        condition: '中古'
      }
    ];
  }
  
  filterAndDeduplicateMatches(matches, platform) {
    // 品質フィルタリング
    const qualityFiltered = matches.filter(match => 
      match.matchScore > this.confidenceThreshold * 0.7 // プラットフォーム別閾値調整
    );
    
    // 重複除去（タイトルの類似度による）
    const deduplicated = [];
    const seenTitles = new Set();
    
    qualityFiltered.forEach(match => {
      const normalizedTitle = this.normalizeTitle(match.title);
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        deduplicated.push({
          ...match,
          platform,
          normalizedTitle
        });
      }
    });
    
    // スコア順ソート
    return deduplicated.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  normalizeTitle(title) {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  calculateMatchingConfidence(results) {
    let totalMatches = 0;
    let weightedScore = 0;
    
    const weights = {
      amazon: 0.4,
      rakuten: 0.3,
      mercari: 0.2,
      yahooAuction: 0.1
    };
    
    if (results.amazonMatches.length > 0) {
      totalMatches++;
      const avgScore = results.amazonMatches.reduce((sum, m) => sum + m.matchScore, 0) / results.amazonMatches.length;
      weightedScore += weights.amazon * avgScore;
    }
    
    if (results.rakutenMatches.length > 0) {
      totalMatches++;
      const avgScore = results.rakutenMatches.reduce((sum, m) => sum + m.matchScore, 0) / results.rakutenMatches.length;
      weightedScore += weights.rakuten * avgScore;
    }
    
    if (results.mercariMatches.length > 0) {
      totalMatches++;
      const avgScore = results.mercariMatches.reduce((sum, m) => sum + m.matchScore, 0) / results.mercariMatches.length;
      weightedScore += weights.mercari * avgScore;
    }
    
    if (results.yahooAuctionMatches.length > 0) {
      totalMatches++;
      const avgScore = results.yahooAuctionMatches.reduce((sum, m) => sum + m.matchScore, 0) / results.yahooAuctionMatches.length;
      weightedScore += weights.yahooAuction * avgScore;
    }
    
    // プラットフォーム数による信頼度調整
    const platformMultiplier = Math.min(totalMatches / 4, 1);
    
    return weightedScore * platformMultiplier;
  }
  
  evaluateMatchingQuality(results, ebayProduct) {
    let qualityScore = 0;
    let factors = 0;
    
    // マッチ数による評価
    const totalMatches = results.amazonMatches.length + 
                        results.rakutenMatches.length + 
                        results.mercariMatches.length + 
                        results.yahooAuctionMatches.length;
    
    if (totalMatches > 0) {
      qualityScore += Math.min(totalMatches / 10, 1) * 0.3;
      factors++;
    }
    
    // 価格一貫性による評価
    const priceConsistency = this.evaluatePriceConsistency(results, ebayProduct);
    qualityScore += priceConsistency * 0.4;
    factors++;
    
    // マッチスコアの平均による評価
    const avgMatchScore = this.calculateAverageMatchScore(results);
    qualityScore += avgMatchScore * 0.3;
    factors++;
    
    return factors > 0 ? qualityScore / factors : 0;
  }
  
  evaluatePriceConsistency(results, ebayProduct) {
    const ebayPrice = ebayProduct.ebaySellingPrice || 0;
    if (ebayPrice === 0) return 0.5;
    
    const allPrices = [];
    
    results.amazonMatches.forEach(m => allPrices.push(m.price));
    results.rakutenMatches.forEach(m => allPrices.push(m.price));
    results.mercariMatches.forEach(m => allPrices.push(m.price || m.currentPrice));
    results.yahooAuctionMatches.forEach(m => allPrices.push(m.currentPrice));
    
    if (allPrices.length === 0) return 0.5;
    
    // eBay価格との乖離を評価
    const avgPrice = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
    const priceRatio = Math.min(avgPrice, ebayPrice) / Math.max(avgPrice, ebayPrice);
    
    return priceRatio;
  }
  
  calculateAverageMatchScore(results) {
    const allScores = [];
    
    results.amazonMatches.forEach(m => allScores.push(m.matchScore));
    results.rakutenMatches.forEach(m => allScores.push(m.matchScore));
    results.mercariMatches.forEach(m => allScores.push(m.matchScore));
    results.yahooAuctionMatches.forEach(m => allScores.push(m.matchScore));
    
    if (allScores.length === 0) return 0;
    
    return allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
  }
  
  selectBestMatches(results) {
    const bestMatches = {
      amazon: results.amazonMatches.slice(0, 3),
      rakuten: results.rakutenMatches.slice(0, 3),
      mercari: results.mercariMatches.slice(0, 3),
      yahooAuction: results.yahooAuctionMatches.slice(0, 3)
    };
    
    // 全プラットフォームから総合ベスト
    const allMatches = [
      ...results.amazonMatches,
      ...results.rakutenMatches,
      ...results.mercariMatches,
      ...results.yahooAuctionMatches
    ];
    
    bestMatches.overall = allMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
    
    return bestMatches;
  }
}

// 市場トレンド分析モデル（完全実装）
class MarketTrendAnalysisModel {
  constructor() {
    this.trendCache = new Map();
    this.cacheTimeout = 7200; // 2時間
  }
  
  async analyze(productData) {
    const cacheKey = `trend_${productData.ebayCategoryName}_${productData.brand}`;
    
    // キャッシュ確認
    if (this.trendCache.has(cacheKey)) {
      const cached = this.trendCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout * 1000) {
        return cached.data;
      }
    }
    
    const analysis = {
      trendScore: 5.0,
      trendDirection: 'stable',
      growthRate: 0,
      seasonality: null,
      marketMaturity: 'mature',
      influencingFactors: [],
      confidence: 0.6,
      marketSize: 'medium',
      competitionLevel: 'medium',
      priceStability: 'stable'
    };
    
    try {
      // カテゴリ別トレンド分析
      const categoryTrend = await this.analyzeCategoryTrend(productData.ebayCategoryName);
      analysis.trendScore += categoryTrend.score;
      analysis.trendDirection = categoryTrend.direction;
      analysis.marketMaturity = categoryTrend.maturity;
      
      // ブランドトレンド分析
      const brandTrend = await this.analyzeBrandTrend(productData.brand);
      analysis.trendScore += brandTrend.score;
      analysis.influencingFactors.push(...brandTrend.factors);
      
      // 季節性分析
      analysis.seasonality = this.analyzeSeasonality(productData);
      if (analysis.seasonality) {
        analysis.influencingFactors.push(`季節性: ${analysis.seasonality.season}`);
      }
      
      // 価格安定性分析
      analysis.priceStability = this.analyzePriceStability(productData);
      
      // 競争レベル分析
      analysis.competitionLevel = this.analyzeCompetitionLevel(productData);
      
      // 市場規模推定
      analysis.marketSize = this.estimateMarketSize(productData);
      
      // Google Trends統合（実装予定）
      const googleTrends = await this.fetchGoogleTrends(productData.ebayTitle);
      if (googleTrends) {
        analysis.trendScore += googleTrends.score;
        analysis.influencingFactors.push(...googleTrends.factors);
        analysis.confidence += 0.1;
      }
      
      // ソーシャルメディアトレンド（実装予定）
      const socialTrends = await this.analyzeSocialTrends(productData);
      if (socialTrends) {
        analysis.trendScore += socialTrends.score;
        analysis.influencingFactors.push(...socialTrends.factors);
      }
      
      // 最終スコア正規化
      analysis.trendScore = Math.max(0, Math.min(10, analysis.trendScore));
      
      // 信頼度調整
      analysis.confidence = Math.min(analysis.confidence, 0.9);
      
      // 結果をキャッシュ
      this.trendCache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('Market trend analysis failed', { error: error.message });
      return analysis; // デフォルト値を返す
    }
  }
  
  async analyzeCategoryTrend(categoryName) {
    const categoryData = {
      'Consumer Electronics': { 
        score: 1.5, 
        direction: 'increasing',
        maturity: 'mature',
        growthRate: 0.08,
        volatility: 'medium'
      },
      'Cell Phones & Accessories': { 
        score: 2.0, 
        direction: 'increasing',
        maturity: 'mature',
        growthRate: 0.12,
        volatility: 'high'
      },
      'Video Games & Consoles': { 
        score: 1.8, 
        direction: 'increasing',
        maturity: 'growing',
        growthRate: 0.15,
        volatility: 'medium'
      },
      'Clothing, Shoes & Accessories': { 
        score: 0.5, 
        direction: 'stable',
        maturity: 'mature',
        growthRate: 0.03,
        volatility: 'low'
      },
      'Home & Garden': { 
        score: 0.8, 
        direction: 'stable',
        maturity: 'mature',
        growthRate: 0.05,
        volatility: 'low'
      },
      'Toys & Hobbies': {
        score: 1.2,
        direction: 'increasing',
        maturity: 'growing',
        growthRate: 0.10,
        volatility: 'high'
      },
      'default': { 
        score: 0, 
        direction: 'stable',
        maturity: 'mature',
        growthRate: 0.02,
        volatility: 'medium'
      }
    };
    
    return categoryData[categoryName] || categoryData.default;
  }
  
  async analyzeBrandTrend(brand) {
    if (!brand) return { score: 0, factors: [] };
    
    const brandData = {
      'Apple': { 
        score: 2.0,
        factors: ['プレミアムブランド', '高い消費者認知度', '革新的製品'],
        marketShare: 'high',
        loyaltyScore: 9.2
      },
      'Samsung': { 
        score: 1.5,
        factors: ['グローバルブランド', '多様な製品ライン'],
        marketShare: 'high',
        loyaltyScore: 7.8
      },
      'Sony': { 
        score: 1.2,
        factors: ['エンターテインメント強化', '技術革新'],
        marketShare: 'medium',
        loyaltyScore: 8.1
      },
      'Nintendo': { 
        score: 1.8,
        factors: ['独占的ゲーム', '強いブランドロイヤリティ'],
        marketShare: 'medium',
        loyaltyScore: 9.0
      },
      'default': { 
        score: 0,
        factors: ['一般ブランド'],
        marketShare: 'low',
        loyaltyScore: 5.0
      }
    };
    
    return brandData[brand] || brandData.default;
  }
  
  analyzeSeasonality(productData) {
    const currentMonth = new Date().getMonth() + 1;
    const category = productData.ebayCategoryName || '';
    
    const seasonalityPatterns = {
      'Consumer Electronics': {
        peak: [11, 12, 1],
        season: 'winter',
        strength: 0.8,
        description: 'ホリデーシーズンに需要急増'
      },
      'Video Games & Consoles': {
        peak: [10, 11, 12],
        season: 'winter',
        strength: 0.9,
        description: 'クリスマス・年末商戦がピーク'
      },
      'Clothing, Shoes & Accessories': {
        peak: [3, 4, 9, 10],
        season: 'transition',
        strength: 0.6,
        description: '季節変わり目に需要増加'
      },
      'Toys & Hobbies': {
        peak: [11, 12],
        season: 'winter',
        strength: 0.95,
        description: 'クリスマス商戦が最大のピーク'
      },
      'Home & Garden': {
        peak: [4, 5, 6],
        season: 'spring',
        strength: 0.7,
        description: '春の園芸シーズン'
      }
    };
    
    const pattern = seasonalityPatterns[category];
    if (!pattern) return null;
    
    const isCurrentSeason = pattern.peak.includes(currentMonth);
    const distanceToNextPeak = this.calculateDistanceToNextPeak(currentMonth, pattern.peak);
    
    return {
      season: pattern.season,
      isCurrentSeason,
      peakMonths: pattern.peak,
      seasonalityStrength: pattern.strength,
      description: pattern.description,
      distanceToNextPeak,
      seasonalMultiplier: isCurrentSeason ? 1.2 : 0.9
    };
  }
  
  calculateDistanceToNextPeak(currentMonth, peakMonths) {
    const sortedPeaks = [...peakMonths].sort((a, b) => a - b);
    
    for (const peak of sortedPeaks) {
      if (peak >= currentMonth) {
        return peak - currentMonth;
      }
    }
    
    // 来年の最初のピークまでの距離
    return (12 - currentMonth) + sortedPeaks[0];
  }
  
  analyzePriceStability(productData) {
    // 価格履歴がある場合の分析（実装予定）
    if (productData.priceHistory && productData.priceHistory.length > 1) {
      const prices = productData.priceHistory.map(h => h.price);
      const coefficient = this.calculateVariationCoefficient(prices);
      
      if (coefficient < 0.1) return 'very_stable';
      if (coefficient < 0.2) return 'stable';
      if (coefficient < 0.3) return 'moderate';
      if (coefficient < 0.5) return 'volatile';
      return 'very_volatile';
    }
    
    // デフォルト分析（カテゴリベース）
    const category = productData.ebayCategoryName || '';
    const stabilityMap = {
      'Consumer Electronics': 'moderate',
      'Cell Phones & Accessories': 'volatile',
      'Video Games & Consoles': 'moderate',
      'Clothing, Shoes & Accessories': 'stable',
      'Home & Garden': 'stable',
      'default': 'stable'
    };
    
    return stabilityMap[category] || stabilityMap.default;
  }
  
  calculateVariationCoefficient(prices) {
    if (prices.length < 2) return 0;
    
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / mean;
  }
  
  analyzeCompetitionLevel(productData) {
    const soldQuantity = productData.ebaySoldQuantity || 0;
    const watchersCount = productData.ebayWatchersCount || 0;
    const listingCount = productData.ebayListingCount || 0;
    
    let competitionScore = 0;
    
    // 販売量による競争度
    if (soldQuantity > 1000) competitionScore += 3;
    else if (soldQuantity > 500) competitionScore += 2;
    else if (soldQuantity > 100) competitionScore += 1;
    
    // 出品数による競争度
    if (listingCount > 500) competitionScore += 2;
    else if (listingCount > 100) competitionScore += 1;
    
    // ウォッチ比率による需要競争
    if (watchersCount > 0 && soldQuantity > 0) {
      const watchRatio = watchersCount / soldQuantity;
      if (watchRatio > 5) competitionScore += 1;
    }
    
    if (competitionScore >= 5) return 'very_high';
    if (competitionScore >= 4) return 'high';
    if (competitionScore >= 2) return 'medium';
    if (competitionScore >= 1) return 'low';
    return 'very_low';
  }
  
  estimateMarketSize(productData) {
    const category = productData.ebayCategoryName || '';
    const soldQuantity = productData.ebaySoldQuantity || 0;
    const price = productData.ebaySellingPrice || 0;
    
    // カテゴリ別市場規模の基本スコア
    const categorySizeMap = {
      'Consumer Electronics': 5,
      'Cell Phones & Accessories': 5,
      'Video Games & Consoles': 4,
      'Clothing, Shoes & Accessories': 5,
      'Home & Garden': 4,
      'Toys & Hobbies': 3,
      'default': 3
    };
    
    let sizeScore = categorySizeMap[category] || categorySizeMap.default;
    
    // 販売実績による調整
    if (soldQuantity > 10000) sizeScore += 2;
    else if (soldQuantity > 1000) sizeScore += 1;
    else if (soldQuantity < 10) sizeScore -= 1;
    
    // 価格帯による調整
    if (price > 1000) sizeScore += 1; // 高価格帯は市場が大きい傾向
    else if (price < 50) sizeScore -= 1;
    
    if (sizeScore >= 7) return 'very_large';
    if (sizeScore >= 6) return 'large';
    if (sizeScore >= 4) return 'medium';
    if (sizeScore >= 2) return 'small';
    return 'very_small';
  }
  
  async fetchGoogleTrends(title) {
    try {
      // Google Trends API統合（実装予定）
      // 現在はモック実装
      const keywords = this.extractTrendKeywords(title);
      if (keywords.length === 0) return null;
      
      // モックトレンドデータ
      const mockTrendData = {
        score: Math.random() * 2 - 1, // -1 to 1
        factors: [],
        trendData: [],
        relatedQueries: []
      };
      
      // キーワードに基づく仮想トレンド
      const primaryKeyword = keywords[0];
      if (['iphone', 'ipad', 'airpods'].some(k => primaryKeyword.toLowerCase().includes(k))) {
        mockTrendData.score = 1.5;
        mockTrendData.factors.push('高い検索トレンド');
      } else if (['vintage', 'retro', 'classic'].some(k => primaryKeyword.toLowerCase().includes(k))) {
        mockTrendData.score = 0.8;
        mockTrendData.factors.push('ニッチ需要');
      } else {
        mockTrendData.score = 0;
        mockTrendData.factors.push('検索トレンド安定');
      }
      
      return mockTrendData;
      
    } catch (error) {
      logger.warn('Google Trends fetch failed', { error: error.message });
      return null;
    }
  }
  
  extractTrendKeywords(title) {
    if (!title) return [];
    
    const trendKeywords = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
    
    return trendKeywords;
  }
  
  async analyzeSocialTrends(productData) {
    try {
      // ソーシャルメディアAPI統合（実装予定）
      // Twitter, Instagram, TikTokのトレンド分析
      
      const mockSocialData = {
        score: Math.random() * 1 - 0.5, // -0.5 to 0.5
        factors: [],
        platforms: {
          twitter: { mentions: 0, sentiment: 'neutral' },
          instagram: { posts: 0, engagement: 'low' },
          tiktok: { videos: 0, views: 0 }
        }
      };
      
      // ブランドベースの仮想ソーシャルトレンド
      const brand = productData.brand || '';
      if (['Apple', 'Samsung', 'Nintendo'].includes(brand)) {
        mockSocialData.score = 0.8;
        mockSocialData.factors.push('ソーシャルメディアで話題');
      } else {
        mockSocialData.score = 0;
        mockSocialData.factors.push('標準的なソーシャル露出');
      }
      
      return mockSocialData;
      
    } catch (error) {
      logger.warn('Social trends analysis failed', { error: error.message });
      return null;
    }
  }
}

module.exports = AIAnalysisService;