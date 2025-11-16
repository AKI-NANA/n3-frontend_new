-- database/migrations/004_create_amazon_config.sql

CREATE TABLE IF NOT EXISTS amazon_config (
    id SERIAL PRIMARY KEY,
    
    -- 設定の基本情報
    config_name TEXT NOT NULL, 
    is_active BOOLEAN DEFAULT TRUE, -- 設定の有効/無効

    -- 取得対象の定義
    search_keywords TEXT, -- 検索キーワードまたはAmazon URL
    target_category_id TEXT, -- ターゲットカテゴリID (API検索用)

    -- ✨ スコアリングとフィルタリングの閾値
    min_rating NUMERIC DEFAULT 4.0, -- 最小平均評価閾値 (例: 4.0未満は除外)
    max_bsr_rank INTEGER DEFAULT 10000, -- 最大BSR（これより小さいほど良い。例: 10000位より悪い場合は除外）
    min_image_count INTEGER DEFAULT 3, -- 最小画像枚数（情報量チェック）
    min_title_length INTEGER DEFAULT 30, -- 最小タイトル文字数（情報量チェック）

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE amazon_config IS 'Amazon自動データ取得の設定と閾値を管理するテーブル';

-- 更新日時の自動更新トリガー (PostgreSQL / Supabase の標準機能として想定)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_amazon_config_updated_at
BEFORE UPDATE ON amazon_config
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();