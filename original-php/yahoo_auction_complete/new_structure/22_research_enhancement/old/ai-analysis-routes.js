// src/routes/aiAnalysisRoutes.js - AI分析ルート
const express = require('express');
const AIAnalysisController = require('../controllers/aiAnalysisController');
const { validateRequestSize } = require('../validators/analysisValidator');
const { authenticate, authorize } = require('../middleware/auth');
const { RateLimiter } = require('../middleware/rateLimiter');
const { requestLogger, errorHandler } = require('../middleware/logging');

const router = express.Router();
const controller = new AIAnalysisController();
const rateLimiter = new RateLimiter();

// ミドルウェア設定
router.use(requestLogger);
router.use(validateRequestSize);
router.use(authenticate); // JWT認証必須

// AI分析エンドポイント

/**
 * @route   POST /api/ai-analysis/analyze
 * @desc    単一商品の AI分析
 * @access  Private (認証済みユーザー)
 */
router.post('/analyze', 
  rateLimiter.createMiddleware('singleAnalysis'),
  controller.analyzeProduct.bind(controller)
);

/**
 * @route   POST /api/ai-analysis/batch-analyze
 * @desc    複数商品のバッチ AI分析
 * @access  Private (認証済みユーザー)
 */
router.post('/batch-analyze',
  rateLimiter.createMiddleware('batchAnalysis'),
  controller.batchAnalyze.bind(controller)
);

/**
 * @route   GET /api/ai-analysis/opportunities
 * @desc    市場機会検出
 * @access  Private (認証済みユーザー)
 */
router.get('/opportunities',
  rateLimiter.createMiddleware('opportunityDetection'),
  controller.detectOpportunities.bind(controller)
);

/**
 * @route   GET /api/ai-analysis/history
 * @desc    分析履歴取得
 * @access  Private (認証済みユーザー)
 */
router.get('/history',
  controller.getAnalysisHistory.bind(controller)
);

/**
 * @route   GET /api/ai-analysis/stats
 * @desc    分析統計取得
 * @access  Private (認証済みユーザー)
 */
router.get('/stats',
  controller.getAnalysisStats.bind(controller)
);

/**
 * @route   GET /api/ai-analysis/health
 * @desc    AI分析サービスヘルスチェック
 * @access  Public
 */
router.get('/health',
  controller.healthCheck.bind(controller)
);

// 管理者専用エンドポイント

/**
 * @route   POST /api/ai-analysis/admin/reset-limits/:userId
 * @desc    ユーザーのレート制限リセット（管理者）
 * @access  Private (管理者のみ)
 */
