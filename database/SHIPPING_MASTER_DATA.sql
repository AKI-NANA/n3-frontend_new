-- 除外国マスターデータ
CREATE TABLE IF NOT EXISTS public.excluded_countries_master (
  country_code VARCHAR(2) PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,
  reason VARCHAR(50), -- 'SANCTIONS', 'CONFLICT', 'APO_FPO'
  is_default_excluded BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- デフォルト除外国データ挿入
INSERT INTO public.excluded_countries_master (country_code, country_name, reason, is_default_excluded) VALUES
('KP', 'North Korea', 'SANCTIONS', true),
('SY', 'Syria', 'CONFLICT', true),
('IR', 'Iran', 'SANCTIONS', true),
('CU', 'Cuba', 'SANCTIONS', true),
('SD', 'Sudan', 'SANCTIONS', true),
('SS', 'South Sudan', 'CONFLICT', true),
('AA', 'APO/FPO Americas', 'APO_FPO', true),
('AE', 'APO/FPO Europe', 'APO_FPO', true),
('AP', 'APO/FPO Pacific', 'APO_FPO', true)
ON CONFLICT (country_code) DO NOTHING;

-- 配送地域マスター（eBayの地域分類）
CREATE TABLE IF NOT EXISTS public.shipping_regions (
  id BIGSERIAL PRIMARY KEY,
  region_code VARCHAR(50) NOT NULL, -- 'AFRICA', 'ASIA', 'EUROPE', etc
  region_name VARCHAR(100) NOT NULL,
  parent_region VARCHAR(50), -- NULL or parent region code
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(region_code)
);

-- eBay地域データ挿入
INSERT INTO public.shipping_regions (region_code, region_name, sort_order) VALUES
('DOMESTIC_APO_FPO', 'APO/FPO', 1),
('DOMESTIC_US_PROTECTORATES', 'US Protectorates', 2),
('DOMESTIC_ALASKA_HAWAII', 'Alaska/Hawaii', 3),
('AFRICA', 'Africa', 10),
('ASIA', 'Asia', 11),
('CENTRAL_AMERICA_CARIBBEAN', 'Central America and Caribbean', 12),
('EUROPE', 'Europe', 13),
('MIDDLE_EAST', 'Middle East', 14),
('NORTH_AMERICA', 'North America', 15),
('OCEANIA', 'Oceania', 16),
('SOUTHEAST_ASIA', 'Southeast Asia', 17),
('SOUTH_AMERICA', 'South America', 18),
('PO_BOX', 'PO Box', 19)
ON CONFLICT (region_code) DO NOTHING;

-- 地域-国マッピング
CREATE TABLE IF NOT EXISTS public.region_country_mapping (
  id BIGSERIAL PRIMARY KEY,
  region_code VARCHAR(50) REFERENCES public.shipping_regions(region_code),
  country_code VARCHAR(2) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(region_code, country_code)
);

-- アジア地域の国データ（例）
INSERT INTO public.region_country_mapping (region_code, country_code, country_name) VALUES
('ASIA', 'CN', 'China'),
('ASIA', 'JP', 'Japan'),
('ASIA', 'KR', 'South Korea'),
('ASIA', 'TW', 'Taiwan'),
('ASIA', 'HK', 'Hong Kong'),
('ASIA', 'IN', 'India'),
('ASIA', 'ID', 'Indonesia'),
('ASIA', 'MY', 'Malaysia'),
('ASIA', 'PH', 'Philippines'),
('ASIA', 'SG', 'Singapore'),
('ASIA', 'TH', 'Thailand'),
('ASIA', 'VN', 'Vietnam'),
('ASIA', 'BD', 'Bangladesh'),
('ASIA', 'PK', 'Pakistan'),
('ASIA', 'LK', 'Sri Lanka'),
('ASIA', 'NP', 'Nepal'),
('ASIA', 'MM', 'Myanmar'),
('ASIA', 'KH', 'Cambodia'),
('ASIA', 'LA', 'Laos'),
('ASIA', 'MN', 'Mongolia'),
('ASIA', 'MV', 'Maldives'),
('ASIA', 'BT', 'Bhutan'),
('ASIA', 'BN', 'Brunei'),
('ASIA', 'TL', 'Timor-Leste'),
('ASIA', 'MO', 'Macau'),
('ASIA', 'KZ', 'Kazakhstan'),
('ASIA', 'UZ', 'Uzbekistan'),
('ASIA', 'TM', 'Turkmenistan'),
('ASIA', 'TJ', 'Tajikistan'),
('ASIA', 'KG', 'Kyrgyzstan')
ON CONFLICT (region_code, country_code) DO NOTHING;

-- ヨーロッパ地域
INSERT INTO public.region_country_mapping (region_code, country_code, country_name) VALUES
('EUROPE', 'GB', 'United Kingdom'),
('EUROPE', 'DE', 'Germany'),
('EUROPE', 'FR', 'France'),
('EUROPE', 'IT', 'Italy'),
('EUROPE', 'ES', 'Spain'),
('EUROPE', 'NL', 'Netherlands'),
('EUROPE', 'BE', 'Belgium'),
('EUROPE', 'CH', 'Switzerland'),
('EUROPE', 'AT', 'Austria'),
('EUROPE', 'SE', 'Sweden'),
('EUROPE', 'NO', 'Norway'),
('EUROPE', 'DK', 'Denmark'),
('EUROPE', 'FI', 'Finland'),
('EUROPE', 'PL', 'Poland'),
('EUROPE', 'CZ', 'Czech Republic'),
('EUROPE', 'HU', 'Hungary'),
('EUROPE', 'RO', 'Romania'),
('EUROPE', 'BG', 'Bulgaria'),
('EUROPE', 'GR', 'Greece'),
('EUROPE', 'PT', 'Portugal'),
('EUROPE', 'IE', 'Ireland'),
('EUROPE', 'HR', 'Croatia'),
('EUROPE', 'SK', 'Slovakia'),
('EUROPE', 'SI', 'Slovenia'),
('EUROPE', 'LT', 'Lithuania'),
('EUROPE', 'LV', 'Latvia'),
('EUROPE', 'EE', 'Estonia'),
('EUROPE', 'LU', 'Luxembourg'),
('EUROPE', 'MT', 'Malta'),
('EUROPE', 'CY', 'Cyprus'),
('EUROPE', 'IS', 'Iceland'),
('EUROPE', 'RS', 'Serbia'),
('EUROPE', 'UA', 'Ukraine'),
('EUROPE', 'BY', 'Belarus'),
('EUROPE', 'MD', 'Moldova'),
('EUROPE', 'AL', 'Albania'),
('EUROPE', 'MK', 'North Macedonia')
ON CONFLICT (region_code, country_code) DO NOTHING;

-- 北米
INSERT INTO public.region_country_mapping (region_code, country_code, country_name) VALUES
('NORTH_AMERICA', 'US', 'United States'),
('NORTH_AMERICA', 'CA', 'Canada'),
('NORTH_AMERICA', 'MX', 'Mexico')
ON CONFLICT (region_code, country_code) DO NOTHING;

-- オセアニア
INSERT INTO public.region_country_mapping (region_code, country_code, country_name) VALUES
('OCEANIA', 'AU', 'Australia'),
('OCEANIA', 'NZ', 'New Zealand'),
('OCEANIA', 'FJ', 'Fiji'),
('OCEANIA', 'PG', 'Papua New Guinea'),
('OCEANIA', 'NC', 'New Caledonia'),
('OCEANIA', 'PF', 'French Polynesia'),
('OCEANIA', 'GU', 'Guam'),
('OCEANIA', 'WS', 'Samoa'),
('OCEANIA', 'TO', 'Tonga'),
('OCEANIA', 'VU', 'Vanuatu'),
('OCEANIA', 'SB', 'Solomon Islands'),
('OCEANIA', 'KI', 'Kiribati'),
('OCEANIA', 'FM', 'Micronesia'),
('OCEANIA', 'MH', 'Marshall Islands'),
('OCEANIA', 'PW', 'Palau'),
('OCEANIA', 'NR', 'Nauru'),
('OCEANIA', 'TV', 'Tuvalu'),
('OCEANIA', 'CK', 'Cook Islands'),
('OCEANIA', 'NU', 'Niue')
ON CONFLICT (region_code, country_code) DO NOTHING;

-- 中東
INSERT INTO public.region_country_mapping (region_code, country_code, country_name) VALUES
('MIDDLE_EAST', 'SA', 'Saudi Arabia'),
('MIDDLE_EAST', 'AE', 'United Arab Emirates'),
('MIDDLE_EAST', 'QA', 'Qatar'),
('MIDDLE_EAST', 'KW', 'Kuwait'),
('MIDDLE_EAST', 'OM', 'Oman'),
('MIDDLE_EAST', 'BH', 'Bahrain'),
('MIDDLE_EAST', 'IL', 'Israel'),
('MIDDLE_EAST', 'JO', 'Jordan'),
('MIDDLE_EAST', 'LB', 'Lebanon'),
('MIDDLE_EAST', 'IQ', 'Iraq')
ON CONFLICT (region_code, country_code) DO NOTHING;

-- アフリカ（一部）
INSERT INTO public.region_country_mapping (region_code, country_code, country_name) VALUES
('AFRICA', 'ZA', 'South Africa'),
('AFRICA', 'EG', 'Egypt'),
('AFRICA', 'NG', 'Nigeria'),
('AFRICA', 'KE', 'Kenya'),
('AFRICA', 'MA', 'Morocco'),
('AFRICA', 'TN', 'Tunisia'),
('AFRICA', 'GH', 'Ghana'),
('AFRICA', 'ET', 'Ethiopia'),
('AFRICA', 'TZ', 'Tanzania'),
('AFRICA', 'UG', 'Uganda'),
('AFRICA', 'DZ', 'Algeria'),
('AFRICA', 'AO', 'Angola'),
('AFRICA', 'SN', 'Senegal'),
('AFRICA', 'CI', 'Ivory Coast'),
('AFRICA', 'CM', 'Cameroon')
ON CONFLICT (region_code, country_code) DO NOTHING;

-- 南米
INSERT INTO public.region_country_mapping (region_code, country_code, country_name) VALUES
('SOUTH_AMERICA', 'BR', 'Brazil'),
('SOUTH_AMERICA', 'AR', 'Argentina'),
('SOUTH_AMERICA', 'CL', 'Chile'),
('SOUTH_AMERICA', 'CO', 'Colombia'),
('SOUTH_AMERICA', 'PE', 'Peru'),
('SOUTH_AMERICA', 'VE', 'Venezuela'),
('SOUTH_AMERICA', 'EC', 'Ecuador'),
('SOUTH_AMERICA', 'BO', 'Bolivia'),
('SOUTH_AMERICA', 'PY', 'Paraguay'),
('SOUTH_AMERICA', 'UY', 'Uruguay'),
('SOUTH_AMERICA', 'GY', 'Guyana'),
('SOUTH_AMERICA', 'SR', 'Suriname'),
('SOUTH_AMERICA', 'GF', 'French Guiana')
ON CONFLICT (region_code, country_code) DO NOTHING;

-- 中米・カリブ
INSERT INTO public.region_country_mapping (region_code, country_code, country_name) VALUES
('CENTRAL_AMERICA_CARIBBEAN', 'CR', 'Costa Rica'),
('CENTRAL_AMERICA_CARIBBEAN', 'PA', 'Panama'),
('CENTRAL_AMERICA_CARIBBEAN', 'GT', 'Guatemala'),
('CENTRAL_AMERICA_CARIBBEAN', 'HN', 'Honduras'),
('CENTRAL_AMERICA_CARIBBEAN', 'SV', 'El Salvador'),
('CENTRAL_AMERICA_CARIBBEAN', 'NI', 'Nicaragua'),
('CENTRAL_AMERICA_CARIBBEAN', 'BZ', 'Belize'),
('CENTRAL_AMERICA_CARIBBEAN', 'JM', 'Jamaica'),
('CENTRAL_AMERICA_CARIBBEAN', 'TT', 'Trinidad and Tobago'),
('CENTRAL_AMERICA_CARIBBEAN', 'BS', 'Bahamas'),
('CENTRAL_AMERICA_CARIBBEAN', 'BB', 'Barbados'),
('CENTRAL_AMERICA_CARIBBEAN', 'DO', 'Dominican Republic'),
('CENTRAL_AMERICA_CARIBBEAN', 'PR', 'Puerto Rico')
ON CONFLICT (region_code, country_code) DO NOTHING;

-- RLS
ALTER TABLE public.excluded_countries_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_country_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON public.excluded_countries_master FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.shipping_regions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.region_country_mapping FOR ALL USING (true) WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_region_mapping_region ON public.region_country_mapping(region_code);
CREATE INDEX IF NOT EXISTS idx_region_mapping_country ON public.region_country_mapping(country_code);
