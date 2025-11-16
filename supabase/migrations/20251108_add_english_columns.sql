-- 英語タイトルと英語HTML説明カラムの追加
-- products_masterテーブルに英語版のカラムを追加

DO $$ 
BEGIN
  -- english_title カラム（英語タイトル）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'english_title'
  ) THEN
    ALTER TABLE products_master ADD COLUMN english_title TEXT;
    COMMENT ON COLUMN products_master.english_title IS '商品の英語タイトル（eBay出品用）';
    
    -- 既存の english_title がある商品から初期データを移行
    UPDATE products_master 
    SET english_title = title_en 
    WHERE title_en IS NOT NULL AND title_en != '';
    
    RAISE NOTICE 'english_title カラムを追加しました';
  ELSE
    RAISE NOTICE 'english_title カラムは既に存在します';
  END IF;

  -- インデックスの作成（検索パフォーマンス向上）
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'products_master' AND indexname = 'idx_products_master_english_title'
  ) THEN
    CREATE INDEX idx_products_master_english_title ON products_master(english_title);
    RAISE NOTICE 'english_title のインデックスを作成しました';
  END IF;

END $$;

-- listing_data JSONBフィールドに html_description_en を追加する準備
-- （JSONBなので、カラム追加は不要。アプリケーション側で保存すればOK）
COMMENT ON COLUMN products_master.listing_data IS 'eBay出品用データ（JSONB）
- html_description: 日本語HTML説明
- html_description_en: 英語HTML説明（翻訳済み）
- html_applied: HTML適用フラグ
- その他の出品データ';

-- 既存データの確認クエリ（実行不要、参考用）
-- SELECT 
--   id,
--   title,
--   english_title,
--   listing_data->>'html_description' as html_ja,
--   listing_data->>'html_description_en' as html_en
-- FROM products_master
-- WHERE english_title IS NOT NULL
-- LIMIT 10;
