# ダイナミックプライシングエンジン

## 概要

このダイナミックプライシングエンジンは、eBay、Amazon、Mercariなどのマーケットプレイスでの販売価格を自動的に最適化するシステムです。

競合価格、在庫状況、商品パフォーマンス、アカウント健全性などの複数の要因を考慮して、最大利益と販売効率を実現します。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                  Dynamic Pricing Engine                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐│
│  │ DynamicPricing  │  │ SupplyChain      │  │  Scoring    ││
│  │ Service         │  │ Monitor          │  │  Service    ││
│  │                 │  │                  │  │             ││
│  │ • ルール1,6     │  │ • ルール8,14     │  │ • ルール15  ││
│  │ • 価格調整      │  │ • 在庫監視       │  │ • スコア計算││
│  └─────────────────┘  └──────────────────┘  └─────────────┘│
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              Strategy Executor                           ││
│  │              • ルール2,12,13                             ││
│  │              • 出品入替・優先度調整                       ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Database (Supabase)                        │
├─────────────────────────────────────────────────────────────┤
│ • products_master (拡張)                                     │
│ • pricing_strategy_master                                    │
│ • supplier_master                                            │
│ • supply_chain_monitoring                                    │
│ • html_parse_errors                                          │
│ • performance_score_history                                  │
│ • price_adjustment_log                                       │
│ • account_health_score                                       │
└─────────────────────────────────────────────────────────────┘
```

## 主要機能

### I. 価格調整・競争戦略

#### ルール1: 最安値追従（最低利益確保）
最安値に合わせるが、事前に設定した「最低利益額」を下回る場合はその価格で固定（赤字回避の最終ストッパー）。

```typescript
import { dynamicPricingService } from '@/lib/services/pricing/DynamicPricingService'

const result = await dynamicPricingService.adjustPrice({
  product_id: 'prod-123',
  sku: 'ABC-001',
  current_price_usd: 50.00,
  base_cost_usd: 30.00,
  competitor_info: {
    lowest_price_usd: 45.00,
    competitor_count: 5,
    avg_price_usd: 52.00,
    marketplace: 'ebay',
    fetched_at: new Date().toISOString()
  },
  strategy_config: {
    strategy_type: 'follow_lowest_with_min_profit',
    min_profit_amount_usd: 5.00,
    enable_stopper: true,
    check_frequency_hours: 24
  }
})

console.log(`新価格: $${result.new_price_usd}`)
console.log(`調整理由: ${result.adjustment_reason}`)
```

#### ルール6: 基準価格からの差分調整
最安値より[N]円/ドル下げて、または上げて出品し、その差分を維持したまま価格を自動追従させる。

```typescript
const result = await dynamicPricingService.adjustPrice({
  product_id: 'prod-123',
  sku: 'ABC-001',
  current_price_usd: 50.00,
  base_cost_usd: 30.00,
  competitor_info: {
    lowest_price_usd: 48.00,
    competitor_count: 3,
    avg_price_usd: 52.00,
    marketplace: 'ebay',
    fetched_at: new Date().toISOString()
  },
  strategy_config: {
    strategy_type: 'price_difference_tracking',
    price_difference_usd: -2.00,  // 最安値より$2安く
    apply_above_lowest: false,
    auto_follow: true
  }
})

// 結果: $46.00 (最安値$48.00 - $2.00)
```

### II. 在庫・サプライチェーン管理

#### ルール8: 在庫切れ時の自動停止
在庫がなくなった場合、該当出品の在庫を自動で「0」に更新し、売れ残りリスクを排除する。

```typescript
import { supplyChainMonitor } from '@/lib/services/inventory/SupplyChainMonitor'

// 在庫を0に設定
await supplyChainMonitor.handleOutOfStock(
  'prod-123',
  'ABC-001',
  'set_inventory_zero'
)

// 出品を一時停止
await supplyChainMonitor.handleOutOfStock(
  'prod-123',
  'ABC-001',
  'pause_listing'
)
```

#### ルール9: 複数仕入れ元と価格変動
複数の仕入れ先を登録し、仕入れ先の優先順位とそれぞれの原価に応じて、販売価格を自動で変動させる。

```typescript
// アクティブサプライヤーを取得
const supplier = await supplyChainMonitor.getActiveSupplier('prod-123', 'ABC-001')

if (supplier) {
  console.log(`現在のサプライヤー: ${supplier.supplier_name}`)
  console.log(`基本原価: $${supplier.base_cost_usd}`)
}

// バックアップサプライヤーに切り替え
const newSupplier = await supplyChainMonitor.switchToBackupSupplier('prod-123', 'ABC-001')
```

#### ルール14: HTML解析エラー表示
在庫管理のHTML解析時にエラーが出たら、ユーザーの管理画面にエラーの原因を明確に表示する。

```typescript
// 在庫チェックを実行
const checkResult = await supplyChainMonitor.checkStock(
  'prod-123',
  'ABC-001',
  supplier
)

