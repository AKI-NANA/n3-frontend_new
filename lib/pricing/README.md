# 統合利益計算サービス (Integrated Pricing Service)

## 概要

すべてのマーケットプレイス（Amazon、eBay、Shopee等）で共通利用できる価格計算エンジンです。
`marketplace_settings`テーブルを参照し、正確な手数料・送料・税金・利益を計算します。

## 主要機能

1. **汎用価格計算**: 任意のマーケットプレイスで利用可能
2. **目標利益からの逆算**: 目標利益額または利益率から販売価格を算出
3. **送料計算**: `shipping_rules`テーブルを参照した動的送料計算
4. **為替換算**: JPYから各マーケットプレイスの現地通貨へ自動変換
5. **手数料計算**: 販売手数料、固定手数料、越境手数料、VAT/税金を考慮
6. **一括計算**: 複数商品・複数マーケットプレイスの価格を一度に計算
7. **価格比較**: 最も利益が高いマーケットプレイスを自動選択

## 計算式

### 基本計算式

```
販売価格 = (原価 + 送料 + 目標利益 + 固定手数料) / (1 - 総手数料率)

総手数料率 = 販売手数料率 + 越境手数料率 + VAT税率
```

### 利益計算

```
利益 = 販売価格 - (原価 + 送料 + マーケットプレイス手数料)
利益率 = 利益 / 販売価格
```

## 使用方法

### 1. 単一商品の価格計算

```typescript
import { IntegratedPricingService } from '@/lib/pricing/IntegratedPricingService'

const pricingService = new IntegratedPricingService()

const result = await pricingService.calculate({
  marketplace_id: 'AMAZON_JP',
  cost_jpy: 5000,
  target_profit_jpy: 1000,
  weight_g: 500,
  shipping_method: 'FBA_STANDARD',
  exchange_rate: 150,
})

console.log('販売価格:', result.selling_price)
console.log('利益:', result.profit_local)
console.log('利益率:', result.profit_margin)
```

### 2. 複数マーケットプレイスの価格比較

```typescript
const comparison = await pricingService.comparePrices(
  {
    cost_jpy: 5000,
    target_profit_rate: 0.20,
    weight_g: 500,
  },
  ['AMAZON_JP', 'AMAZON_US', 'EBAY_US', 'SHOPEE_SG']
)

console.log('最も利益が高いマーケット:', comparison.best_marketplace)
console.log('最大利益:', comparison.best_profit_jpy)
```

### 3. 一括計算

```typescript
const results = await pricingService.calculateBulk([
  {
    marketplace_id: 'AMAZON_JP',
    cost_jpy: 5000,
    target_profit_rate: 0.20,
  },
  {
    marketplace_id: 'EBAY_US',
    cost_jpy: 5000,
    target_profit_rate: 0.25,
  },
])

results.forEach((result) => {
  console.log(`${result.currency}${result.selling_price}`)
})
```

## APIエンドポイント

### POST /api/pricing/calculate

単一商品の価格計算

**リクエスト例:**

```json
{
  "marketplace_id": "AMAZON_JP",
  "cost_jpy": 5000,
  "target_profit_jpy": 1000,
  "weight_g": 500,
  "shipping_method": "FBA_STANDARD",
  "exchange_rate": 150,
  "include_tax": false,
  "include_cross_border_fee": true
}
```

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "selling_price": 7500.00,
    "currency": "JPY",
    "cost_local": 5000.00,
    "shipping_cost": 500.00,
    "marketplace_fees": 1125.00,
    "profit_local": 875.00,
    "profit_jpy": 875.00,
    "profit_margin": 0.1167,
    "is_profitable": true,
    "can_list": true,
    "warnings": [],
    "breakdown": {
      "base_cost": 5000.00,
      "shipping": 500.00,
      "fees_breakdown": {
        "sales_fee": 1125.00,
        "fixed_fee": 0,
        "cross_border_fee": 0,
        "tax": 0
      }
    }
  }
}
```

### GET /api/pricing/calculate?mode=compare

複数マーケットプレイスの価格比較

**リクエスト例:**

```
GET /api/pricing/calculate?mode=compare&cost_jpy=5000&target_profit_rate=0.20&weight_g=500&marketplace_ids=AMAZON_JP,AMAZON_US,EBAY_US
```

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "results": [
      { "selling_price": 7500.00, "profit_jpy": 1000.00, ... },
      { "selling_price": 50.00, "profit_jpy": 1200.00, ... },
      { "selling_price": 52.00, "profit_jpy": 1100.00, ... }
    ],
    "best_marketplace": "AMAZON_US",
    "best_profit_jpy": 1200.00
  }
}
```

