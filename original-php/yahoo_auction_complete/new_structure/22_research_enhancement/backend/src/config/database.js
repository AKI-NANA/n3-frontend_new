// src/config/database.js - データベース接続設定
const { Pool } = require('pg');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// PostgreSQL 接続プール設定
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'research_tool',
  user: process.env.DB_USER || 'research_user',
  password: process.env.DB_PASSWORD || 'secure_password_2024',
  
  // 接続プール設定
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  min: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
  
  // SSL設定 (本番環境)
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false' ? {
    rejectUnauthorized: false
  } : false,
  
  // その他設定
  application_name: 'research_tool_backend',
  statement_timeout: 30000,
  query_timeout: 30000
};

// PostgreSQL プール作成
const pool = new Pool(poolConfig);

// 接続エラーハンドリング
pool.on('error', (err, client) => {
  logger.error('PostgreSQL pool error', {
    error: err.message,
    stack: err.stack,
    client: client ? 'with client' : 'without client'
  });
});

pool.on('connect', (client) => {
  logger.debug('PostgreSQL client connected', {
    processID: client.processID,
    database: poolConfig.database
  });
});

pool.on('acquire', (client) => {
  logger.debug('PostgreSQL client acquired from pool', {
    processID: client.processID
  });
});

pool.on('remove', (client) => {
  logger.debug('PostgreSQL client removed from pool', {
    processID: client.processID
  });
});

// Redis 設定
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  
  // 接続設定
  connectTimeout: 10000,
  lazyConnect: true,
  
  // 再接続設定
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  
  // クラスター設定（将来対応）
  enableOfflineQueue: false
};

// Redis インスタンス作成
const redis = new Redis(redisConfig);

// Redis イベントハンドリング
redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('Redis ready for commands');
});

redis.on('error', (error) => {
  logger.error('Redis connection error', {
    error: error.message,
    code: error.code,
    errno: error.errno
  });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', (delay) => {
  logger.info(`Redis reconnecting in ${delay}ms`);
});

redis.on('end', () => {
  logger.warn('Redis connection ended');
});

// データベースヘルパー関数
class DatabaseHelper {
  // トランザクション実行
  static async transaction(queries) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed', {
        error: error.message,
        queries: queries.length
      });
      throw error;
      
    } finally {
      client.release();
    }
  }
  
  // バルクインサート
  static async bulkInsert(tableName, columns, values, options = {}) {
    if (!values.length) return [];
    
    const {
      onConflict = '',
      returning = '*'
    } = options;
    
    const placeholders = values.map((_, index) => {
      const start = index * columns.length + 1;
      const end = start + columns.length;
      return `(${Array.from({length: columns.length}, (_, i) => `${start + i}`).join(', ')})`;
    }).join(', ');
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
      ${onConflict}
      ${returning ? `RETURNING ${returning}` : ''}
    `;
    
    const flatValues = values.flat();
    
    try {
      const result = await pool.query(query, flatValues);
      return result.rows;
    } catch (error) {
      logger.error('Bulk insert failed', {
        table: tableName,
        columns: columns.length,
        rows: values.length,
        error: error.message
      });
      throw error;
    }
  }
  
  // ページネーション付きクエリ
  static async paginate(baseQuery, params, page = 1, limit = 50, countQuery = null) {
    const offset = (page - 1) * limit;
    
    // データ取得
    const dataQuery = `${baseQuery} LIMIT ${params.length + 1} OFFSET ${params.length + 2}`;
    const dataResult = await pool.query(dataQuery, [...params, limit, offset]);
    
    // 総件数取得
    let totalCount = 0;
    if (countQuery) {
      const countResult = await pool.query(countQuery, params);
      totalCount = parseInt(countResult.rows[0].count);
    }
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      data: dataResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }
}

// Redis ヘルパー関数
class RedisHelper {
  // キャッシュ設定（TTL付き）
  static async setCache(key, value, ttlSeconds = 900) {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serializedValue);
      logger.debug('Cache set', { key, ttl: ttlSeconds });
    } catch (error) {
      logger.warn('Cache set failed', { key, error: error.message });
    }
  }
  
  // キャッシュ取得
  static async getCache(key) {
    try {
      const value = await redis.get(key);
      if (value) {
        logger.debug('Cache hit', { key });
        return JSON.parse(value);
      }
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.warn('Cache get failed', { key, error: error.message });
      return null;
    }
  }
  
  // キャッシュ削除
  static async deleteCache(key) {
    try {
      const result = await redis.del(key);
      logger.debug('Cache deleted', { key, existed: result > 0 });
      return result;
    } catch (error) {
      logger.warn('Cache delete failed', { key, error: error.message });
      return 0;
    }
  }
  
  // パターンマッチでキャッシュ削除
  static async deleteCachePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const result = await redis.del(...keys);
        logger.debug('Cache pattern deleted', { pattern, count: result });
        return result;
      }
      return 0;
    } catch (error) {
      logger.warn('Cache pattern delete failed', { pattern, error: error.message });
      return 0;
    }
  }
  
  // レート制限チェック
  static async checkRateLimit(key, limit, windowSeconds) {
    try {
      const multi = redis.multi();
      multi.incr(key);
      multi.expire(key, windowSeconds);
      const results = await multi.exec();
      
      const count = results[0][1];
      return {
        allowed: count <= limit,
        count,
        remaining: Math.max(0, limit - count),
        resetTime: Math.floor(Date.now() / 1000) + windowSeconds
      };
    } catch (error) {
      logger.warn('Rate limit check failed', { key, error: error.message });
      return { allowed: true, count: 0, remaining: limit, resetTime: 0 };
    }
  }
  
  // セッション管理
  static async setSession(sessionId, data, ttlSeconds = 3600 * 24 * 7) {
    try {
      const key = `session:${sessionId}`;
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.warn('Session set failed', { sessionId, error: error.message });
      return false;
    }
  }
  
  static async getSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('Session get failed', { sessionId, error: error.message });
      return null;
    }
  }
  
  static async deleteSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      return await redis.del(key);
    } catch (error) {
      logger.warn('Session delete failed', { sessionId, error: error.message });
      return 0;
    }
  }
}

// 接続テスト関数
async function testConnections() {
  try {
    // PostgreSQL テスト
    const pgResult = await pool.query('SELECT NOW() as current_time, version()');
    logger.info('PostgreSQL connection test successful', {
      currentTime: pgResult.rows[0].current_time,
      version: pgResult.rows[0].version.split(' ').slice(0, 2).join(' ')
    });
    
    // Redis テスト
    const redisResult = await redis.ping();
    if (redisResult === 'PONG') {
      logger.info('Redis connection test successful');
    }
    
    return { postgresql: true, redis: true };
    
  } catch (error) {
    logger.error('Database connection test failed', error);
    throw error;
  }
}

// 接続統計取得
async function getConnectionStats() {
  try {
    return {
      postgresql: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      },
      redis: {
        status: redis.status,
        options: {
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db
        }
      }
    };
  } catch (error) {
    logger.error('Failed to get connection stats', error);
    return null;
  }
}

module.exports = {
  pool,
  redis,
  DatabaseHelper,
  RedisHelper,
  testConnections,
  getConnectionStats
};