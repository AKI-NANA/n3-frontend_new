-- eBayカテゴリー自動判定システム用データベーススキーマ
-- 既存システム完全保護・独立テーブル設計
-- 作成日: 2025-09-14
-- 注意: 既存 mystical_japan_treasures_inventory テーブルは一切変更しない

-- 🛡️ 既存システム保護確認
DO $$ 
BEGIN
    -- 既存テーブルの存在確認
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mystical_japan_treasures_inventory') THEN
        RAISE NOTICE '✅ 既存テーブル mystical_japan_treasures_inventory 確認済み - 完全保護します';
    ELSE
        RAISE EXCEPTION '❌ 既存テーブルが見つかりません。処理を中止します。';
    END IF;
END $$;

-- 🆕 1. eBayカテゴリーマスター（独立テーブル）
CREATE TABLE IF NOT EXISTS ebay_categories_master (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(200) NOT NULL,
    parent_id VARCHAR(20),
    marketplace_id INTEGER DEFAULT 0, -- 0=US, 3=UK, 77=Germany
    is_leaf BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    confidence_threshold INTEGER DEFAULT 80,
    data_source VARCHAR(10) DEFAULT 'manual', -- 'manual', 'bulk', 'api'
    last_verified TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- インデックス用制約
    UNIQUE(category_id, marketplace_id)
);

-- 🆕 2. eBayカテゴリー必須項目（独立テーブル）
CREATE TABLE IF NOT EXISTS ebay_item_aspects (
    aspect_id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) REFERENCES ebay_categories_master(category_id),
    aspect_name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    data_type VARCHAR(20) DEFAULT 'STRING', -- STRING, INTEGER, DECIMAL, BOOLEAN
    cardinality VARCHAR(10) DEFAULT 'SINGLE', -- SINGLE, MULTI
    entry_mode VARCHAR(20) DEFAULT 'FREE_TEXT', -- FREE_TEXT, SELECTION_ONLY
    allowed_values JSONB, -- ["Apple", "Samsung", "Sony", ...]
    default_value VARCHAR(100) DEFAULT 'Unknown',
    confidence_score INTEGER DEFAULT 90,
    usage_priority INTEGER DEFAULT 1, -- 1=必須, 2=推奨, 3=オプション
    data_source VARCHAR(10) DEFAULT 'manual',
    last_verified TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    -- パフォーマンス最適化
    UNIQUE(category_id, aspect_name)
);

-- 🆕 3. 日英キーワードマッピング（学習機能付き）
CREATE TABLE IF NOT EXISTS category_keyword_mapping (
    mapping_id SERIAL PRIMARY KEY,
    japanese_keyword VARCHAR(100) NOT NULL,
    english_keywords TEXT[] NOT NULL, -- ["smartphone", "phone", "mobile"]
    pattern_type VARCHAR(20) DEFAULT 'exact', -- 'exact', 'partial', 'regex'
    ebay_category_id VARCHAR(20),
    confidence_score INTEGER DEFAULT 70,
    usage_count INTEGER DEFAULT 1,
    success_count INTEGER DEFAULT 1,
    success_rate FLOAT DEFAULT 1.0, -- success_count / usage_count
    data_source VARCHAR(10) DEFAULT 'manual', -- 'manual', 'api', 'learning'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- 検索最適化
    INDEX (japanese_keyword),
    UNIQUE(japanese_keyword, ebay_category_id)
);

-- 🆕 4. API使用履歴・制限管理（独立テーブル）
CREATE TABLE IF NOT EXISTS ebay_api_usage_log (
    log_id SERIAL PRIMARY KEY,
    api_type VARCHAR(50) NOT NULL, -- 'getItemAspects', 'getCategories', 'suggestCategory'
    category_id VARCHAR(20),
    request_data JSONB,
    response_data JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    processing_time INTEGER, -- milliseconds
    daily_count INTEGER, -- その日の使用回数
    rate_limit_remaining INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    -- 日次制限管理用
    created_date DATE GENERATED ALWAYS AS (created_at::date) STORED,
    INDEX (created_date, api_type)
);

-- 🆕 5. 商品カテゴリー判定履歴（既存データ連携オプション）
CREATE TABLE IF NOT EXISTS product_category_history (
    history_id SERIAL PRIMARY KEY,
    -- 🔗 既存システム連携用（オプショナル・軽い紐付けのみ）
    mystical_item_id VARCHAR(50), -- mystical_japan_treasures_inventory.item_id
    
    -- 判定対象データ
    product_title TEXT NOT NULL,
    product_description TEXT,
    product_price DECIMAL(10,2),
    product_brand VARCHAR(100),
    
    -- 判定結果
    detected_category_id VARCHAR(20),
    detected_category_name VARCHAR(200),
    confidence_score INTEGER,
    item_specifics TEXT, -- Brand=Apple■Model=iPhone■Storage=128GB
    detection_method VARCHAR(20) DEFAULT 'hybrid', -- 'local', 'api', 'hybrid', 'manual'
    match_keywords TEXT[], -- マッチしたキーワード配列
    
    -- メタデータ
    processing_time INTEGER, -- milliseconds
    api_calls_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50) DEFAULT 'system',
    
    -- 統計・分析用
    is_successful BOOLEAN DEFAULT TRUE,
    user_feedback VARCHAR(10), -- 'correct', 'incorrect', 'partial'
    
    -- パフォーマンス最適化
    INDEX (mystical_item_id),
    INDEX (detected_category_id),
    INDEX (created_at)
);

