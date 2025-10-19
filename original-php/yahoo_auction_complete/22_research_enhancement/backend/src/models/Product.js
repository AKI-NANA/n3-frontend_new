// src/models/Product.js - 商品データモデル
const { pool, DatabaseHelper } = require('../config/database');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');

class Product {
  constructor(data = {}) {
    this.id = data.id || null;
    this.uuid = data.uuid || null;
    this.userId = data.userId || data.user_id || null;
    
    // eBay商品情報
    this.ebayItemId = data.ebayItemId || data.ebay_item_id || null;
    this.ebayTitle = data.ebayTitle || data.ebay_title || null;
    this.ebayCategoryId = data.ebayCategoryId || data.ebay_category_id || null;
    this.ebayCategoryName = data.ebayCategoryName || data.ebay_category_name || null;
    this.ebayCondition = data.ebayCondition || data.ebay_condition || null;
    this.ebaySellingPrice = data.ebaySellingPrice || data.ebay_selling_price || null;
    this.ebayCurrency = data.ebayCurrency || data.ebay_currency || 'USD';
    this.ebaySoldQuantity = data.ebaySoldQuantity || data.ebay_sold_quantity || 0;
    this.ebayWatchersCount = data.ebayWatchersCount || data.ebay_watchers_count || 0;
    this.ebayListingUrl = data.ebayListingUrl || data.ebay_listing_url || null;
    this.ebayImageUrls = data.ebayImageUrls || data.ebay_image_urls || [];
    this.ebaySellerUsername = data.ebaySellerUsername || data.ebay_seller_username || null;
    this.ebaySellerCountry = data.ebaySellerCountry || data.ebay_seller_country || null;
    
    // 基本情報
    this.brand = data.brand || null;
    this.model = data.model || null;
    this.janCode = data.janCode || data.jan_code || null;
    this.mpn = data.mpn || null;
    
    // 分析データ
    this.researchScore = data.researchScore || data.research_score || null;
    this.marketDemandScore = data.marketDemandScore || data.market_demand_score || null;
    this.competitionLevel = data.competitionLevel || data.competition_level || null;
    this.profitPotentialScore = data.profitPotentialScore || data.profit_potential_score || null;
    
    // ステータス・メタデータ
    this.status = data.status || 'active';
    this.tags = data.tags || [];
    this.notes = data.notes || null;
    this.createdAt = data.createdAt || data.created_at || null;
    this.updatedAt = data.updatedAt || data.updated_at || null;
    this.lastResearchAt = data.lastResearchAt || data.last_research_at || null;
  }
  
  // バリデーション
  validate() {
    const errors = [];
    
    if (!this.userId) {
      errors.push('User ID is required');
    }
    
    if (!this.ebayTitle || this.ebayTitle.trim().length === 0) {
      errors.push('eBay title is required');
    }
    
    if (this.ebayTitle && this.ebayTitle.length > 500) {
      errors.push('eBay title is too long (max 500 characters)');
    }
    
    if (this.ebaySellingPrice && (isNaN(this.ebaySellingPrice) || this.ebaySellingPrice < 0)) {
      errors.push('eBay selling price must be a positive number');
    }
    
    if (this.researchScore && (this.researchScore < 0 || this.researchScore > 10)) {
      errors.push('Research score must be between 0 and 10');
    }
    
    if (this.status && !['active', 'archived', 'deleted'].includes(this.status)) {
      errors.push('Status must be active, archived, or deleted');
    }
    
    return errors;
  }
  
  // データベースに保存
  async save() {
    const errors = this.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    try {
      if (this.id) {
        // 更新処理
        return await this.update();
      } else {
        // 新規作成処理
        return await this.create();
      }
    } catch (error) {
      logger.error('Product save failed', {
        productId: this.id,
        ebayItemId: this.ebayItemId,
        error: error.message
      });
      throw error;
    }
  }
  
