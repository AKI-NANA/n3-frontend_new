-- ファイル: /database/migrations/005_create_sns_trend.sql

-- SNS収益化トレンドと成功事例の管理テーブル
CREATE TABLE IF NOT EXISTS sns_trend_master (
    id SERIAL PRIMARY KEY,
    platform TEXT NOT NULL,       -- 'youtube' | 'tiktok' | 'note' | 'x'
    trend_keyword TEXT NOT NULL,  -- トレンドの核となるキーワード
    monetization_method TEXT,     -- 収益化手法（例: 投げ銭、独自アフィリエイト、Udemy誘導など）
    success_example_url TEXT,     -- 成功事例のURL
    extracted_data JSONB,         -- 抽出された生データ
    analysis_score NUMERIC,       -- 収益性スコア
    created_at TIMESTAMPTZ DEFAULT NOW()
);
