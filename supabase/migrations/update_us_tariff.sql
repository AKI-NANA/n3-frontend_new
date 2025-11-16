-- USの追加関税率を25%に更新
UPDATE origin_countries
SET 
  total_additional_tariff = 0.25,
  section232_rate = 0.25,
  updated_at = NOW()
WHERE code = 'US';
