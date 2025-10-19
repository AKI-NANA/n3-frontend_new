// services/api-gateway/src/routes/research.js
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const EbayService = require('../services/ebayService');
const SupplierService = require('../services/supplierService');
const ProfitService = require('../services/profitService');
const RiskService = require('../services/riskService');
const MarketService = require('../services/marketService');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// レート制限設定
const researchRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 50, // APIキーあたり50リクエスト
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { error: 'Too many research requests, please try again later.' }
});

// サービス初期化
const ebayService = new EbayService();
const supplierService = new SupplierService();
const profitService = new ProfitService();
const riskService = new RiskService();
const marketService = new MarketService();
const notificationService = new NotificationService();

/**
 * 総合リサーチAPI - メインエンドポイント
 * POST /api/research/comprehensive
 */
router.post('/comprehensive',
    researchRateLimit,
    [
        body('product').isObject().withMessage('Product data is required'),
        body('product.title').notEmpty().withMessage('Product title is required'),
        body('product.platform').isIn(['ebay', 'amazon', 'rakuten', 'mercari']).withMessage('Invalid platform'),
        body('options').optional().isObject()
    ],
    async (req, res) => {
        const startTime = Date.now();
        const requestId = uuidv4();
        
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array(),
                    requestId
                });
            }

            const { product, options = {} } = req.body;
            const userId = req.user?.id;

            console.log(`[${requestId}] Starting comprehensive research for: ${product.title}`);

            // 並列処理で効率化
            const researchTasks = [];

            // 1. eBayデータ取得・分析
            if (product.platform !== 'ebay') {
                researchTasks.push(
                    ebayService.findSimilarProducts(product)
                        .then(ebayData => ({ type: 'ebay', data: ebayData }))
                        .catch(error => ({ type: 'ebay', error: error.message }))
                );
            }

            // 2. 国内サプライヤー検索
            if (options.includeDomesticSuppliers !== false) {
                researchTasks.push(
                    supplierService.findSuppliers(product)
                        .then(suppliers => ({ type: 'suppliers', data: suppliers }))
                        .catch(error => ({ type: 'suppliers', error: error.message }))
                );
            }

            // 3. 市場分析
            if (options.includeMarketAnalysis !== false) {
                researchTasks.push(
                    marketService.analyzeMarket(product)
                        .then(analysis => ({ type: 'market', data: analysis }))
                        .catch(error => ({ type: 'market', error: error.message }))
                );
            }

            // 並列実行
            const results = await Promise.all(researchTasks);
            
            // 結果をマージ
            const researchData = {
                product,
                requestId,
                timestamp: new Date().toISOString()
            };

            results.forEach(result => {
                if (result.error) {
                    console.error(`[${requestId}] ${result.type} error:`, result.error);
                    researchData[`${result.type}Error`] = result.error;
                } else {
                    researchData[result.type] = result.data;
                }
            });

            // 4. 利益計算（サプライヤーデータが必要）
            if (researchData.suppliers && researchData.ebay && options.includeProfitCalculation !== false) {
                try {
                    researchData.profitAnalysis = await profitService.calculateProfitOpportunities(
                        researchData.ebay,
                        researchData.suppliers
                    );
                } catch (error) {
                    console.error(`[${requestId}] Profit calculation error:`, error);
                    researchData.profitError = error.message;
                }
            }

            // 5. リスク評価
            if (options.includeRiskAssessment !== false) {
                try {
                    researchData.riskAssessment = await riskService.assessRisks({
                        product: researchData.product,
                        ebayData: researchData.ebay,
                        suppliers: researchData.suppliers,
                        marketData: researchData.market
                    });
                } catch (error) {
                    console.error(`[${requestId}] Risk assessment error:`, error);
                    researchData.riskError = error.message;
                }
            }

            // 6. 推奨事項生成
            researchData.recommendations = generateRecommendations(researchData);

            // 7. 結果保存（非同期）
            if (userId) {
                setImmediate(() => {
                    saveResearchResult(userId, researchData).catch(console.error);
                });
            }

            // 8. 通知送信（高利益機会の場合）
            if (researchData.profitAnalysis?.maxProfitMargin > 30) {
                setImmediate(() => {
                    notificationService.sendProfitOpportunityAlert(userId, researchData).catch(console.error);
                });
            }

            const processingTime = Date.now() - startTime;
            console.log(`[${requestId}] Research completed in ${processingTime}ms`);

            res.json({
                success: true,
                data: researchData,
                processingTime,
                requestId
            });

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`[${requestId}] Research failed after ${processingTime}ms:`, error);
            
            res.status(500).json({
                success: false,
                error: 'Research processing failed',
                message: error.message,
                processingTime,
                requestId
            });
        }
    }
);

