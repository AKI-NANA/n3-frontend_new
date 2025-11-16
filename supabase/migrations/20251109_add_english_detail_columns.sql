-- 英語の商品詳細カラムを追加
-- products_masterテーブルに英語版の詳細カラムを追加

DO $$ 
BEGIN
  -- english_description カラム（英語説明）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'english_description'
  ) THEN
    ALTER TABLE products_master ADD COLUMN english_description TEXT;
    COMMENT ON COLUMN products_master.english_description IS '商品説明（英語）';
    RAISE NOTICE 'english_description カラムを追加しました';
  END IF;

  -- english_condition カラム（英語状態）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'english_condition'
  ) THEN
    ALTER TABLE products_master ADD COLUMN english_condition TEXT;
    COMMENT ON COLUMN products_master.english_condition IS '状態（英語）';
    RAISE NOTICE 'english_condition カラムを追加しました';
  END IF;

  -- english_category カラム（英語カテゴリ）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'english_category'
  ) THEN
    ALTER TABLE products_master ADD COLUMN english_category TEXT;
    COMMENT ON COLUMN products_master.english_category IS 'カテゴリ（英語）';
    RAISE NOTICE 'english_category カラムを追加しました';
  END IF;

END $$;
