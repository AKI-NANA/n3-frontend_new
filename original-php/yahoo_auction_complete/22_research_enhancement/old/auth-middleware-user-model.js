// src/models/User.js - ユーザーモデル
const { pool, DatabaseHelper } = require('../config/database');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const bcrypt = require('bcryptjs');

class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.uuid = data.uuid || null;
    this.email = data.email || null;
    this.passwordHash = data.password_hash || data.passwordHash || null;
    this.subscriptionPlan = data.subscription_plan || data.subscriptionPlan || 'free';
    this.apiQuotaDaily = data.api_quota_daily || data.apiQuotaDaily || 1000;
    this.apiQuotaRemaining = data.api_quota_remaining || data.apiQuotaRemaining || 1000;
    this.lastQuotaReset = data.last_quota_reset || data.lastQuotaReset || null;
    this.emailVerified = data.email_verified || data.emailVerified || false;
    this.isActive = data.is_active || data.isActive || true;
    this.settings = data.settings || {};
    this.createdAt = data.created_at || data.createdAt || null;
    this.updatedAt = data.updated_at || data.updatedAt || null;
  }
  
  // バリデーション
  validate() {
    const errors = [];
    
    if (!this.email || !Helpers.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }
    
    if (!this.passwordHash) {
      errors.push('Password is required');
    }
    
    if (!['free', 'standard', 'premium'].includes(this.subscriptionPlan)) {
      errors.push('Invalid subscription plan');
    }
    
    return errors;
  }
  
  // パスワード設定
  async setPassword(plainPassword) {
    if (plainPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    this.passwordHash = await Helpers.hashPassword(plainPassword);
  }
  
  // パスワード確認
  async verifyPassword(plainPassword) {
    return await Helpers.verifyPassword(plainPassword, this.passwordHash);
  }
  
  // クォータリセット
  async resetQuota() {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.lastQuotaReset !== today) {
      const quotas = {
        free: 1000,
        standard: 10000,
        premium: 100000
      };
      
      this.apiQuotaRemaining = quotas[this.subscriptionPlan] || 1000;
      this.lastQuotaReset = today;
      
      if (this.id) {
        await this.update();
      }
    }
  }
  
  // クォータ消費
  async consumeQuota(amount = 1) {
    await this.resetQuota();
    
    if (this.apiQuotaRemaining < amount) {
      throw new Error('API quota exceeded');
    }
    
    this.apiQuotaRemaining -= amount;
    
    if (this.id) {
      const query = `
        UPDATE users 
        SET api_quota_remaining = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `;
      await pool.query(query, [this.apiQuotaRemaining, this.id]);
    }
    
    return this.apiQuotaRemaining;
  }
  
  // 新規作成
  async create() {
    const errors = this.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    // メール重複チェック
    const existingUser = await User.findByEmail(this.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    const query = `
      INSERT INTO users (
        email, password_hash, subscription_plan, api_quota_daily,
        api_quota_remaining, last_quota_reset, email_verified, is_active, settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const today = new Date().toISOString().split('T')[0];
    const values = [
      this.email, this.passwordHash, this.subscriptionPlan,
      this.apiQuotaDaily, this.apiQuotaRemaining, today,
      this.emailVerified, this.isActive, JSON.stringify(this.settings)
    ];
    
    try {
      const result = await pool.query(query, values);
      Object.assign(this, result.rows[0]);
      
      logger.info('User created successfully', {
        userId: this.id,
        email: this.email,
        subscriptionPlan: this.subscriptionPlan
      });
      
      return this;
    } catch (error) {
      logger.error('User creation failed', {
        email: this.email,
        error: error.message
      });
      throw error;
    }
  }
  
  // 更新
  async update() {
    const query = `
      UPDATE users SET
        email = $2, subscription_plan = $3, api_quota_daily = $4,
        api_quota_remaining = $5, last_quota_reset = $6, email_verified = $7,
        is_active = $8, settings = $9
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      this.id, this.email, this.subscriptionPlan, this.apiQuotaDaily,
      this.apiQuotaRemaining, this.lastQuotaReset, this.emailVerified,
      this.isActive, JSON.stringify(this.settings)
    ];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('User not found for update');
      }
      
      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      logger.error('User update failed', {
        userId: this.id,
        error: error.message
      });
      throw error;
    }
  }
  
  // メール検索
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    
    try {
      const result = await pool.query(query, [email]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      logger.error('User findByEmail failed', { email, error: error.message });
      throw error;
    }
  }
  
  // ID検索
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      logger.error('User findById failed', { id, error: error.message });
      throw error;
    }
  }
  
  // UUID検索
  static async findByUuid(uuid) {
    const query = 'SELECT * FROM users WHERE uuid = $1 AND is_active = true';
    
    try {
      const result = await pool.query(query, [uuid]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      logger.error('User findByUuid failed', { uuid, error: error.message });
      throw error;
    }
  }
  
  // JSON変換（パスワードハッシュ除外）
  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      email: this.email,
      subscriptionPlan: this.subscriptionPlan,
      apiQuota: {
        daily: this.apiQuotaDaily,
        remaining: this.apiQuotaRemaining,
        lastReset: this.lastQuotaReset
      },
      emailVerified: this.emailVerified,
      isActive: this.isActive,
      settings: this.settings,
      timestamps: {
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      }
    };
  }
}