  // 新規作成
  async create() {
    const query = `
      INSERT INTO products (
        user_id, ebay_item_id, ebay_title, ebay_category_id, ebay_category_name,
        ebay_condition, ebay_selling_price, ebay_currency, ebay_sold_quantity,
        ebay_watchers_count, ebay_listing_url, ebay_image_urls, ebay_seller_username,
        ebay_seller_country, brand, model, jan_code, mpn, research_score,
        market_demand_score, competition_level, profit_potential_score,
        status, tags, notes, last_research_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *
    `;
    
    const values = [
      this.userId, this.ebayItemId, this.ebayTitle, this.ebayCategoryId,
      this.ebayCategoryName, this.ebayCondition, this.ebaySellingPrice,
      this.ebayCurrency, this.ebaySoldQuantity, this.ebayWatchersCount,
      this.ebayListingUrl, this.ebayImageUrls, this.ebaySellerUsername,
      this.ebaySellerCountry, this.brand, this.model, this.janCode, this.mpn,
      this.researchScore, this.marketDemandScore, this.competitionLevel,
      this.profitPotentialScore, this.status, this.tags, this.notes,
      this.lastResearchAt
    ];
    
    const result = await pool.query(query, values);
    const savedProduct = result.rows[0];
    
    // インスタンスプロパティ更新
    Object.assign(this, savedProduct);
    
    logger.info('Product created successfully', {
      productId: this.id,
      ebayItemId: this.ebayItemId,
      userId: this.userId
    });
    
    return this;
  }
  
  // 更新処理
  async update() {
    const query = `
      UPDATE products SET
        ebay_title = $2, ebay_category_id = $3, ebay_category_name = $4,
        ebay_condition = $5, ebay_selling_price = $6, ebay_currency = $7,
        ebay_sold_quantity = $8, ebay_watchers_count = $9, ebay_listing_url = $10,
        ebay_image_urls = $11, ebay_seller_username = $12, ebay_seller_country = $13,
        brand = $14, model = $15, jan_code = $16, mpn = $17, research_score = $18,
        market_demand_score = $19, competition_level = $20, profit_potential_score = $21,
        status = $22, tags = $23, notes = $24, last_research_at = $25
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      this.id, this.ebayTitle, this.ebayCategoryId, this.ebayCategoryName,
      this.ebayCondition, this.ebaySellingPrice, this.ebayCurrency,
      this.ebaySoldQuantity, this.ebayWatchersCount, this.ebayListingUrl,
      this.ebayImageUrls, this.ebaySellerUsername, this.ebaySellerCountry,
      this.brand, this.model, this.janCode, this.mpn, this.researchScore,
      this.marketDemandScore, this.competitionLevel, this.profitPotentialScore,
      this.status, this.tags, this.notes, this.lastResearchAt
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Product not found for update');
    }
    
    const updatedProduct = result.rows[0];
    Object.assign(this, updatedProduct);
    
    logger.info('Product updated successfully', {
      productId: this.id,
      ebayItemId: this.ebayItemId
    });
    
    return this;
  }
  
  // ID指定検索
  static async findById(id, userId = null) {
    let query = 'SELECT * FROM products WHERE id = $1';
    let values = [id];
    
    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }
    
    try {
      const result = await pool.query(query, values);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      logger.error('Product findById failed', { id, userId, error: error.message });
      throw error;
    }
  }
  
  // UUID指定検索
  static async findByUuid(uuid, userId = null) {
    let query = 'SELECT * FROM products WHERE uuid = $1';
    let values = [uuid];
    
    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }
    
    try {
      const result = await pool.query(query, values);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      logger.error('Product findByUuid failed', { uuid, userId, error: error.message });
      throw error;
    }
  }
  
  // eBay商品ID検索
  static async findByEbayItemId(ebayItemId, userId = null) {
    let query = 'SELECT * FROM products WHERE ebay_item_id = $1';
    let values = [ebayItemId];
    
    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }
    
    try {
      const result = await pool.query(query, values);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      logger.error('Product findByEbayItemId failed', {
        ebayItemId,
        userId,
        error: error.message
      });
      throw error;
    }
  }
  
  // 検索・フィルタリング
  static async search(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;
    
    let whereConditions = [];
    let values = [];
    let paramCount = 1;
    
    // ユーザーフィルター（必須）
    if (filters.userId) {
      whereConditions.push(`user_id = ${paramCount}`);
      values.push(filters.userId);
      paramCount++;
    }
    
    // ステータスフィルター
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        const placeholders = filters.status.map(() => `${paramCount++}`).join(', ');
        whereConditions.push(`status IN (${placeholders})`);
        values.push(...filters.status);
      } else {
        whereConditions.push(`status = ${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }
    }
    
    // カテゴリフィルター
    if (filters.category) {
      whereConditions.push(`ebay_category_name ILIKE ${paramCount}`);
      values.push(`%${filters.category}%`);
      paramCount++;
    }
    
    // ブランドフィルター
    if (filters.brand) {
      whereConditions.push(`brand ILIKE ${paramCount}`);
      values.push(`%${filters.brand}%`);
      paramCount++;
    }
    
