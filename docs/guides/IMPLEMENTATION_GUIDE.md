# products_master 統合実装手順

## 📋 Phase 1: データベース作成 (15分)

### 手順1: Supabase SQL Editorを開く

1. https://supabase.com にアクセス
2. プロジェクト `zdzfpucdyxdlavkgrvil` を開く
3. 左サイドバーから **SQL Editor** を選択

### 手順2: SQLを実行

1. **New query** をクリック
2. `/Users/aritahiroaki/n3-frontend_new/01_create_products_master.sql` の内容をコピー&ペースト
3. **Run** ボタンをクリック

### 手順3: 結果確認

以下のクエリで確認:

```sql
-- テーブルが作成されたか確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'products_master'
);

-- データ件数確認
SELECT 
    source_system,
    COUNT(*) as total
FROM products_master
GROUP BY source_system
ORDER BY source_system;

-- 承認ステータス別の件数
SELECT 
    approval_status,
    COUNT(*) as total
FROM products_master
GROUP BY approval_status;
```

### 期待される結果

```
source_system | total
--------------|------
yahoo_scraped | XXX
inventory     | XXX
mystical      | XXX
ebay          | XXX

approval_status | total
----------------|------
pending         | XXX
approved        | XXX
rejected        | XXX
```

---

## 📋 Phase 2: Next.js API Routes作成 (30分)

### 完了したらこちらに進みます

この手順書はPhase 1完了後に更新します。

---

## ⚠️ トラブルシューティング

### エラー: "relation already exists"
→ products_masterテーブルが既に存在しています。以下で削除してから再実行:
```sql
DROP TABLE IF EXISTS products_master CASCADE;
```

### エラー: "column does not exist"
→ ソーステーブルのカラム名が異なる可能性があります。エラーメッセージを確認してください。

### データが0件
→ ソーステーブルにデータが存在するか確認:
```sql
SELECT 'yahoo_scraped' as source, COUNT(*) FROM yahoo_scraped_products
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory_products
UNION ALL
SELECT 'mystical', COUNT(*) FROM mystical_japan_treasures_inventory
UNION ALL
SELECT 'ebay', COUNT(*) FROM ebay_inventory;
```

---

## 📞 次のステップ

Phase 1が完了したら、以下を報告してください:

1. ✅ products_masterテーブルが作成された
2. ✅ データが統合された (件数を報告)
3. ✅ エラーがなかった

その後、Next.js側のコード実装に進みます。
