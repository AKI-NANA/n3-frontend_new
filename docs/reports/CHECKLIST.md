# ✅ NAGANO-3 マスターテーブル完全構築チェックリスト

## 📋 実行前の準備

- [ ] Supabase SQL Editorを開く
- [ ] VSCode/エディタを開く
- [ ] ターミナルを開く

## 🔧 ステップ1: データベースカラム追加 (5分)

### 1-1. SQLファイルを開く
```
ファイル: /Users/aritahiroaki/n3-frontend_new/ADD_COLUMNS.sql
```

### 1-2. Supabase SQL Editorで実行
- [ ] ADD_COLUMNS.sql の内容をコピー
- [ ] Supabase SQL Editorにペースト
- [ ] 「Run」ボタンをクリック
- [ ] エラーが出ないことを確認

### 1-3. 確認クエリを実行
```sql
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
```

**期待される結果:**
- [ ] 18行が返されること
- [ ] 各カラムのdata_typeが正しいこと

## 🔧 ステップ2: APIコード修正 (5分)

### 2-1. shipping-calculate APIを修正

**ファイルパス:** 
```
app/api/tools/shipping-calculate/route.ts
```

**修正箇所:** 約115行目
```typescript
// ❌ 修正前
sm_profit_margin: breakdown.profitMargin,

// ✅ 修正後
profit_margin: breakdown.profitMargin,
```

**手順:**
1. [ ] VSCodeでファイルを開く
2. [ ] Ctrl+F で "sm_profit_margin" を検索
3. [ ] "profit_margin" に置換
4. [ ] ファイルを保存

### 2-2. profit-calculate APIを修正

**ファイルパス:**
```
app/api/tools/profit-calculate/route.ts
```

**修正箇所:** 約115行目 (同じ修正)
```typescript
// ❌ 修正前
sm_profit_margin: breakdown.profitMargin,

// ✅ 修正後
profit_margin: breakdown.profitMargin,
```

**手順:**
1. [ ] VSCodeでファイルを開く
2. [ ] Ctrl+F で "sm_profit_margin" を検索
3. [ ] "profit_margin" に置換
4. [ ] ファイルを保存

## 🔧 ステップ3: フロントエンド再起動 (1分)

### 3-1. 開発サーバーを再起動
```bash
cd /Users/aritahiroaki/n3-frontend_new
npm run dev
```

**確認:**
- [ ] "ready - started server on 0.0.0.0:3000" が表示される
- [ ] エラーが出ないこと

## 🔧 ステップ4: 動作テスト (5分)

### 4-1. 承認ページを開く
```
URL: http://localhost:3000/approval
```

### 4-2. 商品を選択
- [ ] 商品を1つチェック (例: ID 322)

### 4-3. 送料計算を実行
- [ ] 「送料計算」ボタンをクリック
- [ ] エラーが出ないことを確認
- [ ] "送料計算完了" が表示されること

**確認するエラー (これが出なければOK):**
```
❌ Could not find the 'sm_profit_margin' column
```

### 4-4. データベース確認
```sql
SELECT 
  id,
  title,
  ddu_price_usd,
  ddp_price_usd,
  shipping_cost_usd,
  profit_margin,
  sm_profit_margin,
  sm_lowest_price,
  category_name
FROM products_master
WHERE id = '322'  -- テストしたIDに変更
LIMIT 1;
```

**期待される結果:**
- [ ] ddu_price_usd にデータが入っている
- [ ] ddp_price_usd にデータが入っている
- [ ] shipping_cost_usd にデータが入っている
- [ ] profit_margin にデータが入っている
- [ ] sm_profit_margin は NULL または 0 (まだBrowse APIを実行していないため)

## 🔧 ステップ5: 全ツールの動作確認 (10分)

### 5-1. 利益計算
- [ ] 同じ商品で「利益計算」を実行
- [ ] エラーが出ないこと
- [ ] profit_margin が更新されること

### 5-2. カテゴリ分析
- [ ] 「カテゴリ分析」を実行
- [ ] category_name が設定されること
- [ ] category_number が設定されること

### 5-3. SellerMirror分析
- [ ] 「SM分析」を実行
- [ ] sm_sales_count が設定されること
- [ ] ebay_category_id が設定されること

### 5-4. Browse API検索
- [ ] 「一括リサーチ」を実行 (SM分析を含む)
- [ ] sm_lowest_price が設定されること
- [ ] sm_competitor_count が設定されること
- [ ] sm_profit_margin が設定されること

## ✅ 完了条件

全てのチェックボックスにチェックが入っていること:

**データベース:**
- [ ] 18個のカラムが追加されている
- [ ] 確認クエリで18行が返される

**APIコード:**
- [ ] shipping-calculate が修正されている
- [ ] profit-calculate が修正されている

**動作確認:**
- [ ] 送料計算がエラーなく完了する
- [ ] 利益計算がエラーなく完了する
- [ ] カテゴリ分析がエラーなく完了する
- [ ] SM分析がエラーなく完了する
- [ ] Browse API検索がエラーなく完了する

**データ確認:**
- [ ] 各カラムにデータが正しく保存されている
- [ ] profit_margin と sm_profit_margin が区別されている

## 📊 トラブルシューティング

### エラー: "Could not find the 'sm_profit_margin' column"
**原因:** APIコードがまだ修正されていない  
**解決:** ステップ2を再実行

### エラー: "relation 'products_master' does not exist"
**原因:** テーブル名が間違っている  
**解決:** テーブル名を確認 (products_master か products か)

### カラムが追加されない
**原因:** SQLが実行されていない  
**解決:** ステップ1を再実行

### データが保存されない
**原因:** トリガーが動いていない可能性  
**解決:** テーブルのトリガーを確認

## 📝 メモ欄

```
実行日時: _______________

実行者: _______________

結果: [ ] 成功 / [ ] 失敗

備考:
_______________________________________
_______________________________________
_______________________________________
```

---
作成日: 2025-01-15
バージョン: 1.0
