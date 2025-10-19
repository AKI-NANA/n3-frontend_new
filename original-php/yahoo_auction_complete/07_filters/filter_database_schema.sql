-- =============================================
-- 高機能フィルターシステム用データベーススキーマ
-- 作成日: 2025年9月22日
-- バージョン: 2.0
-- =============================================

-- メインフィルターキーワードテーブル（拡張版）
CREATE TABLE IF NOT EXISTS filter_keywords (
    id BIGSERIAL PRIMARY KEY,
    keyword VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('EXPORT', 'PATENT_TROLL', 'VERO', 'MALL_SPECIFIC', 'COUNTRY_SPECIFIC')),
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    language VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ja', 'zh', 'ko', 'es', 'fr', 'de')),
    translation VARCHAR(500),
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    mall_name VARCHAR(50), -- eBay, Amazon, Etsy, Mercari等
    country_code VARCHAR(3), -- ISO 3166-1 alpha-3
    region VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_regex BOOLEAN NOT NULL DEFAULT FALSE,
    case_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    detection_count BIGINT NOT NULL DEFAULT 0,
    last_detected_at TIMESTAMP,
    effectiveness_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100の効果スコア
    false_positive_rate DECIMAL(5,4) DEFAULT 0.0000, -- 偽陽性率
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    source_url TEXT, -- 元ソースURL
    reference_doc TEXT, -- 参考文献
    notes TEXT,
    metadata JSONB DEFAULT '{}', -- 追加メタデータ
    
    -- インデックス用制約
    CONSTRAINT uk_keyword_type_lang UNIQUE (keyword, type, language, mall_name, country_code)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_filter_keywords_type ON filter_keywords(type);
