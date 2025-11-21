# 無在庫輸入システム - Amazon/eBay ハイブリッド

## 概要

Amazon JPとeBay JPを販売チャネルとし、**無在庫（受注後仕入れ）**で運用する低リスク輸入システムです。

### 主要な特徴

- **資金リスクゼロ**: 受注後に仕入れるため、在庫を持たない
- **多販路対応**: Amazon JP、eBay JPに同時出品
- **自動化**: スコアリング、出品、価格改定、受注処理を自動化
- **信頼性**: Amazon US/EUを優先仕入れ元として、安定した納期を実現

## システム構成

```
lib/dropship/
├── index.ts              # 統合モジュール（エクスポート）
├── README.md             # このファイル
│
├── dropship-scorer.ts    # スコアリングエンジン
├── listing-manager.ts    # 出品管理
├── price-updater.ts      # 価格改定
└── order-processor.ts    # 受注処理
```

## データフロー

```
1. 商品リサーチ
   ↓
2. スコアリング（利益率、納期、信頼性）
   ↓
3. 出品判定（スコア >= 60）
   ↓
4. 自動出品（Amazon JP / eBay JP）
   ↓
5. 価格監視（仕入れ元価格の変動）
   ↓
6. 受注検知
   ↓
7. 自動決済（仕入れ元で購入）
   ↓
8. 納期連絡（顧客に通知）
   ↓
9. 追跡更新（倉庫への到着監視）
   ↓
10. 検品・発送
```

## 使用方法

### 1. スコアリング

商品の出品適性を評価します。

```typescript
import { calculateDropshipScore } from '@/lib/dropship'

const score = calculateDropshipScore(product, {
  exchangeRate: 150,
  internationalShipping: 15,
  fbaFeeRate: 0.15,
  listingThreshold: 60,
  maxLeadTimeDays: 14,
})

console.log(`総合スコア: ${score.totalScore}`)
console.log(`利益率: ${score.profitAnalysis.profitMargin}%`)
console.log(`純利益: ¥${score.profitAnalysis.netProfit}`)
console.log(`出品推奨: ${score.shouldList}`)
console.log(`優先度: ${score.listingPriority}`)
```

#### スコアの構成

- **利益スコア（50%）**: 利益率30%以上で満点
- **納期スコア（30%）**: 7日以内で満点、14日超過で減点
- **信頼性スコア（20%）**: Amazon US/EU = 100点、AliExpress = 60点

### 2. 自動出品

スコアが閾値を超えた商品を自動出品します。

```typescript
import { autoListProduct, bulkAutoList } from '@/lib/dropship'

// 単一商品の出品
const results = await autoListProduct(product, {
  autoListToAmazon: true,
  autoListToEbay: true,
  scoreThreshold: 60,
  testMode: false,
})

// 一括出品
const bulkResults = await bulkAutoList(products, {
  autoListToAmazon: true,
  autoListToEbay: true,
  scoreThreshold: 60,
  testMode: false,
})
```

### 3. 価格監視と自動改定

仕入れ元の価格変動を監視し、利益率を維持します。

```typescript
import { startPriceMonitoring, stopPriceMonitoring } from '@/lib/dropship'

// 価格監視開始
const monitoringId = startPriceMonitoring(products, {
  checkInterval: 60,          // 60分ごとにチェック
  minProfitMargin: 15,        // 最低15%の利益率
  priceChangeThreshold: 5,    // 5%以上の変動で改定
  exchangeRate: 150,
}, (results) => {
  // 価格改定コールバック
  console.log(`${results.length}件の商品を処理しました`)
  console.log(`${results.filter(r => r.updated).length}件の価格を改定しました`)
})

// 監視停止
stopPriceMonitoring(monitoringId)
```

### 4. 受注処理

受注検知から発送までの自動フローを実行します。

```typescript
import { executeDropshipOrderFlow } from '@/lib/dropship'

const order = {
  orderId: 'ORDER_123',
  marketplace: 'Amazon_JP',
  productId: product.id,
  sku: product.sku,
  quantity: 1,
  customerAddress: 'Tokyo, Japan',
  orderDate: new Date(),
}

const result = await executeDropshipOrderFlow(
  order,
  product,
  'YOUR_WAREHOUSE_ADDRESS_IN_JAPAN'
)

console.log(`購入ID: ${result.purchaseResult.purchaseId}`)
console.log(`追跡番号: ${result.trackingResult.trackingNumber}`)
console.log(`納期: ${result.notificationResult.estimatedDeliveryDate}`)
```

## 商品ステータス管理

商品は以下のステータスで管理されます（`arbitrage_status`フィールド）：

| ステータス | 説明 |
|-----------|------|
| `in_research` | リサーチ中 |
| `tracked` | 価格・在庫追跡中 |
| `listed_on_multi` | 複数販路に出品済み |
| `order_received_and_purchased` | 受注・仕入れ完了 |
| `in_transit_to_japan` | 日本への輸送中 |
| `awaiting_inspection` | 検品待ち |
| `shipped_to_customer` | 顧客へ発送済み |

## データベーススキーマ

`/types/product.ts`に以下のフィールドが追加されています：

```typescript
export interface Product {
  // ... 既存フィールド ...

  // スコアリングと分析
  arbitrage_score?: number | null
  keepa_data?: Record<string, any> | null

  // 無在庫に必要なリードタイムと価格情報
  potential_supplier?: 'Amazon_US' | 'Amazon_EU' | 'AliExpress'
  supplier_current_price?: number
  estimated_lead_time_days?: number

  // 販売チャネルとステータス
  amazon_jp_listing_id?: string | null
  ebay_jp_listing_id?: string | null
  arbitrage_status?: 'in_research' | 'tracked' | 'listed_on_multi' | ...
}
```

## ベストプラクティス

### 1. スコア閾値の設定

- **保守的（閾値80以上）**: 高利益・低リスクのみ
- **バランス（閾値60以上）**: 推奨設定
- **積極的（閾値40以上）**: 多数出品、高回転

### 2. 仕入れ元の選定

- **Amazon US/EU**: 信頼性が高く、納期が安定
- **AliExpress**: 低価格だが納期が不安定（限定的に利用）

### 3. リードタイムの管理

- **7日以内**: 理想的
- **14日以内**: 許容範囲
- **14日超過**: 顧客満足度が低下するため減点

### 4. 利益率の目標

- **20%以上**: 理想的
- **15%以上**: 許容範囲
- **15%未満**: 価格改定が必要

## トラブルシューティング

### Q1. スコアが低い商品が多い

- 仕入れ価格が高すぎる可能性があります。
- 販売価格を上げるか、別の仕入れ元を検討してください。

### Q2. 価格改定が頻繁に発生する

- `priceChangeThreshold`（価格変動閾値）を上げてください。
- デフォルトは5%ですが、10%に設定すると改定頻度が下がります。

### Q3. 自動決済が失敗する

- 仕入れ元のAPIキーが正しく設定されているか確認してください。
- 仕入れ元の在庫状況を確認してください。

## 今後の拡張予定

- [ ] 倉庫管理システムとの連携
- [ ] AI による需要予測
- [ ] 為替変動の自動対応
- [ ] 複数倉庫対応
- [ ] 返品処理の自動化

## ライセンス

社内専用システム

## 連絡先

開発チーム: [email protected]
