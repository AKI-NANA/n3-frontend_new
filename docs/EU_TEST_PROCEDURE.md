# EU責任者情報テスト実行手順

## 📋 テスト目的
既存の商品データにEU責任者情報を追加し、編集モーダルで正しく表示されるかを確認する

---

## ステップ1: データベースマイグレーション実行

### 1-1. Supabaseダッシュボードにアクセス
https://supabase.com/dashboard/project/YOUR_PROJECT_ID

### 1-2. SQL Editorを開く
左メニュー > SQL Editor > New Query

### 1-3. マイグレーションSQLを実行
以下のファイル内容を貼り付けて実行：
```
/supabase/migrations/20251021_eu_responsible_persons.sql
```

**実行内容:**
- ✅ `eu_responsible_persons` テーブル作成
- ✅ `products` テーブルにEU責任者フィールド10項目追加
- ✅ サンプルデータ5件挿入（Bandai, LEGO, Nintendo, Sony, Hasbro）

**確認方法:**
```sql
-- テーブルが作成されているか確認
SELECT * FROM eu_responsible_persons;

-- productsテーブルに新しいカラムがあるか確認
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name LIKE 'eu_%';
```

---

## ステップ2: 既存商品にサンプルEUデータを追加

### 2-1. SQL Editorで以下のファイルを実行
```
/supabase/add_sample_eu_data.sql
```

**実行内容:**
- 最新の商品5件にEU責任者情報を追加
  - 1件目: LEGO
  - 2件目: Nintendo
  - 3件目: Bandai
  - 4件目: Sony
  - 5件目: Hasbro