if (!checkResult.success && checkResult.error) {
  console.error(`HTML解析エラー: ${checkResult.error.error_message}`)
  console.error(`エラータイプ: ${checkResult.error.error_type}`)
}

// 未解決のエラーを取得
const unresolvedErrors = await supplyChainMonitor.getUnresolvedErrors(50)
console.log(`未解決エラー: ${unresolvedErrors.length}件`)
```

### III. パフォーマンス最適化・スコアリングシステム

#### ルール15: パフォーマンススコアの計算
出品されている各商品に「パフォーマンススコア」（A〜Eランク）を付与し、そのスコアに応じて自動アクションを決定します。

```typescript
import { scoringService } from '@/lib/services/performance/ScoringService'

// スコアを計算
const scoreResult = await scoringService.calculateScore(
  'prod-123',
  'ABC-001',
  {
    market_inventory_count: 15,  // 市場在庫数
    view_count: 250,              // ビュー数
    watcher_count: 12,            // ウォッチャー数
    days_listed: 14,              // 滞留期間（日数）
    profit_margin_percent: 25,    // 利益率（%）
    sold_count: 3,                // 販売数
    conversion_rate: 1.2          // 転換率（%）
  }
)

console.log(`スコア: ${scoreResult.score} (${scoreResult.score_value}点)`)
// 出力例: スコア: B (72点)
```

#### ルール12: スコア低下時の出品入替
出品上限に近いときに、最もスコアの低い商品をシステムが自動で検知し、その出品を停止して「待機中」の高スコア商品と自動で入れ替える。

```typescript
import { strategyExecutor } from '@/lib/services/performance/StrategyExecutor'

const rotationConfig = {
  enabled: true,
  low_score_threshold: 'D' as const,  // Dランク以下を入替対象
  listing_limit: 500,                  // 出品上限
  auto_rotate: true,
  rotation_check_frequency_hours: 24
}

const result = await strategyExecutor.executeListingRotation(rotationConfig)

console.log(`入替完了: ${result.total_rotated}件`)
console.log(`停止商品: ${result.paused_products.join(', ')}`)
console.log(`有効化商品: ${result.activated_products.join(', ')}`)
```

#### ルール13: 滞留商品の優先度低下
ビュー数、ウォッチャー数が低く、出品期間が[N]日を超えている商品は、スコアが下がり、自動アクションが停止され、交代の優先度が上がる。

```typescript
const stagnantConfig = {
  max_days_listed: 60,        // 60日以上滞留
  min_view_count: 10,         // ビュー数10回以下
  min_watcher_count: 1,       // ウォッチャー1人以下
  auto_deprioritize: true
}

const stagnantProducts = await strategyExecutor.identifyStagnantProducts(stagnantConfig)

console.log(`滞留商品: ${stagnantProducts.length}件`)
stagnantProducts.forEach(p => {
  console.log(`SKU: ${p.sku}, ${p.days_listed}日滞留, スコア: ${p.current_score}`)
})
```

#### ルール2: スコア変動における出品の停止（アカウント健全性連動）
アカウントの健全性スコアが低くなった場合、高スコア商品から優先して出品を継続し、低スコア商品は一時停止させる。

```typescript
const pausedSkus = await strategyExecutor.adjustListingsByAccountHealth(
  'ebay-account-001',
  'ebay'
)

console.log(`アカウント健全性保護のため、${pausedSkus.length}件の商品を停止しました`)
```

## データベースマイグレーション

### マイグレーションの実行

```bash
# マイグレーションファイルの場所
database/migrations/001_add_dynamic_pricing_fields_to_products_master.sql
database/migrations/002_create_dynamic_pricing_tables.sql
```

Supabaseダッシュボードで実行するか、以下のコマンドを使用してください：

```bash
# Supabase CLIを使用する場合
supabase db push

