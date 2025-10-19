-- ===================================================================
-- Phase 1: データベース構造拡張 - 高度化システム基盤
-- ===================================================================

-- 1. アカウント管理テーブル
CREATE TABLE marketplace_accounts (
    id BIGSERIAL PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    marketplace_type VARCHAR(20) NOT NULL, -- 'ebay', 'yahoo', 'mercari'
    api_credentials JSONB NOT NULL,
    rate_limits JSONB NOT NULL,
    account_status VARCHAR(20) DEFAULT 'active',
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(account_name, marketplace_type)
);

-- アカウントテーブル用インデックス
CREATE INDEX idx_marketplace_accounts_type ON marketplace_accounts(marketplace_type);
CREATE INDEX idx_marketplace_accounts_status ON marketplace_accounts(account_status);
CREATE INDEX idx_marketplace_accounts_last_used ON marketplace_accounts(last_used_at);

-- 2. 高度なスケジュール管理テーブル
CREATE TABLE advanced_listing_schedules (
    id BIGSERIAL PRIMARY KEY,
    schedule_name VARCHAR(255) NOT NULL,
    account_id BIGINT REFERENCES marketplace_accounts(id) ON DELETE CASCADE,
    
    -- ランダム化設定
    randomization_config JSONB NOT NULL,
    
    -- 時間制御
    time_constraints JSONB NOT NULL,
    
    -- 商品選択ルール
    product_selection_rules JSONB NOT NULL,
    
    -- API制御設定
    api_control_settings JSONB NOT NULL,
    
    -- ステータス管理
    is_active BOOLEAN DEFAULT true,
    last_executed_at TIMESTAMP,
    next_scheduled_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- スケジュールテーブル用インデックス
CREATE INDEX idx_advanced_schedules_account ON advanced_listing_schedules(account_id);
CREATE INDEX idx_advanced_schedules_active ON advanced_listing_schedules(is_active);
CREATE INDEX idx_advanced_schedules_next_exec ON advanced_listing_schedules(next_scheduled_at);
CREATE INDEX idx_advanced_schedules_last_exec ON advanced_listing_schedules(last_executed_at);

-- 3. リアルタイム出品状況管理テーブル
CREATE TABLE listing_execution_logs (
    id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT REFERENCES advanced_listing_schedules(id) ON DELETE SET NULL,
    account_id BIGINT REFERENCES marketplace_accounts(id) ON DELETE SET NULL,
    
    -- 実行情報
    execution_id UUID DEFAULT gen_random_uuid(),
    planned_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- 結果情報
    total_planned_items INTEGER DEFAULT 0,
    total_attempted_items INTEGER DEFAULT 0,
    successful_listings INTEGER DEFAULT 0,
    failed_listings INTEGER DEFAULT 0,
    
    -- 詳細データ
    execution_details JSONB,
    error_summary JSONB,
    
    -- ステータス
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 実行ログテーブル用インデックス
CREATE INDEX idx_listing_logs_status ON listing_execution_logs(status);
CREATE INDEX idx_listing_logs_schedule ON listing_execution_logs(schedule_id);
CREATE INDEX idx_listing_logs_account ON listing_execution_logs(account_id);
CREATE INDEX idx_listing_logs_execution_time ON listing_execution_logs(planned_at, started_at);
CREATE INDEX idx_listing_logs_execution_id ON listing_execution_logs(execution_id);

-- 4. 商品出品履歴の詳細管理テーブル
CREATE TABLE product_listing_history (
    id BIGSERIAL PRIMARY KEY,
    execution_log_id BIGINT REFERENCES listing_execution_logs(id) ON DELETE CASCADE,
    product_id BIGINT,
    account_id BIGINT REFERENCES marketplace_accounts(id) ON DELETE SET NULL,
    
    -- 商品情報
    sku VARCHAR(100),
    product_title VARCHAR(255),
    listing_price DECIMAL(10,2),
    
    -- 出品結果
    marketplace_item_id VARCHAR(100),
    listing_url VARCHAR(500),
    listing_status VARCHAR(20), -- success, failed, pending
    
    -- エラー情報
    error_code VARCHAR(50),
    error_message TEXT,
    api_response JSONB,
    
    -- タイミング
    attempted_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 商品履歴テーブル用インデックス
CREATE INDEX idx_product_history_execution ON product_listing_history(execution_log_id);
CREATE INDEX idx_product_history_product ON product_listing_history(product_id);
CREATE INDEX idx_product_history_account ON product_listing_history(account_id);
CREATE INDEX idx_product_history_sku ON product_listing_history(sku);
CREATE INDEX idx_product_history_status ON product_listing_history(listing_status);
CREATE INDEX idx_product_history_attempted ON product_listing_history(attempted_at);

-- ===================================================================
-- サンプルデータ挿入
-- ===================================================================

-- サンプルアカウント
INSERT INTO marketplace_accounts (account_name, marketplace_type, api_credentials, rate_limits) VALUES 
('main_ebay_account', 'ebay', '{
    "app_id": "YOUR_EBAY_APP_ID",
    "dev_id": "YOUR_EBAY_DEV_ID", 
    "cert_id": "YOUR_EBAY_CERT_ID",
    "user_token": "YOUR_EBAY_USER_TOKEN",
    "sandbox": true
}', '{
    "max_listings_per_hour": 100,
    "max_listings_per_day": 500,
    "current_hourly_count": 0,
    "current_daily_count": 0,
    "last_reset_hour": null,
    "last_reset_day": null,
    "safety_margin": 0.8
}'),

('yahoo_auction_account', 'yahoo', '{
    "client_id": "YOUR_YAHOO_CLIENT_ID",
    "client_secret": "YOUR_YAHOO_CLIENT_SECRET",
    "access_token": "YOUR_YAHOO_ACCESS_TOKEN",
    "sandbox": true
}', '{
    "max_listings_per_hour": 50,
    "max_listings_per_day": 200,
    "current_hourly_count": 0,
    "current_daily_count": 0,
    "last_reset_hour": null,
    "last_reset_day": null,
    "safety_margin": 0.9
}'),

('mercari_account', 'mercari', '{
    "api_key": "YOUR_MERCARI_API_KEY",
    "secret_key": "YOUR_MERCARI_SECRET_KEY",
    "sandbox": true
}', '{
    "max_listings_per_hour": 30,
    "max_listings_per_day": 100,
    "current_hourly_count": 0,
    "current_daily_count": 0,
    "last_reset_hour": null,
    "last_reset_day": null,
    "safety_margin": 0.85
}');

-- サンプルスケジュール設定
INSERT INTO advanced_listing_schedules (schedule_name, account_id, randomization_config, time_constraints, product_selection_rules, api_control_settings) VALUES
('超ランダム出品スケジュール - eBay', 1, '{
    "listing_count": {
        "min": 5,
        "max": 25,
        "distribution": "normal",
        "mean": 15,
        "std_dev": 5
    },
    "interval_minutes": {
        "min": 15,
        "max": 240,
        "distribution": "exponential",
        "lambda": 0.02
    },
    "time_variance": {
        "early_start_minutes": 60,
        "late_start_minutes": 180
    },
    "day_of_week_weights": {
        "1": 0.8, "2": 1.2, "3": 1.0, "4": 1.1, "5": 0.9, "6": 0.7, "7": 0.6
    }
}', '{
    "base_schedule": {
        "frequency": "daily",
        "preferred_hours": [9, 10, 11, 19, 20, 21],
        "blackout_hours": [0, 1, 2, 3, 4, 5, 6, 7, 8, 22, 23],
        "timezone": "Asia/Tokyo"
    },
    "special_dates": {
        "boost_dates": ["2025-03-15", "2025-04-01"],
        "skip_dates": ["2025-01-01", "2025-12-25"]
    }
}', '{
    "category_priorities": {
        "trading_cards": 0.4,
        "collectibles": 0.3,
        "toys": 0.2,
        "others": 0.1
    },
    "price_range": {
        "min": 500,
        "max": 50000
    },
    "condition_filter": ["New", "Used"],
    "inventory_threshold": 1,
    "exclude_recently_listed": true,
    "recent_listing_hours": 168
}', '{
    "rate_limiting": {
        "respect_api_limits": true,
        "safety_margin": 0.8,
        "burst_allowance": 5
    },
    "retry_logic": {
        "max_retries": 3,
        "backoff_strategy": "exponential",
        "retry_delays": [30, 60, 120]
    },
    "error_handling": {
        "skip_on_error": true,
        "notify_on_failure": true,
        "max_consecutive_errors": 5
    }
}'),

('平日集中出品 - Yahoo', 2, '{
    "listing_count": {
        "min": 3,
        "max": 15,
        "distribution": "uniform"
    },
    "interval_minutes": {
        "min": 30,
        "max": 120,
        "distribution": "normal",
        "mean": 60,
        "std_dev": 20
    },
    "day_of_week_weights": {
        "1": 1.5, "2": 1.5, "3": 1.5, "4": 1.5, "5": 1.5, "6": 0.3, "7": 0.2
    }
}', '{
    "base_schedule": {
        "frequency": "daily",
        "preferred_hours": [10, 11, 14, 15, 16, 20, 21],
        "blackout_hours": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 22, 23],
        "timezone": "Asia/Tokyo"
    }
}', '{
    "category_priorities": {
        "electronics": 0.5,
        "fashion": 0.3,
        "others": 0.2
    },
    "price_range": {
        "min": 1000,
        "max": 30000
    }
}', '{
    "rate_limiting": {
        "respect_api_limits": true,
        "safety_margin": 0.9
    },
    "retry_logic": {
        "max_retries": 2,
        "backoff_strategy": "linear"
    }
}');

-- ===================================================================
-- ビューとヘルパー関数
-- ===================================================================

-- アカウント使用状況ビュー
CREATE VIEW account_usage_summary AS
SELECT 
    ma.id,
    ma.account_name,
    ma.marketplace_type,
    ma.account_status,
    (ma.rate_limits->>'current_hourly_count')::int as current_hourly,
    (ma.rate_limits->>'max_listings_per_hour')::int as max_hourly,
    (ma.rate_limits->>'current_daily_count')::int as current_daily,
    (ma.rate_limits->>'max_listings_per_day')::int as max_daily,
    ROUND(
        (ma.rate_limits->>'current_hourly_count')::float / 
        NULLIF((ma.rate_limits->>'max_listings_per_hour')::float, 0) * 100, 2
    ) as hourly_usage_percent,
    ma.last_used_at
FROM marketplace_accounts ma;

-- 実行統計ビュー
CREATE VIEW execution_statistics AS
SELECT 
    account_id,
    DATE_TRUNC('day', created_at) as execution_date,
    COUNT(*) as total_executions,
    SUM(successful_listings) as total_successful,
    SUM(failed_listings) as total_failed,
    AVG(successful_listings) as avg_successful_per_execution,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_executions,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions
FROM listing_execution_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY account_id, DATE_TRUNC('day', created_at);

-- API制限更新関数
CREATE OR REPLACE FUNCTION update_rate_limits(
    p_account_id BIGINT,
    p_hourly_increment INT DEFAULT 0,
    p_daily_increment INT DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    current_limits JSONB;
    updated_limits JSONB;
    current_hour TIMESTAMP;
    current_day DATE;
BEGIN
    SELECT rate_limits INTO current_limits 
    FROM marketplace_accounts 
    WHERE id = p_account_id;
    
    current_hour := DATE_TRUNC('hour', NOW());
    current_day := CURRENT_DATE;
    
    -- 時間リセットチェック
    IF (current_limits->>'last_reset_hour')::timestamp != current_hour THEN
        current_limits := jsonb_set(current_limits, '{current_hourly_count}', '0');
        current_limits := jsonb_set(current_limits, '{last_reset_hour}', to_jsonb(current_hour));
    END IF;
    
    -- 日付リセットチェック
    IF (current_limits->>'last_reset_day')::date != current_day THEN
        current_limits := jsonb_set(current_limits, '{current_daily_count}', '0');
        current_limits := jsonb_set(current_limits, '{last_reset_day}', to_jsonb(current_day));
    END IF;
    
    -- カウンター更新
    updated_limits := jsonb_set(
        current_limits, 
        '{current_hourly_count}', 
        ((current_limits->>'current_hourly_count')::int + p_hourly_increment)::text::jsonb
    );
    
    updated_limits := jsonb_set(
        updated_limits, 
        '{current_daily_count}', 
        ((updated_limits->>'current_daily_count')::int + p_daily_increment)::text::jsonb
    );
    
    UPDATE marketplace_accounts 
    SET 
        rate_limits = updated_limits,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- データベース初期化完了確認クエリ
-- ===================================================================

-- テーブル作成確認
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN (
    'marketplace_accounts',
    'advanced_listing_schedules', 
    'listing_execution_logs',
    'product_listing_history'
)
ORDER BY tablename;

-- インデックス作成確認
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'marketplace_accounts',
    'advanced_listing_schedules', 
    'listing_execution_logs',
    'product_listing_history'
)
ORDER BY tablename, indexname;