/**
 * eBay転売ポテンシャル分析
 * POST /api/research/ebay-potential
 */
router.post('/ebay-potential',
    researchRateLimit,
    [
        body('productData').isObject().withMessage('Product data is required'),
        body('productData.title').notEmpty().withMessage('Product title is required')
    ],
    async (req, res) => {
        const requestId = uuidv4();
        
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { productData } = req.body;
            
            console.log(`[${requestId}] Analyzing eBay potential for: ${productData.title}`);

            // eBayでの類似商品検索
            const ebaySearchResults = await ebayService.searchSimilarProducts(productData.title);
            
            if (!ebaySearchResults || ebaySearchResults.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        potentialScore: 20,
                        message: 'eBayでの類似商品が見つかりませんでした',
                        searchKeywords: productData.title,
                        requestId
                    }
                });
            }

            // 価格比較分析
            const priceComparison = analyzePriceComparison(productData, ebaySearchResults);
            
            // 競合状況分析
            const competition = analyzeCompetition(ebaySearchResults);
            
            // ポテンシャルスコア計算
            const potentialScore = calculatePotentialScore(priceComparison, competition, ebaySearchResults);
            
            const analysisResult = {
                potentialScore,
                priceComparison,
                competition,
                ebayData: {
                    totalListings: ebaySearchResults.length,
                    avgPrice: ebaySearchResults.reduce((sum, item) => sum + item.price, 0) / ebaySearchResults.length,
                    priceRange: {
                        min: Math.min(...ebaySearchResults.map(item => item.price)),
                        max: Math.max(...ebaySearchResults.map(item => item.price))
                    }
                },
                searchKeywords: extractSearchKeywords(productData.title),
                recommendations: generateEbayRecommendations(potentialScore, priceComparison),
                requestId
            };

            res.json({
                success: true,
                data: analysisResult
            });

        } catch (error) {
            console.error(`[${requestId}] eBay potential analysis error:`, error);
            
            res.status(500).json({
                success: false,
                error: 'eBay potential analysis failed',
                message: error.message,
                requestId
            });
        }
    }
);

/**
 * 商品利益計算
 * POST /api/research/calculate-profit
 */
router.post('/calculate-profit',
    [
        body('productId').isInt().withMessage('Valid product ID is required'),
        body('supplierId').isInt().withMessage('Valid supplier ID is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { productId, supplierId } = req.body;
            
            const profitCalculation = await profitService.calculateDetailedProfit(productId, supplierId);
            
            res.json({
                success: true,
                data: profitCalculation
            });

        } catch (error) {
            console.error('Profit calculation error:', error);
            
            res.status(500).json({
                success: false,
                error: 'Profit calculation failed',
                message: error.message
            });
        }
    }
);

/**
 * 市場トレンド取得
 * GET /api/research/market-trends
 */
router.get('/market-trends',
    [
        query('category').optional().isString(),
        query('keywords').optional().isString(),
        query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { category, keywords, period = '30d' } = req.query;
            
            const trendData = await marketService.getTrendData({
                category,
                keywords,
                period,
                includeForecasting: true
            });
            
            res.json({
                success: true,
                data: trendData
            });

        } catch (error) {
            console.error('Market trends error:', error);
            
            res.status(500).json({
                success: false,
                error: 'Failed to fetch market trends',
                message: error.message
            });
        }
    }
);

