-- USA DDP配送コストマトリックステーブル
-- 画像のマトリックスを正確に再現

-- マトリックステーブル作成
CREATE TABLE IF NOT EXISTS usa_ddp_rates (
  id BIGSERIAL PRIMARY KEY,
  
  -- 重量帯
  weight_min_kg DECIMAL(5,3) NOT NULL,
  weight_max_kg DECIMAL(5,3) NOT NULL,
  weight_band_name VARCHAR(50),  -- 例: "0.0-0.5kg"
  
  -- 商品価格（横軸）
  product_price_usd INTEGER NOT NULL,
  
  -- 料金詳細
  base_shipping_usd DECIMAL(10,2) NOT NULL,  -- 実送料（固定、重量帯ごと）
  ddp_fee_usd DECIMAL(10,2) NOT NULL,        -- DDP手数料（商品価格で変動）
  total_shipping_usd DECIMAL(10,2) NOT NULL, -- 顧客表示送料
  
  -- メタデータ
  effective_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ユニーク制約: 重量帯×商品価格の組み合わせは一意
  UNIQUE(weight_min_kg, weight_max_kg, product_price_usd)
);

-- インデックス作成
CREATE INDEX idx_usa_ddp_weight ON usa_ddp_rates(weight_min_kg, weight_max_kg);
CREATE INDEX idx_usa_ddp_price ON usa_ddp_rates(product_price_usd);
CREATE INDEX idx_usa_ddp_lookup ON usa_ddp_rates(weight_min_kg, weight_max_kg, product_price_usd);

-- コメント
COMMENT ON TABLE usa_ddp_rates IS 'USA DDP配送コストマトリックス（重量×商品価格）';
COMMENT ON COLUMN usa_ddp_rates.base_shipping_usd IS '実送料（重量帯で固定）';
COMMENT ON COLUMN usa_ddp_rates.ddp_fee_usd IS 'DDP手数料（関税+税金、商品価格で変動）';
COMMENT ON COLUMN usa_ddp_rates.total_shipping_usd IS '顧客表示送料（実送料+DDP）';

-- =====================================================
-- サンプルデータ挿入（画像から転記）
-- =====================================================

-- 0.0-0.5kg の重量帯
INSERT INTO usa_ddp_rates (weight_min_kg, weight_max_kg, weight_band_name, product_price_usd, base_shipping_usd, ddp_fee_usd, total_shipping_usd) VALUES
(0.000, 0.500, '0.0-0.5kg', 50, 20.00, 7, 27.25),
(0.000, 0.500, '0.0-0.5kg', 100, 20.00, 15, 34.50),
(0.000, 0.500, '0.0-0.5kg', 150, 20.00, 22, 41.75),
(0.000, 0.500, '0.0-0.5kg', 200, 20.00, 29, 49.00),
(0.000, 0.500, '0.0-0.5kg', 250, 20.00, 36, 56.25),
(0.000, 0.500, '0.0-0.5kg', 300, 20.00, 44, 63.50),
(0.000, 0.500, '0.0-0.5kg', 350, 20.00, 51, 70.75),
(0.000, 0.500, '0.0-0.5kg', 400, 20.00, 58, 78.00),
(0.000, 0.500, '0.0-0.5kg', 450, 20.00, 65, 85.25),
(0.000, 0.500, '0.0-0.5kg', 500, 20.00, 73, 92.50),
(0.000, 0.500, '0.0-0.5kg', 600, 20.00, 87, 107.00),
(0.000, 0.500, '0.0-0.5kg', 700, 20.00, 102, 121.50),
(0.000, 0.500, '0.0-0.5kg', 800, 20.00, 116, 136.00),
(0.000, 0.500, '0.0-0.5kg', 900, 20.00, 131, 150.50);

-- =====================================================
-- データ挿入用ヘルパー関数
-- =====================================================

CREATE OR REPLACE FUNCTION generate_usa_ddp_matrix()
RETURNS void AS $$
DECLARE
  weight_bands RECORD;
  price_point INTEGER;
  base_rate DECIMAL(10,2);
  ddp_rate DECIMAL(5,4) := 0.145;  -- 14.5% (関税6.5% + 税金8%)
  ddp_fee DECIMAL(10,2);
  total DECIMAL(10,2);
BEGIN
  -- 重量帯ループ（サンプル: 最初の10個）
  FOR weight_bands IN 
    SELECT * FROM (VALUES
      (0.000, 0.500, '0.0-0.5kg', 20.00),
      (0.500, 0.750, '0.5-0.75kg', 22.00),
      (0.750, 1.000, '0.75-1.0kg', 24.00),
      (1.000, 1.250, '1.0-1.25kg', 26.00),
      (1.250, 1.500, '1.25-1.5kg', 28.00),
      (1.500, 1.750, '1.5-1.75kg', 30.00),
      (1.750, 2.000, '1.75-2.0kg', 32.00),
      (2.000, 2.500, '2.0-2.5kg', 35.00),
      (2.500, 3.000, '2.5-3.0kg', 38.00),
      (3.000, 3.500, '3.0-3.5kg', 42.00)
    ) AS t(min_kg, max_kg, name, base_shipping)
  LOOP
    base_rate := weight_bands.base_shipping;
    
    -- 商品価格ループ
    FOREACH price_point IN ARRAY ARRAY[50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900]
    LOOP
      -- DDP手数料計算: (商品価格 + 実送料) × 14.5%
      ddp_fee := (price_point + base_rate) * ddp_rate;
      total := base_rate + ddp_fee;
      
      -- データ挿入
      INSERT INTO usa_ddp_rates (
        weight_min_kg,
        weight_max_kg,
        weight_band_name,
        product_price_usd,
        base_shipping_usd,
        ddp_fee_usd,
        total_shipping_usd
      ) VALUES (
        weight_bands.min_kg,
        weight_bands.max_kg,
        weight_bands.name,
        price_point,
        base_rate,
        ROUND(ddp_fee, 2),
        ROUND(total, 2)
      )
      ON CONFLICT (weight_min_kg, weight_max_kg, product_price_usd) DO UPDATE SET
        base_shipping_usd = EXCLUDED.base_shipping_usd,
        ddp_fee_usd = EXCLUDED.ddp_fee_usd,
        total_shipping_usd = EXCLUDED.total_shipping_usd,
        updated_at = NOW();
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 関数実行（データ生成）
SELECT generate_usa_ddp_matrix();
