-- カテゴリーベースのHTSマッピング（ドキュメントベース）
CREATE TABLE IF NOT EXISTS hts_category_mapping (
  id BIGSERIAL PRIMARY KEY,
  
  -- カテゴリー情報
  ebay_category TEXT NOT NULL UNIQUE,   -- eBayカテゴリー名
  category_keywords TEXT[],              -- 代替キーワード
  
  -- HTS情報
  hts_number TEXT NOT NULL,              -- 確定HTSコード
  chapter_code TEXT,
  heading_code TEXT,
  
  -- メタ情報
  confidence TEXT DEFAULT 'high',        -- high/medium/low
  notes TEXT,
  classification_logic TEXT,             -- 分類根拠
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_category_mapping_ebay ON hts_category_mapping(ebay_category);
CREATE INDEX IF NOT EXISTS idx_category_mapping_hts ON hts_category_mapping(hts_number);

-- 初期データ（ドキュメントから）
INSERT INTO hts_category_mapping 
(ebay_category, category_keywords, hts_number, chapter_code, heading_code, confidence, classification_logic, notes)
VALUES
  -- トレーディングカード・収集品
  ('CCG Individual Cards', ARRAY['trading card', 'collectible card', 'tcg'], '4911.91', '49', '4911', 'high', 
   '用途優先：紙製印刷物として分類（美術品・骨董品ではない）', 'Pokemon, MTG, Yu-Gi-Oh等のトレーディングカード'),
  
  ('Trading Card Games', ARRAY['trading card games', 'tcg'], '4911.91', '49', '4911', 'high',
   '用途優先：紙製印刷物として分類', 'トレーディングカードゲーム全般'),
  
  ('Collectible Cards', ARRAY['collectible cards'], '4911.91', '49', '4911', 'high',
   '用途優先：収集用カード（印刷物）', '収集用カード全般'),
  
  -- Playing cards（遊戯用）
  ('Playing Cards', ARRAY['playing cards', 'card deck'], '9504.40.00.00', '95', '9504', 'high',
   '用途優先：遊戯用カード', 'トランプなどの遊戯用カード'),
  
  -- 書籍・印刷物
  ('Books', ARRAY['books', 'novels', 'manuals'], '4901.99', '49', '4901', 'high',
   '用途優先：書籍として分類', '書籍全般'),
  
  ('Magazines', ARRAY['magazines', 'periodicals'], '4902.90', '49', '4902', 'high',
   '用途優先：定期刊行物', '雑誌'),
  
  ('Manga', ARRAY['manga', 'comics'], '4901.99', '49', '4901', 'high',
   '用途優先：書籍（漫画）', '漫画単行本'),
  
  -- 記録媒体
  ('CDs', ARRAY['cd', 'compact disc', 'music cd'], '8523.41', '85', '8523', 'high',
   '用途優先：音声記録媒体', '音楽CD'),
  
  ('DVDs & Blu-ray Discs', ARRAY['dvd', 'blu-ray', 'bluray'], '8523.49', '85', '8523', 'high',
   '用途優先：映像記録媒体', 'DVD/Blu-ray'),
  
  ('Video Games', ARRAY['video games', 'game software'], '8523.49', '85', '8523', 'high',
   '用途優先：ゲームソフト（物理メディア）', 'ゲームディスク/カートリッジ'),
  
  -- カメラ・光学機器
  ('Cameras & Photo', ARRAY['cameras', 'digital cameras'], '9006.59', '90', '9006', 'high',
   '用途優先：デジタルカメラ', 'カメラ本体'),
  
  ('Camera Lenses', ARRAY['lenses', 'camera lens'], '9002.11', '90', '9002', 'high',
   '用途優先：カメラレンズ（光学機器）', 'カメラ交換レンズ'),
  
  -- 時計
  ('Watches', ARRAY['watches', 'wristwatches'], '9102.11', '91', '9102', 'high',
   '用途優先：腕時計', '腕時計全般'),
  
  -- 玩具
  ('Toys & Hobbies', ARRAY['toys', 'hobbies'], '9503.00', '95', '9503', 'medium',
   '用途優先：玩具全般', '玩具・ホビー'),
  
  ('Model Kits', ARRAY['model kits', 'plastic models'], '9503.00', '95', '9503', 'high',
   '用途優先：プラモデル（組立キット）', 'プラモデル'),
  
  ('Action Figures', ARRAY['action figures', 'figures'], '9503.00', '95', '9503', 'high',
   '用途優先：アクションフィギュア', 'フィギュア'),
  
  -- スポーツ用品
  ('Fishing', ARRAY['fishing equipment'], '9507.10', '95', '9507', 'high',
   '用途優先：釣具', '釣り竿・リール等'),
  
  ('Golf', ARRAY['golf equipment'], '9506.31', '95', '9506', 'high',
   '用途優先：ゴルフ用品', 'ゴルフクラブ等'),
  
  -- ゲーム機
  ('Video Game Consoles', ARRAY['game consoles', 'gaming systems'], '9504.50.00.00', '95', '9504', 'high',
   '用途優先：ビデオゲーム機本体', 'PS5, Switch等'),
  
  -- 音楽機材
  ('Musical Instruments', ARRAY['musical instruments', 'instruments'], '9207.10', '92', '9207', 'high',
   '用途優先：楽器（電子楽器含む）', '楽器全般'),
  
  -- 靴
  ('Athletic Shoes', ARRAY['sneakers', 'sports shoes'], '6404.11', '64', '6404', 'high',
   '素材優先：紡織製スポーツシューズ', 'スニーカー')
  
ON CONFLICT (ebay_category) 
DO UPDATE SET
  category_keywords = EXCLUDED.category_keywords,
  hts_number = EXCLUDED.hts_number,
  chapter_code = EXCLUDED.chapter_code,
  heading_code = EXCLUDED.heading_code,
  confidence = EXCLUDED.confidence,
  classification_logic = EXCLUDED.classification_logic,
  notes = EXCLUDED.notes,
  updated_at = NOW();

COMMENT ON TABLE hts_category_mapping IS 'eBayカテゴリーからHTSコードを直接マッピング（最優先判定）';
