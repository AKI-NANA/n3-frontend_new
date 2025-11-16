-- トリガー関数を修正（descriptionフィールドを削除）
CREATE OR REPLACE FUNCTION sync_yahoo_scraped_to_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'yahoo_scraped_products' AND source_id = OLD.id::text;
        RETURN OLD;
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        INSERT INTO products_master (
            source_system,
            source_table,
            source_id,
            sku,
            title,
            title_en,
            current_price,
            purchase_price_jpy,
            profit_margin_percent,
            currency,
            condition,
            category,
            source,
            primary_image_url,
            images,
            scraped_data,
            approval_status,
            workflow_status,
            created_at,
            updated_at
        ) VALUES (
            'yahoo_scraped_products',
            'yahoo_scraped_products',
            NEW.id::text,
            NEW.sku,
            NEW.title,
            NEW.title,
            NEW.price_jpy,
            NEW.price_jpy,
            COALESCE(NEW.profit_margin, 15),
            COALESCE(NEW.currency, 'JPY'),
            COALESCE(NEW.scraped_data->>'condition', '不明'),
            COALESCE(NEW.scraped_data->>'category', 'その他'),
            COALESCE(NEW.source_url, 'Yahoo Auction'),
            -- primary_image_url: scraped_data.images[0]
            CASE 
                WHEN jsonb_typeof(NEW.scraped_data->'images') = 'array' 
                     AND jsonb_array_length(NEW.scraped_data->'images') > 0 
                THEN NEW.scraped_data->'images'->>0
                ELSE NULL
            END,
            -- images: scraped_data.images
            NEW.scraped_data->'images',
            NEW.scraped_data,
            COALESCE(NEW.status, 'pending'),
            'scraped',
            COALESCE(NEW.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            current_price = EXCLUDED.current_price,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            profit_margin_percent = EXCLUDED.profit_margin_percent,
            currency = EXCLUDED.currency,
            condition = EXCLUDED.condition,
            category = EXCLUDED.category,
            source = EXCLUDED.source,
            primary_image_url = EXCLUDED.primary_image_url,
            images = EXCLUDED.images,
            scraped_data = EXCLUDED.scraped_data,
            approval_status = EXCLUDED.approval_status,
            workflow_status = EXCLUDED.workflow_status,
            updated_at = NOW();
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- トリガーを再作成
DROP TRIGGER IF EXISTS trigger_sync_yahoo_scraped_to_master ON yahoo_scraped_products;
CREATE TRIGGER trigger_sync_yahoo_scraped_to_master
    AFTER INSERT OR UPDATE OR DELETE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_yahoo_scraped_to_master();

-- 確認
SELECT 'トリガー再作成完了' as status;