CREATE INDEX IF NOT EXISTS idx_filter_keywords_priority ON filter_keywords(priority);
CREATE INDEX IF NOT EXISTS idx_filter_keywords_language ON filter_keywords(language);
CREATE INDEX IF NOT EXISTS idx_filter_keywords_active ON filter_keywords(is_active);
CREATE INDEX IF NOT EXISTS idx_filter_keywords_detection_count ON filter_keywords(detection_count DESC);
CREATE INDEX IF NOT EXISTS idx_filter_keywords_created_at ON filter_keywords(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_filter_keywords_updated_at ON filter_keywords(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_filter_keywords_keyword_text ON filter_keywords USING gin(to_tsvector('english', keyword));
CREATE INDEX IF NOT EXISTS idx_filter_keywords_translation ON filter_keywords USING gin(to_tsvector('english', translation));
CREATE INDEX IF NOT EXISTS idx_filter_keywords_mall ON filter_keywords(mall_name) WHERE mall_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_filter_keywords_country ON filter_keywords(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_filter_keywords_metadata ON filter_keywords USING gin(metadata);

-- パテントトロール事例テーブル
CREATE TABLE IF NOT EXISTS patent_troll_cases (
    id BIGSERIAL PRIMARY KEY,
    case_number VARCHAR(100) UNIQUE NOT NULL,
    case_title VARCHAR(500) NOT NULL,
    plaintiff VARCHAR(200) NOT NULL,
    defendant VARCHAR(200),
    patent_number VARCHAR(50),
    patent_title VARCHAR(500),
    filing_date DATE,
    court VARCHAR(200),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SETTLED', 'DISMISSED', 'APPEALED')),
    risk_level VARCHAR(10) DEFAULT 'MEDIUM' CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW')),
    estimated_damages BIGINT,
    license_fee BIGINT,
    industry_affected VARCHAR(100),
    product_categories TEXT[],
    description TEXT,
    outcome TEXT,
    settlement_amount BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    source_url TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_patent_troll_status ON patent_troll_cases(status);
CREATE INDEX IF NOT EXISTS idx_patent_troll_risk ON patent_troll_cases(risk_level);
CREATE INDEX IF NOT EXISTS idx_patent_troll_plaintiff ON patent_troll_cases(plaintiff);
CREATE INDEX IF NOT EXISTS idx_patent_troll_industry ON patent_troll_cases(industry_affected);

-- VERO参加者テーブル
CREATE TABLE IF NOT EXISTS vero_participants (
    id BIGSERIAL PRIMARY KEY,
    vero_id VARCHAR(100) UNIQUE NOT NULL,
    brand_name VARCHAR(200) NOT NULL,
    company_name VARCHAR(300),
    parent_company VARCHAR(300),
    industry VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REMOVED')),
    join_date DATE,
    country_of_origin VARCHAR(3),
    website_url TEXT,
    protected_categories TEXT[],
    enforcement_level VARCHAR(10) DEFAULT 'HIGH' CHECK (enforcement_level IN ('HIGH', 'MEDIUM', 'LOW')),
    takedown_rate DECIMAL(5,2), -- 成功率
    average_response_time INTEGER, -- 時間単位
    contact_email VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_vero_brand ON vero_participants(brand_name);
CREATE INDEX IF NOT EXISTS idx_vero_status ON vero_participants(status);
CREATE INDEX IF NOT EXISTS idx_vero_industry ON vero_participants(industry);
CREATE INDEX IF NOT EXISTS idx_vero_enforcement ON vero_participants(enforcement_level);

-- 国別制限テーブル
CREATE TABLE IF NOT EXISTS country_restrictions (
    id BIGSERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3
    country_name VARCHAR(100) NOT NULL,
    restriction_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    restricted_items TEXT[],
    description TEXT,
    legal_reference TEXT,
    penalty_description TEXT,
    enforcement_level VARCHAR(10) DEFAULT 'MEDIUM' CHECK (enforcement_level IN ('HIGH', 'MEDIUM', 'LOW')),
    effective_date DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    source_url TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_country_restrictions_code ON country_restrictions(country_code);
CREATE INDEX IF NOT EXISTS idx_country_restrictions_type ON country_restrictions(restriction_type);
CREATE INDEX IF NOT EXISTS idx_country_restrictions_category ON country_restrictions(category);

-- モール別制限テーブル
CREATE TABLE IF NOT EXISTS mall_restrictions (
    id BIGSERIAL PRIMARY KEY,
    mall_name VARCHAR(50) NOT NULL,
    restriction_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    restricted_keywords TEXT[],
    prohibited_items TEXT[],
    description TEXT,
    policy_url TEXT,
    severity VARCHAR(10) DEFAULT 'MEDIUM' CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    enforcement_method VARCHAR(50), -- AUTOMATIC, MANUAL, REPORT_BASED
    penalty VARCHAR(100), -- WARNING, SUSPENSION, BAN, FINE
    effective_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_mall_restrictions_mall ON mall_restrictions(mall_name);
CREATE INDEX IF NOT EXISTS idx_mall_restrictions_type ON mall_restrictions(restriction_type);
CREATE INDEX IF NOT EXISTS idx_mall_restrictions_severity ON mall_restrictions(severity);

-- キーワード検出ログテーブル（パフォーマンス用）
CREATE TABLE IF NOT EXISTS keyword_detection_logs (
    id BIGSERIAL PRIMARY KEY,
    keyword_id BIGINT REFERENCES filter_keywords(id) ON DELETE CASCADE,
    product_id BIGINT, -- 商品テーブルへの参照
    product_title TEXT,
    product_description TEXT,
    detected_in_field VARCHAR(50), -- title, description, category等
    match_position INTEGER,
    match_length INTEGER,
    confidence_score DECIMAL(5,4) DEFAULT 1.0000,
    context_snippet TEXT, -- 前後の文脈
    detection_method VARCHAR(20) DEFAULT 'EXACT' CHECK (detection_method IN ('EXACT', 'FUZZY', 'REGEX', 'AI')),
    false_positive BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(100),
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- パーティション設定（月別）
CREATE INDEX IF NOT EXISTS idx_detection_logs_created_at ON keyword_detection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detection_logs_keyword_id ON keyword_detection_logs(keyword_id);
CREATE INDEX IF NOT EXISTS idx_detection_logs_product_id ON keyword_detection_logs(product_id);

-- システム統計テーブル
CREATE TABLE IF NOT EXISTS filter_system_stats (
    id SERIAL PRIMARY KEY,
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    total_keywords BIGINT DEFAULT 0,
    active_keywords BIGINT DEFAULT 0,
    total_detections BIGINT DEFAULT 0,
    new_keywords_today INTEGER DEFAULT 0,
    updated_keywords_today INTEGER DEFAULT 0,
    avg_detection_per_keyword DECIMAL(10,2) DEFAULT 0,
    top_detected_keyword_id BIGINT,
    system_performance_ms INTEGER, -- システム応答時間
    database_size_mb BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_filter_stats_date UNIQUE (date_recorded)
);

CREATE INDEX IF NOT EXISTS idx_filter_stats_date ON filter_system_stats(date_recorded DESC);

-- キーワードカテゴリテーブル（階層化）
CREATE TABLE IF NOT EXISTS keyword_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES keyword_categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    path VARCHAR(500), -- 階層パス（例: /electronics/computers/laptops）
    description TEXT,
    color_code VARCHAR(7), -- HEX色コード
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_category_path UNIQUE (path)
);

CREATE INDEX IF NOT EXISTS idx_keyword_categories_parent ON keyword_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_keyword_categories_level ON keyword_categories(level);

-- ユーザー操作ログテーブル
CREATE TABLE IF NOT EXISTS user_operation_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    user_name VARCHAR(200),
    operation_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, BULK_UPDATE等
    target_table VARCHAR(50) NOT NULL,
    target_id BIGINT,
    affected_count INTEGER DEFAULT 1,
    operation_details JSONB,
    before_values JSONB,
    after_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_operation ON user_operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON user_operation_logs(created_at DESC);

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'STRING' CHECK (setting_type IN ('STRING', 'INTEGER', 'BOOLEAN', 'JSON')),
    description TEXT,
    category VARCHAR(50) DEFAULT 'GENERAL',
    is_readonly BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 初期設定値挿入
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
('pagination_default_size', '25', 'INTEGER', 'デフォルトのページネーションサイズ', 'UI'),
('max_pagination_size', '100', 'INTEGER', '最大ページネーションサイズ', 'UI'),
('search_min_length', '2', 'INTEGER', '検索キーワードの最小文字数', 'SEARCH'),
('cache_ttl_minutes', '5', 'INTEGER', 'キャッシュの有効時間（分）', 'PERFORMANCE'),
('enable_auto_detection', 'true', 'BOOLEAN', '自動検出機能の有効化', 'FEATURES'),
('detection_confidence_threshold', '0.8', 'STRING', '検出信頼度の閾値', 'AI'),
('export_max_records', '10000', 'INTEGER', 'エクスポート最大レコード数', 'EXPORT'),
('maintenance_mode', 'false', 'BOOLEAN', 'メンテナンスモード', 'SYSTEM')
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================
-- ビューの作成
-- =============================================

-- キーワード統計ビュー
CREATE OR REPLACE VIEW keyword_statistics AS
SELECT 
    type,
    priority,
    language,
    COUNT(*) as keyword_count,
    COUNT(CASE WHEN is_active THEN 1 END) as active_count,
    SUM(detection_count) as total_detections,
    AVG(detection_count) as avg_detections,
    MAX(detection_count) as max_detections,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_today
FROM filter_keywords
GROUP BY type, priority, language
ORDER BY type, priority DESC, language;

-- 高効果キーワードビュー（検出回数上位）
CREATE OR REPLACE VIEW high_impact_keywords AS
SELECT 
    id,
    keyword,
    type,
    priority,
    detection_count,
    effectiveness_score,
    false_positive_rate,
    CASE 
        WHEN detection_count > 1000 THEN 'Very High'
        WHEN detection_count > 500 THEN 'High'
        WHEN detection_count > 100 THEN 'Medium'
        WHEN detection_count > 10 THEN 'Low'
        ELSE 'Very Low'
    END as impact_level,
    last_detected_at,
    created_at
FROM filter_keywords
WHERE is_active = TRUE
  AND detection_count > 0
ORDER BY detection_count DESC, effectiveness_score DESC;

-- 最近の検出活動ビュー
CREATE OR REPLACE VIEW recent_detections AS
SELECT 
    kdl.id,
    kdl.created_at as detected_at,
    fk.keyword,
    fk.type,
    fk.priority,
    kdl.product_title,
    kdl.detected_in_field,
    kdl.confidence_score,
    kdl.detection_method
FROM keyword_detection_logs kdl
JOIN filter_keywords fk ON kdl.keyword_id = fk.id
WHERE kdl.created_at > NOW() - INTERVAL '7 days'
  AND kdl.false_positive = FALSE
ORDER BY kdl.created_at DESC;

-- =============================================
-- 関数とトリガーの作成
-- =============================================

-- 更新時刻自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_filter_keywords_updated_at 
    BEFORE UPDATE ON filter_keywords 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patent_troll_cases_updated_at 
    BEFORE UPDATE ON patent_troll_cases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vero_participants_updated_at 
    BEFORE UPDATE ON vero_participants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_country_restrictions_updated_at 
    BEFORE UPDATE ON country_restrictions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mall_restrictions_updated_at 
    BEFORE UPDATE ON mall_restrictions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- キーワード統計更新関数
CREATE OR REPLACE FUNCTION update_keyword_detection_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE filter_keywords 
        SET detection_count = detection_count + 1,
            last_detected_at = NEW.created_at
        WHERE id = NEW.keyword_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE filter_keywords 
        SET detection_count = GREATEST(0, detection_count - 1)
        WHERE id = OLD.keyword_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- 検出ログトリガー
CREATE TRIGGER update_detection_count_trigger 
    AFTER INSERT OR DELETE ON keyword_detection_logs 
    FOR EACH ROW EXECUTE FUNCTION update_keyword_detection_count();

-- =============================================
-- パフォーマンス最適化
-- =============================================

-- VACUUM設定
ALTER TABLE filter_keywords SET (autovacuum_vacuum_threshold = 1000);
ALTER TABLE keyword_detection_logs SET (autovacuum_vacuum_threshold = 10000);

-- 統計情報更新
ANALYZE filter_keywords;
ANALYZE patent_troll_cases;
ANALYZE vero_participants;
ANALYZE country_restrictions;
ANALYZE mall_restrictions;

-- =============================================
-- 権限設定（本番環境用）
-- =============================================

-- 読み取り専用ユーザー（レポート用）
-- CREATE ROLE filter_reader WITH LOGIN PASSWORD 'secure_password';
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO filter_reader;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO filter_reader;

-- アプリケーションユーザー（読み書き）
-- CREATE ROLE filter_app WITH LOGIN PASSWORD 'secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO filter_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO filter_app;

-- 管理者ユーザー（フル権限）
-- CREATE ROLE filter_admin WITH LOGIN PASSWORD 'secure_password';
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO filter_admin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO filter_admin;

-- =============================================
-- データ品質チェック関数
-- =============================================

-- 重複キーワードチェック
CREATE OR REPLACE FUNCTION check_duplicate_keywords()
RETURNS TABLE(keyword TEXT, type VARCHAR(50), count BIGINT) AS $
BEGIN
    RETURN QUERY
    SELECT fk.keyword, fk.type, COUNT(*) as count
    FROM filter_keywords fk
    GROUP BY fk.keyword, fk.type
    HAVING COUNT(*) > 1
    ORDER BY count DESC, fk.keyword;
END;
$ LANGUAGE plpgsql;

-- データ整合性チェック
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT) AS $
BEGIN
    -- 無効な言語コードチェック
    RETURN QUERY
    SELECT 
        'Invalid Language Codes'::TEXT as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        CONCAT(COUNT(*), ' records with invalid language codes')::TEXT as details
    FROM filter_keywords 
    WHERE language NOT IN ('en', 'ja', 'zh', 'ko', 'es', 'fr', 'de');
    
    -- 無効な優先度チェック
    RETURN QUERY
    SELECT 
        'Invalid Priority Values'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        CONCAT(COUNT(*), ' records with invalid priority values')::TEXT
    FROM filter_keywords 
    WHERE priority NOT IN ('HIGH', 'MEDIUM', 'LOW');
    
    -- 空のキーワードチェック
    RETURN QUERY
    SELECT 
        'Empty Keywords'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        CONCAT(COUNT(*), ' records with empty keywords')::TEXT
    FROM filter_keywords 
    WHERE keyword IS NULL OR TRIM(keyword) = '';
    
    -- 孤立した検出ログチェック
    RETURN QUERY
    SELECT 
        'Orphaned Detection Logs'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        CONCAT(COUNT(*), ' detection logs without valid keyword reference')::TEXT
    FROM keyword_detection_logs kdl
    LEFT JOIN filter_keywords fk ON kdl.keyword_id = fk.id
    WHERE fk.id IS NULL;
END;
$ LANGUAGE plpgsql;

-- キーワード効果スコア計算
CREATE OR REPLACE FUNCTION calculate_effectiveness_scores()
RETURNS INTEGER AS $
DECLARE
    updated_count INTEGER := 0;
BEGIN
    UPDATE filter_keywords 
    SET effectiveness_score = CASE
        WHEN detection_count = 0 THEN 0
        WHEN detection_count <= 10 THEN LEAST(detection_count * 5, 50)
        WHEN detection_count <= 100 THEN 50 + ((detection_count - 10) * 0.5)
        ELSE 95
    END * (1 - LEAST(false_positive_rate, 0.5))
    WHERE updated_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- サンプルデータ挿入（開発・テスト用）
-- =============================================

-- フィルターキーワードサンプルデータ
INSERT INTO filter_keywords (keyword, type, priority, language, translation, description, category, detection_count) VALUES
-- 輸出禁止キーワード
('fake', 'EXPORT', 'HIGH', 'en', '偽物', '偽造品を示すキーワード', 'brand_protection', 1247),
('replica', 'EXPORT', 'HIGH', 'en', 'レプリカ', 'レプリカ商品', 'brand_protection', 892),
('counterfeit', 'EXPORT', 'HIGH', 'en', '偽造品', '偽造商品全般', 'brand_protection', 756),
('copy', 'EXPORT', 'MEDIUM', 'en', 'コピー', 'コピー商品', 'brand_protection', 423),
('imitation', 'EXPORT', 'MEDIUM', 'en', '模造品', '模造品', 'brand_protection', 312),
('フェイク', 'EXPORT', 'HIGH', 'ja', 'fake', '日本語での偽物表記', 'brand_protection', 234),
('レプリカ', 'EXPORT', 'HIGH', 'ja', 'replica', '日本語でのレプリカ', 'brand_protection', 187),

-- パテントトロール関連
('patent infringement', 'PATENT_TROLL', 'HIGH', 'en', '特許侵害', '特許権侵害', 'intellectual_property', 89),
('patent violation', 'PATENT_TROLL', 'HIGH', 'en', '特許違反', '特許違反行為', 'intellectual_property', 67),
('unauthorized patent use', 'PATENT_TROLL', 'MEDIUM', 'en', '無許可特許使用', '特許の無許可使用', 'intellectual_property', 45),
('特許侵害', 'PATENT_TROLL', 'HIGH', 'ja', 'patent infringement', '日本語での特許侵害', 'intellectual_property', 34),

-- VEROブランド
('louis vuitton', 'VERO', 'HIGH', 'en', 'ルイヴィトン', '高級ブランド', 'luxury_brand', 456),
('gucci', 'VERO', 'HIGH', 'en', 'グッチ', '高級ブランド', 'luxury_brand', 389),
('chanel', 'VERO', 'HIGH', 'en', 'シャネル', '高級ブランド', 'luxury_brand', 345),
('supreme', 'VERO', 'HIGH', 'en', 'シュプリーム', 'ストリートブランド', 'streetwear_brand', 298),
('nike', 'VERO', 'HIGH', 'en', 'ナイキ', 'スポーツブランド', 'sports_brand', 267),
('ルイヴィトン', 'VERO', 'HIGH', 'ja', 'louis vuitton', '日本語での高級ブランド', 'luxury_brand', 123),

-- モール別制限
('adult', 'MALL_SPECIFIC', 'HIGH', 'en', 'アダルト', 'アダルト関連商品', 'restricted_content', 78),
('weapon', 'MALL_SPECIFIC', 'HIGH', 'en', '武器', '武器関連', 'weapons', 56),
('drug', 'MALL_SPECIFIC', 'HIGH', 'en', '薬物', '薬物関連', 'drugs', 43),

-- 国別制限
('ivory', 'COUNTRY_SPECIFIC', 'HIGH', 'en', '象牙', '象牙製品', 'wildlife_protection', 23),
('rhino horn', 'COUNTRY_SPECIFIC', 'HIGH', 'en', 'サイの角', '犀角', 'wildlife_protection', 12),
('tiger bone', 'COUNTRY_SPECIFIC', 'HIGH', 'en', '虎の骨', '虎骨', 'wildlife_protection', 8)
ON CONFLICT (keyword, type, language, mall_name, country_code) DO NOTHING;

-- パテントトロール事例サンプルデータ
INSERT INTO patent_troll_cases (case_number, case_title, plaintiff, defendant, patent_number, patent_title, filing_date, court, status, risk_level, industry_affected) VALUES
('2024-CV-001234', 'TechCorp vs Global Electronics', 'TechCorp LLC', 'Global Electronics Inc', 'US123456789', 'Method for Electronic Commerce Transaction', '2024-01-15', 'Eastern District of Texas', 'ACTIVE', 'HIGH', 'Electronics'),
('2024-CV-001235', 'Patent Holdings vs Mobile Devices Co', 'Patent Holdings Inc', 'Mobile Devices Co', 'US987654321', 'Wireless Communication Protocol', '2024-02-10', 'Northern District of California', 'ACTIVE', 'MEDIUM', 'Telecommunications'),
('2023-CV-005678', 'Innovation LLC vs Software Solutions', 'Innovation LLC', 'Software Solutions Corp', 'US456789123', 'Database Management System', '2023-11-20', 'Delaware District Court', 'SETTLED', 'LOW', 'Software')
ON CONFLICT (case_number) DO NOTHING;

-- VERO参加者サンプルデータ
INSERT INTO vero_participants (vero_id, brand_name, company_name, industry, status, join_date, country_of_origin, enforcement_level, takedown_rate) VALUES
('VERO001', 'Apple', 'Apple Inc.', 'Technology', 'ACTIVE', '2020-01-01', 'USA', 'HIGH', 95.5),
('VERO002', 'Nike', 'Nike Inc.', 'Sports & Recreation', 'ACTIVE', '2019-06-15', 'USA', 'HIGH', 92.3),
('VERO003', 'Louis Vuitton', 'LVMH', 'Luxury Goods', 'ACTIVE', '2018-03-10', 'FRA', 'HIGH', 97.8),
('VERO004', 'Rolex', 'Rolex SA', 'Luxury Watches', 'ACTIVE', '2019-08-22', 'CHE', 'HIGH', 94.1),
('VERO005', 'Chanel', 'Chanel S.A.', 'Luxury Goods', 'ACTIVE', '2020-02-14', 'FRA', 'HIGH', 96.2)
ON CONFLICT (vero_id) DO NOTHING;

-- 国別制限サンプルデータ
INSERT INTO country_restrictions (country_code, country_name, restriction_type, category, description, enforcement_level, effective_date) VALUES
('USA', 'United States', 'EXPORT_BAN', 'Wildlife Protection', 'Prohibition of ivory and endangered species products', 'HIGH', '2016-07-06'),
('USA', 'United States', 'IMPORT_RESTRICTION', 'Cultural Heritage', 'Restrictions on cultural artifacts and antiquities', 'MEDIUM', '1970-04-12'),
('JPN', 'Japan', 'IMPORT_BAN', 'Food Safety', 'Prohibition of certain food products without proper certification', 'HIGH', '2000-01-01'),
('CHN', 'China', 'EXPORT_RESTRICTION', 'Technology', 'Restrictions on advanced technology exports', 'HIGH', '2019-05-15'),
('DEU', 'Germany', 'IMPORT_RESTRICTION', 'Weapons', 'Strict controls on weapon imports', 'HIGH', '1972-01-01')
ON CONFLICT DO NOTHING;

-- モール制限サンプルデータ  
INSERT INTO mall_restrictions (mall_name, restriction_type, category, description, severity, enforcement_method, penalty, effective_date) VALUES
('eBay', 'PROHIBITED_ITEMS', 'Adult Content', 'Adult-only products and services are prohibited', 'HIGH', 'AUTOMATIC', 'SUSPENSION', '2000-01-01'),
('eBay', 'PROHIBITED_ITEMS', 'Weapons', 'Weapons and military items are restricted', 'HIGH', 'AUTOMATIC', 'BAN', '2000-01-01'),
('Amazon', 'RESTRICTED_KEYWORDS', 'Brand Protection', 'Brand name misuse in listings', 'MEDIUM', 'AUTOMATIC', 'WARNING', '2010-01-01'),
('Etsy', 'PROHIBITED_ITEMS', 'Hazardous Materials', 'Dangerous chemicals and materials prohibited', 'HIGH', 'MANUAL', 'SUSPENSION', '2005-01-01'),
('Mercari', 'RESTRICTED_KEYWORDS', 'Adult Content', 'Adult content keywords are filtered', 'MEDIUM', 'AUTOMATIC', 'WARNING', '2013-01-01')
ON CONFLICT DO NOTHING;

-- システム統計初期データ
INSERT INTO filter_system_stats (date_recorded, total_keywords, active_keywords, total_detections, new_keywords_today, avg_detection_per_keyword)
SELECT 
    CURRENT_DATE,
    COUNT(*),
    COUNT(CASE WHEN is_active THEN 1 END),
    COALESCE(SUM(detection_count), 0),
    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END),
    COALESCE(AVG(detection_count), 0)
FROM filter_keywords
ON CONFLICT (date_recorded) DO UPDATE SET
    total_keywords = EXCLUDED.total_keywords,
    active_keywords = EXCLUDED.active_keywords,
    total_detections = EXCLUDED.total_detections,
    new_keywords_today = EXCLUDED.new_keywords_today,
    avg_detection_per_keyword = EXCLUDED.avg_detection_per_keyword,
    created_at = NOW();

-- キーワードカテゴリサンプルデータ
INSERT INTO keyword_categories (name, path, description, color_code, icon, sort_order) VALUES
('Brand Protection', '/brand-protection', 'ブランド保護関連のキーワード', '#dc2626', 'fas fa-shield-alt', 1),
('Intellectual Property', '/intellectual-property', '知的財産権関連のキーワード', '#d97706', 'fas fa-gavel', 2),
('Export Restrictions', '/export-restrictions', '輸出制限関連のキーワード', '#dc2626', 'fas fa-ban', 3),
('Mall Specific', '/mall-specific', 'モール固有の制限キーワード', '#059669', 'fas fa-store', 4),
('Country Specific', '/country-specific', '国別制限キーワード', '#0891b2', 'fas fa-globe', 5),
('Wildlife Protection', '/wildlife-protection', '野生動物保護関連', '#16a34a', 'fas fa-paw', 6),
('Cultural Heritage', '/cultural-heritage', '文化遺産保護関連', '#7c3aed', 'fas fa-landmark', 7)
ON CONFLICT (path) DO NOTHING;

-- =============================================
-- メンテナンス用プロシージャ
-- =============================================

-- データベース最適化
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS TEXT AS $
DECLARE
    result_message TEXT := '';
BEGIN
    -- インデックス再構築
    REINDEX TABLE filter_keywords;
    result_message := result_message || 'Filter keywords reindexed. ';
    
    -- 統計情報更新
    ANALYZE filter_keywords;
    ANALYZE keyword_detection_logs;
    result_message := result_message || 'Statistics updated. ';
    
    -- 古い検出ログのクリーンアップ（90日以上古い）
    DELETE FROM keyword_detection_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS result_message = CONCAT(result_message, 'Old detection logs cleaned. ');
    
    -- 効果スコア更新
    PERFORM calculate_effectiveness_scores();
    result_message := result_message || 'Effectiveness scores updated.';
    
    RETURN result_message;
END;
$ LANGUAGE plpgsql;

-- バックアップ推奨プロシージャ
CREATE OR REPLACE FUNCTION create_backup_recommendation()
RETURNS TABLE(table_name TEXT, priority TEXT, estimated_size TEXT, backup_frequency TEXT) AS $
BEGIN
    RETURN QUERY
    SELECT 
        'filter_keywords'::TEXT,
        'HIGH'::TEXT,
        pg_size_pretty(pg_total_relation_size('filter_keywords'))::TEXT,
        'Daily'::TEXT
    UNION ALL
    SELECT 
        'keyword_detection_logs'::TEXT,
        'MEDIUM'::TEXT,
        pg_size_pretty(pg_total_relation_size('keyword_detection_logs'))::TEXT,
        'Weekly'::TEXT
    UNION ALL
    SELECT 
        'patent_troll_cases'::TEXT,
        'MEDIUM'::TEXT,
        pg_size_pretty(pg_total_relation_size('patent_troll_cases'))::TEXT,
        'Weekly'::TEXT
    UNION ALL
    SELECT 
        'vero_participants'::TEXT,
        'MEDIUM'::TEXT,
        pg_size_pretty(pg_total_relation_size('vero_participants'))::TEXT,
        'Weekly'::TEXT;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- セキュリティ設定
-- =============================================

-- 行レベルセキュリティ（RLS）の例（必要に応じて有効化）
-- ALTER TABLE filter_keywords ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patent_troll_cases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vero_participants ENABLE ROW LEVEL SECURITY;

-- セキュリティポリシーの例
-- CREATE POLICY filter_keywords_policy ON filter_keywords
--     FOR ALL TO filter_app
--     USING (is_active = true OR current_user = 'filter_admin');

-- =============================================
-- モニタリング用クエリ（参考）
-- =============================================

/*
-- システムパフォーマンス監視
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('filter_keywords', 'keyword_detection_logs')
ORDER BY tablename, attname;

-- 長時間実行中のクエリ
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state = 'active';

-- テーブルサイズ監視
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- インデックス使用率
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    CASE WHEN idx_tup_read > 0 
         THEN round(100.0 * idx_tup_fetch / idx_tup_read, 2) 
         ELSE 0 
    END AS efficiency
FROM pg_stat_user_indexes
ORDER BY efficiency ASC;
*/

-- =============================================
-- 初期化完了メッセージ
-- =============================================

DO $
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE '高機能フィルターシステム データベース初期化完了';
    RAISE NOTICE 'バージョン: 2.0';
    RAISE NOTICE '作成日: %', NOW();
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'テーブル作成完了:';
    RAISE NOTICE '- filter_keywords (メインキーワードテーブル)';
    RAISE NOTICE '- patent_troll_cases (パテントトロール事例)';
    RAISE NOTICE '- vero_participants (VERO参加者)';
    RAISE NOTICE '- country_restrictions (国別制限)';
    RAISE NOTICE '- mall_restrictions (モール制限)';
    RAISE NOTICE '- keyword_detection_logs (検出ログ)';
    RAISE NOTICE '- filter_system_stats (システム統計)';
    RAISE NOTICE '- keyword_categories (キーワードカテゴリ)';
    RAISE NOTICE '- user_operation_logs (操作ログ)';
    RAISE NOTICE '- system_settings (システム設定)';
    RAISE NOTICE '';
    RAISE NOTICE 'ビュー作成完了:';
    RAISE NOTICE '- keyword_statistics (キーワード統計)';
    RAISE NOTICE '- high_impact_keywords (高効果キーワード)';
    RAISE NOTICE '- recent_detections (最近の検出活動)';
    RAISE NOTICE '';
    RAISE NOTICE '関数・トリガー作成完了:';
    RAISE NOTICE '- 自動更新時刻更新';
    RAISE NOTICE '- 検出回数自動計算';
    RAISE NOTICE '- データ整合性チェック';
    RAISE NOTICE '- 効果スコア計算';
    RAISE NOTICE '';
    RAISE NOTICE 'サンプルデータ投入完了';
    RAISE NOTICE '==============================================';
END $;