router.post('/admin/reset-limits/:userId',
  authorize(['admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { operation } = req.body;
      
      const success = await rateLimiter.resetUserLimits(userId, operation);
      
      res.json({
        success,
        message: success ? 'Limits reset successfully' : 'Failed to reset limits',
        userId,
        operation: operation || 'all'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to reset limits',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/ai-analysis/admin/grant-increase/:userId
 * @desc    一時的制限増加付与（管理者）
 * @access  Private (管理者のみ)
 */
router.post('/admin/grant-increase/:userId',
  authorize(['admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { operation, multiplier, durationSeconds } = req.body;
      
      const success = await rateLimiter.grantTemporaryIncrease(
        userId, 
        operation, 
        multiplier, 
        durationSeconds
      );
      
      res.json({
        success,
        message: success ? 'Temporary increase granted' : 'Failed to grant increase',
        userId,
        operation,
        multiplier,
        duration: durationSeconds
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to grant increase',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ai-analysis/admin/limit-stats/:userId
 * @desc    ユーザーの制限統計取得（管理者）
 * @access  Private (管理者のみ)
 */
router.get('/admin/limit-stats/:userId',
  authorize(['admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { operation } = req.query;
      const userPlan = req.query.userPlan || 'free';
      
      const stats = await rateLimiter.getLimitStats(userId, operation, userPlan);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get limit stats',
        message: error.message
      });
    }
  }
);

// エラーハンドリング
router.use(errorHandler);

module.exports = router;

// =====================================
// src/app.js - Express アプリケーション設定
// =====================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const requestId = require('express-request-id');
const { v4: uuidv4 } = require('uuid');

// ルートインポート
const aiAnalysisRoutes = require('./routes/aiAnalysisRoutes');
const ebayRoutes = require('./routes/ebayRoutes');
const userRoutes = require('./routes/userRoutes');

// ミドルウェアインポート
const { globalErrorHandler } = require('./middleware/errorHandler');
const { securityMiddleware } = require('./middleware/security');
const { loggingMiddleware } = require('./middleware/logging');

const app = express();

// 基本的なセキュリティ設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS設定
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// リクエストID生成
app.use(requestId({
  generator: () => uuidv4()
}));

// 基本ミドルウェア
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// グローバルレート制限
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // リクエスト数
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // ヘルスチェックは除外
    return req.path === '/health' || req.path === '/api/health';
  }
});

app.use(globalRateLimit);

// ログ設定
app.use(loggingMiddleware);

// セキュリティミドルウェア
app.use(securityMiddleware);

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API ルート設定
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/ebay', ebayRoutes);
app.use('/api/users', userRoutes);

// API docs
app.get('/api', (req, res) => {
  res.json({
    message: 'Research Tool API',
    version: '1.0.0',
    endpoints: {
      ai_analysis: '/api/ai-analysis',
      ebay: '/api/ebay',
      users: '/api/users'
    },
    documentation: '/api/docs'
  });
});

// 静的ファイル提供（本番環境用）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('public'));
  
  // SPA用のfallback
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// 404 エラーハンドリング
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// グローバルエラーハンドラー
app.use(globalErrorHandler);

module.exports = app;

// =====================================
// src/server.js - サーバー起動
// =====================================

const app = require('./app');
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// グレースフルシャットダウン用の変数
let server;

// データベース接続とサーバー起動
async function startServer() {
  try {
    // データベース接続
    await connectDatabase();
    logger.info('Database connected successfully');

    // サーバー起動
    server = app.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Documentation: http://${HOST}:${PORT}/api`);
    });

    // サーバーエラーハンドリング
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });

    // プロセス終了時のクリーンアップ
    setupGracefulShutdown();

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// グレースフルシャットダウン設定
function setupGracefulShutdown() {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // 新しいリクエストの受付停止
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // データベース接続終了
          await disconnectDatabase();
          logger.info('Database connections closed');

          // Redis接続終了（レート制限用）
          // await rateLimiter.cleanup();
          
          logger.info('Graceful shutdown completed');
          process.exit(0);

        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // 30秒後に強制終了
      setTimeout(() => {
        logger.error('Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30000);
    });
  });

  // 未処理の例外をキャッチ
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// サーバー起動
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

// =====================================
// src/middleware/auth.js - 認証ミドルウェア
// =====================================

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT認証ミドルウェア
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // "Bearer " を除去

    // JWT検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // ユーザー情報をリクエストに追加
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      subscriptionPlan: decoded.subscriptionPlan || 'free',
      role: decoded.role || 'user'
    };

    logger.debug('User authenticated', {
      userId: req.user.id,
      email: req.user.email,
      plan: req.user.subscriptionPlan
    });

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
}

// 権限チェックミドルウェア
function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
}

// オプショナル認証（トークンがあれば認証、なくても通す）
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // 認証情報なしで続行
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      subscriptionPlan: decoded.subscriptionPlan || 'free',
      role: decoded.role || 'user'
    };
  } catch (error) {
    // トークンが無効でもエラーにしない
    logger.warn('Optional auth failed:', error.message);
  }

  next();
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};

// =====================================
// src/middleware/logging.js - ログミドルウェア
// =====================================

const logger = require('../utils/logger');

// リクエストログミドルウェア
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // リクエスト情報をログ
  logger.info('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id,
    userId: req.user?.id
  });

  // レスポンス完了時のログ
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.id,
      userId: req.user?.id,
      contentLength: res.get('content-length')
    });
  });

  next();
}

