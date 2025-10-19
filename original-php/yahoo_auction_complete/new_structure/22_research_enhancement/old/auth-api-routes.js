// src/routes/auth.js - 認証APIルート
const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const User = require('../models/User');
const AuthMiddleware = require('../middleware/auth');
const { RedisHelper } = require('../config/database');

// バリデーションエラーハンドラー
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      Helpers.createResponse(false, null, 'Validation failed', errors.array())
    );
  }
  next();
};

// 認証専用レート制限
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10, // 最大10回試行
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 登録専用レート制限
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 5, // 最大5回登録試行
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later'
  }
});

// ユーザー登録
router.post('/register',
  registerLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
      .isLength({ max: 255 })
      .withMessage('Email is too long'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be 8-128 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match');
        }
        return true;
      }),
    
    body('subscriptionPlan')
      .optional()
      .isIn(['free', 'standard', 'premium'])
      .withMessage('Invalid subscription plan'),
    
    body('agreeToTerms')
      .isBoolean()
      .custom(value => {
        if (!value) {
          throw new Error('You must agree to the terms of service');
        }
        return true;
      })
  ],
  handleValidationErrors,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    
    try {
      const { email, password, subscriptionPlan = 'free' } = req.body;
      
      logger.info('User registration attempt', {
        requestId,
        email,
        subscriptionPlan,
        ip: req.ip
      });
      
      // 新規ユーザー作成
      const user = new User({
        email,
        subscriptionPlan,
        emailVerified: false,
        isActive: true,
        settings: {
          language: 'ja',
          currency: 'JPY',
          timezone: 'Asia/Tokyo',
          notifications: {
            email: true,
            browser: false
          }
        }
      });
      
      await user.setPassword(password);
      await user.create();
      
      // JWT トークン生成
      const token = AuthMiddleware.generateToken(user);
      
      // セッション保存
      const sessionData = {
        userId: user.id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        loginTime: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };
      
      await RedisHelper.setSession(user.uuid, sessionData, 7 * 24 * 3600); // 7日間
      
      logger.info('User registered successfully', {
        requestId,
        userId: user.id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan
      });
      
      logger.logBusinessMetric('user_registered', 1, {
        subscriptionPlan: user.subscriptionPlan,
        registrationSource: req.get('Referer') || 'direct'
      });
      
      res.status(201).json(
        Helpers.createResponse(
          true,
          {
            user: user.toJSON(),
            token,
            tokenType: 'Bearer',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
          },
          'Registration successful'
        )
      );
      
    } catch (error) {
      logger.error('User registration failed', {
        requestId,
        email: req.body?.email,
        error: error.message,
        ip: req.ip
      });
      
      logger.logSecurity('registration_failed', {
        email: req.body?.email,
        ip: req.ip,
        error: error.message
      });
      
      if (error.message.includes('Email already exists')) {
        return res.status(409).json(
          Helpers.createResponse(false, null, 'Email already registered')
        );
      }
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Registration failed')
      );
    }
  }
);

// ユーザーログイン
router.post('/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    body('rememberMe')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be a boolean value')
  ],
  handleValidationErrors,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    
    try {
      const { email, password, rememberMe = false } = req.body;
      
      logger.info('User login attempt', {
        requestId,
        email,
        rememberMe,
        ip: req.ip
      });
      
      // ユーザー検索
      const user = await User.findByEmail(email);
      if (!user) {
        logger.logSecurity('login_failed_user_not_found', {
          email,
          ip: req.ip
        });
        
        return res.status(401).json(
          Helpers.createResponse(false, null, 'Invalid credentials')
        );
      }
      
      // パスワード確認
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        logger.logSecurity('login_failed_invalid_password', {
          userId: user.id,
          email,
          ip: req.ip
        });
        
        return res.status(401).json(
          Helpers.createResponse(false, null, 'Invalid credentials')
        );
      }
      
      // アカウント状態確認
      if (!user.isActive) {
        logger.logSecurity('login_failed_inactive_account', {
          userId: user.id,
          email,
          ip: req.ip
        });
        
        return res.status(403).json(
          Helpers.createResponse(false, null, 'Account is inactive')
        );
      }
      
      // JWT トークン生成
      const tokenOptions = rememberMe ? '30d' : '24h';
      process.env.JWT_EXPIRES_IN = tokenOptions;
      const token = AuthMiddleware.generateToken(user);
      
      // セッション保存
      const sessionTTL = rememberMe ? 30 * 24 * 3600 : 24 * 3600; // 30日 or 24時間
      const sessionData = {
        userId: user.id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        loginTime: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        rememberMe
      };
      
      await RedisHelper.setSession(user.uuid, sessionData, sessionTTL);
      
      // クォータリセット
      await user.resetQuota();
      
      logger.info('User logged in successfully', {
        requestId,
        userId: user.id,
        email: user.email,
        rememberMe
      });
      
      logger.logBusinessMetric('user_login', 1, {
        subscriptionPlan: user.subscriptionPlan,
        rememberMe
      });
      
      res.json(
        Helpers.createResponse(
          true,
          {
            user: user.toJSON(),
            token,
            tokenType: 'Bearer',
            expiresIn: tokenOptions
          },
          'Login successful'
        )
      );
      
    } catch (error) {
      logger.error('User login failed', {
        requestId,
        email: req.body?.email,
        error: error.message,
        ip: req.ip
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Login failed')
      );
    }
  }
);

