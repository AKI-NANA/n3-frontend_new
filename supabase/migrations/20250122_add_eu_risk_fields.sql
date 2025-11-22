-- EUリスク回避フィルター用フィールドを追加
-- 作成日: 2025-01-22
-- 対応タスク: C-7

-- products_master テーブルにEUリスク関連フィールドを追加
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS eu_risk_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS eu_risk_reason TEXT,
ADD COLUMN IF NOT EXISTS suggested_title TEXT,
ADD COLUMN IF NOT EXISTS eu_ar_status TEXT CHECK (eu_ar_status IN ('REQUIRED_NO_AR', 'HAS_AR', 'NOT_REQUIRED', 'PENDING'));

-- カラムにコメントを追加
COMMENT ON COLUMN products_master.eu_risk_flag IS 'EUリスクフラグ: TRUE = 高リスク（おもちゃカテゴリ＆ノーブランド中国製品）, FALSE = リスククリア';
COMMENT ON COLUMN products_master.eu_risk_reason IS 'リスク判定理由の説明文（例: 高リスクカテゴリ（おもちゃ） AND ノーブランド中国製品と判定）';
COMMENT ON COLUMN products_master.suggested_title IS '提案タイトル（リスク回避用）: ユーザーがコピーして使用できるリスク回避タイトル';
COMMENT ON COLUMN products_master.eu_ar_status IS 'EU AR（Authorized Representative）ステータス: REQUIRED_NO_AR（要AR情報・未確保）, HAS_AR（AR情報あり）, NOT_REQUIRED（AR不要）, PENDING（確認中）';

-- インデックスを追加（検索性能向上のため）
CREATE INDEX IF NOT EXISTS idx_products_master_eu_risk_flag ON products_master(eu_risk_flag);
CREATE INDEX IF NOT EXISTS idx_products_master_eu_ar_status ON products_master(eu_ar_status);

-- フィルタークエリの例（参考用コメント）
-- EUリスククリア商品を取得:
-- SELECT * FROM products_master WHERE eu_risk_flag = FALSE;
--
-- EUリスク未クリア商品を取得:
-- SELECT * FROM products_master WHERE eu_risk_flag = TRUE;
--
-- 出品ブロック対象商品（高リスク＆AR未確保）:
-- SELECT * FROM products_master WHERE eu_risk_flag = TRUE AND eu_ar_status = 'REQUIRED_NO_AR';
