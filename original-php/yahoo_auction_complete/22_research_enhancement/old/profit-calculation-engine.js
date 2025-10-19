// src/models/ProfitCalculation.js - 利益計算モデル
const { pool, DatabaseHelper } = require('../config/database');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');

class ProfitCalculation {
  constructor(data = {}) {
    this.id = data.id || null;
    this.uuid = data.uuid || null;
    this.productId = data.product_id || data.productId || null;
    this.supplierId = data.supplier_id || data.supplierId || null;
    
    // eBay売上関連
    this.ebaySellingPrice = data.ebay_selling_price || data.ebaySellingPrice || null;
    this.ebayFinalValueFee = data.ebay_final_value_fee || data.ebayFinalValueFee || null;
    this.ebayInsertionFee = data.ebay_insertion_fee || data.ebayInsertionFee || 0.35;
    this.ebayInternationalFee = data.ebay_international_fee || data.ebayInternationalFee || 0;
    this.ebayStoreFee = data.ebay_store_fee || data.ebayStoreFee || 0;
    
    // 決済手数料
    this.paypalFee = data.paypal_fee || data.paypalFee || null;
    this.currencyConversionFee = data.currency_conversion_fee || data.currencyConversionFee || null;
    this.bankTransferFee = data.bank_transfer_fee || data.bankTransferFee || 0;
    
    // 仕入関連
    this.domesticPurchasePrice = data.domestic_purchase_price || data.domesticPurchasePrice || null;
    this.domesticShippingCost = data.domestic_shipping_cost || data.domesticShippingCost || 0;
    this.domesticTax = data.domestic_tax || data.domesticTax || null;
    
    // 国際配送関連
    this.internationalShippingCost = data.international_shipping_cost || data.internationalShippingCost || null;
    this.packagingCost = data.packaging_cost || data.packagingCost || 0;
    this.insuranceCost = data.insurance_cost || data.insuranceCost || 0;
    this.customsDeclarationFee = data.customs_declaration_fee || data.customsDeclarationFee || 0;
    
    // 税金・関税
    this.importDuty = data.import_duty || data.importDuty || 0;
    this.consumptionTax = data.consumption_tax || data.consumptionTax || null;
    this.otherTaxes = data.other_taxes || data.otherTaxes || 0;
    
    // 計算結果
    this.totalCosts = data.total_costs || data.totalCosts || null;
    this.grossProfit = data.gross_profit || data.grossProfit || null;
    this.netProfit = data.net_profit || data.netProfit || null;
    this.profitMargin = data.profit_margin || data.profitMargin || null;
    this.roiPercentage = data.roi_percentage || data.roiPercentage || null;
    this.breakEvenQuantity = data.break_even_quantity || data.breakEvenQuantity || null;
    
    // リスク調整
    this.riskScore = data.risk_score || data.riskScore || null;
    this.riskAdjustedProfit = data.risk_adjusted_profit || data.riskAdjustedProfit || null;
    this.confidenceLevel = data.confidence_level || data.confidenceLevel || null;
    
    // 計算設定
    this.calculationParameters = data.calculation_parameters || data.calculationParameters || {};
    this.calculationVersion = data.calculation_version || data.calculationVersion || '1.0';
    
    // メタデータ
    this.createdAt = data.created_at || data.createdAt || null;
    this.updatedAt = data.updated_at || data.updatedAt || null;
  }
  
