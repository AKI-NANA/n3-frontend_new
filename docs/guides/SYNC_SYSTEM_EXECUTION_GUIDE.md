# products_master 完全同期システム - 実行ガイド

## 📋 概要

このシステムは、複数のソーステーブル（products, yahoo_scraped_products, inventory_products等）から`products_master`テーブルへのリアルタイム同期を実現します。

## 🔧 主な修正点

### 1. フィールド名の修正
- **products テーブル**: `title_en` → `english_title` に修正
- **yahoo_scraped_products テーブル**: フィールド名を正確に対応

### 2. 画像URL抽出の改善
複数のソースから順次試行：
1. `ebay_api_data.browse_result.items[0].image.imageUrl`
2. `scraped_data.image_urls[0]`
3. `image_urls` フィールド（JSONB配列）
4. `images` フィールド（JSONB配列）

### 3. トリガー機能
- **順方向同期**: ソーステーブル → products_master（INSERT/UPDATE/DELETE）
- **逆方向同期**: products_master → ソーステーブル（承認状態等の更新）

## 📝 実行手順

### ステップ 1: データベース接続
```bash
psql -h aws-0-ap-northeast-1.pooler.supabase.com \
     -p 6543 \
     -U postgres.tbfxkqigcedmpysvptdj \
     -d postgres
```

### ステップ 2: トリガーシステムの作成
```sql
-- Part 1: トリガー関数とトリガーの作成
\i complete_sync_system_fixed.sql
```

実行結果の確認：
- 5つのトリガー関数が作成される
- 各ソーステーブルに対応するトリガーが設定される
- products_master への逆同期トリガーが設定される

### ステップ 3: 初期データ移行
```sql
-- Part 2: ETL処理と補完機能
\i complete_sync_system_part2_fixed.sql

-- 初期データ移行の実行
SELECT * FROM migrate_all_existing_data_to_master();
```

期待される出力：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステップ 1/5: products テーブルの移行開始...
✓ 完了: 150 件処理, 120 件に画像あり
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステップ 2/5: yahoo_scraped_products テーブルの移行開始...
✓ 完了: 75 件処理, 60 件に画像あり
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### ステップ 4: データ検証
```sql
-- 同期システムの検証
SELECT verify_sync_system();

-- 整合性チェック
SELECT * FROM check_sync_integrity();

-- 統計レポート
SELECT * FROM generate_sync_report();
```

### ステップ 5: 画像URL修復（必要な場合）
```sql
-- 画像URLが欠落している商品を修復
SELECT * FROM repair_missing_images();
```

## 🧪 テストクエリ

### ゲンガー商品の確認
```sql
SELECT 
    id,
    source_system,
    title,
    title_en,
    primary_image_url,
    jsonb_array_length(gallery_images) as image_count,
    purchase_price_jpy,
    recommended_price_usd,
    profit_margin_percent,
    approval_status,
    created_at,
    synced_at
FROM products_master 
WHERE title ILIKE '%ゲンガー%' OR title_en ILIKE '%gengar%'
ORDER BY updated_at DESC;
```

### ソース別統計
```sql
SELECT 
    source_system,
    COUNT(*) as total_count,
    COUNT(primary_image_url) as with_images,
    COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approval,
    COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
    ROUND(AVG(profit_margin_percent), 2) as avg_profit_margin
FROM products_master
GROUP BY source_system
ORDER BY total_count DESC;
```

### 画像なし商品の確認
```sql
SELECT 
    id,
    source_system,
    source_id,
    title,
    approval_status
FROM products_master
WHERE primary_image_url IS NULL
LIMIT 20;
```

## 🔄 トリガーの動作確認

### products テーブルの更新テスト
```sql
-- 既存商品の更新
UPDATE products 
SET profit_margin = 25.5
WHERE id = '5ca8f114-af75-4e80-9683-004a20d0df3a';

-- products_master への反映を確認
SELECT 
    source_system,
    source_id,
    profit_margin_percent,
    synced_at
FROM products_master
WHERE source_id = '5ca8f114-af75-4e80-9683-004a20d0df3a';
```

### products_master の更新テスト（逆同期）
```sql
-- products_master の承認状態を更新
UPDATE products_master
SET approval_status = 'approved'
WHERE source_system = 'products' 
  AND source_id = '5ca8f114-af75-4e80-9683-004a20d0df3a';

-- 元テーブルへの逆同期を確認
SELECT 
    id,
    status,
    updated_at
FROM products
WHERE id = '5ca8f114-af75-4e80-9683-004a20d0df3a';
```

## 📊 モニタリングクエリ

### リアルタイム同期状況
```sql
SELECT 
    NOW() as current_time,
    COUNT(*) as total_products,
    COUNT(CASE WHEN synced_at > NOW() - INTERVAL '1 hour' THEN 1 END) as synced_last_hour,
    COUNT(CASE WHEN synced_at > NOW() - INTERVAL '1 day' THEN 1 END) as synced_last_day,
    MAX(synced_at) as latest_sync
FROM products_master;
```

### トリガーの確認
```sql
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%sync%master%'
ORDER BY event_object_table, trigger_name;
```

## ⚠️ トラブルシューティング

### 問題1: 画像URLが表示されない
**原因**: ソースデータのJSONB構造が想定と異なる

**解決策**:
```sql
-- ソースデータの構造を確認
SELECT 
    id,
    jsonb_pretty(ebay_api_data) as ebay_data,
    jsonb_pretty(scraped_data) as scraped_data,
    image_urls
FROM products
WHERE id = '対象のID'
LIMIT 1;

-- 手動で画像URL修復
SELECT * FROM repair_missing_images();
```

### 問題2: トリガーが動作しない
**原因**: トリガーが正しく設定されていない

**解決策**:
```sql
-- トリガーの再作成
DROP TRIGGER IF EXISTS trigger_sync_products_to_master ON products;
CREATE TRIGGER trigger_sync_products_to_master
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION sync_products_to_master();

-- トリガーの動作確認
SELECT * FROM verify_sync_system();
```

### 問題3: 重複レコード
**原因**: 初期移行を複数回実行した

**解決策**:
```sql
-- 重複を確認
SELECT source_system, source_id, COUNT(*)
FROM products_master
GROUP BY source_system, source_id
HAVING COUNT(*) > 1;

-- 古い重複を削除（最新のみ保持）
DELETE FROM products_master pm1
WHERE id IN (
    SELECT pm2.id
    FROM products_master pm2
    WHERE pm2.source_system = pm1.source_system 
      AND pm2.source_id = pm1.source_id
      AND pm2.id > pm1.id
);
```

## 📈 パフォーマンス最適化

### インデックスの確認
```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'products_master'
ORDER BY indexname;
```

### 推奨インデックス
```sql
-- 複合インデックス（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_products_master_source 
    ON products_master(source_system, source_id);

CREATE INDEX IF NOT EXISTS idx_products_master_approval 
    ON products_master(approval_status);

CREATE INDEX IF NOT EXISTS idx_products_master_synced 
    ON products_master(synced_at DESC);
```

## 🎯 次のステップ

1. ✅ トリガーシステムの作成完了
2. ✅ 初期データ移行完了
3. ✅ データ検証完了
4. 🔄 フロントエンド（承認画面）との連携テスト
5. 📊 リアルタイム同期の監視
6. 🚀 本番環境への展開

## 📞 サポート

問題が発生した場合は、以下の情報を収集してください：
- エラーメッセージ全文
- 実行したSQLクエリ
- `SELECT * FROM check_sync_integrity();` の結果
- `SELECT * FROM generate_sync_report();` の結果
