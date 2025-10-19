# 総合リサーチツール MVP開発計画書

## 1. プロジェクト目標

**目標**: 段階的なアプローチで実用最小限の機能（MVP）を構築し、不安定なPHPベースのバックエンドをNode.js/Expressに移行、揮発性データをPostgreSQLに永続化

**成功指標**:
- データベース連携による永続化実現
- 技術スタック統一（Node.js統一）
- eBay API連携の安定化
- 基本的なCRUD操作の完成

---

## 2. 短期対応（1〜2週間）

### Phase 1: インフラ構築とデータベース移行

#### 2.1 PostgreSQL環境構築

**タスク1: ローカル開発環境セットアップ**
```bash
# Docker Composeでの環境構築
version: '3.8'
services:
  postgres:
    image: postgres:14
    container_name: research_db
    environment:
      POSTGRES_DB: research_tool
      POSTGRES_USER: research_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    
  redis:
    image: redis:7
    container_name: research_cache
    ports:
      - "6379:6379"
    
volumes:
  postgres_data:
```

**タスク2: データベーススキーマ実装**
```sql
-- init-scripts/01_create_tables.sql

-- ユーザー管理
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'free',
    api_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 商品データ
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    ebay_item_id VARCHAR(50) UNIQUE,
    title VARCHAR(500) NOT NULL,
    title_jp VARCHAR(500),
    category VARCHAR(100),
    condition_name VARCHAR(50),
    current_price DECIMAL(10,2),
    currency VARCHAR(3),
    sold_quantity INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    seller_username VARCHAR(100),
    seller_country VARCHAR(50),
    listing_url VARCHAR(500),
    image_urls TEXT[],
    description TEXT,
    item_specifics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- リサーチセッション
CREATE TABLE research_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    search_query VARCHAR(255),
    search_filters JSONB,
    search_type VARCHAR(50), -- 'keyword', 'seller', 'category'
    results_count INTEGER,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーメモ
CREATE TABLE user_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    note_text TEXT,
    supplier_candidates TEXT[],
    profit_estimate DECIMAL(10,2),
    risk_level VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_products_ebay_item_id ON products(ebay_item_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_seller_username ON products(seller_username);
CREATE INDEX idx_research_sessions_user_id ON research_sessions(user_id);
CREATE INDEX idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX idx_user_notes_product_id ON user_notes(product_id);
```

#### 2.2 Node.js/Express API構築

**タスク3: プロジェクト構造セットアップ**
```
backend/
├── package.json
├── server.js
├── config/
│   ├── database.js
│   └── config.js
├── models/
│   ├── User.js
│   ├── Product.js
│   ├── ResearchSession.js
│   └── UserNote.js
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── research.js
│   └── users.js
├── services/
│   ├── ebayService.js
│   ├── databaseService.js
│   └── translationService.js
├── middleware/
│   ├── auth.js
│   ├── validation.js
│   └── errorHandler.js
└── utils/
    ├── logger.js
    └── helpers.js
```

**タスク4: 基本サーバー構築**
```javascript
// package.json
{
  "name": "research-tool-backend",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.8.0",
    "redis": "^4.3.0",
    "axios": "^1.1.0",
    "cors": "^2.8.5",
    "helmet": "^6.0.0",
    "dotenv": "^16.0.0",
    "winston": "^3.8.0",
    "express-rate-limit": "^6.6.0",
    "express-validator": "^6.14.0",
    "jsonwebtoken": "^8.5.1",
    "bcryptjs": "^2.4.3"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  }
}

// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// レート制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // 最大100リクエスト
});
app.use('/api', limiter);

// ルーティング
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/research', require('./routes/research'));
app.use('/api/users', require('./routes/users'));

// エラーハンドリング
app.use(require('./middleware/errorHandler'));

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 2.3 データベース接続とORM実装

**タスク5: データベース接続**
```javascript
// config/database.js
const { Pool } = require('pg');
const Redis = require('redis');