/**
 * バルクリサーチ処理
 * POST /api/research/bulk
 */
router.post('/bulk',
    rateLimit({
        windowMs: 60 * 60 * 1000, // 1時間
        max: 5, // 1時間に5回まで
        keyGenerator: (req) => req.user?.id || req.ip,
        message: { error: 'Too many bulk research requests' }
    }),
    [
        body('products').isArray({ min: 1, max: 50 }).withMessage('Products array required (1-50 items)'),
        body('products.*.title').notEmpty().withMessage('Product title is required'),
        body('options').optional().isObject()
    ],
    async (req, res) => {
        const requestId = uuidv4();
        const startTime = Date.now();
        
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { products, options = {} } = req.body;
            const userId = req.user?.id;

            console.log(`[${requestId}] Starting bulk research for ${products.length} products`);

            // バッチ処理設定
            const batchSize = 10;
            const batches = [];
            
            for (let i = 0; i < products.length; i += batchSize) {
                batches.push(products.slice(i, i + batchSize));
            }

            const allResults = [];
            let processedCount = 0;

            // バッチごとに並列処理
            for (const batch of batches) {
                const batchPromises = batch.map(async (product, index) => {
                    try {
                        const result = await performSingleResearch(product, options);
                        processedCount++;
                        
                        // 進捗通知（WebSocket経由）
                        if (userId) {
                            notificationService.sendProgressUpdate(userId, {
                                requestId,
                                processed: processedCount,
                                total: products.length,
                                currentProduct: product.title
                            });
                        }
                        
                        return { index: i + index, success: true, data: result };
                    } catch (error) {
                        processedCount++;
                        console.error(`Product research failed: ${product.title}`, error);
                        return { index: i + index, success: false, error: error.message };
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                allResults.push(...batchResults);

                // バッチ間の待機（API制限対策）
                if (batches.indexOf(batch) < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // 結果の集計
            const successfulResults = allResults.filter(r => r.success);
            const failedResults = allResults.filter(r => !r.success);

            // 高利益商品の抽出
            const highProfitOpportunities = successfulResults
                .filter(r => r.data.profitAnalysis?.maxProfitMargin > 25)
                .sort((a, b) => b.data.profitAnalysis.maxProfitMargin - a.data.profitAnalysis.maxProfitMargin)
                .slice(0, 10);

            const processingTime = Date.now() - startTime;

            const response = {
                success: true,
                data: {
                    requestId,
                    summary: {
                        totalProducts: products.length,
                        successful: successfulResults.length,
                        failed: failedResults.length,
                        highProfitOpportunities: highProfitOpportunities.length,
                        processingTimeMs: processingTime
                    },
                    results: allResults,
                    highProfitOpportunities: highProfitOpportunities.map(r => ({
                        product: r.data.product,
                        profitAnalysis: r.data.profitAnalysis,
                        suppliers: r.data.suppliers?.slice(0, 3)
                    }))
                }
            };

            // 結果保存
            if (userId) {
                setImmediate(() => {
                    saveBulkResearchResult(userId, response.data).catch(console.error);
                });
            }

            console.log(`[${requestId}] Bulk research completed: ${successfulResults.length}/${products.length} successful`);

            res.json(response);

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`[${requestId}] Bulk research failed after ${processingTime}ms:`, error);
            
            res.status(500).json({
                success: false,
                error: 'Bulk research processing failed',
                message: error.message,
                processingTime,
                requestId
            });
        }
    }
);

/**
 * リサーチ履歴取得
 * GET /api/research/history
 */
router.get('/history',
    [
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 }),
        query('type').optional().isIn(['single', 'bulk'])
    ],
    async (req, res) => {
        try {
            const { limit = 20, offset = 0, type } = req.query;
            const userId = req.user.id;

            const history = await getResearchHistory(userId, { limit, offset, type });

            res.json({
                success: true,
                data: history
            });

        } catch (error) {
            console.error('Research history error:', error);
            
            res.status(500).json({
                success: false,
                error: 'Failed to fetch research history',
                message: error.message
            });
        }
    }
);

/**
 * エクスポート機能
 * POST /api/research/export
 */
router.post('/export',
    [
        body('products').isArray().withMessage('Products array is required'),
        body('format').isIn(['csv', 'xlsx', 'json']).withMessage('Invalid format'),
        body('includeFields').optional().isArray()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { products, format, includeFields } = req.body;
            
            const exportData = await generateExportData(products, format, includeFields);
            
            res.setHeader('Content-Type', getContentType(format));
            res.setHeader('Content-Disposition', `attachment; filename="research_export_${Date.now()}.${format}"`);
            res.send(exportData);

        } catch (error) {
            console.error('Export error:', error);
            
            res.status(500).json({
                success: false,
                error: 'Export failed',
                message: error.message
            });
        }
    }
);

