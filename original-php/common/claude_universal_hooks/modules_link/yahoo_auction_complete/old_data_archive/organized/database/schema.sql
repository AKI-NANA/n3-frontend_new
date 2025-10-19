--
-- NAGANO-3システムのeBayカテゴリ自動判定用データベーススキーマ
-- ファイル: modules/ebay_category_system/backend/database/schema.sql
--

-- テーブル1: eBayカテゴリーマスター
-- eBayの主要なカテゴリー情報
CREATE TABLE ebay_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(200) NOT NULL,
    parent_id VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE
);

-- テーブル2: カテゴリー別必須項目
-- 各カテゴリーに紐づく必須・推奨項目とそのデフォルト値
CREATE TABLE category_required_fields (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) REFERENCES ebay_categories(category_id),
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL, -- 'required', 'recommended'
    possible_values TEXT[], -- 選択肢（ある場合）
    default_value VARCHAR(100) DEFAULT 'Unknown',
    sort_order INTEGER DEFAULT 0
);

-- テーブル3: 処理済み商品データ
-- CSVから取り込まれ、自動処理された商品の保存先
CREATE TABLE processed_products (
    id SERIAL PRIMARY KEY,
    original_title TEXT NOT NULL,
    original_price DECIMAL(10,2),
    yahoo_category VARCHAR(100),
    detected_category_id VARCHAR(20),
    category_confidence INTEGER,
    item_specifics TEXT, -- Maru9形式文字列
    status VARCHAR(20) DEFAULT 'pending', -- pending/approved/exported
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- テーブル4: カテゴリー判定キーワード辞書
-- カテゴリー判定ロジックの基盤となるキーワードデータ
CREATE TABLE category_keywords (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) REFERENCES ebay_categories(category_id),
    keyword VARCHAR(100) NOT NULL,
    keyword_type VARCHAR(20) DEFAULT 'primary', -- 'primary', 'secondary'
    weight INTEGER DEFAULT 5,
    language VARCHAR(5) DEFAULT 'ja' -- 'ja', 'en'
);