// PostgreSQL接続
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'research_tool',
  user: process.env.DB_USER || 'research_user',
  password: process.env.DB_PASSWORD || 'secure_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis接続
const redis = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = { pool, redis };
```

**タスク6: モデル実装**
```javascript
// models/Product.js
const { pool } = require('../config/database');

class Product {
  static async create(productData) {
    const query = `
      INSERT INTO products (
        ebay_item_id, title, title_jp, category, condition_name,
        current_price, currency, sold_quantity, watchers_count,
        seller_username, seller_country, listing_url, image_urls,
        description, item_specifics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      productData.ebayItemId, productData.title, productData.titleJp,
      productData.category, productData.conditionName, productData.currentPrice,
      productData.currency, productData.soldQuantity, productData.watchersCount,
      productData.sellerUsername, productData.sellerCountry, productData.listingUrl,
      productData.imageUrls, productData.description, JSON.stringify(productData.itemSpecifics)
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Product creation failed: ${error.message}`);
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM products WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Product fetch failed: ${error.message}`);
    }
  }

  static async search(filters) {
    let query = 'SELECT * FROM products WHERE 1=1';
    let params = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.minPrice) {
      query += ` AND current_price >= $${paramCount}`;
      params.push(filters.minPrice);
      paramCount++;
    }

    if (filters.maxPrice) {
      query += ` AND current_price <= $${paramCount}`;
      params.push(filters.maxPrice);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Product search failed: ${error.message}`);
    }
  }
}

module.exports = Product;
```

### Phase 2: eBay APIサービス移行

#### 2.4 eBay API統合サービス

**タスク7: eBayサービス実装**
```javascript
// services/ebayService.js
const axios = require('axios');
const { redis } = require('../config/database');

class EbayService {
  constructor() {
    this.appId = process.env.EBAY_APP_ID;
    this.baseUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';
  }

  async searchProducts(query, filters = {}) {
    const cacheKey = `ebay_search:${query}:${JSON.stringify(filters)}`;
    
    // キャッシュ確認
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache error:', error);
    }

    // eBay API呼び出し
    const params = this.buildSearchParams(query, filters);
    
