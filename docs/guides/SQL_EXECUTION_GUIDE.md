# 🚀 SQL実行ガイド
## エラーなく確実にSQLを実行する方法

---

## ⚠️ よくあるエラー

### エラー: `syntax error at or near "```"`

**原因**: Markdownファイル内のコードブロック（```）をそのままコピーして実行しようとした

**解決**: このガイドの「実行用SQLファイル」を使用してください

---

## 📁 実行用SQLファイル一覧

### 1. **quick_fix_322.sql** ⭐ 即座に実行可能
- **目的**: 商品ID=322のデータを修正
- **安全性**: ✅ 1件のみ修正
- **所要時間**: 30秒

### 2. **bulk_fix_all.sql** ⚠️ 慎重に実行
- **目的**: 全商品の診断と一括修正
- **安全性**: ⚠️ 全商品に影響（バックアップ必須）
- **所要時間**: 5分

### 3. **database_diagnostic.sql** ✅ 安全（READ ONLY）
- **目的**: データベースの状態を診断
- **安全性**: ✅ データ変更なし
- **所要時間**: 1分

### 4. **debug_product_322.sql** ✅ 安全（READ ONLY）
- **目的**: 商品ID=322の詳細確認
- **安全性**: ✅ データ変更なし
- **所要時間**: 30秒

### 5. **fix_product_322.sql** ⚠️ 慎重に実行
- **目的**: 商品ID=322の段階的修正
- **安全性**: ⚠️ データ変更あり
- **所要時間**: 2分

---

## 🎯 推奨実行順序

### **初めての場合**

```
1. database_diagnostic.sql を実行（全体の状態確認）
   ↓
2. debug_product_322.sql を実行（ID=322の詳細確認）
   ↓
3. quick_fix_322.sql を実行（ID=322を修正）
   ↓
4. フロントエンドで動作確認
   ↓
5. 問題なければ bulk_fix_all.sql で全商品修正
```

---

## 📝 Supabaseでの実行方法

### ステップ1: Supabaseにログイン
1. https://supabase.com にアクセス
2. プロジェクトを選択
3. 左メニュー「SQL Editor」をクリック

### ステップ2: SQLファイルを開く
1. 実行したいSQLファイル（例: `quick_fix_322.sql`）をテキストエディタで開く
2. 内容を**全て**コピー

### ステップ3: SQLを実行
1. Supabase SQL Editorに貼り付け
2. 右上の「Run」ボタンをクリック
3. 結果を確認

### ステップ4: 結果の確認
- ✅ 緑色のチェックマーク → 成功
- ❌ 赤色のエラー → エラーメッセージを確認

---

## 🔍 各SQLファイルの使い方

### 📄 quick_fix_322.sql

```sql
-- このファイルの内容をそのままコピペして実行

-- 実行内容:
-- 1. 現在の状態確認
-- 2. price_jpy = 1500 に設定
-- 3. listing_data を初期化
-- 4. weight_g = 500 に設定
-- 5. 結果確認
```

**実行後の確認**:
- 最後のSELECT結果で `status` が `OK - 計算可能` になっていればOK

---

### 📄 bulk_fix_all.sql

```sql
-- 重要: PART 1 のみ実行して結果を確認
-- PART 2 は /* */ でコメントアウトされている

-- PART 1: 診断のみ実行（安全）
SELECT 'データ不足商品リスト' as report_type, ...

-- PART 2: 修正を実行する場合
-- コメント /* */ を外して実行
UPDATE products_master ...
```

**段階的実行**:
1. まず PART 1 全体を実行（診断のみ）
2. 結果を確認
3. 問題なければ PART 2 のコメントを外して実行
4. PART 3 で修正結果を確認

---

### 📄 database_diagnostic.sql

```sql
-- 全てのSELECT文を実行
-- データは変更されない（安全）

-- 8つのステップがある
-- 各ステップの結果を順番に確認
```

**結果の見方**:
- `ステップ1`: 全商品数とデータの有無
- `ステップ2`: ID=322の詳細
- `ステップ3`: データ不足の商品リスト
- `ステップ4`: フィールド別充填率
- `ステップ8`: 送料計算可能な商品の割合

---

## ⚠️ 注意事項

### 実行前チェックリスト

- [ ] 本番環境ではない（開発環境）
- [ ] バックアップを取得済み
- [ ] どのSQLを実行するか理解している
- [ ] UPDATE文の場合、WHERE条件を確認済み

### バックアップの取り方

```sql
-- products_masterテーブルのバックアップ
CREATE TABLE products_master_backup AS
SELECT * FROM products_master;

-- 確認
SELECT COUNT(*) FROM products_master_backup;

-- 復元が必要になった場合
-- DROP TABLE products_master;
-- ALTER TABLE products_master_backup RENAME TO products_master;
```

---

## 🚨 エラーが出た場合

### エラー例1: `syntax error at or near "```"`

**原因**: Markdownのコードブロック記号をコピーした

**解決**:
```
❌ Markdownファイルから直接コピー
✅ SQLファイル（.sql）から直接コピー
```

### エラー例2: `column "xxx" does not exist`

**原因**: 存在しないカラム名を指定

**解決**:
```sql
-- テーブル構造を確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products_master';
```

### エラー例3: `invalid input syntax for type json`

**原因**: JSONB型への不正な値の挿入

**解決**:
```sql
-- 正しい形式
'500'::jsonb  -- 文字列から変換
jsonb '500'   -- 直接指定
```

---

## ✅ 成功の確認方法

### 1. SQLの実行結果
```
✅ Status: Success
   1 row(s) affected
```

### 2. データの確認
```sql
SELECT 
  id,
  price_jpy,
  listing_data->>'weight_g' as weight_g
FROM products_master
WHERE id = 322;

-- 期待される結果:
-- id: 322
-- price_jpy: 1500
-- weight_g: 500
```

### 3. フロントエンドの確認
1. ブラウザで `/tools/editing` を開く
2. ID=322の商品を確認
3. 「取得価格(JPY)」に 1500 が表示
4. 「重さ(g)」に 500 が表示
5. 「送料計算」をクリック
6. エラーが出ないことを確認

---

## 🎓 SQL初心者向けTips

### SELECT文（データ確認）
```sql
-- 安全: データを見るだけ
SELECT * FROM products_master WHERE id = 322;
```

### UPDATE文（データ変更）
```sql
-- 危険: データを変更する
-- 必ず WHERE 条件をつける
UPDATE products_master 
SET price_jpy = 1500 
WHERE id = 322;  -- ← これがないと全商品が変更される！
```

### INSERT文（データ追加）
```sql
-- 危険: 新しいデータを追加
INSERT INTO products_master (title, price_jpy) 
VALUES ('テスト商品', 1000);
```

### DELETE文（データ削除）
```sql
-- 非常に危険: データを削除
-- 基本的に使わない
DELETE FROM products_master WHERE id = 999;
```

---

## 📞 サポート

問題が解決しない場合:

1. エラーメッセージをコピー
2. 実行したSQLをコピー
3. 以下の情報を添えて相談:
   - どのSQLファイルを実行したか
   - エラーメッセージ全文
   - 実行前のデータの状態

---

## 🎉 まとめ

### 最も簡単な方法

1. **`quick_fix_322.sql`** を開く
2. 内容を**全て**コピー
3. Supabase SQL Editorに貼り付け
4. 「Run」をクリック
5. 結果で `OK - 計算可能` を確認

これだけです！
