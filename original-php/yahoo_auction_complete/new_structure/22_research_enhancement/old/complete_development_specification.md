# 総合リサーチツール - 完全開発指示書

## プロジェクト概要

### 目的
既存のeBayプロダクトリサーチ機能を拡張し、Amazon、メルカリ、ヤフオクなどのECサイト、およびGoogle、SNS、ブログからのデータを統合する総合リサーチツールの構築。逆リサーチ機能により、eBayで売れる商品を基に日本国内での仕入れ候補を自動特定し、利益計算から購入URL提示まで一気通貫でサポートする。

### 技術スタック
- **バックエンド**: Node.js/Express, Python/FastAPI
- **データベース**: PostgreSQL, MongoDB, InfluxDB, Redis
- **メッセージング**: Apache Kafka, Redis Streams
- **コンテナ**: Docker, Kubernetes
- **フロントエンド**: React.js, TypeScript
- **AI/ML**: TensorFlow, scikit-learn, Sentence-BERT

---

## 1. アーキテクチャ・インフラストラクチャ設計書

### 1.1 システム全体構成

```yaml
# docker-compose.yml
version: '3.8'
services:
  # API Gateway
  api-gateway:
    image: kong:latest
    ports:
      - "8000:8000"
      - "8443:8443"
      - "8001:8001"
      - "8444:8444"
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: postgres
      KONG_PG_DATABASE: kong
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong
    depends_on:
      - postgres

  # Core Services
  ebay-research-service:
    build: ./services/ebay-research
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/research_db
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - postgres
      - redis
      - kafka

  domestic-supplier-service:
    build: ./services/domestic-supplier
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/research_db
      - MONGODB_URL=mongodb://mongo:27017/supplier_data
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - postgres
      - mongo
      - kafka

  profit-calculation-service:
    build: ./services/profit-calculation
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/research_db
      - INFLUXDB_URL=http://influxdb:8086
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - postgres
      - influxdb
      - kafka

  notification-service:
    build: ./services/notification
    environment:
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - redis
      - kafka

  # Databases
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: research_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d

  mongo:
    image: mongo:5.0
    volumes:
      - mongo_data:/data/db

  influxdb:
    image: influxdb:2.0
    environment:
      INFLUXDB_DB: price_history
      INFLUXDB_ADMIN_USER: admin
      INFLUXDB_ADMIN_PASSWORD: admin
    volumes:
      - influxdb_data:/var/lib/influxdb2

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

  # Message Queue
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper

volumes:
  postgres_data:
  mongo_data:
  influxdb_data:
  redis_data:
```

### 1.2 Kubernetes デプロイメント構成

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: research-tool

---
# k8s/ebay-research-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ebay-research-service
  namespace: research-tool
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ebay-research-service
  template:
    metadata:
      labels:
        app: ebay-research-service
    spec:
      containers:
      - name: ebay-research
        image: research-tool/ebay-research:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: postgres-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/ebay-research-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ebay-research-service
  namespace: research-tool
spec:
  selector:
    app: ebay-research-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

---

## 2. データベース設計・構築指示書

### 2.1 PostgreSQL スキーマ設計

```sql
-- init-scripts/001_create_tables.sql

-- ユーザー管理
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'free',
    api_quota_remaining INTEGER DEFAULT 1000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 商品マスター
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    ebay_item_id VARCHAR(50),
    title TEXT NOT NULL,
    category_id INTEGER,
    brand VARCHAR(255),
    model VARCHAR(255),
    condition_type VARCHAR(50),
    ebay_selling_price DECIMAL(12,2),
    ebay_sold_quantity INTEGER DEFAULT 0,
    ebay_listing_url TEXT,
    research_score DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 国内仕入れ候補
CREATE TABLE domestic_suppliers (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    supplier_type VARCHAR(50) NOT NULL, -- 'amazon', 'rakuten', 'mercari', 'yahoo_auctions'
    supplier_name VARCHAR(255),
    supplier_url TEXT NOT NULL,
    product_title TEXT,
    price DECIMAL(12,2) NOT NULL,
    original_price DECIMAL(12,2),
    discount_rate DECIMAL(5,2),
    availability_status VARCHAR(20) DEFAULT 'unknown', -- 'in_stock', 'limited', 'out_of_stock'
    shipping_cost DECIMAL(10,2),
    delivery_days INTEGER,
    seller_rating DECIMAL(3,2),
    seller_review_count INTEGER,
    reliability_score DECIMAL(5,2),
    last_price_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 利益計算結果
CREATE TABLE profit_calculations (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    supplier_id BIGINT REFERENCES domestic_suppliers(id) ON DELETE CASCADE,
    
    -- eBay売上関連
    ebay_selling_price DECIMAL(12,2) NOT NULL,
    ebay_final_value_fee DECIMAL(10,2),
    ebay_insertion_fee DECIMAL(10,2),
    paypal_fee DECIMAL(10,2),
    
    -- 仕入れ関連
    domestic_purchase_price DECIMAL(12,2) NOT NULL,
    domestic_shipping_cost DECIMAL(10,2),
    domestic_tax DECIMAL(10,2),
    
    -- 発送関連
    international_shipping_cost DECIMAL(10,2),
    packaging_cost DECIMAL(8,2),
    customs_declaration_fee DECIMAL(8,2),
    
    -- 利益計算結果
    gross_profit DECIMAL(12,2),
    net_profit DECIMAL(12,2),
    profit_margin DECIMAL(5,2),
    roi DECIMAL(5,2), -- Return on Investment
    
    -- リスク調整
    market_volatility_score DECIMAL(3,2),
    competition_level VARCHAR(20),
    seasonal_factor DECIMAL(3,2),
    risk_adjusted_profit DECIMAL(12,2),
    
    -- 推奨度
    purchase_recommendation_score DECIMAL(5,2),
    confidence_level DECIMAL(3,2),
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 市場トレンド分析
CREATE TABLE market_trends (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    trend_source VARCHAR(50), -- 'google_trends', 'sns_mentions', 'news_sentiment'
    trend_value DECIMAL(5,2),
    trend_direction VARCHAR(10), -- 'up', 'down', 'stable'
    confidence_score DECIMAL(3,2),
    data_points JSONB,
    analysis_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザー行動ログ
CREATE TABLE user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50), -- 'search', 'view_product', 'export_data', 'purchase_click'
    product_id BIGINT,
    metadata JSONB,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- APIリクエストログ
CREATE TABLE api_request_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    service_name VARCHAR(100),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size INTEGER,
    response_size INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_ebay_item_id ON products(ebay_item_id);
CREATE INDEX idx_products_research_score ON products(research_score);
CREATE INDEX idx_domestic_suppliers_product_id ON domestic_suppliers(product_id);
CREATE INDEX idx_domestic_suppliers_supplier_type ON domestic_suppliers(supplier_type);
CREATE INDEX idx_domestic_suppliers_price ON domestic_suppliers(price);
CREATE INDEX idx_profit_calculations_product_id ON profit_calculations(product_id);
CREATE INDEX idx_profit_calculations_profit_margin ON profit_calculations(profit_margin);
CREATE INDEX idx_market_trends_product_id ON market_trends(product_id);
CREATE INDEX idx_market_trends_analysis_date ON market_trends(analysis_date);
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at);
```

### 2.2 MongoDB コレクション設計

```javascript
// init-scripts/mongodb_setup.js

// ブログ・ニュース記事データ
db.createCollection("web_content", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["url", "title", "content_type", "scraped_at"],
            properties: {
                url: { bsonType: "string" },
                title: { bsonType: "string" },
                content_type: { 
                    enum: ["blog_post", "news_article", "forum_post", "review"] 
                },
                content: { bsonType: "string" },
                author: { bsonType: "string" },
                published_date: { bsonType: "date" },
                scraped_at: { bsonType: "date" },
                sentiment_score: { 
                    bsonType: "number",
                    minimum: -1,
                    maximum: 1
                },
                keywords: { 
                    bsonType: "array",
                    items: { bsonType: "string" }
                },
                related_products: {
                    bsonType: "array",
                    items: { bsonType: "long" }
                },
                metadata: { bsonType: "object" }
            }
        }
    }
});

// SNS投稿データ
db.createCollection("sns_posts", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["platform", "post_id", "content", "posted_at"],
            properties: {
                platform: { 
                    enum: ["twitter", "instagram", "tiktok", "youtube"] 
                },
                post_id: { bsonType: "string" },
                content: { bsonType: "string" },
                author_username: { bsonType: "string" },
                author_followers: { bsonType: "number" },
                engagement_metrics: {
                    bsonType: "object",
                    properties: {
                        likes: { bsonType: "number" },
                        shares: { bsonType: "number" },
                        comments: { bsonType: "number" },
                        views: { bsonType: "number" }
                    }
                },
                posted_at: { bsonType: "date" },
                scraped_at: { bsonType: "date" },
                sentiment_score: { 
                    bsonType: "number",
                    minimum: -1,
                    maximum: 1
                },
                mentioned_products: {
                    bsonType: "array",
                    items: { bsonType: "string" }
                },
                hashtags: {
                    bsonType: "array",
                    items: { bsonType: "string" }
                }
            }
        }
    }
});

// API応答キャッシュ
db.createCollection("api_cache", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["cache_key", "data", "expires_at"],
            properties: {
                cache_key: { bsonType: "string" },
                api_source: { bsonType: "string" },
                data: { bsonType: "object" },
                cached_at: { bsonType: "date" },
                expires_at: { bsonType: "date" },
                access_count: { bsonType: "number" },
                last_accessed: { bsonType: "date" }
            }
        }
    }
});

// インデックス作成
db.web_content.createIndex({ "url": 1 }, { unique: true });
db.web_content.createIndex({ "scraped_at": 1 });
db.web_content.createIndex({ "content_type": 1 });
db.web_content.createIndex({ "keywords": 1 });
db.web_content.createIndex({ "related_products": 1 });

db.sns_posts.createIndex({ "platform": 1, "post_id": 1 }, { unique: true });
db.sns_posts.createIndex({ "posted_at": 1 });
db.sns_posts.createIndex({ "author_username": 1 });
db.sns_posts.createIndex({ "mentioned_products": 1 });
db.sns_posts.createIndex({ "hashtags": 1 });

db.api_cache.createIndex({ "cache_key": 1 }, { unique: true });
db.api_cache.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
db.api_cache.createIndex({ "api_source": 1 });
```

### 2.3 InfluxDB スキーマ設計

```javascript
// init-scripts/influxdb_setup.js

// バケット作成
const buckets = [
    {
        name: "price_history",
        description: "商品価格の時系列データ",
        retentionPeriod: "2y" // 2年間保持
    },
    {
        name: "search_trends",
        description: "Google検索トレンドデータ",
        retentionPeriod: "1y"
    },
    {
        name: "system_metrics",
        description: "システムパフォーマンスメトリクス",
        retentionPeriod: "90d"
    }
];

// measurement schemas (example queries)
/*
price_history measurement:
- tags: product_id, supplier_type, supplier_name, currency
- fields: price, original_price, discount_rate, availability_score
- timestamp: price_checked_at

search_trends measurement:
- tags: keyword, region, category
- fields: search_volume, trend_score, competition_index
- timestamp: trend_date

system_metrics measurement:
- tags: service_name, endpoint, method
- fields: response_time, cpu_usage, memory_usage, error_rate
- timestamp: measured_at
*/
```

---

## 3. eBayリサーチサービス開発指示書

### 3.1 サービス構成

```javascript
// services/ebay-research/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const ebayRoutes = require('./routes/ebay');
const healthRoutes = require('./routes/health');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

const app = express();

// セキュリティミドルウェア
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// レート制限
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大100リクエスト
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// ミドルウェア
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ルーティング
app.use('/health', healthRoutes);
app.use('/api/ebay', authMiddleware, ebayRoutes);

// エラーハンドリング
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`eBay Research Service running on port ${PORT}`);
});

module.exports = app;
```

### 3.2 eBay API統合

