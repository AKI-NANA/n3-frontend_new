// src/middleware/rateLimiter.js - レート制限ミドルウェア
const redis = require('redis');
const logger = require('../utils/logger');

class RateLimiter {
  constructor(config = {}) {
    this.config = {
      singleAnalysis: { requests: 100, window: 3600 }, // 100 requests per hour
      batchAnalysis: { requests: 10, window: 3600 },   // 10 requests per hour
      opportunityDetection: { requests: 20, window: 3600 }, // 20 requests per hour
      ...config
    };

    // プラン別制限
    this.planLimits = {
      free: {
        singleAnalysis: { requests: 10, window: 3600 },    // 10/hour
        batchAnalysis: { requests: 2, window: 3600 },      // 2/hour
        opportunityDetection: { requests: 5, window: 3600 } // 5/hour
      },
      standard: {
        singleAnalysis: { requests: 100, window: 3600 },   // 100/hour
        batchAnalysis: { requests: 10, window: 3600 },     // 10/hour
        opportunityDetection: { requests: 20, window: 3600 } // 20/hour
      },
      premium: {
        singleAnalysis: { requests: 500, window: 3600 },   // 500/hour
        batchAnalysis: { requests: 50, window: 3600 },     // 50/hour
        opportunityDetection: { requests: 100, window: 3600 } // 100/hour
      }
    };

    this.redisClient = null;
    this.connected = false;
    this.initialize();
  }

  async initialize() {
    try {
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected for rate limiting');
        this.connected = true;
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis error for rate limiting', { error: err.message });
        this.connected = false;
      });

