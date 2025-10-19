-- 承認システムに必要なカラムを追加
-- 既に存在する場合はエラーにならないように ALTER TABLE を使用

-- フィルター結果カラム
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS export_filter_status BOOLEAN DEFAULT NULL;

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS patent_filter_status BOOLEAN DEFAULT NULL;

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS mall_filter_status BOOLEAN DEFAULT NULL;

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS final_judgment VARCHAR(20) DEFAULT NULL;

-- 承認関連カラム
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP DEFAULT NULL;

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100) DEFAULT NULL;

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- AI判定関連カラム
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER DEFAULT NULL;

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT DEFAULT NULL;

-- モール選択カラム
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS selected_mall VARCHAR(50) DEFAULT NULL;

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_approval_status ON yahoo_scraped_products(approval_status);
CREATE INDEX IF NOT EXISTS idx_export_filter ON yahoo_scraped_products(export_filter_status);
CREATE INDEX IF NOT EXISTS idx_patent_filter ON yahoo_scraped_products(patent_filter_status);
CREATE INDEX IF NOT EXISTS idx_mall_filter ON yahoo_scraped_products(mall_filter_status);
CREATE INDEX IF NOT EXISTS idx_ai_score ON yahoo_scraped_products(ai_confidence_score);

-- カラム追加完了メッセージ
SELECT 'カラム追加完了: 承認システム用カラムが追加されました' as message;