// ヘルパー関数

function generateRecommendations(researchData) {
    const recommendations = [];
    
    // 利益ベースの推奨
    if (researchData.profitAnalysis) {
        const maxMargin = researchData.profitAnalysis.maxProfitMargin;
        
        if (maxMargin > 40) {
            recommendations.push({
                type: 'high_profit',
                priority: 'high',
                message: '非常に高い利益率が期待できます。積極的な投資を検討してください。',
                action: 'invest'
            });
        } else if (maxMargin > 20) {
            recommendations.push({
                type: 'moderate_profit',
                priority: 'medium',
                message: '適度な利益が見込めます。リスクと利益のバランスを検討してください。',
                action: 'consider'
            });
        } else {
            recommendations.push({
                type: 'low_profit',
                priority: 'low',
                message: '利益率が低めです。他の機会を探すことをお勧めします。',
                action: 'skip'
            });
        }
    }
    
    // リスクベースの推奨
    if (researchData.riskAssessment) {
        const riskScore = researchData.riskAssessment.overallRiskScore;
        
        if (riskScore > 0.7) {
            recommendations.push({
                type: 'high_risk',
                priority: 'high',
                message: '高リスクのため、慎重な検討が必要です。',
                action: 'caution'
            });
        }
    }
    
    // 市場ベースの推奨
    if (researchData.market) {
        if (researchData.market.trendDirection === 'up' && researchData.market.trendStrength > 0.7) {
            recommendations.push({
                type: 'market_trend',
                priority: 'medium',
                message: '市場トレンドが上昇中です。タイミングが良好です。',
                action: 'act_fast'
            });
        }
    }
    
    return recommendations;
}

function analyzePriceComparison(productData, ebayResults) {
    const domesticPrice = productData.price || 0;
    const ebayPrices = ebayResults.map(item => item.price).filter(p => p > 0);
    
    if (ebayPrices.length === 0) {
        return {
            ebayAveragePrice: null,
            priceDifference: 0,
            estimatedMargin: 0,
            confidence: 0
        };
    }
    
    const ebayAvgPrice = ebayPrices.reduce((sum, price) => sum + price, 0) / ebayPrices.length;
    const exchangeRate = 150; // USD to JPY
    const ebayPriceInJPY = ebayAvgPrice * exchangeRate;
    
    const priceDifference = ((ebayPriceInJPY - domesticPrice) / domesticPrice) * 100;
    const estimatedFees = ebayAvgPrice * 0.15; // 15% fees
    const netEbayPrice = ebayAvgPrice - estimatedFees;
    const estimatedMargin = ((netEbayPrice * exchangeRate - domesticPrice) / domesticPrice) * 100;
    
    return {
        ebayAveragePrice: ebayAvgPrice,
        priceDifference,
        estimatedMargin,
        confidence: Math.min(ebayPrices.length / 10, 1) // 10件以上で100%信頼度
    };
}

function analyzeCompetition(ebayResults) {
    const activeListings = ebayResults.length;
    const soldItems = ebayResults.filter(item => item.sold > 0);
    const monthlySales = soldItems.reduce((sum, item) => sum + item.sold, 0);
    
    return {
        activeListings,
        monthlySales,
        competitionLevel: activeListings > 100 ? 'high' : activeListings > 50 ? 'medium' : 'low'
    };
}

