-- Create table for scheduled scraping jobs
CREATE TABLE IF NOT EXISTS scraping_schedules (
  id BIGSERIAL PRIMARY KEY,
  urls TEXT[] NOT NULL,
  platforms TEXT[],
  scheduled_at TIMESTAMPTZ NOT NULL,
  repeat_pattern TEXT,  -- 'daily', 'weekly', 'monthly', NULL for one-time
  status TEXT DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  results JSONB,  -- Store last execution results
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scraping_schedules_scheduled_at ON scraping_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scraping_schedules_status ON scraping_schedules(status);
CREATE INDEX IF NOT EXISTS idx_scraping_schedules_next_run_at ON scraping_schedules(next_run_at);

-- Enable RLS
ALTER TABLE scraping_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all operations for authenticated users" ON scraping_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE scraping_schedules IS 'Scheduled scraping jobs for batch and timed execution';
COMMENT ON COLUMN scraping_schedules.urls IS 'Array of URLs to scrape';
COMMENT ON COLUMN scraping_schedules.platforms IS 'Array of platform IDs to scrape';
COMMENT ON COLUMN scraping_schedules.repeat_pattern IS 'Repeat pattern: daily, weekly, monthly, or NULL for one-time';
COMMENT ON COLUMN scraping_schedules.status IS 'Current status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN scraping_schedules.results IS 'JSON results from last execution';

-- Create function to update next_run_at based on repeat_pattern
CREATE OR REPLACE FUNCTION update_next_run_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.repeat_pattern IS NOT NULL AND NEW.status = 'completed' THEN
    CASE NEW.repeat_pattern
      WHEN 'daily' THEN
        NEW.next_run_at := NEW.last_run_at + INTERVAL '1 day';
      WHEN 'weekly' THEN
        NEW.next_run_at := NEW.last_run_at + INTERVAL '1 week';
      WHEN 'monthly' THEN
        NEW.next_run_at := NEW.last_run_at + INTERVAL '1 month';
      ELSE
        NEW.next_run_at := NULL;
    END CASE;
    NEW.status := 'pending';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_next_run_at ON scraping_schedules;
CREATE TRIGGER trigger_update_next_run_at
  BEFORE UPDATE ON scraping_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_next_run_at();
