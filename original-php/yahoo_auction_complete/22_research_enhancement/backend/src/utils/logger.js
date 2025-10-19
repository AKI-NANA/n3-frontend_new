// src/utils/logger.js - Winston ログ設定
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// ログレベル設定
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// カスタムカラー設定
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(LOG_COLORS);

// ログフォーマット設定
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` | ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// コンソール用フォーマット
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Transport 設定
const transports = [];

// コンソール出力（開発環境）
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug'
    })
  );
}

// ファイル出力：エラーログ
transports.push(
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    auditFile: path.join(process.cwd(), 'logs', '.error-audit.json'),
    zippedArchive: true
  })
);

// ファイル出力：結合ログ
transports.push(
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '50m',
    maxFiles: '30d',
    auditFile: path.join(process.cwd(), 'logs', '.combined-audit.json'),
    zippedArchive: true,
    level: process.env.LOG_LEVEL || 'info'
  })
);

// APIアクセスログ専用
transports.push(
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: '100m',
    maxFiles: '90d',
    auditFile: path.join(process.cwd(), 'logs', '.api-audit.json'),
    zippedArchive: true
  })
);

// Winston ロガー作成
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test'
});

// エラーハンドリング
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// ログレベル動的変更
logger.setLogLevel = (level) => {
  if (LOG_LEVELS.hasOwnProperty(level)) {
    logger.level = level;
    logger.info(`Log level changed to: ${level}`);
  } else {
    logger.warn(`Invalid log level: ${level}`);
  }
};

// 構造化ログ用ヘルパー
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || null,
    requestId: req.headers['x-request-id'] || null
  };
  
  if (res.statusCode >= 400) {
    logger.warn('HTTP Request Error', logData);
  } else {
    logger.http('HTTP Request', logData);
  }
};

logger.logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
};

logger.logApiCall = (service, endpoint, method, statusCode, responseTime, context = {}) => {
  const logData = {
    service,
    endpoint,
    method,
    statusCode,
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  // APIアクセスログ専用transportに送信
  const apiLogger = winston.createLogger({
    transports: [
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'api-current.log'),
        format: winston.format.json()
      })
    ]
  });
  
  apiLogger.info('API Call', logData);
  
  // メインログにも記録
  if (statusCode >= 400) {
    logger.warn('External API Error', logData);
  } else {
    logger.debug('External API Success', logData);
  }
};

logger.logPerformance = (operation, duration, metadata = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

logger.logSecurity = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logBusinessMetric = (metric, value, tags = {}) => {
  logger.info('Business Metric', {
    metric,
    value,
    tags,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;

// src/utils/helpers.js - ユーティリティヘルパー関数
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class Helpers {
  // 安全なランダム文字列生成
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // UUID生成
  static generateUUID() {
    return uuidv4();
  }
  
  // パスワードハッシュ化（bcrypt使用）
  static async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  // パスワード検証
  static async verifyPassword(password, hashedPassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hashedPassword);
  }
  
  // 日本円からUSD変換
  static jpyToUsd(jpyAmount, exchangeRate = 142.50) {
    return Math.round((jpyAmount / exchangeRate) * 100) / 100;
  }
  
  // USDから日本円変換
  static usdToJpy(usdAmount, exchangeRate = 142.50) {
    return Math.round((usdAmount * exchangeRate));
  }
  
  // 数値フォーマット（3桁区切り）
  static formatNumber(number, locale = 'ja-JP') {
    return new Intl.NumberFormat(locale).format(number);
  }
  
  // 通貨フォーマット
  static formatCurrency(amount, currency = 'JPY', locale = 'ja-JP') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
  
  // パーセント計算
  static calculatePercentage(part, whole, decimals = 2) {
    if (whole === 0) return 0;
    return Math.round((part / whole * 100) * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
  
  // 利益率計算
  static calculateProfitMargin(revenue, cost) {
    if (revenue === 0) return 0;
    return this.calculatePercentage(revenue - cost, revenue, 2);
  }
  
  // ROI計算
  static calculateROI(profit, investment) {
    if (investment === 0) return 0;
    return this.calculatePercentage(profit, investment, 2);
  }
  
  // リクエストID生成
  static generateRequestId() {
    return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  // ファイルサイズフォーマット
  static formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  // 日時フォーマット（日本時間）
  static formatDateTime(date, format = 'full') {
    const d = new Date(date);
    const options = {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: format === 'full' ? '2-digit' : undefined
    };
    
    return d.toLocaleDateString('ja-JP', options);
  }
  
  // 相対時間表示
  static getRelativeTime(date) {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}秒前`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}日前`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}ヶ月前`;
    return `${Math.floor(diffInSeconds / 31536000)}年前`;
  }
  
  // データクリーニング
  static sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>\"']/g, '').trim();
  }
  
  // 配列のチャンク分割
  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  // リトライ処理
  static async retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i === maxRetries) break;
        
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw lastError;
  }
  
  // キャッシュキー生成
  static generateCacheKey(prefix, ...parts) {
    const key = parts
      .map(part => typeof part === 'object' ? JSON.stringify(part) : String(part))
      .join(':');
    return `${prefix}:${crypto.createHash('md5').update(key).digest('hex')}`;
  }
  
  // URL検証
  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // メール形式検証
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // 日本語文字検出
  static containsJapanese(str) {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(str);
  }
  
  // 深いオブジェクトマージ
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  // レスポンス標準化
  static createResponse(success, data = null, message = '', errors = []) {
    return {
      success,
      timestamp: new Date().toISOString(),
      data,
      message,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  // ページネーション計算
  static calculatePagination(totalItems, currentPage, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const hasNext = currentPage < totalPages;
    const hasPrevious = currentPage > 1;
    
    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNext,
      hasPrevious,
      nextPage: hasNext ? currentPage + 1 : null,
      previousPage: hasPrevious ? currentPage - 1 : null
    };
  }
}

module.exports = Helpers;