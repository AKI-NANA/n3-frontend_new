/**
 * eBay在庫同期システム - SQLトリガー設定
 * products_master ⟷ ebay_inventory の双方向同期
 */

-- ========================================
-- 1. ebay_inventory → products_master 同期
-- ========================================
-- eBayに出品された商品をproducts_masterに反映

CREATE OR REPLACE FUNCTION sync_ebay_inventory_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
  -- ebay_inventoryにINSERTまたはUPDATEされた場合
  -- 対応するproducts_masterレコードを更新
  
  UPDATE products_master
  SET 
    ebay_listed = true,
    ebay_listing_id = NEW.ebay_item_id,
    ebay_offer_id = NEW.offer_id,
    current_stock = NEW.quantity_available,
    ebay_api_data = jsonb_build_object(
      'listing_id', NEW.ebay_item_id,
      'offer_id', NEW.offer_id,
      'sku', NEW.sku,
      'price_usd', NEW.current_price_usd,
      'status', NEW.status,
      'last_synced_from_ebay_inventory', NOW()
    ),
    updated_at = NOW()
  WHERE sku = NEW.sku;
  
  -- products_masterに存在しない場合はINSERT
  IF NOT FOUND THEN
    INSERT INTO products_master (
      sku,
      title_ja,
      title_en,
      ebay_listed,
      ebay_listing_id,
      ebay_offer_id,
      current_stock,
      ebay_api_data,
      created_at,
      updated_at
    )
    VALUES (
      NEW.sku,
      NEW.title,
      NEW.title,
      true,
      NEW.ebay_item_id,
      NEW.offer_id,
      NEW.quantity_available,
      jsonb_build_object(
        'listing_id', NEW.ebay_item_id,
        'offer_id', NEW.offer_id,
        'sku', NEW.sku,
        'price_usd', NEW.current_price_usd,
        'status', NEW.status,
        'created_from_ebay_inventory', NOW()
      ),
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_sync_ebay_inventory_to_products_master ON ebay_inventory;
CREATE TRIGGER trigger_sync_ebay_inventory_to_products_master
  AFTER INSERT OR UPDATE ON ebay_inventory
  FOR EACH ROW
  EXECUTE FUNCTION sync_ebay_inventory_to_products_master();


-- ========================================
-- 2. products_master → ebay_inventory 同期
-- ========================================
-- products_masterでeBay出品フラグが立った場合にebay_inventoryを更新

CREATE OR REPLACE FUNCTION sync_products_master_to_ebay_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- eBay出品されている場合のみ同期
  IF NEW.ebay_listed = true THEN
    
    -- ebay_inventoryに既存レコードがあればUPDATE
    UPDATE ebay_inventory
    SET
      ebay_item_id = NEW.ebay_listing_id,
      offer_id = NEW.ebay_offer_id,
      title = COALESCE(NEW.title_en, NEW.title_ja),
      quantity_available = NEW.current_stock,
      current_price_usd = (NEW.listing_data->>'ddp_price_usd')::numeric,
      status = CASE 
        WHEN NEW.ebay_listing_id IS NOT NULL THEN 'active'
        ELSE 'pending'
      END,
      last_synced_at = NOW(),
      updated_at = NOW()
    WHERE sku = NEW.sku;
    
    -- 存在しない場合はINSERT
    IF NOT FOUND THEN
      INSERT INTO ebay_inventory (
        sku,
        ebay_item_id,
        offer_id,
        title,
        quantity_available,
        current_price_usd,
        status,
        listing_data,
        created_at,
        updated_at,
        last_synced_at
      )
      VALUES (
        NEW.sku,
        NEW.ebay_listing_id,
        NEW.ebay_offer_id,
        COALESCE(NEW.title_en, NEW.title_ja),
        NEW.current_stock,
        (NEW.listing_data->>'ddp_price_usd')::numeric,
        CASE 
          WHEN NEW.ebay_listing_id IS NOT NULL THEN 'active'
          ELSE 'pending'
        END,
        NEW.listing_data,
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_sync_products_master_to_ebay_inventory ON products_master;
CREATE TRIGGER trigger_sync_products_master_to_ebay_inventory
  AFTER INSERT OR UPDATE OF ebay_listed, ebay_listing_id, ebay_offer_id, current_stock
  ON products_master
  FOR EACH ROW
  EXECUTE FUNCTION sync_products_master_to_ebay_inventory();


-- ========================================
-- 3. ebay_inventory削除時の処理
-- ========================================
-- eBayから削除された場合、products_masterのフラグをfalseに

CREATE OR REPLACE FUNCTION handle_ebay_inventory_deletion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products_master
  SET
    ebay_listed = false,
    ebay_api_data = jsonb_set(
      COALESCE(ebay_api_data, '{}'::jsonb),
      '{delisted_at}',
      to_jsonb(NOW()::text)
    ),
    updated_at = NOW()
  WHERE sku = OLD.sku;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_handle_ebay_inventory_deletion ON ebay_inventory;
CREATE TRIGGER trigger_handle_ebay_inventory_deletion
  AFTER DELETE ON ebay_inventory
  FOR EACH ROW
  EXECUTE FUNCTION handle_ebay_inventory_deletion();


-- ========================================
-- 4. インデックス作成（パフォーマンス最適化）
-- ========================================

-- products_master用インデックス
CREATE INDEX IF NOT EXISTS idx_products_master_ebay_listed 
  ON products_master(ebay_listed) WHERE ebay_listed = true;

CREATE INDEX IF NOT EXISTS idx_products_master_ebay_listing_id 
  ON products_master(ebay_listing_id) WHERE ebay_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_master_sku_ebay 
  ON products_master(sku) WHERE ebay_listed = true;

-- ebay_inventory用インデックス
CREATE INDEX IF NOT EXISTS idx_ebay_inventory_sku 
  ON ebay_inventory(sku);

CREATE INDEX IF NOT EXISTS idx_ebay_inventory_ebay_item_id 
  ON ebay_inventory(ebay_item_id) WHERE ebay_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ebay_inventory_status 
  ON ebay_inventory(status);


-- ========================================
-- 5. データ整合性チェック関数
-- ========================================

CREATE OR REPLACE FUNCTION check_ebay_data_integrity()
RETURNS TABLE (
  issue_type text,
  sku text,
  details jsonb
) AS $$
BEGIN
  -- products_masterにあってebay_inventoryにない
  RETURN QUERY
  SELECT 
    'missing_in_ebay_inventory'::text,
    pm.sku,
    jsonb_build_object(
      'ebay_listed', pm.ebay_listed,
      'ebay_listing_id', pm.ebay_listing_id
    )
  FROM products_master pm
  LEFT JOIN ebay_inventory ei ON pm.sku = ei.sku
  WHERE pm.ebay_listed = true AND ei.sku IS NULL;
  
  -- ebay_inventoryにあってproducts_masterにない
  RETURN QUERY
  SELECT 
    'missing_in_products_master'::text,
    ei.sku,
    jsonb_build_object(
      'ebay_item_id', ei.ebay_item_id,
      'status', ei.status
    )
  FROM ebay_inventory ei
  LEFT JOIN products_master pm ON ei.sku = pm.sku
  WHERE pm.sku IS NULL;
  
  -- 在庫数が不一致
  RETURN QUERY
  SELECT 
    'stock_mismatch'::text,
    pm.sku,
    jsonb_build_object(
      'products_master_stock', pm.current_stock,
      'ebay_inventory_stock', ei.quantity_available
    )
  FROM products_master pm
  INNER JOIN ebay_inventory ei ON pm.sku = ei.sku
  WHERE pm.ebay_listed = true 
    AND pm.current_stock != ei.quantity_available;
  
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- 使用例
-- ========================================

-- データ整合性チェックの実行
-- SELECT * FROM check_ebay_data_integrity();

-- 手動でebay_inventoryからproducts_masterへ同期
-- SELECT sync_ebay_inventory_to_products_master()
-- FROM ebay_inventory WHERE sku = 'YOUR_SKU';
