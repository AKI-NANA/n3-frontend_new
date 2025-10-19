// src/validators/analysisValidator.js - 分析リクエストバリデーター
const Joi = require('joi');

// 商品データスキーマ
const productDataSchema = Joi.object({
  id: Joi.string().required(),
  ebayTitle: Joi.string().min(1).max(500).required(),
  ebaySellingPrice: Joi.number().min(0).max(1000000),
  ebayCategoryName: Joi.string().max(200),
  brand: Joi.string().max(100),
  ebaySellerUsername: Joi.string().max(100),
  ebaySellerCountry: Joi.string().length(2),
  ebaySellerFeedbackScore: Joi.number().min(0),
  ebaySoldQuantity: Joi.number().min(0),
  ebayWatchersCount: Joi.number().min(0),
  ebayListingCount: Joi.number().min(0),
  ebayCondition: Joi.string().max(50),
  ebayShippingCost: Joi.number().min(0),
  ebayItemLocation: Joi.string().max(200),
  priceHistory: Joi.array().items(Joi.object({
    date: Joi.string().isoDate().required(),
    price: Joi.number().min(0).required()
  })),
  additionalData: Joi.object().unknown(true)
}).unknown(true);

// 分析オプションスキーマ
const analysisOptionsSchema = Joi.object({
  analysisTypes: Joi.array().items(
    Joi.string().valid('demand', 'price', 'risk', 'matching', 'trend')
  ),
  forceRefresh: Joi.boolean().default(false),
  maxConcurrency: Joi.number().min(1).max(10).default(3),
  matchingOptions: Joi.object({
    strategy: Joi.string().valid('keyword_based', 'model_based', 'image_based', 'hybrid').default('hybrid'),
    excludeAmazon: Joi.boolean().default(false),
    excludeRakuten: Joi.boolean().default(false),
    excludeMercari: Joi.boolean().default(false),
    excludeYahooAuction: Joi.boolean().default(false),
    confidenceThreshold: Joi.number().min(0).max(1).default(0.7)
  }).default({}),
  saveResults: Joi.boolean().default(true),
  notifyOnCompletion: Joi.boolean().default(false),
  customWeights: Joi.object({
    demand: Joi.number().min(0).max(1),
    price: Joi.number().min(0).max(1),
    risk: Joi.number().min(0).max(1),
    trend: Joi.number().min(0).max(1)
  })
}).default({});

// 単一分析リクエストスキーマ
const singleAnalysisRequestSchema = Joi.object({
  productData: productDataSchema.required(),
  options: analysisOptionsSchema
});

// バッチ分析リクエストスキーマ
const batchAnalysisRequestSchema = Joi.object({
  products: Joi.array()
    .items(productDataSchema)
    .min(1)
    .max(500)
    .required(),
  options: analysisOptionsSchema,
  batchId: Joi.string().optional(),
  priority: Joi.string().valid('low', 'normal', 'high').default('normal')
});

// フィルタースキーマ
const filtersSchema = Joi.object({
  category: Joi.string().max(200),
  brand: Joi.string().max(100),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  minProfitMargin: Joi.number().min(0).max(100),
  maxRiskScore: Joi.number().min(0).max(10),
  sellerCountry: Joi.string().length(2),
  condition: Joi.string().valid('new', 'used', 'refurbished'),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('score', 'profit', 'risk', 'date').default('score'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  dateFrom: Joi.string().isoDate(),
  dateTo: Joi.string().isoDate()
});

// バリデーション実行関数
function validateAnalysisRequest(data) {
  const { error, value } = singleAnalysisRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      })),
      sanitizedData: null
    };
  }

  // 追加ビジネスロジック検証
  const businessValidation = validateBusinessRules(value);
  if (!businessValidation.isValid) {
    return businessValidation;
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: value
  };
}

function validateBatchRequest(data) {
  const { error, value } = batchAnalysisRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      })),
      sanitizedData: null
    };
  }

  // バッチ特有の検証
  const batchValidation = validateBatchBusinessRules(value);
  if (!batchValidation.isValid) {
    return batchValidation;
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: value
  };
}

function validateFilters(data) {
  const { error, value } = filtersSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      })),
      sanitizedData: null
    };
  }

  // フィルター特有の検証
  const filterValidation = validateFilterBusinessRules(value);
  if (!filterValidation.isValid) {
    return filterValidation;
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: value
  };
}

