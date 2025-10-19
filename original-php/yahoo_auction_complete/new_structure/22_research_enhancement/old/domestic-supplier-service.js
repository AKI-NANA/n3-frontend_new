// src/models/DomesticSupplier.js - 国内仕入先モデル
const { pool, DatabaseHelper } = require('../config/database');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');

class DomesticSupplier {
  constructor(data = {}) {
    this.id = data.id || null;
    this.uuid = data.uuid || null;
    this.productId = data.product_id || data.productId || null;
    
    // 仕入先情報
    this.supplierType = data.supplier_type || data.supplierType || null;
    this.supplierName = data.supplier_name || data.supplierName || null;
    this.supplierUrl = data.supplier_url || data.supplierUrl || null;
    this.productTitle = data.product_title || data.productTitle || null;
    
    // 価格情報
    this.price = data.price || null;
    this.originalPrice = data.original_price || data.originalPrice || null;
    this.discountRate = data.discount_rate || data.discountRate || null;
    this.currency = data.currency || 'JPY';
    
    // 可用性情報
    this.availabilityStatus = data.availability_status || data.availabilityStatus || 'unknown';
    this.stockQuantity = data.stock_quantity || data.stockQuantity || null;
    this.shippingCost = data.shipping_cost || data.shippingCost || null;
    this.freeShipping = data.free_shipping || data.freeShipping || false;
    this.deliveryDaysMin = data.delivery_days_min || data.deliveryDaysMin || null;
    this.deliveryDaysMax = data.delivery_days_max || data.deliveryDaysMax || null;
    
    // 販売者情報
    this.sellerName = data.seller_name || data.sellerName || null;
    this.sellerRating = data.seller_rating || data.sellerRating || null;
    this.sellerReviewCount = data.seller_review_count || data.sellerReviewCount || null;
    this.sellerCountry = data.seller_country || data.sellerCountry || 'JP';
    this.reliabilityScore = data.reliability_score || data.reliabilityScore || null;
    
    // 商品詳細
    this.conditionType = data.condition_type || data.conditionType || 'new';
    this.brand = data.brand || null;
    this.model = data.model || null;
    this.janCode = data.jan_code || data.janCode || null;
    this.imageUrls = data.image_urls || data.imageUrls || [];
    this.description = data.description || null;
    this.specifications = data.specifications || {};
    
    // メタデータ
    this.lastPriceCheck = data.last_price_check || data.lastPriceCheck || null;
    this.priceHistory = data.price_history || data.priceHistory || [];
    this.matchingConfidence = data.matching_confidence || data.matchingConfidence || null;
    this.createdAt = data.created_at || data.createdAt || null;
    this.updatedAt = data.updated_at || data.updatedAt || null;
  }
  
  // バリデーション
  validate() {
    const errors = [];
    
    if (!this.productId) {
      errors.push('Product ID is required');
    }
    
    if (!this.supplierType || !['amazon', 'rakuten', 'mercari', 'yahoo_auctions', 'yahoo_shopping', 'qoo10', 'au_pay_market'].includes(this.supplierType)) {
      errors.push('Valid supplier type is required');
    }
    
    if (!this.supplierUrl || !Helpers.isValidURL(this.supplierUrl)) {
      errors.push('Valid supplier URL is required');
    }
    
    if (!this.productTitle || this.productTitle.trim().length === 0) {
      errors.push('Product title is required');
    }
    
    if (!this.price || isNaN(this.price) || this.price < 0) {
      errors.push('Valid price is required');
    }
    
    if (this.matchingConfidence && (this.matchingConfidence < 0 || this.matchingConfidence > 1)) {
      errors.push('Matching confidence must be between 0 and 1');
    }
    
    return errors;
  }
  
  // 新規作成
  async create() {
    const errors = this.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    const query = `
      INSERT INTO domestic_suppliers (
        product_id, supplier_type, supplier_name, supplier_url, product_title,
        price, original_price, discount_rate, currency, availability_status,
        stock_quantity, shipping_cost, free_shipping, delivery_days_min, delivery_days_max,
        seller_name, seller_rating, seller_review_count, seller_country, reliability_score,
        condition_type, brand, model, jan_code, image_urls, description, specifications,
        last_price_check, price_history, matching_confidence
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      ) RETURNING *
    `;
    
    const values = [
      this.productId, this.supplierType, this.supplierName, this.supplierUrl, this.productTitle,
      this.price, this.originalPrice, this.discountRate, this.currency, this.availabilityStatus,
      this.stockQuantity, this.shippingCost, this.freeShipping, this.deliveryDaysMin, this.deliveryDaysMax,
      this.sellerName, this.sellerRating, this.sellerReviewCount, this.sellerCountry, this.reliabilityScore,
      this.conditionType, this.brand, this.model, this.janCode, this.imageUrls, this.description,
      JSON.stringify(this.specifications), this.lastPriceCheck, JSON.stringify(this.priceHistory),
      this.matchingConfidence
    ];
    
    try {
      const result = await pool.query(query, values);
      Object.assign(this, result.rows[0]);
      
      logger.info('Domestic supplier created successfully', {
        supplierId: this.id,
        productId: this.productId,
        supplierType: this.supplierType
      });
      
      return this;
    } catch (error) {
      logger.error('Domestic supplier creation failed', {
        productId: this.productId,
        supplierType: this.supplierType,
        error: error.message
      });
      throw error;
    }
  }
  
