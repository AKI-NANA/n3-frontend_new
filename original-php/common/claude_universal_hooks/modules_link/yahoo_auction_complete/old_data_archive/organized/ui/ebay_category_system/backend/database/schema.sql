--
-- NAGANO-3システム eBayカテゴリ自動判定システム完全版データベーススキーマ
-- ファイル: modules/ebay_category_system/backend/database/schema.sql
-- 作成日: 2025年9月14日
--

-- データベース設定
SET timezone = 'Asia/Tokyo';
SET client_encoding = 'UTF8';

-- =============================================================================
-- テーブル1: eBayカテゴリーマスター
-- eBayの主要なカテゴリー情報（階層構造対応）
-- =============================================================================
DROP TABLE IF EXISTS ebay_categories CASCADE;
CREATE TABLE ebay_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(200) NOT NULL,
    parent_id VARCHAR(20),
    category_level INTEGER DEFAULT 1,
    is_leaf BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 親カテゴリー参照制約
ALTER TABLE ebay_categories 
ADD CONSTRAINT fk_ebay_categories_parent 
FOREIGN KEY (parent_id) REFERENCES ebay_categories(category_id);

-- インデックス作成
CREATE INDEX idx_ebay_categories_parent ON ebay_categories(parent_id);
CREATE INDEX idx_ebay_categories_active ON ebay_categories(is_active);
CREATE INDEX idx_ebay_categories_leaf ON ebay_categories(is_leaf);

-- =============================================================================
-- テーブル2: カテゴリー別必須項目
-- 各カテゴリーに紐づく必須・推奨項目とそのデフォルト値
-- =============================================================================
DROP TABLE IF EXISTS category_required_fields CASCADE;
CREATE TABLE category_required_fields (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('required', 'recommended', 'optional')),
    field_data_type VARCHAR(20) DEFAULT 'text' CHECK (field_data_type IN ('text', 'number', 'boolean', 'date', 'enum')),
    possible_values TEXT[], -- 選択肢（ある場合）
    default_value VARCHAR(200) DEFAULT 'Unknown',
    validation_rules JSONB, -- バリデーションルール（正規表現等）
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_category_required_fields_category ON category_required_fields(category_id);
CREATE INDEX idx_category_required_fields_type ON category_required_fields(field_type);
CREATE INDEX idx_category_required_fields_sort ON category_required_fields(sort_order);
CREATE UNIQUE INDEX idx_category_required_fields_unique ON category_required_fields(category_id, field_name);

-- =============================================================================
-- テーブル3: 処理済み商品データ
-- CSVから取り込まれ、自動処理された商品の保存先
-- =============================================================================
DROP TABLE IF EXISTS processed_products CASCADE;
CREATE TABLE processed_products (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50), -- バッチ処理識別用
    original_title TEXT NOT NULL,
    original_price DECIMAL(12,2) CHECK (original_price >= 0),
    original_description TEXT,
    yahoo_category VARCHAR(200),
    image_url TEXT,
    
    -- カテゴリー判定結果
    detected_category_id VARCHAR(20),
    category_confidence INTEGER CHECK (category_confidence >= 0 AND category_confidence <= 100),
    matched_keywords TEXT[],
    
    -- Item Specifics
    item_specifics TEXT, -- Maru9形式文字列
    item_specifics_json JSONB, -- JSON形式（検索・分析用）
    
    -- ステータス管理
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'review_required', 'exported')),
    processing_notes TEXT,
    
    -- メタデータ
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_by VARCHAR(100) DEFAULT 'system',
    
    FOREIGN KEY (detected_category_id) REFERENCES ebay_categories(category_id)
);

-- インデックス作成
CREATE INDEX idx_processed_products_category ON processed_products(detected_category_id);
CREATE INDEX idx_processed_products_status ON processed_products(status);
CREATE INDEX idx_processed_products_confidence ON processed_products(category_confidence);
CREATE INDEX idx_processed_products_batch ON processed_products(batch_id);
CREATE INDEX idx_processed_products_created ON processed_products(created_at);
CREATE INDEX idx_processed_products_title ON processed_products USING gin(to_tsvector('english', original_title));

