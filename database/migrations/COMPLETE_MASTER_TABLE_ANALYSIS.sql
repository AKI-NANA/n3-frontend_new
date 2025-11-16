-- ============================================================================
-- 📊 NAGANO-3 products_master 完全カラム定義 & 追加SQL
-- ============================================================================
-- 作成日: 2025-01-15
-- 目的: 全ツールのカラムを一度に追加して完全なマスターテーブルを構築
-- ============================================================================

-- ============================================================================
-- 🔍 分析結果: 各APIツールが使用するカラム
-- ============================================================================

/*
✅ 1. SHIPPING-CALCULATE (送料計算) - /api/tools/shipping-calculate/route.ts
   - ddu_price_usd          (商品価格のみ)
   - ddp_price_usd          (DDP価格 = 商品+送料)
   - shipping_cost_usd      (DDP送料 = 顧客が支払う送料)
   - shipping_policy        (ポリシー名)
   - sm_profit_margin       ❌ 間違い → profit_margin に修正必要
   - profit_amount_usd      (利益額)
   
   listing_data内:
   - usa_shipping_policy_name
   - shipping_service
   - base_shipping_usd      (実送料)
   - product_price_usd
   - profit_margin
   - profit_amount_usd
   - profit_margin_refund
   - profit_amount_refund

✅ 2. PROFIT-CALCULATE (利益計算) - /api/tools/profit-calculate/route.ts
   - ddu_price_usd
   - ddp_price_usd
   - shipping_cost_usd
   - shipping_policy
   - sm_profit_margin       ❌ 間違い → profit_margin に修正必要
   - profit_amount_usd
   
   listing_data内: (上記と同じ)

✅ 3. SELLERMIRROR-ANALYZE (SM分析) - /api/tools/sellermirror-analyze/route.ts
   トップレベルカラム:
   - 使用しない (listing_dataとebay_api_dataのみ)
   
   ebay_api_data.listing_reference内:
   - referenceItems[]
   - suggestedCategory
   - suggestedCategoryPath
   - soldCount
   - analyzedAt

✅ 4. CATEGORY-ANALYZE (カテゴリ分析) - /api/tools/category-analyze/route.ts
   - category_name          (カテゴリ名)
   - category_number        (カテゴリ番号)

✅ 5. BULK-RESEARCH (一括リサーチ) - /api/bulk-research/route.ts
   - 上記4つのツールを順次呼び出すだけ
   - 独自カラムなし

✅ 6. FILTERS (フィルター) - /api/filters/route.ts
   - filter_passed          (フィルター通過フラグ)
   - filter_reasons         (フィルター除外理由)
   - filter_checked_at      (フィルター確認日時)

✅ 7. SELLERMIRROR/ANALYZE (出品用データ取得) - /api/sellermirror/analyze/route.ts
   トップレベルカラム:
   - ebay_category_id       (カテゴリID)
   - sm_sales_count         (販売実績数)
   
   ebay_api_data.listing_reference内:
   - referenceItems[]       (出品参考データ 最大10件)
   - suggestedCategory
   - suggestedCategoryPath
   - soldCount
   - analyzedAt

✅ 8. BROWSE/SEARCH (Browse API検索) - /api/ebay/browse/search/route.ts
   トップレベルカラム:
   - sm_lowest_price        (最安値)
   - sm_average_price       (平均価格)
   - sm_competitor_count    (競合数)
   - sm_profit_amount_usd   (利益額)
   - sm_profit_margin       (利益率)
   
   ebay_api_data.browse_result内:
   - lowestPrice
   - averagePrice
   - competitorCount
   - profitAmount
   - profitMargin
   - breakdown
   - items[]
   - referenceItems[]
   - searchedAt
   - searchTitle
   - searchLevel

✅ 9. RESEARCH (リサーチAPI) - /api/research/route.ts
   トップレベルカラム:
   - sm_sales_count         (販売実績数) ※既存
   - sm_lowest_price        (最安値) ※既存
   - sm_profit_amount_usd   (利益額) ※既存
   - sm_profit_margin       (利益率) ※既存
   - sm_competitor_count    (競合数) ※既存
   
   ebay_api_data.research内:
   - soldCount
   - currentCompetitorCount
   - lowestPriceItem
   - profitAnalysis
   - searchStrategy
   - analyzedAt
*/