      await this.redisClient.connect();

    } catch (error) {
      logger.error('Failed to initialize Redis for rate limiting', { error: error.message });
      this.connected = false;
    }
  }

  // レート制限チェック
  async checkLimit(userId, operation, userPlan = 'free') {
    try {
      if (!this.connected) {
        // Redis未接続時は制限なしで通す（フォールバック）
        logger.warn('Rate limiter: Redis not connected, allowing request');
        return {
          allowed: true,
          remaining: 999,
          reset: Date.now() + 3600000,
          limit: 999
        };
      }

      const limits = this.getPlanLimits(userPlan, operation);
      const key = this.generateKey(userId, operation);
      const window = limits.window;
      const maxRequests = limits.requests;

      // スライディングウィンドウログを使用
      const result = await this.slidingWindowLog(key, window, maxRequests);

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          userId,
          operation,
          userPlan,
          requests: result.requests,
          limit: maxRequests
        });
      }

      return {
        allowed: result.allowed,
        remaining: Math.max(0, maxRequests - result.requests),
        reset: result.reset,
        limit: maxRequests,
        requests: result.requests
      };

    } catch (error) {
      logger.error('Rate limit check failed', {
        userId,
        operation,
        error: error.message
      });

      // エラー時は制限なしで通す
      return {
        allowed: true,
        remaining: 999,
        reset: Date.now() + 3600000,
        limit: 999
      };
    }
  }

  // スライディングウィンドウログ実装
  async slidingWindowLog(key, windowSize, maxRequests) {
    const now = Date.now();
    const windowStart = now - (windowSize * 1000);

    const pipeline = this.redisClient.multi();

    // 期限切れエントリの削除
    pipeline.zremrangebyscore(key, 0, windowStart);

    // 現在の リクエスト数取得
    pipeline.zcard(key);

    // 新しいリクエストを追加
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // TTL設定
    pipeline.expire(key, windowSize + 60); // 少し余分に設定

    const results = await pipeline.exec();

    const currentRequests = results[1][1]; // zcard の結果
    const allowed = currentRequests < maxRequests;

    return {
      allowed,
      requests: currentRequests + 1, // 新しく追加した分も含む
      reset: now + (windowSize * 1000)
    };
  }

  // 固定ウィンドウ実装（軽量版）
  async fixedWindow(key, windowSize, maxRequests) {
    const now = Date.now();
    const window = Math.floor(now / (windowSize * 1000));
    const windowKey = `${key}:${window}`;

    const pipeline = this.redisClient.multi();
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, windowSize + 60);

    const results = await pipeline.exec();
    const requests = results[0][1];

    const reset = (window + 1) * windowSize * 1000;

    return {
      allowed: requests <= maxRequests,
      requests,
      reset
    };
  }

  // プラン別制限取得
  getPlanLimits(userPlan, operation) {
    const planConfig = this.planLimits[userPlan] || this.planLimits.free;
    return planConfig[operation] || this.config[operation];
  }

  // Redisキー生成
  generateKey(userId, operation) {
    return `rate_limit:${operation}:${userId}`;
  }

  // バースト制限チェック
  async checkBurstLimit(userId, operation, userPlan = 'free') {
    try {
      const burstLimits = {
        free: { requests: 5, window: 60 },      // 5 requests per minute
        standard: { requests: 20, window: 60 }, // 20 requests per minute
        premium: { requests: 50, window: 60 }   // 50 requests per minute
      };

      const limits = burstLimits[userPlan] || burstLimits.free;
      const key = `burst_limit:${operation}:${userId}`;

      const result = await this.fixedWindow(key, limits.window, limits.requests);

      return {
        allowed: result.allowed,
        remaining: Math.max(0, limits.requests - result.requests),
        reset: result.reset,
        limit: limits.requests
      };

    } catch (error) {
      logger.error('Burst limit check failed', { error: error.message });
      return { allowed: true, remaining: 999, reset: Date.now() + 60000, limit: 999 };
    }
  }

  // IP アドレス制限
  async checkIPLimit(ipAddress, operation) {
    try {
      const ipLimits = {
        singleAnalysis: { requests: 1000, window: 3600 },     // 1000/hour per IP
        batchAnalysis: { requests: 100, window: 3600 },       // 100/hour per IP
        opportunityDetection: { requests: 200, window: 3600 } // 200/hour per IP
      };

      const limits = ipLimits[operation] || { requests: 100, window: 3600 };
      const key = `ip_limit:${operation}:${ipAddress}`;

      const result = await this.fixedWindow(key, limits.window, limits.requests);

      return {
        allowed: result.allowed,
        remaining: Math.max(0, limits.requests - result.requests),
        reset: result.reset,
        limit: limits.requests
      };

    } catch (error) {
      logger.error('IP limit check failed', { error: error.message });
      return { allowed: true, remaining: 999, reset: Date.now() + 3600000, limit: 999 };
    }
  }

  // グローバル制限チェック（システム保護）
  async checkGlobalLimit(operation) {
    try {
      const globalLimits = {
        singleAnalysis: { requests: 10000, window: 3600 },     // 10K/hour globally
        batchAnalysis: { requests: 1000, window: 3600 },       // 1K/hour globally
        opportunityDetection: { requests: 2000, window: 3600 } // 2K/hour globally
      };

      const limits = globalLimits[operation] || { requests: 5000, window: 3600 };
      const key = `global_limit:${operation}`;

      const result = await this.fixedWindow(key, limits.window, limits.requests);

      if (!result.allowed) {
        logger.error('Global rate limit exceeded', {
          operation,
          requests: result.requests,
          limit: limits.requests
        });
      }

      return {
        allowed: result.allowed,
        remaining: Math.max(0, limits.requests - result.requests),
        reset: result.reset,
        limit: limits.requests
      };

    } catch (error) {
      logger.error('Global limit check failed', { error: error.message });
      return { allowed: true, remaining: 999, reset: Date.now() + 3600000, limit: 999 };
    }
  }

  // 制限統計取得
  async getLimitStats(userId, operation, userPlan = 'free') {
    try {
      const limits = this.getPlanLimits(userPlan, operation);
      const key = this.generateKey(userId, operation);
      const now = Date.now();
      const windowStart = now - (limits.window * 1000);

      // 現在のウィンドウでのリクエスト数
      const requests = await this.redisClient.zcount(key, windowStart, now);

      // 最近のリクエストタイムスタンプ取得
      const recentRequests = await this.redisClient.zrevrange(key, 0, 9, 'WITHSCORES');

      const stats = {
        operation,
        userPlan,
        currentRequests: requests,
        maxRequests: limits.requests,
        windowSize: limits.window,
        remaining: Math.max(0, limits.requests - requests),
        resetTime: now + (limits.window * 1000),
        recentActivity: recentRequests.map((item, index) => {
          if (index % 2 === 1) return parseInt(item); // スコア（タイムスタンプ）のみ
        }).filter(Boolean).slice(0, 5)
      };

      return stats;

    } catch (error) {
      logger.error('Failed to get limit stats', { error: error.message });
      return null;
    }
  }

  // 制限リセット（管理者用）
  async resetUserLimits(userId, operation = null) {
    try {
      if (operation) {
        const key = this.generateKey(userId, operation);
        await this.redisClient.del(key);
      } else {
        // 全オペレーションのリセット
        const operations = ['singleAnalysis', 'batchAnalysis', 'opportunityDetection'];
        const keys = operations.map(op => this.generateKey(userId, op));
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      }

      logger.info('User rate limits reset', { userId, operation });
      return true;

    } catch (error) {
      logger.error('Failed to reset user limits', {
        userId,
        operation,
        error: error.message
      });
      return false;
    }
  }

  // 一時的制限増加（プロモーション用）
  async grantTemporaryIncrease(userId, operation, multiplier, durationSeconds) {
    try {
      const key = `temp_increase:${operation}:${userId}`;
      const data = {
        multiplier,
        expiresAt: Date.now() + (durationSeconds * 1000)
      };

      await this.redisClient.setex(key, durationSeconds, JSON.stringify(data));

      logger.info('Temporary rate limit increase granted', {
        userId,
        operation,
        multiplier,
        duration: durationSeconds
      });

      return true;

    } catch (error) {
      logger.error('Failed to grant temporary increase', {
        userId,
        operation,
        error: error.message
      });
      return false;
    }
  }

  // 一時的制限増加チェック
  async checkTemporaryIncrease(userId, operation) {
    try {
      const key = `temp_increase:${operation}:${userId}`;
      const data = await this.redisClient.get(key);

      if (!data) return 1; // デフォルト倍率

      const increase = JSON.parse(data);
      if (Date.now() > increase.expiresAt) {
        await this.redisClient.del(key);
        return 1;
      }

      return increase.multiplier;

    } catch (error) {
      logger.error('Failed to check temporary increase', { error: error.message });
      return 1;
    }
  }

  // ミドルウェア関数生成
  createMiddleware(operation) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id || req.ip;
        const userPlan = req.user?.subscriptionPlan || 'free';
        const ipAddress = req.ip;

        // 複数レベルでのチェック
        const [userLimit, burstLimit, ipLimit, globalLimit] = await Promise.all([
          this.checkLimit(userId, operation, userPlan),
          this.checkBurstLimit(userId, operation, userPlan),
          this.checkIPLimit(ipAddress, operation),
          this.checkGlobalLimit(operation)
        ]);

        // いずれかの制限に引っかかった場合
        if (!userLimit.allowed || !burstLimit.allowed || !ipLimit.allowed || !globalLimit.allowed) {
          const limitInfo = {
            user: userLimit,
            burst: burstLimit,
            ip: ipLimit,
            global: globalLimit
          };

          // 最も制限が厳しいものを特定
          let primaryLimit = userLimit;
          let limitType = 'user';

          if (!burstLimit.allowed) {
            primaryLimit = burstLimit;
            limitType = 'burst';
          } else if (!ipLimit.allowed) {
            primaryLimit = ipLimit;
            limitType = 'ip';
          } else if (!globalLimit.allowed) {
            primaryLimit = globalLimit;
            limitType = 'global';
          }

          res.set({
            'X-RateLimit-Limit': primaryLimit.limit,
            'X-RateLimit-Remaining': primaryLimit.remaining,
            'X-RateLimit-Reset': new Date(primaryLimit.reset).toISOString(),
            'X-RateLimit-Type': limitType
          });

          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            type: limitType,
            limit: primaryLimit.limit,
            remaining: primaryLimit.remaining,
            reset: primaryLimit.reset,
            retryAfter: Math.ceil((primaryLimit.reset - Date.now()) / 1000),
            details: limitInfo
          });
        }

        // 成功時のヘッダー設定
        res.set({
          'X-RateLimit-Limit': userLimit.limit,
          'X-RateLimit-Remaining': userLimit.remaining,
          'X-RateLimit-Reset': new Date(userLimit.reset).toISOString()
        });

        next();

      } catch (error) {
        logger.error('Rate limiter middleware error', {
          operation,
          error: error.message,
          userId: req.user?.id,
          ip: req.ip
        });

        // エラー時は制限なしで通す
        next();
      }
    };
  }

  // 接続確認
  async isConnected() {
    try {
      if (!this.redisClient) return false;
      await this.redisClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  // クリーンアップ
  async cleanup() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        logger.info('Rate limiter Redis connection closed');
      }
    } catch (error) {
      logger.error('Rate limiter cleanup error', { error: error.message });
    }
  }
}

module.exports = { RateLimiter };