    try {
      const response = await axios.get(this.baseUrl, { params });
      const results = this.parseSearchResults(response.data);
      
      // 結果をキャッシュ（15分間）
      try {
        await redis.setEx(cacheKey, 900, JSON.stringify(results));
      } catch (error) {
        console.warn('Redis cache set error:', error);
      }
      
      return results;
    } catch (error) {
      throw new Error(`eBay API search failed: ${error.message}`);
    }
  }

  buildSearchParams(query, filters) {
    const params = {
      'OPERATION-NAME': 'findItemsAdvanced',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': query,
      'paginationInput.entriesPerPage': filters.limit || 100,
      'paginationInput.pageNumber': filters.page || 1
    };

    // フィルター追加
    let filterIndex = 0;
    
    if (filters.category) {
      params[`itemFilter(${filterIndex}).name`] = 'CategoryId';
      params[`itemFilter(${filterIndex}).value`] = filters.category;
      filterIndex++;
    }

    if (filters.condition) {
      params[`itemFilter(${filterIndex}).name`] = 'Condition';
      params[`itemFilter(${filterIndex}).value`] = filters.condition;
      filterIndex++;
    }

    if (filters.minPrice) {
      params[`itemFilter(${filterIndex}).name`] = 'MinPrice';
      params[`itemFilter(${filterIndex}).value`] = filters.minPrice;
      params[`itemFilter(${filterIndex}).paramName`] = 'Currency';
      params[`itemFilter(${filterIndex}).paramValue`] = 'USD';
      filterIndex++;
    }

    if (filters.maxPrice) {
      params[`itemFilter(${filterIndex}).name`] = 'MaxPrice';
      params[`itemFilter(${filterIndex}).value`] = filters.maxPrice;
      params[`itemFilter(${filterIndex}).paramName`] = 'Currency';
      params[`itemFilter(${filterIndex}).paramValue`] = 'USD';
      filterIndex++;
    }

    if (filters.sellerCountry) {
      params[`itemFilter(${filterIndex}).name`] = 'LocatedIn';
      params[`itemFilter(${filterIndex}).value`] = filters.sellerCountry;
      filterIndex++;
    }

    // SOLD商品のみの場合
    if (filters.soldItemsOnly) {
      params['OPERATION-NAME'] = 'findCompletedItems';
    }

    return params;
  }

  parseSearchResults(data) {
    try {
      const searchResult = data.findItemsAdvancedResponse?.[0]?.searchResult?.[0];
      
      if (!searchResult || !searchResult.item) {
        return { items: [], total: 0 };
      }

      const items = searchResult.item.map(item => ({
        ebayItemId: item.itemId?.[0],
        title: item.title?.[0],
        category: item.primaryCategory?.[0]?.categoryName?.[0],
        conditionName: item.condition?.[0]?.conditionDisplayName?.[0],
        currentPrice: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
        currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'],
        soldQuantity: parseInt(item.sellingStatus?.[0]?.quantitySold?.[0]) || 0,
        watchersCount: parseInt(item.listingInfo?.[0]?.watchCount?.[0]) || 0,
        sellerUsername: item.sellerInfo?.[0]?.sellerUserName?.[0],
        sellerCountry: item.country?.[0],
        listingUrl: item.viewItemURL?.[0],
        imageUrls: item.galleryURL ? [item.galleryURL[0]] : [],
        shippingCost: item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || '0',
        freeShipping: item.shippingInfo?.[0]?.expeditedShipping?.[0] === 'true',
        listingType: item.listingInfo?.[0]?.listingType?.[0],
        startTime: item.listingInfo?.[0]?.startTime?.[0],
        endTime: item.listingInfo?.[0]?.endTime?.[0]
      }));

      return {
        items,
        total: parseInt(searchResult['@count']) || 0
      };
    } catch (error) {
      throw new Error(`Failed to parse eBay search results: ${error.message}`);
    }
  }
}

module.exports = new EbayService();
```

#### 2.5 API エンドポイント実装

**タスク8: 商品検索API**
```javascript
// routes/research.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ebayService = require('../services/ebayService');
const Product = require('../models/Product');
const ResearchSession = require('../models/ResearchSession');

