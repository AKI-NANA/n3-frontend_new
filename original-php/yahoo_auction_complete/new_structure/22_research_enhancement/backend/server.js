// server.js - Express Server メインファイル
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// 内部モジュール
const logger = require('./src/utils/logger');
const { pool, redis } = require('./src/config/database');
const errorHandler = require('./src/middleware/errorHandler');
const authMiddleware = require('./src/middleware/auth');
const validationMiddleware = require('./src/middleware/validation');
const apiUsageLogger = require('./src/middleware/apiUsageLogger');

// ルーター
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const productRoutes = require('./src/routes/products');
const researchRoutes = require('./src/routes/research');
const supplierRoutes = require('./src/routes/suppliers');
const profitRoutes = require('./src/routes/profits');
const systemRoutes = require('./src/routes/system');

// アプリケーション初期化
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ログディレクトリ作成
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 基本セキュリティ設定
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://svcs.ebay.com"],
    },
  }
}));

// CORS設定
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
    ];
    
    if (NODE_ENV === 'development' || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
};

app.use(cors(corsOptions));

// 圧縮
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

// ボディパーサー
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTPアクセスログ
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' }),
  skip: (req, res) => res.statusCode < 400
}));

app.use(morgan('dev', {
  skip: (req, res) => NODE_ENV === 'production'
}));

// レート制限設定
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 最大100リクエスト
  message: {
    error: 'Too many requests from this IP',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(options.statusCode).json(options.message);
  }
});

// リサーチAPI専用レート制限（より厳しく）
const researchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: parseInt(process.env.RATE_LIMIT_RESEARCH_MAX) || 50, // 最大50リクエスト
  message: {
    error: 'Research API rate limit exceeded',
    retryAfter: 900
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// スローダウン設定（レスポンス時間を段階的に延長）
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15分
  delayAfter: 50, // 50リクエスト後からdelay開始
  delayMs: 500, // 最初500ms delay
  maxDelayMs: 10000, // 最大10秒delay
  skipFailedRequests: true
});

app.use('/api', generalLimiter);
app.use('/api', speedLimiter);

// ヘルスチェックエンドポイント（レート制限対象外）
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV
  });
});

// 詳細ヘルスチェック
app.get('/api/health', async (req, res) => {
  try {
    // データベース接続確認
    const dbResult = await pool.query('SELECT NOW()');
    const dbHealthy = dbResult.rows.length > 0;

    // Redis接続確認
    let redisHealthy = false;
    try {
      const pong = await redis.ping();
      redisHealthy = pong === 'PONG';
    } catch (error) {
      logger.warn('Redis health check failed', error);
    }

    const healthStatus = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: NODE_ENV,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

// APIルートの設定
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware.authenticate, userRoutes);
app.use('/api/products', authMiddleware.authenticate, productRoutes);
app.use('/api/research', authMiddleware.authenticate, researchLimiter, researchRoutes);
app.use('/api/suppliers', authMiddleware.authenticate, supplierRoutes);
app.use('/api/profits', authMiddleware.authenticate, profitRoutes);
app.use('/api/system', systemRoutes);

// API使用ログ記録（認証後）
app.use('/api', apiUsageLogger);

// 静的ファイル配信（開発時のみ）
if (NODE_ENV === 'development') {
  app.use('/docs', express.static(path.join(__dirname, 'docs')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// 404ハンドラー
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// エラーハンドリング
app.use(errorHandler);

// グレースフルシャットダウン
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  const server = app.listen(PORT);
  
  server.close(async (err) => {
    if (err) {
      logger.error('Error during server shutdown', err);
      process.exit(1);
    }

    try {
      // データベース接続を閉じる
      await pool.end();
      logger.info('Database connections closed');

      // Redis接続を閉じる
      await redis.quit();
      logger.info('Redis connection closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  });

  // 強制終了タイムアウト
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
};

// シグナルハンドリング
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 予期しないエラーハンドリング
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// サーバー起動
const server = app.listen(PORT, () => {
  logger.info(`🚀 Research Tool Backend API Server started`, {
    port: PORT,
    environment: NODE_ENV,
    processId: process.pid,
    timestamp: new Date().toISOString()
  });
  
  // 開発時の便利情報
  if (NODE_ENV === 'development') {
    console.log(`\n📋 Development Server Info:`);
    console.log(`   🌐 API Server: http://localhost:${PORT}`);
    console.log(`   📊 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`   📚 API Docs: http://localhost:${PORT}/docs (if available)`);
    console.log(`   🔍 Database: PostgreSQL on localhost:5432`);
    console.log(`   🔴 Redis: localhost:6379`);
    console.log(`   📝 Logs: ${logsDir}\n`);
  }
});

// サーバーのタイムアウト設定
server.timeout = 30000; // 30秒
server.keepAliveTimeout = 65000; // 65秒
server.headersTimeout = 66000; // 66秒

module.exports = app;