-- ============================================================================
-- 📋 現在のテーブル構造確認
-- ============================================================================

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;

-- ============================================================================
-- 🔧 カラム追加SQL (存在確認付き)
-- ============================================================================

-- ===== 送料計算関連 =====
-- ddu_price_usd, ddp_price_usd, shipping_cost_usd, shipping_policy は既存の可能性が高い

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS ddu_price_usd NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS ddp_price_usd NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS shipping_cost_usd NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS shipping_policy VARCHAR(255);

-- profit_margin は既存、profit_amount_usd も既存の可能性高い
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS profit_amount_usd NUMERIC(10,2) DEFAULT 0.00;

-- ===== カテゴリ分析関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS category_number VARCHAR(50);

-- ===== フィルター関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS filter_passed BOOLEAN DEFAULT true;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS filter_reasons TEXT;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS filter_checked_at TIMESTAMPTZ;

-- ===== SellerMirror分析関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS ebay_category_id VARCHAR(50);

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_sales_count INTEGER DEFAULT 0;

-- ===== Browse API検索関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_lowest_price NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_average_price NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER DEFAULT 0;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_profit_amount_usd NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_profit_margin NUMERIC(10,2) DEFAULT 0.00;

-- ===== リサーチAPI関連 =====
-- 上記のsm_*カラムと重複するため、追加不要

-- ============================================================================
-- ✅ カラム追加確認
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
  AND column_name IN (
    'ddu_price_usd',
    'ddp_price_usd',
    'shipping_cost_usd',
    'shipping_policy',
    'profit_margin',
    'profit_amount_usd',
    'category_name',
    'category_number',
    'filter_passed',
    'filter_reasons',
    'filter_checked_at',
    'ebay_category_id',
    'sm_sales_count',
    'sm_lowest_price',
    'sm_average_price',
    'sm_competitor_count',
    'sm_profit_amount_usd',
    'sm_profit_margin'
  )
ORDER BY column_name;

-- ============================================================================
-- 🔥 重要: APIコード修正が必要な箇所
-- ============================================================================

/*
❌ 修正必要: /app/api/tools/shipping-calculate/route.ts (約115行目)
変更前:
  sm_profit_margin: breakdown.profitMargin,

変更後:
  profit_margin: breakdown.profitMargin,

❌ 修正必要: /app/api/tools/profit-calculate/route.ts (約115行目)
変更前:
  sm_profit_margin: breakdown.profitMargin,

変更後:
  profit_margin: breakdown.profitMargin,

理由:
- sm_profit_margin はSellerMirror/Browse API専用カラム
- 送料計算・利益計算では既存の profit_margin カラムを使用すべき
*/

-- ============================================================================
-- 📊 データ型とサイズの根拠
-- ============================================================================

/*
NUMERIC(10,2):
  - 価格系カラム (0.00 ~ 99999.99)
  - 利益額 (-999.99 ~ 9999.99)
  - 利益率 (-100.00 ~ 100.00)

INTEGER:
  - カウント系 (0 ~ 2147483647)
  - 販売実績数
  - 競合数

VARCHAR(255):
  - 名称系 (カテゴリ名、ポリシー名)

VARCHAR(50):
  - ID系 (カテゴリ番号、eBayカテゴリID)

TEXT:
  - 長文 (フィルター理由など)

BOOLEAN:
  - フラグ (filter_passed)

TIMESTAMPTZ:
  - 日時 (filter_checked_at)
*/

-- ============================================================================
-- 🎯 次のステップ
-- ============================================================================

/*
1. このSQLを実行してカラムを追加
2. 送料計算・利益計算APIのコードを修正 (sm_profit_margin → profit_margin)
3. フロントエンドで各カラムを表示
4. 各ツールを実行してデータが正しく保存されるか確認
5. 不足しているカラムがあれば追加
*/

-- ============================================================================
-- 終了
-- ============================================================================
