-- ファイル: /database/migrations/010_create_finance_strategy.sql

-- AIによる金融戦略とポートフォリオの管理テーブル
CREATE TABLE IF NOT EXISTS finance_strategy_master (
    id SERIAL PRIMARY KEY,
    strategy_name TEXT NOT NULL,                  -- 例: 'Hedge_USD_JPY', 'Stock_Momentum_JPN'
    target_asset TEXT NOT NULL,                   -- 例: 'USD/JPY', 'AAPL', 'VTI'

    -- 戦略パラメータ
    risk_level TEXT DEFAULT 'medium',             -- 'low', 'medium', 'high'
    capital_allocation NUMERIC DEFAULT 0.00,      -- 資本配分割合（%）

    -- 現在のポートフォリオと実績
    current_position NUMERIC DEFAULT 0.00,        -- 現在の保有量/為替ポジション
    average_entry_price NUMERIC,                  -- 平均取得価格
    pnl_realized NUMERIC DEFAULT 0.00,            -- 実現損益

    -- AI分析結果
    ai_recommendation TEXT,                       -- AIの最新の取引判断（例: 'BUY', 'SELL', 'HOLD'）
    last_executed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
