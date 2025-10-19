-- フィルターカテゴリテーブル拡張
ALTER TABLE filter_keywords MODIFY COLUMN type ENUM(
    'EXPORT',           -- 輸出禁止
    'PATENT',           -- 特許関連  
    'PATENT_TROLL',     -- パテントトロール
    'COUNTRY_SPECIFIC', -- 国別禁止
    'MALL_SPECIFIC',    -- モール別禁止
    'VERO',             -- VERO禁止
    'BRAND_PROTECTION'  -- ブランド保護
) NOT NULL;

-- 国別禁止用のカラム追加
ALTER TABLE filter_keywords ADD COLUMN country_code VARCHAR(3) NULL COMMENT '国コード（ISO 3166-1 alpha-3）';

-- Vero管理テーブル新規作成
CREATE TABLE vero_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    brand_name VARCHAR(255) NOT NULL COMMENT 'ブランド名',
    company_name VARCHAR(255) NOT NULL COMMENT '会社名',
    vero_id VARCHAR(100) UNIQUE COMMENT 'VERO参加者ID',
    protected_keywords TEXT COMMENT '保護されているキーワード（JSON形式）',
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    scraping_source VARCHAR(500) COMMENT 'スクレイピング元URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_brand_name (brand_name),
    INDEX idx_vero_id (vero_id),
    INDEX idx_status (status)
) COMMENT='VERO参加者管理テーブル';

-- パテントトロール事例管理テーブル
CREATE TABLE patent_troll_cases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    case_title VARCHAR(500) NOT NULL COMMENT '事例タイトル',
    patent_number VARCHAR(100) COMMENT '特許番号',
    plaintiff VARCHAR(255) COMMENT '原告（パテントトロール）',
    defendant VARCHAR(255) COMMENT '被告',
    case_summary TEXT COMMENT '事例概要',
    keywords TEXT COMMENT '関連キーワード（カンマ区切り）',
    risk_level ENUM('HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM',
    case_date DATE COMMENT '事例発生日',
    source_url VARCHAR(500) COMMENT 'ソースURL',
    scraping_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_patent_number (patent_number),
    INDEX idx_risk_level (risk_level),
    INDEX idx_case_date (case_date)
) COMMENT='パテントトロール事例管理';

-- 国別規制情報テーブル
CREATE TABLE country_restrictions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    country_code VARCHAR(3) NOT NULL COMMENT '国コード',
    country_name VARCHAR(100) NOT NULL COMMENT '国名',
    restriction_type ENUM('IMPORT_BAN', 'EXPORT_BAN', 'TRADEMARK', 'PATENT', 'OTHER') NOT NULL,
    restricted_keywords TEXT COMMENT '規制キーワード',
    description TEXT COMMENT '規制内容説明',
    effective_date DATE COMMENT '施行日',
    source_url VARCHAR(500) COMMENT '情報源URL',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_country_code (country_code),
    INDEX idx_restriction_type (restriction_type)
) COMMENT='国別規制情報';

-- スクレイピング設定テーブル
CREATE TABLE scraping_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    source_name VARCHAR(255) NOT NULL COMMENT 'ソース名',
    source_type ENUM('PATENT_TROLL', 'VERO', 'COUNTRY_RESTRICTIONS', 'EXPORT_CONTROL') NOT NULL,
    base_url VARCHAR(500) NOT NULL COMMENT 'ベースURL',
    scraping_config JSON COMMENT 'スクレイピング設定（セレクタ等）',
    schedule_pattern VARCHAR(50) DEFAULT '0 2 * * *' COMMENT 'cron形式のスケジュール',
    last_scraped TIMESTAMP NULL COMMENT '最終スクレイピング日時',
    next_scheduled TIMESTAMP NULL COMMENT '次回予定日時',
    status ENUM('ACTIVE', 'INACTIVE', 'ERROR') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_source_type (source_type),
    INDEX idx_next_scheduled (next_scheduled)
) COMMENT='スクレイピングソース管理';

-- デフォルトスクレイピングソース挿入
INSERT INTO scraping_sources (source_name, source_type, base_url, scraping_config) VALUES
('USPTO Patent Cases', 'PATENT_TROLL', 'https://www.uspto.gov', JSON_OBJECT('selector', '.patent-case', 'fields', JSON_ARRAY('title', 'number', 'date'))),
('eBay VERO List', 'VERO', 'https://www.ebay.com/help/policies/listing-policies/verified-rights-owner-vero-program', JSON_OBJECT('selector', '.vero-brand', 'fields', JSON_ARRAY('brand', 'company'))),
('Export Control List', 'EXPORT_CONTROL', 'https://www.bis.doc.gov/index.php/regulations/export-administration-regulations-ear', JSON_OBJECT('selector', '.controlled-item', 'fields', JSON_ARRAY('item', 'eccn')));