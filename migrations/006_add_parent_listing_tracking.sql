-- =====================================================
-- マイグレーション006: バリエーション紐づけマスターデータの追加
-- =====================================================
-- 目的: 子SKUと親リスティングの紐づけを記録し、
--       イベント駆動型価格パトロールを可能にする
--
-- 作成日: 2025-11-21
-- =====================================================

-- ===== 1. inventory_master に parent_listing_id カラムを追加 =====

-- inventory_master テーブルに親リスティングID参照カラムを追加
ALTER TABLE inventory_master
ADD COLUMN IF NOT EXISTS parent_listing_id TEXT NULL;

-- インデックスを作成（親リスティングIDからの逆引き検索を高速化）
CREATE INDEX IF NOT EXISTS idx_inventory_master_parent_listing_id
ON inventory_master(parent_listing_id);

-- カラムにコメントを追加
COMMENT ON COLUMN inventory_master.parent_listing_id IS
'この子SKUが含まれるeBay親リスティングのID。バリエーション出品成功時に記録される。';


-- ===== 2. parent_child_map テーブルの作成 =====

-- 親SKUと子SKUの紐づけを記録する中間テーブル
CREATE TABLE IF NOT EXISTS parent_child_map (
  id BIGSERIAL PRIMARY KEY,

  -- 親SKU情報
  parent_sku_id TEXT NOT NULL,
  parent_listing_id TEXT NOT NULL,

  -- 子SKU情報
  child_sku_id TEXT NOT NULL,
  child_inventory_id BIGINT NULL,  -- inventory_master.id への参照

  -- バリエーション情報
  variation_attributes JSONB NULL,  -- 例: [{"name": "Color", "value": "Red"}]

  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- 制約: 同じ親SKU内で同じ子SKUは1つのみ
  UNIQUE(parent_sku_id, child_sku_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_parent_child_map_parent_sku
ON parent_child_map(parent_sku_id);

CREATE INDEX IF NOT EXISTS idx_parent_child_map_child_sku
ON parent_child_map(child_sku_id);

CREATE INDEX IF NOT EXISTS idx_parent_child_map_parent_listing
ON parent_child_map(parent_listing_id);

CREATE INDEX IF NOT EXISTS idx_parent_child_map_child_inventory
ON parent_child_map(child_inventory_id);

CREATE INDEX IF NOT EXISTS idx_parent_child_map_active
ON parent_child_map(is_active) WHERE is_active = TRUE;

-- テーブルコメント
COMMENT ON TABLE parent_child_map IS
'バリエーション親SKUと子SKUの紐づけマスターテーブル。
子SKUのデータ変更時に親SKUを特定し、価格パトロール（再計算）を実行するためのルックアップテーブル。';

COMMENT ON COLUMN parent_child_map.parent_sku_id IS '親SKU（products_master.sku）';
COMMENT ON COLUMN parent_child_map.parent_listing_id IS 'eBay親リスティングID';
COMMENT ON COLUMN parent_child_map.child_sku_id IS '子SKU（inventory_master.sku）';
COMMENT ON COLUMN parent_child_map.child_inventory_id IS 'inventory_master.id への参照（オプション）';
COMMENT ON COLUMN parent_child_map.variation_attributes IS 'バリエーション属性（Color, Size等）';
COMMENT ON COLUMN parent_child_map.is_active IS 'アクティブフラグ（削除済みの場合はFALSE）';


-- ===== 3. 更新日時の自動更新トリガー =====

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION update_parent_child_map_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS trigger_parent_child_map_updated_at ON parent_child_map;
CREATE TRIGGER trigger_parent_child_map_updated_at
  BEFORE UPDATE ON parent_child_map
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_child_map_updated_at();


-- ===== 4. 価格パトロール用のビュー =====

-- イベント駆動型価格パトロールで使用するビュー
CREATE OR REPLACE VIEW v_parent_child_relationships AS
SELECT
  pcm.parent_sku_id,
  pcm.parent_listing_id,
  pcm.child_sku_id,
  im.id AS inventory_master_id,
  im.sku AS child_sku,
  im.cost_jpy,
  im.cost_price AS simple_ddp_cost_usd,
  im.source_data->>'hs_code' AS hs_code,
  im.source_data->>'origin_country' AS origin_country,
  im.source_data->>'ddp_weight_g' AS ddp_weight_g,
  im.source_data->'has_complete_ddp_data' AS has_complete_ddp_data,
  pm.listing_data->>'max_ddp_cost_usd' AS current_unified_price_usd,
  pcm.variation_attributes,
  pcm.is_active,
  pcm.created_at,
  pcm.updated_at
FROM
  parent_child_map pcm
  LEFT JOIN inventory_master im ON pcm.child_inventory_id = im.id
  LEFT JOIN products_master pm ON pcm.parent_sku_id = pm.sku
WHERE
  pcm.is_active = TRUE;

COMMENT ON VIEW v_parent_child_relationships IS
'価格パトロール用のビュー。親SKUと子SKUの関係、およびDDP計算に必要な全データを含む。
inventory_masterの変更を検知した際、このビューを使って関連する親SKUを特定する。';


-- ===== 5. マイグレーション完了ログ =====

-- マイグレーション実行履歴テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  migration_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- このマイグレーションを記録
INSERT INTO migration_history (migration_number, description)
VALUES (
  '006',
  'バリエーション紐づけマスターデータの追加: parent_listing_id, parent_child_map, v_parent_child_relationships'
)
ON CONFLICT (migration_number) DO NOTHING;


-- =====================================================
-- マイグレーション完了
-- =====================================================
-- 次のステップ:
-- 1. /app/api/products/create-variation/route.ts を修正し、
--    バリエーション作成成功時に parent_child_map を更新
-- 2. /app/api/management/price-patrol/route.ts を作成し、
--    子SKU変更時のイベント駆動型価格再計算を実装
-- =====================================================
