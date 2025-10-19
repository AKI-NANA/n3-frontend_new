# 🏗️ SaaS企業のデータベース設計パターン分析
# 現在のテーブル構造整理・統合提案

## 📊 現在のテーブル構造問題点

### **発見された8つの商品テーブル**
```
1. mystical_japan_treasures_inventory (634件) - メインデータ
2. unified_product_data (0件) - 空テーブル
3. unified_product_inventory (2件) - サンプルデータ
4. yahoo_scraped_products (5件) - Yahooテストデータ
5. ebay_inventory (100件) - eBayデータ
6. products (0件) - 空テーブル
7. inventory_products (3件) - 在庫管理
8. product_master (6件) - マスターデータ
```

### **キー連携の複雑性**
- `id` - 7テーブル（汎用主キー）
- `sku` - 5テーブル（商品識別子）
- `master_sku` - 3テーブル（統合キー）
- `item_id` - 2テーブル（eBay形式）

## 🏢 SaaS企業の一般的な設計パターン

### **Pattern 1: 単一統合テーブル（Simple SaaS）**
```
✅ 利点:
- シンプルな管理
- JOIN不要
- データ整合性確保
- 開発速度向上

❌ 欠点:
- 大量データでのパフォーマンス低下
- 柔軟性の制限
- カラム数の肥大化
```

### **Pattern 2: 機能別分散テーブル（Enterprise SaaS）**
```
✅ 利点:
- スケーラビリティ
- 機能特化最適化
- マイクロサービス対応
- チーム分業可能

❌ 欠点:
- 管理複雑化
- JOIN処理コスト
- データ同期問題
- 学習コスト増加
```

### **Pattern 3: ハイブリッド設計（推奨）**
```
📋 核となる統合テーブル + 機能特化テーブル

Core Tables:
- products (商品マスター)
- inventory (在庫管理)

Specialized Tables:
- ebay_listings (eBay特化データ)
- yahoo_auctions (Yahoo特化データ)
- pricing_history (価格履歴)
```

## 🎯 推奨テーブル統合設計

### **Phase 1: コアテーブル統合**

#### **1. 統合商品マスター (products_master)**
```sql
CREATE TABLE products_master (
    -- 統合キー
    master_sku VARCHAR(255) PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    
    -- 基本商品情報
    title TEXT NOT NULL,
    description TEXT,
    brand VARCHAR(255),
    model_number VARCHAR(255),
    condition_name VARCHAR(100),
    category_name VARCHAR(255),
    
    -- 価格情報
    base_price_usd DECIMAL(10,2),
    current_price_jpy DECIMAL(10,2),
    
    -- 画像
    primary_image_url TEXT,
    gallery_urls JSONB,
    
    -- メタ情報
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 統合管理
    data_source VARCHAR(100),
    sync_status VARCHAR(50)
);
```

#### **2. マルチプラットフォーム連携 (platform_listings)**
```sql
CREATE TABLE platform_listings (
    id SERIAL PRIMARY KEY,
    master_sku VARCHAR(255) REFERENCES products_master(master_sku),
    
    -- プラットフォーム情報
    platform VARCHAR(50) NOT NULL, -- 'ebay', 'yahoo', 'amazon'
    platform_item_id VARCHAR(255),
    platform_sku VARCHAR(255),
    
    -- プラットフォーム固有データ
    platform_data JSONB,
    listing_url TEXT,
    
    -- ステータス
    listing_status VARCHAR(50),
    sync_status VARCHAR(50),
    last_sync TIMESTAMP,
    
    -- 制約
    UNIQUE(platform, platform_item_id)
);
```

#### **3. 在庫・価格管理 (inventory_management)**
```sql
CREATE TABLE inventory_management (
    master_sku VARCHAR(255) REFERENCES products_master(master_sku),
    
    -- 在庫情報
    inventory_type VARCHAR(50), -- 'physical', 'dropship', 'virtual'
    current_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    
    -- 価格管理
    cost_price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    profit_margin DECIMAL(5,2),
    
    -- 管理情報
    supplier VARCHAR(255),
    lead_time_days INTEGER,
    minimum_order_qty INTEGER,
    
    PRIMARY KEY(master_sku)
);
```

### **Phase 2: データ移行戦略**

#### **現在データの統合方針**
```sql
-- 1. mystical_japan_treasures_inventory (634件) → products_master
INSERT INTO products_master (master_sku, title, current_price_jpy, ...)
SELECT 
    COALESCE(master_sku, 'LEGACY-' || item_id) as master_sku,
    title,
    current_price,
    ...
FROM mystical_japan_treasures_inventory
WHERE title IS NOT NULL;

-- 2. ebay_inventory (100件) → platform_listings
INSERT INTO platform_listings (master_sku, platform, platform_item_id, ...)
SELECT 
    'EBAY-' || sku as master_sku,
    'ebay',
    item_id,
    ...
FROM ebay_inventory;

-- 3. yahoo_scraped_products (5件) → platform_listings  
INSERT INTO platform_listings (master_sku, platform, platform_item_id, ...)
SELECT 
    'YAHOO-' || source_item_id as master_sku,
    'yahoo',
    source_item_id,
    ...
FROM yahoo_scraped_products;
```

## 💼 SaaS企業での実際の運用パターン

### **Shopify (E-commerce SaaS)**
```
Core: products, variants, inventory_levels
Platform: shopify_sync, amazon_sync, ebay_sync
Analytics: sales_analytics, inventory_analytics
```

### **Salesforce (CRM SaaS)**
```
Core: accounts, contacts, opportunities  
Custom: platform_integrations, sync_logs
Analytics: reports, dashboards
```

### **HubSpot (Marketing SaaS)**
```
Core: contacts, companies, deals
Integration: integration_sync, platform_data
Analytics: analytics_data, reporting
```

## 🚀 推奨実装手順

### **Step 1: 現状の問題解決 (即座)**
```bash
# 1. 問題データ特定・削除
php cleanup_all_sample_data.php

# 2. メインテーブルの整合性確認
php verify_main_table_integrity.php
```

### **Step 2: 段階的統合 (1-2週間)**
```bash
# 1. 統合テーブル作成
psql -d nagano3_db -f create_unified_schema.sql

# 2. データ移行
php migrate_to_unified_tables.php

# 3. アプリケーション更新
# - database_query_handler.php を統合テーブル対応に修正
```

### **Step 3: 運用最適化 (継続)**
```bash
# 1. パフォーマンス監視
# 2. データ品質チェック自動化
# 3. 同期処理の安定化
```

## 🎯 結論・推奨アクション

### **短期対応 (今週)**
1. **問題データ削除** - SCRAPED_サンプルデータの完全除去
2. **メインテーブル特定** - mystical_japan_treasures_inventory を主軸に
3. **表示システム修正** - 1つのテーブルからのみデータ取得

### **中期対応 (来月)**
1. **段階的統合** - 3テーブル構造への集約
2. **CSV出入力統合** - 統一インターフェース構築
3. **同期システム構築** - プラットフォーム間データ同期

### **長期戦略 (3ヶ月)**
1. **マイクロサービス化** - 機能別API分離
2. **リアルタイム同期** - Webhook対応
3. **分析基盤構築** - BI・レポート機能

**まずは問題データを削除して、メインテーブル1つでの運用を安定させることから始めることを推奨します。**