```javascript
// services/ebay-research/src/services/ebayService.js
const axios = require('axios');
const { Client } = require('pg');
const Redis = require('redis');

class EbayService {
    constructor() {
        this.ebayApiKey = process.env.EBAY_API_KEY;
        this.ebayApiSecret = process.env.EBAY_API_SECRET;
        this.dbClient = new Client({
            connectionString: process.env.DATABASE_URL
        });
        this.redis = Redis.createClient({
            url: process.env.REDIS_URL
        });
        
        this.dbClient.connect();
        this.redis.connect();
    }

    async searchProducts(params) {
        const {
            keywords,
            category,
            minPrice,
            maxPrice,
            condition,
            sortBy = 'BestMatch',
            limit = 100
        } = params;

        // キャッシュキー生成
        const cacheKey = `ebay:search:${JSON.stringify(params)}`;
        
        try {
            // キャッシュ確認
            const cachedResult = await this.redis.get(cacheKey);
            if (cachedResult) {
                return JSON.parse(cachedResult);
            }

            // eBay API呼び出し
            const response = await this.callEbayFindingAPI({
                'OPERATION-NAME': 'findItemsAdvanced',
                'SERVICE-VERSION': '1.0.0',
                'SECURITY-APPNAME': this.ebayApiKey,
                'RESPONSE-DATA-FORMAT': 'JSON',
                'REST-PAYLOAD': '',
                keywords,
                categoryId: category,
                'itemFilter(0).name': 'MinPrice',
                'itemFilter(0).value': minPrice,
                'itemFilter(1).name': 'MaxPrice',
                'itemFilter(1).value': maxPrice,
                'itemFilter(2).name': 'Condition',
                'itemFilter(2).value': condition,
                'sortOrder': sortBy,
                'paginationInput.entriesPerPage': limit
            });

            const products = this.parseEbayResponse(response.data);
            
            // データベース保存
            await this.saveProductsToDatabase(products);
            
            // キャッシュ保存（15分）
            await this.redis.setEx(cacheKey, 900, JSON.stringify(products));
            
            return products;

        } catch (error) {
            console.error('eBay API Error:', error);
            throw new Error(`eBay search failed: ${error.message}`);
        }
    }

    async callEbayFindingAPI(params) {
        const url = 'https://svcs.ebay.com/services/search/FindingService/v1';
        
        return await axios.get(url, {
            params,
            headers: {
                'X-EBAY-SOA-SECURITY-APPNAME': this.ebayApiKey
            },
            timeout: 30000
        });
    }

    parseEbayResponse(data) {
        const items = data.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];
        
        return items.map(item => ({
            itemId: item.itemId?.[0],
            title: item.title?.[0],
            categoryId: item.primaryCategory?.[0]?.categoryId?.[0],
            categoryName: item.primaryCategory?.[0]?.categoryName?.[0],
            currentPrice: {
                value: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
                currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId']
            },
            condition: item.condition?.[0]?.conditionDisplayName?.[0],
            location: item.location?.[0],
            country: item.country?.[0],
            shippingCost: {
                value: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0),
                currency: item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.['@currencyId']
            },
            listingType: item.listingInfo?.[0]?.listingType?.[0],
            startTime: item.listingInfo?.[0]?.startTime?.[0],
            endTime: item.listingInfo?.[0]?.endTime?.[0],
            viewItemURL: item.viewItemURL?.[0],
            galleryURL: item.galleryURL?.[0],
            watchCount: parseInt(item.listingInfo?.[0]?.watchCount?.[0] || 0),
            bestOfferEnabled: item.listingInfo?.[0]?.bestOfferEnabled?.[0] === 'true',
            // 追加のメタデータ
            extractedAt: new Date().toISOString(),
            researchScore: null // 後で計算
        }));
    }

    async saveProductsToDatabase(products) {
        const query = `
            INSERT INTO products (
                ebay_item_id, title, category_id, ebay_selling_price, 
                ebay_listing_url, status
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (ebay_item_id) DO UPDATE SET
                title = EXCLUDED.title,
                ebay_selling_price = EXCLUDED.ebay_selling_price,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `;

        const results = [];
        for (const product of products) {
            try {
                const result = await this.dbClient.query(query, [
                    product.itemId,
                    product.title,
                    product.categoryId,
                    product.currentPrice.value,
                    product.viewItemURL,
                    'active'
                ]);
                results.push(result.rows[0]);
            } catch (error) {
                console.error('Database save error:', error);
            }
        }
        return results;
    }

    async getProductAnalytics(productId) {
        // 商品の詳細分析データを取得
        const query = `
            SELECT p.*, 
                   pc.profit_margin,
                   pc.purchase_recommendation_score,
                   ds.supplier_type,
                   ds.price as supplier_price,
                   ds.reliability_score
            FROM products p
            LEFT JOIN profit_calculations pc ON p.id = pc.product_id
            LEFT JOIN domestic_suppliers ds ON p.id = ds.product_id
            WHERE p.id = $1
        `;
        
        const result = await this.dbClient.query(query, [productId]);
        return result.rows[0];
    }

    async calculateResearchScore(product) {
        // リサーチスコア計算ロジック
        const factors = {
            priceRange: this.evaluatePriceRange(product.currentPrice.value),
            category: this.evaluateCategory(product.categoryId),
            watchCount: this.evaluateWatchCount(product.watchCount),
            condition: this.evaluateCondition(product.condition),
            shippingCost: this.evaluateShippingCost(product.shippingCost.value)
        };

        const weights = {
            priceRange: 0.3,
            category: 0.25,
            watchCount: 0.2,
            condition: 0.15,
            shippingCost: 0.1
        };

        const score = Object.keys(factors).reduce((total, factor) => {
            return total + (factors[factor] * weights[factor]);
        }, 0);

        return Math.round(score * 100) / 100; // 小数点2桁
    }

    evaluatePriceRange(price) {
        // 価格帯別スコア評価
        if (price >= 50 && price <= 200) return 1.0;
        if (price >= 200 && price <= 500) return 0.8;
        if (price >= 20 && price <= 50) return 0.6;
        if (price >= 500 && price <= 1000) return 0.4;
        return 0.2;
    }

    evaluateCategory(categoryId) {
        // カテゴリー別スコア評価
        const highValueCategories = [
            '58058', // Cell Phones & Accessories
            '293', // Consumer Electronics
            '11450', // Clothing, Shoes & Accessories
        ];
        
        return highValueCategories.includes(categoryId) ? 1.0 : 0.5;
    }

    evaluateWatchCount(watchCount) {
        // ウォッチ数によるスコア評価
        if (watchCount >= 20) return 1.0;
        if (watchCount >= 10) return 0.8;
        if (watchCount >= 5) return 0.6;
        if (watchCount >= 1) return 0.4;
        return 0.2;
    }

    evaluateCondition(condition) {
        // コンディション別スコア評価
        const conditionScores = {
            'New': 1.0,
            'New with defects': 0.8,
            'New other': 0.8,
            'Manufacturer refurbished': 0.7,
            'Used': 0.5,
            'For parts or not working': 0.2
        };
        
        return conditionScores[condition] || 0.5;
    }

    evaluateShippingCost(shippingCost) {
        // 送料によるスコア評価（低い方が良い）
        if (shippingCost === 0) return 1.0;
        if (shippingCost <= 10) return 0.8;
        if (shippingCost <= 20) return 0.6;
        if (shippingCost <= 50) return 0.4;
        return 0.2;
    }
}

module.exports = EbayService;
```

### 3.3 ルーティング設計

```javascript
// services/ebay-research/src/routes/ebay.js
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const EbayService = require('../services/ebayService');
const KafkaProducer = require('../services/kafkaProducer');

const router = express.Router();
const ebayService = new EbayService();
const kafkaProducer = new KafkaProducer();

// 商品検索エンドポイント
router.get('/search',
    [
        query('keywords').notEmpty().withMessage('Keywords are required'),
        query('minPrice').optional().isFloat({ min: 0 }),
        query('maxPrice').optional().isFloat({ min: 0 }),
        query('category').optional().isNumeric(),
        query('limit').optional().isInt({ min: 1, max: 200 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const searchParams = {
                keywords: req.query.keywords,
                category: req.query.category,
                minPrice: req.query.minPrice,
                maxPrice: req.query.maxPrice,
                condition: req.query.condition,
                sortBy: req.query.sortBy,
                limit: parseInt(req.query.limit) || 50
            };

            const products = await ebayService.searchProducts(searchParams);

            // 各商品のリサーチスコアを計算
            for (let product of products) {
                product.researchScore = await ebayService.calculateResearchScore(product);
            }

            // 高スコア商品（80点以上）を逆リサーチキューに送信
            const highScoreProducts = products.filter(p => p.researchScore >= 80);
            if (highScoreProducts.length > 0) {
                await kafkaProducer.sendMessage('product-research-results', {
                    userId: req.user.id,
                    products: highScoreProducts,
                    searchParams,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: {
                    total: products.length,
                    highScoreCount: highScoreProducts.length,
                    products: products.sort((a, b) => b.researchScore - a.researchScore)
                }
            });

        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({
                success: false,
                error: 'Search failed',
                message: error.message
            });
        }
    }
);

// 商品詳細取得
router.get('/product/:productId',
    async (req, res) => {
        try {
            const productId = req.params.productId;
            const analytics = await ebayService.getProductAnalytics(productId);

            if (!analytics) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
                });
            }

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            console.error('Product analytics error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get product analytics'
            });
        }
    }
);

// 商品リサーチスコア再計算
router.post('/product/:productId/recalculate',
    async (req, res) => {
        try {
            const productId = req.params.productId;
            
            // 商品データ取得
            const product = await ebayService.getProductById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
                });
            }

            // スコア再計算
            const newScore = await ebayService.calculateResearchScore(product);
            
            // データベース更新
            await ebayService.updateProductScore(productId, newScore);

            res.json({
                success: true,
                data: {
                    productId,
                    newScore,
                    updatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Score recalculation error:', error);
            res.status(500).json({
                success: false,
                error: 'Score recalculation failed'
            });
        }
    }
);

module.exports = router;
```

---

## 4. 国内サプライヤーサービス開発指示書

### 4.1 サービス構成

```python
# services/domestic-supplier/src/main.py
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
import asyncio
from contextlib import asynccontextmanager

from src.services.supplier_search import SupplierSearchService
from src.services.kafka_consumer import KafkaConsumerService
from src.api import suppliers, health
from src.database import init_db
from src.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時処理
    await init_db()
    
    # サービス初期化
    profit_service = ProfitCalculatorService()
    await profit_service.initialize()
    
    # Kafkaコンシューマー起動
    consumer_service = KafkaConsumerService()
    asyncio.create_task(consumer_service.start_consuming())
    
    yield
    
    # 終了時処理
    await consumer_service.stop_consuming()
    await profit_service.close()

app = FastAPI(
    title="Profit Calculation Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーティング
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(calculations.router, prefix="/api/calculations", tags=["calculations"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=settings.DEBUG)
```

### 5.2 利益計算サービス

```python
# services/profit-calculation/src/services/profit_calculator.py
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import asyncpg
from influxdb_client.client.influxdb_client_async import InfluxDBClientAsync
import numpy as np

from src.models.calculation import ProfitCalculation, FeeBreakdown
from src.services.fee_calculator import FeeCalculatorService
from src.services.risk_assessor import RiskAssessorService
from src.services.market_analyzer import MarketAnalyzerService

class ProfitCalculatorService:
    def __init__(self):
        self.fee_calculator = FeeCalculatorService()
        self.risk_assessor = RiskAssessorService()
        self.market_analyzer = MarketAnalyzerService()
        self.db_pool = None
        self.influx_client = None

    async def initialize(self):
        """サービス初期化"""
        self.db_pool = await asyncpg.create_pool(settings.DATABASE_URL)
        self.influx_client = InfluxDBClientAsync(
            url=settings.INFLUXDB_URL,
            token=settings.INFLUXDB_TOKEN,
            org=settings.INFLUXDB_ORG
        )
        
        await self.fee_calculator.initialize()
        await self.risk_assessor.initialize()
        await self.market_analyzer.initialize()

    async def calculate_comprehensive_profit(self, product_id: int, supplier_id: int) -> ProfitCalculation:
        """包括的利益計算"""
        try:
            # 基本データ取得
            product_data = await self.get_product_data(product_id)
            supplier_data = await self.get_supplier_data(supplier_id)
            
            if not product_data or not supplier_data:
                raise ValueError("Product or supplier data not found")

            # 手数料計算
            fee_breakdown = await self.fee_calculator.calculate_all_fees(
                ebay_price=product_data['ebay_selling_price'],
                category_id=product_data['category_id'],
                item_condition=product_data['condition_type'],
                supplier_type=supplier_data['supplier_type']
            )

            # 基本利益計算
            gross_profit = product_data['ebay_selling_price'] - supplier_data['price']
            net_profit = gross_profit - fee_breakdown.total_fees

            # 利益率計算
            profit_margin = (net_profit / supplier_data['price']) * 100 if supplier_data['price'] > 0 else 0
            roi = (net_profit / supplier_data['price']) * 100 if supplier_data['price'] > 0 else 0

            # リスク評価
            risk_assessment = await self.risk_assessor.assess_investment_risk(
                product_data, supplier_data, net_profit
            )

            # 市場分析
            market_analysis = await self.market_analyzer.analyze_market_conditions(product_data)

            # リスク調整利益
            risk_adjusted_profit = net_profit * (1 - risk_assessment.overall_risk_score)

            # 推奨度スコア計算
            recommendation_score = await self.calculate_recommendation_score(
                profit_margin, risk_assessment, market_analysis, supplier_data
            )

            # 結果保存
            calculation = ProfitCalculation(
                product_id=product_id,
                supplier_id=supplier_id,
                ebay_selling_price=product_data['ebay_selling_price'],
                domestic_purchase_price=supplier_data['price'],
                fee_breakdown=fee_breakdown,
                gross_profit=gross_profit,
                net_profit=net_profit,
                profit_margin=profit_margin,
                roi=roi,
                risk_assessment=risk_assessment,
                market_analysis=market_analysis,
                risk_adjusted_profit=risk_adjusted_profit,
                recommendation_score=recommendation_score,
                confidence_level=self.calculate_confidence_level(risk_assessment, market_analysis),
                calculated_at=datetime.now()
            )

            await self.save_calculation_to_db(calculation)
            await self.save_metrics_to_influx(calculation)

            return calculation

        except Exception as e:
            print(f"Profit calculation error: {e}")
            raise

    async def get_product_data(self, product_id: int) -> Optional[Dict]:
        """商品データ取得"""
        async with self.db_pool.acquire() as conn:
            return await conn.fetchrow("""
                SELECT id, ebay_item_id, title, category_id, condition_type,
                       ebay_selling_price, ebay_sold_quantity, research_score
                FROM products WHERE id = $1
            """, product_id)

    async def get_supplier_data(self, supplier_id: int) -> Optional[Dict]:
        """サプライヤーデータ取得"""
        async with self.db_pool.acquire() as conn:
            return await conn.fetchrow("""
                SELECT id, product_id, supplier_type, supplier_name, supplier_url,
                       price, shipping_cost, delivery_days, reliability_score
                FROM domestic_suppliers WHERE id = $1
            """, supplier_id)

    async def calculate_recommendation_score(
        self, 
        profit_margin: float, 
        risk_assessment: 'RiskAssessment', 
        market_analysis: 'MarketAnalysis',
        supplier_data: Dict
    ) -> float:
        """推奨度スコア計算"""
        
        # 基本スコア（利益率ベース）
        if profit_margin >= 50:
            base_score = 100
        elif profit_margin >= 30:
            base_score = 80
        elif profit_margin >= 20:
            base_score = 60
        elif profit_margin >= 10:
            base_score = 40
        else:
            base_score = 20

        # リスク調整（リスクが高いほど減点）
        risk_penalty = risk_assessment.overall_risk_score * 30
        
        # 市場トレンド調整
        if market_analysis.trend_direction == 'up':
            trend_bonus = 10
        elif market_analysis.trend_direction == 'down':
            trend_bonus = -10
        else:
            trend_bonus = 0

        # サプライヤー信頼性調整
        reliability_bonus = (supplier_data['reliability_score'] - 0.5) * 20

        # 最終スコア計算
        final_score = base_score - risk_penalty + trend_bonus + reliability_bonus
        
        return max(0, min(100, final_score))

    def calculate_confidence_level(self, risk_assessment: 'RiskAssessment', market_analysis: 'MarketAnalysis') -> float:
        """信頼度レベル計算"""
        base_confidence = 0.7
        
        # データ品質による調整
        if market_analysis.data_quality_score > 0.8:
            base_confidence += 0.2
        elif market_analysis.data_quality_score < 0.5:
            base_confidence -= 0.2

        # リスクレベルによる調整
        if risk_assessment.overall_risk_score < 0.3:
            base_confidence += 0.1
        elif risk_assessment.overall_risk_score > 0.7:
            base_confidence -= 0.2

        return max(0.1, min(1.0, base_confidence))

    async def save_calculation_to_db(self, calculation: ProfitCalculation):
        """計算結果をデータベースに保存"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO profit_calculations (
                    product_id, supplier_id, ebay_selling_price, ebay_final_value_fee,
                    ebay_insertion_fee, paypal_fee, domestic_purchase_price,
                    domestic_shipping_cost, international_shipping_cost,
                    packaging_cost, gross_profit, net_profit, profit_margin,
                    roi, market_volatility_score, risk_adjusted_profit,
                    purchase_recommendation_score, confidence_level
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                )
            """, 
            calculation.product_id, calculation.supplier_id,
            calculation.ebay_selling_price, calculation.fee_breakdown.ebay_final_value_fee,
            calculation.fee_breakdown.ebay_insertion_fee, calculation.fee_breakdown.paypal_fee,
            calculation.domestic_purchase_price, calculation.fee_breakdown.domestic_shipping_cost,
            calculation.fee_breakdown.international_shipping_cost, calculation.fee_breakdown.packaging_cost,
            calculation.gross_profit, calculation.net_profit, calculation.profit_margin,
            calculation.roi, calculation.risk_assessment.market_volatility_score,
            calculation.risk_adjusted_profit, calculation.recommendation_score,
            calculation.confidence_level
            )

    async def save_metrics_to_influx(self, calculation: ProfitCalculation):
        """メトリクスをInfluxDBに保存"""
        write_api = self.influx_client.write_api()
        
        point = {
            "measurement": "profit_calculations",
            "tags": {
                "product_id": str(calculation.product_id),
                "supplier_id": str(calculation.supplier_id),
                "supplier_type": calculation.supplier_data.get('supplier_type', 'unknown')
            },
            "fields": {
                "profit_margin": calculation.profit_margin,
                "net_profit": calculation.net_profit,
                "recommendation_score": calculation.recommendation_score,
                "risk_score": calculation.risk_assessment.overall_risk_score,
                "confidence_level": calculation.confidence_level
            },
            "time": calculation.calculated_at
        }
        
        await write_api.write(bucket="profit_metrics", record=point)

    async def get_profit_history(self, product_id: int, days: int = 30) -> List[Dict]:
        """利益履歴取得"""
        query_api = self.influx_client.query_api()
        
        query = f'''
            from(bucket: "profit_metrics")
            |> range(start: -{days}d)
            |> filter(fn: (r) => r["_measurement"] == "profit_calculations")
            |> filter(fn: (r) => r["product_id"] == "{product_id}")
            |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        '''
        
        tables = await query_api.query(query)
        
        history = []
        for table in tables:
            for record in table.records:
                history.append({
                    'timestamp': record.get_time(),
                    'profit_margin': record.values.get('profit_margin'),
                    'net_profit': record.values.get('net_profit'),
                    'recommendation_score': record.values.get('recommendation_score'),
                    'risk_score': record.values.get('risk_score')
                })
        
        return sorted(history, key=lambda x: x['timestamp'])

    async def bulk_calculate_profits(self, product_supplier_pairs: List[tuple]) -> List[ProfitCalculation]:
        """バルク利益計算"""
        tasks = []
        for product_id, supplier_id in product_supplier_pairs:
            task = self.calculate_comprehensive_profit(product_id, supplier_id)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 例外を除外して成功した計算のみ返す
        successful_calculations = [
            result for result in results 
            if isinstance(result, ProfitCalculation)
        ]
        
        return successful_calculations

    async def close(self):
        """リソースクリーンアップ"""
        if self.db_pool:
            await self.db_pool.close()
        if self.influx_client:
            await self.influx_client.close()
        
        await self.fee_calculator.close()
        await self.risk_assessor.close()
        await self.market_analyzer.close()
```

### 5.3 手数料計算サービス

```python
# services/profit-calculation/src/services/fee_calculator.py
from typing import Dict, Optional
from datetime import datetime
import aiohttp
import asyncpg

from src.models.calculation import FeeBreakdown

class FeeCalculatorService:
    def __init__(self):
        self.db_pool = None
        self.session = None
        self.fee_cache = {}

    async def initialize(self):
        """サービス初期化"""
        self.db_pool = await asyncpg.create_pool(settings.DATABASE_URL)
        self.session = aiohttp.ClientSession()
        
        # 最新の手数料情報を取得
        await self.update_fee_configurations()

    async def calculate_all_fees(
        self, 
        ebay_price: float, 
        category_id: str, 
        item_condition: str,
        supplier_type: str
    ) -> FeeBreakdown:
        """全手数料計算"""
        
        # eBay手数料
        ebay_fees = await self.calculate_ebay_fees(ebay_price, category_id, item_condition)
        
        # PayPal手数料
        paypal_fee = self.calculate_paypal_fee(ebay_price)
        
        # 国内送料（サプライヤータイプ別）
        domestic_shipping = await self.calculate_domestic_shipping(supplier_type, ebay_price)
        
        # 国際送料
        international_shipping = await self.calculate_international_shipping(ebay_price)
        
        # 梱包費
        packaging_cost = self.calculate_packaging_cost(ebay_price)
        
        # 関税申告手数料
        customs_fee = 5.0  # 固定
        
        # 為替手数料
        fx_fee = ebay_price * 0.03  # 3%
        
        return FeeBreakdown(
            ebay_final_value_fee=ebay_fees['final_value_fee'],
            ebay_insertion_fee=ebay_fees['insertion_fee'],
            ebay_international_fee=ebay_fees.get('international_fee', 0),
            paypal_fee=paypal_fee,
            domestic_shipping_cost=domestic_shipping,
            international_shipping_cost=international_shipping,
            packaging_cost=packaging_cost,
            customs_declaration_fee=customs_fee,
            fx_conversion_fee=fx_fee,
            total_fees=sum([
                ebay_fees['final_value_fee'],
                ebay_fees['insertion_fee'],
                ebay_fees.get('international_fee', 0),
                paypal_fee,
                domestic_shipping,
                international_shipping,
                packaging_cost,
                customs_fee,
                fx_fee
            ])
        )

    async def calculate_ebay_fees(self, price: float, category_id: str, condition: str) -> Dict[str, float]:
        """eBay手数料計算"""
        config = self.fee_cache.get('ebay', {})
        
        # Final Value Fee (カテゴリ別)
        category_fee_rate = config.get('category_fees', {}).get(category_id, 0.1)  # デフォルト10%
        final_value_fee = price * category_fee_rate
        
        # 上限チェック
        max_fee = config.get('max_final_value_fee', 750)  # $750上限
        final_value_fee = min(final_value_fee, max_fee)
        
        # Insertion Fee
        insertion_fee = config.get('insertion_fee', 0.35)  # $0.35
        
        # International Fee（日本からの出品）
        international_fee = price * config.get('international_fee_rate', 0.015)  # 1.5%
        
        return {
            'final_value_fee': final_value_fee,
            'insertion_fee': insertion_fee,
            'international_fee': international_fee
        }

    def calculate_paypal_fee(self, price: float) -> float:
        """PayPal手数料計算"""
        # PayPal国際取引手数料: 3.9% + $0.30
        return (price * 0.039) + 0.30

    async def calculate_domestic_shipping(self, supplier_type: str, item_price: float) -> float:
        """国内送料計算"""
        shipping_rates = {
            'amazon': 0,  # Prime配送無料
            'rakuten': 500,  # 平均送料
            'mercari': 300,  # らくらくメルカリ便
            'yahoo_auctions': 800  # 宅急便
        }
        
        base_cost = shipping_rates.get(supplier_type, 600)
        
        # 高額商品は送料が高くなる傾向
        if item_price > 10000:  # 1万円以上
            base_cost *= 1.5
        elif item_price > 5000:  # 5千円以上
            base_cost *= 1.2
            
        return base_cost

    async def calculate_international_shipping(self, item_price: float) -> float:
        """国際送料計算"""
        # 価格帯別送料テーブル
        if item_price < 50:
            return 15.0  # $15
        elif item_price < 100:
            return 25.0  # $25
        elif item_price < 300:
            return 35.0  # $35
        elif item_price < 500:
            return 45.0  # $45
        else:
            return 60.0  # $60

    def calculate_packaging_cost(self, item_price: float) -> float:
        """梱包費計算"""
        # 商品価格に応じた梱包費
        if item_price < 100:
            return 3.0  # 簡易梱包
        elif item_price < 500:
            return 8.0  # 標準梱包
        else:
            return 15.0  # 厳重梱包

    async def update_fee_configurations(self):
        """最新手数料情報の更新"""
        try:
            # eBay手数料情報を外部APIまたはスクレイピングで取得
            ebay_config = await self.fetch_ebay_fee_config()
            self.fee_cache['ebay'] = ebay_config
            
            # PayPal手数料情報
            paypal_config = await self.fetch_paypal_fee_config()
            self.fee_cache['paypal'] = paypal_config
            
            # データベースに保存
            await self.save_fee_config_to_db()
            
        except Exception as e:
            print(f"Fee configuration update error: {e}")
            # フォールバック：デフォルト設定を使用
            self.load_default_fee_config()

    async def fetch_ebay_fee_config(self) -> Dict:
        """eBay手数料設定取得"""
        # 実際の実装では、eBay APIまたは公式ページのスクレイピング
        return {
            'final_value_fee_rate': 0.1,  # 10%
            'insertion_fee': 0.35,
            'international_fee_rate': 0.015,
            'max_final_value_fee': 750,
            'category_fees': {
                '58058': 0.12,  # Cell Phones & Accessories - 12%
                '293': 0.08,    # Consumer Electronics - 8%
                '11450': 0.13,  # Clothing - 13%
            }
        }

    async def fetch_paypal_fee_config(self) -> Dict:
        """PayPal手数料設定取得"""
        return {
            'domestic_rate': 0.029,  # 2.9%
            'international_rate': 0.039,  # 3.9%
            'fixed_fee': 0.30
        }

    def load_default_fee_config(self):
        """デフォルト手数料設定読み込み"""
        self.fee_cache = {
            'ebay': {
                'final_value_fee_rate': 0.1,
                'insertion_fee': 0.35,
                'international_fee_rate': 0.015,
                'max_final_value_fee': 750
            },
            'paypal': {
                'international_rate': 0.039,
                'fixed_fee': 0.30
            }
        }

    async def save_fee_config_to_db(self):
        """手数料設定をデータベースに保存"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO fee_configurations (config_type, config_data, updated_at)
                VALUES ('ebay', $1, CURRENT_TIMESTAMP), ('paypal', $2, CURRENT_TIMESTAMP)
                ON CONFLICT (config_type) DO UPDATE SET
                    config_data = EXCLUDED.config_data,
                    updated_at = EXCLUDED.updated_at
            """, self.fee_cache['ebay'], self.fee_cache['paypal'])

    async def close(self):
        """リソースクリーンアップ"""
        if self.session:
            await self.session.close()
        if self.db_pool:
            await self.db_pool.close()
```

---

## 6. 通知サービス開発指示書

### 6.1 サービス構成

```python
# services/notification/src/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from typing import Dict, List
from contextlib import asynccontextmanager

from src.services.notification_manager import NotificationManager
from src.services.websocket_manager import WebSocketManager
from src.services.kafka_consumer import KafkaConsumerService
from src.api import notifications, health
from src.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時処理
    notification_manager = NotificationManager()
    websocket_manager = WebSocketManager()
    
    await notification_manager.initialize()
    
    # Kafkaコンシューマー起動
    consumer_service = KafkaConsumerService(notification_manager, websocket_manager)
    asyncio.create_task(consumer_service.start_consuming())
    
    app.state.notification_manager = notification_manager
    app.state.websocket_manager = websocket_manager
    
    yield
    
    # 終了時処理
    await consumer_service.stop_consuming()
    await notification_manager.close()

app = FastAPI(
    title="Notification Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーティング
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

# WebSocket エンドポイント
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await app.state.websocket_manager.connect(websocket, user_id)
    try:
        while True:
            # クライアントからのメッセージを受信（ハートビートなど）
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get('type') == 'ping':
                await websocket.send_text(json.dumps({'type': 'pong'}))
                
    except WebSocketDisconnect:
        app.state.websocket_manager.disconnect(user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=settings.DEBUG)
```

### 6.2 通知管理サービス

```python
# services/notification/src/services/notification_manager.py
import asyncio
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import aioredis
import aiohttp
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

from src.models.notification import Notification, NotificationType, NotificationPriority
from src.config import settings

class NotificationManager:
    def __init__(self):
        self.redis = None
        self.session = None
        self.notification_handlers = {
            NotificationType.PROFIT_OPPORTUNITY: self.handle_profit_opportunity,
            NotificationType.PRICE_ALERT: self.handle_price_alert,
            NotificationType.RISK_WARNING: self.handle_risk_warning,
            NotificationType.MARKET_TREND: self.handle_market_trend,
            NotificationType.SYSTEM_ALERT: self.handle_system_alert
        }

    async def initialize(self):
        """サービス初期化"""
        self.redis = await aioredis.from_url(settings.REDIS_URL)
        self.session = aiohttp.ClientSession()

    async def send_notification(self, notification: Notification):
        """通知送信"""
        try:
            # 通知の重複チェック
            if await self.is_duplicate_notification(notification):
                return

            # 通知履歴に保存
            await self.save_notification_history(notification)

            # 通知タイプ別処理
            handler = self.notification_handlers.get(notification.type)
            if handler:
                await handler(notification)

            # ユーザー設定に基づく配信
            await self.deliver_notification(notification)

        except Exception as e:
            print(f"Notification send error: {e}")

    async def handle_profit_opportunity(self, notification: Notification):
        """利益機会通知処理"""
        data = notification.data
        
        # 高利益率商品の特別処理
        if data.get('profit_margin', 0) > 50:
            notification.priority = NotificationPriority.HIGH
            
            # Slack通知（設定されている場合）
            await self.send_slack_notification(
                f"🚀 高収益機会発見！\n"
                f"商品: {data.get('product_title', 'Unknown')}\n"
                f"利益率: {data.get('profit_margin', 0):.1f}%\n"
                f"推定利益: ${data.get('estimated_profit', 0):.2f}"
            )

    async def handle_price_alert(self, notification: Notification):
        """価格アラート処理"""
        data = notification.data
        
        # 価格変動の方向に応じた処理
        price_change = data.get('price_change_percent', 0)
        
        if price_change < -20:  # 20%以上の価格下落
            notification.priority = NotificationPriority.HIGH
            notification.title = f"🔥 大幅値下がり検出: {data.get('product_title', '')}"
        elif price_change > 20:  # 20%以上の価格上昇
            notification.title = f"📈 価格上昇アラート: {data.get('product_title', '')}"

    async def handle_risk_warning(self, notification: Notification):
        """リスク警告処理"""
        data = notification.data
        risk_level = data.get('risk_level', 'medium')
        
        if risk_level == 'high':
            notification.priority = NotificationPriority.URGENT
            notification.title = f"⚠️ 高リスク警告: {data.get('product_title', '')}"
            
            # 緊急通知の場合はメール送信
            await self.send_email_notification(notification)

    async def handle_market_trend(self, notification: Notification):
        """市場トレンド通知処理"""
        data = notification.data
        trend_strength = data.get('trend_strength', 0)
        
        if trend_strength > 0.8:  # 強いトレンド
            notification.priority = NotificationPriority.HIGH

    async def handle_system_alert(self, notification: Notification):
        """システムアラート処理"""
        data = notification.data
        alert_type = data.get('alert_type', 'info')
        
        if alert_type in ['error', 'critical']:
            notification.priority = NotificationPriority.URGENT
            
            # システム管理者に即座にメール通知
            await self.send_admin_email(notification)

    async def deliver_notification(self, notification: Notification):
        """通知配信"""
        user_settings = await self.get_user_notification_settings(notification.user_id)
        
        # WebSocket（リアルタイム通知）
        if user_settings.get('realtime_enabled', True):
            await self.send_websocket_notification(notification)
        
        # メール通知
        if user_settings.get('email_enabled', False) and notification.priority in [
            NotificationPriority.HIGH, NotificationPriority.URGENT
        ]:
            await self.send_email_notification(notification)
        
        # プッシュ通知（モバイル）
        if user_settings.get('push_enabled', False):
            await self.send_push_notification(notification)

    async def send_websocket_notification(self, notification: Notification):
        """WebSocket通知送信"""
        message = {
            'type': 'notification',
            'id': notification.id,
            'title': notification.title,
            'message': notification.message,
            'priority': notification.priority.value,
            'notification_type': notification.type.value,
            'data': notification.data,
            'timestamp': notification.created_at.isoformat()
        }
        
        # Redisに通知を発行（WebSocketマネージャーが購読）
        await self.redis.publish(
            f"notifications:{notification.user_id}",
            json.dumps(message)
        )

    async def send_email_notification(self, notification: Notification):
        """メール通知送信"""
        try:
            user_email = await self.get_user_email(notification.user_id)
            if not user_email:
                return

            msg = MimeMultipart()
            msg['From'] = settings.SMTP_FROM_EMAIL
            msg['To'] = user_email
            msg['Subject'] = notification.title

            # HTMLメール本文作成
            html_body = self.create_email_template(notification)
            msg.attach(MimeText(html_body, 'html'))

            # SMTP送信
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)

        except Exception as e:
            print(f"Email notification error: {e}")

    async def send_push_notification(self, notification: Notification):
        """プッシュ通知送信"""
        try:
            device_tokens = await self.get_user_device_tokens(notification.user_id)
            
            for token in device_tokens:
                payload = {
                    'to': token,
                    'title': notification.title,
                    'body': notification.message,
                    'data': notification.data
                }
                
                async with self.session.post(
                    'https://exp.host/--/api/v2/push/send',
                    headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
                    json=payload
                ) as response:
                    if response.status != 200:
                        print(f"Push notification failed: {await response.text()}")

        except Exception as e:
            print(f"Push notification error: {e}")

    async def send_slack_notification(self, message: str):
        """Slack通知送信"""
        if not settings.SLACK_WEBHOOK_URL:
            return
            
        try:
            payload = {'text': message}
            async with self.session.post(
                settings.SLACK_WEBHOOK_URL,
                json=payload
            ) as response:
                if response.status != 200:
                    print(f"Slack notification failed: {await response.text()}")
                    
        except Exception as e:
            print(f"Slack notification error: {e}")

    def create_email_template(self, notification: Notification) -> str:
        """メールテンプレート作成"""
        template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{notification.title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f4f4f4; padding: 20px; border-radius: 5px; }}
                .content {{ padding: 20px; }}
                .priority-high {{ border-left: 5px solid #ff6b6b; }}
                .priority-urgent {{ border-left: 5px solid #ff0000; }}
                .data-table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
                .data-table th, .data-table td {{ 
                    border: 1px solid #ddd; padding: 8px; text-align: left; 
                }}
                .data-table th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header priority-{notification.priority.value.lower()}">
                    <h2>{notification.title}</h2>
                    <p><strong>優先度:</strong> {notification.priority.value}</p>
                    <p><strong>時刻:</strong> {notification.created_at.strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                <div class="content">
                    <p>{notification.message}</p>
                    {self.create_data_table(notification.data)}
                </div>
            </div>
        </body>
        </html>
        """
        return template

    def create_data_table(self, data: Dict) -> str:
        """データテーブル作成"""
        if not data:
            return ""
            
        table_html = '<table class="data-table"><thead><tr><th>項目</th><th>値</th></tr></thead><tbody>'
        
        for key, value in data.items():
            if isinstance(value, (int, float)):
                if 'price' in key.lower() or 'profit' in key.lower():
                    value = f"${value:.2f}"
                elif 'rate' in key.lower() or 'percent' in key.lower():
                    value = f"{value:.1f}%"
            
            table_html += f'<tr><td>{key.replace("_", " ").title()}</td><td>{value}</td></tr>'
        
        table_html += '</tbody></table>'
        return table_html

    async def is_duplicate_notification(self, notification: Notification) -> bool:
        """重複通知チェック"""
        # 同じユーザー、同じタイプ、同じ商品の通知が10分以内にあるかチェック
        key = f"notification_check:{notification.user_id}:{notification.type.value}:{notification.data.get('product_id', '')}"
        
        if await self.redis.exists(key):
            return True
        
        # 10分間のキャッシュ
        await self.redis.setex(key, 600, "1")
        return False

    async def save_notification_history(self, notification: Notification):
        """通知履歴保存"""
        history_data = {
            'id': notification.id,
            'user_id': notification.user_id,
            'type': notification.type.value,
            'title': notification.title,
            'message': notification.message,
            'priority': notification.priority.value,
            'data': json.dumps(notification.data),
            'created_at': notification.created_at.isoformat()
        }
        
        # Redisリストに追加（最新100件を保持）
        await self.redis.lpush(f"notification_history:{notification.user_id}", json.dumps(history_data))
        await self.redis.ltrim(f"notification_history:{notification.user_id}", 0, 99)

    async def get_user_notification_settings(self, user_id: int) -> Dict:
        """ユーザー通知設定取得"""
        settings_json = await self.redis.hget("user_notification_settings", str(user_id))
        if settings_json:
            return json.loads(settings_json)
        
        # デフォルト設定
        return {
            'realtime_enabled': True,
            'email_enabled': False,
            'push_enabled': False,
            'minimum_priority': 'MEDIUM'
        }

    async def get_user_email(self, user_id: int) -> Optional[str]:
        """ユーザーメールアドレス取得"""
        email = await self.redis.hget("user_emails", str(user_id))
        return email.decode() if email else None

    async def get_user_device_tokens(self, user_id: int) -> List[str]:
        """ユーザーデバイストークン取得"""
        tokens_json = await self.redis.hget("user_device_tokens", str(user_id))
        if tokens_json:
            return json.loads(tokens_json)
        return []

    async def send_admin_email(self, notification: Notification):
        """システム管理者へのメール送信"""
        admin_emails = settings.ADMIN_EMAILS
        if not admin_emails:
            return
            
        for email in admin_emails:
            msg = MimeMultipart()
            msg['From'] = settings.SMTP_FROM_EMAIL
            msg['To'] = email
            msg['Subject'] = f"[SYSTEM ALERT] {notification.title}"
            
            body = f"""
            システムアラートが発生しました。
            
            タイトル: {notification.title}
            メッセージ: {notification.message}
            時刻: {notification.created_at}
            データ: {json.dumps(notification.data, indent=2)}
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            try:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.starttls()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            except Exception as e:
                print(f"Admin email notification error: {e}")

    async def close(self):
        """リソースクリーンアップ"""
        if self.redis:
            await self.redis.close()
        if self.session:
            await self.session.close()
```

---

## 7. フロントエンド開発指示書

### 7.1 React アプリケーション構成

```typescript
// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ThemeProvider } from './contexts/ThemeContext';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProductSearch from './pages/ProductSearch';
import ProfitAnalysis from './pages/ProfitAnalysis';
import Settings from './pages/Settings';
import Login from './pages/Login';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            <Router>
              <div className="App">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="search" element={<ProductSearch />} />
                    <Route path="analysis" element={<ProfitAnalysis />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
                <Toaster position="top-right" />
                <ReactQueryDevtools initialIsOpen={false} />
              </div>
            </Router>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### 7.2 ダッシュボードコンポーネント

```typescript
// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

import { MetricCard } from '../components/MetricCard';
import { ProfitChart } from '../components/charts/ProfitChart';
import { ProductTable } from '../components/ProductTable';
import { NotificationPanel } from '../components/NotificationPanel';
import { RealTimeUpdates } from '../components/RealTimeUpdates';

import { dashboardApi } from '../api/dashboard';
import { useWebSocket } from '../hooks/useWebSocket';

interface DashboardMetrics {
  totalProducts: number;
  totalProfit: number;
  averageProfitMargin: number;
  highRiskProducts: number;
  profitTrend: Array<{
    date: string;
    profit: number;
    margin: number;
  }>;
  topProducts: Array<{
    id: number;
    title: string;
    profitMargin: number;
    recommendationScore: number;
    supplier: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const { lastMessage } = useWebSocket();

  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics', selectedTimeRange],
    queryFn: () => dashboardApi.getMetrics(selectedTimeRange),
    refetchInterval: 60000, // 1分ごとに更新
  });

  // リアルタイム更新の処理
  useEffect(() => {
    if (lastMessage?.type === 'profit_calculation_complete') {
      refetch();
    }
  }, [lastMessage, refetch]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        ダッシュボードデータの読み込みに失敗しました。
      </Alert>
    );
  }

  return (
    <Box p={3}>
      {/* リアルタイム更新インジケーター */}
      <RealTimeUpdates />

      {/* メトリクスカード */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="総商品数"
            value={metrics?.totalProducts || 0}
            icon={<ShoppingCart />}
            color="primary"
            trend="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="総利益"
            value={`${(metrics?.totalProfit || 0).toLocaleString()}`}
            icon={<DollarSign />}
            color="success"
            trend="+8.5%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="平均利益率"
            value={`${(metrics?.averageProfitMargin || 0).toFixed(1)}%`}
            icon={<TrendingUp />}
            color="info"
            trend="+2.1%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="高リスク商品"
            value={metrics?.highRiskProducts || 0}
            icon={<AlertTriangle />}
            color="warning"
            trend="-5%"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 利益トレンドチャート */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                利益トレンド
              </Typography>
              {metrics?.profitTrend && (
                <ProfitChart
                  data={metrics.profitTrend}
                  timeRange={selectedTimeRange}
                  onTimeRangeChange={setSelectedTimeRange}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 通知パネル */}
        <Grid item xs={12} lg={4}>
          <NotificationPanel />
        </Grid>

        {/* 高収益商品テーブル */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                注目商品 (高収益機会)
              </Typography>
              {metrics?.topProducts && (
                <ProductTable
                  products={metrics.topProducts}
                  showActions={true}
                  onProductClick={(product) => {
                    // 商品詳細ページへ遷移
                    window.open(`/product/${product.id}`, '_blank');
                  }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
```

### 7.3 商品検索コンポーネント

```typescript
// frontend/src/pages/ProductSearch.tsx
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search,
  Filter,
  ExpandMore,
  Download,
  Refresh,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { ProductCard } from '../components/ProductCard';
import { SearchFilters } from '../components/SearchFilters';
import { ExportDialog } from '../components/ExportDialog';
import { BulkActions } from '../components/BulkActions';

import { productApi } from '../api/products';
import { useDebounce } from '../hooks/useDebounce';

interface SearchParams {
  keywords: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sortBy?: string;
  minProfitMargin?: number;
  minRecommendationScore?: number;
}

interface SearchResults {
  products: Product[];
  total: number;
  hasMore: boolean;
  aggregations: {
    categories: Array<{ name: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    avgProfitMargin: number;
  };
}

const ProductSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    keywords: '',
    sortBy: 'research_score',
    minProfitMargin: 10,
    minRecommendationScore: 70,
  });
  
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const debouncedKeywords = useDebounce(searchParams.keywords, 500);

  // 商品検索クエリ
  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
  } = useQuery<SearchResults>({
    queryKey: ['product-search', { ...searchParams, keywords: debouncedKeywords }],
    queryFn: () => productApi.searchProducts({ ...searchParams, keywords: debouncedKeywords }),
    enabled: debouncedKeywords.length > 2,
  });

  // バルク利益計算ミューテーション
  const bulkCalculateMutation = useMutation({
    mutationFn: (productIds: number[]) => productApi.bulkCalculateProfit(productIds),
    onSuccess: () => {
      toast.success('利益計算を開始しました。結果は数分後に反映されます。');
      refetch();
    },
    onError: (error) => {
      toast.error('利益計算の開始に失敗しました。');
    },
  });

  const handleSearch = useCallback((newParams: Partial<SearchParams>) => {
    setSearchParams(prev => ({ ...prev, ...newParams }));
  }, []);

  const handleProductSelect = useCallback((productId: number, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  const handleBulkCalculate = useCallback(() => {
    if (selectedProducts.size === 0) {
      toast.error('商品を選択してください。');
      return;
    }
    
    bulkCalculateMutation.mutate(Array.from(selectedProducts));
  }, [selectedProducts, bulkCalculateMutation]);

  const handleExport = useCallback((format: 'csv' | 'xlsx') => {
    const productIds = selectedProducts.size > 0 ? Array.from(selectedProducts) : 
                      searchResults?.products.map(p => p.id) || [];
    
    if (productIds.length === 0) {
      toast.error('エクスポートする商品がありません。');
      return;
    }

    // エクスポート処理
    productApi.exportProducts(productIds, format)
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_${Date.now()}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('エクスポートが完了しました。');
      })
      .catch(() => {
        toast.error('エクスポートに失敗しました。');
      });
  }, [selectedProducts, searchResults]);

  return (
    <Box p={3}>
      {/* 検索バー */}
      <Card mb={3}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="商品名、ブランド、型番を入力..."
                value={searchParams.keywords}
                onChange={(e) => handleSearch({ keywords: e.target.value })}
                InputProps={{
                  startAdornment: <Search className="mr-2 text-gray-400" />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>並び順</InputLabel>
                <Select
                  value={searchParams.sortBy}
                  onChange={(e) => handleSearch({ sortBy: e.target.value })}
                >
                  <MenuItem value="research_score">リサーチスコア</MenuItem>
                  <MenuItem value="profit_margin">利益率</MenuItem>
                  <MenuItem value="price_asc">価格（安い順）</MenuItem>
                  <MenuItem value="price_desc">価格（高い順）</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Filter />}
                onClick={() => setShowFilters(!showFilters)}
              >
                フィルター
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Refresh />}
                onClick={() => refetch()}
                disabled={isLoading}
              >
                更新
              </Button>
            </Grid>
          </Grid>

          {/* 詳細フィルター */}
          <Accordion expanded={showFilters}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>詳細フィルター</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <SearchFilters
                filters={searchParams}
                onFiltersChange={handleSearch}
                aggregations={searchResults?.aggregations}
              />
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* バルクアクション */}
      {selectedProducts.size > 0 && (
        <BulkActions
          selectedCount={selectedProducts.size}
          onCalculateProfit={handleBulkCalculate}
          onExport={() => setExportDialogOpen(true)}
          isCalculating={bulkCalculateMutation.isPending}
        />
      )}

      {/* 検索結果 */}
      {isLoading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          検索に失敗しました。再試行してください。
        </Alert>
      )}

      {searchResults && (
        <>
          {/* 結果サマリー */}
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              {searchResults.total}件の商品が見つかりました
            </Typography>
            {searchResults.aggregations && (
              <Chip 
                label={`平均利益率: ${searchResults.aggregations.avgProfitMargin.toFixed(1)}%`}
                size="small"
                color="primary"
              />
            )}
          </Box>

          {/* 商品カード */}
          <Grid container spacing={2}>
            {searchResults.products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <ProductCard
                  product={product}
                  selected={selectedProducts.has(product.id)}
                  onSelectionChange={(selected) => 
                    handleProductSelect(product.id, selected)
                  }
                  onCalculateProfit={() => 
                    bulkCalculateMutation.mutate([product.id])
                  }
                />
              </Grid>
            ))}
          </Grid>

          {/* もっと読み込む */}
          {searchResults.hasMore && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Button variant="outlined" onClick={() => {
                // ページネーション処理
              }}>
                さらに読み込む
              </Button>
            </Box>
          )}
        </>
      )}

      {/* エクスポートダイアログ */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        selectedCount={selectedProducts.size}
        totalCount={searchResults?.total || 0}
      />
    </Box>
  );
};

