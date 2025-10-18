# 🎯 配送ポリシー自動生成 - セットアップ完了ガイド

---

## ✅ 現在のエラー原因

```
❌ エラー: Could not find the table 'public.ebay_fulfillment_policies'
```

**原因**: Supabaseにテーブルが作成されていません。

---

## 🚀 解決方法（3ステップ）

### Step 1: Supabaseにログイン

```
https://supabase.com/dashboard
```

### Step 2: SQL Editorでスクリプト実行

1. 左メニュー → **SQL Editor**
2. **New Query** をクリック
3. 以下のファイルの内容を**コピー&ペースト**

```
database/SUPABASE_SETUP.sql
```

4. **RUN** をクリック

### Step 3: テーブル確認

左メニュー → **Table Editor** → 以下が表示されればOK：

- ✅ `ebay_fulfillment_policies`
- ✅ `ebay_country_shipping_settings`
- ✅ `shipping_excluded_countries`

---

## 📋 作成されるテーブル

### 1. ebay_fulfillment_policies
```
配送ポリシーのマスター

カラム:
- id (主キー)
- policy_name (ポリシー名)
- weight_category (重量カテゴリ)
- weight_min_kg (最小重量)
- weight_max_kg (最大重量)
- handling_time_days (ハンドリングタイム: 10日)
- marketplace_id (EBAY_US)
- is_active (有効/無効)
```

### 2. ebay_country_shipping_settings
```
国別送料設定（189カ国分が自動生成されます）

カラム:
- policy_id (ポリシーID)
- country_code (US, CA, GB...)
- zone_code (ZONE_1, ZONE_2...)
- shipping_cost (送料)
- handling_fee (Handling Fee)
- calculated_margin (利益率)
- is_ddp (DDP対応フラグ)
- is_excluded (除外フラグ)
```

### 3. shipping_excluded_countries
```
除外国マスター（初期データ9件）

除外国:
- KP: North Korea
- SY: Syria  
- IR: Iran
- CU: Cuba
- SD: Sudan
- SS: South Sudan
- AA/AE/AP: APO/FPO
```

---

## 🔗 送料計算ツールとの連携

**はい、完全に連携しています！**

### 連携フロー

```
1. 重量カテゴリ選択 (例: 中量級 0.5-1.0kg)
   ↓
2. CPASS FedEx参照
   Zone 1, 1.0kg → $25.30
   ↓
3. Zone別調整係数適用
   USA: ×1.35 → $34.15
   ↓
4. 自然な金額に丸め
   → $34.95
   ↓
5. Handling Fee計算
   USA DDP: 関税$23.83 × 50% = $11.92
   ↓
6. 利益率検証
   15.2% ✅
   ↓
7. DB保存
   ebay_country_shipping_settings に保存
```

---

## 🌍 国別設定

### 189カ国に対して以下を自動設定

```typescript
各国ごとに:
✅ 送料 (CPASS FedEx参照)
✅ Handling Fee (DDP/DDU別最適化)
✅ 利益率 (15%目標)
✅ Express/Standard/Economy利用可否
✅ DDP対応フラグ (USAのみtrue)
✅ 除外フラグ (制裁国等)
```

### 例: USA設定

```json
{
  "country_code": "US",
  "zone_code": "ZONE_1",
  "shipping_cost": 34.95,
  "handling_fee": 11.92,
  "express_available": true,
  "standard_available": true,
  "economy_available": false,
  "is_ddp": true,
  "calculated_margin": 0.152
}
```

### 例: UK設定

```json
{
  "country_code": "GB",
  "zone_code": "ZONE_2",
  "shipping_cost": 32.95,
  "handling_fee": 10.00,
  "express_available": true,
  "standard_available": true,
  "economy_available": false,
  "is_ddp": false,
  "calculated_margin": 0.286
}
```

---

## 🎯 使い方

### 自動生成手順

1. http://localhost:3003/shipping-policy-manager
2. 「⚡ 自動生成」タブ
3. 重量カテゴリ選択
4. ポリシー名入力
5. 参考商品価格入力 (例: $144.40)
6. 目標利益率選択 (15% or 20%)
7. 「🚀 配送ポリシーを自動生成」クリック
8. 約30秒で189カ国の送料計算完了！

### 結果

```
✅ ポリシーID: 1
✅ 対応国数: 181カ国
✅ 除外国数: 8カ国
✅ 平均利益率: 15.3%
```

---

## 📊 データベースに保存される内容

### ebay_fulfillment_policies (1件)
```sql
INSERT INTO ebay_fulfillment_policies VALUES (
  1,
  'Express 中量級 (0.5-1.0kg)',
  'medium',
  0.5,
  1.0,
  'EBAY_US',
  10,
  true
);
```

### ebay_country_shipping_settings (181件)
```sql
INSERT INTO ebay_country_shipping_settings VALUES
(1, 1, 'US', 'United States', 'ZONE_1', 34.95, 11.92, true, 0.152),
(2, 1, 'CA', 'Canada', 'ZONE_1', 29.95, 8.00, false, 0.173),
(3, 1, 'GB', 'United Kingdom', 'ZONE_2', 32.95, 10.00, false, 0.286),
... (181カ国分)
```

---

## 🔧 トラブルシューティング

### Q: テーブルが見つからない
A: `database/SUPABASE_SETUP.sql` を実行してください

### Q: permission denied エラー
A: RLSポリシーの問題です。SQLに含まれています

### Q: 既存のshipping_country_zonesを使いたい
A: `database/SUPABASE_MINIMAL_SETUP.sql` を使用してください

---

## 🎉 セットアップ後

Supabaseでスキーマを適用したら、すぐに使えます！

```bash
# 開発サーバー起動
npm run dev

# ブラウザでアクセス
http://localhost:3003/shipping-policy-manager

# 「⚡ 自動生成」をクリック！
```

---

**準備完了！配送ポリシー自動生成を楽しんでください！** 🚀
