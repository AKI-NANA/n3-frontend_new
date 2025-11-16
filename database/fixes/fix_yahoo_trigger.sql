-- =========================================
-- yahoo_scraped_products → products_master 同期トリガー
-- =========================================

-- 同期関数を作成（currency を使わない版）
CREATE OR REPLACE FUNCTION sync_yahoo_scraped_to_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'yahoo_scraped_products' AND source_id = OLD.id::text;
        RETURN OLD;
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        INSERT INTO products_master (
            sku,
            title,
            title_en,
            purchase_price_jpy,
            profit_margin_percent,
            condition,
            category,
            source_system,
            source_table,
            source_id,
            primary_image_url,
            images,
            scraped_data,
            listing_data,
            ebay_api_data,
            approval_status,
            listing_priority,
            created_at,
            updated_at
        ) VALUES (
            NEW.sku,
            NEW.title,
            NEW.english_title,
            NEW.price_jpy,
            NEW.profit_margin,
            COALESCE(NEW.scraped_data->>'condition', '不明'),
            COALESCE(NEW.scraped_data->>'category', 'その他'),
            'yahoo_scraped_products',
            'yahoo_scraped_products',
            NEW.id::text,
            -- primary_image_url: scraped_data.images配列の最初の要素
            CASE 
                WHEN jsonb_typeof(NEW.scraped_data->'images') = 'array' AND jsonb_array_length(NEW.scraped_data->'images') > 0 
                THEN NEW.scraped_data->'images'->>0
                ELSE NULL
            END,
            -- images: scraped_data.images をそのまま保存
            NEW.scraped_data->'images',
            NEW.scraped_data,
            NEW.listing_data,
            NEW.ebay_api_data,
            COALESCE(NEW.approval_status, 'pending'),
            COALESCE(NEW.listing_priority, 'medium'),
            NEW.created_at,
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            profit_margin_percent = EXCLUDED.profit_margin_percent,
            condition = EXCLUDED.condition,
            category = EXCLUDED.category,
            primary_image_url = EXCLUDED.primary_image_url,
            images = EXCLUDED.images,
            scraped_data = EXCLUDED.scraped_data,
            listing_data = EXCLUDED.listing_data,
            ebay_api_data = EXCLUDED.ebay_api_data,
            approval_status = EXCLUDED.approval_status,
            listing_priority = EXCLUDED.listing_priority,
            updated_at = NOW();
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS sync_yahoo_to_master_trigger ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trg_sync_yahoo_to_master ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trigger_sync_yahoo_scraped_products ON yahoo_scraped_products;

-- 新しいトリガーを作成
CREATE TRIGGER trigger_sync_yahoo_scraped_to_master
    AFTER INSERT OR UPDATE OR DELETE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_yahoo_scraped_to_master();

-- 確認
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'yahoo_scraped_products';
