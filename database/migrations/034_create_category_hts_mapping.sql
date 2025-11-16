-- カテゴリ→HTS Chapterマッピングテーブル
-- eBayカテゴリから適切なHTS Chapterを特定

CREATE TABLE IF NOT EXISTS category_hts_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- カテゴリ識別
  ebay_category_id VARCHAR(20),
  category_name TEXT,
  category_keywords TEXT[], -- 検索用キーワード
  
  -- HTS Chapter情報
  hts_chapter_code VARCHAR(2) NOT NULL,
  hts_chapter_name TEXT,
  
  -- 優先度・信頼度
  priority INTEGER DEFAULT 50,
  confidence INTEGER DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  
  -- メタデータ
  notes TEXT,
  examples TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_hts_mapping_category_id 
  ON category_hts_mapping(ebay_category_id);

CREATE INDEX IF NOT EXISTS idx_category_hts_mapping_chapter 
  ON category_hts_mapping(hts_chapter_code);

-- 初期データ投入（主要カテゴリ）
INSERT INTO category_hts_mapping (
  category_name, 
  category_keywords,
  hts_chapter_code, 
  hts_chapter_name,
  priority,
  notes,
  examples
) VALUES
  -- Chapter 90: 光学機器
  (
    'Cameras & Photo',
    ARRAY['camera', 'lens', 'optical', 'photographic'],
    '90',
    'Optical, photographic, cinematographic instruments',
    100,
    'カメラ、レンズ、光学機器全般',
    ARRAY['Digital cameras', 'Camera lenses', 'Binoculars', 'Microscopes']
  ),
  
  -- Chapter 85: 電気機器
  (
    'Consumer Electronics',
    ARRAY['electronic', 'electrical', 'console', 'playstation'],
    '85',
    'Electrical machinery and equipment',
    100,
    'ゲーム機、電子機器全般',
    ARRAY['PlayStation', 'Xbox', 'Smartphones', 'Tablets']
  ),
  
  -- Chapter 95: 玩具・ゲーム
  (
    'Toys & Hobbies',
    ARRAY['toy', 'game', 'card', 'trading card', 'collectible'],
    '95',
    'Toys, games and sports requisites',
    100,
    'トレーディングカード、玩具、ゲーム用具',
    ARRAY['Pokemon cards', 'Board games', 'Action figures']
  ),
  
  -- Chapter 88: 航空機・ドローン
  (
    'Cameras & Photo',
    ARRAY['drone', 'quadcopter', 'uav', 'aircraft'],
    '88',
    'Aircraft, spacecraft',
    90,
    'ドローン、無人航空機',
    ARRAY['DJI Mini', 'DJI Mavic', 'Racing drones']
  ),
  
  -- Chapter 84: 機械類
  (
    'Business & Industrial',
    ARRAY['machinery', 'mechanical', 'appliance'],
    '84',
    'Nuclear reactors, boilers, machinery',
    80,
    '機械類、産業用機器',
    ARRAY['3D printers', 'Industrial equipment']
  ),
  
  -- Chapter 62: 衣類
  (
    'Clothing, Shoes & Accessories',
    ARRAY['clothing', 'apparel', 'shirt', 'pants', 'dress'],
    '62',
    'Articles of apparel (not knitted or crocheted)',
    100,
    '衣類全般',
    ARRAY['T-shirts', 'Jackets', 'Dresses']
  ),
  
  -- Chapter 64: 履物
  (
    'Clothing, Shoes & Accessories',
    ARRAY['shoes', 'footwear', 'boots', 'sneakers'],
    '64',
    'Footwear, gaiters and the like',
    100,
    '靴、履物',
    ARRAY['Running shoes', 'Boots', 'Sandals']
  ),
  
  -- Chapter 42: 革製品
  (
    'Clothing, Shoes & Accessories',
    ARRAY['leather', 'bag', 'handbag', 'wallet', 'purse'],
    '42',
    'Articles of leather',
    95,
    'バッグ、財布、革製品',
    ARRAY['Leather bags', 'Wallets', 'Belts']
  ),
  
  -- Chapter 71: 貴金属・宝石
  (
    'Jewelry & Watches',
    ARRAY['jewelry', 'watch', 'necklace', 'ring', 'diamond'],
    '71',
    'Pearls, precious stones, precious metals',
    100,
    '宝石、貴金属、時計',
    ARRAY['Gold rings', 'Diamond necklaces', 'Luxury watches']
  ),
  
  -- Chapter 49: 書籍・印刷物
  (
    'Books, Movies & Music',
    ARRAY['book', 'magazine', 'printed', 'publication'],
    '49',
    'Printed books, newspapers, pictures',
    100,
    '書籍、雑誌、印刷物',
    ARRAY['Books', 'Magazines', 'Posters']
  )
ON CONFLICT DO NOTHING;

-- 完了メッセージ
DO $$ 
BEGIN 
  RAISE NOTICE '✅ カテゴリ→HTS Chapterマッピングテーブル作成完了';
  RAISE NOTICE '📊 10件の主要カテゴリマッピングを投入';
END $$;