-- JSON検索用インデックス
CREATE INDEX idx_processed_products_specifics ON processed_products USING gin(item_specifics_json);

-- =============================================================================
-- テーブル4: カテゴリー判定キーワード辞書
-- カテゴリー判定ロジックの基盤となるキーワードデータ
-- =============================================================================
DROP TABLE IF EXISTS category_keywords CASCADE;
CREATE TABLE category_keywords (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    keyword VARCHAR(200) NOT NULL,
    keyword_type VARCHAR(20) DEFAULT 'primary' CHECK (keyword_type IN ('primary', 'secondary', 'negative')),
    weight INTEGER DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
    language VARCHAR(5) DEFAULT 'ja' CHECK (language IN ('ja', 'en', 'mixed')),
    is_regex BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0, -- 使用頻度カウント
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_category_keywords_category ON category_keywords(category_id);
CREATE INDEX idx_category_keywords_keyword ON category_keywords(keyword);
CREATE INDEX idx_category_keywords_type ON category_keywords(keyword_type);
CREATE INDEX idx_category_keywords_weight ON category_keywords(weight DESC);
CREATE INDEX idx_category_keywords_active ON category_keywords(is_active);
CREATE UNIQUE INDEX idx_category_keywords_unique ON category_keywords(category_id, keyword, language);

-- 全文検索用インデックス
CREATE INDEX idx_category_keywords_fulltext ON category_keywords USING gin(to_tsvector('japanese', keyword));

-- =============================================================================
-- テーブル5: 処理ログ・統計情報
-- システムの処理履歴と統計データ
-- =============================================================================
DROP TABLE IF EXISTS processing_logs CASCADE;
CREATE TABLE processing_logs (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50),
    operation_type VARCHAR(50) NOT NULL, -- 'csv_upload', 'category_detection', 'item_generation'
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    processing_time_seconds DECIMAL(10,3),
    memory_usage_mb DECIMAL(10,2),
    error_message TEXT,
    metadata JSONB, -- 追加の処理情報
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_processing_logs_batch ON processing_logs(batch_id);
CREATE INDEX idx_processing_logs_type ON processing_logs(operation_type);
CREATE INDEX idx_processing_logs_status ON processing_logs(status);
CREATE INDEX idx_processing_logs_created ON processing_logs(created_at);

-- =============================================================================
-- ビュー1: カテゴリー統計ビュー
-- カテゴリー別の処理統計情報を提供
-- =============================================================================
CREATE OR REPLACE VIEW category_statistics AS
SELECT 
    ec.category_id,
    ec.category_name,
    ec.is_active,
    COUNT(pp.id) as total_products,
    COUNT(CASE WHEN pp.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN pp.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN pp.status = 'review_required' THEN 1 END) as review_required_count,
    AVG(pp.category_confidence) as avg_confidence,
    COUNT(ck.id) as keyword_count,
    AVG(ck.weight) as avg_keyword_weight,
    MAX(pp.updated_at) as last_processed
FROM ebay_categories ec
LEFT JOIN processed_products pp ON ec.category_id = pp.detected_category_id
LEFT JOIN category_keywords ck ON ec.category_id = ck.category_id AND ck.is_active = TRUE
WHERE ec.is_active = TRUE
GROUP BY ec.category_id, ec.category_name, ec.is_active
ORDER BY total_products DESC, ec.category_name;

-- =============================================================================
-- ビュー2: 処理サマリービュー  
-- 処理状況の概要を提供
-- =============================================================================
CREATE OR REPLACE VIEW processing_summary AS
SELECT 
    DATE(created_at) as processing_date,
    COUNT(*) as total_processed,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'review_required' THEN 1 END) as review_required,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
    AVG(category_confidence) as avg_confidence,
    MIN(category_confidence) as min_confidence,
    MAX(category_confidence) as max_confidence