### 2-2. 更新結果を確認
```sql
-- EU情報が追加された商品を確認
SELECT 
  id,
  title,
  sku,
  eu_responsible_company_name,
  eu_responsible_city,
  eu_responsible_country,
  updated_at
FROM products
WHERE eu_responsible_company_name IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

**期待される結果:**
```
| id | title | sku | eu_responsible_company_name | eu_responsible_city | eu_responsible_country |
|----|-------|-----|---------------------------|-------------------|---------------------|
| 1  | ...   | ... | LEGO System A/S           | Billund           | DK                  |
| 2  | ...   | ... | Nintendo of Europe GmbH   | Frankfurt         | DE                  |
| 3  | ...   | ... | Bandai Namco Europe S.A.S | Lyon              | FR                  |
```

---

## ステップ3: アプリケーション再起動

```bash
# 開発サーバーを再起動
npm run dev
```

---

## ステップ4: UIでの動作確認

### 4-1. 編集画面にアクセス
```
http://localhost:3000/tools/editing
```

### 4-2. 商品一覧が表示されることを確認
- 商品が表示されない場合: 
  - ブラウザのコンソールでエラーを確認
  - ネットワークタブで `/api/products` のレスポンスを確認

### 4-3. 商品をクリックして編集モーダルを開く
EU情報が追加された商品（最新の5件のいずれか）を選択

### 4-4. 「データ確認」タブを開く

### 4-5. **「EU責任者情報 (GPSR対応)」**セクションを確認

**期待される表示:**
```
┌─────────────────────────────────────────┐
│ 🇪🇺 EU責任者情報 (GPSR対応)              │
├─────────────────────────────────────────┤
│                                          │
│ 会社名 / Company Name *                  │
│ [LEGO System A/S                      ] │
│                                          │
│ 住所1 *          │ 住所2                │
│ [Aastvej 1    ]  │ [               ]    │
│                                          │
│ 市 *             │ 州/県                │
│ [Billund      ]  │ [               ]    │
│                                          │
│ 郵便番号 *       │ 国コード *           │
│ [7190         ]  │ [DK             ]    │
│                                          │
│ メール           │ 電話                 │
│ [consumer.se...]│ [+45 79 50 60 70]    │
│                                          │
│ 連絡先URL                                │
│ [https://www.lego.com/service/contact ] │
│                                          │
│ ✅ EU責任者情報が完全です - eBay EU出品可能│
└─────────────────────────────────────────┘
```

### 4-6. ブラウザコンソールでデバッグ出力を確認

**期待される出力:**
```javascript
📦 Fetched products with EU data: 100
🇪🇺 First product EU info: {
  company: "LEGO System A/S",
  city: "Billund", 
  country: "DK"
}

ProductModal - product: {...}
🇪🇺 EU Responsible Person Data: {
  company: "LEGO System A/S",
  address: "Aastvej 1",
  city: "Billund",
  country: "DK"
}
```

---

## ステップ5: テストケース

### ✅ テストケース1: EU情報がある商品
- [ ] EU責任者セクションが表示される
- [ ] 全フィールドに正しいデータが入っている
- [ ] 「✅ EU責任者情報が完全です」メッセージが表示される

### ✅ テストケース2: EU情報がない商品（N/A）
- [ ] EU責任者セクションが表示される
- [ ] 「⚠ eBay EU出品には責任者情報が必要です」警告が表示される
- [ ] フィールドは空または"N/A"
- [ ] 「✗ EU責任者情報が不完全です」メッセージが表示される

### ✅ テストケース3: フィールド編集
- [ ] 各フィールドに入力できる
- [ ] 国コードが自動的に大文字になる
- [ ] 最大文字数制限が機能する
- [ ] 「保存」ボタンをクリックできる

### ✅ テストケース4: バリデーション
- [ ] 必須項目（*マーク）が空の場合、警告が表示される
- [ ] 完全性チェックが正しく動作する

---

## 🐛 トラブルシューティング

### 問題1: EU責任者セクションが表示されない
**原因:** マイグレーションが実行されていない
**解決:** ステップ1を再実行

### 問題2: 商品データが表示されない
**原因:** テーブル名が間違っている
**解決:** `lib/supabase/products.ts` で `yahoo_scraped_products` → `products` に変更済み

### 問題3: EU情報が空のまま
**原因:** サンプルデータが挿入されていない
**解決:** ステップ2を再実行

### 問題4: コンソールにエラーが出る
**チェック項目:**
- [ ] Supabase接続エラー → 環境変数を確認
- [ ] テーブル存在エラー → マイグレーションを確認
- [ ] カラム存在エラー → `products` テーブルのスキーマを確認

---

## 📊 確認すべきポイント

### データベース層
```sql
-- EU責任者マスタにデータがあるか
SELECT COUNT(*) FROM eu_responsible_persons;
-- 期待: 5

-- productsテーブルにEU情報があるか
SELECT COUNT(*) 
FROM products 
WHERE eu_responsible_company_name IS NOT NULL;
-- 期待: 5以上
```

### API層
```bash
# ブラウザまたはcurlでテスト
curl http://localhost:3000/api/eu-responsible

# 期待されるレスポンス:
{
  "data": [
    {
      "id": 1,
      "manufacturer": "Bandai",
      "company_name": "Bandai Namco Europe S.A.S",
      ...
    }
  ],
  "count": 5
}
```

### UI層
- [ ] セクションが表示される
- [ ] データが正しく表示される
- [ ] 編集できる
- [ ] 保存できる

---

## ✅ テスト完了チェックリスト

- [ ] ステップ1: マイグレーション実行完了
- [ ] ステップ2: サンプルデータ追加完了
- [ ] ステップ3: アプリ再起動完了
- [ ] ステップ4: UI表示確認完了
- [ ] ステップ5: 全テストケース確認完了

---

## 🎉 成功時の状態

**データベース:**
- `eu_responsible_persons` テーブル: 5件のデータ
- `products` テーブル: 最新5件にEU情報あり

**UI:**
- 編集モーダルにEU責任者セクションが表示される
- データが正しく表示される
- 編集・保存が可能

**コンソール:**
- エラーなし
- デバッグ出力でEU情報が確認できる

---

**作成日:** 2025-10-21
**テスター:** _______________
**結果:** _______________
