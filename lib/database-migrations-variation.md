# バリエーション対応データベース拡張

## 概要
親SKU・子SKU構造に対応するため、`products_master`テーブルを拡張します。

## 1. products_masterテーブルの拡張

```sql
-- 親SKU・子SKU関連フィールドの追加
ALTER TABLE products_master
  ADD COLUMN IF NOT EXISTS variation_type TEXT CHECK (variation_type IN ('Single', 'Parent', 'Child', 'Set')),
  ADD COLUMN IF NOT EXISTS parent_sku TEXT REFERENCES products_master(sku),
  ADD COLUMN IF NOT EXISTS variation_attributes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS ean TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'New';

-- インデックスの追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_parent_sku ON products_master(parent_sku);
CREATE INDEX IF NOT EXISTS idx_products_variation_type ON products_master(variation_type);

-- コメント
COMMENT ON COLUMN products_master.variation_type IS '商品タイプ: Single(単品), Parent(バリエーション親), Child(バリエーション子), Set(セット品)';
COMMENT ON COLUMN products_master.parent_sku IS '親SKU（子SKUの場合のみ）';
COMMENT ON COLUMN products_master.variation_attributes IS 'バリエーション属性 [{"name": "Color", "value": "Red"}]';
COMMENT ON COLUMN products_master.category_id IS 'プラットフォーム別カテゴリーID';
COMMENT ON COLUMN products_master.ean IS 'EAN/JAN/UPCコード';
COMMENT ON COLUMN products_master.condition IS '商品状態: New, Used, Refurbished';
```

## 2. バリエーションデータ例

### 親SKU
```sql
INSERT INTO products_master (
  sku,
  title,
  description,
  price,
  variation_type,
  variation_attributes,
  status
) VALUES (
  'SHIRT-PARENT-001',
  'Cotton T-Shirt',
  'High quality cotton t-shirt with multiple colors and sizes',
  1980,
  'Parent',
  '["Color", "Size"]',
  '戦略決定済'
);
```

### 子SKU
```sql
INSERT INTO products_master (
  sku,
  title,
  description,
  price,
  current_stock_count,
  variation_type,
  parent_sku,
  variation_attributes,
  status
) VALUES
(
  'SHIRT-RED-S',
  'Cotton T-Shirt - Red - Small',
  'Red cotton t-shirt, size S',
  1980,
  50,
  'Child',
  'SHIRT-PARENT-001',
  '[{"name": "Color", "value": "Red"}, {"name": "Size", "value": "S"}]',
  '戦略決定済'
),
(
  'SHIRT-RED-M',
  'Cotton T-Shirt - Red - Medium',
  'Red cotton t-shirt, size M',
  1980,
  30,
  'Child',
  'SHIRT-PARENT-001',
  '[{"name": "Color", "value": "Red"}, {"name": "Size", "value": "M"}]',
  '戦略決定済'
),
(
  'SHIRT-BLUE-S',
  'Cotton T-Shirt - Blue - Small',
  'Blue cotton t-shirt, size S',
  1980,
  40,
  'Child',
  'SHIRT-PARENT-001',
  '[{"name": "Color", "value": "Blue"}, {"name": "Size", "value": "S"}]',
  '戦略決定済'
);
```

## 3. バリエーション検索クエリ

### 親SKUから子SKUを取得
```sql
SELECT *
FROM products_master
WHERE parent_sku = 'SHIRT-PARENT-001'
ORDER BY sku;
```

### 子SKUから親SKUを取得
```sql
SELECT parent.*
FROM products_master child
JOIN products_master parent ON child.parent_sku = parent.sku
WHERE child.sku = 'SHIRT-RED-S';
```

### バリエーション商品のみを取得
```sql
SELECT *
FROM products_master
WHERE variation_type IN ('Parent', 'Child')
ORDER BY parent_sku NULLS FIRST, sku;
```

## 4. 既存データの移行

### 単品商品のvariation_type更新
```sql
UPDATE products_master
SET variation_type = 'Single'
WHERE variation_type IS NULL;
```

## 5. バリエーション整合性チェック

### 孤児子SKUの検出（親が存在しない子SKU）
```sql
SELECT child.sku, child.parent_sku
FROM products_master child
LEFT JOIN products_master parent ON child.parent_sku = parent.sku
WHERE child.variation_type = 'Child'
  AND parent.sku IS NULL;
```

### 子SKUを持たない親SKU（警告）
```sql
SELECT parent.sku
FROM products_master parent
LEFT JOIN products_master child ON child.parent_sku = parent.sku
WHERE parent.variation_type = 'Parent'
  AND child.sku IS NULL;
```

## 6. RLS (Row Level Security) ポリシー

バリエーション商品に対するRLSポリシーは、既存の`products_master`のポリシーを継承します。
特別な制限は不要です。

## 実行手順

1. テーブル拡張を実行
2. インデックスを作成
3. 既存データの`variation_type`を'Single'に更新
4. テストデータ投入（オプション）
5. 整合性チェッククエリを実行して確認

## 注意事項

- `parent_sku`は外部キー制約により、親SKUが削除されると子SKUも影響を受けます
- バリエーション商品の削除時は、子SKUから先に削除してください
- `variation_attributes`はJSONB形式で柔軟性を保ちつつ、検索・インデックスも可能です
