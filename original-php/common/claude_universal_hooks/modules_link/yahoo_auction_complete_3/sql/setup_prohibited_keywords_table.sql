-- 禁止キーワード管理テーブル作成とサンプルデータ挿入
-- 実行方法: psql -U postgres -d nagano3_db -f setup_prohibited_keywords_table.sql

-- 禁止キーワード管理テーブル作成
CREATE TABLE IF NOT EXISTS prohibited_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    detection_count INTEGER DEFAULT 0,
    created_date TIMESTAMP DEFAULT NOW(),
    last_detected TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_by VARCHAR(100) DEFAULT 'system',
    notes TEXT,
    
    -- 制約
    CONSTRAINT unique_keyword UNIQUE(keyword, category),
    CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_keyword ON prohibited_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_category ON prohibited_keywords(category);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_priority ON prohibited_keywords(priority);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_status ON prohibited_keywords(status);

-- サンプルデータ挿入
INSERT INTO prohibited_keywords (keyword, category, priority, detection_count, last_detected) VALUES
('偽物', 'brand', 'high', 127, '2025-09-10 10:30:00'),
('コピー品', 'brand', 'medium', 89, '2025-09-09 15:22:00'),
('レプリカ', 'fashion', 'high', 203, '2025-09-10 09:15:00'),
('薬事法違反', 'medical', 'high', 45, '2025-09-08 14:33:00'),
('転売禁止', 'general', 'low', 12, '2025-09-06 11:45:00'),
('非正規品', 'brand', 'high', 156, '2025-09-10 08:20:00'),
('模造品', 'brand', 'high', 78, '2025-09-09 16:10:00'),
('健康食品', 'medical', 'medium', 34, '2025-09-07 13:25:00'),
('痩せる', 'medical', 'high', 67, '2025-09-08 12:15:00'),
('ダイエット効果', 'medical', 'high', 89, '2025-09-09 09:30:00'),
('医療機器', 'medical', 'high', 23, '2025-09-07 16:45:00'),
('正規販売店以外', 'brand', 'medium', 45, '2025-09-08 11:20:00'),
('海賊版', 'prohibited', 'high', 134, '2025-09-10 08:45:00'),
('違法コピー', 'prohibited', 'high', 98, '2025-09-09 14:20:00'),
('盗品', 'prohibited', 'high', 12, '2025-09-05 19:30:00'),
('ハンドメイド', 'fashion', 'low', 234, '2025-09-10 07:15:00'),
('手作り', 'fashion', 'low', 178, '2025-09-09 18:45:00'),
('並行輸入', 'brand', 'medium', 67, '2025-09-08 13:30:00'),
('グレー輸入', 'brand', 'medium', 34, '2025-09-07 10:15:00'),
('転売品', 'general', 'medium', 89, '2025-09-09 16:20:00')
ON CONFLICT (keyword, category) DO NOTHING;

-- 統計確認
SELECT 
    category,
    priority,
    COUNT(*) as count,
    SUM(detection_count) as total_detections
FROM prohibited_keywords 
GROUP BY category, priority 
ORDER BY category, 
    CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END;

-- テーブル確認
SELECT COUNT(*) as total_keywords FROM prohibited_keywords;