  // 新規保存
  async save() {
    const query = `
      INSERT INTO profit_calculations (
        product_id, supplier_id, ebay_selling_price, ebay_final_value_fee,
        ebay_insertion_fee, ebay_international_fee, ebay_store_fee,
        paypal_fee, currency_conversion_fee, bank_transfer_fee,
        domestic_purchase_price, domestic_shipping_cost, domestic_tax,
        international_shipping_cost, packaging_cost, insurance_cost,
        customs_declaration_fee, import_duty, consumption_tax, other_taxes,
        total_costs, gross_profit, net_profit, profit_margin, roi_percentage,
        break_even_quantity, risk_score, risk_adjusted_profit, confidence_level,
        calculation_parameters, calculation_version
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      ) RETURNING *
    `;
    
    const values = [
      this.productId, this.supplierId, this.ebaySellingPrice, this.ebayFinalValueFee,
      this.ebayInsertionFee, this.ebayInternationalFee, this.ebayStoreFee,
      this.paypalFee, this.currencyConversionFee, this.bankTransferFee,
      this.domesticPurchasePrice, this.domesticShippingCost, this.domesticTax,
      this.internationalShippingCost, this.packagingCost, this.insuranceCost,
      this.customsDeclarationFee, this.importDuty, this.consumptionTax, this.otherTaxes,
      this.totalCosts, this.grossProfit, this.netProfit, this.profitMargin,
      this.roiPercentage, this.breakEvenQuantity, this.riskScore,
      this.riskAdjustedProfit, this.confidenceLevel,
      JSON.stringify(this.calculationParameters), this.calculationVersion
    ];
    
    try {
      const result = await pool.query(query, values);
      Object.assign(this, result.rows[0]);
      
      logger.info('Profit calculation saved', {
        calculationId: this.id,
        productId: this.productId,
        supplierId: this.supplierId,
        netProfit: this.netProfit
      });
      
      return this;
    } catch (error) {
      logger.error('Profit calculation save failed', {
        productId: this.productId,
        supplierId: this.supplierId,
        error: error.message
      });
      throw error;
    }
  }
  