// キーワード検索
router.post('/search',
  [
    body('query').notEmpty().withMessage('検索クエリは必須です'),
    body('filters').optional().isObject()
  ],
  async (req, res) => {
    try {
      // バリデーション確認
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const { query, filters = {} } = req.body;
      
      // eBay API検索実行
      const searchResults = await ebayService.searchProducts(query, filters);
      
      // データベースに商品を保存（バックグラウンドで実行）
      searchResults.items.forEach(async (item) => {
        try {
          await Product.create(item);
        } catch (error) {
          console.warn('Product save failed:', error.message);
        }
      });

      // 検索セッション保存
      const sessionData = {
        query,
        filters,
        resultsCount: searchResults.total,
        items: searchResults.items
      };

      res.json({
        success: true,
        data: searchResults,
        message: `${searchResults.total}件の商品が見つかりました`
      });

    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

// セラー分析
router.post('/seller',
  [
    body('sellerUsername').notEmpty().withMessage('セラー名は必須です'),
    body('dataScope').optional().isString()
  ],
  async (req, res) => {
    try {
      const { sellerUsername, dataScope = 'all' } = req.body;
      
      const filters = {
        seller: sellerUsername,
        soldItemsOnly: dataScope === 'sold'
      };

      const results = await ebayService.searchProducts('', filters);
      
      res.json({
        success: true,
        data: results,
        message: `${sellerUsername}の商品を分析しました`
      });

    } catch (error) {
      console.error('Seller research error:', error);
      res.status(500).json({
        success: false,
        message: 'Seller research failed',
        error: error.message
      });
    }
  }
);

module.exports = router;
```

### Phase 3: フロントエンド統合

#### 2.6 既存HTMLとAPI統合

**タスク9: JavaScript API統合**
```javascript
// frontend/js/api.js
class ResearchAPI {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
    this.token = localStorage.getItem('auth_token');
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // 商品検索
  async searchProducts(query, filters) {
    return this.makeRequest('/research/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters })
    });
  }

  // セラー分析
  async analyzeseller(sellerUsername, dataScope) {
    return this.makeRequest('/research/seller', {
      method: 'POST',
      body: JSON.stringify({ sellerUsername, dataScope })
    });
  }

  // 商品詳細取得
  async getProduct(productId) {
    return this.makeRequest(`/products/${productId}`);
  }

  // ユーザーメモ保存
  async saveNote(productId, noteData) {
    return this.makeRequest('/users/notes', {
      method: 'POST',
      body: JSON.stringify({ productId, ...noteData })
    });
  }
}

// グローバルAPI インスタンス
window.researchAPI = new ResearchAPI();
```

**タスク10: 既存UI更新**
```javascript
// 既存のperformKeywordSearch関数を更新
async function performKeywordSearch(query, filters) {
    showLoading();
    document.getElementById("displayControls").style.display = "block";
    
    try {
        // 新しいAPI呼び出し
        const result = await window.researchAPI.searchProducts(query, filters);
        
        if (result.success) {
            displayResults(result.data.items, 'keyword');
            
            // データベース保存成功メッセージ
            showSuccessMessage(`${result.data.total}件の商品をデータベースに保存しました`);
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error("API通信エラー:", error);
        showError('検索に失敗しました: ' + error.message);
    } finally {
        hideLoading();
    }
}

// データ永続化の確認
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}
```

---

## 3. 実装ロードマップ

### Week 1: インフラ構築
- **Day 1-2**: Docker環境セットアップ、PostgreSQL構築
- **Day 3-4**: Node.js/Express基本構造実装
- **Day 5-7**: データベース設計実装、基本モデル作成

### Week 2: API開発と統合
- **Day 8-10**: eBay API サービス実装
- **Day 11-12**: API エンドポイント実装
- **Day 13-14**: フロントエンド統合、テスト

---

## 4. 成功指標と検証方法

### 技術指標
- [ ] PostgreSQL接続成功
- [ ] 基本CRUD操作動作確認
- [ ] eBay API連携正常動作
- [ ] データ永続化確認（再起動後もデータ保持）
- [ ] エラーハンドリング動作確認

### 機能指標
- [ ] キーワード検索結果のDB保存
- [ ] セラー分析データの保存
- [ ] ユーザーメモ機能動作
- [ ] 検索履歴の保持
- [ ] API レスポンス時間 < 3秒

### データ品質指標
- [ ] 商品データの重複防止
- [ ] 日本語翻訳機能の動作
- [ ] 画像URL取得率 > 90%
- [ ] 価格データの正確性確認

---

## 5. リスク管理と対応策

### 技術リスク
**リスク**: eBay API制限によるデータ取得失敗
**対策**: レート制限実装、キャッシュ機能、バックオフ戦略

**リスク**: データベース接続エラー
**対策**: 接続プール管理、自動再接続、ヘルスチェック

**リスク**: フロントエンドとバックエンドの統合エラー
**対策**: 段階的統合、CORS設定、詳細なエラーログ

### 運用リスク
**リスク**: パフォーマンス劣化
**対策**: クエリ最適化、インデックス設計、Redis キャッシュ

**リスク**: セキュリティ脆弱性
**対策**: 入力値検証、SQLインジェクション対策、認証実装

---

## 6. 次回フェーズの準備

### 中期対応への橋渡し
1. **AI分析機能の基盤準備**
   - 統計分析用のデータ蓄積開始
   - Python/FastAPI の準備

2. **国内EC連携の準備**
   - Amazon Product API の調査
   - 楽天API の認証準備

3. **スケーラビリティの確保**
   - パフォーマンス監視の実装
   - ログ分析基盤の構築

この計画により、プロジェクトの成熟度を30%から70%まで向上させ、実用的なMVPを提供できます。