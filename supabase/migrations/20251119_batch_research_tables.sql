-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- eBay Batch Research System - Database Migration
-- 大規模データ一括取得バッチシステム用テーブル
-- Created: 2025-11-19
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ============================================================================
-- Table 1: research_condition_stock
-- 検索条件ストックテーブル
-- 大規模リサーチジョブを日付分割された小さなタスクとして管理
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.research_condition_stock (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Job Identification
    job_id TEXT NOT NULL,                    -- 親ジョブID（複数のタスクをグループ化）
    search_id TEXT NOT NULL UNIQUE,          -- 個別タスクの一意なID

    -- Search Conditions (セラーIDが最重要の絞り込み条件)
    target_seller_id TEXT NOT NULL,          -- 必須: eBayセラーID
    keyword TEXT,                            -- 任意: 検索キーワード（空欄許可）

    -- Date Range (分割された日付範囲)
    date_start DATE NOT NULL,                -- 開始日
    date_end DATE NOT NULL,                  -- 終了日

    -- Listing Filters
    listing_status TEXT NOT NULL DEFAULT 'Sold',  -- 'Sold' or 'Completed'
    listing_type TEXT DEFAULT 'FixedPrice',       -- 'FixedPrice', 'Auction', 'All'

    -- Pagination Control
    current_page INTEGER DEFAULT 1,          -- 現在のページ番号
    total_pages INTEGER,                     -- 総ページ数（初回API呼び出し後に設定）
    items_per_page INTEGER DEFAULT 100,     -- 1ページあたりの取得件数（API最大値）
    total_items_found INTEGER,              -- 見つかった総アイテム数
    items_retrieved INTEGER DEFAULT 0,      -- 取得済みアイテム数

    -- Status Management
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed', 'paused'
    priority INTEGER DEFAULT 0,              -- 優先度（高い値ほど優先）

    -- Execution Tracking
    started_at TIMESTAMPTZ,                  -- 処理開始日時
    completed_at TIMESTAMPTZ,                -- 処理完了日時
    last_processed_at TIMESTAMPTZ,           -- 最終処理日時
    retry_count INTEGER DEFAULT 0,           -- リトライ回数
    max_retries INTEGER DEFAULT 3,           -- 最大リトライ回数

    -- Error Handling
    error_message TEXT,                      -- エラーメッセージ
    error_details JSONB,                     -- エラー詳細情報

    -- Scheduling
    scheduled_at TIMESTAMPTZ,                -- 実行予定日時
    execution_frequency TEXT,                -- 'once', 'daily', 'weekly', 'monthly'
    next_execution_at TIMESTAMPTZ,           -- 次回実行予定日時

    -- Metadata
    created_by TEXT,                         -- 作成ユーザー
    metadata JSONB,                          -- 追加メタデータ

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for research_condition_stock
CREATE INDEX idx_research_condition_stock_job_id ON public.research_condition_stock(job_id);
CREATE INDEX idx_research_condition_stock_status ON public.research_condition_stock(status);
CREATE INDEX idx_research_condition_stock_seller ON public.research_condition_stock(target_seller_id);
CREATE INDEX idx_research_condition_stock_scheduled ON public.research_condition_stock(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_research_condition_stock_dates ON public.research_condition_stock(date_start, date_end);
CREATE INDEX idx_research_condition_stock_priority ON public.research_condition_stock(priority DESC, created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_research_condition_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_research_condition_stock_updated_at
    BEFORE UPDATE ON public.research_condition_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_research_condition_stock_updated_at();


-- ============================================================================
-- Table 2: research_batch_results
-- バッチリサーチ結果テーブル
-- eBay Finding APIから取得したSoldデータを保存
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.research_batch_results (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Reference to Condition
    search_id TEXT NOT NULL,                 -- research_condition_stock.search_id への参照
    job_id TEXT NOT NULL,                    -- 親ジョブID

    -- eBay Item Data
    ebay_item_id TEXT NOT NULL,              -- eBay Item ID (UNIQUE制約は複合で)
    title TEXT NOT NULL,                     -- 商品タイトル

    -- Seller Information
    seller_id TEXT NOT NULL,                 -- セラーID
    seller_feedback_score INTEGER,           -- セラーフィードバックスコア
    seller_positive_feedback_percent DECIMAL(5,2), -- セラー評価率

    -- Pricing Information
    current_price_usd DECIMAL(10,2),         -- 現在価格（USD）
    current_price_currency TEXT DEFAULT 'USD', -- 通貨コード
    shipping_cost_usd DECIMAL(10,2),         -- 送料（USD）
    total_price_usd DECIMAL(10,2),           -- 合計金額（USD）

    -- Listing Details
    listing_type TEXT,                       -- 'FixedPrice', 'Auction', 'StoreInventory'
    condition_display_name TEXT,             -- 商品状態（'New', 'Used', etc.）
    condition_id INTEGER,                    -- 商品状態ID

    -- Category
    primary_category_id TEXT,                -- プライマリカテゴリID
    primary_category_name TEXT,              -- プライマリカテゴリ名

    -- Location
    location TEXT,                           -- 商品所在地
    country TEXT,                            -- 国コード
    postal_code TEXT,                        -- 郵便番号

    -- Timing
    listing_start_time TIMESTAMPTZ,          -- 出品開始日時
    listing_end_time TIMESTAMPTZ,            -- 出品終了日時（Sold日時）

    -- Sales Data (Sold Items)
    is_sold BOOLEAN DEFAULT false,           -- 売れたかどうか
    sold_date TIMESTAMPTZ,                   -- 売れた日時

    -- URLs and Images
    view_item_url TEXT,                      -- 商品ページURL
    gallery_url TEXT,                        -- サムネイル画像URL

    -- Additional Data
    returns_accepted BOOLEAN,                -- 返品受付可否
    top_rated_listing BOOLEAN,               -- トップレーテッドリスティングか

    -- Raw API Response
    raw_api_data JSONB,                      -- 生のAPIレスポンス（完全なデータ保存用）

    -- Metadata
    search_keyword TEXT,                     -- 検索時に使用されたキーワード
    date_range_start DATE,                   -- このレコードが属する検索期間の開始日
    date_range_end DATE,                     -- このレコードが属する検索期間の終了日

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Uniqueness constraint
    CONSTRAINT unique_ebay_item_search UNIQUE(ebay_item_id, search_id)
);

-- Indexes for research_batch_results
CREATE INDEX idx_research_batch_results_search_id ON public.research_batch_results(search_id);
CREATE INDEX idx_research_batch_results_job_id ON public.research_batch_results(job_id);
CREATE INDEX idx_research_batch_results_ebay_item_id ON public.research_batch_results(ebay_item_id);
CREATE INDEX idx_research_batch_results_seller_id ON public.research_batch_results(seller_id);
CREATE INDEX idx_research_batch_results_sold_date ON public.research_batch_results(sold_date);
CREATE INDEX idx_research_batch_results_date_range ON public.research_batch_results(date_range_start, date_range_end);
CREATE INDEX idx_research_batch_results_price ON public.research_batch_results(total_price_usd);
CREATE INDEX idx_research_batch_results_category ON public.research_batch_results(primary_category_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_research_batch_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_research_batch_results_updated_at
    BEFORE UPDATE ON public.research_batch_results
    FOR EACH ROW
    EXECUTE FUNCTION update_research_batch_results_updated_at();


-- ============================================================================
-- Table 3: research_batch_jobs
-- バッチジョブ管理テーブル
-- 複数の検索条件をグループ化し、ジョブ全体の進捗を管理
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.research_batch_jobs (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE,             -- ジョブの一意なID

    -- Job Configuration
    job_name TEXT NOT NULL,                  -- ジョブ名（ユーザーが指定）
    description TEXT,                        -- ジョブの説明

    -- Target Configuration
    target_seller_ids TEXT[] NOT NULL,       -- ターゲットセラーIDリスト
    keywords TEXT[],                         -- キーワードリスト（任意）

    -- Date Range (Original)
    original_date_start DATE NOT NULL,       -- 元の開始日
    original_date_end DATE NOT NULL,         -- 元の終了日

    -- Split Configuration
    split_unit TEXT NOT NULL DEFAULT 'week', -- 'day' or 'week'
    total_tasks INTEGER,                     -- 生成されたタスク総数

    -- Status Summary
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed', 'paused'
    tasks_pending INTEGER DEFAULT 0,         -- Pending状態のタスク数
    tasks_processing INTEGER DEFAULT 0,      -- Processing状態のタスク数
    tasks_completed INTEGER DEFAULT 0,       -- Completed状態のタスク数
    tasks_failed INTEGER DEFAULT 0,          -- Failed状態のタスク数

    -- Results Summary
    total_items_found INTEGER DEFAULT 0,     -- 見つかった総アイテム数
    total_items_saved INTEGER DEFAULT 0,     -- 保存された総アイテム数

    -- Execution Tracking
    started_at TIMESTAMPTZ,                  -- ジョブ開始日時
    completed_at TIMESTAMPTZ,                -- ジョブ完了日時
    estimated_completion_at TIMESTAMPTZ,     -- 完了予定日時

    -- Scheduling
    execution_frequency TEXT,                -- 'once', 'daily', 'weekly', 'monthly'
    next_execution_at TIMESTAMPTZ,           -- 次回実行予定日時
    is_recurring BOOLEAN DEFAULT false,      -- 定期実行かどうか

    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0, -- 進捗率

    -- Metadata
    created_by TEXT,                         -- 作成ユーザー
    metadata JSONB,                          -- 追加メタデータ

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for research_batch_jobs
CREATE INDEX idx_research_batch_jobs_status ON public.research_batch_jobs(status);
CREATE INDEX idx_research_batch_jobs_created_by ON public.research_batch_jobs(created_by);
CREATE INDEX idx_research_batch_jobs_next_execution ON public.research_batch_jobs(next_execution_at) WHERE is_recurring = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_research_batch_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_research_batch_jobs_updated_at
    BEFORE UPDATE ON public.research_batch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_research_batch_jobs_updated_at();


-- ============================================================================
-- Row Level Security (RLS) Policies
-- Supabaseのセキュリティポリシー設定
-- ============================================================================

-- Enable RLS
ALTER TABLE public.research_condition_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_batch_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_batch_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for research_condition_stock
CREATE POLICY "Allow all operations for authenticated users" ON public.research_condition_stock
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for research_batch_results
CREATE POLICY "Allow all operations for authenticated users" ON public.research_batch_results
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for research_batch_jobs
CREATE POLICY "Allow all operations for authenticated users" ON public.research_batch_jobs
    FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================================
-- Helper Functions
-- バッチ処理を支援するヘルパー関数
-- ============================================================================

-- Function: ジョブの進捗を更新
CREATE OR REPLACE FUNCTION update_job_progress(p_job_id TEXT)
RETURNS void AS $$
DECLARE
    v_total INTEGER;
    v_pending INTEGER;
    v_processing INTEGER;
    v_completed INTEGER;
    v_failed INTEGER;
    v_progress DECIMAL(5,2);
BEGIN
    -- Count tasks by status
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'processing'),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'failed')
    INTO v_total, v_pending, v_processing, v_completed, v_failed
    FROM public.research_condition_stock
    WHERE job_id = p_job_id;

    -- Calculate progress
    IF v_total > 0 THEN
        v_progress := (v_completed::DECIMAL / v_total::DECIMAL) * 100;
    ELSE
        v_progress := 0;
    END IF;

    -- Update job
    UPDATE public.research_batch_jobs
    SET
        total_tasks = v_total,
        tasks_pending = v_pending,
        tasks_processing = v_processing,
        tasks_completed = v_completed,
        tasks_failed = v_failed,
        progress_percentage = v_progress,
        status = CASE
            WHEN v_completed = v_total THEN 'completed'
            WHEN v_processing > 0 OR v_completed > 0 THEN 'running'
            WHEN v_failed = v_total THEN 'failed'
            ELSE 'pending'
        END,
        completed_at = CASE
            WHEN v_completed = v_total THEN NOW()
            ELSE completed_at
        END
    WHERE job_id = p_job_id;
END;
$$ LANGUAGE plpgsql;


-- Function: 次のタスクを取得（優先度順）
CREATE OR REPLACE FUNCTION get_next_pending_task()
RETURNS TABLE (
    id BIGINT,
    search_id TEXT,
    target_seller_id TEXT,
    keyword TEXT,
    date_start DATE,
    date_end DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rcs.id,
        rcs.search_id,
        rcs.target_seller_id,
        rcs.keyword,
        rcs.date_start,
        rcs.date_end
    FROM public.research_condition_stock rcs
    WHERE rcs.status = 'pending'
        AND (rcs.scheduled_at IS NULL OR rcs.scheduled_at <= NOW())
    ORDER BY rcs.priority DESC, rcs.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO public.research_batch_jobs (
    job_id, job_name, description,
    target_seller_ids, keywords,
    original_date_start, original_date_end,
    split_unit, created_by
) VALUES (
    'job_test_001',
    'Test Seller Research - Q3 2025',
    'Testing batch research for Japanese sellers',
    ARRAY['jpn_seller_001', 'jpn_seller_002'],
    ARRAY['Figure', 'Anime'],
    '2025-08-01',
    '2025-10-31',
    'week',
    'test_user'
);
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON TABLE public.research_condition_stock IS 'eBay大規模リサーチの検索条件を日付分割して管理するテーブル';
COMMENT ON TABLE public.research_batch_results IS 'eBay Finding APIから取得したSoldデータを保存するテーブル';
COMMENT ON TABLE public.research_batch_jobs IS 'バッチジョブ全体の進捗と設定を管理するテーブル';