// ログアウト
router.post('/logout',
  AuthMiddleware.authenticate,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    
    try {
      const { user, token } = req;
      
      logger.info('User logout attempt', {
        requestId,
        userId: user.id,
        email: user.email
      });
      
      // トークンを無効化
      await AuthMiddleware.blacklistToken(token);
      
      // セッション削除
      await RedisHelper.deleteSession(user.uuid);
      
      logger.info('User logged out successfully', {
        requestId,
        userId: user.id,
        email: user.email
      });
      
      logger.logBusinessMetric('user_logout', 1, {
        subscriptionPlan: user.subscriptionPlan
      });
      
      res.json(
        Helpers.createResponse(true, null, 'Logout successful')
      );
      
    } catch (error) {
      logger.error('User logout failed', {
        requestId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Logout failed')
      );
    }
  }
);

// プロフィール取得
router.get('/profile',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      
      // 最新のユーザー情報を取得
      const freshUser = await User.findById(user.id);
      if (!freshUser) {
        return res.status(404).json(
          Helpers.createResponse(false, null, 'User not found')
        );
      }
      
      res.json(
        Helpers.createResponse(
          true,
          freshUser.toJSON(),
          'Profile retrieved successfully'
        )
      );
      
    } catch (error) {
      logger.error('Profile retrieval failed', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Profile retrieval failed')
      );
    }
  }
);

// プロフィール更新
router.put('/profile',
  AuthMiddleware.authenticate,
  [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    
    body('settings.language')
      .optional()
      .isIn(['ja', 'en'])
      .withMessage('Language must be ja or en'),
    
    body('settings.currency')
      .optional()
      .isIn(['JPY', 'USD'])
      .withMessage('Currency must be JPY or USD'),
    
    body('settings.timezone')
      .optional()
      .isString()
      .withMessage('Timezone must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    
    try {
      const user = req.user;
      const updates = req.body;
      
      logger.info('Profile update attempt', {
        requestId,
        userId: user.id,
        updates: Object.keys(updates)
      });
      
      // メール変更の場合は重複チェック
      if (updates.email && updates.email !== user.email) {
        const existingUser = await User.findByEmail(updates.email);
        if (existingUser) {
          return res.status(409).json(
            Helpers.createResponse(false, null, 'Email already in use')
          );
        }
        
        user.email = updates.email;
        user.emailVerified = false; // メール変更時は再認証が必要
      }
      
      // 設定更新
      if (updates.settings) {
        user.settings = Helpers.deepMerge(user.settings, updates.settings);
      }
      
      await user.update();
      
      logger.info('Profile updated successfully', {
        requestId,
        userId: user.id,
        email: user.email
      });
      
      res.json(
        Helpers.createResponse(
          true,
          user.toJSON(),
          'Profile updated successfully'
        )
      );
      
    } catch (error) {
      logger.error('Profile update failed', {
        requestId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Profile update failed')
      );
    }
  }
);

// パスワード変更
router.put('/change-password',
  AuthMiddleware.authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be 8-128 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('confirmNewPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('New password confirmation does not match');
        }
        return true;
      })
  ],
  handleValidationErrors,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user;
      
      logger.info('Password change attempt', {
        requestId,
        userId: user.id,
        email: user.email
      });
      
      // 現在のパスワード確認
      const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        logger.logSecurity('password_change_failed_invalid_current', {
          userId: user.id,
          ip: req.ip
        });
        
        return res.status(400).json(
          Helpers.createResponse(false, null, 'Current password is incorrect')
        );
      }
      
      // 新しいパスワードが現在と同じでないことを確認
      const isSamePassword = await user.verifyPassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json(
          Helpers.createResponse(false, null, 'New password must be different from current password')
        );
      }
      
      // パスワード更新
      await user.setPassword(newPassword);
      await user.update();
      
      // セキュリティのため、他のセッションを無効化
      await RedisHelper.deleteCachePattern(`session:*`);
      
      logger.info('Password changed successfully', {
        requestId,
        userId: user.id,
        email: user.email
      });
      
      logger.logSecurity('password_changed', {
        userId: user.id,
        ip: req.ip
      });
      
      res.json(
        Helpers.createResponse(true, null, 'Password changed successfully')
      );
      
    } catch (error) {
      logger.error('Password change failed', {
        requestId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Password change failed')
      );
    }
  }
);