module.exports = User;

// src/middleware/auth.js - 認証ミドルウェア
const jwt = require('jsonwebtoken');
const { RedisHelper } = require('../config/database');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const User = require('../models/User');

class AuthMiddleware {
  // JWTトークン生成
  static generateToken(user) {
    const payload = {
      userId: user.id,
      uuid: user.uuid,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const options = {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'research-tool-backend',
      audience: 'research-tool-users'
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, options);
  }
  
  // JWTトークン検証
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'research-tool-backend',
        audience: 'research-tool-users'
      });
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }
  
  // 認証必須ミドルウェア
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(
          Helpers.createResponse(false, null, 'Authentication required')
        );
      }
      
      const token = authHeader.substring(7);
      
      // ブラックリストチェック
      const isBlacklisted = await RedisHelper.getCache(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json(
          Helpers.createResponse(false, null, 'Token has been revoked')
        );
      }
      
      // トークン検証
      const decoded = AuthMiddleware.verifyToken(token);
      
      // ユーザー存在確認
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json(
          Helpers.createResponse(false, null, 'User not found')
        );
      }
      
      // クォータリセット
      await user.resetQuota();
      
      // リクエストにユーザー情報追加
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;
      
      next();
      
    } catch (error) {
      logger.logSecurity('authentication_failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error.message
      });
      
      return res.status(401).json(
        Helpers.createResponse(false, null, 'Authentication failed')
      );
    }
  }
  
  // 任意認証ミドルウェア（認証情報があれば設定）
  static async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = AuthMiddleware.verifyToken(token);
        const user = await User.findById(decoded.userId);
        
        if (user) {
          await user.resetQuota();
          req.user = user;
          req.token = token;
          req.tokenPayload = decoded;
        }
      }
      
      next();
      
    } catch (error) {
      // 任意認証では エラーがあっても続行
      next();
    }
  }
  
  // サブスクリプションレベル確認
  static requireSubscription(requiredPlan) {
    const planLevels = { free: 0, standard: 1, premium: 2 };
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json(
          Helpers.createResponse(false, null, 'Authentication required')
        );
      }
      
      const userLevel = planLevels[req.user.subscriptionPlan] || 0;
      const requiredLevel = planLevels[requiredPlan] || 0;
      
      if (userLevel < requiredLevel) {
        return res.status(403).json(
          Helpers.createResponse(false, null, `${requiredPlan} subscription required`)
        );
      }
      
      next();
    };
  }
  
  // API クォータ確認
  static async checkQuota(req, res, next) {
    if (!req.user) {
      return next();
    }
    
    try {
      await req.user.resetQuota();
      
      if (req.user.apiQuotaRemaining <= 0) {
        logger.logBusinessMetric('quota_exceeded', 1, {
          userId: req.user.id,
          subscriptionPlan: req.user.subscriptionPlan
        });
        
        return res.status(429).json(
          Helpers.createResponse(false, null, 'API quota exceeded', [], {
            quotaRemaining: 0,
            quotaResetDate: new Date().toISOString().split('T')[0]
          })
        );
      }
      
      next();
      
    } catch (error) {
      logger.error('Quota check failed', {
        userId: req.user?.id,
        error: error.message
      });
      next();
    }
  }
  
  // 管理者権限確認
  static requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json(
        Helpers.createResponse(false, null, 'Authentication required')
      );
    }
    
    // 管理者判定ロジック（settings内のroleで判定）
    const isAdmin = req.user.settings?.role === 'admin';
    
    if (!isAdmin) {
      logger.logSecurity('unauthorized_admin_access', {
        userId: req.user.id,
        ip: req.ip,
        path: req.path
      });
      
      return res.status(403).json(
        Helpers.createResponse(false, null, 'Admin access required')
      );
    }
    
    next();
  }
  
  // トークン無効化（ログアウト）
  static async blacklistToken(token) {
    try {
      const decoded = AuthMiddleware.verifyToken(token);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (expiresIn > 0) {
        await RedisHelper.setCache(`blacklist:${token}`, true, expiresIn);
      }
      
      return true;
    } catch (error) {
      logger.warn('Token blacklist failed', { error: error.message });
      return false;
    }
  }
}

module.exports = AuthMiddleware;