  // 商品・仕入先別検索
  static async findByProductAndSupplier(productId, supplierId) {
    const query = `
      SELECT * FROM profit_calculations 
      WHERE product_id = $1 AND supplier_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    try {
      const result = await pool.query(query, [productId, supplierId]);
      return result.rows.length > 0 ? new ProfitCalculation(result.rows[0]) : null;
    } catch (error) {
      logger.error('Find profit calculation failed', {
        productId,
        supplierId,
        error: error.message
      });
      throw error;
    }
  }
  
  // JSON変換
  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      productId: this.productId,
      supplierId: this.supplierId,
      
      ebayRevenue: {
        sellingPrice: this.ebaySellingPrice,
        fees: {
          finalValueFee: this.ebayFinalValueFee,
          insertionFee: this.ebayInsertionFee,
          internationalFee: this.ebayInternationalFee,
          storeFee: this.ebayStoreFee
        }
      },
      
      paymentFees: {
        paypalFee: this.paypalFee,
        currencyConversionFee: this.currencyConversionFee,
        bankTransferFee: this.bankTransferFee
      },
      
      procurement: {
        purchasePrice: this.domesticPurchasePrice,
        shippingCost: this.domesticShippingCost,
        tax: this.domesticTax
      },
      
      fulfillment: {
        internationalShipping: this.internationalShippingCost,
        packaging: this.packagingCost,
        insurance: this.insuranceCost,
        customsDeclaration: this.customsDeclarationFee
      },
      
      taxes: {
        importDuty: this.importDuty,
        consumptionTax: this.consumptionTax,
        other: this.otherTaxes
      },
      
      results: {
        totalCosts: this.totalCosts,
        grossProfit: this.grossProfit,
        netProfit: this.netProfit,
        profitMargin: this.profitMargin,
        roiPercentage: this.roiPercentage,
        breakEvenQuantity: this.breakEvenQuantity
      },
      
      riskAnalysis: {
        riskScore: this.riskScore,
        riskAdjustedProfit: this.riskAdjustedProfit,
        confidenceLevel: this.confidenceLevel
      },
      
      metadata: {
        calculationParameters: this.calculationParameters,
        calculationVersion: this.calculationVersion,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      }
    };
  }
}

module.exports = ProfitCalculation;

// src/services/profitCalculationService.js - 利益計算サービス
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const ProfitCalculation = require('../models/ProfitCalculation');

class ProfitCalculationService {
  constructor() {
    // デフォルト設定値
    this.defaultSettings = {
      exchangeRateUsdJpy: 142.50,
      ebayFinalValueFeeRate: 0.125, // 12.5%
      paypalFeeRate: 0.039, // 3.9%
      paypalFixedFeeUsd: 0.30,
      currencyConversionFeeRate: 0.03, // 3%
      japanConsumptionTaxRate: 0.10, // 10%
      packagingCostBase: 300, // 基本梱包費
      insuranceRate: 0.01, // 保険料率 1%
      riskFactors: {
        newSellerPenalty: 0.15,
        lowStockPenalty: 0.10,
        highCompetitionPenalty: 0.20,
        counterfeitRisk: 0.25
      }
    };
  }
  
  // 包括的利益計算
  async calculateProfit(productData, supplierData, options = {}) {
    try {
      const settings = { ...this.defaultSettings, ...options.settings };
      
      logger.info('Starting profit calculation', {
        productId: productData.id,
        supplierId: supplierData.id,
        ebayPrice: productData.ebaySellingPrice,
        supplierPrice: supplierData.price
      });
      
      // 1. 収入計算
      const revenue = this.calculateRevenue(productData, settings);
      
      // 2. eBay手数料計算
      const ebayFees = this.calculateEbayFees(productData, settings);
      
      // 3. 決済手数料計算
      const paymentFees = this.calculatePaymentFees(revenue.revenueUsd, settings);
      
      // 4. 仕入れ費用計算
      const procurementCosts = this.calculateProcurementCosts(supplierData, settings);
      
      // 5. 配送・梱包費用計算
      const fulfillmentCosts = this.calculateFulfillmentCosts(productData, supplierData, settings);
      
      // 6. 税金計算
      const taxes = this.calculateTaxes(procurementCosts, fulfillmentCosts, settings);
      
      // 7. 総費用計算
      const totalCosts = this.calculateTotalCosts(ebayFees, paymentFees, procurementCosts, fulfillmentCosts, taxes);
      
      // 8. 利益計算
      const profitResults = this.calculateProfitMetrics(revenue, totalCosts, procurementCosts);
      
      // 9. リスク評価
      const riskAssessment = this.calculateRiskAssessment(productData, supplierData, settings);
      
      // 10. 最終結果組み立て
      const calculation = new ProfitCalculation({
        productId: productData.id,
        supplierId: supplierData.id,
        
        // eBay関連
        ebaySellingPrice: revenue.revenueUsd,
        ebayFinalValueFee: ebayFees.finalValueFee,
        ebayInsertionFee: ebayFees.insertionFee,
        ebayInternationalFee: ebayFees.internationalFee,
        
        // 決済関連
        paypalFee: paymentFees.paypalFee,
        currencyConversionFee: paymentFees.currencyConversionFee,
        
        // 仕入関連
        domesticPurchasePrice: procurementCosts.purchasePrice,
        domesticShippingCost: procurementCosts.shippingCost,
        domesticTax: taxes.consumptionTax,
        
        // 配送関連
        internationalShippingCost: fulfillmentCosts.shippingCost,
        packagingCost: fulfillmentCosts.packagingCost,
        insuranceCost: fulfillmentCosts.insuranceCost,
        
        // 計算結果
        totalCosts: totalCosts.total,
        grossProfit: profitResults.grossProfit,
        netProfit: profitResults.netProfit,
        profitMargin: profitResults.profitMargin,
        roiPercentage: profitResults.roiPercentage,
        breakEvenQuantity: profitResults.breakEvenQuantity,
        
        // リスク調整
        riskScore: riskAssessment.riskScore,
        riskAdjustedProfit: riskAssessment.riskAdjustedProfit,
        confidenceLevel: riskAssessment.confidenceLevel,
        
        calculationParameters: {
          exchangeRate: settings.exchangeRateUsdJpy,
          calculationDate: new Date().toISOString(),
          version: '1.0',
          settings: settings
        }
      });
      
      // データベースに保存
      await calculation.save();
      
      logger.info('Profit calculation completed', {
        calculationId: calculation.id,
        netProfit: calculation.netProfit,
        profitMargin: calculation.profitMargin,
        roiPercentage: calculation.roiPercentage
      });
      
      return calculation;
      
    } catch (error) {
      logger.error('Profit calculation failed', {
        productId: productData?.id,
        supplierId: supplierData?.id,
        error: error.message
      });
      throw error;
    }
  }
  
  // 収入計算
  calculateRevenue(productData, settings) {
    const ebayPriceUsd = productData.ebaySellingPrice || 0;
    const revenueJpy = ebayPriceUsd * settings.exchangeRateUsdJpy;
    
    return {
      revenueUsd: ebayPriceUsd,
      revenueJpy: revenueJpy
    };
  }
  
  // eBay手数料計算
  calculateEbayFees(productData, settings) {
    const sellingPrice = productData.ebaySellingPrice || 0;
    
    // カテゴリ別手数料率（簡易版）
    const categoryFeeRates = {
      'Consumer Electronics': 0.125,
      'Cell Phones & Accessories': 0.125,
      'Video Games & Consoles': 0.105,
      'Clothing, Shoes & Accessories': 0.125,
      'Home & Garden': 0.125,
      'default': 0.125
    };
    
    const categoryName = productData.ebayCategoryName || 'default';
    const feeRate = categoryFeeRates[categoryName] || categoryFeeRates.default;
    
    const finalValueFee = sellingPrice * feeRate;
    const insertionFee = 0.35; // 固定
    const internationalFee = sellingPrice * 0.015; // 1.5%
    
    return {
      finalValueFee: Math.round(finalValueFee * 100) / 100,
      insertionFee: insertionFee,
      internationalFee: Math.round(internationalFee * 100) / 100,
      total: Math.round((finalValueFee + insertionFee + internationalFee) * 100) / 100
    };
  }
  
  // 決済手数料計算
  calculatePaymentFees(revenueUsd, settings) {
    const paypalFee = (revenueUsd * settings.paypalFeeRate) + settings.paypalFixedFeeUsd;
    const currencyConversionFee = revenueUsd * settings.currencyConversionFeeRate;
    
    return {
      paypalFee: Math.round(paypalFee * 100) / 100,
      currencyConversionFee: Math.round(currencyConversionFee * 100) / 100,
      total: Math.round((paypalFee + currencyConversionFee) * 100) / 100
    };
  }
  
  // 仕入れ費用計算
  calculateProcurementCosts(supplierData, settings) {
    const purchasePrice = supplierData.price || 0;
    const shippingCost = supplierData.shippingCost || 0;
    
    return {
      purchasePrice: purchasePrice,
      shippingCost: shippingCost,
      total: purchasePrice + shippingCost
    };
  }
  
  // 配送・梱包費用計算
  calculateFulfillmentCosts(productData, supplierData, settings) {
    const productPrice = productData.ebaySellingPrice || 0;
    
    // 配送費（価格帯別）
    let shippingCost;
    if (productPrice <= 50) {
      shippingCost = 2500; // EMS小型
    } else if (productPrice <= 200) {
      shippingCost = 3500; // EMS中型
    } else {
      shippingCost = 4500; // EMS大型
    }
    
    // 梱包費（商品価値別）
    let packagingCost;
    if (productPrice <= 100) {
      packagingCost = 300;
    } else if (productPrice <= 500) {
      packagingCost = 500;
    } else {
      packagingCost = 800;
    }
    
    // 保険料（商品価値の1%）
    const insuranceCost = Math.max(500, productPrice * settings.exchangeRateUsdJpy * settings.insuranceRate);
    
    return {
      shippingCost: shippingCost,
      packagingCost: packagingCost,
      insuranceCost: Math.round(insuranceCost),
      total: shippingCost + packagingCost + Math.round(insuranceCost)
    };
  }
  
  // 税金計算
  calculateTaxes(procurementCosts, fulfillmentCosts, settings) {
    // 消費税（仕入れ価格に対して）
    const consumptionTax = procurementCosts.purchasePrice * settings.japanConsumptionTaxRate;
    
    // 関税（商品によって異なるが、簡易計算）
    const importDuty = 0; // 多くの商品で無税
    
    return {
      consumptionTax: Math.round(consumptionTax),
      importDuty: importDuty,
      total: Math.round(consumptionTax) + importDuty
    };
  }
  
  // 総費用計算
  calculateTotalCosts(ebayFees, paymentFees, procurementCosts, fulfillmentCosts, taxes) {
    const ebayFeesJpy = (ebayFees.total || 0) * this.defaultSettings.exchangeRateUsdJpy;
    const paymentFeesJpy = (paymentFees.total || 0) * this.defaultSettings.exchangeRateUsdJpy;
    
    const total = ebayFeesJpy + paymentFeesJpy + procurementCosts.total + fulfillmentCosts.total + taxes.total;
    
    return {
      ebayFeesJpy: Math.round(ebayFeesJpy),
      paymentFeesJpy: Math.round(paymentFeesJpy),
      procurementCosts: procurementCosts.total,
      fulfillmentCosts: fulfillmentCosts.total,
      taxes: taxes.total,
      total: Math.round(total)
    };
  }
  
  // 利益メトリクス計算
  calculateProfitMetrics(revenue, totalCosts, procurementCosts) {
    const revenueJpy = revenue.revenueJpy;
    const grossProfit = revenueJpy - totalCosts.total;
    const netProfit = grossProfit; // 簡易版では同じ
    
    // 利益率計算
    const profitMargin = revenueJpy > 0 ? (grossProfit / revenueJpy) * 100 : 0;
    
    // ROI計算（投資額に対する利益率）
    const investment = procurementCosts.total;
    const roiPercentage = investment > 0 ? (grossProfit / investment) * 100 : 0;
    
    // 損益分岐点
    const breakEvenQuantity = grossProfit > 0 ? 1 : (grossProfit < 0 ? -1 : 0);
    
    return {
      grossProfit: Math.round(grossProfit),
      netProfit: Math.round(netProfit),
      profitMargin: Math.round(profitMargin * 100) / 100,
      roiPercentage: Math.round(roiPercentage * 100) / 100,
      breakEvenQuantity: breakEvenQuantity
    };
  }
  
  // リスク評価
  calculateRiskAssessment(productData, supplierData, settings) {
    let riskScore = 0;
    const riskFactors = [];
    
    // セラー信頼性リスク
    if (supplierData.sellerRating && supplierData.sellerRating < 4.5) {
      riskScore += settings.riskFactors.newSellerPenalty;
      riskFactors.push('Low seller rating');
    }
    
    // 在庫リスク
    if (supplierData.stockQuantity && supplierData.stockQuantity < 5) {
      riskScore += settings.riskFactors.lowStockPenalty;
      riskFactors.push('Low stock quantity');
    }
    
    // 競争リスク（eBay売上数が多い場合）
    if (productData.ebaySoldQuantity && productData.ebaySoldQuantity > 100) {
      riskScore += settings.riskFactors.highCompetitionPenalty;
      riskFactors.push('High competition');
    }
    
    // 偽物リスク（特定プラットフォーム）
    if (supplierData.supplierType === 'mercari' && productData.brand) {
      riskScore += settings.riskFactors.counterfeitRisk;
      riskFactors.push('Counterfeit risk');
    }
    
    // マッチング信頼度
    const matchingConfidence = supplierData.matchingConfidence || 0.5;
    const confidenceLevel = Math.max(0.1, matchingConfidence - riskScore);
    
    // リスク調整後利益
    const baseProfit = productData.grossProfit || 0;
    const riskAdjustedProfit = baseProfit * (1 - riskScore);
    
    return {
      riskScore: Math.round(riskScore * 100) / 100,
      riskFactors: riskFactors,
      riskAdjustedProfit: Math.round(riskAdjustedProfit),
      confidenceLevel: Math.round(confidenceLevel * 100) / 100
    };
  }
  
  // バッチ計算（複数商品・仕入先の組み合わせ）
  async calculateBatchProfits(productSupplierPairs, options = {}) {
    const results = [];
    const errors = [];
    
    for (const pair of productSupplierPairs) {
      try {
        const calculation = await this.calculateProfit(pair.product, pair.supplier, options);
        results.push(calculation);
      } catch (error) {
        errors.push({
          productId: pair.product?.id,
          supplierId: pair.supplier?.id,
          error: error.message
        });
      }
    }
    
    // 結果をROI順でソート
    results.sort((a, b) => (b.roiPercentage || 0) - (a.roiPercentage || 0));
    
    logger.info('Batch profit calculation completed', {
      totalPairs: productSupplierPairs.length,
      successfulCalculations: results.length,
      errors: errors.length
    });
    
    return {
      calculations: results,
      errors: errors,
      summary: {
        totalCalculations: results.length,
        avgROI: results.length > 0 ? results.reduce((sum, calc) => sum + (calc.roiPercentage || 0), 0) / results.length : 0,
        profitableOpportunities: results.filter(calc => (calc.netProfit || 0) > 0).length
      }
    };
  }
  
  // 設定更新
  updateSettings(newSettings) {
    Object.assign(this.defaultSettings, newSettings);
    logger.info('Profit calculation settings updated', { newSettings });
  }
}

module.exports = new ProfitCalculationService();