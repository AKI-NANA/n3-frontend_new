-- ファイル: /database/migrations/008_create_cf_research.sql

-- クラウドファンディング（CF）プロジェクトのリサーチ結果テーブル
CREATE TABLE IF NOT EXISTS cf_project_master (
    id SERIAL PRIMARY KEY,
    platform TEXT NOT NULL,         -- 'makuake', 'kickstarter', 'readyfor' など
    project_title TEXT NOT NULL,
    project_url TEXT UNIQUE NOT NULL,

    -- 生データ（スクレイピング結果）
    funding_amount_target NUMERIC,  -- 目標金額
    funding_amount_actual NUMERIC,  -- 達成金額
    backers_count INTEGER,          -- 支援者数
    duration_days INTEGER,          -- 実施期間

    -- AI評価スコア (0.00-10.00)
    marketability_score NUMERIC(4, 2),
    profitability_score NUMERIC(4, 2),
    competitiveness_score NUMERIC(4, 2),
    overall_evaluation TEXT,        -- AIによる総合評価の要約

    -- AI生成されたLP構成案
    lp_proposal_json JSONB,

    status TEXT DEFAULT 'new',      -- 'new', 'analyzed', 'investigated'
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
