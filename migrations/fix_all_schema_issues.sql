-- ============================================================================
-- 包括的データベーススキーマ修正
-- 作成日: 2025-10-24
-- 目的: product_idカラムの型不一致を一括修正（INT/BIGINT → UUID）
-- ============================================================================

BEGIN;

-- ステップ1: listing_history.product_id を UUID型に変更
-- ============================================================================
RAISE NOTICE '🔧 Step 1/4: listing_history.product_id の型変更開始...';

-- 既存のデータを確認
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM listing_history;
    RAISE NOTICE '  現在のlisting_historyレコード数: %', row_count;
END $$;

-- 外部キー制約を削除（存在する場合）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name LIKE '%listing_history%product%'
        AND table_name = 'listing_history'
    ) THEN
        EXECUTE 'ALTER TABLE listing_history DROP CONSTRAINT IF EXISTS listing_history_product_id_fkey';
        RAISE NOTICE '  ✓ 外部キー制約を削除しました';
    END IF;
END $$;

-- カラムの型を変更（既存データがあればクリア）
ALTER TABLE listing_history
ALTER COLUMN product_id DROP DEFAULT,
ALTER COLUMN product_id TYPE UUID USING NULL;  -- 既存データは互換性がないためNULLに

RAISE NOTICE '  ✓ listing_history.product_id を UUID型に変更しました';

-- productsテーブルへの外部キー制約を追加（products.idがUUIDであることを前提）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE listing_history
        ADD CONSTRAINT listing_history_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
        RAISE NOTICE '  ✓ products(id)への外部キー制約を追加しました';
    END IF;
END $$;

-- ステップ2: product_html_generated.product_id を UUID型に変更
-- ============================================================================
RAISE NOTICE '🔧 Step 2/4: product_html_generated.product_id の型変更開始...';

-- 既存のデータを確認
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM product_html_generated;
    RAISE NOTICE '  現在のproduct_html_generatedレコード数: %', row_count;
END $$;

-- UNIQUE制約を削除（product_id, marketplace）
ALTER TABLE product_html_generated
DROP CONSTRAINT IF EXISTS product_html_generated_product_id_marketplace_key;

RAISE NOTICE '  ✓ UNIQUE制約を削除しました';

-- カラムの型を変更（既存データがあればクリア）
ALTER TABLE product_html_generated
ALTER COLUMN product_id DROP DEFAULT,
ALTER COLUMN product_id TYPE UUID USING NULL;  -- 既存データは互換性がないためNULLに

RAISE NOTICE '  ✓ product_html_generated.product_id を UUID型に変更しました';

-- UNIQUE制約を再追加
ALTER TABLE product_html_generated
ADD CONSTRAINT product_html_generated_product_id_marketplace_key
UNIQUE (product_id, marketplace);

RAISE NOTICE '  ✓ UNIQUE制約を再追加しました';

-- productsテーブルへの外部キー制約を追加（products.idがUUIDであることを前提）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE product_html_generated
        ADD CONSTRAINT product_html_generated_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
        RAISE NOTICE '  ✓ products(id)への外部キー制約を追加しました';
    END IF;
END $$;

-- ステップ3: インデックスを再作成
-- ============================================================================
RAISE NOTICE '🔧 Step 3/4: インデックスの再作成...';

DROP INDEX IF EXISTS idx_listing_history_product_id;
CREATE INDEX idx_listing_history_product_id ON listing_history(product_id);
RAISE NOTICE '  ✓ listing_history.product_id インデックス作成';

DROP INDEX IF EXISTS idx_product_html_generated_product_id;
CREATE INDEX idx_product_html_generated_product_id ON product_html_generated(product_id);
RAISE NOTICE '  ✓ product_html_generated.product_id インデックス作成';

-- ステップ4: スキーマ検証
-- ============================================================================
RAISE NOTICE '🔧 Step 4/4: スキーマ検証...';

DO $$
DECLARE
    lh_type TEXT;
    phg_type TEXT;
    products_type TEXT;
BEGIN
    -- listing_history.product_id の型を取得
    SELECT data_type INTO lh_type
    FROM information_schema.columns
    WHERE table_name = 'listing_history' AND column_name = 'product_id';

    -- product_html_generated.product_id の型を取得
    SELECT data_type INTO phg_type
    FROM information_schema.columns
    WHERE table_name = 'product_html_generated' AND column_name = 'product_id';

    -- products.id の型を取得
    SELECT data_type INTO products_type
    FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'id';

    RAISE NOTICE '  ';
    RAISE NOTICE '  ========================================';
    RAISE NOTICE '  検証結果:';
    RAISE NOTICE '  ========================================';
    RAISE NOTICE '  products.id: %', products_type;
    RAISE NOTICE '  listing_history.product_id: %', lh_type;
    RAISE NOTICE '  product_html_generated.product_id: %', phg_type;
    RAISE NOTICE '  ========================================';

    IF lh_type = 'uuid' AND phg_type = 'uuid' AND products_type = 'uuid' THEN
        RAISE NOTICE '  ✅ すべてのproduct_id関連カラムがUUID型に統一されました！';
    ELSE
        RAISE WARNING '  ⚠️ 一部のカラムの型が期待と異なります';
    END IF;
END $$;

-- 完了メッセージ
RAISE NOTICE '  ';
RAISE NOTICE '🎉 マイグレーション完了！';
RAISE NOTICE '  ';
RAISE NOTICE '⚠️ 注意: 既存のlisting_historyとproduct_html_generatedのデータは';
RAISE NOTICE '   型の互換性がないためクリアされました。';
RAISE NOTICE '   新しいデータは自動的に正しい型で保存されます。';
RAISE NOTICE '  ';

COMMIT;
