ALTER TABLE global_pricing_strategy
ADD COLUMN IF NOT EXISTS multi_source_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS seasonal_pricing_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sold_based_pricing_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS watcher_based_pricing_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_swap_enabled BOOLEAN NOT NULL DEFAULT false;
