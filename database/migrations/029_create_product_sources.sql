-- ====================================================================
-- 複数仕入れ元管理テーブル（ルール9）
-- ====================================================================

CREATE TABLE IF NOT EXISTS product_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_item_id TEXT,
  cost_jpy NUMERIC(10,2) NOT NULL,
  shipping_cost_jpy NUMERIC(10,2) DEFAULT 0,
  total_cost_jpy NUMERIC(10,2),
  priority INTEGER NOT NULL DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  stock_quantity INTEGER,
  auto_check_enabled BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMP,
  check_frequency_hours INTEGER DEFAULT 24,
  status TEXT DEFAULT 'active',
  status_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_sources_product_id ON product_sources(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sources_priority ON product_sources(product_id, priority);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sources_unique_priority ON product_sources(product_id, priority);

CREATE TABLE IF NOT EXISTS source_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products_master(id),
  old_source_id UUID REFERENCES product_sources(id),
  new_source_id UUID REFERENCES product_sources(id),
  old_source_name TEXT,
  new_source_name TEXT,
  old_cost_jpy NUMERIC(10,2),
  new_cost_jpy NUMERIC(10,2),
  change_reason TEXT,
  change_type TEXT DEFAULT 'auto',
  ebay_price_before NUMERIC(10,2),
  ebay_price_after NUMERIC(10,2),
  price_changed BOOLEAN DEFAULT false,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_change_history_product_id ON source_change_history(product_id);