function calculatePotentialScore(priceComparison, competition, ebayResults) {
    let score = 50; // ベーススコア
    
    // 価格差による調整
    if (priceComparison.estimatedMargin > 50) {
        score += 30;
    } else if (priceComparison.estimatedMargin > 30) {
        score += 20;
    } else if (priceComparison.estimatedMargin > 15) {
        score += 10;
    } else if (priceComparison.estimatedMargin < 0) {
        score -= 30;
    }
    
    // 競合による調整
    if (competition.competitionLevel === 'low') {
        score += 15;
    } else if (competition.competitionLevel === 'high') {
        score -= 15;
    }
    
    // 売れ筋による調整
    if (competition.monthlySales > 100) {
        score += 10;
    } else if (competition.monthlySales < 10) {
        score -= 5;
    }
    
    return Math.max(0, Math.min(100, score));
}

function generateEbayRecommendations(score, priceComparison) {
    const recommendations = [];
    
    if (score > 80) {
        recommendations.push('優秀な転売候補です。価格とタイミングを検討して投資を検討してください。');
    } else if (score > 60) {
        recommendations.push('適度なポテンシャルがあります。競合状況を注意深く監視してください。');
    } else {
        recommendations.push('転売ポテンシャルは限定的です。他の機会を探すことをお勧めします。');
    }
    
    if (priceComparison.estimatedMargin > 30) {
        recommendations.push('価格差が大きく、高い利益率が期待できます。');
    }
    
    return recommendations;
}

function extractSearchKeywords(title) {
    // 商品タイトルから主要なキーワードを抽出
    const stopWords = new Set(['new', 'used', 'for', 'with', 'the', 'and', 'or', 'in', 'on', 'at']);
    const words = title.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
    const keywords = words.filter(word => word.length > 2 && !stopWords.has(word));
    
    return keywords.slice(0, 5).join(' ');
}

async function performSingleResearch(product, options) {
    // 単一商品のリサーチ処理（comprehensiveエンドポイントのロジックを再利用）
    const ebayData = await ebayService.findSimilarProducts(product);
    const suppliers = await supplierService.findSuppliers(product);
    const marketData = await marketService.analyzeMarket(product);
    
    let profitAnalysis = null;
    if (ebayData && suppliers) {
        profitAnalysis = await profitService.calculateProfitOpportunities(ebayData, suppliers);
    }
    
    return {
        product,
        ebay: ebayData,
        suppliers,
        market: marketData,
        profitAnalysis,
        timestamp: new Date().toISOString()
    };
}

async function saveResearchResult(userId, researchData) {
    // データベースに保存する実装
    console.log(`Saving research result for user ${userId}`);
    // 実装: PostgreSQLへの保存処理
}

async function saveBulkResearchResult(userId, bulkData) {
    // バルク結果の保存実装
    console.log(`Saving bulk research result for user ${userId}`);
    // 実装: バルク結果の保存処理
}

async function getResearchHistory(userId, filters) {
    // 履歴取得の実装
    console.log(`Fetching research history for user ${userId}`);
    // 実装: 履歴データの取得
    return {
        total: 0,
        results: []
    };
}

async function generateExportData(products, format, includeFields) {
    // エクスポートデータ生成の実装
    switch (format) {
        case 'csv':
            return generateCSVExport(products, includeFields);
        case 'xlsx':
            return generateExcelExport(products, includeFields);
        case 'json':
            return JSON.stringify(products, null, 2);
        default:
            throw new Error('Unsupported export format');
    }
}