  // 価格履歴更新
  async updatePriceHistory(newPrice) {
    const now = new Date().toISOString();
    const priceEntry = {
      price: newPrice,
      timestamp: now,
      currency: this.currency
    };
    
    // 価格履歴配列に追加（最大50件保持）
    this.priceHistory = [...(this.priceHistory || []), priceEntry].slice(-50);
    this.price = newPrice;
    this.lastPriceCheck = now;
    
    // 割引率計算
    if (this.originalPrice && this.originalPrice > 0) {
      this.discountRate = ((this.originalPrice - newPrice) / this.originalPrice) * 100;
    }
    
    await this.update();
  }
  
  // 更新処理
  async update() {
    const query = `
      UPDATE domestic_suppliers SET
        supplier_name = $2, supplier_url = $3, product_title = $4, price = $5,
        original_price = $6, discount_rate = $7, currency = $8, availability_status = $9,
        stock_quantity = $10, shipping_cost = $11, free_shipping = $12,
        delivery_days_min = $13, delivery_days_max = $14, seller_name = $15,
        seller_rating = $16, seller_review_count = $17, seller_country = $18,
        reliability_score = $19, condition_type = $20, brand = $21, model = $22,
        jan_code = $23, image_urls = $24, description = $25, specifications = $26,
        last_price_check = $27, price_history = $28, matching_confidence = $29
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      this.id, this.supplierName, this.supplierUrl, this.productTitle, this.price,
      this.originalPrice, this.discountRate, this.currency, this.availabilityStatus,
      this.stockQuantity, this.shippingCost, this.freeShipping, this.deliveryDaysMin,
      this.deliveryDaysMax, this.sellerName, this.sellerRating, this.sellerReviewCount,
      this.sellerCountry, this.reliabilityScore, this.conditionType, this.brand,
      this.model, this.janCode, this.imageUrls, this.description,
      JSON.stringify(this.specifications), this.lastPriceCheck,
      JSON.stringify(this.priceHistory), this.matchingConfidence
    ];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Supplier not found for update');
      }
      
      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      logger.error('Domestic supplier update failed', {
        supplierId: this.id,
        error: error.message
      });
      throw error;
    }
  }
  
  // 商品ID別検索
  static async findByProductId(productId) {
    const query = `
      SELECT * FROM domestic_suppliers 
      WHERE product_id = $1 
      ORDER BY matching_confidence DESC, price ASC
    `;
    
    try {
      const result = await pool.query(query, [productId]);
      return result.rows.map(row => new DomesticSupplier(row));
    } catch (error) {
      logger.error('Find suppliers by product failed', {
        productId,
        error: error.message
      });
      throw error;
    }
  }
  
  // 供給者タイプ別検索
  static async findBySupplierType(supplierType, filters = {}) {
    let whereConditions = ['supplier_type = $1'];
    let values = [supplierType];
    let paramCount = 2;
    
    if (filters.minPrice) {
      whereConditions.push(`price >= ${paramCount}`);
      values.push(filters.minPrice);
      paramCount++;
    }
    
    if (filters.maxPrice) {
      whereConditions.push(`price <= ${paramCount}`);
      values.push(filters.maxPrice);
      paramCount++;
    }
    
    if (filters.availabilityStatus) {
      whereConditions.push(`availability_status = ${paramCount}`);
      values.push(filters.availabilityStatus);
      paramCount++;
    }
    
    if (filters.freeShipping) {
      whereConditions.push(`free_shipping = ${paramCount}`);
      values.push(filters.freeShipping);
      paramCount++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    const query = `
      SELECT * FROM domestic_suppliers 
      ${whereClause}
      ORDER BY matching_confidence DESC, price ASC
      LIMIT ${filters.limit || 100}
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => new DomesticSupplier(row));
    } catch (error) {
      logger.error('Find suppliers by type failed', {
        supplierType,
        error: error.message
      });
      throw error;
    }
  }
  
  // 最安値検索
  static async findCheapestByProduct(productId, supplierTypes = []) {
    let query = `
      SELECT * FROM domestic_suppliers 
      WHERE product_id = $1 AND availability_status IN ('in_stock', 'limited')
    `;
    
    let values = [productId];
    
    if (supplierTypes.length > 0) {
      const placeholders = supplierTypes.map((_, index) => `${index + 2}`).join(', ');
      query += ` AND supplier_type IN (${placeholders})`;
      values.push(...supplierTypes);
    }
    
    query += ' ORDER BY price ASC LIMIT 10';
    
    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => new DomesticSupplier(row));
    } catch (error) {
      logger.error('Find cheapest suppliers failed', {
        productId,
        error: error.message
      });
      throw error;
    }
  }
  
  // 信頼性スコア別検索
  static async findByReliability(minScore = 8.0, limit = 50) {
    const query = `
      SELECT * FROM domestic_suppliers 
      WHERE reliability_score >= $1 AND availability_status = 'in_stock'
      ORDER BY reliability_score DESC, price ASC
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [minScore, limit]);
      return result.rows.map(row => new DomesticSupplier(row));
    } catch (error) {
      logger.error('Find suppliers by reliability failed', {
        minScore,
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
      
      supplier: {
        type: this.supplierType,
        name: this.supplierName,
        url: this.supplierUrl
      },
      
      product: {
        title: this.productTitle,
        brand: this.brand,
        model: this.model,
        janCode: this.janCode,
        condition: this.conditionType,
        imageUrls: this.imageUrls,
        description: this.description,
        specifications: this.specifications
      },
      
      pricing: {
        currentPrice: this.price,
        originalPrice: this.originalPrice,
        discountRate: this.discountRate,
        currency: this.currency,
        priceHistory: this.priceHistory
      },
      
      availability: {
        status: this.availabilityStatus,
        stockQuantity: this.stockQuantity,
        lastChecked: this.lastPriceCheck
      },
      
      shipping: {
        cost: this.shippingCost,
        free: this.freeShipping,
        deliveryDays: {
          min: this.deliveryDaysMin,
          max: this.deliveryDaysMax
        }
      },
      
      seller: {
        name: this.sellerName,
        rating: this.sellerRating,
        reviewCount: this.sellerReviewCount,
        country: this.sellerCountry
      },
      
      analysis: {
        reliabilityScore: this.reliabilityScore,
        matchingConfidence: this.matchingConfidence
      },
      
      timestamps: {
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        lastPriceCheck: this.lastPriceCheck
      }
    };
  }
}

module.exports = DomesticSupplier;

// src/services/supplierSearchService.js - 国内仕入先検索サービス
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const { RedisHelper } = require('../config/database');
const DomesticSupplier = require('../models/DomesticSupplier');

class SupplierSearchService {
  constructor() {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // 検索設定
    this.searchSettings = {
      maxResults: 50,
      cacheTimeout: 3600, // 1時間
      requestDelay: 1000, // 1秒間隔
      retryAttempts: 3
    };
  }
  
  // 統合検索（全プラットフォーム）
  async searchAllPlatforms(productTitle, productData, options = {}) {
    const searchTasks = [
      this.searchAmazon(productTitle, productData, options),
      this.searchRakuten(productTitle, productData, options),
      this.searchMercari(productTitle, productData, options),
      this.searchYahooShopping(productTitle, productData, options)
    ];
    
    try {
      const results = await Promise.allSettled(searchTasks);
      
      const suppliers = [];
      const errors = [];
      
      results.forEach((result, index) => {
        const platformNames = ['Amazon', 'Rakuten', 'Mercari', 'Yahoo Shopping'];
        
        if (result.status === 'fulfilled') {
          suppliers.push(...result.value);
        } else {
          errors.push({
            platform: platformNames[index],
            error: result.reason.message
          });
        }
      });
      
      // マッチング信頼度でソート
      suppliers.sort((a, b) => (b.matchingConfidence || 0) - (a.matchingConfidence || 0));
      
      logger.info('Multi-platform supplier search completed', {
        totalSuppliers: suppliers.length,
        errors: errors.length,
        platforms: results.length
      });
      
      return {
        suppliers,
        errors,
        searchMetadata: {
          searchedPlatforms: results.length,
          successfulPlatforms: results.filter(r => r.status === 'fulfilled').length,
          totalResults: suppliers.length
        }
      };
      
    } catch (error) {
      logger.error('Multi-platform search failed', {
        productTitle,
        error: error.message
      });
      throw error;
    }
  }
  
  // Amazon検索
  async searchAmazon(productTitle, productData, options = {}) {
    const cacheKey = Helpers.generateCacheKey('amazon_search', productTitle);
    
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      return cached;
    }
    
    try {
      // Amazon Product APIまたはスクレイピング実装
      // 現在はモックデータを返す
      const mockResults = this.generateMockAmazonResults(productTitle, productData);
      
      await RedisHelper.setCache(cacheKey, mockResults, this.searchSettings.cacheTimeout);
      
      logger.info('Amazon search completed', {
        productTitle,
        resultsCount: mockResults.length
      });
      
      return mockResults;
      
    } catch (error) {
      logger.error('Amazon search failed', {
        productTitle,
        error: error.message
      });
      throw error;
    }
  }
  
  // 楽天市場検索
  async searchRakuten(productTitle, productData, options = {}) {
    const cacheKey = Helpers.generateCacheKey('rakuten_search', productTitle);
    
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      return cached;
    }
    
    try {
      // 楽天APIまたはスクレイピング実装
      const mockResults = this.generateMockRakutenResults(productTitle, productData);
      
      await RedisHelper.setCache(cacheKey, mockResults, this.searchSettings.cacheTimeout);
      
      logger.info('Rakuten search completed', {
        productTitle,
        resultsCount: mockResults.length
      });
      
      return mockResults;
      
    } catch (error) {
      logger.error('Rakuten search failed', {
        productTitle,
        error: error.message
      });
      throw error;
    }
  }
  
  // メルカリ検索
  async searchMercari(productTitle, productData, options = {}) {
    const cacheKey = Helpers.generateCacheKey('mercari_search', productTitle);
    
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      return cached;
    }
    
    try {
      // メルカリスクレイピング実装
      const mockResults = this.generateMockMercariResults(productTitle, productData);
      
      await RedisHelper.setCache(cacheKey, mockResults, this.searchSettings.cacheTimeout);
      
      logger.info('Mercari search completed', {
        productTitle,
        resultsCount: mockResults.length
      });
      
      return mockResults;
      
    } catch (error) {
      logger.error('Mercari search failed', {
        productTitle,
        error: error.message
      });
      throw error;
    }
  }
  
  // Yahoo!ショッピング検索
  async searchYahooShopping(productTitle, productData, options = {}) {
    const cacheKey = Helpers.generateCacheKey('yahoo_shopping_search', productTitle);
    
    const cached = await RedisHelper.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      return cached;
    }
    
    try {
      // Yahoo!ショッピングAPI実装
      const mockResults = this.generateMockYahooResults(productTitle, productData);
      
      await RedisHelper.setCache(cacheKey, mockResults, this.searchSettings.cacheTimeout);
      
      logger.info('Yahoo Shopping search completed', {
        productTitle,
        resultsCount: mockResults.length
      });
      
      return mockResults;
      
    } catch (error) {
      logger.error('Yahoo Shopping search failed', {
        productTitle,
        error: error.message
      });
      throw error;
    }
  }
  
  // 商品マッチング評価
  calculateMatchingConfidence(supplierProduct, originalProduct) {
    let confidence = 0;
    
    // タイトル類似度 (40%)
    const titleSimilarity = this.calculateStringSimilarity(
      supplierProduct.title.toLowerCase(),
      originalProduct.title.toLowerCase()
    );
    confidence += titleSimilarity * 0.4;
    
    // ブランド一致 (25%)
    if (supplierProduct.brand && originalProduct.brand) {
      const brandMatch = supplierProduct.brand.toLowerCase() === originalProduct.brand.toLowerCase();
      confidence += brandMatch ? 0.25 : 0;
    }
    
    // モデル一致 (20%)
    if (supplierProduct.model && originalProduct.model) {
      const modelMatch = supplierProduct.model.toLowerCase() === originalProduct.model.toLowerCase();
      confidence += modelMatch ? 0.20 : 0;
    }
    
    // JAN/UPC一致 (15%)
    if (supplierProduct.janCode && originalProduct.janCode) {
      const codeMatch = supplierProduct.janCode === originalProduct.janCode;
      confidence += codeMatch ? 0.15 : 0;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  // 文字列類似度計算（簡易版）
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  // レーベンシュタイン距離計算
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // モックデータ生成（実装例）
  generateMockAmazonResults(productTitle, productData) {
    const basePrice = productData.ebaySellingPrice ? 
      Helpers.usdToJpy(productData.ebaySellingPrice) : 
      Math.floor(Math.random() * 50000) + 10000;
    
    return [
      {
        supplierType: 'amazon',
        supplierName: 'Amazon.co.jp',
        supplierUrl: 'https://amazon.co.jp/dp/MOCK123456',
        productTitle: productTitle,
        price: basePrice * 0.95,
        originalPrice: basePrice,
        discountRate: 5,
        currency: 'JPY',
        availabilityStatus: 'in_stock',
        stockQuantity: 10,
        shippingCost: 0,
        freeShipping: true,
        deliveryDaysMin: 1,
        deliveryDaysMax: 2,
        sellerName: 'Amazon.co.jp',
        sellerRating: 4.8,
        sellerReviewCount: 15420,
        sellerCountry: 'JP',
        reliabilityScore: 9.5,
        conditionType: 'new',
        brand: productData.brand,
        model: productData.model,
        imageUrls: ['https://via.placeholder.com/400x400?text=Amazon+Product'],
        matchingConfidence: 0.95
      }
    ];
  }
  
  generateMockRakutenResults(productTitle, productData) {
    const basePrice = productData.ebaySellingPrice ? 
      Helpers.usdToJpy(productData.ebaySellingPrice) : 
      Math.floor(Math.random() * 50000) + 10000;
    
    return [
      {
        supplierType: 'rakuten',
        supplierName: '楽天ビック（ビックカメラ×楽天）',
        supplierUrl: 'https://item.rakuten.co.jp/mock/123456',
        productTitle: productTitle,
        price: basePrice * 1.02,
        originalPrice: basePrice * 1.05,
        discountRate: 3,
        currency: 'JPY',
        availabilityStatus: 'in_stock',
        stockQuantity: 25,
        shippingCost: 550,
        freeShipping: false,
        deliveryDaysMin: 2,
        deliveryDaysMax: 3,
        sellerName: '楽天ビック',
        sellerRating: 4.7,
        sellerReviewCount: 8901,
        sellerCountry: 'JP',
        reliabilityScore: 9.2,
        conditionType: 'new',
        brand: productData.brand,
        model: productData.model,
        imageUrls: ['https://via.placeholder.com/400x400?text=Rakuten+Product'],
        matchingConfidence: 0.92
      }
    ];
  }
  
  generateMockMercariResults(productTitle, productData) {
    const basePrice = productData.ebaySellingPrice ? 
      Helpers.usdToJpy(productData.ebaySellingPrice) : 
      Math.floor(Math.random() * 50000) + 10000;
    
    return [
      {
        supplierType: 'mercari',
        supplierName: 'メルカリ',
        supplierUrl: 'https://jp.mercari.com/item/mock123',
        productTitle: `${productTitle} 新品未開封`,
        price: basePrice * 0.85,
        originalPrice: basePrice,
        discountRate: 15,
        currency: 'JPY',
        availabilityStatus: 'in_stock',
        stockQuantity: 1,
        shippingCost: 500,
        freeShipping: false,
        deliveryDaysMin: 1,
        deliveryDaysMax: 3,
        sellerName: 'electronics_seller_123',
        sellerRating: 4.9,
        sellerReviewCount: 450,
        sellerCountry: 'JP',
        reliabilityScore: 8.8,
        conditionType: 'new',
        brand: productData.brand,
        model: productData.model,
        imageUrls: ['https://via.placeholder.com/400x400?text=Mercari+Product'],
        matchingConfidence: 0.89
      }
    ];
  }
  
  generateMockYahooResults(productTitle, productData) {
    const basePrice = productData.ebaySellingPrice ? 
      Helpers.usdToJpy(productData.ebaySellingPrice) : 
      Math.floor(Math.random() * 50000) + 10000;
    
    return [
      {
        supplierType: 'yahoo_shopping',
        supplierName: 'ヤフーショッピング',
        supplierUrl: 'https://shopping.yahoo.co.jp/item/mock123',
        productTitle: productTitle,
        price: basePrice * 0.92,
        originalPrice: basePrice * 1.05,
        discountRate: 12,
        currency: 'JPY',
        availabilityStatus: 'limited',
        stockQuantity: 3,
        shippingCost: 800,
        freeShipping: false,
        deliveryDaysMin: 3,
        deliveryDaysMax: 5,
        sellerName: 'electronics_discount_store',
        sellerRating: 4.5,
        sellerReviewCount: 1250,
        sellerCountry: 'JP',
        reliabilityScore: 8.2,
        conditionType: 'new',
        brand: productData.brand,
        model: productData.model,
        imageUrls: ['https://via.placeholder.com/400x400?text=Yahoo+Product'],
        matchingConfidence: 0.91
      }
    ];
  }
}

module.exports = new SupplierSearchService();