// ビジネスルール検証
function validateBusinessRules(data) {
  const errors = [];

  // 商品データの整合性チェック
  const { productData, options } = data;

  // 価格の妥当性チェック
  if (productData.ebaySellingPrice !== undefined) {
    if (productData.ebaySellingPrice <= 0) {
      errors.push({
        field: 'productData.ebaySellingPrice',
        message: 'Selling price must be greater than 0',
        value: productData.ebaySellingPrice
      });
    }

    if (productData.ebaySellingPrice > 50000) {
      errors.push({
        field: 'productData.ebaySellingPrice',
        message: 'Selling price seems unreasonably high. Please verify.',
        value: productData.ebaySellingPrice
      });
    }
  }

  // タイトルの内容チェック
  if (productData.ebayTitle) {
    const suspiciousKeywords = ['test', 'dummy', 'fake', 'sample'];
    const titleLower = productData.ebayTitle.toLowerCase();
    
    if (suspiciousKeywords.some(keyword => titleLower.includes(keyword))) {
      errors.push({
        field: 'productData.ebayTitle',
        message: 'Product title contains suspicious keywords',
        value: productData.ebayTitle
      });
    }
  }

  // 売上数とウォッチ数の整合性
  if (productData.ebaySoldQuantity !== undefined && productData.ebayWatchersCount !== undefined) {
    if (productData.ebaySoldQuantity > 0 && productData.ebayWatchersCount === 0) {
      // 警告レベル（エラーではない）
    }
  }

  // セラー評価スコアの妥当性
  if (productData.ebaySellerFeedbackScore !== undefined) {
    if (productData.ebaySellerFeedbackScore < 0) {
      errors.push({
        field: 'productData.ebaySellerFeedbackScore',
        message: 'Seller feedback score cannot be negative',
        value: productData.ebaySellerFeedbackScore
      });
    }
  }

  // 価格履歴の整合性
  if (productData.priceHistory && productData.priceHistory.length > 1) {
    const priceHistory = productData.priceHistory;
    
    // 日付順序チェック
    for (let i = 1; i < priceHistory.length; i++) {
      const prevDate = new Date(priceHistory[i-1].date);
      const currDate = new Date(priceHistory[i].date);
      
      if (currDate <= prevDate) {
        errors.push({
          field: 'productData.priceHistory',
          message: 'Price history dates must be in chronological order',
          value: `${priceHistory[i-1].date} -> ${priceHistory[i].date}`
        });
        break;
      }
    }

    // 価格変動の妥当性チェック
    const prices = priceHistory.map(h => h.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    
    if (maxPrice / minPrice > 10) {
      errors.push({
        field: 'productData.priceHistory',
        message: 'Extreme price variations detected. Please verify data accuracy.',
        value: `Min: ${minPrice}, Max: ${maxPrice}`
      });
    }
  }

  // 分析オプションの整合性
  if (options && options.customWeights) {
    const weights = options.customWeights;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      errors.push({
        field: 'options.customWeights',
        message: 'Custom weights must sum to 1.0',
        value: totalWeight
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    sanitizedData: errors.length === 0 ? data : null
  };
}

// バッチ分析ビジネスルール検証
function validateBatchBusinessRules(data) {
  const errors = [];
  const { products, options } = data;

  // 商品の重複チェック
  const productIds = products.map(p => p.id);
  const uniqueIds = new Set(productIds);
  
  if (uniqueIds.size !== productIds.length) {
    errors.push({
      field: 'products',
      message: 'Duplicate product IDs found in batch',
      value: `${productIds.length} products, ${uniqueIds.size} unique`
    });
  }

  // バッチサイズと並行処理数の整合性
  if (options && options.maxConcurrency) {
    if (options.maxConcurrency > products.length) {
      // 自動調整（警告のみ）
      options.maxConcurrency = products.length;
    }
  }

  // 各商品の基本検証
  products.forEach((product, index) => {
    if (!product.id || !product.ebayTitle) {
      errors.push({
        field: `products[${index}]`,
        message: 'Product missing required fields (id, ebayTitle)',
        value: product.id || 'unknown'
      });
    }
  });

  // メモリ使用量の概算チェック
  const estimatedMemoryUsage = products.length * 50; // 50KB per product (概算)
  if (estimatedMemoryUsage > 10000) { // 10MB
    errors.push({
      field: 'products',
      message: 'Batch size may cause memory issues. Consider splitting into smaller batches.',
      value: `${products.length} products, ~${estimatedMemoryUsage}KB`
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    sanitizedData: errors.length === 0 ? data : null
  };
}

// フィルター ビジネスルール検証
function validateFilterBusinessRules(data) {
  const errors = [];

  // 価格範囲の妥当性
  if (data.minPrice !== undefined && data.maxPrice !== undefined) {
    if (data.minPrice >= data.maxPrice) {
      errors.push({
        field: 'priceRange',
        message: 'Minimum price must be less than maximum price',
        value: `min: ${data.minPrice}, max: ${data.maxPrice}`
      });
    }

    if (data.maxPrice - data.minPrice < 1) {
      errors.push({
        field: 'priceRange',
        message: 'Price range too narrow for meaningful analysis',
        value: `range: ${data.maxPrice - data.minPrice}`
      });
    }
  }

  // 日付範囲の妥当性
  if (data.dateFrom && data.dateTo) {
    const fromDate = new Date(data.dateFrom);
    const toDate = new Date(data.dateTo);

    if (fromDate >= toDate) {
      errors.push({
        field: 'dateRange',
        message: 'Start date must be before end date',
        value: `from: ${data.dateFrom}, to: ${data.dateTo}`
      });
    }

    const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      errors.push({
        field: 'dateRange',
        message: 'Date range cannot exceed 365 days',
        value: `${daysDiff} days`
      });
    }
  }

  // 利益率の妥当性
  if (data.minProfitMargin !== undefined) {
    if (data.minProfitMargin < 0) {
      errors.push({
        field: 'minProfitMargin',
        message: 'Minimum profit margin cannot be negative',
        value: data.minProfitMargin
      });
    }

    if (data.minProfitMargin > 90) {
      errors.push({
        field: 'minProfitMargin',
        message: 'Minimum profit margin seems unreasonably high',
        value: data.minProfitMargin
      });
    }
  }

  // 結果数制限の妥当性
  if (data.limit > 100) {
    errors.push({
      field: 'limit',
      message: 'Result limit cannot exceed 100',
      value: data.limit
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    sanitizedData: errors.length === 0 ? data : null
  };
}

// 商品データサニタイズ
function sanitizeProductData(productData) {
  const sanitized = { ...productData };

  // 文字列のトリムと正規化
  if (sanitized.ebayTitle) {
    sanitized.ebayTitle = sanitized.ebayTitle.trim().substring(0, 500);
  }

  if (sanitized.brand) {
    sanitized.brand = sanitized.brand.trim().substring(0, 100);
  }

  if (sanitized.ebayCategoryName) {
    sanitized.ebayCategoryName = sanitized.ebayCategoryName.trim().substring(0, 200);
  }

  // 数値の正規化
  if (sanitized.ebaySellingPrice !== undefined) {
    sanitized.ebaySellingPrice = Math.max(0, Number(sanitized.ebaySellingPrice));
  }

  if (sanitized.ebaySoldQuantity !== undefined) {
    sanitized.ebaySoldQuantity = Math.max(0, Math.floor(Number(sanitized.ebaySoldQuantity)));
  }

  if (sanitized.ebayWatchersCount !== undefined) {
    sanitized.ebayWatchersCount = Math.max(0, Math.floor(Number(sanitized.ebayWatchersCount)));
  }

  // 価格履歴のソート
  if (sanitized.priceHistory && Array.isArray(sanitized.priceHistory)) {
    sanitized.priceHistory = sanitized.priceHistory
      .filter(h => h.date && h.price >= 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return sanitized;
}

// リクエスト サイズ チェック
function validateRequestSize(req, res, next) {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request too large',
      maxSize: `${maxSize / (1024 * 1024)}MB`,
      receivedSize: `${(contentLength / (1024 * 1024)).toFixed(2)}MB`
    });
  }

  next();
}

// エクスポート
module.exports = {
  validateAnalysisRequest,
  validateBatchRequest,
  validateFilters,
  sanitizeProductData,
  validateRequestSize,
  
  // スキーマもエクスポート（テスト用）
  productDataSchema,
  analysisOptionsSchema,
  singleAnalysisRequestSchema,
  batchAnalysisRequestSchema,
  filtersSchema
};