    // 価格範囲フィルター
    if (filters.minPrice) {
      whereConditions.push(`ebay_selling_price >= ${paramCount}`);
      values.push(filters.minPrice);
      paramCount++;
    }
    
    if (filters.maxPrice) {
      whereConditions.push(`ebay_selling_price <= ${paramCount}`);
      values.push(filters.maxPrice);
      paramCount++;
    }
    
    // リサーチスコアフィルター
    if (filters.minResearchScore) {
      whereConditions.push(`research_score >= ${paramCount}`);
      values.push(filters.minResearchScore);
      paramCount++;
    }
    
    // セラー国フィルター
    if (filters.sellerCountry) {
      whereConditions.push(`ebay_seller_country = ${paramCount}`);
      values.push(filters.sellerCountry);
      paramCount++;
    }
    
    // タグフィルター
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags && ${paramCount}`);
      values.push(filters.tags);
      paramCount++;
    }
    
    // 全文検索
    if (filters.search) {
      whereConditions.push(`(
        ebay_title ILIKE ${paramCount} OR 
        brand ILIKE ${paramCount} OR 
        model ILIKE ${paramCount}
      )`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }
    
    // 日付範囲フィルター
    if (filters.createdAfter) {
      whereConditions.push(`created_at >= ${paramCount}`);
      values.push(filters.createdAfter);
      paramCount++;
    }
    
    if (filters.createdBefore) {
      whereConditions.push(`created_at <= ${paramCount}`);
      values.push(filters.createdBefore);
      paramCount++;
    }
    
    // WHERE句構築
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // ソート設定検証
    const allowedSortFields = [
      'created_at', 'updated_at', 'ebay_title', 'ebay_selling_price',
      'research_score', 'market_demand_score', 'profit_potential_score',
      'ebay_sold_quantity', 'ebay_watchers_count'
    ];
    
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) 
      ? sortOrder.toUpperCase() : 'DESC';
    
    // メインクエリ
    const baseQuery = `
      SELECT * FROM products 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
    `;
    
    // カウントクエリ
    const countQuery = `
      SELECT COUNT(*) as count FROM products 
      ${whereClause}
    `;
    
    try {
      const result = await DatabaseHelper.paginate(
        baseQuery, values, page, limit, countQuery
      );
      
      return {
        ...result,
        data: result.data.map(row => new Product(row))
      };
      
    } catch (error) {
      logger.error('Product search failed', {
        filters,
        error: error.message
      });
      throw error;
    }
  }
  
  // バルクインサート
  static async bulkCreate(productsData, userId) {
    if (!Array.isArray(productsData) || productsData.length === 0) {
      return [];
    }
    
    const columns = [
      'user_id', 'ebay_item_id', 'ebay_title', 'ebay_category_id', 'ebay_category_name',
      'ebay_condition', 'ebay_selling_price', 'ebay_currency', 'ebay_sold_quantity',
      'ebay_watchers_count', 'ebay_listing_url', 'ebay_image_urls', 'ebay_seller_username',
      'ebay_seller_country', 'brand', 'model', 'jan_code', 'mpn', 'research_score',
      'market_demand_score', 'competition_level', 'profit_potential_score',
      'status', 'tags', 'notes', 'last_research_at'
    ];
    
    const values = productsData.map(data => {
      const product = new Product({ ...data, userId });
      
      return [
        product.userId, product.ebayItemId, product.ebayTitle, product.ebayCategoryId,
        product.ebayCategoryName, product.ebayCondition, product.ebaySellingPrice,
        product.ebayCurrency, product.ebaySoldQuantity, product.ebayWatchersCount,
        product.ebayListingUrl, product.ebayImageUrls, product.ebaySellerUsername,
        product.ebaySellerCountry, product.brand, product.model, product.janCode,
        product.mpn, product.researchScore, product.marketDemandScore,
        product.competitionLevel, product.profitPotentialScore, product.status,
        product.tags, product.notes, product.lastResearchAt
      ];
    });
    
    try {
      const result = await DatabaseHelper.bulkInsert(
        'products', 
        columns, 
        values,
        {
          onConflict: 'ON CONFLICT (ebay_item_id, user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP',
          returning: '*'
        }
      );
      
      logger.info('Bulk product creation completed', {
        userId,
        totalProducts: result.length,
        duplicatesHandled: productsData.length - result.length
      });
      
      return result.map(row => new Product(row));
      
    } catch (error) {
      logger.error('Bulk product creation failed', {
        userId,
        totalProducts: productsData.length,
        error: error.message
      });
      throw error;
    }
  }
  
  // 統計情報取得
  static async getStats(userId, filters = {}) {
    let whereConditions = ['user_id = $1'];
    let values = [userId];
    let paramCount = 2;
    
    // フィルター適用
    if (filters.status) {
      whereConditions.push(`status = ${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }
    
