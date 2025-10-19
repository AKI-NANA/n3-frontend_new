-- 禁止キーワード管理テーブル作成
-- Yahoo Auction Tool 用

-- 既存テーブル確認・作成
CREATE TABLE IF NOT EXISTS prohibited_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) DEFAULT 'general',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    detection_count INTEGER DEFAULT 0,
    created_date DATE DEFAULT CURRENT_DATE,
    last_detected DATE,
    created_by VARCHAR(100) DEFAULT 'system',
    description TEXT,
    
    -- 制約
    CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'pending')),
    CONSTRAINT valid_keyword CHECK (LENGTH(keyword) > 0)
);

-- インデックス作成（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_keyword ON prohibited_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_category ON prohibited_keywords(category);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_priority ON prohibited_keywords(priority);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_status ON prohibited_keywords(status);

-- サンプルデータ挿入（既存データと重複しない場合のみ）
INSERT INTO prohibited_keywords (keyword, category, priority, status, description)
VALUES 
    ('偽物', 'ブランド', 'high', 'active', 'ブランド品の偽物を示すキーワード'),
    ('コピー品', 'ブランド', 'high', 'active', 'コピー商品を示すキーワード'),
    ('レプリカ', 'ブランド', 'medium', 'active', 'レプリカ商品を示すキーワード'),
    ('激安', '価格', 'medium', 'active', '異常に安い価格を示すキーワード'),
    ('海賊版', 'メディア', 'high', 'active', '著作権侵害商品を示すキーワード'),
    ('違法', '一般', 'high', 'active', '違法性を示すキーワード'),
    ('危険', '安全', 'high', 'active', '安全性に問題があることを示すキーワード'),
    ('転売禁止', '制限', 'medium', 'active', '転売が禁止されている商品'),
    ('年齢制限', '制限', 'medium', 'active', '年齢制限のある商品'),
    ('処方薬', '医薬品', 'high', 'active', '処方薬関連のキーワード')
ON CONFLICT (keyword) DO NOTHING;

-- 統計ビュー作成
CREATE OR REPLACE VIEW prohibited_keywords_stats AS
SELECT 
    COUNT(*) as total_keywords,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_keywords,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_keywords,
    SUM(detection_count) as total_detections,
    COUNT(CASE WHEN last_detected = CURRENT_DATE THEN 1 END) as detected_today,
    MAX(created_date) as last_keyword_added,
    MAX(last_detected) as last_detection_date
FROM prohibited_keywords;

-- テーブル作成完了ログ
DO $$ 
BEGIN
    RAISE NOTICE '禁止キーワード管理テーブル作成完了: prohibited_keywords';
END $$;
