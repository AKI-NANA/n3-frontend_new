-- US（アメリカ）の追加関税データを挿入
INSERT INTO country_additional_tariffs (
  country_code,
  tariff_type,
  additional_rate,
  applies_to_all,
  description,
  is_active
) VALUES (
  'US',
  'TRUMP_2025',
  0.25,  -- 25%
  true,
  'アメリカ 25% - トランプ相互関税',
  true
)
ON CONFLICT (country_code, tariff_type) 
DO UPDATE SET
  additional_rate = 0.25,
  description = 'アメリカ 25% - トランプ相互関税',
  is_active = true;
