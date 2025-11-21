# 無在庫輸入システム セットアップガイド

## 概要

Amazon/eBay ハイブリッド無在庫輸入システムの完全な実装が完了しました。
このガイドでは、システムのセットアップと使用方法を説明します。

---

## 📁 ファイル構成

```
n3-frontend_new/
├── types/
│   └── product.ts                           # 型定義（無在庫輸入用フィールド追加済み）
│
├── lib/
│   ├── research/
│   │   └── dropship-scorer.ts               # スコアリングエンジン
│   │
│   └── dropship/
│       ├── index.ts                         # 統合モジュール（エクスポート）
│       ├── README.md                        # ドキュメント
│       ├── db.ts                            # データベースアクセスレイヤー
│       ├── api-integrations.ts              # API連携モジュール
│       ├── listing-manager.ts               # 出品管理エンジン
│       ├── price-updater.ts                 # 価格改定エンジン
│       └── order-processor.ts               # 受注処理エンジン
│
├── app/
│   ├── api/
│   │   └── dropship/
│   │       ├── score/route.ts               # スコアリングAPI
│   │       ├── list/route.ts                # 出品API
│   │       ├── update-prices/route.ts       # 価格更新API
│   │       ├── products/route.ts            # 商品取得API
│   │       └── orders/route.ts              # 受注API
│   │
│   └── dropship-inventory/
│       └── page.tsx                         # UIダッシュボード
│
└── supabase/
    └── migrations/
        └── 20250121_dropship_import_system.sql  # データベーススキーマ
```

---

## 🚀 セットアップ手順

### 1. データベースのセットアップ

Supabaseでデータベースをセットアップします。

```bash
# マイグレーションを実行
cd supabase
supabase migration up
```

または、Supabase Dashboardで以下のSQLを直接実行：

```sql
-- supabase/migrations/20250121_dropship_import_system.sql の内容を実行
```

### 2. 環境変数の設定

`.env.local`に以下の環境変数を追加：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 倉庫住所（受注時に使用）
DROPSHIP_WAREHOUSE_ADDRESS="Your warehouse address in Japan"

# 為替レート（オプション、デフォルト: 150）
DROPSHIP_EXCHANGE_RATE=150

# Amazon SP-API（将来実装）
# AMAZON_SP_API_KEY=your_amazon_sp_api_key
# AMAZON_SP_API_SECRET=your_amazon_sp_api_secret

# eBay API（将来実装）
# EBAY_API_KEY=your_ebay_api_key
# EBAY_API_SECRET=your_ebay_api_secret
```

### 3. 依存関係のインストール

```bash
npm install
# または
yarn install
```

### 4. 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
```

ブラウザで `http://localhost:3000/dropship-inventory` を開きます。

---

## 📊 使用方法

### ダッシュボードへのアクセス

```
http://localhost:3000/dropship-inventory
```

### 主要機能

#### 1. スコアリング

商品の出品適性を評価します。

**API使用例:**

```typescript
const response = await fetch('/api/dropship/score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productIds: ['product-id-1', 'product-id-2'],
  }),
})

const data = await response.json()
console.log(data.results)
```

**コード使用例:**

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
console.log(`出品推奨: ${score.shouldList}`)
```

#### 2. 自動出品

スコアが閾値を超えた商品を自動出品します。

**API使用例:**

```typescript
const response = await fetch('/api/dropship/list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productIds: ['product-id-1', 'product-id-2'],
    testMode: false, // trueにすると実際には出品しない
  }),
})

const data = await response.json()
console.log(`${data.summary.success}件の出品に成功しました`)
```

**コード使用例:**

```typescript
import { autoListProduct } from '@/lib/dropship'

const results = await autoListProduct(product, {
  autoListToAmazon: true,
  autoListToEbay: true,
  scoreThreshold: 60,
  testMode: false,
})

console.log(results)
```

#### 3. 価格監視と自動改定

仕入れ元の価格変動を監視し、自動で価格改定します。

**API使用例:**

```typescript
const response = await fetch('/api/dropship/update-prices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productIds: [], // 空の場合は全商品
  }),
})