// ログ用ミドルウェア（詳細版）
function loggingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // レスポンス完了時のログ
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      contentLength: res.get('content-length')
    };

    if (res.statusCode >= 400) {
      logger.warn('Request failed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}

// エラーログハンドラー
function errorHandler(err, req, res, next) {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    requestId: req.id,
    userId: req.user?.id,
    ip: req.ip
  });

  // エラーレスポンス
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  requestLogger,
  loggingMiddleware,
  errorHandler
};

// =====================================
// src/middleware/errorHandler.js - グローバルエラーハンドラー
// =====================================

const logger = require('../utils/logger');

// グローバルエラーハンドラー
function globalErrorHandler(err, req, res, next) {
  // すでにレスポンスが送信されている場合はExpressのデフォルトハンドラーに委ねる
  if (res.headersSent) {
    return next(err);
  }

  // エラータイプに応じた処理
  let statusCode = 500;
  let errorType = 'InternalServerError';
  let message = 'An unexpected error occurred';
  let details = null;

  // Validation エラー
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorType = 'ValidationError';
    message = 'Validation failed';
    details = err.details || err.errors;
  }

  // JWT エラー
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorType = 'AuthenticationError';
    message = 'Authentication failed';
  }

  // Database エラー
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    errorType = 'ServiceUnavailable';
    message = 'Service temporarily unavailable';
  }

  // Rate limit エラー
  if (err.status === 429) {
    statusCode = 429;
    errorType = 'RateLimitError';
    message = 'Too many requests';
  }

  // カスタムエラー処理
  if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
    message = err.message;
  }

  // 詳細エラーログ
  logger.error('Application error', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      plan: req.user.subscriptionPlan
    } : null,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });

  // レスポンス構築
  const errorResponse = {
    success: false,
    error: errorType,
    message: message,
    statusCode: statusCode,
    requestId: req.id,
    timestamp: new Date().toISOString()
  };

  // 開発環境では詳細情報を含める
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = details;
    errorResponse.stack = err.stack;
  }

  // 本番環境では内部エラーの詳細を隠す
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = 'Internal server error';
  }

  // レスポンス送信
  res.status(statusCode).json(errorResponse);
}

// 非同期エラーキャッチャー
function asyncCatch(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

module.exports = {
  globalErrorHandler,
  asyncCatch
};

// =====================================
// package.json - 依存関係設定
// =====================================

/*
{
  "name": "research-tool-ai-backend",
  "version": "1.0.0",
  "description": "AI-powered eBay research tool backend",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "build": "npm run lint && npm test",
    "docker:build": "docker build -t research-tool-ai .",
    "docker:run": "docker run -p 3000:3000 research-tool-ai"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-request-id": "^1.4.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.11.0",
    "redis": "^4.6.10",
    "pg": "^8.11.3",
    "mongodb": "^6.2.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "lodash": "^4.17.21",
    "moment": "^2.29.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.54.0",
    "eslint-config-standard": "^17.1.0",
    "prettier": "^3.1.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "keywords": [
    "ebay",
    "research",
    "ai",
    "analysis",
    "e-commerce",
    "dropshipping"
  ],
  "author": "Research Tool Team",
  "license": "MIT"
}
*/

// =====================================
// .env.example - 環境変数テンプレート
// =====================================

/*
# サーバー設定
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# データベース設定
DATABASE_URL=postgresql://username:password@localhost:5432/research_tool
REDIS_URL=redis://localhost:6379

# JWT設定
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# eBay API設定
EBAY_APP_ID=your-ebay-app-id
EBAY_CERT_ID=your-ebay-cert-id
EBAY_DEV_ID=your-ebay-dev-id
EBAY_USER_TOKEN=your-ebay-user-token

# Amazon API設定
AMAZON_ACCESS_KEY=your-amazon-access-key
AMAZON_SECRET_KEY=your-amazon-secret-key
AMAZON_ASSOCIATE_TAG=your-associate-tag

# 楽天API設定
RAKUTEN_APP_ID=your-rakuten-app-id
RAKUTEN_AFFILIATE_ID=your-affiliate-id

# Google API設定
GOOGLE_API_KEY=your-google-api-key

# フロントエンド設定
FRONTEND_URL=http://localhost:3000

# ログ設定
LOG_LEVEL=info
LOG_FORMAT=json

# メール設定（通知用）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 監視・メトリクス
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_PORT=9090
*/