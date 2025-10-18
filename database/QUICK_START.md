# 🚀 Supabase マイグレーション - 超簡単ガイド

## ✅ やること（たった3ステップ）

### Step 1: Supabaseを開く
```
https://supabase.com/dashboard
```
プロジェクト: **zdzfpucdyxdlavkgrvil** を選択

### Step 2: SQL Editorを開く
左メニュー → **SQL Editor** → **New Query**

### Step 3: SQLを実行
以下のファイルをコピー&ペースト → **RUN** をクリック

```
database/MIGRATION_EXISTING_TABLES.sql
```

---

## ✅ これだけ！

実行後、以下のメッセージが表示されればOK：

```
✅ マイグレーション完了！

作成されたテーブル:
  1. ebay_fulfillment_policies
  2. ebay_country_shipping_settings  
  3. shipping_excluded_countries

初期データ:
  - 除外国: 9件

既存テーブルとの連携:
  - shipping_country_zones (国リスト)
  - shipping_zones (Zoneマスター)
  - shipping_rates (送料マトリックス)

🚀 準備完了！配送ポリシー自動生成が使えます
```

---

## 🎯 確認方法

左メニュー → **Table Editor** → 以下が表示されればOK：

- ✅ `ebay_fulfillment_policies`
- ✅ `ebay_country_shipping_settings`
- ✅ `shipping_excluded_countries`

`shipping_excluded_countries` を開くと、9件の除外国が登録されています。

---

## 🌟 既存テーブルの活用

### 自動で連携されるテーブル

このマイグレーションは、**既存のテーブルを活用**します：

✅ `shipping_country_zones` - 189カ国のリスト  
✅ `shipping_zones` - Zone 1-8のマスター  
✅ `shipping_rates` - 送料マトリックス  
✅ `shipping_carriers` - 配送業者

**何も削除されません！** 新しいテーブルを追加するだけです。

---

## 🎉 完了後

ブラウザで確認：
```
http://localhost:3003/shipping-policy-manager
```

「⚡ 自動生成」タブで配送ポリシーを作成できます！

---

## 🔧 トラブルシューティング

### エラー: "already exists"
→ 既にテーブルが存在します。問題ありません！

### エラー: "permission denied"  
→ Supabaseのプロジェクト設定を確認してください

### エラーが解決しない
→ `database/README.md` を参照

---

**所要時間: 約1分** ⏱️

マイグレーション実行後、すぐに配送ポリシー自動生成が使えます！
