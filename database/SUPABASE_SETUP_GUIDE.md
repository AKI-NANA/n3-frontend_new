# Supabase セットアップ手順

## 🚀 配送ポリシー管理システムのデータベース準備

---

## Step 1: Supabase Dashboardにログイン

```
https://supabase.com/dashboard
```

あなたのプロジェクトを選択してください。

---

## Step 2: SQL Editorを開く

1. 左側のメニューから「**SQL Editor**」をクリック
2. 「**New Query**」ボタンをクリック

---

## Step 3: SQLスクリプトを実行

### コピーするファイル
```
database/SUPABASE_SETUP.sql
```

### 実行手順

1. `SUPABASE_SETUP.sql` の内容を**全てコピー**
2. SQL Editorに**ペースト**
3. 右下の「**RUN**」ボタンをクリック
4. 「**Success. No rows returned**」と表示されればOK！

---

## Step 4: テーブル確認

### Table Editorで確認

左メニュー → **Table Editor** → 以下のテーブルが表示されているか確認：

- ✅ `ebay_fulfillment_policies`
- ✅ `ebay_country_shipping_settings`
- ✅ `shipping_excluded_countries`

---

## Step 5: 初期データ確認

### shipping_excluded_countries を開く

除外国が9件登録されているか確認：

```
KP - North Korea
SY - Syria
IR - Iran
CU - Cuba
SD - Sudan
SS - South Sudan
AA - APO/FPO Americas
AE - APO/FPO Europe
AP - APO/FPO Pacific
```

---

## ✅ セットアップ完了！

これで配送ポリシー自動生成システムが使えるようになりました。

### 次のステップ

1. ブラウザで http://localhost:3003/shipping-policy-manager にアクセス
2. 「⚡ 自動生成」タブを選択
3. 重量カテゴリを選択
4. 「🚀 配送ポリシーを自動生成」をクリック

---

## 🔧 トラブルシューティング

### エラー: "permission denied"

RLSポリシーの問題です。以下のSQLを実行：

```sql
ALTER TABLE public.ebay_fulfillment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_country_shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_excluded_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON public.ebay_fulfillment_policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.ebay_country_shipping_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.shipping_excluded_countries FOR ALL USING (true) WITH CHECK (true);
```

### エラー: "table already exists"

すでにテーブルが存在する場合は、以下で削除してから再実行：

```sql
DROP TABLE IF EXISTS public.ebay_country_shipping_settings CASCADE;
DROP TABLE IF EXISTS public.ebay_fulfillment_policies CASCADE;
DROP TABLE IF EXISTS public.shipping_excluded_countries CASCADE;
```

その後、`SUPABASE_SETUP.sql` を再実行してください。

---

## 📊 テーブル構造

### ebay_fulfillment_policies
```
配送ポリシーのマスターテーブル
- id (主キー)
- policy_name (ポリシー名)
- weight_category (重量カテゴリ)
- weight_min_kg, weight_max_kg (重量範囲)
- handling_time_days (ハンドリングタイム)
- marketplace_id (EBAY_US等)
```

### ebay_country_shipping_settings
```
国別の送料設定（189カ国分）
- id (主キー)
- policy_id (外部キー)
- country_code (US, CA, GB...)
- shipping_cost (送料)
- handling_fee (Handling Fee)
- calculated_margin (利益率)
```

### shipping_excluded_countries
```
除外国マスター
- country_code (国コード)
- country_name (国名)
- exclusion_type (除外理由タイプ)
- reason (理由)
```

---

## 🎉 準備完了！

セットアップが完了したら、配送ポリシー自動生成を試してみてください！
