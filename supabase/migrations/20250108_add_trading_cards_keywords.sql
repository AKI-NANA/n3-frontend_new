-- トレーディングカードの正しいHTSコード設定
-- Chapter 95, Heading 9504: Articles for games

INSERT INTO hts_keyword_mapping 
(keyword, keyword_type, hts_number, chapter_code, heading_code, subheading_code, confidence_score, priority, notes)
VALUES
  -- Playing cards / Trading cards
  ('card', 'product', '9504.90.60.00', '95', '9504', '950490', 0.70, 5, 'Generic card products'),
  ('playing card', 'product', '9504.90.60.00', '95', '9504', '950490', 0.90, 10, 'Playing cards'),
  ('trading card', 'product', '9504.90.60.00', '95', '9504', '950490', 0.92, 11, 'Trading cards'),
  ('collectible card', 'product', '9504.90.60.00', '95', '9504', '950490', 0.92, 11, 'Collectible cards'),
  
  -- Brands
  ('pokemon', 'brand', '9504.90.60.00', '95', '9504', '950490', 0.90, 10, 'Pokemon trading cards'),
  ('pokemon card', 'product', '9504.90.60.00', '95', '9504', '950490', 0.95, 12, 'Pokemon cards (exact match)'),
  ('gengar', 'product', '9504.90.60.00', '95', '9504', '950490', 0.88, 9, 'Pokemon Gengar card'),
  ('magic gathering', 'brand', '9504.90.60.00', '95', '9504', '950490', 0.90, 10, 'Magic: The Gathering'),
  ('mtg', 'brand', '9504.90.60.00', '95', '9504', '950490', 0.88, 9, 'MTG cards'),
  ('yugioh', 'brand', '9504.90.60.00', '95', '9504', '950490', 0.90, 10, 'Yu-Gi-Oh! cards'),
  ('yu-gi-oh', 'brand', '9504.90.60.00', '95', '9504', '950490', 0.90, 10, 'Yu-Gi-Oh! cards'),
  
  -- Categories
  ('ccg', 'category', '9504.90.60.00', '95', '9504', '950490', 0.85, 8, 'Collectible Card Game'),
  ('individual cards', 'category', '9504.90.60.00', '95', '9504', '950490', 0.85, 8, 'Individual cards'),
  ('sports trading', 'category', '9504.90.60.00', '95', '9504', '950490', 0.85, 8, 'Sports trading cards'),
  
  -- Specific types
  ('vmax', 'product', '9504.90.60.00', '95', '9504', '950490', 0.85, 8, 'Pokemon VMAX cards'),
  ('deck', 'product', '9504.90.60.00', '95', '9504', '950490', 0.80, 7, 'Card deck'),
  ('booster', 'product', '9504.90.60.00', '95', '9504', '950490', 0.82, 8, 'Booster packs')
ON CONFLICT (keyword, keyword_type, hts_number) 
DO UPDATE SET
  confidence_score = EXCLUDED.confidence_score,
  priority = EXCLUDED.priority,
  notes = EXCLUDED.notes;

COMMENT ON TABLE hts_keyword_mapping IS 'HTSコード自動推定用キーワードマッピング。playing cards = 9504.90.60.00';