const data = await response.json()
console.log(`${data.summary.updated}件の価格を更新しました`)
```

**コード使用例:**

```typescript
import { startPriceMonitoring } from '@/lib/dropship'

// 価格監視を開始（60分ごとにチェック）
const monitoringId = startPriceMonitoring(
  products,
  {
    checkInterval: 60,
    minProfitMargin: 15,
    priceChangeThreshold: 5,
    exchangeRate: 150,
  },
  (results) => {
    console.log(`${results.filter(r => r.updated).length}件の価格を更新しました`)
  }
)

// 監視を停止
// stopPriceMonitoring(monitoringId)
```

#### 4. 受注処理

受注検知から発送までの自動フローを実行します。

**API使用例:**

```typescript
// 受注を作成（テスト用）
const response = await fetch('/api/dropship/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'product-id',
    marketplace: 'Amazon_JP',
    quantity: 1,
    customerAddress: 'Tokyo, Japan',
  }),
})

const data = await response.json()
console.log('受注を作成しました:', data.order)
```

**コード使用例:**

```typescript
import { executeDropshipOrderFlow } from '@/lib/dropship'

const result = await executeDropshipOrderFlow(
  {
    orderId: 'ORDER_123',
    marketplace: 'Amazon_JP',
    productId: product.id,
    sku: product.sku,
    quantity: 1,
    customerAddress: 'Tokyo, Japan',
    orderDate: new Date(),
  },
  product,
  'YOUR_WAREHOUSE_ADDRESS_IN_JAPAN'
)

console.log('購入ID:', result.purchaseResult.purchaseId)
console.log('追跡番号:', result.trackingResult.trackingNumber)
```

---

## 🔧 カスタマイズ

### スコアリング設定のカスタマイズ

```typescript
import { DEFAULT_DROPSHIP_CONFIG } from '@/lib/dropship'

const customConfig = {
  ...DEFAULT_DROPSHIP_CONFIG,
  exchangeRate: 155, // 為替レート
  internationalShipping: 20, // 国際送料（USD）
  fbaFeeRate: 0.18, // FBA手数料率
  listingThreshold: 70, // 出品閾値（より厳しく）
  maxLeadTimeDays: 10, // 最大リードタイム（より短く）
}
```

### 価格監視設定のカスタマイズ

```typescript
import { DEFAULT_MONITORING_CONFIG } from '@/lib/dropship'

const customConfig = {
  ...DEFAULT_MONITORING_CONFIG,
  checkInterval: 30, // 30分ごとにチェック（より頻繁に）
  minProfitMargin: 20, // 最低利益率20%（より高く）
  priceChangeThreshold: 3, // 3%以上の変動で改定（より敏感に）
}
```

---

## 🎯 ワークフロー

### 基本的なワークフロー

```
1. 商品をインポート
   ↓
2. スコアリング実行
   ├─ スコア >= 60: 出品候補
   └─ スコア < 60: 対象外
   ↓
3. 出品候補を確認
   ├─ 自動出品を実行
   │  ├─ Amazon JPに出品
   │  └─ eBay JPに出品
   └─ ステータス: listed_on_multi
   ↓
4. 価格監視開始
   ├─ 仕入れ元価格をチェック
   ├─ 変動 >= 5%: 価格改定
   └─ 利益率 < 15%: 価格引き上げ
   ↓
5. 受注検知
   ├─ Amazon JPまたはeBay JPで受注
   ├─ 自動決済（仕入れ元で購入）
   ├─ 納期連絡（顧客に通知）
   └─ 追跡番号取得
   ↓
6. 倉庫到着監視
   ├─ 日本の倉庫へ配送
   ├─ 検品・再梱包
   └─ 顧客へ発送