// トークン検証
router.post('/verify-token',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const { user, tokenPayload } = req;
      
      res.json(
        Helpers.createResponse(
          true,
          {
            valid: true,
            user: user.toJSON(),
            tokenInfo: {
              issuedAt: new Date(tokenPayload.iat * 1000).toISOString(),
              expiresAt: new Date(tokenPayload.exp * 1000).toISOString()
            }
          },
          'Token is valid'
        )
      );
      
    } catch (error) {
      logger.error('Token verification failed', {
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Token verification failed')
      );
    }
  }
);

// リフレッシュトークン（簡易実装）
router.post('/refresh-token',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      
      // 最新のユーザー情報で新しいトークン生成
      const freshUser = await User.findById(user.id);
      if (!freshUser) {
        return res.status(404).json(
          Helpers.createResponse(false, null, 'User not found')
        );
      }
      
      const newToken = AuthMiddleware.generateToken(freshUser);
      
      // 古いトークンを無効化
      await AuthMiddleware.blacklistToken(req.token);
      
      logger.info('Token refreshed successfully', {
        userId: user.id,
        email: user.email
      });
      
      res.json(
        Helpers.createResponse(
          true,
          {
            token: newToken,
            tokenType: 'Bearer',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            user: freshUser.toJSON()
          },
          'Token refreshed successfully'
        )
      );
      
    } catch (error) {
      logger.error('Token refresh failed', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Token refresh failed')
      );
    }
  }
);

// アカウント削除（論理削除）
router.delete('/account',
  AuthMiddleware.authenticate,
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required for account deletion'),
    
    body('confirmDeletion')
      .equals('DELETE_MY_ACCOUNT')
      .withMessage('Please type "DELETE_MY_ACCOUNT" to confirm deletion')
  ],
  handleValidationErrors,
  async (req, res) => {
    const requestId = Helpers.generateRequestId();
    
    try {
      const { password } = req.body;
      const user = req.user;
      
      logger.info('Account deletion attempt', {
        requestId,
        userId: user.id,
        email: user.email
      });
      
      // パスワード確認
      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        logger.logSecurity('account_deletion_failed_invalid_password', {
          userId: user.id,
          ip: req.ip
        });
        
        return res.status(400).json(
          Helpers.createResponse(false, null, 'Invalid password')
        );
      }
      
      // アカウント非活性化
      user.isActive = false;
      user.email = `deleted_${user.id}_${user.email}`;
      await user.update();
      
      // セッション削除
      await RedisHelper.deleteSession(user.uuid);
      await AuthMiddleware.blacklistToken(req.token);
      
      logger.info('Account deleted successfully', {
        requestId,
        userId: user.id
      });
      
      logger.logSecurity('account_deleted', {
        userId: user.id,
        ip: req.ip
      });
      
      res.json(
        Helpers.createResponse(true, null, 'Account deleted successfully')
      );
      
    } catch (error) {
      logger.error('Account deletion failed', {
        requestId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json(
        Helpers.createResponse(false, null, 'Account deletion failed')
      );
    }
  }
);

module.exports = router;