-- ========================================
-- EU責任者データ管理 マイグレーションスクリプト
-- 実行日: 2025-10-21
-- ========================================

-- 1. EU責任者マスタテーブル作成
CREATE TABLE IF NOT EXISTS public.eu_responsible_persons (
  id BIGSERIAL PRIMARY KEY,
  
  -- マッチング用キー
  manufacturer VARCHAR(255) NOT NULL,           -- 製造者名/ブランド名（マッチングキー）
  brand_aliases TEXT[],                         -- ブランド別名（検索用）
  
  -- eBay API準拠フィールド
  company_name VARCHAR(100) NOT NULL,           -- regulatory.responsiblePersons[].companyName
  address_line1 VARCHAR(180) NOT NULL,          -- regulatory.responsiblePersons[].addressLine1
  address_line2 VARCHAR(180),                   -- regulatory.responsiblePersons[].addressLine2
  city VARCHAR(64) NOT NULL,                    -- regulatory.responsiblePersons[].city
  state_or_province VARCHAR(100),               -- regulatory.responsiblePersons[].stateOrProvince
  postal_code VARCHAR(20) NOT NULL,             -- regulatory.responsiblePersons[].postalCode
  country VARCHAR(2) NOT NULL,                  -- regulatory.responsiblePersons[].country (ISO 3166-1)
  email VARCHAR(250),                           -- regulatory.responsiblePersons[].email
  phone VARCHAR(50),                            -- regulatory.responsiblePersons[].phone
  contact_url VARCHAR(250),                     -- regulatory.responsiblePersons[].contactUrl
  
  -- メタデータ
  country_of_origin VARCHAR(100),               -- 製造国（参考情報）
  notes TEXT,                                   -- 備考
  is_active BOOLEAN DEFAULT true,               -- 有効フラグ
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 製造者名でユニーク制約
  UNIQUE(manufacturer)
);

-- 2. 既存productsテーブルにEU責任者フィールド追加
DO $$ 
BEGIN
  -- カラムが存在しない場合のみ追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='eu_responsible_company_name') THEN
    ALTER TABLE public.products 
      ADD COLUMN eu_responsible_company_name VARCHAR(100),
      ADD COLUMN eu_responsible_address_line1 VARCHAR(180),
      ADD COLUMN eu_responsible_address_line2 VARCHAR(180),
      ADD COLUMN eu_responsible_city VARCHAR(64),
      ADD COLUMN eu_responsible_state_or_province VARCHAR(100),
      ADD COLUMN eu_responsible_postal_code VARCHAR(20),
      ADD COLUMN eu_responsible_country VARCHAR(2),
      ADD COLUMN eu_responsible_email VARCHAR(250),
      ADD COLUMN eu_responsible_phone VARCHAR(50),
      ADD COLUMN eu_responsible_contact_url VARCHAR(250);
  END IF;
END $$;

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_eu_responsible_manufacturer 
  ON public.eu_responsible_persons(manufacturer);

CREATE INDEX IF NOT EXISTS idx_eu_responsible_active 
  ON public.eu_responsible_persons(is_active);

CREATE INDEX IF NOT EXISTS idx_eu_responsible_country 
  ON public.eu_responsible_persons(country);

-- ブランド別名検索用GINインデックス
CREATE INDEX IF NOT EXISTS idx_eu_responsible_brand_aliases 
  ON public.eu_responsible_persons USING gin(brand_aliases);

-- 4. RLS (Row Level Security) 有効化
ALTER TABLE public.eu_responsible_persons ENABLE ROW LEVEL SECURITY;

-- 5. RLS ポリシー（全ユーザーが読み書き可能）
DO $$ 
BEGIN
  -- ポリシーが存在しない場合のみ作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'eu_responsible_persons' 
    AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" 
      ON public.eu_responsible_persons 
      FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- 6. 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_eu_responsible_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_eu_responsible_persons_updated_at ON public.eu_responsible_persons;

CREATE TRIGGER update_eu_responsible_persons_updated_at 
  BEFORE UPDATE ON public.eu_responsible_persons
  FOR EACH ROW EXECUTE FUNCTION update_eu_responsible_updated_at();

-- 7. サンプルデータ挿入
INSERT INTO public.eu_responsible_persons (
  manufacturer, 
  brand_aliases,
  company_name, 
  address_line1, 
  city, 
  postal_code, 
  country,
  email,
  country_of_origin
) VALUES
  (
    'Bandai',
    ARRAY['BANDAI', 'バンダイ', 'Bandai Namco'],
    'Bandai Namco Europe S.A.S',
    '49-51 Rue des Docks',
    'Lyon',
    '69258',
    'FR',
    'contact@bandainamcoent.eu',
    'Japan'
  ),
  (
    'LEGO',
    ARRAY['Lego', 'レゴ'],
    'LEGO System A/S',
    'Aastvej 1',
    'Billund',
    '7190',
    'DK',
    'consumer.service@lego.com',
    'Denmark'
  ),
  (
    'Nintendo',
    ARRAY['NINTENDO', '任天堂', 'Nintendo of Europe'],
    'Nintendo of Europe GmbH',
    'Herriotstrasse 4',
    'Frankfurt',
    '60528',
    'DE',
    'service@nintendo.de',
    'Japan'
  ),
  (
    'Sony',
    ARRAY['SONY', 'ソニー', 'Sony Interactive Entertainment'],
    'Sony Europe B.V.',
    'Da Vincilaan 7-D1',
    'Amsterdam',
    '1930 AA',
    'NL',
    'info@sony.eu',
    'Japan'
  ),
  (
    'Hasbro',
    ARRAY['HASBRO', 'ハズブロ'],
    'Hasbro Europe Trading B.V.',
    'Industrialaan 1',
    'Amsterdam',
    '1702 BH',
    'NL',
    'consumercare@hasbro.com',
    'United States'
  )
ON CONFLICT (manufacturer) DO NOTHING;

-- 8. コメント追加
COMMENT ON TABLE public.eu_responsible_persons IS 'EU責任者マスタテーブル（eBay GPSR対応）';
COMMENT ON COLUMN public.eu_responsible_persons.manufacturer IS '製造者名（マッチング用キー）';
COMMENT ON COLUMN public.eu_responsible_persons.brand_aliases IS 'ブランド別名配列（検索用）';
COMMENT ON COLUMN public.eu_responsible_persons.company_name IS 'eBay API: regulatory.responsiblePersons[].companyName';
COMMENT ON COLUMN public.eu_responsible_persons.address_line1 IS 'eBay API: regulatory.responsiblePersons[].addressLine1';
COMMENT ON COLUMN public.eu_responsible_persons.country IS 'eBay API: regulatory.responsiblePersons[].country (ISO 3166-1 2文字)';

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ EU責任者マスタテーブル作成完了！';
  RAISE NOTICE '📊 作成内容:';
  RAISE NOTICE '  - eu_responsible_persons テーブル';
  RAISE NOTICE '  - products テーブルにEU責任者フィールド追加';
  RAISE NOTICE '  - インデックス・トリガー作成';
  RAISE NOTICE '  - サンプルデータ5件挿入';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 eBay GPSR対応準備完了！';
END $$;