-- 🆕 6. システム設定・統計（独立テーブル）
CREATE TABLE IF NOT EXISTS ebay_category_system_stats (
    stat_id SERIAL PRIMARY KEY,
    stat_date DATE DEFAULT CURRENT_DATE,
    total_categories INTEGER DEFAULT 0,
    supported_categories INTEGER DEFAULT 0,
    daily_detections INTEGER DEFAULT 0,
    daily_api_calls INTEGER DEFAULT 0,
    avg_confidence FLOAT DEFAULT 0.0,
    success_rate FLOAT DEFAULT 0.0,
    top_categories JSONB, -- [{"name": "Cell Phones", "count": 89}, ...]
    system_performance JSONB, -- {"avg_response_time": 150, "cache_hit_rate": 0.85}
    created_at TIMESTAMP DEFAULT NOW(),
    -- 日次統計管理
    UNIQUE(stat_date)
);

-- 📊 初期インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_ebay_categories_active ON ebay_categories_master(is_active, marketplace_id);
CREATE INDEX IF NOT EXISTS idx_item_aspects_required ON ebay_item_aspects(category_id, is_required);
CREATE INDEX IF NOT EXISTS idx_keyword_mapping_active ON category_keyword_mapping(is_active, japanese_keyword);
CREATE INDEX IF NOT EXISTS idx_api_usage_daily ON ebay_api_usage_log(created_date, api_type, success);
CREATE INDEX IF NOT EXISTS idx_category_history_recent ON product_category_history(created_at DESC);

-- 🔧 便利なビュー作成
CREATE OR REPLACE VIEW ebay_category_detection_summary AS
SELECT 
    ecm.category_id,
    ecm.category_name,
    ecm.marketplace_id,
    COUNT(pch.history_id) as detection_count,
    AVG(pch.confidence_score) as avg_confidence,
    COUNT(CASE WHEN pch.user_feedback = 'correct' THEN 1 END) as correct_feedback,
    COUNT(CASE WHEN pch.user_feedback = 'incorrect' THEN 1 END) as incorrect_feedback,
    MAX(pch.created_at) as last_used
FROM ebay_categories_master ecm
LEFT JOIN product_category_history pch ON ecm.category_id = pch.detected_category_id
WHERE ecm.is_active = TRUE
GROUP BY ecm.category_id, ecm.category_name, ecm.marketplace_id
ORDER BY detection_count DESC;

-- 📈 統計関数作成
CREATE OR REPLACE FUNCTION update_daily_category_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO ebay_category_system_stats (
        stat_date,
        total_categories,
        supported_categories,
        daily_detections,
        daily_api_calls,
        avg_confidence,
        success_rate
    )
    SELECT 
        CURRENT_DATE,
        (SELECT COUNT(*) FROM ebay_categories_master WHERE is_active = TRUE),
        (SELECT COUNT(DISTINCT category_id) FROM category_keyword_mapping WHERE is_active = TRUE),
        (SELECT COUNT(*) FROM product_category_history WHERE created_at::date = CURRENT_DATE),
        (SELECT COUNT(*) FROM ebay_api_usage_log WHERE created_date = CURRENT_DATE AND success = TRUE),
        (SELECT AVG(confidence_score) FROM product_category_history WHERE created_at::date = CURRENT_DATE),
        (SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 0.0
                ELSE COUNT(CASE WHEN user_feedback = 'correct' THEN 1 END)::float / COUNT(*)::float
            END
         FROM product_category_history 
         WHERE created_at::date = CURRENT_DATE AND user_feedback IS NOT NULL)
    ON CONFLICT (stat_date) 
    DO UPDATE SET
        total_categories = EXCLUDED.total_categories,
        supported_categories = EXCLUDED.supported_categories,
        daily_detections = EXCLUDED.daily_detections,
        daily_api_calls = EXCLUDED.daily_api_calls,
        avg_confidence = EXCLUDED.avg_confidence,
        success_rate = EXCLUDED.success_rate,
        created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 🛡️ 最終安全性確認
DO $$ 
BEGIN
    -- 既存テーブルが変更されていないことを確認
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'mystical_japan_treasures_inventory' 
               AND column_name = 'item_id') THEN
        RAISE NOTICE '✅ 既存テーブル構造確認完了 - 変更されていません';
    ELSE
        RAISE EXCEPTION '❌ 既存テーブル構造に問題があります';
    END IF;
    
    -- 新規テーブル作成確認
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ebay_categories_master') THEN
        RAISE NOTICE '✅ eBayカテゴリーシステム テーブル作成完了';
    ELSE
        RAISE EXCEPTION '❌ eBayカテゴリーテーブル作成に失敗しました';
    END IF;
END $$;

-- 📝 作成完了ログ
INSERT INTO ebay_api_usage_log (api_type, success, request_data, created_at) 
VALUES ('system_setup', TRUE, '{"action": "schema_creation", "version": "1.0"}', NOW());

COMMENT ON TABLE ebay_categories_master IS 'eBayカテゴリーマスターデータ（既存システム完全独立）';
COMMENT ON TABLE ebay_item_aspects IS 'eBayカテゴリー必須項目定義';
COMMENT ON TABLE category_keyword_mapping IS 'カテゴリー判定用キーワードマッピング（学習機能付き）';
COMMENT ON TABLE ebay_api_usage_log IS 'eBay API使用履歴・制限管理';
COMMENT ON TABLE product_category_history IS '商品カテゴリー判定履歴（既存データとオプション連携）';
COMMENT ON TABLE ebay_category_system_stats IS 'システム統計・性能監視';