    if (filters.category) {
      whereConditions.push(`ebay_category_name ILIKE ${paramCount}`);
      values.push(`%${filters.category}%`);
      paramCount++;
    }
    
    if (filters.createdAfter) {
      whereConditions.push(`created_at >= ${paramCount}`);
      values.push(filters.createdAfter);
      paramCount++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE status = 'active') as active_products,
        COUNT(*) FILTER (WHERE status = 'archived') as archived_products,
        AVG(ebay_selling_price) as avg_price,
        AVG(research_score) as avg_research_score,
        AVG(market_demand_score) as avg_market_demand,
        AVG(profit_potential_score) as avg_profit_potential,
        MAX(ebay_selling_price) as max_price,
        MIN(ebay_selling_price) as min_price,
        COUNT(DISTINCT ebay_category_name) as unique_categories,
        COUNT(DISTINCT brand) as unique_brands,
        COUNT(DISTINCT ebay_seller_country) as unique_countries
      FROM products 
      ${whereClause}
    `;
    
    try {
      const result = await pool.query(query, values);
      const stats = result.rows[0];
      
      // 数値型変換
      Object.keys(stats).forEach(key => {
        if (key.includes('avg') || key.includes('max') || key.includes('min')) {
          stats[key] = parseFloat(stats[key]) || 0;
        } else {
          stats[key] = parseInt(stats[key]) || 0;
        }
      });
      
      return stats;
      
    } catch (error) {
      logger.error('Product stats retrieval failed', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
  
  // トップカテゴリ取得
  static async getTopCategories(userId, limit = 10) {
    const query = `
      SELECT 
        ebay_category_name,
        COUNT(*) as product_count,
        AVG(ebay_selling_price) as avg_price,
        AVG(research_score) as avg_research_score
      FROM products 
      WHERE user_id = $1 AND status = 'active' AND ebay_category_name IS NOT NULL
      GROUP BY ebay_category_name
      ORDER BY product_count DESC, avg_research_score DESC
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [userId, limit]);
      
      return result.rows.map(row => ({
        categoryName: row.ebay_category_name,
        productCount: parseInt(row.product_count),
        averagePrice: parseFloat(row.avg_price) || 0,
        averageResearchScore: parseFloat(row.avg_research_score) || 0
      }));
      
    } catch (error) {
      logger.error('Top categories retrieval failed', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
  
  // 削除（論理削除）
  async delete() {
    const query = 'UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    
    try {
      await pool.query(query, ['deleted', this.id]);
      this.status = 'deleted';
      
      logger.info('Product deleted (soft delete)', {
        productId: this.id,
        ebayItemId: this.ebayItemId
      });
      
      return true;
    } catch (error) {
      logger.error('Product deletion failed', {
        productId: this.id,
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
      userId: this.userId,
      
      // eBay情報
      ebayItemId: this.ebayItemId,
      ebayTitle: this.ebayTitle,
      ebayCategory: {
        id: this.ebayCategoryId,
        name: this.ebayCategoryName
      },
      ebayCondition: this.ebayCondition,
      ebayPrice: {
        amount: this.ebaySellingPrice,
        currency: this.ebayCurrency
      },
      ebayStats: {
        soldQuantity: this.ebaySoldQuantity,
        watchersCount: this.ebayWatchersCount
      },
      ebayListingUrl: this.ebayListingUrl,
      ebayImageUrls: this.ebayImageUrls,
      ebaySeller: {
        username: this.ebaySellerUsername,
        country: this.ebaySellerCountry
      },
      
      // 基本情報
      brand: this.brand,
      model: this.model,
      janCode: this.janCode,
      mpn: this.mpn,
      
      // 分析スコア
      scores: {
        research: this.researchScore,
        marketDemand: this.marketDemandScore,
        competitionLevel: this.competitionLevel,
        profitPotential: this.profitPotentialScore
      },
      
      // メタデータ
      status: this.status,
      tags: this.tags,
      notes: this.notes,
      timestamps: {
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        lastResearchAt: this.lastResearchAt
      }
    };
  }
}

module.exports = Product;