```

---

## 📈 パフォーマンスとベストプラクティス

### スコアリング

- **高スコア（80以上）**: 高利益・低リスク、優先出品
- **中スコア（60-79）**: バランス型、通常出品
- **低スコア（60未満）**: 出品対象外

### 仕入れ元の選定

- **Amazon US/EU**: 信頼性が高く、納期が安定（推奨）
- **AliExpress**: 低価格だが納期が不安定（限定的に利用）

### リードタイム管理

- **7日以内**: 理想的、顧客満足度が高い
- **14日以内**: 許容範囲、事前に納期を通知
- **14日超過**: スコアが減点される、顧客満足度が低下

### 利益率の目標

- **20%以上**: 理想的、リスクに対する十分なバッファー
- **15%以上**: 許容範囲、最低ライン
- **15%未満**: 価格改定が必要

---

## 🐛 トラブルシューティング

### Q1. スコアが正しく計算されない

**原因:** 商品の必須フィールドが不足している

**解決策:**
```typescript
// 以下のフィールドが設定されているか確認
product.price                    // 販売価格（JPY）
product.supplier_current_price   // 仕入れ価格（USD/EUR）
product.potential_supplier       // 仕入れ元
product.estimated_lead_time_days // リードタイム
```

### Q2. 出品が失敗する

**原因:** API連携がモック実装のため

**解決策:** `lib/dropship/api-integrations.ts`で実際のAPIキーを設定

```typescript
// Amazon SP-API、eBay APIの実装が必要
// 現在はモック実装（90%の成功率）
```

### Q3. データベースエラー

**原因:** マイグレーションが実行されていない

**解決策:**
```bash
# Supabaseでマイグレーションを実行
supabase migration up

# または、Supabase Dashboardで手動実行
```

### Q4. UIダッシュボードでデータが表示されない

**原因:** 商品データが存在しないか、必須フィールドが不足

**解決策:**
```sql
-- サンプルデータを挿入（開発用）
INSERT INTO products (
  id, asin, sku, title, price,
  arbitrage_score, potential_supplier, supplier_current_price,
  estimated_lead_time_days, arbitrage_status, images, selectedImages
) VALUES
(
  gen_random_uuid()::text,
  'B08N5WRWNW',
  'DROPSHIP-001',
  'Apple AirPods Pro (2nd Generation)',
  35000,
  85.5,
  'Amazon_US',
  180.00,
  7,
  'tracked',
  '[]'::jsonb,
  '[]'
);
```

---

## 🔐 セキュリティとベストプラクティス

### APIキーの管理

- `.env.local`にAPIキーを保存（`.gitignore`に追加済み）
- 本番環境では環境変数で管理
- APIキーは絶対にコミットしない

### データベースアクセス

- Row Level Security (RLS) を有効化
- 認証されたユーザーのみアクセス可能
- ログイン機能の実装を推奨

### エラーハンドリング

- すべてのAPI呼び出しでエラーハンドリング
- ログを記録してデバッグを容易に
- ユーザーに分かりやすいエラーメッセージ

---

## 📝 次のステップ

### 必須タスク

1. **実際のAPI連携の実装**
   - Amazon SP-API
   - eBay API
   - 仕入れ元API（Amazon US/EU、AliExpress）

2. **倉庫管理システムとの連携**
   - 倉庫到着の通知
   - 検品状況の追跡
   - 発送処理の自動化

3. **認証とアクセス制御**
   - ユーザー認証の実装
   - ロールベースのアクセス制御
   - 監査ログ

### オプションタスク

- AI による需要予測
- 為替変動の自動対応
- 複数倉庫対応
- 返品処理の自動化
- レポート機能の追加

---

## 📚 参考資料

- [システムドキュメント](lib/dropship/README.md)
- [データベーススキーマ](supabase/migrations/20250121_dropship_import_system.sql)
- [Amazon SP-API ドキュメント](https://developer-docs.amazon.com/sp-api/)
- [eBay API ドキュメント](https://developer.ebay.com/)

---

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. ログを確認（ブラウザコンソール、サーバーログ）
2. データベースの状態を確認（Supabase Dashboard）
3. 環境変数が正しく設定されているか確認

---

**おめでとうございます！無在庫輸入システムのセットアップが完了しました。🎉**