export default ProductSearch;
```

---

## 8. Chrome拡張機能開発指示書

### 8.1 マニフェスト設定

```json
// chrome-extension/manifest.json
{
  "manifest_version": 3,
  "name": "総合リサーチツール - eBay×国内EC連携",
  "version": "1.0.0",
  "description": "eBayで売れる商品を基に、日本国内での最適な仕入れ先を自動で発見",
  
  "permissions": [
    "activeTab",
    "storage",
    "tabs",
    "scripting"
  ],
  
  "host_permissions": [
    "https://www.ebay.com/*",
    "https://www.amazon.co.jp/*",
    "https://item.rakuten.co.jp/*",
    "https://jp.mercari.com/*",
    "https://page.auctions.yahoo.co.jp/*",
    "https://your-api-domain.com/*"
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "content_scripts": [
    {
      "matches": ["https://www.ebay.com/*"],
      "js": ["content-scripts/ebay.js"],
      "css": ["styles/ebay.css"]
    },
    {
      "matches": ["https://www.amazon.co.jp/*"],
      "js": ["content-scripts/amazon.js"],
      "css": ["styles/amazon.css"]
    },
    {
      "matches": ["https://item.rakuten.co.jp/*"],
      "js": ["content-scripts/rakuten.js"],
      "css": ["styles/rakuten.css"]
    },
    {
      "matches": ["https://jp.mercari.com/*"],
      "js": ["content-scripts/mercari.js"],
      "css": ["styles/mercari.css"]
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_title": "総合リサーチツール"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["icons/*", "popup.html"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 8.2 eBayコンテンツスクリプト

```javascript
// chrome-extension/content-scripts/ebay.js

class EbayContentScript {
  constructor() {
    this.apiBaseUrl = 'https://your-api-domain.com/api';
    this.authToken = null;
    this.init();
  }

  async init() {
    // 認証トークン取得
    this.authToken = await this.getAuthToken();
    
    // ページタイプ判定
    const pageType = this.detectPageType();
    
    switch (pageType) {
      case 'search-results':
        this.enhanceSearchResults();
        break;
      case 'product-detail':
        this.enhanceProductDetail();
        break;
      case 'sold-listings':
        this.enhanceSoldListings();
        break;
    }
  }

  detectPageType() {
    const url = window.location.href;
    
    if (url.includes('/sch/')) {
      return 'search-results';
    } else if (url.includes('/itm/')) {
      return 'product-detail';
    } else if (url.includes('_sacat') && url.includes('LH_Sold=1')) {
      return 'sold-listings';
    }
    
    return 'unknown';
  }

  async enhanceSearchResults() {
    // 検索結果の各商品にリサーチボタンを追加
    const productItems = document.querySelectorAll('.s-item');
    
    for (const item of productItems) {
      const productData = this.extractProductData(item);
      if (productData) {
        await this.addResearchButton(item, productData);
      }
    }

    // バルクリサーチボタンをページ上部に追加
    this.addBulkResearchButton();
  }

  async enhanceProductDetail() {
    const productData = this.extractDetailProductData();
    if (productData) {
      await this.addDetailedAnalysis(productData);
    }
  }

  extractProductData(itemElement) {
    try {
      const titleElement = itemElement.querySelector('.s-item__title');
      const priceElement = itemElement.querySelector('.s-item__price');
      const linkElement = itemElement.querySelector('.s-item__link');
      const imageElement = itemElement.querySelector('.s-item__image');
      const shippingElement = itemElement.querySelector('.s-item__shipping');

      if (!titleElement || !priceElement || !linkElement) {
        return null;
      }

      return {
        title: titleElement.textContent.trim(),
        price: this.parsePrice(priceElement.textContent),
        url: linkElement.href,
        imageUrl: imageElement ? imageElement.src : null,
        shipping: shippingElement ? shippingElement.textContent.trim() : null,
        itemId: this.extractItemId(linkElement.href)
      };
    } catch (error) {
      console.error('Product data extraction error:', error);
      return null;
    }
  }

  extractDetailProductData() {
    try {
      return {
        title: document.querySelector('#x-title-label-lbl')?.textContent?.trim(),
        price: this.parsePrice(document.querySelector('.display-price')?.textContent),
        itemId: this.extractItemIdFromUrl(window.location.href),
        condition: document.querySelector('.u-flL.condText')?.textContent?.trim(),
        seller: document.querySelector('.mbg-nw')?.textContent?.trim(),
        category: this.extractCategory(),
        specifications: this.extractSpecifications()
      };
    } catch (error) {
      console.error('Detail product data extraction error:', error);
      return null;
    }
  }

  async addResearchButton(itemElement, productData) {
    // 既存のボタンをチェック
    if (itemElement.querySelector('.research-tool-button')) {
      return;
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'research-tool-container';
    
    const researchButton = document.createElement('button');
    researchButton.className = 'research-tool-button';
    researchButton.innerHTML = `
      <span class="button-text">🔍 仕入先検索</span>
      <span class="loading-spinner" style="display: none;">⏳</span>
    `;
    
    researchButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      await this.handleResearchClick(researchButton, productData);
    });

    buttonContainer.appendChild(researchButton);
    
    // ボタンを適切な位置に挿入
    const priceElement = itemElement.querySelector('.s-item__price');
    if (priceElement && priceElement.parentNode) {
      priceElement.parentNode.insertBefore(buttonContainer, priceElement.nextSibling);
    }
  }

  async handleResearchClick(buttonElement, productData) {
    const buttonText = buttonElement.querySelector('.button-text');
    const spinner = buttonElement.querySelector('.loading-spinner');
    
    try {
      // ローディング状態
      buttonText.style.display = 'none';
      spinner.style.display = 'inline';
      buttonElement.disabled = true;

      // APIに商品データを送信してリサーチ開始
      const response = await this.callResearchAPI(productData);
      
      if (response.success) {
        this.showSuccessState(buttonElement, response.data);
      } else {
        this.showErrorState(buttonElement, response.error);
      }

    } catch (error) {
      console.error('Research API call failed:', error);
      this.showErrorState(buttonElement, 'APIエラーが発生しました');
    }
  }

  async callResearchAPI(productData) {
    const response = await fetch(`${this.apiBaseUrl}/ebay/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        product: productData,
        options: {
          includeDomesticSuppliers: true,
          includeProfitCalculation: true,
          includeRiskAssessment: true
        }
      })
    });

    return await response.json();
  }

  showSuccessState(buttonElement, data) {
    const buttonText = buttonElement.querySelector('.button-text');
    const spinner = buttonElement.querySelector('.loading-spinner');
    
    spinner.style.display = 'none';
    buttonText.innerHTML = '✅ 検索完了';
    buttonText.style.display = 'inline';
    buttonElement.disabled = false;
    
    // 結果表示パネルを作成
    this.showResultsPanel(buttonElement, data);
  }

  showErrorState(buttonElement, error) {
    const buttonText = buttonElement.querySelector('.button-text');
    const spinner = buttonElement.querySelector('.loading-spinner');
    
    spinner.style.display = 'none';
    buttonText.innerHTML = '❌ エラー';
    buttonText.style.display = 'inline';
    buttonElement.disabled = false;
    
    // エラーツールチップ表示
    this.showErrorTooltip(buttonElement, error);
  }

  showResultsPanel(buttonElement, data) {
    // 既存のパネルを削除
    const existingPanel = document.querySelector('.research-results-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.className = 'research-results-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>🎯 仕入れ候補発見！</h3>
        <button class="close-panel">×</button>
      </div>
      <div class="panel-content">
        ${this.renderSupplierResults(data.suppliers)}
        ${this.renderProfitAnalysis(data.profitAnalysis)}
        ${this.renderRiskAssessment(data.riskAssessment)}
      </div>
      <div class="panel-footer">
        <button class="btn-primary">詳細レポートを見る</button>
        <button class="btn-secondary">お気に入りに追加</button>
      </div>
    `;

    // パネルイベントリスナー
    panel.querySelector('.close-panel').addEventListener('click', () => {
      panel.remove();
    });

    panel.querySelector('.btn-primary').addEventListener('click', () => {
      this.openDetailReport(data);
    });

    // パネルを挿入
    document.body.appendChild(panel);
    
    // パネル位置調整
    this.positionPanel(panel, buttonElement);
  }

  renderSupplierResults(suppliers) {
    if (!suppliers || suppliers.length === 0) {
      return '<div class="no-suppliers">仕入先が見つかりませんでした</div>';
    }

    return `
      <div class="suppliers-section">
        <h4>📦 仕入先候補 (${suppliers.length}件)</h4>
        <div class="suppliers-list">
          ${suppliers.slice(0, 3).map(supplier => `
            <div class="supplier-item">
              <div class="supplier-info">
                <div class="supplier-name">${supplier.supplierName}</div>
                <div class="supplier-price">¥${supplier.price.toLocaleString()}</div>
                <div class="profit-info">
                  利益率: <span class="profit-rate ${this.getProfitRateClass(supplier.profitMargin)}">${supplier.profitMargin.toFixed(1)}%</span>
                </div>
              </div>
              <div class="supplier-actions">
                <a href="${supplier.url}" target="_blank" class="btn-link">商品を見る</a>
                <div class="reliability-score">信頼度: ${(supplier.reliabilityScore * 100).toFixed(0)}%</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderProfitAnalysis(profitAnalysis) {
    if (!profitAnalysis) return '';

    return `
      <div class="profit-section">
        <h4>💰 利益分析</h4>
        <div class="profit-metrics">
          <div class="metric">
            <span class="metric-label">推定利益</span>
            <span class="metric-value profit">${profitAnalysis.estimatedProfit > 0 ? '+' : ''}${profitAnalysis.estimatedProfit.toFixed(2)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">利益率</span>
            <span class="metric-value ${this.getProfitRateClass(profitAnalysis.profitMargin)}">${profitAnalysis.profitMargin.toFixed(1)}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">ROI</span>
            <span class="metric-value">${profitAnalysis.roi.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  renderRiskAssessment(riskAssessment) {
    if (!riskAssessment) return '';

    const riskLevel = riskAssessment.overallRiskScore < 0.3 ? 'low' : 
                     riskAssessment.overallRiskScore < 0.7 ? 'medium' : 'high';

    return `
      <div class="risk-section">
        <h4>⚠️ リスク評価</h4>
        <div class="risk-indicator">
          <div class="risk-level risk-${riskLevel}">
            ${riskLevel === 'low' ? '低リスク' : riskLevel === 'medium' ? '中リスク' : '高リスク'}
          </div>
          <div class="risk-score">${(riskAssessment.overallRiskScore * 100).toFixed(0)}%</div>
        </div>
        <div class="risk-factors">
          ${riskAssessment.factors.map(factor => `
            <div class="risk-factor">
              <span class="factor-name">${factor.name}</span>
              <span class="factor-impact impact-${factor.impact}">${factor.impact}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  addBulkResearchButton() {
    if (document.querySelector('.bulk-research-button')) {
      return;
    }

    const bulkButton = document.createElement('div');
    bulkButton.className = 'bulk-research-button';
    bulkButton.innerHTML = `
      <button class="bulk-research-btn">
        📊 ページ内全商品をリサーチ
      </button>
    `;

    bulkButton.addEventListener('click', () => {
      this.handleBulkResearch();
    });

    // 検索結果の上部に挿入
    const resultsContainer = document.querySelector('.srp-results');
    if (resultsContainer) {
      resultsContainer.insertBefore(bulkButton, resultsContainer.firstChild);
    }
  }

  async handleBulkResearch() {
    const productItems = document.querySelectorAll('.s-item');
    const products = [];

    for (const item of productItems) {
      const productData = this.extractProductData(item);
      if (productData) {
        products.push(productData);
      }
    }

    if (products.length === 0) {
      alert('リサーチ可能な商品が見つかりません。');
      return;
    }

    if (confirm(`${products.length}件の商品をバルクリサーチします。続行しますか？`)) {
      this.executeBulkResearch(products);
    }
  }

  async executeBulkResearch(products) {
    const progressModal = this.createProgressModal(products.length);
    document.body.appendChild(progressModal);

    try {
      const response = await fetch(`${this.apiBaseUrl}/ebay/bulk-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ products })
      });

      const result = await response.json();

      if (result.success) {
        this.showBulkResults(result.data);
      } else {
        alert('バルクリサーチに失敗しました: ' + result.error);
      }

    } catch (error) {
      console.error('Bulk research error:', error);
      alert('バルクリサーチ中にエラーが発生しました。');
    } finally {
      progressModal.remove();
    }
  }

  // ユーティリティメソッド
  parsePrice(priceText) {
    if (!priceText) return 0;
    const cleaned = priceText.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  extractItemId(url) {
    const match = url.match(/\/itm\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  getProfitRateClass(rate) {
    if (rate >= 30) return 'high-profit';
    if (rate >= 15) return 'medium-profit';
    return 'low-profit';
  }

  async getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['authToken'], (result) => {
        resolve(result.authToken || null);
      });
    });
  }

  positionPanel(panel, referenceElement) {
    const rect = referenceElement.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${rect.bottom + 10}px`;
    panel.style.left = `${Math.min(rect.left, window.innerWidth - 400)}px`;
    panel.style.zIndex = '10000';
  }
}

// スクリプト初期化
const ebayExtension = new EbayContentScript();
```

### 8.3 Amazon コンテンツスクリプト

```javascript
// chrome-extension/content-scripts/amazon.js

class AmazonContentScript {
  constructor() {
    this.apiBaseUrl = 'https://your-api-domain.com/api';
    this.authToken = null;
    this.init();
  }

  async init() {
    this.authToken = await this.getAuthToken();
    
    if (this.isProductPage()) {
      await this.enhanceProductPage();
    } else if (this.isSearchPage()) {
      await this.enhanceSearchPage();
    }
  }

  isProductPage() {
    return window.location.pathname.includes('/dp/') || 
           window.location.pathname.includes('/gp/product/');
  }

  isSearchPage() {
    return window.location.pathname.includes('/s/') ||
           window.location.search.includes('k=');
  }

  async enhanceProductPage() {
    const productData = this.extractProductData();
    if (productData) {
      await this.addEbayPotentialIndicator(productData);
    }
  }

  extractProductData() {
    try {
      return {
        title: document.querySelector('#productTitle')?.textContent?.trim(),
        price: this.parsePrice(document.querySelector('.a-price-whole')?.textContent),
        asin: this.extractASIN(),
        brand: document.querySelector('#bylineInfo')?.textContent?.trim(),
        availability: this.extractAvailability(),
        rating: this.extractRating(),
        reviewCount: this.extractReviewCount(),
        images: this.extractImages(),
        category: this.extractCategory()
      };
    } catch (error) {
      console.error('Amazon product data extraction error:', error);
      return null;
    }
  }

  async addEbayPotentialIndicator(productData) {
    // Amazon商品の横に「eBay転売可能性」インジケーターを追加
    const priceContainer = document.querySelector('#priceblock_dealprice') || 
                          document.querySelector('#priceblock_ourprice') ||
                          document.querySelector('.a-price-whole')?.parentElement;

    if (!priceContainer) return;

    const indicator = document.createElement('div');
    indicator.className = 'ebay-potential-indicator';
    indicator.innerHTML = `
      <div class="indicator-header">
        <span class="indicator-title">🌟 eBay転売ポテンシャル</span>
        <button class="analyze-btn">分析開始</button>
      </div>
      <div class="indicator-content" style="display: none;">
        <div class="loading">分析中...</div>
      </div>
    `;

    indicator.querySelector('.analyze-btn').addEventListener('click', async () => {
      await this.analyzeEbayPotential(productData, indicator);
    });

    priceContainer.parentNode.insertBefore(indicator, priceContainer.nextSibling);
  }

  async analyzeEbayPotential(productData, indicatorElement) {
    const content = indicatorElement.querySelector('.indicator-content');
    const analyzeBtn = indicatorElement.querySelector('.analyze-btn');
    
    try {
      content.style.display = 'block';
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = '分析中...';

      const response = await fetch(`${this.apiBaseUrl}/amazon/ebay-potential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ product: productData })
      });

      const result = await response.json();

      if (result.success) {
        this.displayPotentialAnalysis(content, result.data);
        analyzeBtn.textContent = '✅ 分析完了';
      } else {
        content.innerHTML = '<div class="error">分析に失敗しました</div>';
        analyzeBtn.textContent = '再分析';
        analyzeBtn.disabled = false;
      }

    } catch (error) {
      console.error('eBay potential analysis error:', error);
      content.innerHTML = '<div class="error">エラーが発生しました</div>';
      analyzeBtn.textContent = '再分析';
      analyzeBtn.disabled = false;
    }
  }

  displayPotentialAnalysis(container, data) {
    const potentialScore = data.potentialScore || 0;
    const competition = data.competition || {};
    const priceComparison = data.priceComparison || {};

    container.innerHTML = `
      <div class="potential-score">
        <div class="score-circle score-${this.getScoreClass(potentialScore)}">
          <span class="score-value">${potentialScore}/100</span>
        </div>
        <div class="score-label">転売ポテンシャル</div>
      </div>
      
      <div class="analysis-details">
        <div class="detail-item">
          <span class="detail-label">eBay平均価格:</span>
          <span class="detail-value">${priceComparison.ebayAvgPrice ? '
    # 起動時処理
    await init_db()
    
    # Kafkaコンシューマー起動
    consumer_service = KafkaConsumerService()
    asyncio.create_task(consumer_service.start_consuming())
    
    yield
    
    # 終了時処理
    await consumer_service.stop_consuming()

app = FastAPI(
    title="Domestic Supplier Service",
    version="1.0.0",
    lifespan=lifespan
)

# ミドルウェア設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.TRUSTED_HOSTS
)

# ルーティング
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=settings.DEBUG
    )
```

### 4.2 サプライヤー検索サービス

```python
# services/domestic-supplier/src/services/supplier_search.py
import asyncio
import aiohttp
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import re
from bs4 import BeautifulSoup
from urllib.parse import quote, urljoin
import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient

from src.models.supplier import SupplierResult, SearchParams
from src.services.google_search import GoogleSearchService
from src.services.price_extractor import PriceExtractorService
from src.config import settings

class SupplierSearchService:
    def __init__(self):
        self.google_search = GoogleSearchService()
        self.price_extractor = PriceExtractorService()
        self.session = None
        self.db_pool = None
        self.mongo_client = None

    async def initialize(self):
        """サービス初期化"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        
        self.db_pool = await asyncpg.create_pool(settings.DATABASE_URL)
        self.mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)

    async def search_domestic_suppliers(self, product_data: Dict) -> List[SupplierResult]:
        """国内サプライヤー検索"""
        try:
            product_title = product_data.get('title', '')
            product_id = product_data.get('id')
            
            # 商品名からキーワード抽出
            keywords = self.extract_keywords(product_title)
            
            # 各プラットフォームで並行検索
            search_tasks = [
                self.search_amazon(keywords),
                self.search_rakuten(keywords),
                self.search_mercari(keywords),
                self.search_yahoo_auctions(keywords),
                self.search_other_platforms(keywords)
            ]
            
            results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # 結果をフラット化して重複除去
            all_suppliers = []
            for result in results:
                if isinstance(result, list):
                    all_suppliers.extend(result)
                elif isinstance(result, Exception):
                    print(f"Search error: {result}")
            
            # 重複除去と品質フィルタリング
            filtered_suppliers = await self.filter_and_deduplicate(all_suppliers, keywords)
            
            # データベース保存
            await self.save_suppliers_to_db(product_id, filtered_suppliers)
            
            return filtered_suppliers

        except Exception as e:
            print(f"Supplier search error: {e}")
            return []

    def extract_keywords(self, title: str) -> List[str]:
        """商品タイトルからキーワード抽出"""
        # 不要な文字列除去
        cleaned_title = re.sub(r'[^\w\s\-]', ' ', title)
        
        # ストップワード除去
        stop_words = {
            'new', 'used', 'genuine', 'original', 'oem', 'free', 'shipping',
            'fast', 'quick', 'item', 'product', 'brand', 'quality'
        }
        
        words = cleaned_title.lower().split()
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        return keywords[:5]  # 上位5キーワード

    async def search_amazon(self, keywords: List[str]) -> List[SupplierResult]:
        """Amazon検索"""
        suppliers = []
        
        try:
            # Google経由でAmazon商品検索
            query = f"site:amazon.co.jp {' '.join(keywords)}"
            search_results = await self.google_search.search(query, num_results=20)
            
            for result in search_results:
                if 'amazon.co.jp' in result.get('url', ''):
                    supplier_data = await self.extract_amazon_data(result['url'])
                    if supplier_data:
                        suppliers.append(supplier_data)
                        
        except Exception as e:
            print(f"Amazon search error: {e}")
            
        return suppliers

    async def extract_amazon_data(self, url: str) -> Optional[SupplierResult]:
        """Amazon商品データ抽出"""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return None
                    
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # 商品タイトル
                title_elem = soup.find('span', {'id': 'productTitle'})
                title = title_elem.text.strip() if title_elem else ''
                
                # 価格抽出
                price_info = await self.price_extractor.extract_amazon_price(soup)
                
                # 在庫状況
                availability = self.extract_amazon_availability(soup)
                
                # レビュー情報
                rating_info = self.extract_amazon_rating(soup)
                
                if price_info and price_info.get('price'):
                    return SupplierResult(
                        supplier_type='amazon',
                        supplier_name='Amazon.co.jp',
                        supplier_url=url,
                        product_title=title,
                        price=price_info['price'],
                        original_price=price_info.get('original_price'),
                        discount_rate=price_info.get('discount_rate', 0),
                        availability_status=availability,
                        shipping_cost=price_info.get('shipping_cost', 0),
                        delivery_days=price_info.get('delivery_days'),
                        seller_rating=rating_info.get('rating'),
                        seller_review_count=rating_info.get('review_count'),
                        reliability_score=self.calculate_amazon_reliability(rating_info, availability),
                        extracted_at=datetime.now()
                    )
                    
        except Exception as e:
            print(f"Amazon data extraction error: {e}")
            
        return None

    async def search_mercari(self, keywords: List[str]) -> List[SupplierResult]:
        """メルカリ検索（Google経由）"""
        suppliers = []
        
        try:
            # SOLD商品のみ検索
            query = f"site:jp.mercari.com {' '.join(keywords)} SOLD"
            search_results = await self.google_search.search(query, num_results=30)
            
            for result in search_results:
                if 'jp.mercari.com' in result.get('url', '') and 'sold' in result.get('url', '').lower():
                    supplier_data = await self.extract_mercari_data(result['url'])
                    if supplier_data:
                        suppliers.append(supplier_data)
                        
        except Exception as e:
            print(f"Mercari search error: {e}")
            
        return suppliers

    async def extract_mercari_data(self, url: str) -> Optional[SupplierResult]:
        """メルカリ商品データ抽出"""
        try:
            # メルカリのページ構造解析
            async with self.session.get(url) as response:
                if response.status != 200:
                    return None
                    
                html = await response.text()
                
                # JSON-LDデータ抽出
                structured_data = self.price_extractor.extract_structured_data(html)
                
                if structured_data and structured_data.get('price'):
                    return SupplierResult(
                        supplier_type='mercari',
                        supplier_name='メルカリ',
                        supplier_url=url,
                        product_title=structured_data.get('name', ''),
                        price=structured_data['price'],
                        availability_status='sold',  # SOLD商品
                        shipping_cost=structured_data.get('shipping_cost', 0),
                        seller_rating=structured_data.get('seller_rating'),
                        reliability_score=self.calculate_mercari_reliability(structured_data),
                        extracted_at=datetime.now()
                    )
                    
        except Exception as e:
            print(f"Mercari data extraction error: {e}")
            
        return None

    async def search_rakuten(self, keywords: List[str]) -> List[SupplierResult]:
        """楽天市場検索"""
        suppliers = []
        
        try:
            query = f"site:item.rakuten.co.jp {' '.join(keywords)}"
            search_results = await self.google_search.search(query, num_results=20)
            
            for result in search_results:
                if 'item.rakuten.co.jp' in result.get('url', ''):
                    supplier_data = await self.extract_rakuten_data(result['url'])
                    if supplier_data:
                        suppliers.append(supplier_data)
                        
        except Exception as e:
            print(f"Rakuten search error: {e}")
            
        return suppliers

    async def extract_rakuten_data(self, url: str) -> Optional[SupplierResult]:
        """楽天商品データ抽出"""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return None
                    
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # 楽天の価格抽出ロジック
                price_info = await self.price_extractor.extract_rakuten_price(soup)
                
                if price_info and price_info.get('price'):
                    return SupplierResult(
                        supplier_type='rakuten',
                        supplier_name='楽天市場',
                        supplier_url=url,
                        product_title=price_info.get('title', ''),
                        price=price_info['price'],
                        original_price=price_info.get('original_price'),
                        discount_rate=price_info.get('discount_rate', 0),
                        availability_status=price_info.get('availability', 'unknown'),
                        shipping_cost=price_info.get('shipping_cost', 0),
                        delivery_days=price_info.get('delivery_days'),
                        seller_rating=price_info.get('shop_rating'),
                        seller_review_count=price_info.get('review_count'),
                        reliability_score=self.calculate_rakuten_reliability(price_info),
                        extracted_at=datetime.now()
                    )
                    
        except Exception as e:
            print(f"Rakuten data extraction error: {e}")
            
        return None

    async def search_yahoo_auctions(self, keywords: List[str]) -> List[SupplierResult]:
        """ヤフオク検索"""
        suppliers = []
        
        try:
            query = f"site:page.auctions.yahoo.co.jp {' '.join(keywords)}"
            search_results = await self.google_search.search(query, num_results=15)
            
            for result in search_results:
                if 'page.auctions.yahoo.co.jp' in result.get('url', ''):
                    supplier_data = await self.extract_yahoo_auction_data(result['url'])
                    if supplier_data:
                        suppliers.append(supplier_data)
                        
        except Exception as e:
            print(f"Yahoo Auctions search error: {e}")
            
        return suppliers

    async def filter_and_deduplicate(self, suppliers: List[SupplierResult], keywords: List[str]) -> List[SupplierResult]:
        """サプライヤー結果のフィルタリングと重複除去"""
        # 価格が有効な結果のみ
        valid_suppliers = [s for s in suppliers if s.price and s.price > 0]
        
        # 商品タイトルの類似度チェックで重複除去
        deduplicated = []
        for supplier in valid_suppliers:
            is_duplicate = False
            for existing in deduplicated:
                similarity = self.calculate_title_similarity(
                    supplier.product_title, 
                    existing.product_title
                )
                if similarity > 0.8:  # 80%以上の類似度
                    # より信頼性の高い方を残す
                    if supplier.reliability_score > existing.reliability_score:
                        deduplicated.remove(existing)
                        deduplicated.append(supplier)
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                deduplicated.append(supplier)
        
        # 信頼性スコアでソート
        return sorted(deduplicated, key=lambda x: x.reliability_score, reverse=True)

    def calculate_title_similarity(self, title1: str, title2: str) -> float:
        """タイトル類似度計算"""
        # 簡易的なJaccard係数計算
        words1 = set(title1.lower().split())
        words2 = set(title2.lower().split())
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0

    def calculate_amazon_reliability(self, rating_info: Dict, availability: str) -> float:
        """Amazon信頼性スコア計算"""
        base_score = 0.8  # Amazon基本信頼度
        
        if rating_info.get('rating'):
            rating_bonus = (rating_info['rating'] - 3.0) * 0.1  # 3.0を基準とした評価ボーナス
            base_score += rating_bonus
            
        if rating_info.get('review_count', 0) > 100:
            base_score += 0.1  # レビュー数ボーナス
            
        if availability == 'in_stock':
            base_score += 0.1
        elif availability == 'out_of_stock':
            base_score -= 0.2
            
        return max(0.0, min(1.0, base_score))

    def calculate_mercari_reliability(self, data: Dict) -> float:
        """メルカリ信頼性スコア計算"""
        base_score = 0.6  # メルカリ基本信頼度（中古品のため低め）
        
        if data.get('seller_rating'):
            if data['seller_rating'] >= 4.0:
                base_score += 0.2
            elif data['seller_rating'] >= 3.5:
                base_score += 0.1
                
        return max(0.0, min(1.0, base_score))

    def calculate_rakuten_reliability(self, price_info: Dict) -> float:
        """楽天信頼性スコア計算"""
        base_score = 0.75  # 楽天基本信頼度
        
        if price_info.get('shop_rating'):
            rating_bonus = (price_info['shop_rating'] - 3.0) * 0.08
            base_score += rating_bonus
            
        if price_info.get('review_count', 0) > 50:
            base_score += 0.1
            
        return max(0.0, min(1.0, base_score))

    async def save_suppliers_to_db(self, product_id: int, suppliers: List[SupplierResult]):
        """サプライヤー情報をデータベースに保存"""
        async with self.db_pool.acquire() as conn:
            for supplier in suppliers:
                await conn.execute("""
                    INSERT INTO domestic_suppliers (
                        product_id, supplier_type, supplier_name, supplier_url,
                        product_title, price, original_price, discount_rate,
                        availability_status, shipping_cost, delivery_days,
                        seller_rating, seller_review_count, reliability_score,
                        last_price_check
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (product_id, supplier_url) DO UPDATE SET
                        price = EXCLUDED.price,
                        availability_status = EXCLUDED.availability_status,
                        reliability_score = EXCLUDED.reliability_score,
                        last_price_check = EXCLUDED.last_price_check,
                        updated_at = CURRENT_TIMESTAMP
                """, 
                product_id, supplier.supplier_type, supplier.supplier_name,
                supplier.supplier_url, supplier.product_title, supplier.price,
                supplier.original_price, supplier.discount_rate,
                supplier.availability_status, supplier.shipping_cost,
                supplier.delivery_days, supplier.seller_rating,
                supplier.seller_review_count, supplier.reliability_score,
                supplier.extracted_at
                )

    async def close(self):
        """リソースクリーンアップ"""
        if self.session:
            await self.session.close()
        if self.db_pool:
            await self.db_pool.close()
        if self.mongo_client:
            self.mongo_client.close()
```

### 4.3 価格抽出サービス

```python
# services/domestic-supplier/src/services/price_extractor.py
import re
import json
from typing import Dict, Optional
from bs4 import BeautifulSoup
import cv2
import pytesseract
import numpy as np
from PIL import Image
import io
import aiohttp

class PriceExtractorService:
    def __init__(self):
        self.price_patterns = [
            r'[¥￥]\s*([0-9,]+)',
            r'([0-9,]+)\s*円',
            r'price["\s]*:\s*["\s]*([0-9,]+)',
            r'値段["\s]*:\s*["\s]*([0-9,]+)',
        ]

    async def extract_amazon_price(self, soup: BeautifulSoup) -> Optional[Dict]:
        """Amazon価格抽出"""
        price_data = {}
        
        # メイン価格
        price_elem = soup.find('span', {'class': 'a-price-whole'})
        if price_elem:
            price_text = price_elem.text.replace(',', '')
            price_data['price'] = float(price_text)
        
        # 元値（セール時）
        original_elem = soup.find('span', {'class': 'a-text-price'})
        if original_elem:
            original_text = re.search(r'([0-9,]+)', original_elem.text)
            if original_text:
                price_data['original_price'] = float(original_text.group(1).replace(',', ''))
        
        # 送料
        shipping_elem = soup.find('span', {'id': 'price-shipping'})
        if shipping_elem and '送料無料' not in shipping_elem.text:
            shipping_match = re.search(r'([0-9,]+)', shipping_elem.text)
            if shipping_match:
                price_data['shipping_cost'] = float(shipping_match.group(1).replace(',', ''))
        
        # 割引率計算
        if 'original_price' in price_data and 'price' in price_data:
            discount = (price_data['original_price'] - price_data['price']) / price_data['original_price']
            price_data['discount_rate'] = round(discount * 100, 1)
        
        return price_data if price_data else None

    async def extract_rakuten_price(self, soup: BeautifulSoup) -> Optional[Dict]:
        """楽天価格抽出"""
        price_data = {}
        
        # JSON-LD データ優先
        structured = self.extract_structured_data(str(soup))
        if structured and structured.get('price'):
            price_data.update(structured)
            return price_data
        
        # フォールバック: HTML解析
        price_elem = soup.find('span', {'class': re.compile(r'price')})
        if price_elem:
            price_match = re.search(r'([0-9,]+)', price_elem.text)
            if price_match:
                price_data['price'] = float(price_match.group(1).replace(',', ''))
        
        return price_data if price_data else None

    def extract_structured_data(self, html: str) -> Optional[Dict]:
        """構造化データ（JSON-LD）から価格抽出"""
        soup = BeautifulSoup(html, 'html.parser')
        scripts = soup.find_all('script', type='application/ld+json')
        
        for script in scripts:
            try:
                data = json.loads(script.string)
                
                # Product schema
                if data.get('@type') == 'Product':
                    offers = data.get('offers', {})
                    if isinstance(offers, list):
                        offers = offers[0]
                    
                    result = {}
                    if offers.get('price'):
                        result['price'] = float(offers['price'])
                    if offers.get('availability'):
                        result['availability'] = self.normalize_availability(offers['availability'])
                    if data.get('name'):
                        result['title'] = data['name']
                    
                    return result
                    
            except (json.JSONDecodeError, KeyError, ValueError):
                continue
        
        return None

    def normalize_availability(self, availability: str) -> str:
        """在庫状況の正規化"""
        availability_lower = availability.lower()
        
        if 'instock' in availability_lower or '在庫あり' in availability_lower:
            return 'in_stock'
        elif 'outofstock' in availability_lower or '在庫なし' in availability_lower:
            return 'out_of_stock'
        elif 'limitedavailability' in availability_lower or '残りわずか' in availability_lower:
            return 'limited'
        else:
            return 'unknown'

    async def extract_price_from_image(self, image_url: str) -> Optional[float]:
        """画像からOCRで価格抽出"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    if response.status != 200:
                        return None
                    
                    image_data = await response.read()
                    image = Image.open(io.BytesIO(image_data))
                    
                    # OpenCVで前処理
                    cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                    gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
                    
                    # ノイズ除去
                    denoised = cv2.fastNlMeansDenoising(gray)
                    
                    # OCR実行
                    text = pytesseract.image_to_string(denoised, lang='jpn+eng')
                    
                    # 価格パターンマッチング
                    for pattern in self.price_patterns:
                        match = re.search(pattern, text)
                        if match:
                            price_str = match.group(1).replace(',', '')
                            return float(price_str)
                    
        except Exception as e:
            print(f"OCR price extraction error: {e}")
        
        return None

    def extract_text_price(self, text: str) -> Optional[float]:
        """テキストから価格抽出"""
        for pattern in self.price_patterns:
            match = re.search(pattern, text)
            if match:
                price_str = match.group(1).replace(',', '')
                try:
                    return float(price_str)
                except ValueError:
                    continue
        return None
```

---

## 5. 利益計算サービス開発指示書

### 5.1 サービス構成

```python
# services/profit-calculation/src/main.py
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

from src.services.profit_calculator import ProfitCalculatorService
from src.services.fee_calculator import FeeCalculatorService
from src.services.risk_assessor import RiskAssessorService
from src.services.kafka_consumer import KafkaConsumerService
from src.api import calculations, health
from src.database import init_db
from src.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI): + priceComparison.ebayAvgPrice.toFixed(2) : 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">推定利益率:</span>
          <span class="detail-value profit-${this.getProfitClass(priceComparison.profitMargin)}">
            ${priceComparison.profitMargin ? priceComparison.profitMargin.toFixed(1) + '%' : 'N/A'}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">競合出品数:</span>
          <span class="detail-value">${competition.activeListings || 0}件</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">月間売上件数:</span>
          <span class="detail-value">${competition.monthlySales || 0}件</span>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn-primary" onclick="window.open('https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(data.searchKeywords)}', '_blank')">
          eBayで確認
        </button>
        <button class="btn-secondary" onclick="window.open('${this.apiBaseUrl}/reports/detailed?product=${data.productId}', '_blank')">
          詳細レポート
        </button>
      </div>
    `;
  }

  // ヘルパーメソッド
  extractASIN() {
    const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }

  extractAvailability() {
    const availabilityElement = document.querySelector('#availability span');
    return availabilityElement ? availabilityElement.textContent.trim() : null;
  }

  extractRating() {
    const ratingElement = document.querySelector('[data-hook="average-star-rating"]');
    if (ratingElement) {
      const match = ratingElement.textContent.match(/([0-9.]+)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  }

  extractReviewCount() {
    const reviewElement = document.querySelector('[data-hook="total-review-count"]');
    if (reviewElement) {
      const match = reviewElement.textContent.match(/([0-9,]+)/);
      return match ? parseInt(match[1].replace(/,/g, '')) : null;
    }
    return null;
  }

  extractImages() {
    const images = [];
    const imageElements = document.querySelectorAll('#altImages img');
    
    imageElements.forEach(img => {
      if (img.src && !img.src.includes('transparent-pixel')) {
        images.push(img.src);
      }
    });
    
    return images;
  }

  getScoreClass(score) {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  getProfitClass(profit) {
    if (profit >= 20) return 'high';
    if (profit >= 10) return 'medium';
    return 'low';
  }

  parsePrice(priceText) {
    if (!priceText) return 0;
    const cleaned = priceText.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  async getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['authToken'], (result) => {
        resolve(result.authToken || null);
      });
    });
  }
}

// スクリプト初期化
const amazonExtension = new AmazonContentScript();
```

---

## 9. 継続指示書 - 残りコンポーネント開発

上記で基本的なアーキテクチャとコア機能の開発指示書を作成しました。以下の項目が残っており、次のフェーズで開発が必要です：

### 次回開発対象リスト

1. **メルカリ・ヤフオクコンテンツスクリプト**
   - 間接的データ収集ロジック
   - SOLD商品データ解析機能
   - 価格トレンド表示

2. **楽天市場コンテンツスクリプト**
   - 商品データ抽出
   - ショップ情報取得
   - 価格比較表示

3. **リスク評価サービス**
   - 市場変動リスク算出
   - 競合分析ロジック
   - 偽物リスク検知

4. **市場分析サービス**
   - Google Trends連携
   - SNS感情分析
   - ニュース記事解析

5. **Kafka コンシューマーサービス**
   - リアルタイム処理パイプライン
   - 非同期タスク管理
   - エラーハンドリング

6. **WebSocket管理サービス**
   - リアルタイム通知配信
   - 接続管理
   - スケーリング対応

7. **追加フロントエンドコンポーネント**
   - 詳細分析画面
   - 設定画面
   - レポート機能
   - モバイル対応

8. **テスト・デプロイメント**
   - 単体テスト
   - 統合テスト
   - CI/CDパイプライン
   - 本番環境構築

9. **API仕様書・運用マニュアル**
   - OpenAPI仕様
   - 運用手順書
   - トラブルシューティングガイド

これらの開発により、完全な総合リサーチツールが構築されます。各コンポーネントは独立して開発可能で、段階的なリリースが可能な設計となっています。
    # 起動時処理
    await init_db()
    
    # Kafkaコンシューマー起動
    consumer_service = KafkaConsumerService()
    asyncio.create_task(consumer_service.start_consuming())
    
    yield
    
    # 終了時処理
    await consumer_service.stop_consuming()

app = FastAPI(
    title="Domestic Supplier Service",
    version="1.0.0",
    lifespan=lifespan
)

# ミドルウェア設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.TRUSTED_HOSTS
)

# ルーティング
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=settings.DEBUG
    )
```

### 4.2 サプライヤー検索サービス

```python
# services/domestic-supplier/src/services/supplier_search.py
import asyncio
import aiohttp
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import re
from bs4 import BeautifulSoup
from urllib.parse import quote, urljoin
import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient

from src.models.supplier import SupplierResult, SearchParams
from src.services.google_search import GoogleSearchService
from src.services.price_extractor import PriceExtractorService
from src.config import settings

class SupplierSearchService:
    def __init__(self):
        self.google_search = GoogleSearchService()
        self.price_extractor = PriceExtractorService()
        self.session = None
        self.db_pool = None
        self.mongo_client = None

    async def initialize(self):
        """サービス初期化"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        
        self.db_pool = await asyncpg.create_pool(settings.DATABASE_URL)
        self.mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)

    async def search_domestic_suppliers(self, product_data: Dict) -> List[SupplierResult]:
        """国内サプライヤー検索"""
        try:
            product_title = product_data.get('title', '')
            product_id = product_data.get('id')
            
            # 商品名からキーワード抽出
            keywords = self.extract_keywords(product_title)
            
            # 各プラットフォームで並行検索
            search_tasks = [
                self.search_amazon(keywords),
                self.search_rakuten(keywords),
                self.search_mercari(keywords),
                self.search_yahoo_auctions(keywords),
                self.search_other_platforms(keywords)
            ]
            
            results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # 結果をフラット化して重複除去
            all_suppliers = []
            for result in results:
                if isinstance(result, list):
                    all_suppliers.extend(result)
                elif isinstance(result, Exception):
                    print(f"Search error: {result}")
            
            # 重複除去と品質フィルタリング
            filtered_suppliers = await self.filter_and_deduplicate(all_suppliers, keywords)
            
            # データベース保存
            await self.save_suppliers_to_db(product_id, filtered_suppliers)
            
            return filtered_suppliers

        except Exception as e:
            print(f"Supplier search error: {e}")
            return []

    def extract_keywords(self, title: str) -> List[str]:
        """商品タイトルからキーワード抽出"""
        # 不要な文字列除去
        cleaned_title = re.sub(r'[^\w\s\-]', ' ', title)
        
        # ストップワード除去
        stop_words = {
            'new', 'used', 'genuine', 'original', 'oem', 'free', 'shipping',
            'fast', 'quick', 'item', 'product', 'brand', 'quality'
        }
        
        words = cleaned_title.lower().split()
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        return keywords[:5]  # 上位5キーワード

    async def search_amazon(self, keywords: List[str]) -> List[SupplierResult]:
        """Amazon検索"""
        suppliers = []
        
        try:
            # Google経由でAmazon商品検索
            query = f"site:amazon.co.jp {' '.join(keywords)}"
            search_results = await self.google_search.search(query, num_results=20)
            
            for result in search_results:
                if 'amazon.co.jp' in result.get('url', ''):
                    supplier_data = await self.extract_amazon_data(result['url'])
                    if supplier_data:
                        suppliers.append(supplier_data)
                        
        except Exception as e:
            print(f"Amazon search error: {e}")
            
        return suppliers

    async def extract_amazon_data(self, url: str) -> Optional[SupplierResult]:
        """Amazon商品データ抽出"""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return None
                    
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # 商品タイトル
                title_elem = soup.find('span', {'id': 'productTitle'})
                title = title_elem.text.strip() if title_elem else ''
                
                # 価格抽出
                price_info = await self.price_extractor.extract_amazon_price(soup)
                
                # 在庫状況
                availability = self.extract_amazon_availability(soup)
                
                # レビュー情報
                rating_info = self.extract_amazon_rating(soup)
                
                if price_info and price_info.get('price'):
                    return SupplierResult(
                        supplier_type='amazon',
                        supplier_name='Amazon.co.jp',
                        supplier_url=url,
                        product_title=title,
                        price=price_info['price'],
                        original_price=price_info.get('original_price'),
                        discount_rate=price_info.get('discount_rate', 0),
                        availability_status=availability,
                        shipping_cost=price_info.get('shipping_cost', 0),
                        delivery_days=price_info.get('delivery_days'),
                        seller_rating=rating_info.get('rating'),
                        seller_review_count=rating_info.get('review_count'),
                        reliability_score=self.calculate_amazon_reliability(rating_info, availability),
                        extracted_at=datetime.now()
                    )
                    
        except Exception as e:
            print(f"Amazon data extraction error: {e}")
            
        return None

    async def search_mercari(self, keywords: List[str]) -> List[SupplierResult]:
        """メルカリ検索（Google経由）"""
        suppliers = []
        
        try:
            # SOLD商品のみ検索
            query = f"site:jp.mercari.com {' '.join(keywords)} SOLD"
            search_results = await self.google_search.search(query, num_results=30)
            
            for result in search_results:
                if 'jp.mercari.com' in result.get('url', '') and 'sold' in result.get('url', '').lower():
                    supplier_data = await self.extract_mercari_data(result['url'])
                    if supplier_data:
                        suppliers.append(supplier_data)
                        
        except Exception as e:
            print(f"Mercari search error: {e}")
            
        return suppliers

    async def extract_mercari_data(self, url: str) -> Optional[SupplierResult]:
        """メルカリ商品データ抽出"""
        try:
            # メルカリのページ構造解析
            async with self.session.get(url) as response:
                if response.status != 200:
                    return None
                    
                html = await response.text()
                
                # JSON-LDデータ抽出
                structured_data = self.price_extractor.extract_structured_data(html)
                
                if structured_data and structured_data.get('price'):
                    return SupplierResult(
                        supplier_type='mercari',
                        supplier_name='メルカリ',
                        supplier_url=url,
                        product_title=structured_data.get('name', ''),
                        price=structured_data['price'],
                        availability_status='sold',  # SOLD商品
                        shipping_cost=structured_data.get('shipping_cost', 0),
                        seller_rating=structured_data.get('seller_rating'),
                        reliability_score=self.calculate_mercari_reliability(structured_data),
                        extracted_at=datetime.now()
                    )
                    
        except Exception as e:
            print(f"Mercari data extraction error: {e}")
            
        return None

    async def search_rakuten(self, keywords: List[str]) -> List[SupplierResult]:
        """楽天市場検索"""
        suppliers = []
        
        try:
            query = f"site:item.rakuten.co.jp {' '.join(keywords)}"
            search_results = await self.google_search.search(query, num_results=20)
            
            for result in search_results:
                if 'item.rakuten.co.jp' in result.get('url', ''):
                    supplier_data = await self.extract_rakuten_data(result['url'])
                    if supplier_data:
                        suppliers.append(supplier_data)
                        
        except Exception as e:
            print(f"Rakuten search error: {e}")
            
        return suppliers

    async def extract_rakuten_data(self, url: str) -> Optional[SupplierResult]:
        """楽天商品データ抽出"""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return None
                    
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # 楽天の価格抽出ロジック
                price_info = await self.price_extractor.extract_rakuten_price(soup)
                
                if price_info and price_info.get('price'):
                    return SupplierResult(
                        supplier_type='rakuten',
                        supplier_name='楽天市場',
                        supplier_url=url,
                        product_title=price_info.get('title', ''),
                        price=price_info['price'],
                        original_price=price_info.get('original_price'),
                        discount_rate=price_info.get('discount_rate', 0),
                        availability_status=price_info.get('availability', 'unknown'),
                        shipping_cost=price_info.get('shipping_cost', 0),
                        delivery_days=price_info.get('delivery_days'),
                        seller_rating=price_info.get('shop_rating'),
                        seller_review_count=price_info.get('review_count'),
                        reliability_score=self.calculate_rakuten_reliability(price_info),
                        extracted_at=datetime.now()
                    )
                    
        except Exception as e:
            print(f"Rakuten data extraction error: {e}")
            
        return None

    async def search_yahoo_auctions(self, keywords: List[str]) -> List[SupplierResult]:
        """ヤフオク検索"""
        suppliers = []
        
        try:
            query = f"site:page.auctions.yahoo.co.jp {' '.join(keywords)}"
            search_results = await self.google_search.search(query, num_results=15)
            
            for result in search_results:
                if 'page.auctions.yahoo.co.jp' in result.get('url', ''):
                    supplier_data = await self.extract_yahoo_auction_data(result['url'])
                    if supplier_data:
                        suppliers.append(supplier_data)
                        
        except Exception as e:
            print(f"Yahoo Auctions search error: {e}")
            
        return suppliers

    async def filter_and_deduplicate(self, suppliers: List[SupplierResult], keywords: List[str]) -> List[SupplierResult]:
        """サプライヤー結果のフィルタリングと重複除去"""
        # 価格が有効な結果のみ
        valid_suppliers = [s for s in suppliers if s.price and s.price > 0]
        
        # 商品タイトルの類似度チェックで重複除去
        deduplicated = []
        for supplier in valid_suppliers:
            is_duplicate = False
            for existing in deduplicated:
                similarity = self.calculate_title_similarity(
                    supplier.product_title, 
                    existing.product_title
                )
                if similarity > 0.8:  # 80%以上の類似度
                    # より信頼性の高い方を残す
                    if supplier.reliability_score > existing.reliability_score:
                        deduplicated.remove(existing)
                        deduplicated.append(supplier)
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                deduplicated.append(supplier)
        
        # 信頼性スコアでソート
        return sorted(deduplicated, key=lambda x: x.reliability_score, reverse=True)

    def calculate_title_similarity(self, title1: str, title2: str) -> float:
        """タイトル類似度計算"""
        # 簡易的なJaccard係数計算
        words1 = set(title1.lower().split())
        words2 = set(title2.lower().split())
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0

    def calculate_amazon_reliability(self, rating_info: Dict, availability: str) -> float:
        """Amazon信頼性スコア計算"""
        base_score = 0.8  # Amazon基本信頼度
        
        if rating_info.get('rating'):
            rating_bonus = (rating_info['rating'] - 3.0) * 0.1  # 3.0を基準とした評価ボーナス
            base_score += rating_bonus
            
        if rating_info.get('review_count', 0) > 100:
            base_score += 0.1  # レビュー数ボーナス
            
        if availability == 'in_stock':
            base_score += 0.1
        elif availability == 'out_of_stock':
            base_score -= 0.2
            
        return max(0.0, min(1.0, base_score))

    def calculate_mercari_reliability(self, data: Dict) -> float:
        """メルカリ信頼性スコア計算"""
        base_score = 0.6  # メルカリ基本信頼度（中古品のため低め）
        
        if data.get('seller_rating'):
            if data['seller_rating'] >= 4.0:
                base_score += 0.2
            elif data['seller_rating'] >= 3.5:
                base_score += 0.1
                
        return max(0.0, min(1.0, base_score))

    def calculate_rakuten_reliability(self, price_info: Dict) -> float:
        """楽天信頼性スコア計算"""
        base_score = 0.75  # 楽天基本信頼度
        
        if price_info.get('shop_rating'):
            rating_bonus = (price_info['shop_rating'] - 3.0) * 0.08
            base_score += rating_bonus
            
        if price_info.get('review_count', 0) > 50:
            base_score += 0.1
            
        return max(0.0, min(1.0, base_score))

    async def save_suppliers_to_db(self, product_id: int, suppliers: List[SupplierResult]):
        """サプライヤー情報をデータベースに保存"""
        async with self.db_pool.acquire() as conn:
            for supplier in suppliers:
                await conn.execute("""
                    INSERT INTO domestic_suppliers (
                        product_id, supplier_type, supplier_name, supplier_url,
                        product_title, price, original_price, discount_rate,
                        availability_status, shipping_cost, delivery_days,
                        seller_rating, seller_review_count, reliability_score,
                        last_price_check
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (product_id, supplier_url) DO UPDATE SET
                        price = EXCLUDED.price,
                        availability_status = EXCLUDED.availability_status,
                        reliability_score = EXCLUDED.reliability_score,
                        last_price_check = EXCLUDED.last_price_check,
                        updated_at = CURRENT_TIMESTAMP
                """, 
                product_id, supplier.supplier_type, supplier.supplier_name,
                supplier.supplier_url, supplier.product_title, supplier.price,
                supplier.original_price, supplier.discount_rate,
                supplier.availability_status, supplier.shipping_cost,
                supplier.delivery_days, supplier.seller_rating,
                supplier.seller_review_count, supplier.reliability_score,
                supplier.extracted_at
                )

    async def close(self):
        """リソースクリーンアップ"""
        if self.session:
            await self.session.close()
        if self.db_pool:
            await self.db_pool.close()
        if self.mongo_client:
            self.mongo_client.close()
```

### 4.3 価格抽出サービス

```python
# services/domestic-supplier/src/services/price_extractor.py
import re
import json
from typing import Dict, Optional
from bs4 import BeautifulSoup
import cv2
import pytesseract
import numpy as np
from PIL import Image
import io
import aiohttp

class PriceExtractorService:
    def __init__(self):
        self.price_patterns = [
            r'[¥￥]\s*([0-9,]+)',
            r'([0-9,]+)\s*円',
            r'price["\s]*:\s*["\s]*([0-9,]+)',
            r'値段["\s]*:\s*["\s]*([0-9,]+)',
        ]

    async def extract_amazon_price(self, soup: BeautifulSoup) -> Optional[Dict]:
        """Amazon価格抽出"""
        price_data = {}
        
        # メイン価格
        price_elem = soup.find('span', {'class': 'a-price-whole'})
        if price_elem:
            price_text = price_elem.text.replace(',', '')
            price_data['price'] = float(price_text)
        
        # 元値（セール時）
        original_elem = soup.find('span', {'class': 'a-text-price'})
        if original_elem:
            original_text = re.search(r'([0-9,]+)', original_elem.text)
            if original_text:
                price_data['original_price'] = float(original_text.group(1).replace(',', ''))
        
        # 送料
        shipping_elem = soup.find('span', {'id': 'price-shipping'})
        if shipping_elem and '送料無料' not in shipping_elem.text:
            shipping_match = re.search(r'([0-9,]+)', shipping_elem.text)
            if shipping_match:
                price_data['shipping_cost'] = float(shipping_match.group(1).replace(',', ''))
        
        # 割引率計算
        if 'original_price' in price_data and 'price' in price_data:
            discount = (price_data['original_price'] - price_data['price']) / price_data['original_price']
            price_data['discount_rate'] = round(discount * 100, 1)
        
        return price_data if price_data else None

    async def extract_rakuten_price(self, soup: BeautifulSoup) -> Optional[Dict]:
        """楽天価格抽出"""
        price_data = {}
        
        # JSON-LD データ優先
        structured = self.extract_structured_data(str(soup))
        if structured and structured.get('price'):
            price_data.update(structured)
            return price_data
        
        # フォールバック: HTML解析
        price_elem = soup.find('span', {'class': re.compile(r'price')})
        if price_elem:
            price_match = re.search(r'([0-9,]+)', price_elem.text)
            if price_match:
                price_data['price'] = float(price_match.group(1).replace(',', ''))
        
        return price_data if price_data else None

    def extract_structured_data(self, html: str) -> Optional[Dict]:
        """構造化データ（JSON-LD）から価格抽出"""
        soup = BeautifulSoup(html, 'html.parser')
        scripts = soup.find_all('script', type='application/ld+json')
        
        for script in scripts:
            try:
                data = json.loads(script.string)
                
                # Product schema
                if data.get('@type') == 'Product':
                    offers = data.get('offers', {})
                    if isinstance(offers, list):
                        offers = offers[0]
                    
                    result = {}
                    if offers.get('price'):
                        result['price'] = float(offers['price'])
                    if offers.get('availability'):
                        result['availability'] = self.normalize_availability(offers['availability'])
                    if data.get('name'):
                        result['title'] = data['name']
                    
                    return result
                    
            except (json.JSONDecodeError, KeyError, ValueError):
                continue
        
        return None

    def normalize_availability(self, availability: str) -> str:
        """在庫状況の正規化"""
        availability_lower = availability.lower()
        
        if 'instock' in availability_lower or '在庫あり' in availability_lower:
            return 'in_stock'
        elif 'outofstock' in availability_lower or '在庫なし' in availability_lower:
            return 'out_of_stock'
        elif 'limitedavailability' in availability_lower or '残りわずか' in availability_lower:
            return 'limited'
        else:
            return 'unknown'

    async def extract_price_from_image(self, image_url: str) -> Optional[float]:
        """画像からOCRで価格抽出"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    if response.status != 200:
                        return None
                    
                    image_data = await response.read()
                    image = Image.open(io.BytesIO(image_data))
                    
                    # OpenCVで前処理
                    cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                    gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
                    
                    # ノイズ除去
                    denoised = cv2.fastNlMeansDenoising(gray)
                    
                    # OCR実行
                    text = pytesseract.image_to_string(denoised, lang='jpn+eng')
                    
                    # 価格パターンマッチング
                    for pattern in self.price_patterns:
                        match = re.search(pattern, text)
                        if match:
                            price_str = match.group(1).replace(',', '')
                            return float(price_str)
                    
        except Exception as e:
            print(f"OCR price extraction error: {e}")
        
        return None

    def extract_text_price(self, text: str) -> Optional[float]:
        """テキストから価格抽出"""
        for pattern in self.price_patterns:
            match = re.search(pattern, text)
            if match:
                price_str = match.group(1).replace(',', '')
                try:
                    return float(price_str)
                except ValueError:
                    continue
        return None
```

---

## 5. 利益計算サービス開発指示書

### 5.1 サービス構成

```python
# services/profit-calculation/src/main.py
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

from src.services.profit_calculator import ProfitCalculatorService
from src.services.fee_calculator import FeeCalculatorService
from src.services.risk_assessor import RiskAssessorService
from src.services.kafka_consumer import KafkaConsumerService
from src.api import calculations, health
from src.database import init_db
from src.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):