function generateCSVExport(products, includeFields) {
    const defaultFields = ['title', 'platform', 'price', 'profitMargin', 'suppliers', 'riskScore'];
    const fields = includeFields || defaultFields;
    
    let csv = fields.join(',') + '\n';
    
    products.forEach(product => {
        const row = fields.map(field => {
            let value = getNestedValue(product, field) || '';
            
            // CSV用にエスケープ
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            
            return value;
        });
        
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

async function generateExcelExport(products, includeFields) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Research Results');
    
    const defaultFields = [
        { key: 'title', header: '商品名' },
        { key: 'platform', header: 'プラットフォーム' },
        { key: 'price', header: '価格' },
        { key: 'profitMargin', header: '利益率(%)' },
        { key: 'estimatedProfit', header: '推定利益' },
        { key: 'riskScore', header: 'リスクスコア' },
        { key: 'supplierCount', header: 'サプライヤー数' },
        { key: 'recommendation', header: '推奨度' }
    ];
    
    worksheet.columns = defaultFields;
    
    // データ行を追加
    products.forEach(product => {
        worksheet.addRow({
            title: product.title,
            platform: product.platform,
            price: product.price,
            profitMargin: product.profitAnalysis?.maxProfitMargin || 0,
            estimatedProfit: product.profitAnalysis?.maxProfit || 0,
            riskScore: product.riskAssessment?.overallRiskScore || 0,
            supplierCount: product.suppliers?.length || 0,
            recommendation: getRecommendationText(product.recommendations)
        });
    });
    
    // スタイリング
    worksheet.getRow(1).font = { bold: true };
    worksheet.autoFilter = {
        from: 'A1',
        to: `H${products.length + 1}`
    };
    
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function getContentType(format) {
    const types = {
        'csv': 'text/csv',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'json': 'application/json'
    };
    return types[format] || 'text/plain';
}

function getRecommendationText(recommendations) {
    if (!recommendations || recommendations.length === 0) return '';
    
    const priority = recommendations.find(r => r.priority === 'high');
    return priority ? priority.message : recommendations[0].message;
}

module.exports = router;

// services/api-gateway/src/routes/notifications.js
const express = require('express');
const { query, validationResult } = require('express-validator');
const NotificationService = require('../services/notificationService');

const router = express.Router();
const notificationService = new NotificationService();

/**
 * 最近の通知取得
 * GET /api/notifications/recent
 */
router.get('/recent',
    [
        query('limit').optional().isInt({ min: 1, max: 50 }),
        query('unread_only').optional().isBoolean()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { limit = 20, unread_only = false } = req.query;
            const userId = req.user.id;

            const notifications = await notificationService.getRecentNotifications(userId, {
                limit: parseInt(limit),
                unreadOnly: unread_only === 'true'
            });

            res.json({
                success: true,
                data: notifications
            });

        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch notifications'
            });
        }
    }
);

/**
 * 通知を既読にする
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;

        await notificationService.markAsRead(notificationId, userId);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
});

/**
 * 全通知を既読にする
 * PUT /api/notifications/mark-all-read
 */
router.put('/mark-all-read', async (req, res) => {
    try {
        const userId = req.user.id;

        await notificationService.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all notifications as read'
        });
    }
});

/**
 * 通知設定取得
 * GET /api/notifications/settings
 */
router.get('/settings', async (req, res) => {
    try {
        const userId = req.user.id;

        const settings = await notificationService.getNotificationSettings(userId);

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('Get notification settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification settings'
        });
    }
});

/**
 * 通知設定更新
 * PUT /api/notifications/settings
 */
router.put('/settings',
    [
        body('emailEnabled').optional().isBoolean(),
        body('pushEnabled').optional().isBoolean(),
        body('profitAlerts').optional().isBoolean(),
        body('priceDropAlerts').optional().isBoolean(),
        body('riskWarnings').optional().isBoolean(),
        body('minimumProfitMargin').optional().isFloat({ min: 0, max: 100 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const userId = req.user.id;
            const settings = req.body;

            await notificationService.updateNotificationSettings(userId, settings);

            res.json({
                success: true,
                message: 'Notification settings updated'
            });

        } catch (error) {
            console.error('Update notification settings error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update notification settings'
            });
        }
    }
);

module.exports = router;

