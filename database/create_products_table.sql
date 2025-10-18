-- products テーブルの確認と作成スクリプト

-- 既存テーブルの確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- もしテーブルが存在しない場合、または不足しているカラムがある場合は以下を実行

-- products テーブル作成（存在しない場合）
CREATE TABLE IF NOT EXISTS products (
  -- 基本情報
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2),
  quantity INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'New',
  sku TEXT UNIQUE NOT NULL,
  upc TEXT,
  brand TEXT,
  
  -- カテゴリ
  category_id TEXT,
  category_name TEXT,
  
  -- サイズ・重量
  weight_kg NUMERIC(10,3),
  length_cm NUMERIC(10,2),
  width_cm NUMERIC(10,2),
  height_cm NUMERIC(10,2),
  
  -- 計算値
  profit_margin NUMERIC(5,2),
  profit_amount NUMERIC(10,2),
  shipping_cost NUMERIC(10,2),
  
  -- ステータス
  status TEXT DEFAULT 'draft',
  ready_to_list BOOLEAN DEFAULT false,
  
  -- その他
  images JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  shipping_policy_name TEXT,
  html_description TEXT,
  
  -- メタデータ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_ready_to_list ON products(ready_to_list);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
