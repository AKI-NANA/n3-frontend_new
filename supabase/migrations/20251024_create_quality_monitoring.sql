-- Create table for scraping quality monitoring
-- Purpose: Track scraping success rates and detect structure changes

CREATE TABLE IF NOT EXISTS scraping_quality_logs (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL,  -- 'Yahoo Auction', 'PayPay Fleamarket', etc.
  test_url TEXT NOT NULL,

  -- Quality metrics
  quality_score DECIMAL(5,2),  -- 0-100 score based on dataQuality flags
  total_fields INTEGER,  -- Total number of fields attempted
  successful_fields INTEGER,  -- Number of fields successfully extracted
  failed_fields INTEGER,  -- Number of fields that failed

  -- Status
  status TEXT NOT NULL,  -- 'success', 'partial', 'error'
  error_message TEXT,
  warnings TEXT[],  -- Array of warning messages

  -- Raw data quality flags (for debugging)
  data_quality JSONB,  -- Store full dataQuality object

  -- Timestamps
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_quality_logs_platform ON scraping_quality_logs(platform);
CREATE INDEX IF NOT EXISTS idx_quality_logs_checked_at ON scraping_quality_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_logs_quality_score ON scraping_quality_logs(quality_score);
CREATE INDEX IF NOT EXISTS idx_quality_logs_status ON scraping_quality_logs(status);

-- Enable RLS
ALTER TABLE scraping_quality_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all operations for authenticated users" ON scraping_quality_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE scraping_quality_logs IS 'Monitors scraping quality to detect structure changes';
COMMENT ON COLUMN scraping_quality_logs.quality_score IS 'Percentage score (0-100) based on successful field extraction';
COMMENT ON COLUMN scraping_quality_logs.data_quality IS 'Full dataQuality object with individual field flags';

-- Create view for recent quality trends
CREATE OR REPLACE VIEW scraping_quality_summary AS
SELECT
  platform,
  DATE(checked_at) as check_date,
  COUNT(*) as total_checks,
  AVG(quality_score) as avg_quality_score,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
  COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
  MAX(checked_at) as last_checked
FROM scraping_quality_logs
GROUP BY platform, DATE(checked_at)
ORDER BY check_date DESC, platform;

COMMENT ON VIEW scraping_quality_summary IS 'Daily summary of scraping quality by platform';
