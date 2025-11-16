-- ============================================================================
-- 包括的データベーススキーマ修正 v2（既存データ対応版）
-- 作成日: 2025-10-24
-- 目的: product_idカラムの型不一致を一括修正（INT/BIGINT → UUID）
-- 変更: 既存データを削除してから型変更を実行
-- ============================================================================

-- ステップ1: 既存データを確認・削除
-- ============================================================================

DO $$
DECLARE
    lh_count INTEGER;
    phg_count INTEGER;
BEGIN
    -- 既存データ数を確認
    SELECT COUNT(*) INTO lh_count FROM listing_history;
    SELECT COUNT(*) INTO phg_count FROM product_html_generated;

    RAISE NOTICE '🔧 Step 1/5: 既存データの確認...';
    RAISE NOTICE '  listing_history: % 件', lh_count;
    RAISE NOTICE '  product_html_generated: % 件', phg_count;

    -- データを削除
    IF lh_count > 0 THEN
        DELETE FROM listing_history;
        RAISE NOTICE '  ✓ listing_historyのデータを削除しました';
    END IF;

    IF phg_count > 0 THEN
        DELETE FROM product_html_generated;
        RAISE NOTICE '  ✓ product_html_generatedのデータを削除しました';
    END IF;

    RAISE NOTICE '';
END $$;

-- ステップ2: listing_history.product_id を UUID型に変更
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Step 2/5: listing_history.product_id の型変更...';
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

-- カラムの型を変更
ALTER TABLE listing_history
ALTER COLUMN product_id DROP DEFAULT,
ALTER COLUMN product_id TYPE UUID USING NULL;

DO $$
BEGIN
    RAISE NOTICE '  ✓ listing_history.product_id を UUID型に変更しました';
END $$;

-- productsテーブルへの外部キー制約を追加
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE listing_history
        ADD CONSTRAINT listing_history_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
        RAISE NOTICE '  ✓ products(id)への外部キー制約を追加しました';
    END IF;
    RAISE NOTICE '';
END $$;

-- ステップ3: product_html_generated.product_id を UUID型に変更
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Step 3/5: product_html_generated.product_id の型変更...';
END $$;

-- UNIQUE制約を削除（product_id, marketplace）
ALTER TABLE product_html_generated
DROP CONSTRAINT IF EXISTS product_html_generated_product_id_marketplace_key;

DO $$
BEGIN
    RAISE NOTICE '  ✓ UNIQUE制約を削除しました';
END $$;

-- カラムの型を変更
ALTER TABLE product_html_generated
ALTER COLUMN product_id DROP DEFAULT,
ALTER COLUMN product_id TYPE UUID USING NULL;

DO $$
BEGIN
    RAISE NOTICE '  ✓ product_html_generated.product_id を UUID型に変更しました';
END $$;

-- UNIQUE制約を再追加
ALTER TABLE product_html_generated
ADD CONSTRAINT product_html_generated_product_id_marketplace_key
UNIQUE (product_id, marketplace);

DO $$
BEGIN
    RAISE NOTICE '  ✓ UNIQUE制約を再追加しました';
END $$;

-- productsテーブルへの外部キー制約を追加
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE product_html_generated
        ADD CONSTRAINT product_html_generated_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
        RAISE NOTICE '  ✓ products(id)への外部キー制約を追加しました';
    END IF;
    RAISE NOTICE '';
END $$;

-- ステップ4: インデックスを再作成
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Step 4/5: インデックスの再作成...';
END $$;

DROP INDEX IF EXISTS idx_listing_history_product_id;
CREATE INDEX idx_listing_history_product_id ON listing_history(product_id);

DO $$
BEGIN
    RAISE NOTICE '  ✓ listing_history.product_id インデックス作成';
END $$;

DROP INDEX IF EXISTS idx_product_html_generated_product_id;
CREATE INDEX idx_product_html_generated_product_id ON product_html_generated(product_id);

DO $$
BEGIN
    RAISE NOTICE '  ✓ product_html_generated.product_id インデックス作成';
    RAISE NOTICE '';
END $$;

-- ステップ5: スキーマ検証
-- ============================================================================

DO $$
DECLARE
    lh_type TEXT;
    phg_type TEXT;
    products_type TEXT;
BEGIN
    RAISE NOTICE '🔧 Step 5/5: スキーマ検証...';

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

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '検証結果:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'products.id: %', products_type;
    RAISE NOTICE 'listing_history.product_id: %', lh_type;
    RAISE NOTICE 'product_html_generated.product_id: %', phg_type;
    RAISE NOTICE '========================================';

    IF lh_type = 'uuid' AND phg_type = 'uuid' AND products_type = 'uuid' THEN
        RAISE NOTICE '✅ すべてのproduct_id関連カラムがUUID型に統一されました！';
    ELSE
        RAISE WARNING '⚠️ 一部のカラムの型が期待と異なります';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 マイグレーション完了！';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ 注意事項:';
    RAISE NOTICE '  - listing_historyとproduct_html_generatedの既存データは削除されました';
    RAISE NOTICE '  - 新しいデータは自動的に正しい型（UUID）で保存されます';
    RAISE NOTICE '  - 出品履歴は新しい出品から記録されます';
    RAISE NOTICE '  - HTMLは必要に応じて再生成してください';
    RAISE NOTICE '';
END $$;
