# Claude Desktop 接続テスト用プロンプト集

## 🧪 テスト1: 基本接続確認（最初に実行）

```
hs_codesテーブルから1件だけ取得して表示してください
```

**期待される結果**:
```
SELECT * FROM hs_codes LIMIT 1;

結果:
- code: 8471.30.0100
- description: Portable automatic data processing machines...
```

---

## 🧪 テスト2: HTSコード検索

```
hs_codesテーブルで「camera」を含むHTSコードを5件取得してください
```

**期待される結果**:
```
SELECT * FROM hs_codes 
WHERE description ILIKE '%camera%'
LIMIT 5;

5件のカメラ関連HTSコードが表示される
```

---

## 🧪 テスト3: 関税率取得

```
customs_dutiesテーブルから以下の関税率を取得してください：

HTSコード: 9006.91.0000
原産国: CN
```

**期待される結果**:
```
SELECT * FROM customs_duties
WHERE hts_code = '9006.91.0000'
  AND origin_country = 'CN';

結果: duty_rate = 0.1025 (10.25%)
```

---

## 🧪 テスト4: 単一商品の完全処理

```
以下の商品について、HTSコードと関税率を判定してください：

商品名: Canon EOS カメラ三脚
価格: 3,000円
説明: 一眼レフカメラ用の軽量アルミニウム三脚

処理手順:
1. hs_codesテーブルで適切なHTSコードを検索
2. 最適なコードを選択
3. 原産国をCN（中国）と判定
4. customs_dutiesテーブルで関税率を取得
5. 結果をJSON形式で表示

期待される出力形式:
{
  "product_name": "Canon EOS カメラ三脚",
  "price_jpy": 3000,
  "hts_code": "選択したコード",
  "hts_description": "説明",
  "origin_country": "CN",
  "duty_rate": 0.xxxx,
  "duty_rate_percent": "xx.xx%",
  "reasoning": "なぜこのコードを選んだか"
}
```

---

## 🧪 テスト5: データベースへの保存（重要）

```
以下の商品をproductsテーブルに保存してください：

商品名: Canon EOS カメラ三脚
価格: 3,000円
HTSコード: 9006.91.0000
原産国: CN
関税率: 10.25%

保存用SQL:
INSERT INTO products (
  title,
  price_jpy,
  listing_data
) VALUES (
  'Canon EOS カメラ三脚',
  3000,
  '{"hts_code": "9006.91.0000", "origin_country": "CN", "duty_rate": 0.1025}'::jsonb
)
RETURNING id;

実行後、保存されたIDを教えてください。
```

---

## 🎯 テスト6: ミニバッチ処理（3件）

```
以下の3件の商品を一括処理してください：

商品データ:
1. Canon EOS カメラ三脚, 3000円
2. Sony WH-1000XM5 ヘッドホン, 45000円  
3. Apple AirPods Pro, 35000円

各商品について:
1. hs_codesテーブルでHTSコード検索
2. 原産国判定（主にCN）
3. customs_dutiesテーブルで関税率取得
4. 結果を表形式で表示

期待される出力:
| 商品名 | HTSコード | 原産国 | 関税率 |
|--------|----------|--------|--------|
| ...    | ...      | ...    | ...    |
```

---

## 🚀 テスト7: 実際のバッチ処理（保存まで）

```
以下のCSVデータを処理してproductsテーブルに保存してください：

商品名,価格,カテゴリ
Canon EOS カメラ三脚,3000,カメラ用品
Sony WH-1000XM5 ヘッドホン,45000,オーディオ
Apple AirPods Pro,35000,オーディオ

処理内容:
1. 各商品のHTSコードを判定（hs_codesテーブル検索）
2. 原産国を判定（主にCN）
3. 関税率を取得（customs_dutiesテーブル検索）
4. productsテーブルに保存

完了後、以下の情報を表示:
- 処理件数
- 成功/失敗件数
- 各商品の保存ID
- HTSコード分布
- 平均関税率
```

---

## 🔍 トラブルシューティング用クエリ

### テーブル一覧を確認
```
データベース内のテーブル一覧を表示してください

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### テーブル構造を確認
```
productsテーブルの構造を表示してください

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products';
```

### レコード数を確認
```
各テーブルのレコード数を表示してください

SELECT 
  (SELECT COUNT(*) FROM hs_codes) as hs_codes_count,
  (SELECT COUNT(*) FROM hts_countries) as countries_count,
  (SELECT COUNT(*) FROM customs_duties) as customs_duties_count,
  (SELECT COUNT(*) FROM products) as products_count;
```

### 最近追加されたレコードを確認
```
productsテーブルで最近追加された5件を表示してください

SELECT id, title, price_jpy, listing_data, created_at
FROM products
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📊 パフォーマンステスト

### 大量データ検索
```
hs_codesテーブルで「electronic」を含むすべてのコードを検索してください

SELECT COUNT(*) as count,
       SUBSTRING(code, 1, 4) as chapter
FROM hs_codes
WHERE description ILIKE '%electronic%'
GROUP BY chapter
ORDER BY count DESC;
```

---

## ✅ テスト完了チェックリスト

実行順序でテストしてください:

- [ ] **テスト1**: 基本接続確認（必須）
- [ ] **テスト2**: HTSコード検索
- [ ] **テスト3**: 関税率取得
- [ ] **テスト4**: 単一商品の完全処理
- [ ] **テスト5**: データベースへの保存（重要）
- [ ] **テスト6**: ミニバッチ処理
- [ ] **テスト7**: 実際のバッチ処理

すべて成功したら、本番運用開始可能です！

---

## 🎉 成功後の使い方

### 日常の使用パターン

**ステップ1**: Yahoo Auctionからデータ取得
```
Next.jsシステムでCSVエクスポート
```

**ステップ2**: Claude Desktopで一括処理
```
CSVデータをコピー
Claude Desktopに貼り付け
「処理して保存して」
→ 5分で完了
```

**ステップ3**: Next.jsで確認
```
処理結果を確認
拡張CSVエクスポート
eBay出品
```

---

## 💡 よくある質問

### Q1: エラーが出た場合は？
```
1. エラーメッセージをコピー
2. Claude Desktopに貼り付け
3. 「このエラーを解決して」と依頼
→ 自動で対処法を提案
```

### Q2: 保存されたか確認したい
```
「productsテーブルで最近追加された10件を表示して」
→ すぐに確認可能
```

### Q3: 間違ったデータを削除したい
```
「productsテーブルでID=123のレコードを削除して」
→ すぐに削除
```

---

**現在の状態**: ✅ テストプロンプト準備完了  
**次のステップ**: パスワード設定 → Claude Desktop再起動 → テスト実行