### POST /api/pricing/bulk

一括価格計算

**リクエスト例:**

```json
{
  "items": [
    {
      "marketplace_id": "AMAZON_JP",
      "cost_jpy": 5000,
      "target_profit_rate": 0.20,
      "weight_g": 500
    },
    {
      "marketplace_id": "EBAY_US",
      "cost_jpy": 5000,
      "target_profit_rate": 0.25,
      "weight_g": 500
    }
  ]
}
```

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "results": [
      { "selling_price": 7500.00, "profit_jpy": 1000.00, ... },
      { "selling_price": 52.00, "profit_jpy": 1250.00, ... }
    ],
    "summary": {
      "total_items": 2,
      "profitable_items": 2,
      "unprofitable_items": 0,
      "total_profit_jpy": 2250.00,
      "average_profit_margin": 0.225
    }
  }
}
```

## 入力パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `marketplace_id` | string | ✅ | マーケットプレイスID（例: AMAZON_JP） |
| `cost_jpy` | number | ✅ | 原価（JPY） |
| `target_profit_jpy` | number | 🔶 | 目標利益（JPY）※1 |
| `target_profit_rate` | number | 🔶 | 目標利益率（例: 0.20 = 20%）※1 |
| `weight_g` | number | ❌ | 商品重量（グラム） |
| `shipping_method` | string | ❌ | 送料計算方法（例: FBA_STANDARD） |
| `exchange_rate` | number | ❌ | 為替レート（デフォルト: 1.0） |
| `include_tax` | boolean | ❌ | VAT/税金を含むか（デフォルト: false） |
| `include_cross_border_fee` | boolean | ❌ | 越境手数料を含むか（デフォルト: true） |
| `custom_shipping_cost` | number | ❌ | カスタム送料（現地通貨） |

※1 `target_profit_jpy`または`target_profit_rate`のいずれかが必須

## 出力フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `selling_price` | number | 販売価格（現地通貨） |
| `currency` | string | 通貨コード |
| `cost_local` | number | 原価（現地通貨換算） |
| `shipping_cost` | number | 送料 |
| `marketplace_fees` | number | マーケットプレイス手数料 |
| `cross_border_fee` | number | 越境手数料 |
| `tax_amount` | number | VAT/税金 |
| `total_costs` | number | 総コスト |
| `profit_local` | number | 利益（現地通貨） |
| `profit_jpy` | number | 利益（JPY） |
| `profit_margin` | number | 利益率 |
| `is_profitable` | boolean | 利益が出るか |
| `can_list` | boolean | 出品可能か |
| `warnings` | string[] | 警告メッセージ |

## データベース設定

### marketplace_settings テーブル

IntegratedPricingServiceは`marketplace_settings`テーブルから設定を読み込みます。

**必須フィールド:**

```sql
CREATE TABLE marketplace_settings (
  id SERIAL PRIMARY KEY,
  marketplace TEXT NOT NULL,
  account_id TEXT,
  sales_fee_rate DECIMAL NOT NULL,      -- 例: 0.15 (15%)
  fixed_fee DECIMAL DEFAULT 0,          -- 例: 0.30 (固定手数料)
  cross_border_fee_rate DECIMAL DEFAULT 0,
  tax_rate DECIMAL DEFAULT 0,
  default_currency TEXT DEFAULT 'USD',
  payout_currency TEXT DEFAULT 'JPY',
  target_profit_rate DECIMAL DEFAULT 0.20,
  UNIQUE(marketplace, account_id)
);
```

**サンプルデータ:**

```sql
INSERT INTO marketplace_settings (marketplace, sales_fee_rate, fixed_fee, default_currency) VALUES
('AMAZON_JP', 0.15, 0, 'JPY'),
('AMAZON_US', 0.15, 0, 'USD'),
('EBAY_US', 0.1295, 0.30, 'USD'),
('SHOPEE_SG', 0.06, 0, 'SGD');
```

### shipping_rules テーブル

送料計算用のルールを定義します。

```sql
CREATE TABLE shipping_rules (
  id SERIAL PRIMARY KEY,
  marketplace_id TEXT NOT NULL,
  shipping_method TEXT NOT NULL,
  is_fba_like BOOLEAN DEFAULT false,
  rule_json JSONB NOT NULL
);
```

**サンプルデータ（Amazon FBA）:**

```sql
INSERT INTO shipping_rules (marketplace_id, shipping_method, is_fba_like, rule_json) VALUES
('AMAZON_JP', 'FBA_STANDARD', true, '{
  "unit": "kg",
  "base_weight": 1,
  "base_price": 500,
  "tiers": [
    {"max_weight": 2, "price": 800},
    {"max_weight": 5, "price": 1200}
  ],
  "handling_fee": 50
}');
```

## マーケットプレイス別の設定例

### Amazon Japan

```typescript
{
  marketplace_id: 'AMAZON_JP',
  sales_fee_rate: 0.15,      // 15%
  fixed_fee: 0,
  cross_border_fee_rate: 0,
  tax_rate: 0,
  default_currency: 'JPY',
  payout_currency: 'JPY',
  target_profit_rate: 0.20
}
```

### eBay United States

```typescript
{
  marketplace_id: 'EBAY_US',
  sales_fee_rate: 0.1295,    // 12.95%
  fixed_fee: 0.30,           // $0.30
  cross_border_fee_rate: 0,
  tax_rate: 0,
  default_currency: 'USD',
  payout_currency: 'JPY',
  target_profit_rate: 0.25
}
```

### Shopee Singapore

```typescript
{
  marketplace_id: 'SHOPEE_SG',
  sales_fee_rate: 0.06,      // 6%
  fixed_fee: 0,
  cross_border_fee_rate: 0.02, // 2%
  tax_rate: 0,
  default_currency: 'SGD',
  payout_currency: 'JPY',
  target_profit_rate: 0.20
}
```

## 注意事項

1. **為替レート**: リアルタイムの為替レートを使用する場合、外部APIから取得してください
2. **VAT/税金**: 欧州市場では`include_tax: true`を設定してください
3. **送料ルール**: 各マーケットプレイスの送料ルールを`shipping_rules`テーブルに正確に設定してください
4. **エラーハンドリング**: `can_list: false`の場合、`warnings`配列を確認してください

## トラブルシューティング

### "Marketplace settings not found"

→ `marketplace_settings`テーブルに該当のマーケットプレイス設定を追加してください

### "Target profit rate is too high"

→ 目標利益率が手数料率の合計と合わせて100%を超えています。目標利益率を下げてください

### "Shipping rule not found"

→ `shipping_rules`テーブルに該当の送料ルールを追加するか、`custom_shipping_cost`を使用してください

## 今後の拡張予定

- [ ] リアルタイム為替レート取得
- [ ] 関税計算（DDP）の統合
- [ ] バリエーション価格の一括計算
- [ ] 価格履歴の保存と分析
- [ ] 競合価格との自動比較