// services/api-gateway/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const authMiddleware = async (req, res, next) => {
    try {
        let token;

        // トークンの取得
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.headers['x-api-key']) {
            token = req.headers['x-api-key'];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No authentication token provided'
            });
        }

        // トークンの検証
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        
        // ユーザー情報の設定
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            subscriptionPlan: decoded.subscriptionPlan || 'free'
        };

        // API制限チェック
        const remainingQuota = await checkAPIQuota(req.user.id);
        if (remainingQuota <= 0) {
            return res.status(429).json({
                success: false,
                error: 'API quota exceeded',
                quotaReset: decoded.quotaResetTime
            });
        }

        req.user.remainingQuota = remainingQuota;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Authentication token expired'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

async function checkAPIQuota(userId) {
    // Redis からユーザーのAPIクォータをチェック
    const Redis = require('redis');
    const redis = Redis.createClient({ url: process.env.REDIS_URL });
    
    try {
        await redis.connect();
        
        const key = `api_quota:${userId}`;
        const remaining = await redis.get(key);
        
        if (remaining === null) {
            // 初回アクセス時はデフォルトクォータを設定
            const defaultQuota = 1000; // 1日1000リクエスト
            await redis.setEx(key, 24 * 60 * 60, defaultQuota); // 24時間TTL
            return defaultQuota;
        }
        
        return parseInt(remaining);
    } catch (error) {
        console.error('API quota check error:', error);
        return 100; // エラー時はデフォルト値
    } finally {
        await redis.disconnect();
    }
}

async function decrementAPIQuota(userId) {
    const Redis = require('redis');
    const redis = Redis.createClient({ url: process.env.REDIS_URL });
    
    try {
        await redis.connect();
        const key = `api_quota:${userId}`;
        await redis.decr(key);
    } catch (error) {
        console.error('API quota decrement error:', error);
    } finally {
        await redis.disconnect();
    }
}

module.exports = {
    authMiddleware,
    checkAPIQuota,
    decrementAPIQuota
};

// services/api-gateway/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// ルーター
const researchRoutes = require('./routes/research');
const notificationRoutes = require('./routes/notifications');
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');

// ミドルウェア
const { authMiddleware } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// セキュリティとパフォーマンス
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS設定
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// リクエストログ
app.use(requestLogger);

// ヘルスチェック（認証不要）
app.use('/health', healthRoutes);

// 認証関連（認証不要）
app.use('/api/auth', authRoutes);

// 認証が必要なルート
app.use('/api/research', authMiddleware, researchRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

// API情報エンドポイント
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Comprehensive Research Tool API',
        version: '1.0.0',
        description: 'eBay x 国内EC統合リサーチプラットフォーム',
        endpoints: {
            research: '/api/research/*',
            notifications: '/api/notifications/*',
            auth: '/api/auth/*'
        },
        documentation: process.env.API_DOC_URL || 'https://docs.research-tool.com',
        status: 'operational'
    });
});

// 404ハンドラー
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// エラーハンドラー
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
    console.log(`📚 API Documentation: ${process.env.API_DOC_URL || 'N/A'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

// services/api-gateway/src/middleware/errorHandler.js
const errorHandler = (error, req, res, next) => {
    console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // デフォルトエラー
    let statusCode = 500;
    let message = 'Internal server error';
    let details = {};

    // エラータイプ別の処理
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        details = error.details;
    } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Authentication required';
    } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Access forbidden';
    } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Resource not found';
    } else if (error.name === 'RateLimitError') {
        statusCode = 429;
        message = 'Too many requests';
        details = { retryAfter: error.retryAfter };
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        statusCode = 503;
        message = 'Service temporarily unavailable';
    }

    // 本番環境ではスタックトレースを隠す
    const response = {
        success: false,
        error: message,
        ...(Object.keys(details).length > 0 && { details }),
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = error.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;

// package.json (APIゲートウェイ用)
{
  "name": "comprehensive-research-api",
  "version": "1.0.0",
  "description": "総合リサーチツール API Gateway",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "redis": "^4.6.10",
    "pg": "^8.11.3",
    "axios": "^1.6.0",
    "uuid": "^9.0.1",
    "exceljs": "^4.4.0",
    "csv-writer": "^1.6.0",
    "lodash": "^4.17.21",
    "moment": "^2.29.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.53.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}