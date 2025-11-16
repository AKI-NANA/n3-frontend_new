-- ====================================================================
-- 重複データ削除とUNIQUE制約追加
-- ====================================================================
-- 目的: pricing_rulesテーブルの重複を削除し、今後の重複を防ぐ
-- ====================================================================

-- ====================================================================
-- 1. 重複データの削除
-- ====================================================================

-- 重複を確認
SELECT name, COUNT(*) as count
FROM pricing_rules
GROUP BY name
HAVING COUNT(*) > 1;

-- 重複データを削除（最初の1件を残す）
DELETE FROM pricing_rules
WHERE id NOT IN (
  SELECT MIN(id)
  FROM pricing_rules
  GROUP BY name
);

-- 削除後の確認
SELECT 
  name,
  type,
  enabled,
  priority,
  description
FROM pricing_rules
ORDER BY priority DESC;

-- ====================================================================
-- 2. UNIQUE制約の追加
-- ====================================================================

-- nameカラムにUNIQUE制約を追加
ALTER TABLE pricing_rules
ADD CONSTRAINT pricing_rules_name_unique UNIQUE (name);

-- ====================================================================
-- 3. 検証
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 重複削除とUNIQUE制約追加完了';
  RAISE NOTICE '========================================';
  
  -- 制約の確認
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'pricing_rules' 
      AND constraint_name = 'pricing_rules_name_unique'
  ) THEN
    RAISE NOTICE '  ✓ UNIQUE制約が追加されました';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- 最終確認
SELECT 
  name,
  type,
  enabled,
  priority,
  description,
  COUNT(*) OVER (PARTITION BY name) as duplicate_count
FROM pricing_rules
ORDER BY priority DESC;