FROM processed_products
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY processing_date DESC;

-- =============================================================================
-- 関数1: カテゴリー自動判定スコア計算
-- キーワードマッチングスコアを計算する関数
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_category_score(
    p_title TEXT,
    p_description TEXT DEFAULT '',
    p_category_id VARCHAR(20)
) RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_keyword RECORD;
    v_text TEXT;
BEGIN
    v_text := LOWER(p_title || ' ' || COALESCE(p_description, ''));
    
    FOR v_keyword IN 
        SELECT keyword, keyword_type, weight
        FROM category_keywords 
        WHERE category_id = p_category_id AND is_active = TRUE
    LOOP
        IF POSITION(LOWER(v_keyword.keyword) IN v_text) > 0 THEN
            CASE v_keyword.keyword_type
                WHEN 'primary' THEN v_score := v_score + (v_keyword.weight * 2);
                WHEN 'secondary' THEN v_score := v_score + v_keyword.weight;
                WHEN 'negative' THEN v_score := v_score - v_keyword.weight;
            END CASE;
        END IF;
    END LOOP;
    
    RETURN GREATEST(0, v_score);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 関数2: バッチID生成関数
-- 一意なバッチIDを生成する関数
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_batch_id() RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'BATCH_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS') || '_' || 
           LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 関数3: 処理統計更新関数
-- 処理統計を更新する関数
-- =============================================================================
CREATE OR REPLACE FUNCTION update_processing_statistics() RETURNS VOID AS $$
BEGIN
    -- キーワード使用回数更新
    UPDATE category_keywords 
    SET usage_count = (
        SELECT COUNT(*) 
        FROM processed_products pp
        WHERE pp.detected_category_id = category_keywords.category_id
        AND pp.matched_keywords @> ARRAY[category_keywords.keyword]
    );
    
    -- 処理時刻更新
    UPDATE category_keywords SET updated_at = NOW() WHERE usage_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- トリガー1: 商品データ更新時の自動更新
-- 商品データが更新されたときにupdated_atを自動更新
-- =============================================================================
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー適用
CREATE TRIGGER tr_processed_products_updated
    BEFORE UPDATE ON processed_products
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_category_required_fields_updated
    BEFORE UPDATE ON category_required_fields
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_category_keywords_updated
    BEFORE UPDATE ON category_keywords
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =============================================================================
-- インデックス最適化・パフォーマンス設定
-- =============================================================================

-- 自動VACUUM設定
ALTER TABLE processed_products SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE category_keywords SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- =============================================================================
-- 権限設定（オプション）
-- =============================================================================

-- アプリケーション用ロール作成（必要に応じて）
-- CREATE ROLE ebay_category_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ebay_category_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ebay_category_app;

-- =============================================================================
-- コメント追加
-- =============================================================================

COMMENT ON TABLE ebay_categories IS 'eBayカテゴリーマスターテーブル';
COMMENT ON TABLE category_required_fields IS 'カテゴリー別必須項目定義テーブル';
COMMENT ON TABLE processed_products IS '処理済み商品データテーブル';
COMMENT ON TABLE category_keywords IS 'カテゴリー判定用キーワード辞書テーブル';
COMMENT ON TABLE processing_logs IS 'システム処理ログテーブル';

COMMENT ON VIEW category_statistics IS 'カテゴリー別統計情報ビュー';
COMMENT ON VIEW processing_summary IS '処理サマリー情報ビュー';

-- =============================================================================
-- スキーマ作成完了ログ
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'eBayカテゴリー自動判定システム - データベーススキーマ作成完了';
    RAISE NOTICE '作成日時: %', NOW();
    RAISE NOTICE '作成されたテーブル: ebay_categories, category_required_fields, processed_products, category_keywords, processing_logs';
    RAISE NOTICE '作成されたビュー: category_statistics, processing_summary';
    RAISE NOTICE '作成された関数: calculate_category_score, generate_batch_id, update_processing_statistics';
END $$;