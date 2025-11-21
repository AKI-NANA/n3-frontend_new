-- 004_create_amazon_config.sql

CREATE TABLE IF NOT EXISTS amazon_config (
    id SERIAL PRIMARY KEY,
    config_name TEXT NOT NULL,
    search_keywords TEXT, -- 検索キーワードまたはAmazon URL
    target_category_id TEXT, -- ターゲットカテゴリID (API検索用)
    min_rating NUMERIC DEFAULT 4.0, -- 最小平均評価閾値
    max_bsr_rank INTEGER DEFAULT 10000, -- 最大BSR（これより小さいほど良い）
    min_image_count INTEGER DEFAULT 3, -- 最小画像枚数（情報量チェック）
    min_title_length INTEGER DEFAULT 30, -- 最小タイトル文字数（情報量チェック）
    is_active BOOLEAN DEFAULT TRUE, -- 設定の有効/無効
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE amazon_config IS 'Amazon自動データ取得の設定と閾値を管理するテーブル';
