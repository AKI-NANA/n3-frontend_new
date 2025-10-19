-- price_usd カラム問題の緊急修正
-- 実行: psql -h localhost -U aritahiroaki -d nagano3_db -f この_ファイル

-- price_usd カラムを追加してJPY→USD変換値を設定
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2) DEFAULT 0;

-- 既存のJPYデータをUSDに変換（1USD = 150JPY で計算）
UPDATE yahoo_scraped_products 
SET price_usd = ROUND(COALESCE(price_jpy, 0) / 150.0, 2)
WHERE price_usd IS NULL OR price_usd = 0;

-- トリガー作成：price_jpy更新時に自動でprice_usd更新
CREATE OR REPLACE FUNCTION update_price_usd()
RETURNS TRIGGER AS $$
BEGIN
    NEW.price_usd := ROUND(COALESCE(NEW.price_jpy, 0) / 150.0, 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_price_usd ON yahoo_scraped_products;
CREATE TRIGGER trigger_update_price_usd
    BEFORE INSERT OR UPDATE OF price_jpy ON yahoo_scraped_products
    FOR EACH ROW EXECUTE FUNCTION update_price_usd();

-- 確認
SELECT 
    id, 
    title, 
    price_jpy, 
    price_usd,
    CASE 
        WHEN price_usd > 0 THEN '✅'
        ELSE '❌'
    END as status
FROM yahoo_scraped_products;

RAISE NOTICE '✅ price_usd カラム問題解決完了！';
RAISE NOTICE 'JPY→USD自動変換トリガーも設定済み';
