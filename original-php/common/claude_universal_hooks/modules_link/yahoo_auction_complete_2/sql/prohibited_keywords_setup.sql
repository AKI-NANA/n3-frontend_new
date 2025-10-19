-- 🚨 禁止キーワード管理システム - データベース設定
-- Yahoo→eBay統合ワークフローに禁止ワード機能を追加

-- 禁止キーワードテーブル作成
CREATE TABLE IF NOT EXISTS prohibited_keywords (
    keyword_id SERIAL PRIMARY KEY,
    keyword_text VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) DEFAULT 'general',
    severity VARCHAR(20) DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- インデックス作成（大文字・小文字を区別しない検索用）
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_text_lower 
ON prohibited_keywords (LOWER(keyword_text));

CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_category 
ON prohibited_keywords (category);

CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_active 
ON prohibited_keywords (is_active);

-- キーワードチェック履歴テーブル
CREATE TABLE IF NOT EXISTS keyword_check_history (
    check_id SERIAL PRIMARY KEY,
    product_title TEXT NOT NULL,
    matched_keywords TEXT[],
    is_prohibited BOOLEAN NOT NULL,
    check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_taken VARCHAR(50) DEFAULT 'blocked',
    item_id VARCHAR(100)
);

-- 基本的な禁止キーワードを挿入（日本のYahooオークション→eBay出品用）
INSERT INTO prohibited_keywords (keyword_text, category, severity, reason) VALUES
-- 法的問題・著作権
('Nintendo', 'copyright', 'critical', '著作権・商標権侵害リスク'),
('Sony', 'copyright', 'critical', '著作権・商標権侵害リスク'),
('Apple', 'copyright', 'critical', '著作権・商標権侵害リスク'),
('Disney', 'copyright', 'critical', '著作権・商標権侵害リスク'),
('Pokemon', 'copyright', 'critical', 'ポケモン関連商標侵害'),
('ポケモン', 'copyright', 'critical', 'ポケモン関連商標侵害'),
('任天堂', 'copyright', 'critical', '任天堂商標侵害'),

-- 禁止品目
('replica', 'prohibited', 'critical', 'レプリカ商品は禁止'),
('レプリカ', 'prohibited', 'critical', 'レプリカ商品は禁止'),
('fake', 'prohibited', 'critical', '偽造品は禁止'),
('偽物', 'prohibited', 'critical', '偽造品は禁止'),
('copy', 'prohibited', 'critical', 'コピー商品は禁止'),
('コピー', 'prohibited', 'critical', 'コピー商品は禁止'),

-- ハイリスクカテゴリ
('medicine', 'restricted', 'high', '医薬品は制限あり'),
('薬', 'restricted', 'high', '医薬品は制限あり'),
('supplement', 'restricted', 'medium', 'サプリメントは制限あり'),
('サプリメント', 'restricted', 'medium', 'サプリメントは制限あり'),
('cosmetic', 'restricted', 'medium', '化粧品は制限あり'),
('化粧品', 'restricted', 'medium', '化粧品は制限あり'),

-- 危険物
('battery', 'dangerous', 'high', 'バッテリーは配送制限あり'),
('バッテリー', 'dangerous', 'high', 'バッテリーは配送制限あり'),
('liquid', 'dangerous', 'medium', '液体は配送制限あり'),
('液体', 'dangerous', 'medium', '液体は配送制限あり'),

-- アダルト
('adult', 'adult', 'critical', 'アダルト商品は禁止'),
('アダルト', 'adult', 'critical', 'アダルト商品は禁止'),
('18+', 'adult', 'critical', '成人向け商品は禁止'),

-- その他リスク
('military', 'restricted', 'high', '軍事関連は制限あり'),
('weapon', 'prohibited', 'critical', '武器類は禁止'),
('武器', 'prohibited', 'critical', '武器類は禁止'),
('knife', 'restricted', 'high', 'ナイフ類は制限あり'),
('ナイフ', 'restricted', 'high', 'ナイフ類は制限あり')

ON CONFLICT (keyword_text) DO NOTHING;

-- CSVアップロード履歴テーブル
CREATE TABLE IF NOT EXISTS keyword_upload_history (
    upload_id SERIAL PRIMARY KEY,
    filename VARCHAR(255),
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    keywords_added INTEGER DEFAULT 0,
    keywords_updated INTEGER DEFAULT 0,
    keywords_total INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT
);

-- 統計ビュー作成
CREATE OR REPLACE VIEW prohibited_keywords_stats AS
SELECT 
    category,
    severity,
    COUNT(*) as keyword_count,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count
FROM prohibited_keywords
GROUP BY category, severity
ORDER BY category, severity;

-- キーワードチェック関数
CREATE OR REPLACE FUNCTION check_title_for_prohibited_words(title_text TEXT)
RETURNS TABLE(
    is_prohibited BOOLEAN,
    matched_keywords TEXT[],
    highest_severity VARCHAR(20)
) AS $$
DECLARE
    matched_words TEXT[] := '{}';
    max_severity VARCHAR(20) := 'low';
    keyword_record RECORD;
    is_blocked BOOLEAN := FALSE;
    severity_weight INTEGER;
BEGIN
    -- 各禁止キーワードをチェック
    FOR keyword_record IN 
        SELECT keyword_text, severity, category 
        FROM prohibited_keywords 
        WHERE is_active = TRUE 
    LOOP
        -- 大文字・小文字を区別しない部分一致検索
        IF LOWER(title_text) LIKE '%' || LOWER(keyword_record.keyword_text) || '%' THEN
            matched_words := array_append(matched_words, keyword_record.keyword_text);
            
            -- 重要度判定
            severity_weight := CASE keyword_record.severity
                WHEN 'critical' THEN 4
                WHEN 'high' THEN 3
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 1
                ELSE 1
            END;
            
            -- criticalまたはhighが見つかったら出品禁止
            IF keyword_record.severity IN ('critical', 'high') THEN
                is_blocked := TRUE;
            END IF;
            
            -- 最高重要度を更新
            IF severity_weight > CASE max_severity
                WHEN 'critical' THEN 4
                WHEN 'high' THEN 3
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 1
                ELSE 1
            END THEN
                max_severity := keyword_record.severity;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT is_blocked, matched_words, max_severity;
END;
$$ LANGUAGE plpgsql;

-- 実行権限付与
GRANT SELECT, INSERT, UPDATE, DELETE ON prohibited_keywords TO postgres;
GRANT SELECT, INSERT ON keyword_check_history TO postgres;
GRANT SELECT, INSERT ON keyword_upload_history TO postgres;
GRANT SELECT ON prohibited_keywords_stats TO postgres;

-- 初期統計データ確認
SELECT 
    'データベース設定完了' as status,
    COUNT(*) as initial_keywords_count,
    COUNT(DISTINCT category) as categories_count
FROM prohibited_keywords;

COMMENT ON TABLE prohibited_keywords IS '出品禁止キーワード管理テーブル';
COMMENT ON TABLE keyword_check_history IS 'キーワードチェック履歴';
COMMENT ON TABLE keyword_upload_history IS 'CSVアップロード履歴';
COMMENT ON FUNCTION check_title_for_prohibited_words(TEXT) IS 'タイトル内の禁止ワードチェック関数';