# または、SQLファイルを直接実行
psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f database/migrations/001_add_dynamic_pricing_fields_to_products_master.sql
psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f database/migrations/002_create_dynamic_pricing_tables.sql
```

### 追加されるテーブル

1. **pricing_strategy_master**: 価格戦略マスターテーブル
2. **supplier_master**: 仕入れ先マスターテーブル
3. **supply_chain_monitoring**: サプライチェーン監視テーブル
4. **html_parse_errors**: HTML解析エラーログ
5. **performance_score_history**: パフォーマンススコア履歴
6. **price_adjustment_log**: 価格調整履歴ログ
7. **account_health_score**: アカウント健全性スコア

### products_master テーブルへの追加フィールド

- `performance_score`: パフォーマンススコア（A-E）
- `performance_score_value`: 数値スコア（0-100）
- `strategy_id`: 適用されている価格戦略のID
- `custom_strategy_config`: 個別商品の価格戦略設定（JSONB）
- `score_calculated_at`: スコアが計算された日時
- `price_last_adjusted_at`: 価格が最後に調整された日時
- `active_supplier_id`: 現在アクティブな仕入れ先ID
- `watcher_count`: eBayウォッチャー数
- `view_count`: ビュー数
- `sold_count`: 販売数
- `days_listed`: 出品日数

## バッチ処理・定期実行

### 定期実行スクリプトの例

```typescript
// scripts/run-dynamic-pricing.ts
import { dynamicPricingService } from '@/lib/services/pricing/DynamicPricingService'
import { scoringService } from '@/lib/services/performance/ScoringService'
import { strategyExecutor } from '@/lib/services/performance/StrategyExecutor'

async function runDailyPricingUpdate() {
  console.log('🤖 日次価格更新を開始')

  // 1. すべてのアクティブ商品のスコアを再計算
  const products = await getActiveProducts()  // 実装が必要
  await scoringService.batchCalculateScores(products)

  // 2. 価格を自動調整
  const pricingRequests = await buildPricingRequests(products)  // 実装が必要
  await dynamicPricingService.batchAdjustPrices(pricingRequests)

  // 3. 出品入替を実行
  await strategyExecutor.runScheduledAdjustments(
    rotationConfig,
    stagnantConfig
  )

  console.log('✅ 日次価格更新完了')
}

// Cronジョブで実行（例: 毎日午前3時）
// 0 3 * * * node scripts/run-dynamic-pricing.js
```

## 設定例

### デフォルト価格戦略の設定

```sql
-- グローバルデフォルト戦略を設定
INSERT INTO pricing_strategy_master (
  strategy_name,
  strategy_type,
  strategy_config,
  is_default,
  priority,
  enabled,
  description
) VALUES (
  'グローバルデフォルト: 最安値追従（最低利益確保）',
  'follow_lowest_with_min_profit',
  '{
    "strategy_type": "follow_lowest_with_min_profit",
    "min_profit_amount_usd": 5.00,
    "enable_stopper": true,
    "check_frequency_hours": 24
  }'::jsonb,
  true,
  1,
  true,
  'デフォルトの価格戦略: 最安値に追従しつつ、最低利益$5を確保'
);
```

### 個別商品の戦略設定

```typescript
// 特定の商品に個別戦略を適用
await supabase
  .from('products_master')
  .update({
    custom_strategy_config: {
      strategy_type: 'price_difference_tracking',
      price_difference_usd: -1.00,
      apply_above_lowest: false,
      auto_follow: true
    }
  })
  .eq('sku', 'ABC-001')
```

## トラブルシューティング

### HTML解析エラーの対処

```typescript
// 未解決のエラーを確認
const errors = await supplyChainMonitor.getUnresolvedErrors(50)

errors.forEach(error => {
  console.log(`エラーID: ${error.error_id}`)
  console.log(`商品SKU: ${error.sku}`)
  console.log(`エラータイプ: ${error.error_type}`)
  console.log(`エラーメッセージ: ${error.error_message}`)
  console.log(`発生日時: ${error.occurred_at}`)
})

// エラーを解決済みにマーク
await supplyChainMonitor.resolveHtmlParseError('ERROR-123', 'admin-user')
```

### 価格調整履歴の確認

```sql
-- 最近の価格調整履歴を確認
SELECT
  sku,
  old_price_usd,
  new_price_usd,
  adjustment_reason,
  strategy_type,
  adjusted_at
FROM price_adjustment_log
WHERE sku = 'ABC-001'
ORDER BY adjusted_at DESC
LIMIT 10;
```

## ベストプラクティス

1. **段階的な導入**: 最初は少数の商品でテストし、徐々に適用範囲を拡大
2. **監視**: 価格調整ログとスコア履歴を定期的にレビュー
3. **調整**: 市場状況に応じて戦略パラメータを調整
4. **バックアップ**: データベースの定期バックアップを実施
5. **エラー処理**: HTML解析エラーは早期に解決

## 今後の拡張機能

- [ ] ルール3: 時期・季節による自動変動
- [ ] ルール4: 地域・カテゴリ別の一時調整
- [ ] ルール5: 初期販売ブーストと段階的値上げ
- [ ] ルール7: 競争環境による価格上昇
- [ ] ルール11: オファー獲得戦略（ウォッチャー連動）
- [ ] その他10: 競合セラーの信頼度に基づく価格プレミアム設定
- [ ] AI学習モジュール: オファー履歴の学習

## ライセンス

Proprietary - All Rights Reserved
