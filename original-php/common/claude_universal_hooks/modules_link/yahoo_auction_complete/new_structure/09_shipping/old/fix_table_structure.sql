-- real_shipping_rates テーブルにカラム追加
-- destination_country と zone_code が存在しない場合に追加

\echo '=== テーブル構造確認・修正開始 ==='

-- destination_country カラム追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'real_shipping_rates' 
        AND column_name = 'destination_country'
    ) THEN
        ALTER TABLE real_shipping_rates 
        ADD COLUMN destination_country VARCHAR(5) DEFAULT 'US';
        
        RAISE NOTICE '✅ destination_country カラムを追加しました';
    ELSE
        RAISE NOTICE 'ℹ️ destination_country カラムは既に存在します';
    END IF;
END $$;

-- zone_code カラム追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'real_shipping_rates' 
        AND column_name = 'zone_code'
    ) THEN
        ALTER TABLE real_shipping_rates 
        ADD COLUMN zone_code VARCHAR(10) DEFAULT 'zone1';
        
        RAISE NOTICE '✅ zone_code カラムを追加しました';
    ELSE
        RAISE NOTICE 'ℹ️ zone_code カラムは既に存在します';
    END IF;
END $$;

-- has_tracking カラム追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'real_shipping_rates' 
        AND column_name = 'has_tracking'
    ) THEN
        ALTER TABLE real_shipping_rates 
        ADD COLUMN has_tracking BOOLEAN DEFAULT true;
        
        RAISE NOTICE '✅ has_tracking カラムを追加しました';
    ELSE
        RAISE NOTICE 'ℹ️ has_tracking カラムは既に存在します';
    END IF;
END $$;

-- has_insurance カラム追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'real_shipping_rates' 
        AND column_name = 'has_insurance'
    ) THEN
        ALTER TABLE real_shipping_rates 
        ADD COLUMN has_insurance BOOLEAN DEFAULT true;
        
        RAISE NOTICE '✅ has_insurance カラムを追加しました';
    ELSE
        RAISE NOTICE 'ℹ️ has_insurance カラムは既に存在します';
    END IF;
END $$;

-- 既存データにデフォルト値を設定
UPDATE real_shipping_rates 
SET destination_country = 'US',
    zone_code = CASE 
        WHEN carrier_code = 'JPPOST' THEN 'zone4'
        ELSE 'zone1'
    END,
    has_tracking = true,
    has_insurance = CASE 
        WHEN carrier_code = 'JPPOST' THEN true
        ELSE true
    END
WHERE destination_country IS NULL 
   OR zone_code IS NULL 
   OR has_tracking IS NULL 
   OR has_insurance IS NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_real_shipping_destination_zone 
ON real_shipping_rates(destination_country, zone_code);

CREATE INDEX IF NOT EXISTS idx_real_shipping_carrier_service_weight 
ON real_shipping_rates(carrier_code, service_code, weight_from_g, weight_to_g);

\echo '=== テーブル構造修正完了 ==='